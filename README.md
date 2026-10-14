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
| `index.html` | โครง HTML และ DOM IDs ที่โมดูลใช้งาน |
| `app-core.js` | state หลัก, event handlers, helpers และ bridge เชื่อมโมดูล |
| `styles.css` | สไตล์หน้าเว็บและตัวดูสื่อ |
| `collections-data.js` | ข้อมูลคลัง XBep ที่หน้าเว็บโหลด |
| `collection-viewer.js` | ค้นหา กรอง สุ่ม และแสดงผลรายการคลัง |
| `video-player.js` | เครื่องเล่นวิดีโอ สตรีม การเล่นต่อ และสถานะ playback |
| `drive-explorer.js` | Google OAuth, Drive API, สำรวจไฟล์ ค้นหา/เรียงลำดับ และนำทางโฟลเดอร์ |
| `media-lightbox.js` | Lightbox รูปภาพ, gesture/zoom และตัวดู PDF/เอกสาร |
| `drive-stream-sw.js` | Service Worker สำหรับสตรีมผ่านบัญชี Google |
| `cloudflare-drive-worker.mjs` | ซอร์ส Worker สำหรับสตรีมสาธารณะ ต้อง Deploy แยก |
| `collections_merged.json` | สำเนาข้อมูลคลังสำหรับเครื่องมือซิงก์และบำรุงรักษา |
| `scripts/` | งานตรวจลิงก์ แก้ข้อมูล ดาวน์โหลด ย้ายไฟล์ และติดตามงาน |
| `scripts/config.example.json` | ค่าเริ่มต้นของเครื่องมือและปลายทาง; ปรับเฉพาะเครื่องใน `config.local.json` |
| `tools/collection_data.js` | ตรวจ/ซิงก์ข้อมูลระหว่าง `collections-data.js` (แหล่งข้อมูลหลัก) กับ `collections_merged.json` |
| `tests/` | ชุดทดสอบด้วย Node.js; โมดูลที่ export API จะถูกทดสอบผ่าน API โดยตรง |
| `tests/helpers/load-video-player-api.cjs` | โหลด Video Player module API ด้วย test bridge แบบแยก state |
| `tests/helpers/load-drive-explorer-api.cjs` | โหลด Drive Explorer module API ด้วย test bridge แบบแยก state |
| `reports/` | ผลตรวจและข้อมูลประกอบสคริปต์ ดูรายการใน `reports/README.md` |
| `docs/` | คู่มือสตรีม แผนงาน และรายงานทดสอบ |

เว็บยังใช้ static script tags โดยไม่ต้องมี bundler/build step: `video-cache.js` → `app-core.js` → `collections-data.js` → `video-player.js` → `drive-explorer.js` → `media-lightbox.js` → `collection-viewer.js` ตามลำดับใน `index.html` โดย `app-core.js` เป็นเจ้าของ state, event wiring และ bridge (`GDVVideoApi`, `GDVExplorerApi`, `GDVLightboxApi`, `GDVCollectionApi`) จึงต้องรักษาลำดับโหลดนี้ไว้ก่อนเผยแพร่

แอป Gemini ชุด Portable แบบหน้าเว็บทดลอง และคลิปตัวอย่างในเครื่องถูกล้างออกตามคำขอผู้ใช้ รายละเอียดอยู่ใน `docs/local-projects.md` เว็บหลักและชุดทดสอบใน `tests/` ยังคงอยู่

## ตรวจงานก่อนเผยแพร่

ต้องมี Node.js:

```powershell
node --test tests/*.cjs
node tools/collection_data.js check
node --check app-core.js
node --check drive-explorer.js
node --check video-player.js
node --check media-lightbox.js
node --check collection-viewer.js
node --check drive-stream-sw.js
node --check cloudflare-drive-worker.mjs
```

ถ้าข้อมูลคลังไม่ตรงกัน เลือกคำสั่งตามแหล่งข้อมูลที่ต้องการให้เป็นค่าหลัก:

```powershell
# collections-data.js -> collections_merged.json
node tools/collection_data.js extract
# collections_merged.json -> collections-data.js
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
