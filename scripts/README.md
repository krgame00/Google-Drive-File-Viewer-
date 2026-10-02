# สคริปต์ดูแลคลัง

รันคำสั่งตัวอย่างจากรากโปรเจกต์ สคริปต์ Python ใช้ Python 3 และบางตัวใช้ `requests`; งานย้ายไฟล์ใช้ rclone และ remote ที่ตั้งค่าไว้แล้ว

## หมวดงาน

| โฟลเดอร์ | สคริปต์ | หน้าที่ |
| --- | --- | --- |
| `checks/` | `check_drive_alive.py`, `check_mega_alive.py` | ตรวจสถานะลิงก์และเขียนรายงาน |
| `checks/` | `check_drive_names.py` | อ่านคลังจากรากโปรเจกต์ ตรวจชื่อ และเขียน `reports/drive_names_report.json` |
| `checks/` | `calc_sizes.py` | คำนวณขนาดและสรุปรายงาน |
| `data/` | `patch_alive_from_report.py` | นำรายงาน Drive ไปแก้สถานะใน HTML |
| `data/` | `merge_new_posts.py`, `fill_od_links.py`, `rename_new_titles.py` | แก้ข้อมูลคลังจากแหล่งข้อมูลเฉพาะงาน |
| `download/` | `download_*.ps1` | ดาวน์โหลดตามเดือนหรือรายการไม่ระบุเดือน |
| `transfer/` | `copy_day.ps1`, `rclone_copy_*.ps1` | คัดลอกไป remote ผ่าน rclone |
| `monitor/` | `watch_rclone_done.ps1`, `watch_and_shutdown.ps1` | ติดตามงาน; ตัวหลังมีการปิดเครื่อง |
| ราก `scripts/` | `daily_drive_check_and_push.py` | ตรวจ Drive อัปเดตข้อมูล แล้ว commit/push เมื่อเข้าเงื่อนไข |

สคริปต์หาไฟล์เว็บ ข้อมูลคลัง และรายงานจากตำแหน่งโปรเจกต์เอง จึงย้ายหรือเปลี่ยนชื่อโฟลเดอร์ได้ ส่วนเครื่องมือและปลายทางภายนอกตั้งค่าตามหัวข้อถัดไป

## ตั้งค่าเครื่องในจุดเดียว

ใช้ `scripts/config.example.json` เป็นค่าเริ่มต้น หากต้องเปลี่ยนค่าของเครื่อง ให้คัดลอกเป็น `scripts/config.local.json` แล้วแก้เฉพาะค่าที่ต้องการ ไฟล์ local ถูกละเว้นจาก Git และค่าที่ไม่ได้ระบุจะใช้ค่าเริ่มต้น

```powershell
Copy-Item scripts/config.example.json scripts/config.local.json
```

| ค่า | ค่าเริ่มต้น / ความหมาย |
| --- | --- |
| `rclonePath` | ตำแหน่ง rclone เดิมภายใต้ `%LOCALAPPDATA%`; ถ้าไม่พบ จะลอง rclone ใน PATH |
| `downloadRoot` | `F:/XBep`; สคริปต์เติมโฟลเดอร์เดือนให้เอง |
| `logRoot` | `%USERPROFILE%`; เก็บ log ชื่อเดิม ต้องเป็นโฟลเดอร์ที่มีอยู่แล้ว |
| `driveRemote` | `gdrive`; ชื่อ remote ไม่มีเครื่องหมาย `:` |
| `remoteRoot` | `XBep`; โฟลเดอร์บน remote |
| `linkSourceRoot` | `%USERPROFILE%/Downloads`; ที่อยู่ไฟล์ข้อความต้นทางสำหรับ merge/fill |

path แบบสัมพัทธ์อ้างอิงจากโฟลเดอร์ `scripts/` ไม่ใช่ working directory จึงเรียกจากที่อื่นได้ ค่า environment ใช้รูปแบบ `%USERPROFILE%` และ `%LOCALAPPDATA%` บน Windows ห้ามใส่ API key หรือโทเคนในไฟล์นี้

ตัวอย่างเปลี่ยนเพียงบางค่า:

```json
{
  "downloadRoot": "D:/Videos/XBep",
  "driveRemote": "mydrive"
}
```

ก่อนโอน สคริปต์ตรวจ rclone และชื่อ remote ด้วย `listremotes` ซึ่งอ่านการตั้งค่าในเครื่อง ก่อนดาวน์โหลดตรวจ gdown และไดรฟ์ปลายทาง ถ้าพบค่าผิดหรือเครื่องมือหาย จะหยุดพร้อมข้อความ งาน monitor อ่าน log จาก `logRoot` เดียวกับงานโอน

ไฟล์ต้นทาง merge/fill ยังใช้ชื่อ `XBep_Links_Clean_2026-09-14.txt` และ `XBep_Posts_41_to_80.txt` ภายใต้ `linkSourceRoot`; การแก้ตั้งค่าไม่เปลี่ยนข้อมูลหรือลิงก์เหล่านี้

ทดสอบการตั้งค่าแบบ offline (ไม่มีโอน ดาวน์โหลด หรือปิดเครื่อง):

```powershell
powershell -ExecutionPolicy Bypass -File tests/project-settings.ps1
py -B tests/project_paths.py
```

## ตัวอย่าง

```powershell
py scripts/checks/check_drive_alive.py
py scripts/checks/check_drive_names.py --limit 5
py scripts/data/patch_alive_from_report.py
powershell -ExecutionPolicy Bypass -File scripts/transfer/rclone_copy_ALL.ps1
```

ตัวตรวจชื่อใช้ `GDRIVE_API_KEY` หรือ `GOOGLE_DRIVE_API_KEY` จาก environment ได้ ผลตรวจชื่อเขียนลง `reports/` โดยค่าเริ่มต้น และเปลี่ยนตำแหน่งด้วย `--out` ได้

ตัวรวม rclone หาไฟล์รายเดือนจากโฟลเดอร์ของสคริปต์เอง จึงไม่ขึ้นกับ working directory

## การเปลี่ยนตำแหน่ง

สคริปต์ 24 ตัวจาก `scripts/<ชื่อไฟล์>` ย้ายเข้าหมวดข้างต้น ชื่อไฟล์เดิมไม่เปลี่ยน ถ้ามี shortcut หรือ Scheduled Task ที่เรียกไฟล์เหล่านั้นโดยตรง ให้ปรับ path ตามหมวดใหม่

`scripts/daily_drive_check_and_push.py` อยู่ตำแหน่งเดิมและเรียกไฟล์ในหมวดใหม่แล้ว จึงใช้คำสั่งงานประจำเดิมได้ การทดสอบโครงสร้างไม่รันงานนี้ เพราะมันทำคำขอเครือข่าย แก้ข้อมูล และ push Git

หลังใช้สคริปต์แก้ข้อมูล ให้ตรวจความตรงกันด้วย `node tools/collection_data.js check` และตรวจ diff ก่อน commit
