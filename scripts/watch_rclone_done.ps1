# Watch rclone 7.69 MAIN — notify when done, DO NOT shutdown automatically
$log = "C:/Users/PC/rclone_7_69_main.log"
Write-Host "Watching $log for 'Done 7.69 MAIN' ... press Ctrl+C to stop" -ForegroundColor Cyan
while ($true) {
  if (Test-Path $log) {
    $hit = Select-String -Path $log -Pattern "Done 7\.69 MAIN" -Quiet -ErrorAction SilentlyContinue
    if ($hit) {
      Write-Host ""
      Write-Host "===== DONE 7.69 MAIN =====" -ForegroundColor Green
      Get-Content $log -Tail 20 | Write-Host
      Write-Host "Ready to shutdown — ASK USER FIRST (do not shutdown automatically)" -ForegroundColor Yellow
      exit 0
    }
    # also detect if rclone process gone but log says Transferred and no errors
    $tail = Get-Content $log -Tail 5 -ErrorAction SilentlyContinue | Out-String
    if ($tail -match "Transferred:" -and $tail -match "100%") {
      # still waiting for Done marker from script
    }
  }
  Start-Sleep -Seconds 30
}
