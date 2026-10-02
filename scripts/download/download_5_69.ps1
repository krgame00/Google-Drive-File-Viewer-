# Download 5.69 — 61 folders
# Total folders all: 219
# Requires: pip install gdown  (or use rclone)
# Usage: powershell -ExecutionPolicy Bypass -File download_5_69.ps1

$taskPreviousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "../shared/settings.ps1")
$Settings = Get-ProjectSettings
Assert-ProjectDownload -Settings $Settings
$ErrorActionPreference = $taskPreviousErrorAction
$outRoot = Join-Path $Settings.downloadRoot "5.69"
New-Item -ItemType Directory -Force -Path $outRoot -ErrorAction Stop | Out-Null

Write-Host "⬇ 1.5.69 1PmnXimW5HMSMtmnENqii6ThWE2URnU5E — อีเวนต์ #153 — 1.5.69"
gdown --folder "https://drive.google.com/drive/folders/1PmnXimW5HMSMtmnENqii6ThWE2URnU5E" --output "$outRoot/1PmnXimW5HMSMtmnENqii6ThWE2URnU5E_1-5-69"  2>&1 | Write-Host

Write-Host "⬇ 1.5.69 1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl — อีเวนต์ #157 — 1.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl" --output "$outRoot/1M1PXC0lh8UnMy5K09aeIHL2EbyrcC6fl_1-5-69"  2>&1 | Write-Host

Write-Host "⬇ 1.5.69 1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI — อีเวนต์ #211 — 1.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI" --output "$outRoot/1nTYvu1pqANAwdmUg_yikd9hyRv0fhHiI_1-5-69"  2>&1 | Write-Host

Write-Host "⬇ 2.5.69 1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL — อีเวนต์ #151 — 2.5.69"
gdown --folder "https://drive.google.com/drive/folders/1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL" --output "$outRoot/1rUKjoF2xsJIruYkGIEy7PoB_C_p_kyKL_2-5-69"  2>&1 | Write-Host

Write-Host "⬇ 2.5.69 1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX — อีเวนต์ #152 — 2.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX" --output "$outRoot/1WU8EWt480wQEEZBk4yMxQjXWXzbHt4EX_2-5-69"  2>&1 | Write-Host

Write-Host "⬇ 3.5.69 17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9 — อีเวนต์ #149 — 3.5.69"
gdown --folder "https://drive.google.com/drive/folders/17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9" --output "$outRoot/17wHQz0XvF5tfEIxpCYwKWVWrMkY-sGM9_3-5-69"  2>&1 | Write-Host

Write-Host "⬇ 3.5.69 1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ — อีเวนต์ #150 — 3.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ" --output "$outRoot/1ax4y53-RvF1X7gzRjxsd-DE88G_QACXJ_3-5-69"  2>&1 | Write-Host

Write-Host "⬇ 4.5.69 1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK — อีเวนต์ #147 — 4.5.69"
gdown --folder "https://drive.google.com/drive/folders/1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK" --output "$outRoot/1YFXCtMiYlWi58UMXzwC-QbZnVAvSSqmK_4-5-69"  2>&1 | Write-Host

Write-Host "⬇ 4.5.69 1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP — อีเวนต์ #148 — 4.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP" --output "$outRoot/1dncnMJOPMAnrBn2g_0FRt_wJlU_WIUEP_4-5-69"  2>&1 | Write-Host

Write-Host "⬇ 5.5.69 1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm — อีเวนต์ #145 — 5.5.69"
gdown --folder "https://drive.google.com/drive/folders/1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm" --output "$outRoot/1f2v6j8yvB91fhcBjz58kDeiM7F4xWoFm_5-5-69"  2>&1 | Write-Host

Write-Host "⬇ 5.5.69 1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7 — อีเวนต์ #146 — 5.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7" --output "$outRoot/1ckJbmnphMahOixwmgOBVTzbJ1cYRxDz7_5-5-69"  2>&1 | Write-Host

Write-Host "⬇ 6.5.69 1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f — อีเวนต์ #143 — 6.5.69"
gdown --folder "https://drive.google.com/drive/folders/1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f" --output "$outRoot/1RbAuBDarUXgFjiBEh6QkEt1IoY8r723f_6-5-69"  2>&1 | Write-Host

Write-Host "⬇ 6.5.69 1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV — อีเวนต์ #144 — 6.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV" --output "$outRoot/1g_jSElPWkSSnW1NRTSDzov2QCh2oOezV_6-5-69"  2>&1 | Write-Host

Write-Host "⬇ 7.5.69 16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj — อีเวนต์ #141 — 7.5.69"
gdown --folder "https://drive.google.com/drive/folders/16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj" --output "$outRoot/16xMPyNjWaNhywsvi4v9lCXKgP2zwi6xj_7-5-69"  2>&1 | Write-Host

Write-Host "⬇ 7.5.69 1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w — อีเวนต์ #142 — 7.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w" --output "$outRoot/1Eo_Eq1UK5kHkm_BIPAtYb0iLAwvnvf5w_7-5-69"  2>&1 | Write-Host

Write-Host "⬇ 8.5.69 1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl — อีเวนต์ #139 — 8.5.69"
gdown --folder "https://drive.google.com/drive/folders/1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl" --output "$outRoot/1RljFdWykOALAbgiwP3qDvwWoVF5a3uFl_8-5-69"  2>&1 | Write-Host

Write-Host "⬇ 8.5.69 1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT — อีเวนต์ #140 — 8.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT" --output "$outRoot/1r_FXQGqcj0gWjf124Sm68ceO9gBx1HnT_8-5-69"  2>&1 | Write-Host

Write-Host "⬇ 9.5.69 16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv — อีเวนต์ #137 — 9.5.69"
gdown --folder "https://drive.google.com/drive/folders/16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv" --output "$outRoot/16keKteEZl0ayCwnwOBxVZ7nFkWyMLWKv_9-5-69"  2>&1 | Write-Host

Write-Host "⬇ 9.5.69 15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs — อีเวนต์ #138 — 9.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs" --output "$outRoot/15p-Ja33F3BssoFWhKs-ZyK2bxYgJdPJs_9-5-69"  2>&1 | Write-Host

Write-Host "⬇ 10.5.69 10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn — อีเวนต์ #135 — 10.5.69"
gdown --folder "https://drive.google.com/drive/folders/10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn" --output "$outRoot/10LO9-7EfkaOa7XqxQ0QBBtaJSVzfFALn_10-5-69"  2>&1 | Write-Host

Write-Host "⬇ 10.5.69 1cKlbArarLMxe2EhM5RpVm_l51ACekzFq — อีเวนต์ #136 — 10.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1cKlbArarLMxe2EhM5RpVm_l51ACekzFq" --output "$outRoot/1cKlbArarLMxe2EhM5RpVm_l51ACekzFq_10-5-69"  2>&1 | Write-Host

Write-Host "⬇ 11.5.69 1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ — อีเวนต์ #133 — 11.5.69"
gdown --folder "https://drive.google.com/drive/folders/1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ" --output "$outRoot/1vJrboUYBxbUFRUPJIS8Y5UIg55hiHuIJ_11-5-69"  2>&1 | Write-Host

Write-Host "⬇ 11.5.69 1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK — อีเวนต์ #134 — 11.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK" --output "$outRoot/1ZGpi6mRI0giSZEkiO7L6DGFYkjiLDmGK_11-5-69"  2>&1 | Write-Host

Write-Host "⬇ 12.5.69 1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e — อีเวนต์ #132 — 12.5.69"
gdown --folder "https://drive.google.com/drive/folders/1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e" --output "$outRoot/1UrjIR2AZ8jWmruwnNe7bzo4rnU4Zej5e_12-5-69"  2>&1 | Write-Host

Write-Host "⬇ 13.5.69 1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2 — อีเวนต์ #131 — 13.5.69"
gdown --folder "https://drive.google.com/drive/folders/1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2" --output "$outRoot/1JY-otY6cUP1JV1blzuA6h9Q-EM6ud_L2_13-5-69"  2>&1 | Write-Host

Write-Host "⬇ 14.5.69 1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54 — อีเวนต์ #129 — 14.5.69"
gdown --folder "https://drive.google.com/drive/folders/1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54" --output "$outRoot/1OXPt2YUgx_x2pQmsy0u1SLW0tdx2WB54_14-5-69"  2>&1 | Write-Host

Write-Host "⬇ 14.5.69 1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5 — อีเวนต์ #130 — 14.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5" --output "$outRoot/1jhcUy-2aACBlykcY-tqJZwjoXyy1ObD5_14-5-69"  2>&1 | Write-Host

Write-Host "⬇ 15.5.69 1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv — อีเวนต์ #127 — 15.5.69"
gdown --folder "https://drive.google.com/drive/folders/1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv" --output "$outRoot/1bvplPOboIgFfWyV5SoH4ivg56h2C09Kv_15-5-69"  2>&1 | Write-Host

Write-Host "⬇ 15.5.69 17c9g2acUVGT0Jfzocqkgem33FmlmWa6W — อีเวนต์ #128 — 15.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/17c9g2acUVGT0Jfzocqkgem33FmlmWa6W" --output "$outRoot/17c9g2acUVGT0Jfzocqkgem33FmlmWa6W_15-5-69"  2>&1 | Write-Host

Write-Host "⬇ 16.5.69 1I2-havVVeE2GdyqyBonYMI0JXeC8c208 — อีเวนต์ #125 — 16.5.69"
gdown --folder "https://drive.google.com/drive/folders/1I2-havVVeE2GdyqyBonYMI0JXeC8c208" --output "$outRoot/1I2-havVVeE2GdyqyBonYMI0JXeC8c208_16-5-69"  2>&1 | Write-Host

Write-Host "⬇ 16.5.69 1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi — อีเวนต์ #126 — 16.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi" --output "$outRoot/1-JtWfIyo3Ud0vqj3o7rcaK5p4TrfIIsi_16-5-69"  2>&1 | Write-Host

Write-Host "⬇ 17.5.69 1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp — อีเวนต์ #123 — 17.5.69"
gdown --folder "https://drive.google.com/drive/folders/1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp" --output "$outRoot/1k1M4ZQZdhN5GXu5zsfLYAFbWcWCxYwIp_17-5-69"  2>&1 | Write-Host

Write-Host "⬇ 17.5.69 1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy — อีเวนต์ #124 — 17.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy" --output "$outRoot/1jwBmxvdYb9FMERB1YafHDXU4ljCeMoSy_17-5-69"  2>&1 | Write-Host

Write-Host "⬇ 18.5.69 1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH — อีเวนต์ #121 — 18.5.69"
gdown --folder "https://drive.google.com/drive/folders/1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH" --output "$outRoot/1Zo4KVI9NvrHIBzyyfgZJfd61ZXoTnKRH_18-5-69"  2>&1 | Write-Host

Write-Host "⬇ 18.5.69 1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT — อีเวนต์ #122 — 18.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT" --output "$outRoot/1sRq90E6imzE1xj-EhJFsF9dy9hgk1YoT_18-5-69"  2>&1 | Write-Host

Write-Host "⬇ 19.5.69 12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0 — อีเวนต์ #119 — 19.5.69"
gdown --folder "https://drive.google.com/drive/folders/12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0" --output "$outRoot/12ROjZDfpWI6Ylkb-JduokNCGeocWUW-0_19-5-69"  2>&1 | Write-Host

Write-Host "⬇ 19.5.69 1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8 — อีเวนต์ #120 — 19.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8" --output "$outRoot/1WWNHBUTyHTVIzV978HHfHf0yzrlQQ9K8_19-5-69"  2>&1 | Write-Host

Write-Host "⬇ 20.5.69 15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg — อีเวนต์ #117 — 20.5.69"
gdown --folder "https://drive.google.com/drive/folders/15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg" --output "$outRoot/15JJa_v-Ye8g4uCPhmT469_RYPhrwM6Yg_20-5-69"  2>&1 | Write-Host

Write-Host "⬇ 20.5.69 1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi — อีเวนต์ #118 — 20.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi" --output "$outRoot/1A_F23j1kSJbBYRspSweG2qtjNrzak_Pi_20-5-69"  2>&1 | Write-Host

Write-Host "⬇ 21.5.69 1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4 — อีเวนต์ #115 — 21.5.69"
gdown --folder "https://drive.google.com/drive/folders/1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4" --output "$outRoot/1ba8t_qVo0sL0yyMpDsHDgXNd_X5o-rL4_21-5-69"  2>&1 | Write-Host

Write-Host "⬇ 21.5.69 19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa — อีเวนต์ #116 — 21.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa" --output "$outRoot/19UF2GgB2TSBfZ49X-MKS0Geks7QM80sa_21-5-69"  2>&1 | Write-Host

Write-Host "⬇ 22.5.69 1D5UYpqZc205nwpxqYv6eqnezszSs9xID — อีเวนต์ #113 — 22.5.69"
gdown --folder "https://drive.google.com/drive/folders/1D5UYpqZc205nwpxqYv6eqnezszSs9xID" --output "$outRoot/1D5UYpqZc205nwpxqYv6eqnezszSs9xID_22-5-69"  2>&1 | Write-Host

Write-Host "⬇ 22.5.69 1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe — อีเวนต์ #114 — 22.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe" --output "$outRoot/1sgDHnOogqRvh-WU3_3dpfM2YQVrvp4Xe_22-5-69"  2>&1 | Write-Host

Write-Host "⬇ 23.5.69 1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95 — อีเวนต์ #110 — 23.5.69"
gdown --folder "https://drive.google.com/drive/folders/1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95" --output "$outRoot/1mZBY-TcOdix-DvEw7ABfohf6iJ0erg95_23-5-69"  2>&1 | Write-Host

Write-Host "⬇ 23.5.69 1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh — อีเวนต์ #111 — 23.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh" --output "$outRoot/1I72Mp6jiYzEnppdq-FBSoGf3fuVQSlYh_23-5-69"  2>&1 | Write-Host

Write-Host "⬇ 24.5.69 1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy — อีเวนต์ #108 — 24.5.69"
gdown --folder "https://drive.google.com/drive/folders/1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy" --output "$outRoot/1BiBMnxnxLnY3F0B1AFfTtF2a3AFpX_xy_24-5-69"  2>&1 | Write-Host

Write-Host "⬇ 24.5.69 1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9 — อีเวนต์ #109 — 24.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9" --output "$outRoot/1Gi60DuyofN1UvQuEynOEJVV88oYbwvH9_24-5-69"  2>&1 | Write-Host

Write-Host "⬇ 25.5.69 1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz — อีเวนต์ #106 — 25.5.69"
gdown --folder "https://drive.google.com/drive/folders/1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz" --output "$outRoot/1dPEJAgw6OGo_6KKpqL8RY2AtD_3Tj_Vz_25-5-69"  2>&1 | Write-Host

Write-Host "⬇ 25.5.69 1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa — อีเวนต์ #107 — 25.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa" --output "$outRoot/1fkHVOFsi-Wo9ReFaJRk6Uhf1F6nJP1Sa_25-5-69"  2>&1 | Write-Host

Write-Host "⬇ 26.5.69 1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF — อีเวนต์ #104 — 26.5.69"
gdown --folder "https://drive.google.com/drive/folders/1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF" --output "$outRoot/1SM2WuDHR1rzEFzJyUWuNzqyDHnIrXiVF_26-5-69"  2>&1 | Write-Host

Write-Host "⬇ 26.5.69 1VUVLF11659zIrx080rMPlF4o1c9TRhyv — อีเวนต์ #105 — 26.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1VUVLF11659zIrx080rMPlF4o1c9TRhyv" --output "$outRoot/1VUVLF11659zIrx080rMPlF4o1c9TRhyv_26-5-69"  2>&1 | Write-Host

Write-Host "⬇ 27.5.69 1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L_ — อีเวนต์ #102 — 27.5.69"
gdown --folder "https://drive.google.com/drive/folders/1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L_" --output "$outRoot/1sD0JSvKtnW7TxRXJwLM3G-dgg-7-E_L__27-5-69"  2>&1 | Write-Host

Write-Host "⬇ 27.5.69 1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy — อีเวนต์ #103 — 27.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy" --output "$outRoot/1XpPmJ4CKIlpFeDyQ_RYwjAc4LYxbGzwy_27-5-69"  2>&1 | Write-Host

Write-Host "⬇ 28.5.69 1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W — อีเวนต์ #100 — 28.5.69"
gdown --folder "https://drive.google.com/drive/folders/1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W" --output "$outRoot/1cA_9IkDnvJdHSaFfzHot1rHK929iEE8W_28-5-69"  2>&1 | Write-Host

Write-Host "⬇ 28.5.69 1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9 — อีเวนต์ #101 — 28.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9" --output "$outRoot/1LoklS-FRjRMMTYoVsYgYGdAYrtRQfjO9_28-5-69"  2>&1 | Write-Host

Write-Host "⬇ 29.5.69 1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM — อีเวนต์ #98 — 29.5.69"
gdown --folder "https://drive.google.com/drive/folders/1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM" --output "$outRoot/1VBmwscRzf2JLafM_JUDA1XjgIlAY-9kM_29-5-69"  2>&1 | Write-Host

Write-Host "⬇ 29.5.69 1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv — อีเวนต์ #99 — 29.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv" --output "$outRoot/1p5FL7omeEWl3fc2pn2q8lKN-at5IKdJv_29-5-69"  2>&1 | Write-Host

Write-Host "⬇ 30.5.69 1kZypUy-89IG0AI_z17wGpJZVMROHjxSN — อีเวนต์ #96 — 30.5.69"
gdown --folder "https://drive.google.com/drive/folders/1kZypUy-89IG0AI_z17wGpJZVMROHjxSN" --output "$outRoot/1kZypUy-89IG0AI_z17wGpJZVMROHjxSN_30-5-69"  2>&1 | Write-Host

Write-Host "⬇ 30.5.69 1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4 — อีเวนต์ #97 — 30.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4" --output "$outRoot/1WrqeUw_0h9OWbReT8jxQCYvkBP_vKnT4_30-5-69"  2>&1 | Write-Host

Write-Host "⬇ 31.5.69 1zk9sLb2K3DG4noD8uWNNq1JooavL4shV — อีเวนต์ #94 — 31.5.69"
gdown --folder "https://drive.google.com/drive/folders/1zk9sLb2K3DG4noD8uWNNq1JooavL4shV" --output "$outRoot/1zk9sLb2K3DG4noD8uWNNq1JooavL4shV_31-5-69"  2>&1 | Write-Host

Write-Host "⬇ 31.5.69 1tdsb_ifW6vG59WhrinprUpePArnFE6rE — อีเวนต์ #95 — 31.5.69 (ประมาณ)"
gdown --folder "https://drive.google.com/drive/folders/1tdsb_ifW6vG59WhrinprUpePArnFE6rE" --output "$outRoot/1tdsb_ifW6vG59WhrinprUpePArnFE6rE_31-5-69"  2>&1 | Write-Host
