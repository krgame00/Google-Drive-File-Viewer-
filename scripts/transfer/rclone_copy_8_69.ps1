# rclone server-side copy 8.69 - 38 folders
# FIX: per-remote root_folder_id (no global --drive-root-folder-id) + shared-with-me
# dest: gdrive:XBep/8.69/ID_DATE  (server-side, no download)
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_8_69.ps1
# limit: 750GB/day - run 1 month per day

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$DriveRemote = $Settings.driveRemote
$Rclone = Resolve-ProjectCommand -Name "rclone" -ConfiguredPath $Settings.rclonePath
Assert-ProjectTransfer -Settings $Settings -Rclone $Rclone
$ErrorActionPreference = $taskPreviousErrorAction
$destRoot = "${DriveRemote}:$($Settings.remoteRoot)/8.69"
$logFile = Join-Path $Settings.logRoot "rclone_8_69.log"
Write-Host "Start 8.69 38 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> 1.8.69 1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z'
& $Rclone copy "${DriveRemote},root_folder_id=`"1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z`":" "$destRoot/1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z_1-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 1.8.69 1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9'
& $Rclone copy "${DriveRemote},root_folder_id=`"1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9`":" "$destRoot/1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9_1-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.8.69 1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ`":" "$destRoot/1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ_2-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.8.69 1R_n5Xe21XPQxQot85sarvALKGR6jCqtL'
& $Rclone copy "${DriveRemote},root_folder_id=`"1R_n5Xe21XPQxQot85sarvALKGR6jCqtL`":" "$destRoot/1R_n5Xe21XPQxQot85sarvALKGR6jCqtL_3-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1R_n5Xe21XPQxQot85sarvALKGR6jCqtL code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.8.69 18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5'
& $Rclone copy "${DriveRemote},root_folder_id=`"18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5`":" "$destRoot/18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5_3-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.8.69 1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB'
& $Rclone copy "${DriveRemote},root_folder_id=`"1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB`":" "$destRoot/1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB_4-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.8.69 1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q'
& $Rclone copy "${DriveRemote},root_folder_id=`"1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q`":" "$destRoot/1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q_4-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.8.69 1PDA8SZa1lnweAnYcp7floYg54eLR6SRU'
& $Rclone copy "${DriveRemote},root_folder_id=`"1PDA8SZa1lnweAnYcp7floYg54eLR6SRU`":" "$destRoot/1PDA8SZa1lnweAnYcp7floYg54eLR6SRU_5-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1PDA8SZa1lnweAnYcp7floYg54eLR6SRU code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.8.69 1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV'
& $Rclone copy "${DriveRemote},root_folder_id=`"1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV`":" "$destRoot/1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV_5-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.8.69 1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC'
& $Rclone copy "${DriveRemote},root_folder_id=`"1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC`":" "$destRoot/1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC_6-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.8.69 1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg'
& $Rclone copy "${DriveRemote},root_folder_id=`"1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg`":" "$destRoot/1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg_6-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.8.69 1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp'
& $Rclone copy "${DriveRemote},root_folder_id=`"1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp`":" "$destRoot/1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp_7-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.8.69 19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx'
& $Rclone copy "${DriveRemote},root_folder_id=`"19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx`":" "$destRoot/19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx_7-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.8.69 15o5uoT0k09JBmtAhJmhkX6X8johIFWKI'
& $Rclone copy "${DriveRemote},root_folder_id=`"15o5uoT0k09JBmtAhJmhkX6X8johIFWKI`":" "$destRoot/15o5uoT0k09JBmtAhJmhkX6X8johIFWKI_8-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 15o5uoT0k09JBmtAhJmhkX6X8johIFWKI code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.8.69 1iAP1qo3MshKSYayjLrblPbir-i5EXdBt'
& $Rclone copy "${DriveRemote},root_folder_id=`"1iAP1qo3MshKSYayjLrblPbir-i5EXdBt`":" "$destRoot/1iAP1qo3MshKSYayjLrblPbir-i5EXdBt_8-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1iAP1qo3MshKSYayjLrblPbir-i5EXdBt code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.8.69 1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO'
& $Rclone copy "${DriveRemote},root_folder_id=`"1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO`":" "$destRoot/1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO_9-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.8.69 1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy'
& $Rclone copy "${DriveRemote},root_folder_id=`"1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy`":" "$destRoot/1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy_9-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.8.69 1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf-'
& $Rclone copy "${DriveRemote},root_folder_id=`"1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf-`":" "$destRoot/1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf-_10-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf- code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.8.69 1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns'
& $Rclone copy "${DriveRemote},root_folder_id=`"1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns`":" "$destRoot/1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns_10-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.8.69 1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj'
& $Rclone copy "${DriveRemote},root_folder_id=`"1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj`":" "$destRoot/1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj_11-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.8.69 1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp'
& $Rclone copy "${DriveRemote},root_folder_id=`"1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp`":" "$destRoot/1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp_12-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.8.69 1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT'
& $Rclone copy "${DriveRemote},root_folder_id=`"1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT`":" "$destRoot/1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT_12-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.8.69 11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV'
& $Rclone copy "${DriveRemote},root_folder_id=`"11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV`":" "$destRoot/11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV_13-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.8.69 19tIsgtqBaKgqHISOfrxQhKWc4njTRuO_'
& $Rclone copy "${DriveRemote},root_folder_id=`"19tIsgtqBaKgqHISOfrxQhKWc4njTRuO_`":" "$destRoot/19tIsgtqBaKgqHISOfrxQhKWc4njTRuO__13-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 19tIsgtqBaKgqHISOfrxQhKWc4njTRuO_ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.8.69 1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g'
& $Rclone copy "${DriveRemote},root_folder_id=`"1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g`":" "$destRoot/1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g_14-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.8.69 1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY'
& $Rclone copy "${DriveRemote},root_folder_id=`"1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY`":" "$destRoot/1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY_15-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.8.69 1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX'
& $Rclone copy "${DriveRemote},root_folder_id=`"1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX`":" "$destRoot/1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX_15-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.8.69 1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe'
& $Rclone copy "${DriveRemote},root_folder_id=`"1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe`":" "$destRoot/1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe_16-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.8.69 1st6iBC_28O43HNg6vai1WQhzgzTBllFw'
& $Rclone copy "${DriveRemote},root_folder_id=`"1st6iBC_28O43HNg6vai1WQhzgzTBllFw`":" "$destRoot/1st6iBC_28O43HNg6vai1WQhzgzTBllFw_16-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1st6iBC_28O43HNg6vai1WQhzgzTBllFw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.8.69 18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ'
& $Rclone copy "${DriveRemote},root_folder_id=`"18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ`":" "$destRoot/18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ_17-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.8.69 1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx'
& $Rclone copy "${DriveRemote},root_folder_id=`"1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx`":" "$destRoot/1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx_17-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.8.69 1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA'
& $Rclone copy "${DriveRemote},root_folder_id=`"1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA`":" "$destRoot/1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA_18-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.8.69 1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm'
& $Rclone copy "${DriveRemote},root_folder_id=`"1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm`":" "$destRoot/1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm_18-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.8.69 1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN'
& $Rclone copy "${DriveRemote},root_folder_id=`"1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN`":" "$destRoot/1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN_19-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.8.69 1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q'
& $Rclone copy "${DriveRemote},root_folder_id=`"1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q`":" "$destRoot/1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q_19-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.8.69 1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw'
& $Rclone copy "${DriveRemote},root_folder_id=`"1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw`":" "$destRoot/1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw_20-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.8.69 1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW'
& $Rclone copy "${DriveRemote},root_folder_id=`"1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW`":" "$destRoot/1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW_21-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.8.69 1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc'
& $Rclone copy "${DriveRemote},root_folder_id=`"1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc`":" "$destRoot/1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc_21-8-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done 8.69" -ForegroundColor Green