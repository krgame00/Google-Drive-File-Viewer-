# All months 219 folders -> gdrive:XBep/


$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$Rclone = Resolve-ProjectCommand -Name "rclone" -ConfiguredPath $Settings.rclonePath
Assert-ProjectTransfer -Settings $Settings -Rclone $Rclone
$ErrorActionPreference = $taskPreviousErrorAction

Write-Host "=== 5.69 ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "rclone_copy_5_69.ps1")

Write-Host "=== 6.69 ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "rclone_copy_6_69.ps1")

Write-Host "=== 7.69 ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "rclone_copy_7_69.ps1")

Write-Host "=== 8.69 ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "rclone_copy_8_69.ps1")

Write-Host "All done - check $($Settings.logRoot)/rclone_*.log" -ForegroundColor Green
