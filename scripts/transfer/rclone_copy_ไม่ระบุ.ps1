# rclone server-side copy ไม่ระบุ - 5 folders
# FIX: per-remote root_folder_id (no global --drive-root-folder-id) + shared-with-me
# dest: gdrive:XBep/ไม่ระบุ/ID_DATE  (server-side, no download)
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_ไม่ระบุ.ps1
# limit: 750GB/day - run 1 month per day

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$DriveRemote = $Settings.driveRemote
$Rclone = Resolve-ProjectCommand -Name "rclone" -ConfiguredPath $Settings.rclonePath
Assert-ProjectTransfer -Settings $Settings -Rclone $Rclone
$ErrorActionPreference = $taskPreviousErrorAction
$destRoot = "${DriveRemote}:$($Settings.remoteRoot)/ไม่ระบุ"
$logFile = Join-Path $Settings.logRoot "rclone_ไม่ระบุ.log"
Write-Host "Start ไม่ระบุ 5 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> ไม่ระบุ 17NcXdOBdf_Zf6ujlzpwnAWv1mvlaEBWH'
& $Rclone copy "${DriveRemote},root_folder_id=`"17NcXdOBdf_Zf6ujlzpwnAWv1mvlaEBWH`":" "$destRoot/17NcXdOBdf_Zf6ujlzpwnAWv1mvlaEBWH_ไม่ระบุ" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 17NcXdOBdf_Zf6ujlzpwnAWv1mvlaEBWH code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> ไม่ระบุ 1DA_WezQY2KjEFbEFAVHmCvTuNjmAsj6b'
& $Rclone copy "${DriveRemote},root_folder_id=`"1DA_WezQY2KjEFbEFAVHmCvTuNjmAsj6b`":" "$destRoot/1DA_WezQY2KjEFbEFAVHmCvTuNjmAsj6b_ไม่ระบุ" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1DA_WezQY2KjEFbEFAVHmCvTuNjmAsj6b code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> ไม่ระบุ 1CtjQE7ltjvgae21grM8pl0TX02-5exsZ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1CtjQE7ltjvgae21grM8pl0TX02-5exsZ`":" "$destRoot/1CtjQE7ltjvgae21grM8pl0TX02-5exsZ_ไม่ระบุ" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1CtjQE7ltjvgae21grM8pl0TX02-5exsZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> ไม่ระบุ 1Ank27pxjLRv6YIUdGgHZ22fkS3dFiehk'
& $Rclone copy "${DriveRemote},root_folder_id=`"1Ank27pxjLRv6YIUdGgHZ22fkS3dFiehk`":" "$destRoot/1Ank27pxjLRv6YIUdGgHZ22fkS3dFiehk_ไม่ระบุ" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Ank27pxjLRv6YIUdGgHZ22fkS3dFiehk code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> ไม่ระบุ 1m3ndMvES2C6qb3Gnqj6QJDNKsr_ASDgp'
& $Rclone copy "${DriveRemote},root_folder_id=`"1m3ndMvES2C6qb3Gnqj6QJDNKsr_ASDgp`":" "$destRoot/1m3ndMvES2C6qb3Gnqj6QJDNKsr_ASDgp_ไม่ระบุ" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1m3ndMvES2C6qb3Gnqj6QJDNKsr_ASDgp code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done ไม่ระบุ" -ForegroundColor Green