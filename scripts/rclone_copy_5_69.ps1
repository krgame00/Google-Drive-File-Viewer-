# rclone server-side copy 5.69 - 61 folders
# FIX: per-remote root_folder_id (no global --drive-root-folder-id) + shared-with-me
# dest: gdrive:XBep/5.69/ID_DATE  (server-side, no download)
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_5_69.ps1
# limit: 750GB/day - run 1 month per day

$Rclone = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$destRoot = "gdrive:XBep/5.69"
$logFile = "C:/Users/PC/rclone_5_69.log"
Write-Host "Start 5.69 61 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> 1.5.69 1PmnXimW5HMSMtmnENqii6ThWE2URnU5E'
& $Rclone copy 'gdrive,root_folder_id="1PmnXimW5HMSMtmnENqii6ThWE2URnU5E":' "$destRoot/1PmnXimW5HMSMtmnENqii6ThWE2URnU5E_1-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1PmnXimW5HMSMtmnENqii6ThWE2URnU5E code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 1.5.69 1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl'
& $Rclone copy 'gdrive,root_folder_id="1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl":' "$destRoot/1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl_1-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 1.5.69 1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI'
& $Rclone copy 'gdrive,root_folder_id="1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI":' "$destRoot/1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI_1-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.5.69 1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL'
& $Rclone copy 'gdrive,root_folder_id="1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL":' "$destRoot/1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL_2-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.5.69 1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX'
& $Rclone copy 'gdrive,root_folder_id="1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX":' "$destRoot/1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX_2-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.5.69 17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9'
& $Rclone copy 'gdrive,root_folder_id="17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9":' "$destRoot/17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9_3-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.5.69 1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ'
& $Rclone copy 'gdrive,root_folder_id="1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ":' "$destRoot/1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ_3-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.5.69 1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK'
& $Rclone copy 'gdrive,root_folder_id="1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK":' "$destRoot/1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK_4-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.5.69 1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP'
& $Rclone copy 'gdrive,root_folder_id="1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP":' "$destRoot/1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP_4-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.5.69 1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm'
& $Rclone copy 'gdrive,root_folder_id="1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm":' "$destRoot/1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm_5-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.5.69 1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7'
& $Rclone copy 'gdrive,root_folder_id="1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7":' "$destRoot/1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7_5-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.5.69 1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f'
& $Rclone copy 'gdrive,root_folder_id="1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f":' "$destRoot/1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f_6-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.5.69 1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV'
& $Rclone copy 'gdrive,root_folder_id="1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV":' "$destRoot/1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV_6-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.5.69 16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj'
& $Rclone copy 'gdrive,root_folder_id="16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj":' "$destRoot/16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj_7-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.5.69 1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w'
& $Rclone copy 'gdrive,root_folder_id="1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w":' "$destRoot/1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w_7-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.5.69 1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl'
& $Rclone copy 'gdrive,root_folder_id="1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl":' "$destRoot/1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl_8-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.5.69 1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT'
& $Rclone copy 'gdrive,root_folder_id="1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT":' "$destRoot/1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT_8-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.5.69 16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv'
& $Rclone copy 'gdrive,root_folder_id="16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv":' "$destRoot/16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv_9-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.5.69 15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs'
& $Rclone copy 'gdrive,root_folder_id="15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs":' "$destRoot/15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs_9-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.5.69 10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn'
& $Rclone copy 'gdrive,root_folder_id="10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn":' "$destRoot/10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn_10-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.5.69 1cKlbArarLMxe2EhM5RpVm_l51ACekzFq'
& $Rclone copy 'gdrive,root_folder_id="1cKlbArarLMxe2EhM5RpVm_l51ACekzFq":' "$destRoot/1cKlbArarLMxe2EhM5RpVm_l51ACekzFq_10-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1cKlbArarLMxe2EhM5RpVm_l51ACekzFq code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.5.69 1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ'
& $Rclone copy 'gdrive,root_folder_id="1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ":' "$destRoot/1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ_11-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.5.69 1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK'
& $Rclone copy 'gdrive,root_folder_id="1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK":' "$destRoot/1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK_11-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.5.69 1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e'
& $Rclone copy 'gdrive,root_folder_id="1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e":' "$destRoot/1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e_12-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.5.69 1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2'
& $Rclone copy 'gdrive,root_folder_id="1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2":' "$destRoot/1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2_13-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.5.69 1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54'
& $Rclone copy 'gdrive,root_folder_id="1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54":' "$destRoot/1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54_14-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.5.69 1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5'
& $Rclone copy 'gdrive,root_folder_id="1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5":' "$destRoot/1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5_14-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.5.69 1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv'
& $Rclone copy 'gdrive,root_folder_id="1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv":' "$destRoot/1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv_15-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.5.69 17c9g2acUVGT0Jfzocqkgem33FmlmWa6W'
& $Rclone copy 'gdrive,root_folder_id="17c9g2acUVGT0Jfzocqkgem33FmlmWa6W":' "$destRoot/17c9g2acUVGT0Jfzocqkgem33FmlmWa6W_15-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 17c9g2acUVGT0Jfzocqkgem33FmlmWa6W code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.5.69 1I2-havVVeE2GdyqyBonYMI0JXeC8c208'
& $Rclone copy 'gdrive,root_folder_id="1I2-havVVeE2GdyqyBonYMI0JXeC8c208":' "$destRoot/1I2-havVVeE2GdyqyBonYMI0JXeC8c208_16-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1I2-havVVeE2GdyqyBonYMI0JXeC8c208 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.5.69 1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi'
& $Rclone copy 'gdrive,root_folder_id="1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi":' "$destRoot/1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi_16-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.5.69 1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp'
& $Rclone copy 'gdrive,root_folder_id="1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp":' "$destRoot/1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp_17-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.5.69 1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy'
& $Rclone copy 'gdrive,root_folder_id="1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy":' "$destRoot/1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy_17-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.5.69 1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH'
& $Rclone copy 'gdrive,root_folder_id="1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH":' "$destRoot/1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH_18-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.5.69 1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT'
& $Rclone copy 'gdrive,root_folder_id="1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT":' "$destRoot/1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT_18-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.5.69 12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0'
& $Rclone copy 'gdrive,root_folder_id="12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0":' "$destRoot/12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0_19-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.5.69 1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8'
& $Rclone copy 'gdrive,root_folder_id="1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8":' "$destRoot/1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8_19-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.5.69 15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg'
& $Rclone copy 'gdrive,root_folder_id="15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg":' "$destRoot/15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg_20-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.5.69 1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi'
& $Rclone copy 'gdrive,root_folder_id="1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi":' "$destRoot/1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi_20-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.5.69 1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4'
& $Rclone copy 'gdrive,root_folder_id="1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4":' "$destRoot/1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4_21-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.5.69 19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa'
& $Rclone copy 'gdrive,root_folder_id="19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa":' "$destRoot/19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa_21-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.5.69 1D5UYpqZc205nwpxqYv6eqnezszSs9xID'
& $Rclone copy 'gdrive,root_folder_id="1D5UYpqZc205nwpxqYv6eqnezszSs9xID":' "$destRoot/1D5UYpqZc205nwpxqYv6eqnezszSs9xID_22-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1D5UYpqZc205nwpxqYv6eqnezszSs9xID code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.5.69 1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe'
& $Rclone copy 'gdrive,root_folder_id="1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe":' "$destRoot/1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe_22-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.5.69 1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95'
& $Rclone copy 'gdrive,root_folder_id="1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95":' "$destRoot/1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95_23-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.5.69 1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh'
& $Rclone copy 'gdrive,root_folder_id="1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh":' "$destRoot/1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh_23-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.5.69 1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy'
& $Rclone copy 'gdrive,root_folder_id="1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy":' "$destRoot/1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy_24-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.5.69 1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9'
& $Rclone copy 'gdrive,root_folder_id="1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9":' "$destRoot/1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9_24-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.5.69 1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz'
& $Rclone copy 'gdrive,root_folder_id="1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz":' "$destRoot/1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz_25-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.5.69 1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa'
& $Rclone copy 'gdrive,root_folder_id="1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa":' "$destRoot/1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa_25-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.5.69 1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF'
& $Rclone copy 'gdrive,root_folder_id="1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF":' "$destRoot/1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF_26-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.5.69 1VUVLF11659zIrx080rMPlF4o1c9TRhyv'
& $Rclone copy 'gdrive,root_folder_id="1VUVLF11659zIrx080rMPlF4o1c9TRhyv":' "$destRoot/1VUVLF11659zIrx080rMPlF4o1c9TRhyv_26-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1VUVLF11659zIrx080rMPlF4o1c9TRhyv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.5.69 1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L_'
& $Rclone copy 'gdrive,root_folder_id="1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L_":' "$destRoot/1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L__27-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L_ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.5.69 1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy'
& $Rclone copy 'gdrive,root_folder_id="1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy":' "$destRoot/1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy_27-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.5.69 1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W'
& $Rclone copy 'gdrive,root_folder_id="1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W":' "$destRoot/1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W_28-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.5.69 1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9'
& $Rclone copy 'gdrive,root_folder_id="1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9":' "$destRoot/1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9_28-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.5.69 1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM'
& $Rclone copy 'gdrive,root_folder_id="1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM":' "$destRoot/1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM_29-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.5.69 1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv'
& $Rclone copy 'gdrive,root_folder_id="1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv":' "$destRoot/1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv_29-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.5.69 1kZypUy-89IG0AI_z17wGpJZVMROHjxSN'
& $Rclone copy 'gdrive,root_folder_id="1kZypUy-89IG0AI_z17wGpJZVMROHjxSN":' "$destRoot/1kZypUy-89IG0AI_z17wGpJZVMROHjxSN_30-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1kZypUy-89IG0AI_z17wGpJZVMROHjxSN code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.5.69 1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4'
& $Rclone copy 'gdrive,root_folder_id="1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4":' "$destRoot/1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4_30-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 31.5.69 1zk9sLb2K3DG4noD8uWNNq1JooavL4shV'
& $Rclone copy 'gdrive,root_folder_id="1zk9sLb2K3DG4noD8uWNNq1JooavL4shV":' "$destRoot/1zk9sLb2K3DG4noD8uWNNq1JooavL4shV_31-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1zk9sLb2K3DG4noD8uWNNq1JooavL4shV code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 31.5.69 1tdsb_ifW6vG59WhrinprUpePArnFE6rE'
& $Rclone copy 'gdrive,root_folder_id="1tdsb_ifW6vG59WhrinprUpePArnFE6rE":' "$destRoot/1tdsb_ifW6vG59WhrinprUpePArnFE6rE_31-5-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1tdsb_ifW6vG59WhrinprUpePArnFE6rE code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done 5.69" -ForegroundColor Green