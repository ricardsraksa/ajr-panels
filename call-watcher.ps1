# AJR call watcher (Windows) — pops the "Log the call" window when a call ends.
#
# Setup:
#   1. Copy this file somewhere permanent, e.g. C:\ajr\call-watcher.ps1
#   2. Create %USERPROFILE%\.ajr-watcher.json with:
#        { "EXEC_URL": "https://script.google.com/macros/s/…/exec",
#          "API_KEY": "…",
#          "PANEL_URL": "https://<user>.github.io/ajr-panels" }
#   3. Auto-start at login: press Win+R, type  shell:startup  , and create a
#      shortcut there with target:
#        powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\ajr\call-watcher.ps1
#      (double-click the shortcut once to start it now)

$conf = Get-Content "$env:USERPROFILE\.ajr-watcher.json" -Raw | ConvertFrom-Json
$seenFile = "$env:USERPROFILE\.ajr-watcher-seen.txt"
$interval = 30

while ($true) {
  try {
    $resp = Invoke-RestMethod -Uri "$($conf.EXEC_URL)?action=pending&key=$($conf.API_KEY)" -TimeoutSec 25
    if ($resp.ok -and $resp.calls) {
      $seen = @()
      if (Test-Path $seenFile) { $seen = Get-Content $seenFile }
      foreach ($c in $resp.calls) {
        if ($seen -notcontains $c.id) {
          Add-Content $seenFile $c.id
          $url = "$($conf.PANEL_URL.TrimEnd('/'))/close-call.html?deal=$($c.row)&nudge=$($c.id)"
          $chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
          if (Test-Path $chrome) { Start-Process $chrome "--app=$url" }
          else { Start-Process msedge "--app=$url" }
        }
      }
      # keep the seen file small
      if ((Get-Content $seenFile -ErrorAction SilentlyContinue).Count -gt 100) {
        Get-Content $seenFile | Select-Object -Last 100 | Set-Content $seenFile
      }
    }
  } catch { <# network blip — next tick retries #> }
  Start-Sleep -Seconds $interval
}
