# Download 8.69 — 38 folders
# Total folders all: 219
# Requires: pip install gdown  (or use rclone)
# Usage: powershell -ExecutionPolicy Bypass -File download_8_69.ps1

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
Assert-ProjectDownload -Settings $Settings
$ErrorActionPreference = $taskPreviousErrorAction
$outRoot = Join-Path $Settings.downloadRoot "8.69"
New-Item -ItemType Directory -Force -Path $outRoot -ErrorAction Stop | Out-Null

Write-Host "⬇ 1.8.69 1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z — โพสต์ #48 — 1.8.69"
gdown --folder "https://drive.google.com/drive/folders/1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z" --output "$outRoot/1CYA9Q_lEqLAR_UODp1gy-zoXnQXiQP6z_1-8-69"  2>&1 | Write-Host

Write-Host "⬇ 1.8.69 1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9 — โพสต์ #49 — 1.8.69"
gdown --folder "https://drive.google.com/drive/folders/1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9" --output "$outRoot/1HQPSTtcHm3-g5WbzNdqG4mVQDAcl1Fx9_1-8-69"  2>&1 | Write-Host

Write-Host "⬇ 2.8.69 1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ — โพสต์ #46 — 2.8.69"
gdown --folder "https://drive.google.com/drive/folders/1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ" --output "$outRoot/1WtjkKlhagbkDC0dbOmgvVEV0NIGYoaeZ_2-8-69"  2>&1 | Write-Host

Write-Host "⬇ 3.8.69 1R_n5Xe21XPQxQot85sarvALKGR6jCqtL — โพสต์ #44 — 3.8.69"
gdown --folder "https://drive.google.com/drive/folders/1R_n5Xe21XPQxQot85sarvALKGR6jCqtL" --output "$outRoot/1R_n5Xe21XPQxQot85sarvALKGR6jCqtL_3-8-69"  2>&1 | Write-Host

Write-Host "⬇ 3.8.69 18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5 — โพสต์ #45 — 3.8.69"
gdown --folder "https://drive.google.com/drive/folders/18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5" --output "$outRoot/18fHsLadT1aa45DjQyOSHSlnbFhCEXlz5_3-8-69"  2>&1 | Write-Host

Write-Host "⬇ 4.8.69 1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB — โพสต์ #42 — 4.8.69"
gdown --folder "https://drive.google.com/drive/folders/1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB" --output "$outRoot/1u8TfBw0iVDf0OaMAuzTapUfDUobSLRqB_4-8-69"  2>&1 | Write-Host

Write-Host "⬇ 4.8.69 1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q — โพสต์ #43 — 4.8.69"
gdown --folder "https://drive.google.com/drive/folders/1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q" --output "$outRoot/1jrkuFwPU9DJAkp6qeeyDbO3_HYDLhz6q_4-8-69"  2>&1 | Write-Host

Write-Host "⬇ 5.8.69 1PDA8SZa1lnweAnYcp7floYg54eLR6SRU — โพสต์ #40 — 5.8.69"
gdown --folder "https://drive.google.com/drive/folders/1PDA8SZa1lnweAnYcp7floYg54eLR6SRU" --output "$outRoot/1PDA8SZa1lnweAnYcp7floYg54eLR6SRU_5-8-69"  2>&1 | Write-Host

Write-Host "⬇ 5.8.69 1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV — โพสต์ #41 — 5.8.69"
gdown --folder "https://drive.google.com/drive/folders/1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV" --output "$outRoot/1XUC4U2vhtuL4jUNx3wKIIlCmdrN7YHMV_5-8-69"  2>&1 | Write-Host

Write-Host "⬇ 6.8.69 1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC — โพสต์ #38 — 6.8.69"
gdown --folder "https://drive.google.com/drive/folders/1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC" --output "$outRoot/1dzFOz2PZ93dK0AjvlorIlH4KqKgrhCyC_6-8-69"  2>&1 | Write-Host

Write-Host "⬇ 6.8.69 1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg — โพสต์ #39 — 6.8.69"
gdown --folder "https://drive.google.com/drive/folders/1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg" --output "$outRoot/1K8rFcgAFn4MTJJtqNZExRBL5ZLClGPyg_6-8-69"  2>&1 | Write-Host

Write-Host "⬇ 7.8.69 1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp — โพสต์ #36 — 7.8.69"
gdown --folder "https://drive.google.com/drive/folders/1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp" --output "$outRoot/1w8kWRpXqfCLahDKArPp-YNPFBieBIJIp_7-8-69"  2>&1 | Write-Host

Write-Host "⬇ 7.8.69 19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx — โพสต์ #37 — 7.8.69"
gdown --folder "https://drive.google.com/drive/folders/19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx" --output "$outRoot/19bOScDyzbJdLGIw3zK-PcI2ioVOQ4Hmx_7-8-69"  2>&1 | Write-Host

Write-Host "⬇ 8.8.69 15o5uoT0k09JBmtAhJmhkX6X8johIFWKI — โพสต์ #34 — 8.8.69"
gdown --folder "https://drive.google.com/drive/folders/15o5uoT0k09JBmtAhJmhkX6X8johIFWKI" --output "$outRoot/15o5uoT0k09JBmtAhJmhkX6X8johIFWKI_8-8-69"  2>&1 | Write-Host

Write-Host "⬇ 8.8.69 1iAP1qo3MshKSYayjLrblPbir-i5EXdBt — โพสต์ #35 — 8.8.69"
gdown --folder "https://drive.google.com/drive/folders/1iAP1qo3MshKSYayjLrblPbir-i5EXdBt" --output "$outRoot/1iAP1qo3MshKSYayjLrblPbir-i5EXdBt_8-8-69"  2>&1 | Write-Host

Write-Host "⬇ 9.8.69 1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO — โพสต์ #32 — 9.8.69"
gdown --folder "https://drive.google.com/drive/folders/1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO" --output "$outRoot/1nw-QEaWLy6Am5o4H8bFFfKA1j_o7K5jO_9-8-69"  2>&1 | Write-Host

Write-Host "⬇ 9.8.69 1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy — โพสต์ #33 — 9.8.69"
gdown --folder "https://drive.google.com/drive/folders/1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy" --output "$outRoot/1UG05EEhE0Z-sxpjahJj0q6iHwbHRl3Cy_9-8-69"  2>&1 | Write-Host

Write-Host "⬇ 10.8.69 1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf- — โพสต์ #30 — 10.8.69"
gdown --folder "https://drive.google.com/drive/folders/1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf-" --output "$outRoot/1wG9Fsny30hcPU8ObFo2GBtVkX9GSOaf-_10-8-69"  2>&1 | Write-Host

Write-Host "⬇ 10.8.69 1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns — โพสต์ #31 — 10.8.69"
gdown --folder "https://drive.google.com/drive/folders/1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns" --output "$outRoot/1gR4B2TIDHPu7W86dwzQfIBB5Ap80ktns_10-8-69"  2>&1 | Write-Host

Write-Host "⬇ 11.8.69 1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj — โพสต์ #28 — 11.8.69"
gdown --folder "https://drive.google.com/drive/folders/1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj" --output "$outRoot/1XnvSPKWloqckf1mRfsfjtEcOK7f3uiWj_11-8-69"  2>&1 | Write-Host

Write-Host "⬇ 12.8.69 1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp — โพสต์ #24 — 12.8.69"
gdown --folder "https://drive.google.com/drive/folders/1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp" --output "$outRoot/1dCeCtlc-FaJy8e_6POcBoErM1x-yoaPp_12-8-69"  2>&1 | Write-Host

Write-Host "⬇ 12.8.69 1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT — โพสต์ #27 — 12.8.69"
gdown --folder "https://drive.google.com/drive/folders/1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT" --output "$outRoot/1hAQ1AA1QmiAxRFY17IyNHKzOvWkEzxMT_12-8-69"  2>&1 | Write-Host

Write-Host "⬇ 13.8.69 11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV — โพสต์ #22 — 13.8.69"
gdown --folder "https://drive.google.com/drive/folders/11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV" --output "$outRoot/11WqEsCOZcmz9rtLR2SQFvPWKwMeolkAV_13-8-69"  2>&1 | Write-Host

Write-Host "⬇ 13.8.69 19tIsgtqBaKgqHISOfrxQhKWc4njTRuO_ — โพสต์ #23 — 13.8.69"
gdown --folder "https://drive.google.com/drive/folders/19tIsgtqBaKgqHISOfrxQhKWc4njTRuO_" --output "$outRoot/19tIsgtqBaKgqHISOfrxQhKWc4njTRuO__13-8-69"  2>&1 | Write-Host

Write-Host "⬇ 14.8.69 1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g — โพสต์ #21 — 14.8.69"
gdown --folder "https://drive.google.com/drive/folders/1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g" --output "$outRoot/1qz6NEkUs6neRoWwyGlB-WZDFeHX-jR7g_14-8-69"  2>&1 | Write-Host

Write-Host "⬇ 15.8.69 1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY — โพสต์ #15 — 15.8.69"
gdown --folder "https://drive.google.com/drive/folders/1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY" --output "$outRoot/1vA9Eg8hEmCzTwFZhVGN_mVCCuQl0OIxY_15-8-69"  2>&1 | Write-Host

Write-Host "⬇ 15.8.69 1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX — โพสต์ #16 — 15.8.69"
gdown --folder "https://drive.google.com/drive/folders/1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX" --output "$outRoot/1sggfCuMKzGM5jkCXfcvIlBnG05Z1seTX_15-8-69"  2>&1 | Write-Host

Write-Host "⬇ 16.8.69 1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe — โพสต์ #13 — 16.8.69"
gdown --folder "https://drive.google.com/drive/folders/1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe" --output "$outRoot/1srnpFMVehQpLj94hokIvAnPJ2rvlOrWe_16-8-69"  2>&1 | Write-Host

Write-Host "⬇ 16.8.69 1st6iBC_28O43HNg6vai1WQhzgzTBllFw — โพสต์ #14 — 16.8.69"
gdown --folder "https://drive.google.com/drive/folders/1st6iBC_28O43HNg6vai1WQhzgzTBllFw" --output "$outRoot/1st6iBC_28O43HNg6vai1WQhzgzTBllFw_16-8-69"  2>&1 | Write-Host

Write-Host "⬇ 17.8.69 18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ — โพสต์ #10 — 17.8.69"
gdown --folder "https://drive.google.com/drive/folders/18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ" --output "$outRoot/18lLh4dWNcjQEc-e7qqxcUtVyc9UGjtLQ_17-8-69"  2>&1 | Write-Host

Write-Host "⬇ 17.8.69 1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx — โพสต์ #12 — 17.8.69"
gdown --folder "https://drive.google.com/drive/folders/1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx" --output "$outRoot/1ZLWpBG2-6f1zNUKLLT28D-XRlSoK8ytx_17-8-69"  2>&1 | Write-Host

Write-Host "⬇ 18.8.69 1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA — โพสต์ #7 — 18.8.69"
gdown --folder "https://drive.google.com/drive/folders/1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA" --output "$outRoot/1KpG7oQOUq15X3pnqTY9tBIlCb3dTuXrA_18-8-69"  2>&1 | Write-Host

Write-Host "⬇ 18.8.69 1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm — โพสต์ #8 — 18.8.69"
gdown --folder "https://drive.google.com/drive/folders/1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm" --output "$outRoot/1vYslDaVHGoi4a4dk-NPxx18ZdTjkeZkm_18-8-69"  2>&1 | Write-Host

Write-Host "⬇ 19.8.69 1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN — โพสต์ #5 — 19.8.69"
gdown --folder "https://drive.google.com/drive/folders/1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN" --output "$outRoot/1ij5zH17dR_hLXvyhiDWmLf6F7eI9ClsN_19-8-69"  2>&1 | Write-Host

Write-Host "⬇ 19.8.69 1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q — โพสต์ #6 — 19.8.69"
gdown --folder "https://drive.google.com/drive/folders/1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q" --output "$outRoot/1Niki4BkNPzlGkDFBwMCHWhaRMyAlHN4q_19-8-69"  2>&1 | Write-Host

Write-Host "⬇ 20.8.69 1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw — โพสต์ #4 — 20.8.69"
gdown --folder "https://drive.google.com/drive/folders/1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw" --output "$outRoot/1YwEoZjwa0W55hQcbqRhtAKi0LBzKWTzw_20-8-69"  2>&1 | Write-Host

Write-Host "⬇ 21.8.69 1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW — โพสต์ #1 — 21.8.69"
gdown --folder "https://drive.google.com/drive/folders/1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW" --output "$outRoot/1BeTO_kZFhhgaaszq0PFlurlrZJPwAlCW_21-8-69"  2>&1 | Write-Host

Write-Host "⬇ 21.8.69 1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc — โพสต์ #2 — 21.8.69"
gdown --folder "https://drive.google.com/drive/folders/1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc" --output "$outRoot/1_FZ8as5NiDmnuQfCrs-dyAkJUHL3HlFc_21-8-69"  2>&1 | Write-Host
