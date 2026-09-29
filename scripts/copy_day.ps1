# copy_day.ps1 — ก็อปทีละวัน (1 ID = 1 โฟลเดอร์)
# ใช้: powershell -ExecutionPolicy Bypass -File "C:\Users\PC\ZCodeProject\copy_day.ps1" -Id "1zD0bhh5qbOt-biDtPfLadNUVUHt8dp2M" -Date "1.7.69"
param(
  [Parameter(Mandatory=$true)][string]$Id,
  [Parameter(Mandatory=$true)][string]$Date
)
$Rclone = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$destRoot = "gdrive:XBep/$Date"
$dest = "$destRoot/${Id}_$($Date -replace '\.','-')"
$logFile = "C:/Users/PC/rclone_day_${Date}.log"
Write-Host "-> $Date $Id -> $dest" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null
& $Rclone copy "gdrive,root_folder_id=`"$Id`":" "$dest" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail $Id code $LASTEXITCODE see $logFile" -ForegroundColor Yellow } else { Write-Host "done $Date $Id" -ForegroundColor Green }
