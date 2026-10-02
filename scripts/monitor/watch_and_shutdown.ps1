# Watch rclone 7.69 MAIN — auto shutdown when done (2 min countdown, cancellable with shutdown /a)
$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$log = Join-Path $Settings.logRoot "rclone_7_69_main.log"
if (-not (Test-Path -LiteralPath $Settings.logRoot -PathType Container)) { throw "logRoot does not exist. Check scripts/config.local.json." }
$ErrorActionPreference = $taskPreviousErrorAction
Write-Host "Watching $log for 'Done 7.69 MAIN' -> shutdown /s /t 120" -ForegroundColor Cyan
while ($true) {
  if (Test-Path $log) {
    $hit = Select-String -Path $log -Pattern "Done 7\.69 MAIN" -Quiet -ErrorAction SilentlyContinue
    if ($hit) {
      Write-Host ""
      Write-Host "===== DONE 7.69 MAIN — shutting down in 120s =====" -ForegroundColor Green
      Get-Content $log -Tail 20
      # 2 minute countdown — cancel with: shutdown /a
      shutdown /s /t 120 /c "rclone 7.69 MAIN done - auto shutdown in 2 min (run shutdown /a to cancel)"
      Write-Host "Shutdown scheduled: 120s. Cancel with: shutdown /a" -ForegroundColor Yellow
      exit 0
    }
  }
  Start-Sleep -Seconds 30
}
