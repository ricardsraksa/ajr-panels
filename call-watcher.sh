#!/bin/bash
# AJR call watcher — pops the "Log the call" window the instant a call ends.
#
# Runs 24/7 in the background (installed as a macOS LaunchAgent). It watches
# Zoom locally: the moment a meeting ends (the meeting closes), it opens
# close-call.html as a chromeless app window, straight into "pick who you met
# with". No cloud round-trip, no waiting — the popup appears at hang-up.
#
# A slower Fireflies poll runs in the background too: 2-3 min later it can open
# the widget pre-pinned to the exact deal (and the transcript/draft attaches to
# the sheet). That's a backup — the instant local pop is the main path.
#
# Setup:
#   1. Copy this file anywhere permanent, e.g. ~/ajr/call-watcher.sh
#   2. Create ~/.ajr-watcher.conf with:
#        PANEL_URL="https://<user>.github.io/ajr-panels"
#        EXEC_URL="https://script.google.com/macros/s/…/exec"   # for the Fireflies backup
#        API_KEY="…"                                            # for the Fireflies backup
#   3. bash call-watcher.sh --install     (starts now + at every login)
#
# Other commands:
#   probe            — print what Zoom looks like right now (run it DURING a
#                      test call to confirm meeting detection)
#   test-popup       — open the popup once, as if a call just ended
#   once             — single Fireflies poll (for testing)
#   run              — foreground loop
#   --status · --uninstall
set -u

CONF="${AJR_WATCHER_CONF:-$HOME/.ajr-watcher.conf}"
SEEN_FILE="${AJR_WATCHER_SEEN:-$HOME/.ajr-watcher-seen}"
PLIST="$HOME/Library/LaunchAgents/com.ajr.callwatcher.plist"
LOG_FILE="$HOME/Library/Logs/ajr-call-watcher.log"

[ -f "$CONF" ] && . "$CONF"
PANEL_URL="${PANEL_URL:-}"
EXEC_URL="${EXEC_URL:-}"
API_KEY="${API_KEY:-}"

# Local Zoom-meeting detection (the instant path). These helper processes exist
# only while a Zoom meeting is live; when the meeting ends they disappear. If a
# future Zoom build renames them, run `call-watcher.sh probe` during a call and
# add the real name here (or in the conf via ZOOM_MEETING_PROCS=).
DETECT_ZOOM="${DETECT_ZOOM:-1}"
ZOOM_MEETING_PROCS="${ZOOM_MEETING_PROCS:-CptHost|aomhost|caphost}"
ZOOM_CHECK="${ZOOM_CHECK:-4}"          # check cadence while Zoom is open
IDLE_CHECK="${IDLE_CHECK:-15}"         # check cadence while Zoom is closed (near-dormant)
# Fireflies backup poll cadence + how long to mute it after a local pop. It's
# only a backup now (local detection is instant), so it runs lazily. Leave
# EXEC_URL/API_KEY out of the conf to switch the backup off entirely.
FF_INTERVAL="${FF_INTERVAL:-${INTERVAL:-120}}"
COOLDOWN="${COOLDOWN:-300}"
# Override the browser; the URL is appended last (e.g. OPEN_CMD="open -a Firefox").
OPEN_CMD="${OPEN_CMD:-}"

log() { echo "$(date '+%d/%m %H:%M:%S') $*"; }

open_url() { # $1=url
  local url="$1"
  if [ -n "$OPEN_CMD" ]; then
    $OPEN_CMD "$url"
  elif open -Ra "Google Chrome" 2>/dev/null; then
    # chromeless app window — looks like a native popup; Chrome remembers the
    # size/position you give it the first time
    open -na "Google Chrome" --args --app="$url"
  elif open -Ra "Microsoft Edge" 2>/dev/null; then
    open -na "Microsoft Edge" --args --app="$url"
  else
    open "$url" # default browser tab as a last resort
  fi
}

open_after_call() { # instant local pop — no deal known yet, opens the picker
  [ -z "$PANEL_URL" ] && { log "no PANEL_URL — can't open popup"; return 1; }
  open_url "${PANEL_URL%/}/close-call.html?after=1"
}
open_deal() { # $1=row $2=id — Fireflies backup, pre-pinned to the exact deal
  open_url "${PANEL_URL%/}/close-call.html?deal=$1&nudge=$2"
}

# Is the Zoom app open at all? (one cheap check; false ~all day)
zoom_running() { pgrep -x 'zoom.us' >/dev/null 2>&1; }
# Is a Zoom meeting live? One regex pgrep over the meeting-only helper procs.
zoom_meeting_active() { pgrep "$ZOOM_MEETING_PROCS" >/dev/null 2>&1; }

poll_fireflies() {
  [ -z "$EXEC_URL" ] || [ -z "$API_KEY" ] && return 0   # Fireflies backup not configured
  local resp
  resp=$(curl -sL --max-time 25 "$EXEC_URL?action=pending&key=$API_KEY") || return 0
  local calls
  calls=$(printf '%s' "$resp" | /usr/bin/python3 -c '
import json,sys
try:
    d = json.load(sys.stdin)
    for c in (d.get("calls") or []):
        cid = str(c.get("id","")).replace("\t"," ").strip()
        row = str(c.get("row","")).strip()
        name = str(c.get("name","")).replace("\t"," ").strip()
        if cid and row.isdigit():
            print(cid + "\t" + row + "\t" + name)
except Exception:
    pass
') || return 0
  [ -z "$calls" ] && return 0
  touch "$SEEN_FILE"
  while IFS=$'\t' read -r cid row name; do
    grep -qxF "$cid" "$SEEN_FILE" 2>/dev/null && continue
    echo "$cid" >> "$SEEN_FILE"
    tail -n 100 "$SEEN_FILE" > "$SEEN_FILE.tmp" && mv "$SEEN_FILE.tmp" "$SEEN_FILE"
    log "Fireflies: ${name:-row $row} ready — opening popup pre-pinned (row $row)"
    open_deal "$row" "$cid"
  done <<< "$calls"
}

need_panel() {
  [ -z "$PANEL_URL" ] && { echo "Missing PANEL_URL in $CONF (see header)." >&2; exit 1; }
}

case "${1:-run}" in
  run)
    need_panel
    log "watcher running — instant Zoom detection${DETECT_ZOOM:+ on}; Fireflies backup every ${FF_INTERVAL}s"
    prev=0; { [ "$DETECT_ZOOM" = "1" ] && zoom_meeting_active; } && prev=1
    last_ff=0; cooldown_until=0
    while true; do
      now=$(date +%s)
      nap="$IDLE_CHECK"
      if [ "$DETECT_ZOOM" = "1" ] && zoom_running; then
        nap="$ZOOM_CHECK"            # only poll tightly while Zoom is actually open
        cur=0; zoom_meeting_active && cur=1
        if [ "$prev" = "1" ] && [ "$cur" = "0" ]; then
          log "Zoom meeting ended — opening popup"
          open_after_call
          cooldown_until=$((now + COOLDOWN))
        fi
        prev=$cur
      else
        prev=0                       # Zoom closed → no meeting; reset the edge
      fi
      if [ $((now - last_ff)) -ge "$FF_INTERVAL" ] && [ "$now" -ge "$cooldown_until" ]; then
        poll_fireflies
        last_ff=$now
      fi
      sleep "$nap"
    done
    ;;
  probe)
    echo "Zoom meeting active (by process check): $(zoom_meeting_active && echo YES || echo no)"
    echo "--- all Zoom-ish processes right now ---"
    ps -Ao pid,comm= 2>/dev/null | grep -iE "zoom|cpt|aomhost|caphost" | grep -v grep || echo "(none)"
    echo "--- watching '$ZOOM_MEETING_PROCS' as the meeting signal ---"
    echo "Run this DURING a real Zoom call; whatever new process appears is the signal to watch."
    ;;
  test-popup)
    need_panel
    log "test-popup — opening the after-call window"
    open_after_call
    ;;
  once)
    poll_fireflies
    ;;
  --install)
    need_panel
    mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG_FILE")"
    SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
    cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.ajr.callwatcher</string>
  <key>ProgramArguments</key><array>
    <string>/bin/bash</string><string>$SCRIPT_PATH</string><string>run</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_FILE</string>
  <key>StandardErrorPath</key><string>$LOG_FILE</string>
</dict></plist>
PLISTEOF
    launchctl unload "$PLIST" 2>/dev/null
    launchctl load "$PLIST"
    echo "Installed. It's running now and will start at every login."
    echo "Test it: finish a Zoom call (or run: bash $SCRIPT_PATH test-popup)."
    echo "Log: $LOG_FILE   ·   Status: bash $SCRIPT_PATH --status"
    ;;
  --uninstall)
    launchctl unload "$PLIST" 2>/dev/null
    rm -f "$PLIST"
    echo "Uninstalled."
    ;;
  --status)
    if launchctl list 2>/dev/null | grep -q com.ajr.callwatcher; then
      echo "running (launchctl: com.ajr.callwatcher)"
    else
      echo "not running"
    fi
    echo "Zoom meeting active now: $(zoom_meeting_active && echo YES || echo no)"
    [ -f "$LOG_FILE" ] && tail -n 5 "$LOG_FILE"
    ;;
  *)
    echo "usage: $0 [run|probe|test-popup|once|--install|--uninstall|--status]" >&2
    exit 1
    ;;
esac
