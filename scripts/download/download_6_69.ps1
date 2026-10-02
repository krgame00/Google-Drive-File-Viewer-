# Download 6.69 — 60 folders
# Total folders all: 219
# Requires: pip install gdown  (or use rclone)
# Usage: powershell -ExecutionPolicy Bypass -File download_6_69.ps1

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
Assert-ProjectDownload -Settings $Settings
$ErrorActionPreference = $taskPreviousErrorAction
$outRoot = Join-Path $Settings.downloadRoot "6.69"
New-Item -ItemType Directory -Force -Path $outRoot -ErrorAction Stop | Out-Null

Write-Host "⬇ 1.6.69 1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs — อีเวนต์ #92 — 1.6.69"
gdown --folder "https://drive.google.com/drive/folders/1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs" --output "$outRoot/1knzEPRuxbKYPdGRFfdExBEXDPrymuKSs_1-6-69"  2>&1 | Write-Host

Write-Host "⬇ 1.6.69 163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv — อีเวนต์ #93 — 1.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv" --output "$outRoot/163iLCPsYQ75RaAjAzViNtMNwWY4gbNCv_1-6-69"  2>&1 | Write-Host

Write-Host "⬇ 2.6.69 1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI — อีเวนต์ #90 — 2.6.69"
gdown --folder "https://drive.google.com/drive/folders/1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI" --output "$outRoot/1EXBUgNpSMZrvCJYxW-N-hK5tTfB_UslI_2-6-69"  2>&1 | Write-Host

Write-Host "⬇ 2.6.69 1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15 — อีเวนต์ #91 — 2.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15" --output "$outRoot/1XVTu-W7AWLxBm4jGE3FT-4OMimRm_B15_2-6-69"  2>&1 | Write-Host

Write-Host "⬇ 3.6.69 1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk — อีเวนต์ #88 — 3.6.69"
gdown --folder "https://drive.google.com/drive/folders/1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk" --output "$outRoot/1xJEkTliJTGrbjJPeBVI8UJ_hxUPJcstk_3-6-69"  2>&1 | Write-Host

Write-Host "⬇ 3.6.69 1olY1xQJeElCWErl49kZJb8SG6M_fYVgr — อีเวนต์ #89 — 3.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1olY1xQJeElCWErl49kZJb8SG6M_fYVgr" --output "$outRoot/1olY1xQJeElCWErl49kZJb8SG6M_fYVgr_3-6-69"  2>&1 | Write-Host

Write-Host "⬇ 4.6.69 1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI — เติม — 4.6.69"
gdown --folder "https://drive.google.com/drive/folders/1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI" --output "$outRoot/1KyN9ZpzHETmdrMi6lzU2RMMyNc_TfrBI_4-6-69"  2>&1 | Write-Host

Write-Host "⬇ 5.6.69 13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0 — อีเวนต์ #84 — 5.6.69"
gdown --folder "https://drive.google.com/drive/folders/13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0" --output "$outRoot/13sNQEkiO6LPyYIla6K8fD6kYrquxmRN0_5-6-69"  2>&1 | Write-Host

Write-Host "⬇ 5.6.69 1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH — อีเวนต์ #85 — 5.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH" --output "$outRoot/1S5koRbhI-XLwOfJuL8GWBlBdZtKrBFbH_5-6-69"  2>&1 | Write-Host

Write-Host "⬇ 5.6.69 1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d — อีเวนต์ #87 — 5.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d" --output "$outRoot/1YgI8U_HWVIN70mVPMJ8PCOHkBS7N3l9d_5-6-69"  2>&1 | Write-Host

Write-Host "⬇ 6.6.69 1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7 — อีเวนต์ #82 — 6.6.69"
gdown --folder "https://drive.google.com/drive/folders/1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7" --output "$outRoot/1gpgZySCOd0m0X_vl7dcOJ0c7JBID34b7_6-6-69"  2>&1 | Write-Host

Write-Host "⬇ 6.6.69 1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW — อีเวนต์ #83 — 6.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW" --output "$outRoot/1cqSWM3rCW5GMHSRZG_AX9nYuPZBv4SgW_6-6-69"  2>&1 | Write-Host

Write-Host "⬇ 7.6.69 1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK — อีเวนต์ #80 — 7.6.69"
gdown --folder "https://drive.google.com/drive/folders/1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK" --output "$outRoot/1X1sN6vxp4i02p_Rc_85Zj0j6dOnwe_GK_7-6-69"  2>&1 | Write-Host

Write-Host "⬇ 7.6.69 1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW — อีเวนต์ #81 — 7.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW" --output "$outRoot/1weiGwtAQNBNQ8uyTF9bW7gmGLIhbkEVW_7-6-69"  2>&1 | Write-Host

Write-Host "⬇ 8.6.69 1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n — อีเวนต์ #78 — 8.6.69"
gdown --folder "https://drive.google.com/drive/folders/1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n" --output "$outRoot/1MFefhhdeCONi2DIwq05KgSEm5CYUTb0n_8-6-69"  2>&1 | Write-Host

Write-Host "⬇ 8.6.69 1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd — อีเวนต์ #79 — 8.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd" --output "$outRoot/1vPIKeY0SLuJs16NyYI-Rp0SS8QnbYbhd_8-6-69"  2>&1 | Write-Host

Write-Host "⬇ 9.6.69 16AHTtb-9icbrfg_AhnviajpBFeYhivZ3 — อีเวนต์ #76 — 9.6.69"
gdown --folder "https://drive.google.com/drive/folders/16AHTtb-9icbrfg_AhnviajpBFeYhivZ3" --output "$outRoot/16AHTtb-9icbrfg_AhnviajpBFeYhivZ3_9-6-69"  2>&1 | Write-Host

Write-Host "⬇ 9.6.69 1QFCAjuESquuR2ddLt27ChOEhRSryMRJr — อีเวนต์ #77 — 9.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1QFCAjuESquuR2ddLt27ChOEhRSryMRJr" --output "$outRoot/1QFCAjuESquuR2ddLt27ChOEhRSryMRJr_9-6-69"  2>&1 | Write-Host

Write-Host "⬇ 10.6.69 1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE — อีเวนต์ #74 — 10.6.69"
gdown --folder "https://drive.google.com/drive/folders/1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE" --output "$outRoot/1-rQFVUv3Qu6UX30bs6b-UZghQyhW-dkE_10-6-69"  2>&1 | Write-Host

Write-Host "⬇ 10.6.69 1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8 — อีเวนต์ #75 — 10.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8" --output "$outRoot/1umxxv5qZ8tB9cYmPRTHLCr6bFVdxH4A8_10-6-69"  2>&1 | Write-Host

Write-Host "⬇ 11.6.69 1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t — อีเวนต์ #72 — 11.6.69"
gdown --folder "https://drive.google.com/drive/folders/1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t" --output "$outRoot/1ERGWtnaBpf77ILUOtYhpQ1BKLSHeka-t_11-6-69"  2>&1 | Write-Host

Write-Host "⬇ 11.6.69 1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS — อีเวนต์ #73 — 11.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS" --output "$outRoot/1rwyGWdRvOWuL256jd7dL4vyPprAW_jBS_11-6-69"  2>&1 | Write-Host

Write-Host "⬇ 12.6.69 16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf — อีเวนต์ #70 — 12.6.69"
gdown --folder "https://drive.google.com/drive/folders/16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf" --output "$outRoot/16hW4sWxl_g1qmYyXAJQXKSUBRD8nJjBf_12-6-69"  2>&1 | Write-Host

Write-Host "⬇ 12.6.69 1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q — อีเวนต์ #71 — 12.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q" --output "$outRoot/1Gt7mAprR55kRdcrdeqqDrUdhJNNUgu4Q_12-6-69"  2>&1 | Write-Host

Write-Host "⬇ 13.6.69 1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7 — อีเวนต์ #68 — 13.6.69"
gdown --folder "https://drive.google.com/drive/folders/1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7" --output "$outRoot/1ZL8RReM08ow00cJm0wrqAFqwTOZZN9S7_13-6-69"  2>&1 | Write-Host

Write-Host "⬇ 13.6.69 1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH — อีเวนต์ #69 — 13.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH" --output "$outRoot/1E0M7kW_8q_GeX9gmD2FcLDiCZYgS14iH_13-6-69"  2>&1 | Write-Host

Write-Host "⬇ 14.6.69 16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2 — อีเวนต์ #66 — 14.6.69"
gdown --folder "https://drive.google.com/drive/folders/16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2" --output "$outRoot/16wh3NrUbZKh0W9Mym3tX6Q66Pvf1n0V2_14-6-69"  2>&1 | Write-Host

Write-Host "⬇ 14.6.69 1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2 — อีเวนต์ #67 — 14.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2" --output "$outRoot/1mo0NYjxTHVNhyxedp_b1JQPUfTcKp6P2_14-6-69"  2>&1 | Write-Host

Write-Host "⬇ 15.6.69 1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj — อีเวนต์ #64 — 15.6.69"
gdown --folder "https://drive.google.com/drive/folders/1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj" --output "$outRoot/1TKmoFQdkNXt0aiIgfVTrK4yY6CsJsLaj_15-6-69"  2>&1 | Write-Host

Write-Host "⬇ 15.6.69 1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4 — อีเวนต์ #65 — 15.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4" --output "$outRoot/1sc_II-z3-Uc8qST6jIDpb4yIV7A33Em4_15-6-69"  2>&1 | Write-Host

Write-Host "⬇ 16.6.69 1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb — อีเวนต์ #62 — 16.6.69"
gdown --folder "https://drive.google.com/drive/folders/1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb" --output "$outRoot/1hxgm-knXy7FaTCmkz44jf-z1J6lw42Eb_16-6-69"  2>&1 | Write-Host

Write-Host "⬇ 16.6.69 1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8 — อีเวนต์ #63 — 16.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8" --output "$outRoot/1-xWjh0GBimY5m20B1HWAag6bXgnnnLf8_16-6-69"  2>&1 | Write-Host

Write-Host "⬇ 17.6.69 1IxARkyDdNFetJwIFcB1gvuLgdHXffU06 — อีเวนต์ #60 — 17.6.69"
gdown --folder "https://drive.google.com/drive/folders/1IxARkyDdNFetJwIFcB1gvuLgdHXffU06" --output "$outRoot/1IxARkyDdNFetJwIFcB1gvuLgdHXffU06_17-6-69"  2>&1 | Write-Host

Write-Host "⬇ 17.6.69 11djklFXqW3g9wGCYypjRRbmQDHJvYlbL — อีเวนต์ #61 — 17.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/11djklFXqW3g9wGCYypjRRbmQDHJvYlbL" --output "$outRoot/11djklFXqW3g9wGCYypjRRbmQDHJvYlbL_17-6-69"  2>&1 | Write-Host

Write-Host "⬇ 18.6.69 1_2LbPd8jLOou-129KE3iuT3K41-RlXmP — อีเวนต์ #58 — 18.6.69"
gdown --folder "https://drive.google.com/drive/folders/1_2LbPd8jLOou-129KE3iuT3K41-RlXmP" --output "$outRoot/1_2LbPd8jLOou-129KE3iuT3K41-RlXmP_18-6-69"  2>&1 | Write-Host

Write-Host "⬇ 18.6.69 1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp — อีเวนต์ #59 — 18.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp" --output "$outRoot/1e4ifwA8ylg79kKpsuY3_rV4jLDE66AYp_18-6-69"  2>&1 | Write-Host

Write-Host "⬇ 19.6.69 16AKfs93VpX0EbcETKhEQvTcO17eGwpR3 — อีเวนต์ #56 — 19.6.69"
gdown --folder "https://drive.google.com/drive/folders/16AKfs93VpX0EbcETKhEQvTcO17eGwpR3" --output "$outRoot/16AKfs93VpX0EbcETKhEQvTcO17eGwpR3_19-6-69"  2>&1 | Write-Host

Write-Host "⬇ 19.6.69 1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842 — อีเวนต์ #57 — 19.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842" --output "$outRoot/1Fw-LfoLYdLt03sMJKrn7IgCB25QxO842_19-6-69"  2>&1 | Write-Host

Write-Host "⬇ 20.6.69 1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw — อีเวนต์ #54 — 20.6.69"
gdown --folder "https://drive.google.com/drive/folders/1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw" --output "$outRoot/1FG6BEBF_X8ELqCuH1jcduRAb5aBQviGw_20-6-69"  2>&1 | Write-Host

Write-Host "⬇ 20.6.69 18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP — อีเวนต์ #55 — 20.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP" --output "$outRoot/18km5s8VRGZZuHJsq3YnR-mcStkCp5hJP_20-6-69"  2>&1 | Write-Host

Write-Host "⬇ 21.6.69 1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC — อีเวนต์ #52 — 21.6.69"
gdown --folder "https://drive.google.com/drive/folders/1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC" --output "$outRoot/1jiz2Qn4DzycsplPp6ZVpQk_ghwuGsABC_21-6-69"  2>&1 | Write-Host

Write-Host "⬇ 21.6.69 1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m — อีเวนต์ #53 — 21.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m" --output "$outRoot/1ROpQ7LJPKEQM4GRaaEgPebC03xdHRJ7m_21-6-69"  2>&1 | Write-Host

Write-Host "⬇ 22.6.69 1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6 — อีเวนต์ #50 — 22.6.69"
gdown --folder "https://drive.google.com/drive/folders/1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6" --output "$outRoot/1V1lsuUjZU16L_dZj6e2jEuXmZ1mcKVn6_22-6-69"  2>&1 | Write-Host

Write-Host "⬇ 22.6.69 1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS — อีเวนต์ #51 — 22.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS" --output "$outRoot/1mCRtT3fvJGDNghZr3k-8LTBxNU-ayZUS_22-6-69"  2>&1 | Write-Host

Write-Host "⬇ 23.6.69 1qMojaq5EKZTZBNlihgveo31FNik5mP3f — อีเวนต์ #48 — 23.6.69"
gdown --folder "https://drive.google.com/drive/folders/1qMojaq5EKZTZBNlihgveo31FNik5mP3f" --output "$outRoot/1qMojaq5EKZTZBNlihgveo31FNik5mP3f_23-6-69"  2>&1 | Write-Host

Write-Host "⬇ 23.6.69 1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt — อีเวนต์ #49 — 23.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt" --output "$outRoot/1PwP_UC2vQU_VESSGVFVTYJTI9lFAXHyt_23-6-69"  2>&1 | Write-Host

Write-Host "⬇ 24.6.69 1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq — อีเวนต์ #46 — 24.6.69"
gdown --folder "https://drive.google.com/drive/folders/1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq" --output "$outRoot/1Md6uwtBPOb4_IUzgKN1s3a0cALIKJETq_24-6-69"  2>&1 | Write-Host

Write-Host "⬇ 24.6.69 1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk — อีเวนต์ #47 — 24.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk" --output "$outRoot/1uRSF4wU9wqVApMZcpMQfwqIinpj_mDMk_24-6-69"  2>&1 | Write-Host

Write-Host "⬇ 25.6.69 1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3 — อีเวนต์ #44 — 25.6.69"
gdown --folder "https://drive.google.com/drive/folders/1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3" --output "$outRoot/1AeSyT3cocZA-Am0fYnhM1hjkeBR8ZGv3_25-6-69"  2>&1 | Write-Host

Write-Host "⬇ 25.6.69 1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv — อีเวนต์ #45 — 25.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv" --output "$outRoot/1mi_gmy9HTYFa4ZrbJ90aB6rQ9A-TuDwv_25-6-69"  2>&1 | Write-Host

Write-Host "⬇ 26.6.69 1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn — อีเวนต์ #42 — 26.6.69"
gdown --folder "https://drive.google.com/drive/folders/1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn" --output "$outRoot/1_3a2QARLRQKOiL92buXqiEfFnSlq9rNn_26-6-69"  2>&1 | Write-Host

Write-Host "⬇ 26.6.69 1m45quulKi7OVWKyqKk01s6Z4loi9WK2R — อีเวนต์ #43 — 26.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1m45quulKi7OVWKyqKk01s6Z4loi9WK2R" --output "$outRoot/1m45quulKi7OVWKyqKk01s6Z4loi9WK2R_26-6-69"  2>&1 | Write-Host

Write-Host "⬇ 27.6.69 1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2 — อีเวนต์ #40 — 27.6.69"
gdown --folder "https://drive.google.com/drive/folders/1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2" --output "$outRoot/1xmbNQagf-dYvkDr4t98z_O79N_7rJvl2_27-6-69"  2>&1 | Write-Host

Write-Host "⬇ 27.6.69 1XV6pODWFQflqGP-de8G3odqskMnr2Ar7 — อีเวนต์ #41 — 27.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1XV6pODWFQflqGP-de8G3odqskMnr2Ar7" --output "$outRoot/1XV6pODWFQflqGP-de8G3odqskMnr2Ar7_27-6-69"  2>&1 | Write-Host

Write-Host "⬇ 28.6.69 1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B — อีเวนต์ #38 — 28.6.69"
gdown --folder "https://drive.google.com/drive/folders/1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B" --output "$outRoot/1a3zTCEoQG9HTK8Q9WOEwhIty7FJKjO7B_28-6-69"  2>&1 | Write-Host

Write-Host "⬇ 28.6.69 1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T — อีเวนต์ #39 — 28.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T" --output "$outRoot/1t6L-YLV4C9pPPT2YXFzf3Y_OxQqoga_T_28-6-69"  2>&1 | Write-Host

Write-Host "⬇ 29.6.69 1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A — อีเวนต์ #36 — 29.6.69"
gdown --folder "https://drive.google.com/drive/folders/1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A" --output "$outRoot/1hOKIf64VsFKL3BRacoVw67Gx1z2fqw7A_29-6-69"  2>&1 | Write-Host

Write-Host "⬇ 29.6.69 1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ — อีเวนต์ #37 — 29.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ" --output "$outRoot/1dkf78_dZbOIsjpD6IyAbNuyWqJKqOSYZ_29-6-69"  2>&1 | Write-Host

Write-Host "⬇ 30.6.69 1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe — อีเวนต์ #34 — 30.6.69"
gdown --folder "https://drive.google.com/drive/folders/1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe" --output "$outRoot/1Pvwv9u2VMKf5UHhpnBxblB75Z5kxGHIe_30-6-69"  2>&1 | Write-Host

Write-Host "⬇ 30.6.69 1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh — อีเวนต์ #35 — 30.6.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh" --output "$outRoot/1CTx1ZCZWzRlkdmBqu_vbWvd4DcA8mrOh_30-6-69"  2>&1 | Write-Host
