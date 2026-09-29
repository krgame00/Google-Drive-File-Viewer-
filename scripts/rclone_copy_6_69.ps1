# rclone server-side copy 6.69 - 60 folders
# FIX: per-remote root_folder_id (no global --drive-root-folder-id) + shared-with-me
# dest: gdrive:XBep/6.69/ID_DATE  (server-side, no download)
# usage: powershell -ExecutionPolicy Bypass -File rclone_copy_6_69.ps1
# limit: 750GB/day - run 1 month per day

$Rclone = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$destRoot = "gdrive:XBep/6.69"
$logFile = "C:/Users/PC/rclone_6_69.log"
Write-Host "Start 6.69 60 folders -> $destRoot" -ForegroundColor Cyan
& $Rclone mkdir "$destRoot" 2>$null

Write-Host '-> 1.6.69 1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs'
& $Rclone copy 'gdrive,root_folder_id="1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs":' "$destRoot/1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs_1-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 1.6.69 163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv'
& $Rclone copy 'gdrive,root_folder_id="163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv":' "$destRoot/163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv_1-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.6.69 1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI'
& $Rclone copy 'gdrive,root_folder_id="1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI":' "$destRoot/1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI_2-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 2.6.69 1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15'
& $Rclone copy 'gdrive,root_folder_id="1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15":' "$destRoot/1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15_2-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.6.69 1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk'
& $Rclone copy 'gdrive,root_folder_id="1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk":' "$destRoot/1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk_3-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 3.6.69 1olY1xQJeElCWErl49kZJb8SG6M_fYVgr'
& $Rclone copy 'gdrive,root_folder_id="1olY1xQJeElCWErl49kZJb8SG6M_fYVgr":' "$destRoot/1olY1xQJeElCWErl49kZJb8SG6M_fYVgr_3-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1olY1xQJeElCWErl49kZJb8SG6M_fYVgr code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 4.6.69 1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI'
& $Rclone copy 'gdrive,root_folder_id="1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI":' "$destRoot/1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI_4-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.6.69 13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0'
& $Rclone copy 'gdrive,root_folder_id="13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0":' "$destRoot/13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0_5-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.6.69 1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH'
& $Rclone copy 'gdrive,root_folder_id="1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH":' "$destRoot/1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH_5-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 5.6.69 1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d'
& $Rclone copy 'gdrive,root_folder_id="1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d":' "$destRoot/1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d_5-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.6.69 1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7'
& $Rclone copy 'gdrive,root_folder_id="1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7":' "$destRoot/1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7_6-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 6.6.69 1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW'
& $Rclone copy 'gdrive,root_folder_id="1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW":' "$destRoot/1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW_6-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.6.69 1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK'
& $Rclone copy 'gdrive,root_folder_id="1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK":' "$destRoot/1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK_7-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 7.6.69 1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW'
& $Rclone copy 'gdrive,root_folder_id="1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW":' "$destRoot/1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW_7-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.6.69 1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n'
& $Rclone copy 'gdrive,root_folder_id="1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n":' "$destRoot/1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n_8-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 8.6.69 1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd'
& $Rclone copy 'gdrive,root_folder_id="1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd":' "$destRoot/1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd_8-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.6.69 16AHTtb-9icbrfg_AhnviajpBFeYhivZ3'
& $Rclone copy 'gdrive,root_folder_id="16AHTtb-9icbrfg_AhnviajpBFeYhivZ3":' "$destRoot/16AHTtb-9icbrfg_AhnviajpBFeYhivZ3_9-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16AHTtb-9icbrfg_AhnviajpBFeYhivZ3 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 9.6.69 1QFCAjuESquuR2ddLt27ChOEhRSryMRJr'
& $Rclone copy 'gdrive,root_folder_id="1QFCAjuESquuR2ddLt27ChOEhRSryMRJr":' "$destRoot/1QFCAjuESquuR2ddLt27ChOEhRSryMRJr_9-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1QFCAjuESquuR2ddLt27ChOEhRSryMRJr code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.6.69 1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE'
& $Rclone copy 'gdrive,root_folder_id="1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE":' "$destRoot/1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE_10-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 10.6.69 1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8'
& $Rclone copy 'gdrive,root_folder_id="1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8":' "$destRoot/1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8_10-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.6.69 1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t'
& $Rclone copy 'gdrive,root_folder_id="1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t":' "$destRoot/1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t_11-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 11.6.69 1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS'
& $Rclone copy 'gdrive,root_folder_id="1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS":' "$destRoot/1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS_11-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.6.69 16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf'
& $Rclone copy 'gdrive,root_folder_id="16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf":' "$destRoot/16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf_12-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 12.6.69 1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q'
& $Rclone copy 'gdrive,root_folder_id="1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q":' "$destRoot/1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q_12-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.6.69 1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7'
& $Rclone copy 'gdrive,root_folder_id="1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7":' "$destRoot/1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7_13-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 13.6.69 1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH'
& $Rclone copy 'gdrive,root_folder_id="1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH":' "$destRoot/1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH_13-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.6.69 16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2'
& $Rclone copy 'gdrive,root_folder_id="16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2":' "$destRoot/16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2_14-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 14.6.69 1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2'
& $Rclone copy 'gdrive,root_folder_id="1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2":' "$destRoot/1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2_14-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.6.69 1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj'
& $Rclone copy 'gdrive,root_folder_id="1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj":' "$destRoot/1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj_15-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 15.6.69 1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4'
& $Rclone copy 'gdrive,root_folder_id="1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4":' "$destRoot/1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4_15-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.6.69 1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb'
& $Rclone copy 'gdrive,root_folder_id="1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb":' "$destRoot/1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb_16-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 16.6.69 1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8'
& $Rclone copy 'gdrive,root_folder_id="1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8":' "$destRoot/1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8_16-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.6.69 1IxARkyDdNFetJwIFcB1gvuLgdHXffU06'
& $Rclone copy 'gdrive,root_folder_id="1IxARkyDdNFetJwIFcB1gvuLgdHXffU06":' "$destRoot/1IxARkyDdNFetJwIFcB1gvuLgdHXffU06_17-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1IxARkyDdNFetJwIFcB1gvuLgdHXffU06 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 17.6.69 11djklFXqW3g9wGCYypjRRbmQDHJvYlbL'
& $Rclone copy 'gdrive,root_folder_id="11djklFXqW3g9wGCYypjRRbmQDHJvYlbL":' "$destRoot/11djklFXqW3g9wGCYypjRRbmQDHJvYlbL_17-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 11djklFXqW3g9wGCYypjRRbmQDHJvYlbL code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.6.69 1_2LbPd8jLOou-129KE3iuT3K41-RlXmP'
& $Rclone copy 'gdrive,root_folder_id="1_2LbPd8jLOou-129KE3iuT3K41-RlXmP":' "$destRoot/1_2LbPd8jLOou-129KE3iuT3K41-RlXmP_18-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1_2LbPd8jLOou-129KE3iuT3K41-RlXmP code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 18.6.69 1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp'
& $Rclone copy 'gdrive,root_folder_id="1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp":' "$destRoot/1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp_18-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.6.69 16AKfs93VpX0EbcETKhEQvTcO17eGwpR3'
& $Rclone copy 'gdrive,root_folder_id="16AKfs93VpX0EbcETKhEQvTcO17eGwpR3":' "$destRoot/16AKfs93VpX0EbcETKhEQvTcO17eGwpR3_19-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 16AKfs93VpX0EbcETKhEQvTcO17eGwpR3 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 19.6.69 1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842'
& $Rclone copy 'gdrive,root_folder_id="1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842":' "$destRoot/1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842_19-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.6.69 1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw'
& $Rclone copy 'gdrive,root_folder_id="1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw":' "$destRoot/1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw_20-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 20.6.69 18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP'
& $Rclone copy 'gdrive,root_folder_id="18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP":' "$destRoot/18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP_20-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.6.69 1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC'
& $Rclone copy 'gdrive,root_folder_id="1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC":' "$destRoot/1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC_21-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 21.6.69 1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m'
& $Rclone copy 'gdrive,root_folder_id="1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m":' "$destRoot/1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m_21-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.6.69 1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6'
& $Rclone copy 'gdrive,root_folder_id="1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6":' "$destRoot/1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6_22-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 22.6.69 1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS'
& $Rclone copy 'gdrive,root_folder_id="1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS":' "$destRoot/1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS_22-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.6.69 1qMojaq5EKZTZBNlihgveo31FNik5mP3f'
& $Rclone copy 'gdrive,root_folder_id="1qMojaq5EKZTZBNlihgveo31FNik5mP3f":' "$destRoot/1qMojaq5EKZTZBNlihgveo31FNik5mP3f_23-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1qMojaq5EKZTZBNlihgveo31FNik5mP3f code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 23.6.69 1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt'
& $Rclone copy 'gdrive,root_folder_id="1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt":' "$destRoot/1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt_23-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.6.69 1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq'
& $Rclone copy 'gdrive,root_folder_id="1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq":' "$destRoot/1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq_24-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 24.6.69 1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk'
& $Rclone copy 'gdrive,root_folder_id="1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk":' "$destRoot/1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk_24-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.6.69 1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3'
& $Rclone copy 'gdrive,root_folder_id="1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3":' "$destRoot/1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3_25-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 25.6.69 1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv'
& $Rclone copy 'gdrive,root_folder_id="1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv":' "$destRoot/1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv_25-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.6.69 1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn'
& $Rclone copy 'gdrive,root_folder_id="1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn":' "$destRoot/1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn_26-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 26.6.69 1m45quulKi7OVWKyqKk01s6Z4loi9WK2R'
& $Rclone copy 'gdrive,root_folder_id="1m45quulKi7OVWKyqKk01s6Z4loi9WK2R":' "$destRoot/1m45quulKi7OVWKyqKk01s6Z4loi9WK2R_26-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1m45quulKi7OVWKyqKk01s6Z4loi9WK2R code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.6.69 1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2'
& $Rclone copy 'gdrive,root_folder_id="1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2":' "$destRoot/1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2_27-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 27.6.69 1XV6pODWFQflqGP-de8G3odqskMnr2Ar7'
& $Rclone copy 'gdrive,root_folder_id="1XV6pODWFQflqGP-de8G3odqskMnr2Ar7":' "$destRoot/1XV6pODWFQflqGP-de8G3odqskMnr2Ar7_27-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1XV6pODWFQflqGP-de8G3odqskMnr2Ar7 code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.6.69 1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B'
& $Rclone copy 'gdrive,root_folder_id="1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B":' "$destRoot/1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B_28-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 28.6.69 1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T'
& $Rclone copy 'gdrive,root_folder_id="1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T":' "$destRoot/1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T_28-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.6.69 1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A'
& $Rclone copy 'gdrive,root_folder_id="1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A":' "$destRoot/1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A_29-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 29.6.69 1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ'
& $Rclone copy 'gdrive,root_folder_id="1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ":' "$destRoot/1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ_29-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.6.69 1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe'
& $Rclone copy 'gdrive,root_folder_id="1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe":' "$destRoot/1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe_30-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host '-> 30.6.69 1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh'
& $Rclone copy 'gdrive,root_folder_id="1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh":' "$destRoot/1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh_30-6-69" --create-empty-src-dirs --transfers 8 --checkers 16 --tpslimit 8 --drive-pacer-min-sleep 10ms --fast-list --retries 3 --low-level-retries 3 --retries-sleep 5s -P --log-file "$logFile" --log-level INFO --stats 15s --stats-one-line
if ($LASTEXITCODE -ne 0) { Write-Host "fail 1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh code $LASTEXITCODE see $logFile" -ForegroundColor Yellow }
Start-Sleep -Milliseconds 500

Write-Host "Done 6.69" -ForegroundColor Green