# AI Working Notes — Google Drive File Viewer (XBep Collection)

เอกสารนี้บันทึกสถานะการทำงาน การตรวจสอบระบบ และหลักฐานการทดสอบ (Verification Evidence) ตามกฎการทำงานของโปรเจกต์

## สถานะโมดูลหลัก (Current Baseline Status)

| โมดูล / ฟีเจอร์ | สถานะ | รายละเอียดและหลักฐานการทดสอบ (Verification Evidence) |
| --- | --- | --- |
| **Account Streaming (`drive-stream-sw.js`)** | `VERIFIED WORKING` | สตรีมผ่าน Service Worker ด้วย Bearer Token, รองรับ Bounded Range (16 MiB), 4-way Parallel Sub-intervals, และ Read-ahead Prefetch พร้อมส่ง `controller.signal` ยกเลิกทั้ง 4 ท่อเมื่อผู้ใช้ Seek ข้ามช่วง (`node --test tests/authenticated-stream.cjs` — 27/27 PASS) |
| **Public Stream Worker (`cloudflare-drive-worker.mjs`)** | `VERIFIED WORKING` | สตรีมสาธารณะผ่าน Cloudflare Worker, แปลง Range ปลายเปิดเป็นช่วง 8 MiB, รองรับการลดขนาดช่วงเมื่อติด `downloadQuotaExceeded` และทำ Parallel Sub-intervals (`node --test tests/public-worker.cjs` — PASS) |
| **Completed Video Cache (`video-cache.js`)** | `VERIFIED WORKING` | แคชคลิปที่โหลดจบลง Cache Storage แยกตาม Scope บัญชี, จำกัดขนาดแบบ LRU, ป้องกัน Race Condition ด้วย `navigator.locks` และ `generation` epoch (`node --test tests/video-cache.cjs` — PASS) |
| **Image & PDF Lightbox Viewer (`index.html`)** | `VERIFIED WORKING` | รองรับการซูม/ลาก (Pinch/Pan/Double-tap) ทั้งภาพปกติ (`lbImg`) และเอกสาร PDF (`pdfCanvas` ผ่าน PDF.js) พร้อมคืนค่าเมื่อปิดหรือสลับมีเดีย (`node tests/image-viewer.cjs` & `node tests/media-lifecycle.cjs` — PASS) |
| **Collection Search & Tag Sync (`index.html`, `ADR-0001`)** | `VERIFIED WORKING` | ค้นหาชื่อไทยแบบ NFC/NFD normalize, กรองแท็ก `💦 น้ำพุ่ง` (`squirting`), ซิงก์ `gdv-tags.json` ขึ้น Drive `appDataFolder` แบบรอผล `await tagPushMerged` จริงก่อนแสดง `"บันทึกแล้ว ✓"` และตรวจ `COLL_CHECKED_AT` แบบไดนามิกไม่พังเมื่อสคริปต์รายวันอัปเดตเวลา (`node tests/collection-search.cjs` — PASS) |
| **Collection Data Sync (`tools/collection_data.js`)** | `VERIFIED WORKING` | ซิงก์ข้อมูลระหว่าง `collections_merged.json` และ `index.html` ตรงกันทั้งสองฝั่ง (`node tools/collection_data.js check` — 325 รายการตรงกัน) |

---

## บันทึกการแก้ไขและตรวจสอบล่าสุด (2026-10-11)

### 1. ซ่อมชุดทดสอบที่พังหลังเพิ่ม PDF Viewer และอัปเดตเวลาตรวจลิงก์รายวัน
- **สถานะ:** `VERIFIED WORKING` (แก้จาก `KNOWN REGRESSION` ที่ทำให้เทสพัง 3 ไฟล์)
- **สาเหตุ (Root Cause):**
  1. `tests/collection-search.cjs` เขียนดักค่าคงที่ `/14 ก\.ย\. 69/g` ตายตัว เมื่อสคริปต์ `scripts/data/patch_alive_from_report.py` อัปเดต `COLL_CHECKED_AT` เป็นวันเวลาใหม่จึงพัง
  2. `tests/image-viewer.cjs` และ `tests/media-lifecycle.cjs` รันฟังก์ชันจาก `index.html` ใน `vm.createContext` โดยยังไม่ได้เพิ่มตัวแปร `pdfInLightbox`, `pdfCanvas` และฟังก์ชัน `resetPdfViewer` ที่เพิ่งเข้ามาในคอมมิต `67ccafc` และ `21f6096`
- **การแก้ไข:**
  - ปรับ `tests/collection-search.cjs` ให้ดึงค่าจาก `const COLL_CHECKED_AT = "([^"]+)";` แบบไดนามิกแล้วตรวจว่าไม่ปรากฏซ้ำที่อื่นในไฟล์
  - เพิ่ม `pdfInLightbox`, `pdfCanvas` และ `resetPdfViewer` เข้า VM Context ของ `tests/image-viewer.cjs` และ `tests/media-lifecycle.cjs` พร้อมเพิ่มเคสทดสอบ `resetImageView` ในโหมด PDF

### 2. แก้บั๊ก Resource Leak ใน `drive-stream-sw.js` ตอนทำ Parallel Read-Ahead
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause):** ใน `drive-stream-sw.js` บรรทัดที่ 225 เรียก `fetchParallelChunk(id, nextStart, end, token)` โดยลืมส่งอาร์กิวเมนต์ที่ 5 (`controller.signal`) ทำให้เมื่อผู้ใช้ Seek ข้ามช่วงแล้วระบบสั่ง `ahead.controller.abort()` คำขอ `fetch` ย่อยทั้ง 4 ท่อไม่ถูกยกเลิก
- **การแก้ไข:** ส่ง `controller.signal` เข้า `fetchParallelChunk(id, nextStart, end, token, controller.signal)` และเพิ่มเทส `a seek away from a parallel read-ahead aborts all four prefetch sub-intervals` ใน `tests/authenticated-stream.cjs`

### 3. แก้บั๊กสถานะซิงก์แท็ก `💦 น้ำพุ่ง` แสดงผลสำเร็จก่อนอัปโหลดจริง
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause):** `tagSchedulePush` ใน `index.html` เรียก `tagPushMerged(accessToken)` โดยไม่รอ Promise และตั้งข้อความ `"บันทึกแล้ว ✓"` ทันที อีกทั้ง `tagPushMerged` กลืน Error ทิ้งโดยไม่คืนค่าสถานะ
- **การแก้ไข:** ให้ `tagPushMerged` คืนค่า `true/false` ตามผล HTTP Response จริง และให้ `tagSchedulePush` รอ `.then()` ก่อนแสดง `"บันทึกแล้ว ✓"` หรือ `"บันทึกไม่สำเร็จ"` พร้อมเพิ่มเทสใน `tests/collection-search.cjs`
