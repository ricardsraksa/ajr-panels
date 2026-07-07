#!/bin/bash
# AJR call watcher — pops the "Log the call" window when a sales call ends.
#
# Runs 24/7 in the background (installed as a macOS LaunchAgent). Every
# INTERVAL seconds it asks the backend for finished calls; when a new one
# appears it opens close-call.html?deal=<row> as a chromeless app window —
# the popup simply appears, no click needed. WhatsApp remains the
# notification channel; this is the popup channel.
#
# Setup:
#   1. Copy this file anywhere permanent, e.g. ~/ajr/call-watcher.sh
#   2. Create ~/.ajr-watcher.conf with:
#        EXEC_URL="https://script.google.com/macros/s/…/exec"
#        API_KEY="…"
#        PANEL_URL="https://<user>.github.io/ajr-panels"
#   3. bash call-watcher.sh --install     (starts now + at every login)
#
# Other commands: run (foreground loop) · once (single poll, for testing)
#                 --status · --uninstall
set -u

CONF="${AJR_WATCHER_CONF:-$HOME/.ajr-watcher.conf}"
SEEN_FILE="${AJR_WATCHER_SEEN:-$HOME/.ajr-watcher-seen}"
PLIST="$HOME/Library/LaunchAgents/com.ajr.callwatcher.plist"
LOG_FILE="$HOME/Library/Logs/ajr-call-watcher.log"

[ -f "$CONF" ] && . "$CONF"
EXEC_URL="${EXEC_URL:-}"
API_KEY="${API_KEY:-}"
PANEL_URL="${PANEL_URL:-}"
INTERVAL="${INTERVAL:-30}"
# Override for tests, or to use another browser; the URL is appended as the
# last argument (e.g. OPEN_CMD="open -a Firefox").
OPEN_CMD="${OPEN_CMD:-}"

log() { echo "$(date '+%d/%m %H:%M:%S') $*"; }

need_conf() {
  if [ -z "$EXEC_URL" ] || [ -z "$API_KEY" ] || [ -z "$PANEL_URL" ]; then
    echo "Missing config. Create $CONF with EXEC_URL, API_KEY and PANEL_URL (see header of this script)." >&2
    exit 1
  fi
}

open_popup() { # $1=row $2=id
  local url="${PANEL_URL%/}/close-call.html?deal=$1&nudge=$2"
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

poll_once() {
  local resp
  resp=$(curl -sL --max-time 25 "$EXEC_URL?action=pending&key=$API_KEY") || { log "poll failed (network)"; return 0; }
  # -> one line per call: "<id>\t<row>\t<name>"
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
    log "call finished: ${name:-row $row} — opening popup (row $row)"
    open_popup "$row" "$cid"
  done <<< "$calls"
}

case "${1:-run}" in
  run)
    need_conf
    log "watcher running (every ${INTERVAL}s) — popup channel for finished calls"
    while true; do poll_once; sleep "$INTERVAL"; done
    ;;
  once)
    need_conf
    poll_once
    ;;
  --install)
    need_conf
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
    [ -f "$LOG_FILE" ] && tail -n 5 "$LOG_FILE"
    ;;
  *)
    echo "usage: $0 [run|once|--install|--uninstall|--status]" >&2
    exit 1
    ;;
esac
