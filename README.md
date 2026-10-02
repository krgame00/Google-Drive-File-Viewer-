# Google Drive File Viewer

เว็บดูไฟล์ Google Drive และคลังลิงก์ Drive/MEGA พร้อมเครื่องเล่นวิดีโอและรูปภาพ

## เปิดเว็บในเครื่อง

ดับเบิลคลิก `start.bat` หรือรันจากโฟลเดอร์โปรเจกต์:

```powershell
py -m http.server 8000
```

เปิด http://localhost:8000/index.html ใช้ HTTP สำหรับ Service Worker; การเปิด `index.html` แบบ `file://` ใช้สตรีมผ่าน Service Worker ไม่ได้

## โครงสร้าง

| ตำแหน่ง | หน้าที่ |
| --- | --- |
| `index.html` | หน้าเว็บหลัก สไตล์ และ JavaScript รวมถึงข้อมูลคลังที่ฝังในหน้า |
| `drive-stream-sw.js` | Service Worker สำหรับสตรีมผ่านบัญชี Google |
| `cloudflare-drive-worker.mjs` | ซอร์ส Worker สำหรับสตรีมสาธารณะ ต้อง Deploy แยก |
| `collections_merged.json` | ข้อมูลคลัง ใช้คู่กับข้อมูลที่ฝังในหน้าเว็บ |
| `scripts/` | งานตรวจลิงก์ แก้ข้อมูล ดาวน์โหลด ย้ายไฟล์ และติดตามงาน |
| `scripts/config.example.json` | ค่าเริ่มต้นของเครื่องมือและปลายทาง; ปรับเฉพาะเครื่องใน `config.local.json` |
| `tools/collection_data.js` | ตรวจและซิงก์ข้อมูลคลังระหว่าง JSON กับ HTML |
| `tests/` | ชุดทดสอบด้วย Node.js |
| `reports/` | ผลตรวจและข้อมูลประกอบสคริปต์ ดูรายการใน `reports/README.md` |
| `docs/` | คู่มือสตรีม แผนงาน และรายงานทดสอบ |

แอป Gemini ชุด Portable แบบหน้าเว็บทดลอง และคลิปตัวอย่างในเครื่องถูกล้างออกตามคำขอผู้ใช้ รายละเอียดอยู่ใน `docs/local-projects.md` เว็บหลักและชุดทดสอบใน `tests/` ยังคงอยู่

## ตรวจงานก่อนเผยแพร่

ต้องมี Node.js:

```powershell
node --test tests/*.cjs
node tools/collection_data.js check
node --check drive-stream-sw.js
node --check cloudflare-drive-worker.mjs
```

ถ้าข้อมูลคลังไม่ตรงกัน เลือกคำสั่งตามฝั่งที่แก้:

```powershell
# HTML -> JSON
node tools/collection_data.js extract
# JSON -> HTML
node tools/collection_data.js inject
```

`extract` และ `inject` เขียนไฟล์ จึงควรตรวจ Git diff หลังรัน

## เผยแพร่และคู่มือ

การ push Git เผยแพร่ซอร์สเว็บ ส่วน Cloudflare Worker ต้อง Deploy ใน Cloudflare แยกกัน

- [คู่มือสคริปต์และตำแหน่งใหม่](scripts/README.md)
- [บันทึกโฟลเดอร์ที่ล้างออก](docs/local-projects.md)
- [สตรีมผ่านบัญชี Google](docs/authenticated-video.md)
- [สตรีมผ่าน Cloudflare Worker](docs/public-stream-worker.md)
- [รายงานตรวจช่วงข้อมูลสตรีม](docs/test-report-2026-10-02-stream-ranges.md)

ไฟล์เว็บและ Service Worker คงอยู่ที่รากโปรเจกต์เพื่อรักษา URL เดิม
