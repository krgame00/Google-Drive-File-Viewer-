# copy_day.ps1 — ก็อปทีละวัน (1 ID = 1 โฟลเดอร์)
# ใช้จากรากโปรเจกต์: powershell -ExecutionPolicy Bypass -File "scripts/transfer/copy_day.ps1" -Id "<folder-id>" -Date "1.7.69"
param(
  [Parameter(Mandatory=$true)][string]$Id,
  [Parameter(Mandatory=$true)][string]$Date
)
$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$DriveRemote = $Settings.driveRemote
$Rclone = Resolve-ProjectCommand -Name "rclone" -ConfiguredPath $Settings.rclonePath
Assert-ProjectTransfer -Settings $Settings -Rclone $Rclone
$ErrorActionPreference = $taskPreviousErrorAction
$destRoot = "${DriveRemote}:$($Settings.remoteRoot)/$Date"
$dest = "$destRoot/${Id}_$($Date -replace '\.','-')"
$logFile = Join-Path $Settings.logRoot "rclone_day_${Date}.log"
Write-Host "-> $Date $Id -> $dest" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null
& $Rclone copy "${DriveRemote},root_folder_id=`"$Id`":" "$dest" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail $Id code $LASTEXITCODE see $logFile" -ForegroundColor Yellow } else { Write-Host "done $Date $Id" -ForegroundColor Green }
