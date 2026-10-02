# rclone server-side copy 7.69 - 55 folders
# FIX: per-remote root_folder_id (no global --drive-root-folder-id) + shared-with-me
# dest: gdrive:XBep/7.69/ID_DATE  (server-side, no download)
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_7_69.ps1
# limit: 750GB/day - run 1 month per day

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
$DriveRemote = $Settings.driveRemote
$Rclone = Resolve-ProjectCommand -Name "rclone" -ConfiguredPath $Settings.rclonePath
Assert-ProjectTransfer -Settings $Settings -Rclone $Rclone
$ErrorActionPreference = $taskPreviousErrorAction
$destRoot = "${DriveRemote}:$($Settings.remoteRoot)/7.69"
$logFile = Join-Path $Settings.logRoot "rclone_7_69.log"
Write-Host "Start 7.69 55 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> 1.7.69 1zD0bhh5qbOt-biDtPfLadNUVUHt8dp2M'
& $Rclone copy "${DriveRemote},root_folder_id=`"1zD0bhh5qbOt-biDtPfLadNUVUHt8dp2M`":" "$destRoot/1zD0bhh5qbOt-biDtPfLadNUVUHt8dp2M_1-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1zD0bhh5qbOt-biDtPfLadNUVUHt8dp2M code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 1.7.69 13S0JhTQBMyQyr-jn03Kxv-dooJtOIlc_'
& $Rclone copy "${DriveRemote},root_folder_id=`"13S0JhTQBMyQyr-jn03Kxv-dooJtOIlc_`":" "$destRoot/13S0JhTQBMyQyr-jn03Kxv-dooJtOIlc__1-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 13S0JhTQBMyQyr-jn03Kxv-dooJtOIlc_ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.7.69 1HEpaivTTF9CPgRAEeaJREFMqLdcCnA1I'
& $Rclone copy "${DriveRemote},root_folder_id=`"1HEpaivTTF9CPgRAEeaJREFMqLdcCnA1I`":" "$destRoot/1HEpaivTTF9CPgRAEeaJREFMqLdcCnA1I_2-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1HEpaivTTF9CPgRAEeaJREFMqLdcCnA1I code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.7.69 1zCgbh5p70BwXAuqonxlHGkBHPJ5ngh6p'
& $Rclone copy "${DriveRemote},root_folder_id=`"1zCgbh5p70BwXAuqonxlHGkBHPJ5ngh6p`":" "$destRoot/1zCgbh5p70BwXAuqonxlHGkBHPJ5ngh6p_2-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1zCgbh5p70BwXAuqonxlHGkBHPJ5ngh6p code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.7.69 1rnekiZK4A1UAp-pJdXFNlMj8-oXk59CL'
& $Rclone copy "${DriveRemote},root_folder_id=`"1rnekiZK4A1UAp-pJdXFNlMj8-oXk59CL`":" "$destRoot/1rnekiZK4A1UAp-pJdXFNlMj8-oXk59CL_3-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1rnekiZK4A1UAp-pJdXFNlMj8-oXk59CL code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.7.69 1pCLzxFChe5dnVmeMA-idJ2FrOhaDOh3f'
& $Rclone copy "${DriveRemote},root_folder_id=`"1pCLzxFChe5dnVmeMA-idJ2FrOhaDOh3f`":" "$destRoot/1pCLzxFChe5dnVmeMA-idJ2FrOhaDOh3f_3-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1pCLzxFChe5dnVmeMA-idJ2FrOhaDOh3f code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.7.69 1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe'
& $Rclone copy "${DriveRemote},root_folder_id=`"1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe`":" "$destRoot/1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe_4-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.7.69 1Wi6dQEYJPE_6UY_z10QEnxI1WMcZoKqW'
& $Rclone copy "${DriveRemote},root_folder_id=`"1Wi6dQEYJPE_6UY_z10QEnxI1WMcZoKqW`":" "$destRoot/1Wi6dQEYJPE_6UY_z10QEnxI1WMcZoKqW_4-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Wi6dQEYJPE_6UY_z10QEnxI1WMcZoKqW code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.7.69 1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj'
& $Rclone copy "${DriveRemote},root_folder_id=`"1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj`":" "$destRoot/1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj_5-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.7.69 1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ`":" "$destRoot/1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ_6-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.7.69 1q0mkjqOCZJdmr4ZlWecql9kcdipJoUy9'
& $Rclone copy "${DriveRemote},root_folder_id=`"1q0mkjqOCZJdmr4ZlWecql9kcdipJoUy9`":" "$destRoot/1q0mkjqOCZJdmr4ZlWecql9kcdipJoUy9_6-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1q0mkjqOCZJdmr4ZlWecql9kcdipJoUy9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.7.69 1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB'
& $Rclone copy "${DriveRemote},root_folder_id=`"1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB`":" "$destRoot/1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB_7-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.7.69 1ZFW0u5MnKhThAaU9LMevl4_-izORci3o'
& $Rclone copy "${DriveRemote},root_folder_id=`"1ZFW0u5MnKhThAaU9LMevl4_-izORci3o`":" "$destRoot/1ZFW0u5MnKhThAaU9LMevl4_-izORci3o_7-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ZFW0u5MnKhThAaU9LMevl4_-izORci3o code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.7.69 1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT'
& $Rclone copy "${DriveRemote},root_folder_id=`"1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT`":" "$destRoot/1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT_8-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.7.69 1FfsrETXC2TOwA21FJxyfGSbObnPhHP25'
& $Rclone copy "${DriveRemote},root_folder_id=`"1FfsrETXC2TOwA21FJxyfGSbObnPhHP25`":" "$destRoot/1FfsrETXC2TOwA21FJxyfGSbObnPhHP25_8-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1FfsrETXC2TOwA21FJxyfGSbObnPhHP25 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.7.69 1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq'
& $Rclone copy "${DriveRemote},root_folder_id=`"1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq`":" "$destRoot/1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq_9-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.7.69 1_O0-uu0BIECzxYwNTfeLtuEh__MnwIPl'
& $Rclone copy "${DriveRemote},root_folder_id=`"1_O0-uu0BIECzxYwNTfeLtuEh__MnwIPl`":" "$destRoot/1_O0-uu0BIECzxYwNTfeLtuEh__MnwIPl_9-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1_O0-uu0BIECzxYwNTfeLtuEh__MnwIPl code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.7.69 1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV'
& $Rclone copy "${DriveRemote},root_folder_id=`"1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV`":" "$destRoot/1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV_10-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.7.69 1MWU-mzMYzegZcJQdrfdNSssTz3p3S2Td'
& $Rclone copy "${DriveRemote},root_folder_id=`"1MWU-mzMYzegZcJQdrfdNSssTz3p3S2Td`":" "$destRoot/1MWU-mzMYzegZcJQdrfdNSssTz3p3S2Td_10-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1MWU-mzMYzegZcJQdrfdNSssTz3p3S2Td code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.7.69 1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1'
& $Rclone copy "${DriveRemote},root_folder_id=`"1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1`":" "$destRoot/1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1_11-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.7.69 1AQvgarERCt_dK0Ir16q_6IlpuPAi3K1R'
& $Rclone copy "${DriveRemote},root_folder_id=`"1AQvgarERCt_dK0Ir16q_6IlpuPAi3K1R`":" "$destRoot/1AQvgarERCt_dK0Ir16q_6IlpuPAi3K1R_11-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1AQvgarERCt_dK0Ir16q_6IlpuPAi3K1R code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.7.69 15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd'
& $Rclone copy "${DriveRemote},root_folder_id=`"15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd`":" "$destRoot/15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd_12-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.7.69 1UmAUXuP9TRBpVCbhshV0ht89zTb4ZP4r'
& $Rclone copy "${DriveRemote},root_folder_id=`"1UmAUXuP9TRBpVCbhshV0ht89zTb4ZP4r`":" "$destRoot/1UmAUXuP9TRBpVCbhshV0ht89zTb4ZP4r_12-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1UmAUXuP9TRBpVCbhshV0ht89zTb4ZP4r code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.7.69 1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q'
& $Rclone copy "${DriveRemote},root_folder_id=`"1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q`":" "$destRoot/1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q_13-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.7.69 1QgKWXYGQpG-Vj5Ze5T1wn7Z3iviw1ziG'
& $Rclone copy "${DriveRemote},root_folder_id=`"1QgKWXYGQpG-Vj5Ze5T1wn7Z3iviw1ziG`":" "$destRoot/1QgKWXYGQpG-Vj5Ze5T1wn7Z3iviw1ziG_13-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QgKWXYGQpG-Vj5Ze5T1wn7Z3iviw1ziG code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.7.69 1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ`":" "$destRoot/1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ_14-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.7.69 1DF74gOJAq9xbHUZri7qSDzEzVSwFn7HZ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1DF74gOJAq9xbHUZri7qSDzEzVSwFn7HZ`":" "$destRoot/1DF74gOJAq9xbHUZri7qSDzEzVSwFn7HZ_14-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1DF74gOJAq9xbHUZri7qSDzEzVSwFn7HZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.7.69 1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk'
& $Rclone copy "${DriveRemote},root_folder_id=`"1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk`":" "$destRoot/1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk_15-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.7.69 1DJF5Zrkk7W4WLUgGlVtvBcYB3EXnmewZ'
& $Rclone copy "${DriveRemote},root_folder_id=`"1DJF5Zrkk7W4WLUgGlVtvBcYB3EXnmewZ`":" "$destRoot/1DJF5Zrkk7W4WLUgGlVtvBcYB3EXnmewZ_15-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1DJF5Zrkk7W4WLUgGlVtvBcYB3EXnmewZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.7.69 13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw'
& $Rclone copy "${DriveRemote},root_folder_id=`"13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw`":" "$destRoot/13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw_16-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.7.69 1ykDtSx84CqKo8ESDvfyYgT218KNT0yw7'
& $Rclone copy "${DriveRemote},root_folder_id=`"1ykDtSx84CqKo8ESDvfyYgT218KNT0yw7`":" "$destRoot/1ykDtSx84CqKo8ESDvfyYgT218KNT0yw7_16-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ykDtSx84CqKo8ESDvfyYgT218KNT0yw7 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.7.69 1HN3X-aAC-c0pMI04vlTF0X104_I4hFdb'
& $Rclone copy "${DriveRemote},root_folder_id=`"1HN3X-aAC-c0pMI04vlTF0X104_I4hFdb`":" "$destRoot/1HN3X-aAC-c0pMI04vlTF0X104_I4hFdb_17-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1HN3X-aAC-c0pMI04vlTF0X104_I4hFdb code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.7.69 1brex06v1xI1mtJ3JND6v8o6u05aMUWNL'
& $Rclone copy "${DriveRemote},root_folder_id=`"1brex06v1xI1mtJ3JND6v8o6u05aMUWNL`":" "$destRoot/1brex06v1xI1mtJ3JND6v8o6u05aMUWNL_17-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1brex06v1xI1mtJ3JND6v8o6u05aMUWNL code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.7.69 1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM'
& $Rclone copy "${DriveRemote},root_folder_id=`"1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM`":" "$destRoot/1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM_17-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.7.69 1XueK8CLFy0u8PzMmqPFonOuoXuc3QpLR'
& $Rclone copy "${DriveRemote},root_folder_id=`"1XueK8CLFy0u8PzMmqPFonOuoXuc3QpLR`":" "$destRoot/1XueK8CLFy0u8PzMmqPFonOuoXuc3QpLR_17-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XueK8CLFy0u8PzMmqPFonOuoXuc3QpLR code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.7.69 10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh'
& $Rclone copy "${DriveRemote},root_folder_id=`"10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh`":" "$destRoot/10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh_18-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.7.69 1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b'
& $Rclone copy "${DriveRemote},root_folder_id=`"1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b`":" "$destRoot/1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b_19-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.7.69 1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE'
& $Rclone copy "${DriveRemote},root_folder_id=`"1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE`":" "$destRoot/1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE_20-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.7.69 1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl'
& $Rclone copy "${DriveRemote},root_folder_id=`"1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl`":" "$destRoot/1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl_21-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.7.69 1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM'
& $Rclone copy "${DriveRemote},root_folder_id=`"1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM`":" "$destRoot/1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM_22-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.7.69 1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO'
& $Rclone copy "${DriveRemote},root_folder_id=`"1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO`":" "$destRoot/1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO_23-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.7.69 1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs'
& $Rclone copy "${DriveRemote},root_folder_id=`"1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs`":" "$destRoot/1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs_24-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.7.69 14L_9pmLLxQaCUSARjFZvw-9vBtXGMluw'
& $Rclone copy "${DriveRemote},root_folder_id=`"14L_9pmLLxQaCUSARjFZvw-9vBtXGMluw`":" "$destRoot/14L_9pmLLxQaCUSARjFZvw-9vBtXGMluw_25-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 14L_9pmLLxQaCUSARjFZvw-9vBtXGMluw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.7.69 1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh'
& $Rclone copy "${DriveRemote},root_folder_id=`"1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh`":" "$destRoot/1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh_25-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.7.69 1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf'
& $Rclone copy "${DriveRemote},root_folder_id=`"1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf`":" "$destRoot/1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf_26-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.7.69 1Dfj0r1GFmJqqqftJU3dwmkdioFtBjdg0'
& $Rclone copy "${DriveRemote},root_folder_id=`"1Dfj0r1GFmJqqqftJU3dwmkdioFtBjdg0`":" "$destRoot/1Dfj0r1GFmJqqqftJU3dwmkdioFtBjdg0_27-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Dfj0r1GFmJqqqftJU3dwmkdioFtBjdg0 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.7.69 1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53'
& $Rclone copy "${DriveRemote},root_folder_id=`"1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53`":" "$destRoot/1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53_27-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.7.69 1TDKUPO0cc0WwEWKXEP3V5m__GEEHVTsR'
& $Rclone copy "${DriveRemote},root_folder_id=`"1TDKUPO0cc0WwEWKXEP3V5m__GEEHVTsR`":" "$destRoot/1TDKUPO0cc0WwEWKXEP3V5m__GEEHVTsR_28-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1TDKUPO0cc0WwEWKXEP3V5m__GEEHVTsR code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.7.69 1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z'
& $Rclone copy "${DriveRemote},root_folder_id=`"1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z`":" "$destRoot/1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z_28-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.7.69 1TU1MPB-bEnFohcKr_UkOTcz3fo3CR97Q'
& $Rclone copy "${DriveRemote},root_folder_id=`"1TU1MPB-bEnFohcKr_UkOTcz3fo3CR97Q`":" "$destRoot/1TU1MPB-bEnFohcKr_UkOTcz3fo3CR97Q_29-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1TU1MPB-bEnFohcKr_UkOTcz3fo3CR97Q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.7.69 18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko'
& $Rclone copy "${DriveRemote},root_folder_id=`"18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko`":" "$destRoot/18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko_29-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.7.69 1DjVGVl_2N4dXKC9PPbgdvj7rK4KB8Qx-'
& $Rclone copy "${DriveRemote},root_folder_id=`"1DjVGVl_2N4dXKC9PPbgdvj7rK4KB8Qx-`":" "$destRoot/1DjVGVl_2N4dXKC9PPbgdvj7rK4KB8Qx-_30-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1DjVGVl_2N4dXKC9PPbgdvj7rK4KB8Qx- code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.7.69 1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa'
& $Rclone copy "${DriveRemote},root_folder_id=`"1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa`":" "$destRoot/1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa_30-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 31.7.69 1WXsIjW2GpI28LSMoFUmjHbY-iAc7qHJ9'
& $Rclone copy "${DriveRemote},root_folder_id=`"1WXsIjW2GpI28LSMoFUmjHbY-iAc7qHJ9`":" "$destRoot/1WXsIjW2GpI28LSMoFUmjHbY-iAc7qHJ9_31-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1WXsIjW2GpI28LSMoFUmjHbY-iAc7qHJ9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 31.7.69 1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4'
& $Rclone copy "${DriveRemote},root_folder_id=`"1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4`":" "$destRoot/1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4_31-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done 7.69" -ForegroundColor Green