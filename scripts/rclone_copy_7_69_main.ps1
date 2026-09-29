# rclone server-side copy 7.69 MAIN only - 28 folders (ข้าม มืด + ข้าม 1-3.7.69)
# dest: gdrive:XBep/7.69/ID_DATE  server-side
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_7_69_main.ps1

$Rclone = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$destRoot = "gdrive:XBep/7.69"
$logFile = "C:/Users/PC/rclone_7_69_main.log"
Write-Host "Start 7.69 MAIN 28 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> 4.7.69 1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe'
& $Rclone copy 'gdrive,root_folder_id="1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe":' "$destRoot/1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe_4-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1o1Mw8_eBkrLxxTU99eP8LivzZ-NjkMVe code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.7.69 1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj'
& $Rclone copy 'gdrive,root_folder_id="1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj":' "$destRoot/1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj_5-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1zDKCZfxoihXrxmve_1Aymi8Q6U0vkndj code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.7.69 1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ'
& $Rclone copy 'gdrive,root_folder_id="1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ":' "$destRoot/1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ_6-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1TssvPMEPiMjbdK5ZmMoLjmjqVbCBS7PQ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.7.69 1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB'
& $Rclone copy 'gdrive,root_folder_id="1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB":' "$destRoot/1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB_7-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1hxic1JFCCQRhP-YOwZoM-hChMTAxQrZB code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.7.69 1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT'
& $Rclone copy 'gdrive,root_folder_id="1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT":' "$destRoot/1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT_8-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1oTwt47vKrcCIvUeX4CS5Y1fAkVEXNFYT code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.7.69 1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq'
& $Rclone copy 'gdrive,root_folder_id="1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq":' "$destRoot/1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq_9-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QLk3Ju_NGGb2z9lQ5OhhSxjpnf247XIq code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.7.69 1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV'
& $Rclone copy 'gdrive,root_folder_id="1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV":' "$destRoot/1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV_10-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1tad9J-tGuQK_HowNZmtmQxZIHb5KARVV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.7.69 1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1'
& $Rclone copy 'gdrive,root_folder_id="1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1":' "$destRoot/1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1_11-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1lB_Z5otMNiq1w1hJLE88uOO7h8thkij1 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.7.69 15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd'
& $Rclone copy 'gdrive,root_folder_id="15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd":' "$destRoot/15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd_12-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 15-Ghp-80gxzdzfwlYmirPKiILq_D3mzd code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.7.69 1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q'
& $Rclone copy 'gdrive,root_folder_id="1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q":' "$destRoot/1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q_13-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1N1CwfJD5Sunoloc2NqC8KpQdinPQMq-q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.7.69 1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ'
& $Rclone copy 'gdrive,root_folder_id="1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ":' "$destRoot/1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ_14-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1GG4FWIWUgcvz2AM678dcfKaG16I8BviZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.7.69 1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk'
& $Rclone copy 'gdrive,root_folder_id="1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk":' "$destRoot/1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk_15-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1m4BC8LkSI1TvNYfG-suDwo-_fAnXTpBk code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.7.69 13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw'
& $Rclone copy 'gdrive,root_folder_id="13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw":' "$destRoot/13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw_16-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 13QGvi7g5LQqk5sz3rzQJM8F6cfmgvfDw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.7.69 1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM'
& $Rclone copy 'gdrive,root_folder_id="1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM":' "$destRoot/1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM_17-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1JcSTgTdPEG2TjjxcHcA-yvjrC2SKr5bM code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.7.69 10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh'
& $Rclone copy 'gdrive,root_folder_id="10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh":' "$destRoot/10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh_18-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 10WSCMYLT_Oc2hwb9y3T1BUgpgUE20Ynh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.7.69 1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b'
& $Rclone copy 'gdrive,root_folder_id="1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b":' "$destRoot/1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b_19-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1rpC3x91lNJrxcDXXhteE5JsN7Iy6QJ0b code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.7.69 1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE'
& $Rclone copy 'gdrive,root_folder_id="1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE":' "$destRoot/1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE_20-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1a1syD4aNx0a6_k_SGZxNOSUgONgjZNoE code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.7.69 1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl'
& $Rclone copy 'gdrive,root_folder_id="1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl":' "$destRoot/1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl_21-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1nfmxcHjsBSE1U1mSvu-DGLMDWMvp2NUl code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.7.69 1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM'
& $Rclone copy 'gdrive,root_folder_id="1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM":' "$destRoot/1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM_22-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ODXETZZsm-2ddTZnu0WcXqy06R9NSNhM code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.7.69 1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO'
& $Rclone copy 'gdrive,root_folder_id="1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO":' "$destRoot/1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO_23-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1B9Ti4X9uTwy0vzWkmeyO3n-S0bQcBoRO code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.7.69 1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs'
& $Rclone copy 'gdrive,root_folder_id="1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs":' "$destRoot/1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs_24-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1SkkI4lvftZgZj_ZQhytEvhuI58F0ClOs code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.7.69 1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh'
& $Rclone copy 'gdrive,root_folder_id="1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh":' "$destRoot/1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh_25-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1UIjdw2oZagdhO_DGSoHtzlY2qBaBVmyh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.7.69 1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf'
& $Rclone copy 'gdrive,root_folder_id="1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf":' "$destRoot/1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf_26-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QjsQQIzlY9dd_6tf7q_Gmd-cCPdH-4Xf code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.7.69 1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53'
& $Rclone copy 'gdrive,root_folder_id="1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53":' "$destRoot/1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53_27-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1AQixXPNiR2oEVIc2Oj1i1RLHR5gr4Z53 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.7.69 1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z'
& $Rclone copy 'gdrive,root_folder_id="1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z":' "$destRoot/1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z_28-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Kjeg_6wCyPmxaQZWkXd2vhwq3W_Ybx4z code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.7.69 18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko'
& $Rclone copy 'gdrive,root_folder_id="18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko":' "$destRoot/18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko_29-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 18zaTmVz1w6vPyFKGKz59uzA-RGCrf5ko code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.7.69 1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa'
& $Rclone copy 'gdrive,root_folder_id="1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa":' "$destRoot/1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa_30-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1qW4qnTN5vzsZIfExGvSUCh-ndyZ44SIa code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 31.7.69 1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4'
& $Rclone copy 'gdrive,root_folder_id="1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4":' "$destRoot/1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4_31-7-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1T1M_8QyvXi5abrct-BAvGkeZsBqaH9I4 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done 7.69 MAIN" -ForegroundColor Green