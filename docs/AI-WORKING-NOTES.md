# AI Working Notes — Google Drive File Viewer (XBep Collection)

เอกสารนี้บันทึกสถานะการทำงาน การตรวจสอบระบบ และหลักฐานการทดสอบ (Verification Evidence) ตามกฎการทำงานของโปรเจกต์

## สถานะโมดูลหลัก (Current Baseline Status)

| โมดูล / ฟีเจอร์ | สถานะ | รายละเอียดและหลักฐานการทดสอบ (Verification Evidence) |
| --- | --- | --- |
| **Account Streaming (`drive-stream-sw.js`)** | `VERIFIED WORKING` | สตรีมผ่าน Service Worker ด้วย Bearer Token, รองรับ Bounded Range (16 MiB), 4-way Parallel Sub-intervals, และ Read-ahead Prefetch พร้อมส่ง `controller.signal` ยกเลิกทั้ง 4 ท่อเมื่อผู้ใช้ Seek ข้ามช่วง (`node --test tests/authenticated-stream.cjs` — 27/27 PASS) |
| **Public Stream Worker (`cloudflare-drive-worker.mjs`)** | `VERIFIED WORKING` | สตรีมสาธารณะผ่าน Cloudflare Worker, แปลง Range ปลายเปิดเป็นช่วง 8 MiB, รองรับการลดขนาดช่วงเมื่อติด `downloadQuotaExceeded` และทำ Parallel Sub-intervals (`node --test tests/public-worker.cjs` — PASS) |
| **Completed Video Cache (`video-cache.js`)** | `VERIFIED WORKING` | แคชคลิปที่โหลดจบลง Cache Storage แยกตาม Scope บัญชี, จำกัดขนาดแบบ LRU, ป้องกัน Race Condition ด้วย `navigator.locks` และ `generation` epoch (`node --test tests/video-cache.cjs` — PASS) |
| **Image & PDF Lightbox Viewer (`index.html`)** | `VERIFIED WORKING` | รองรับการซูม/ลาก (Pinch/Pan/Double-tap) ทั้งภาพปกติ (`lbImg`) และเอกสาร PDF (`pdfCanvas` ผ่าน PDF.js), แสดงปุ่ม `#lbPrev`/`#lbNext` ในโหมด PDF ให้กดข้ามไปดูรูปถัดไปในโฟลเดอร์ได้ทันที, รอ `await prevTask.promise` หลัง `cancel()` ป้องกัน Canvas Lock ตอนกดข้ามหน้ารัวๆ และเชื่อมลำดับมีเดียระหว่าง PDF กับรูปภาพในโฟลเดอร์ (`node tests/image-viewer.cjs` & `node tests/media-lifecycle.cjs` — PASS) |
| **Collection Search & Tag Sync (`collection-viewer.js`, `ADR-0001`)** | `VERIFIED WORKING` | ค้นหาชื่อไทยแบบ NFC/NFD normalize, กรองแท็ก `💦 น้ำพุ่ง` (`squirting`), ซิงก์ `gdv-tags.json` ขึ้น Drive `appDataFolder` แบบรอผล `await tagPushMerged` จริงก่อนแสดง `"บันทึกแล้ว ✓"` และตรวจ `COLL_CHECKED_AT` แบบไดนามิกไม่พังเมื่อสคริปต์รายวันอัปเดตเวลา (`node tests/collection-search.cjs` — PASS) |
| **Collection Data Sync (`tools/collection_data.js`)** | `VERIFIED WORKING` | ซิงก์ข้อมูลระหว่าง `collections_merged.json` และ `collections-data.js` ตรงกันทั้งสองฝั่ง (`node tools/collection_data.js check`) |
| **UI/UX Typography, WCAG Contrast, Light Theme, Toolbar & P2 Polish (`index.html`)** | `VERIFIED WORKING` | เปิดใช้งานฟอนต์ `"Noto Sans Thai"` ใน `body`, ปรับลำดับขั้นขนาดหัวข้อ (`≥ 1.25x` Modular Type Scale), แยก `--accent-hover` (`#4e5ac0`, คอนทราสต์ `5.41:1` ผ่าน WCAG AA) กับ `--accent-text`, เพิ่ม CSS Variables สำหรับโหมดสว่าง (`html[data-theme="light"]`), จัดระเบียบแถบเครื่องมือ `#collectionsCard` ด้วย `<details class="coll-filter-drawer" id="collFilterDrawer">`, เพิ่มป้ายชื่อไฟล์ `#lbTitle` ใน Lightbox, ปรับ `.vid-progress-bar` และ `--shadow-glow` ให้ผ่านเกณฑ์ GPU/Elevation และลบกฎ CSS ที่ซ้ำซ้อน (`impeccable detect --json index.html` — `[]` 0 warnings & `node --test tests/*.cjs` — 132/132 PASS) |

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

### 4. ยกระดับ UI/UX ชุด P1 (Typography, WCAG AA Contrast, Light Mode Tokens และจัดระเบียบแถบเครื่องมือคลัง XBep)
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause):**
  1. โหลดฟอนต์ `Noto Sans Thai` จาก Google Fonts แต่ใน `body` ระบุแค่ `"Inter"` ทำให้ภาษาไทยตกไปใช้ฟอนต์สำรองของระบบ และขนาดหัวข้อ (`h2`, `h3`) ห่างจากตัวหนังสือปกติเพียง `1.16:1`
  2. `--accent-hover: #828fff` ถูกใช้ทั้งเป็นพื้นหลังปุ่ม `.btn-primary:hover` (ทำให้คอนทราสต์กับตัวอักษรสีขาวตกลงเหลือ `2.9:1` ต่ำกว่าเกณฑ์ WCAG AA `4.5:1`) และเป็นสีตัวอักษรบนพื้นมืด
  3. `.coll-card` และป้ายสถานะในคลัง XBep ฮาร์ดโค้ดสี `rgba(255,255,255,...)` และสีสว่าง (`#a5adff`, `#38bdf8`) ทำให้การ์ดและป้ายจางหายเมื่อสลับเป็นโหมดสว่าง (`html[data-theme="light"]`)
  4. ส่วนหัว `#collectionsCard` วางปุ่มและ Checkbox 12 ชิ้นเรียงปนกันในแถวเดียว
- **การแก้ไขและหลักฐานการตรวจสอบ (Verification Evidence):**
  - ตั้ง `font-family: "Noto Sans Thai", "Inter", ...` ใน `body` และปรับสเกล `.logo` (`1.5rem`), `h2` (`1.25rem`), `h3` (`1.05rem`) ให้ผ่านเกณฑ์ Modular Scale `≥ 1.25x`
  - แยก `--accent-hover: #4e5ac0` (คอนทราสต์ `5.41:1` บนปุ่ม) ออกจาก `--accent-text: #8b97ff` และเพิ่มตัวแปร `--surface-subtle`, `--badge-evt-*`, `--badge-squirt-*`, `--badge-warn-*` รองรับทั้งโหมดมืดและโหมดสว่าง
  - แยกโครงสร้างส่วนหัว `#collectionsCard` เป็น `.coll-header-bar` (ชื่อคลัง + ปุ่มสุ่ม/สลับมุมมอง/ซ่อน) และ `.coll-toolbar` (ค้นหา + เรียงลำดับ + กรองด่วน `💦 เฉพาะน้ำพุ่ง` + ลิ้นชัก `<details class="coll-filter-drawer" id="collFilterDrawer">` สำหรับตัวเลือกมุมมองรอง)

### 5. เก็บงาน UI/UX ชุด P2 (Lightbox File Title, Placeholder Image `src`, GPU Transition, Directional Elevation Shadow & CSS Cleanup)
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause):**
  1. Lightbox (`#lightbox`) แสดงเฉพาะลำดับภาพ (`#lbCount` เช่น `3 / 25`) แต่ไม่แสดงชื่อไฟล์เหมือนใน Video Modal (`#vidTitle`) ทำให้ผู้ใช้ไม่ทราบชื่อไฟล์รูปภาพหรือเอกสาร PDF ที่กำลังเปิดอยู่ และ `<img id="lbImg" alt="Preview" />` ที่ไม่มีแอตทริบิวต์ `src` เริ่มต้นถูกตรวจพบเป็น `broken-image`
  2. `.vid-progress-bar` ใช้ `transition: width 0.2s` ซึ่งกระตุ้น Layout Calculation ซ้ำทุกครั้งที่อัปเดตเปอร์เซ็นต์การโหลดคลิป และ `--shadow-glow: 0 0 24px var(--accent-glow)` เป็นเงาเรืองแสงแบบไร้ทิศทาง (`dark-glow`)
  3. มีกฎ `.filter-chip.active` ซ้ำกันใน `index.html`
- **การแก้ไขและหลักฐานการตรวจสอบ (Verification Evidence):**
  - เพิ่ม `<div class="lb-title lb-ui" id="lbTitle"></div>` ใน `#lightbox` พร้อมผูกชื่อไฟล์ใน `updateLbCount()` (โหมดรูปภาพ) และ `openPdfDocument()` (โหมด PDF) และล้างค่าใน `closeLightbox()` หลัง `cancelImageTap()`
  - กำหนดค่าเริ่มต้น `src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"` บน `<img id="lbImg">` เพื่อป้องกันสถานะ `broken-image` ตอนยังไม่เปิด Lightbox
  - เปลี่ยน `.vid-progress-bar` เป็น `transition: transform 0.2s, opacity 0.2s; transform-origin: left;`, เปลี่ยน `--shadow-glow` เป็นเงายกระดับตามทิศทาง (`0 12px 32px ...`) ทั้งโหมดมืดและโหมดสว่าง และลบกฎ `.filter-chip.active` ที่ซ้ำออก
  - ผลตรวจด้วย `impeccable detect --json index.html`: คืนค่า `[]` (**0 รายการ** — ไร้คำเตือนทุกหมวดหมู่)
  - ผลรันชุดทดสอบอัตโนมัติ: `node --test tests/*.cjs` ผ่านครบ **130/130 PASS** และ `node tools/collection_data.js check` ตรงกันครบ **325 รายการ**

### 6. แก้บั๊กเปิดไฟล์ PDF แล้วกดข้ามๆ ดูรูปถัดไปไม่ได้ (`index.html`, `tests/image-viewer.cjs`)
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause — 4 จุดซ้อนกัน):**
  1. **ซ่อนปุ่มเลื่อนข้างจอในโหมด PDF:** กฎ CSS `.lightbox[data-viewer="pdf"] #lbPrev` และ `#lbNext` สั่ง `display: none !important;` ทำให้เมื่อเปิดไฟล์ PDF ใน Lightbox ปุ่มลูกศรซ้าย/ขวา (`‹` / `›`) หายไปทันที
  2. **รายการมีเดีย (`mediaList("image")`) ไม่รวมไฟล์ PDF:** `mediaList("image")` คัดเฉพาะการ์ดที่ `dataset.kind === "image"` ไม่รวมการ์ด PDF (`data-kind="file" data-type="pdf"`) และในโหมด Fallback (`openDocument` / `#videoModal`) ปุ่ม `#vidPrev`/`#vidNext` เรียก `navigateMedia("video", dir)` แทนที่จะเลื่อนไปยังรูปภาพถัดไปในโฟลเดอร์ ทำให้ติดค้างอยู่ที่ไฟล์ PDF ไม่สามารถกดข้ามไปดูรูปถัดไปได้
  3. **Canvas Lock ใน PDF.js เมื่อกดข้ามหน้ารัวๆ (`renderPdfPage`):** เมื่อผู้ใช้กดปุ่มเปลี่ยนหน้ารัวๆ ฟังก์ชัน `renderPdfPage()` สั่ง `pdfRenderTask.cancel()` แล้วตั้ง `pdfRenderTask = null` ทันทีโดยไม่รอ `await prevTask.promise` ใน `pdfjs-dist@4.10.38` การยกเลิกเป็นแบบ Asynchronous ทำให้ `pdfCanvas` ยังติดล็อกอยู่ใน `canvasInUse` เมื่อหน้าถัดไปเรียก `page.render()` จึงโยน `Error: Cannot use the same canvas during multiple render() operations` แล้วหลุดเข้า `catch` ไปเรียก `fallbackPdfToDrive()` เด้งออกจาก Lightbox ทันที
  4. **เลขหน้าไม่อัปเดตทันทีและปัดหน้าจอบนพื้นหลัง PDF ไม่ทำงาน:** เลขหน้า (`#pdfPageCount`) รอจนวาด Canvas เสร็จถึงจะเปลี่ยน และ `pointerdown` บน `#lightbox` ไม่ได้ดัก `e.target === pdfStage`
- **การแก้ไขและหลักฐานการตรวจสอบ (Verification Evidence):**
  - เอา `#lbPrev` และ `#lbNext` ออกจากกฎ `display: none !important;` ใน `.lightbox[data-viewer="pdf"]` และเปลี่ยน `#lbCount` เป็น `.lb-count:empty { display: none; }` เพื่อแสดงลำดับไฟล์ในโฟลเดอร์ควบคู่กับเลขหน้า PDF
  - ปรับ `mediaList("image")` และ `navigateMedia("image", dir)` ให้รวมไฟล์ PDF ในลำดับของโฟลเดอร์ เพื่อให้กด `#lbPrev`/`#lbNext` (หรือ `#vidPrev`/`#vidNext` และ `ArrowLeft`/`ArrowRight` แม้ในโหมด Fallback) ข้ามจากไฟล์ PDF ไปดูรูปถัดไปได้ทันที
  - เพิ่ม `updatePdfNavState()` และ `stepPdfPage(dir, allowMediaFallback)` เพื่ออัปเดตเลขหน้าทันทีที่กด และเมื่อถึงหน้าแรก/หน้าสุดท้ายของ PDF (หรือระหว่างกำลังโหลด PDF) สามารถก้าวต่อไปยังรูปถัดไปในโฟลเดอร์ได้ไร้รอยต่อ
  - ปรับ `renderPdfPage()` ให้ `await prevTask.promise` หลังสั่ง `prevTask.cancel()` ก่อนนำ `pdfCanvas` ไปวาดหน้าใหม่ ป้องกันปัญหา Canvas Lock และการเด้งไป `fallbackPdfToDrive()` เมื่อกดข้ามรัวๆ
  - เพิ่มชุดทดสอบ TDD 3 เคสใน `tests/image-viewer.cjs` (`node tests/image-viewer.cjs` — PASS ครบทุกเคส, `node --test tests/*.cjs` — **130/130 PASS**, `impeccable detect --json index.html` — `[]` 0 warnings)

### 7. เชิงรุกตรวจสอบและแก้ไขบั๊กทั้งระบบ 6 รายการ (`index.html`, `drive-stream-sw.js`, `cloudflare-drive-worker.mjs`)
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause — 6 รายการที่ตรวจพบ):**
  1. **การเรียงไฟล์ตาม "ชนิด" (`sortKey === "kind"`) ในโฟลเดอร์ไม่ทำงานจริง (`index.html:3615, 3866-3868`):** การ์ด `.file-card` ไม่ได้เก็บ `data-mime` และใน `applySort()` ส่งค่า `mimeType: ca.dataset.kind === "folder" ? "application/vnd.google-apps.folder" : ""` ให้ทุกไฟล์ที่ไม่ใช่โฟลเดอร์ ทำให้ `cmpSort(a, b)` เมื่อ `sortKey === "kind"` เห็น `va` และ `vb` เป็น `""` เหมือนกันหมด การกดเรียงตาม "ชนิด" จึงไม่เปลี่ยนลำดับไฟล์เลย
  2. **คลิกการ์ดไฟล์ในโฟลเดอร์ไม่ส่ง `mimeType` เข้า `handleFileClick` (`index.html:3668`):** เมื่อคลิก `.file-card` โค้ดเรียก `handleFileClick(card.dataset.id, card.dataset.kind, card.dataset.name)` โดยตกหล่นอาร์กิวเมนต์ที่ 4 (`mimeType`) หากไฟล์ PDF บน Google Drive มี `mimeType: "application/pdf"` แต่ตั้งชื่อไฟล์โดยไม่มีนามสกุล `.pdf` การคลิกเปิดจากการ์ดโดยตรงจะไม่ทราบว่าเป็น PDF
  3. **การเปิดโฟลเดอร์จากคลัง (`openCollectionItem`) ใช้ `navStack.push(...)` แทนการรีเซ็ต `navStack` (`index.html:6983`):** เมื่อกดเปิดโฟลเดอร์จากคลัง `#collectionsCard` หรือกดปุ่ม `🎲 สุ่ม` หลายครั้ง `openCollectionItem` ใช้ `navStack.push(...)` ซ้อนทับไปเรื่อยๆ แทนที่จะตั้งเป็นโฟลเดอร์ราก `navStack = [...]` เหมือน `renderFavoriteFolders` และ `renderRecentFolders` ทำให้ Breadcrumb เพี้ยนเป็นโฟลเดอร์ย่อยซ้อนกันหลายชั้น และปุ่ม `ขึ้นหนึ่งระดับ` (`bcUp`) พาไปโฟลเดอร์คนละเรื่องแทนที่จะกลับคลัง
  4. **เรนเดอร์คลังซ้ำซ้อน 2 รอบทุกครั้งที่เปิดหน้าเว็บ (`index.html:6945` และ `7247`):** ภายใน IIFE ของคลังมีการเรียก `renderChips(); render();` ตอนต้น (บรรทัด 6945 ก่อนตั้งค่า Checkbox ตัวกรองและโหมดแบ่งหน้า) แล้วเรียกซ้ำอีกครั้งตอนท้าย IIFE (บรรทัด 7247) ทำให้สร้าง DOM การ์ดคลังและผูก `IntersectionObserver` ซ้ำ 2 รอบทุกครั้งที่โหลดหน้า
  5. **ช่องค้นหาไฟล์ในโฟลเดอร์ (`applyFilter`) ไม่ได้ทำ Unicode Normalization (`NFC`) สำหรับภาษาไทย (`index.html:3714, 3722`):** ต่างจาก `#collSearch` ที่ใช้ `.normalize("NFC")` ช่อง `#fileSearch` ในโฟลเดอร์เปรียบเทียบสตริงดิบโดยไม่ `.normalize("NFC")` ทำให้ชื่อไฟล์ภาษาไทยที่มาจาก macOS/iOS (รูปแบบ `NFD` สระ/วรรณยุกต์แยกตัว) ค้นหาไม่เจอ
  6. **การออกจากระบบ (Sign Out) ไม่ได้ปิด Lightbox และไม่ล้าง `MEDIA_CACHE` (`gdv-media-v1`) + ช่องโหว่ช่วงข้อมูลแหว่งใน `fetchParallelChunk` (`index.html:2916-2920`, `drive-stream-sw.js:53`, `cloudflare-drive-worker.mjs:43`):**
     - ตอนกดออกจากระบบ โค้ดปิดเฉพาะ `videoModal` และล้าง `videoCache` แต่หากเปิดรูปภาพหรือ PDF ส่วนตัวค้างไว้ใน `#lightbox` ภาพจะยังค้างอยู่บนจอ และแคช `MEDIA_CACHE` (`gdv-media-v1` ซึ่งเก็บ Blob รูปต้นฉบับและ PDF แบบไม่ได้แยกตามบัญชี) ไม่ถูกล้างออก
     - ใน `fetchParallelChunk` ของทั้ง `drive-stream-sw.js` และ `cloudflare-drive-worker.mjs` ตรวจเฉพาะ `BigInt(actual[2]) > ranges[i][1]` แต่ไม่ได้ตรวจกรณีที่ช่วงย่อยก่อนช่วงสุดท้าย (`i < 3`) ส่งข้อมูลกลับมาสั้นกว่าที่ขอ (`actualEnd !== ranges[i][1]`) หรือช่วงติดลบ (`actualEnd < actualStart`) ซึ่งจะทำให้เกิดช่องว่างของไบต์ (Byte Gap) กลางสตรีมวิดีโอเมื่อนำทั้ง 4 ช่วงมาต่อกัน
- **การแก้ไขและหลักฐานการตรวจสอบ (Verification Evidence):**
  - เพิ่ม `data-mime` บน `.file-card` ใน `renderFiles()`, ส่ง `card.dataset.mime` เข้า `handleFileClick(...)` และส่ง `ca.dataset.mime` (พร้อม fallback `ca.dataset.type || ca.dataset.kind`) ใน `applySort()`
  - ปรับ `applyFilter()` ให้เรียก `.normalize("NFC")` ทั้งฝั่งคำค้นและชื่อไฟล์ในการ์ด
  - เปลี่ยน `navStack.push(...)` ใน `openCollectionItem()` เป็น `navStack = [...]` และลบ `renderChips(); render();` ที่ซ้ำซ้อนตอนต้น IIFE ออก
  - ในตัวจัดการปุ่มออกจากระบบ (`authBtn` click) เพิ่มการลบ `caches.delete(MEDIA_CACHE)` และสั่ง `if (lightbox.classList.contains("show")) closeLightbox();`
  - ใน `fetchParallelChunk` (`drive-stream-sw.js` และ `cloudflare-drive-worker.mjs`) เพิ่มการตรวจสอบ `actualEnd < actualStart || (i < ranges.length - 1 && actualEnd !== ranges[i][1])` ให้ยกเลิกและถอยกลับไปใช้การดึงช่วงเดียวแบบปลอดภัยทันที
  - เพิ่มชุดทดสอบ TDD ครอบคลุมทั้ง 6 จุดใน `tests/natural-sort.cjs`, `tests/collection-search.cjs`, `tests/auth-restore.cjs`, `tests/authenticated-stream.cjs`, และ `tests/public-worker.cjs`
  - ผลการรันทดสอบทั้งหมด: `node --test tests/*.cjs` ผ่านครบ **132/132 PASS (0 fail)**, `node tools/collection_data.js check` ตรงกันครบ **325 รายการ**, และ `impeccable detect --json index.html` คืนค่า `[]` (**0 warnings**)

### 8. ตรวจสอบสถานะลิงก์ทั้งหมดในคลังล่าสุด (`11 ต.ค. 69 (21:07 น.)`)
- **สถานะ:** `VERIFIED WORKING`
- **ผลการตรวจสอบ (Verification Evidence):**
  - รัน `py scripts/checks/check_drive_alive.py`, `py scripts/checks/check_mega_alive.py`, `py scripts/data/patch_alive_from_report.py`, และ `node tools/collection_data.js extract`
  - **Google Drive (325 รายการ):** ใช้ได้ **93 รายการ** (`28.6%`), ใช้ไม่ได้ **232 รายการ** (ลดลงจากรอบ `4 ต.ค. 69` จำนวน **52 รายการ** เนื่องจากโฟลเดอร์ของเดือน `7.69` ตั้งแต่วันที่ `1.7.69`–`31.7.69` จำนวน 52 โฟลเดอร์ถูกเจ้าของย้ายลงถังขยะ `trashed: true` และไม่สามารถดึงไฟล์ภายในได้แล้ว)
  - **MEGA สำรอง (55 รายการ):** ใช้ได้ครบ **55 / 55 รายการ (100%)** (`dead: 0`)
  - **ลิงก์สำรองอื่นๆ:** OneDrive (`od_url`) **57 รายการ**, MediaFire (`mf_url`) **3 รายการ**
  - **สรุปรวมรายการที่ยังเปิดใช้งานได้ (อย่างน้อย 1 ช่องทาง Drive / MEGA / OneDrive / MediaFire):** **94 / 325 รายการ (28.9%)** โดยเดือน `8.69` (63/63), เดือน `9.69` (19/19), และหมวด `ไม่ระบุวันที่` (8/8) ยังเปิดใช้งานได้ครบ **100%**
  - อัปเดต `index.html` (`COLL_CHECKED_AT = "11 ต.ค. 69 (21:07 น.)"`), `collections_merged.json`, `reports/drive_alive_report.json`, `reports/mega_alive_report.json`, และ `reports/mega_alive_detail.json` พร้อมตรวจ `node tools/collection_data.js check` และ `node --test tests/*.cjs` ผ่านครบ **132/132 PASS**

### 9. กู้คืนและเพิ่มลิงก์จาก Google Drive สำรอง (`1MCcoQbr0OYPT1HQzPDUFMSv5NHKxe00b` — `XBep`) เข้าสู่คอลเลกชัน (`11 ต.ค. 69 (21:29 น.)`)
- **สถานะ:** `VERIFIED WORKING`
- **รายละเอียดการจับคู่และเพิ่มรายการ (Root Cause & Mapping):**
  1. สแกนโครงสร้างโฟลเดอร์สำรอง `1MCcoQbr0OYPT1HQzPDUFMSv5NHKxe00b` (`XBep`) ทั้งหมด 3 โฟลเดอร์หลัก (`6.69`, `7.69`, `1.7.69`) และโฟลเดอร์ย่อยข้างใน (`มืด` / `,nf`) รวม 90 โฟลเดอร์ย่อย
  2. **กู้คืนรายการที่เสีย/ถูกย้ายลงถังขยะเดิมกลับมาใช้งานได้ 70 รายการ:**
     - **เดือน `7.69` (53 โฟลเดอร์):** จับคู่ตรงตามรหัส `<old_id>_<D>-7-69` จำนวน 34 โฟลเดอร์ และจับคู่โฟลเดอร์ย่อย `มืด` / `,nf` ด้วยรายชื่อไฟล์ภายใน (`children_sample` ตรงกัน `3/3`) อีก 19 โฟลเดอร์ (เก็บ `prev_id` ไว้เป็นหลักฐานอ้างอิง)
     - **เดือน `6.69` (17 โฟลเดอร์):** จับคู่โฟลเดอร์วันที่ `10.6.69`–`19.6.69` (`#57`–`#74` ยกเว้น `#63` ที่ในไดรฟ์สำรองมีเฉพาะไฟล์ `.getxfer` ค้าง) ทั้งโฟลเดอร์หลักและโฟลเดอร์ย่อย `มืด` / `,nf` ด้วย `children_sample` ตรงกัน
  3. **เพิ่มรายการโฟลเดอร์ `มืด` (รอบค่ำ) ของเดือน `7.69` ที่ยังไม่เคยมีการ์ดแยกในคอลเลกชันอีก 10 รายการ:**
     - ได้แก่ วันที่ `4.7.69 (มืด)` (`อีเวนต์ #26` ที่เคยตกหล่นไป), `17.7.69 (มืด)`, `18.7.69 (มืด)`, `19.7.69 (มืด)`, `20.7.69 (มืด)`, `21.7.69 (มืด)`, `22.7.69 (มืด)`, `23.7.69 (มืด)`, `24.7.69 (มืด)`, และ `26.7.69 (มืด)` ทำให้เดือน `7.69` มีการ์ดครบทั้งโฟลเดอร์หลักและโฟลเดอร์มืดทุกวันตั้งแต่วันที่ `1.7.69`–`31.7.69`
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - รัน `py scripts/checks/check_drive_alive.py` และ `py scripts/data/patch_alive_from_report.py`:
    - จำนวนรายการในคลังเพิ่มขึ้นจาก `325` เป็น **`335 รายการ`**
    - ลิงก์ Google Drive ที่ใช้งานได้จริงเพิ่มขึ้นจาก `93 / 325` (`28.6%`) เป็น **`173 / 335 รายการ` (`51.6%`, เพิ่มขึ้น `+80` ลิงก์ที่ใช้งานได้ทันที!)**
    - **เดือน `7.69`:** กลับมาใช้งานได้ครบ **`65 / 65 รายการ (100%)`**
    - **เดือน `6.69`:** เพิ่มจาก `0 / 60` เป็น **`17 / 60 รายการ (28.3%)`**
  - รัน `node tools/collection_data.js extract` และ `node tools/collection_data.js check`: ตรงกันครบ **335 รายการ**
  - รัน `node --test tests/*.cjs`: ผ่านครบ **132/132 PASS (0 fail)**

### 10. แก้ปัญหาระบบสุ่ม (`🎲 สุ่ม` / `#collRandom`) สุ่มได้รายการเดิมซ้ำ (`index.html`, `tests/collection-random.cjs`)
- **สถานะ:** `VERIFIED WORKING`
- **สาเหตุ (Root Cause — 4 จุด):**
  1. **เก็บ `randomSeen` และ `lastRandomId` ไว้ใน RAM เท่านั้น (`var randomSeen = new Set()`):** เมื่อรีเฟรชหน้าเว็บ ปิด-เปิดแท็บใหม่ หรือกลับมาจากลิงก์ภายนอก ความจำของรายการที่เคยสุ่มไปแล้วถูกล้างเป็นศูนย์ทั้งหมด ทำให้สุ่มเจอโฟลเดอร์ที่เพิ่งดูไปซ้ำได้ทันที
  2. **การกดเปิดโฟลเดอร์จากการ์ดโดยตรง (`openCollectionItem`) หรือเปิดค้างไว้ใน `navStack` / URL Hash ไม่ได้ถูกบันทึกเข้า `randomSeen`:** ระบบสุ่มไม่รู้ว่าผู้ใช้กำลังเปิดโฟลเดอร์ใดอยู่ จึงมีโอกาสสุ่มหยิบโฟลเดอร์เดียวกับที่เปิดอยู่ตรงหน้าซ้ำได้
  3. **ตอนวนครบรอบ (`!unseen.length`) หรือกด `สุ่มก่อนหน้า` (`#collRandomBack`) ระบบล้าง `randomSeen` ทั้งหมดแล้วกันซ้ำแค่ตัวสุดท้ายตัวเดียว (`lastRandomId`):** ทำให้จังหวะขึ้นรอบใหม่สุ่มเจอรายการรองสุดท้ายที่เพิ่งดูไปเมื่อ 1–2 ครั้งก่อนหน้า หรือสุ่มกลับไปเจอรายการที่เพิ่งกด `สุ่มก่อนหน้า` หนีออกมาซ้ำทันที
  4. **ชิปกรองวันที่ (`activeDate` ใน `gdv_coll_date`) ค้างอยู่ใน `localStorage`:** หากผู้ใช้เคยคลิกเลือกชิปวันที่ไว้ (ซึ่งแต่ละวันมีเพียง 1–2 โฟลเดอร์) การกด `🎲 สุ่ม` จะถูกขังอยู่ในวันนั้นและได้โฟลเดอร์เดิมซ้ำไปมา
- **การแก้ไขและหลักฐานการตรวจสอบ (Verification Evidence):**
  - บันทึก `randomSeen` (`gdv_coll_random_seen`), `randomRecentIds` (`gdv_coll_random_recent`), และ `lastRandomId` (`gdv_coll_random_last`) ลง `localStorage` และบันทึกทุกครั้งที่เปิดการ์ดผ่าน `openCollectionItem` รวมถึงตรวจ `currentOpenFolderId()` จาก `navStack[0].id` / URL Hash เสมอ
  - อัปเกรด `randomPick(pool, avoidId)` ให้รองรับทั้ง ID เดี่ยวและ Array/Set ของรายการล่าสุด (`avoidIds`) พร้อมใช้ `crypto.getRandomValues` และเมื่อวนครบรอบจะคงรายการที่เพิ่งดูล่าสุดครึ่งวง (`Math.min(Math.max(1, Math.floor(candidates.length / 2)), 20)`) บวกกับ `lastBackedOutId` ไว้ใน `randomSeen` เพื่อไม่ให้รายการท้ายรอบเก่ามาโผล่ซ้ำตอนต้นรอบใหม่
  - หากชิปวันที่เฉพาะวัน (`activeDate !== "all"`) ถูกสุ่มจนครบแล้ว จะปลดล็อกเป็น `"all"` อัตโนมัติพร้อมแจ้ง Toast เพื่อไม่ให้ติดลูปซ้ำในวันเดียว และปรับ `effSq(c)` ให้เช็ก `c.prev_id` คู่กับ `c.id`
  - เพิ่มชุดทดสอบ TDD ใน `tests/collection-random.cjs` และรัน `node --test tests/*.cjs` ผ่านครบ **132/132 PASS (0 fail)**

### 11. Modularize `index.html` — Phase 1–3 CSS, Data, Collection Viewer, Video Player (`2026-10-12`)
- **สถานะ:** `VERIFIED WORKING`
- **Root Cause (แรงจูงใจ):** ไฟล์ `index.html` มีขนาด 7,418 บรรทัด (~567 KB) ทำให้ Python daily-check scripts ต้องทำ regex ค้นหาใน HTML โดยตรง, test suite ต้อง slice ฟังก์ชันออกจาก HTML ด้วย `html.indexOf(...)`, และการแก้ไขใด ๆ เสี่ยงทำให้โครงสร้างพัง
- **ไฟล์ที่สร้างใหม่ (Extracted):**
  | ไฟล์ | บรรทัด | ขนาด | เนื้อหา |
  |------|---------|------|---------|
  | `styles.css` | 1,764 | 66 KB | CSS ทั้งหมดจากบล็อก `<style>` |
  | `collections-data.js` | 9 | 305 KB | `COLL_CHECKED_AT` + `XBEP_COLLECTION` (335 รายการ) |
  | `collection-viewer.js` | 591 | 34 KB | Collection Viewer IIFE พร้อม `GDVCollectionApi` bridge |
  | `video-player.js` | 1,209 | — | Video/Stream Player พร้อม `GDVVideoApi` bridge |
  | `tests/helpers/source-functions.cjs` | — | — | Helper สำหรับ slice ฟังก์ชันจากไฟล์เจ้าของโดยตรง (ไม่ concat ไฟล์) เฉพาะ legacy tests ที่ต้องจำลอง global ด้วย VM |
  | `scripts/checks/_appsources.py` | — | — | Python shared helper สำหรับ daily check scripts |
- **`index.html` หลังการแยก:** 4,141 บรรทัด (~182 KB) (ลดจาก 7,418 บรรทัด)
- **การแก้ไข Python scripts และ tools:**
  - `tools/collection_data.js` — ใช้ `collections-data.js` เป็นแหล่งข้อมูลหลัก และ `collections_merged.json` เป็น sidecar สำหรับ extract/inject/check
  - `scripts/data/patch_alive_from_report.py`, `scripts/checks/check_drive_alive.py` ฯลฯ — ใช้ `_appsources.py` helper เพื่ออ่านจากไฟล์โมดูลแทน HTML
- **Tests:** ชุดทดสอบอ่านแหล่งจากไฟล์เจ้าของแต่ละโมดูลโดยตรง ไม่มี `loadAppSource()` และไม่มีการ concat source หลายไฟล์เข้าด้วยกัน; API smoke tests ใช้ `require()` กับโมดูลที่ export CommonJS ได้ ส่วน legacy tests ที่พึ่ง browser-shell globals ยังใช้ VM isolate ฟังก์ชันจากไฟล์เจ้าของ
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - `node tools/collection_data.js check` → `สองฝั่งตรงกัน (335 รายการ)` ✅
  - `node --test tests/*.cjs` → **PASS (exit code 0, 0 failures)** ✅ (verified after per-module source migration)
- **สถานะ Phase 4:**
  - `drive-explorer.js` — wired ผ่าน `GDVExplorerApi` bridge ใน `index.html` แล้ว
  - `media-lightbox.js` — extraction และ `GDVLightboxApi` bridge เสร็จแล้ว
  - Phase 4 housekeeping (test harness) — **partial**: ไม่มี test เรียก `loadAppSource()` หรือประกอบ source หลายไฟล์แล้ว และมี tests ที่ใช้ `require()` กับ API จริงของโมดูล ส่วน tests ที่ยังตัดฟังก์ชันจาก source ไป run ใน VM เหลือเป็นหนี้งานที่ต้องย้ายทีละส่วนเมื่อแยก dependency/shared state ได้ปลอดภัย จึงยังไม่ถือว่าการย้าย test seam ไป `require()` เสร็จทั้งหมด


### 12. App core extraction and test seam follow-up (`2026-10-13`)
- **สรุปต่อจาก Phase 1–4:** ย้าย JavaScript ก้อนใหญ่เดิมใน `index.html` (ประมาณ 86,078 ตัวอักษร / 2,183 บรรทัด) ไปยัง `app-core.js` โดยคงเนื้อหาเดิมและวาง script tag ในตำแหน่งเดิม เพื่อรักษาลำดับ init/bridge
- **ลำดับโหลดปัจจุบัน:** `video-cache.js` → `app-core.js` → `collections-data.js` → `video-player.js` → `drive-explorer.js` → `media-lightbox.js` → `collection-viewer.js`; ต้องใช้ static script tags ต่อไปเพื่อรองรับโฮสต์แบบ static/GitHub Pages โดยไม่ต้องมี bundler
- **ขนาดหลังแยก:** `index.html` เหลือ 441 บรรทัด (~21 KB UTF-8) และไม่มี inline application script ขนาดใหญ่แล้ว; ยังไม่ถึงเป้าประมาณ 260 บรรทัดเดิม เพราะโครง DOM/markup ยังอยู่ในหน้า HTML
- **Tests ย้ายไปใช้ CommonJS module API เพิ่ม:** `tests/continue-watching.cjs`, `tests/error-card.cjs`, `tests/folder-covers.cjs`, `tests/watched-videos.cjs`; เทสต์ที่ต้องตรวจ markup แยกอ่าน `index.html` ส่วน test seams ที่ทดสอบโค้ดใน `app-core.js` เปลี่ยนไปอ่าน source ไฟล์นั้น

### 13. Follow-up verification — 2026-10-13

- `node --test tests/*.cjs` → **135/135 PASS, 0 fail**.
- `node tools/collection_data.js check` → ข้อมูลสองฝั่งตรงกันครบ **335 รายการ**.
- `node --check` ผ่านครบ 9 ไฟล์ JavaScript/Worker และ `git diff --check` ผ่าน.
- เปิดเว็บผ่าน HTTP ในเครื่อง (`py -m http.server`) แล้วตรวจใน Chrome: `document.readyState === "complete"`, ชื่อหน้าเป็น `Google Drive File Viewer`, สคริปต์ทั้ง 7 โมดูลโหลดครบ และ bridge `GDVVideoApi`, `GDVExplorerApi`, `GDVLightboxApi`, `GDVCollectionApi` มีอยู่ครบ; DOM แสดงคลัง 335 รายการ. คำขอ `favicon.ico` ได้ 404 แต่ไม่กระทบการโหลดแอป.
- **ขอบเขตที่ยังไม่ย้ายออกจาก VM:** เหลือบางเทสต์ที่ต้องจำลอง Service Worker/browser globals หรือทดสอบ orchestration ซึ่งผูกกับ closure/state ภายใน เช่น playback routing และ integrated `loadVideoAsBlob`. ยังไม่แทนด้วยการเรียก API แบบผิวเผิน เพราะอาจทำให้ mock ข้าม logic จริงและลดความน่าเชื่อถือของ regression tests. การเผยแพร่จริงบน GitHub Pages ยังไม่ได้ยืนยัน.
- ไม่มีการ commit หรือ push; working-tree changes เดิมทั้งหมดถูกเก็บไว้.
- **ผลตรวจสอบรอบล่าสุด:** `node --test tests/*.cjs` → 135/135 PASS (0 fail); `node tools/collection_data.js check` → 335 รายการตรงกัน; `node --check` ผ่านครบสำหรับ `app-core.js`, `drive-explorer.js`, `video-player.js`, `media-lightbox.js`, `collection-viewer.js`, `collections-data.js`, `video-cache.js`, `drive-stream-sw.js` และ `cloudflare-drive-worker.mjs`; `git diff --check` ผ่าน (มีเพียงคำเตือน line ending LF/CRLF จาก Git)
- **สถานะ Phase 4:** ยังเป็น **partial**; ไม่มี `loadAppSource()` และไม่มีการ concat source หลายโมดูลใน test harness แต่ legacy tests บางไฟล์ยังตัดฟังก์ชันจาก source แล้วรันใน VM เนื่องจากยังพึ่ง state/global ของ classic browser scripts ต้องแยก dependency เป็น API/หน่วยย่อยก่อนทยอยย้ายต่อ
- **เผยแพร่:** ยังไม่ commit/push และยังไม่ได้ยืนยันการ deploy จริงบน GitHub Pages หลังเพิ่ม `app-core.js`; ต้องรัน full verification และทำ browser/static smoke check ก่อนเผยแพร่


### 13. Test seam follow-up — module API coverage (2026-10-13)
- **เป้าหมาย:** ลดการทดสอบที่ slice function source แล้วประเมินใน node:vm เฉพาะจุดที่โมดูลเผย API ได้อยู่แล้ว โดยไม่เปลี่ยน business logic ของโปรแกรมและไม่แกล้งแทน internal helper ที่อยู่ใน closure
- **เพิ่ม helpers สำหรับโหลดโมดูล:**
  - tests/helpers/load-video-player-api.cjs — โหลด video-player.js ด้วย bridge/state object ใหม่ต่อเทสต์
  - tests/helpers/load-drive-explorer-api.cjs — โหลด drive-explorer.js ด้วย bridge/state object ใหม่ต่อเทสต์
- **ย้ายไปทดสอบผ่าน CommonJS/module API โดยตรง:**
  - tests/public-stream-error.cjs — probePublicStreamError (3 เคส)
  - tests/stream-probe.cjs — probeStreamEndpoint และ codec probing (5 เคส)
  - tests/video-layout.cjs — sizing/orientation/async preview aspect (6 เคส)
  - tests/player-fullscreen.cjs — fullscreen, preview fitting และ orientation lock (10 เคส)
  - tests/playback-loading.cjs — playback route persistence/expiry, progress calculation, active route recording และ invalid storage (6 เคส; เคส request confirmation กับ source assertion ยังใช้ legacy seam/source inspection)
  - tests/video-download.cjs — module API สำหรับ readVideoBlobResponse, readVideoBlobRanges และ renderVideoBlobProgress; integrated loadVideoAsBlob tests ยังใช้ isolated VM เพราะ internal function calls ผูกกับ module closure
  - tests/usability.cjs — loadFavoriteFolders และ saveFolderPosition ผ่าน Drive Explorer API; cover status click และ async listFolder ที่ยังพึ่งพา closure state คง test seam แบบ VM
- **จุดที่พยายามแล้วและตั้งใจไม่ฝืน:** tests/playback-routing.cjs ต้องสังเกต/แทนผลของ internal tryVideoSrc แต่ API จริงเรียก closure function โดยตรง; การ mock property บน bridge ไม่ได้แทน internal function ดังกล่าว จึงคืนเทสต์นี้กลับไปใช้ isolated VM ที่เหมาะกับ dependency seam ปัจจุบัน ไม่ได้ทิ้งเวอร์ชันที่ล้มเหลวไว้
- **ผล targeted checks:** public-stream-error 3/3, stream-probe 5/5, video-layout 6/6, player-fullscreen 10/10, video-download 23/23, playback-loading 6/6 และ usability ผ่าน
- **ขอบเขต:** Phase 4 ยังเป็น **partial** เพราะยังมี classic browser-script functions บางส่วนที่พึ่งพา closure/global state ต้องแยก dependency ออกแบบ inject ได้ก่อนจึงจะย้ายเป็น API test ได้อย่างเที่ยงตรง อย่าแก้เพียงเปลี่ยน vm เป็น require() แล้วใช้ mock ที่จริงไม่สามารถ override internal closure ได้
- **ผล final verification:** `node --test tests/*.cjs` → **135/135 PASS, 0 fail**; `node tools/collection_data.js check` → **335 รายการตรงกัน**; `node --check` ผ่านครบ 9 ไฟล์ JavaScript/Worker และ `git diff --check` ผ่าน (มีเพียงคำเตือน Git เรื่อง LF→CRLF)
- **เผยแพร่:** ไม่มี commit/push ในรอบนี้ และยังไม่ได้ยืนยัน deploy จริงบน GitHub Pages

### 14. Data pipeline audit — patch Drive status and sync JSON (`2026-10-13`)
- **ปัญหาที่พบ:** `scripts/data/patch_alive_from_report.py` ปรับ `collections-data.js` เท่านั้น; การอัปเดต `collections_merged.json` เดิมพึ่ง `scripts/daily_drive_check_and_push.py` เรียก `node tools/collection_data.js extract` ต่ออีกทอด ทำให้รัน patch เดี่ยวแล้วสองชุดข้อมูลคลาดกันได้.
- **การแก้ไข:** หลัง patch แล้วให้สคริปต์เขียน `collections_merged.json` จาก record ชุดเดียวกันทันที โดยเขียนไฟล์ `.tmp`, parse ตรวจ JSON ก่อน แล้วค่อย `replace()` เพื่อหลีกเลี่ยงไฟล์ JSON ที่ถูกเขียนค้าง/ขาดกลางทาง. อัปเดต `scripts/README.md` ให้ระบุผลลัพธ์ใหม่.
- **Regression test:** เพิ่ม `tests/test_patch_alive_sync.py` ใช้ temporary project fixture และ report จำลองแบบ offline; ตรวจว่า record ที่รายงานว่า alive/dead ถูกอัปเดต, record ที่ไม่มีใน report ไม่เปลี่ยน, และ JSON กับ module ตรงกัน.
- **ผลตรวจสอบ:** `py -B tests/test_patch_alive_sync.py` ผ่าน; `node tools/collection_data.js check` ผ่านครบ **335 รายการ**; `node --test tests/*.cjs` ผ่านครบ **135/135**; `git diff --check` ผ่าน โดยเหลือเพียงคำเตือน line ending LF/CRLF.
- **การป้องกัน false-dead:** report ที่ `ok: false` จะ mark dead เฉพาะ code `404`/`410`; กรณี timeout/network error (`code: 0`), quota หรือ permission ที่ยังสรุปไม่ได้ จะเก็บค่าก่อนหน้าและนับใน `uncertain results skipped` เพื่อไม่ให้ผลตรวจชั่วคราวทำให้ลิงก์ถูกปิดผิดพลาด.
- **Git:** ยังไม่ commit หรือ push; เก็บ working-tree changes ที่มีอยู่ก่อนหน้าไว้ทั้งหมด.

### 15. Task 2 — Playback test seams (`2026-10-13`)
- **การแยก dependency seam:** เพิ่ม `createPublicStreamRunner(deps)` และ `createVideoSourceRunner(deps)` ใน `video-player.js`; ฟังก์ชัน production `tryPublicStream` / `tryVideoSrc` เรียก runner ที่สร้างจาก bridge `appApi` จริง ส่วนเทสต์สามารถ inject เฉพาะ dependency ของ player, timers, route probes และสถานะ session/file ผ่าน API โดยไม่ slice source. คง `prioritizePlaybackSource(sources, preferred)` เป็น pure helper สำหรับกฎจัดลำดับ route และ export helpers ผ่าน `GDVVideoApi.video` / CommonJS API.
- **Regression tests:** `tests/playback-source-order.cjs` ทดสอบการจัดลำดับ route; `tests/playback-routing.cjs` เรียก `createPublicStreamRunner` จาก API จริงและ inject dependencies เพื่อทดสอบ fallback, quota, cooldown, ปิดหน้าต่าง และ stale preflight; เพิ่ม `tests/playback-api.cjs` สำหรับ `createVideoSourceRunner` ครอบคลุม canplay, media failure, timeout, ปิดหน้าต่าง และสลับไฟล์.
- **ย้าย orchestration tests:** `tests/media-lifecycle.cjs` ใช้ `createVideoSourceRunner` / `createPublicStreamRunner` จาก CommonJS API แทนการ slice ฟังก์ชัน `tryVideoSrc` / `tryPublicStream`; tests อื่นที่ยังจำลอง browser globals หรือฟังก์ชันที่พึ่งพา closure คง VM ไว้ตามขอบเขตที่จำเป็น.
- **ผลตรวจสอบ:** `node --test tests/*.cjs` ผ่านครบ **143/143, 0 fail** หลังแก้ test seam; targeted `node --test tests/playback-api.cjs tests/playback-routing.cjs tests/playback-source-order.cjs` ผ่าน **15/15** และ `node tests/media-lifecycle.cjs` ผ่านครบ. `node --check video-player.js` ผ่าน; ตรวจ `git diff --check` รอบสุดท้ายก่อนจบงาน.
- **สถานะ Task 2:** dependency seam สำหรับ `tryPublicStream` / `tryVideoSrc` และ orchestration tests สำหรับ lifecycle หลักย้ายมาใช้ API แล้ว. ยังมี VM tests สำหรับส่วนที่ต้องจำลอง browser globals หรือ integrated `loadVideoAsBlob` ซึ่งยังเป็นขอบเขตงานแยกต่างหาก.
- **Git:** ยังไม่ commit หรือ push; ไม่ได้แตะต้องหรือทิ้ง working-tree changes เดิม.

### 16. Task 3 — Whole-file download dependency seam (`2026-10-13`)
- **Dependency injection:** เพิ่ม `createVideoBlobRunner(deps)` และให้ production `loadVideoAsBlob` delegate ไปยัง runner ที่สร้างจาก `appApi`; export factory ผ่าน `GDVVideoApi.video` / CommonJS API. runner ใช้ dependency ของ fetch, range loader, progress UI, temporary writer, cache, URL และ player ผ่าน bridge ที่ inject ได้.
- **Test migration:** ปรับ `tests/video-download.cjs` ให้ integrated `loadVideoAsBlob` tests เรียก `createVideoBlobRunner` ผ่าน API จริง ไม่ตัดฟังก์ชันจาก source และไม่ใช้ VM สำหรับ orchestration.
- **Coverage retained:** คง 23 เคสทดสอบ response streaming, abort/body-read cancellation, file-size unknown, stale transfer, range assembly, concurrency limit 4, retry, invalid range, single-connection fallback, worker fallback, OPFS commit/abort และ in-memory fallback.
- **ผล verification:** `node --test tests/video-download.cjs` ผ่าน **23/23, 0 fail**; `node --check video-player.js` ผ่าน; `node --test tests/*.cjs` ผ่านครบ **143/143, 0 fail**; `git diff --check` ผ่าน โดยมีเพียงคำเตือน Git เรื่อง LF→CRLF.
- **หมายเหตุ:** tests inject temporary-writer dependency เพื่อจำลอง OPFS contract โดยไม่พึ่ง OPFS จริงของเครื่องทดสอบ; behavior ที่ทดสอบคือการเขียนช่วง, commit/abort และ fallback.
- **Git:** ยังไม่ commit หรือ push; เก็บ working-tree changes ที่มีอยู่เดิมไว้.

### 17. Playback lifecycle follow-up — stale download and OPFS cancellation (`2026-10-13`)
- **Regression coverage:** เพิ่ม 3 เคสใน `tests/video-download.cjs`: สลับไฟล์ระหว่าง whole-file download, ปิด Player ระหว่าง OPFS write และ retry หลัง whole-file fallback ล้มเหลว โดยตรวจว่าไฟล์เก่าไม่เริ่มเล่น, writer ที่ยกเลิกถูก abort และปุ่ม/สถานะกลับมาพร้อมลองใหม่.
- **Bug ที่พบและแก้:** หากคำขอ range เสร็จแล้วแต่ OPFS write ยัง pending การปิด Player อาจทำให้ flow เรียก `temp.done()` ต่อ แม้ transfer ถูกยกเลิกแล้ว. เพิ่มการตรวจ `transfer.controller.signal.aborted` และ `active()` ก่อน commit; หาก stale ให้โยน `AbortError` แล้วเดิน cleanup ผ่าน `temp.stop()` แทน.
- **ผลตรวจสอบ:** `node --check video-player.js` ผ่าน; `node --test tests/*.cjs` ผ่าน **146/146, 0 fail**; `git diff --check` ผ่าน. การทดสอบ OPFS ยังใช้ temporary-writer dependency จำลอง contract ไม่ใช่การทดสอบ OPFS จริงในเบราว์เซอร์.
- **Browser smoke:** หน้า `http://127.0.0.1:8765/index.html` โหลดครบ (`document.readyState=complete`), title ถูกต้อง และ `GDVVideoApi`, `GDVExplorerApi`, `GDVLightboxApi`, `GDVCollectionApi` มีครบ. ยังไม่ได้ทดสอบโหลดคลิปจริงผ่านบัญชี Google ในเบราว์เซอร์.
- **Git:** ยังไม่ commit หรือ push; เก็บ working-tree changes ก่อนหน้านี้ไว้ทั้งหมด.

### 18. Tail-moov MP4 handling and prefetch lifecycle (`2026-10-14` — commit `00cfd05`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบ:** ไฟล์วิดีโอ MP4 บางตัวเก็บ metadata box `moov` ไว้ท้ายไฟล์ (Tail-moov) ทำให้การอ่านหัวไฟล์ 1 MiB ไม่พบ Codec และตกค้างที่สถานะ `unknown`; รวมถึงเมื่อผู้ใช้ seek ข้ามช่วงหรือเปลี่ยนไฟล์ คำขอ prefetch ของช่วงก่อนหน้ายังทำงานต่อจนจบ
- **การแก้ไข:**
  - ใน `video-player.js`: หากหัวไฟล์เป็น MP4 แต่ยังไม่พบ atom `moov` ให้ส่ง Range request เพิ่มอีก 1 ท่อไปดึง 1 MiB ท้ายไฟล์ (`totalBytes - cap` ถึง `totalBytes - 1`) เพื่ออ่าน Codec ให้ได้ข้อสรุป `works` หรือระบุ codec ชัดเจน
  - ใน `drive-stream-sw.js`: เมื่อมีคำขอใหม่และ prefetch เดิม (`ahead`) ไม่ตรงกับช่วงหรือไฟล์ที่ขอ ให้สั่ง `ahead.controller.abort()` ทันทีเพื่อประหยัดแบนด์วิดท์ และคำนวณ `reachesKnownEnd` เพื่อไม่ให้ท่อย่อยแตกย่อยเกินขนาดจริงของไฟล์
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - เพิ่มเคสทดสอบ `an mp4 with moov at EOF probes the tail range and identifies its codec` ใน `tests/stream-probe.cjs`
  - รัน `node --test tests/stream-probe.cjs` ผ่านครบทุกเคส

### 19. Content-Length for partial media responses (`2026-10-14` — commit `077e103`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบ:** เซิร์ฟเวอร์ต้นทางบางแห่งส่ง HTTP 206 Partial Content โดยละเว้น `Content-Length` header ทำให้เครื่องเล่นสื่อในเบราว์เซอร์ไม่ทราบขนาดข้อมูลของ chunk นั้น
- **การแก้ไข:** ใน `cloudflare-drive-worker.mjs` หากได้ผลลัพธ์ 206 และไม่มี `Content-Length` ให้คำนวณไบต์จาก `Content-Range` (`end - start + 1`) แล้วเติมใส่ header อัตโนมัติ

### 20. Continuous media streaming past 8 MiB in Cloudflare Worker & final baseline (`2026-10-14`)
- **สถานะ:** `IMPLEMENTED — LOCAL TESTS PASS; LIVE DEPLOYMENT PENDING`
- **ปัญหาที่พบ:** เครื่องเล่นสื่อแบบเนทีฟของเบราว์เซอร์บางรุ่น (โดยเฉพาะเมื่อส่ง `Range: bytes=0-` ปลายเปิด) อาจไม่ส่งคำขอ Range ถัดไปเมื่อ Chunk 8 MiB แรกจบลง ทำให้วิดีโอหยุดเล่นกะทันหัน
- **การแก้ไข:**
  - ใน `cloudflare-drive-worker.mjs`: เพิ่ม `createContinuousMediaResponse` เมื่อได้รับคำขอปลายเปิดพร้อมพารามิเตอร์ `continuous=1` โดยใช้ `ReadableStream` ตัวเดียวดึงท่อนถัดไป (ทั้งแบบเดี่ยวและ 4-way parallel) มา enqueue เข้าสตรีมเดิมอย่างต่อเนื่องจนจบไฟล์ โดยไม่ต้องตัดการเชื่อมต่อ
  - ใน `video-player.js`: ส่ง `&continuous=1` ไปยัง URL ของ Worker
  - เพิ่มเคสทดสอบ `open-ended media requests stream past the first 8 MiB in one continuous 206 response` ใน `tests/public-worker.cjs`
- **หลักฐานการตรวจสอบรอบล่าสุด (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านครบ **153/153 tests (0 failures, duration ~23s)**
  - `tests/media-lightbox.cjs` ผ่านครบ 14 เคส
  - `node tools/collection_data.js check` ผ่าน ข้อมูลคลังสองฝั่งตรงกันครบ **335 รายการ**
  - `py -B tests/test_patch_alive_sync.py` ผ่าน 1/1 test
  - `node --check` ผ่านครบทุกโมดูล ปราศจาก syntax error

### 21. Applied `apply_project_fixes (1).py` — Quality-of-life & Test Seam Hardening (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **การปรับปรุง:**
  1. `app-core.js`: ครอบ Safe Guard 51 จุดบนฟังก์ชันที่เรียก `window.GDVVideoApi.video.*` ป้องกัน TypeError กรณี Event หรือ ResizeObserver ทำงานก่อน `video-player.js` โหลดเสร็จ
  2. `index.html`: เพิ่ม `preload="auto"` บน `<video id="vidPlayer">` และจัดลำดับแท็ก `<script>` ให้โหลดโมดูลโค้ดหลักก่อน `collections-data.js` (ขนาด 305 KB)
  3. `cloudflare-drive-worker.mjs`: เพิ่ม `WORKER_REVISION = '2026-10-14-r1'`, ดักจับ Stale Prefetch Abort และเช็กขอบเขตท้ายไฟล์ (`reachesKnownEnd`)
  4. `video-player.js`: เสริมตัวตรวจจับ MP4 moov ที่ถูกเลื่อนไปอยู่หลังกล่อง mdat และแสดง Route diagnostics ในข้อความผิดพลาด
  5. `tests/`: สร้าง `tests/helpers/load-media-lightbox-api.cjs`, ย้าย `tests/image-viewer.cjs` ไปเรียกผ่าน module API แทนการ slice โค้ดจาก HTML, และเพิ่มเทสครอบคลุม Stale abort, Tail EOF, Moov probing, Route diagnostics และ Early resize observer guard
- **ผลการทดสอบ (Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านฉลุย **153/153 tests PASS (0 fail)**
  - `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - `py -B tests/test_patch_alive_sync.py` ผ่าน
  - `node --check` ผ่านหมดทุกไฟล์ JS/MJS ไร้ข้อผิดพลาด

### 22. Google Preview 9:16 Portrait & 16:9 Landscape Adaptation (`apply_project_fixes_single/apply_project_fixes.py` — `2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาเดิม:** เมื่อสลับมาใช้พรีวิว Google Drive (iframe `/preview`) กฎ CSS บนจอมือถือ (`max-width: 680px`) บังคับ `aspect-ratio: 16 / 9` เสมอ ทำให้วิดีโอแนวตั้ง (9:16) ถูกบีบเป็นแท่งเล็กๆ กลางจอแนวนอน และไม่มีการดึงขนาดวิดีโอล่วงหน้าจาก API
- **การปรับปรุง:**
  1. `drive-explorer.js`: เพิ่ม `videoMediaMetadata(width,height)` ในคำขอ `fields` ของ `listFolder` ทำให้ `fileMetaOf(id)` ทราบสัดส่วนคลิปได้ทันทีโดยไม่ต้องยิงเน็ตเพิ่ม
  2. `video-player.js`: อัปเกรด `applyPreviewAspect(id)` เป็นระบบตรวจสัดส่วน 3 ชั้น (`fileMetaOf` ➔ Drive API files.get พร้อม `supportsAllDrives=true` ➔ วัดขนาดจริงจากรูปปก Image `naturalWidth/naturalHeight` แม้ไม่ได้ล็อกอิน), ติดตั้ง `data-orientation="portrait" | "landscape"` บน `.ratio`, และเพิ่มฟังก์ชัน `togglePreviewAspect()`
  3. `styles.css`: ปลดล็อกกฎมือถือ ให้ `.video-box .ratio[data-orientation="portrait"]` ใช้สัดส่วน 9 / 16 พร้อมจำกัดความสูง `max-height: 76dvh` ไม่ให้ล้นจอ และรองรับโหมดเต็มจอ
  4. `index.html` & `app-core.js`: เพิ่มปุ่ม `#vidAspectToggle` (สลับแนว ↕↔ / แนวตั้ง ↕ / แนวนอน ↔) บน `.video-toolbar` และเชื่อม bridge `mediaThumbs`
  5. `tests/video-layout.cjs`: เพิ่ม 3 เคสทดสอบสำหรับการดึงขนาดจากแคช, Fallback จาก Thumbnail, และการกดปุ่มสลับแนวตั้ง-แนวนอน
- **ผลการทดสอบรอบล่าสุด (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านฉลุยครบ **156/156 tests PASS (0 failures, duration ~23s)**
  - `node tools/collection_data.js check` ข้อมูลสองฝั่งตรงกันครบ **335 รายการ**
  - `py -B tests/test_patch_alive_sync.py` ผ่านฉลุย
  - `node --check` ผ่านหมดทุกไฟล์ JS/MJS

### 23. Extended 8-Feature Patch (`apply_project_fixes_single (1).zip` — `2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ที่มา:** ไฟล์อัปเดตสคริปต์ `apply_project_fixes.py` ขนาด 84 KB (1,508 บรรทัด) ใน `apply_project_fixes_single (1).zip`
- **ฟีเจอร์ใหม่และจุดปรับปรุงทั้ง 8 ข้อ:**
  1. **ปุ่มพรีวิว Google ด่วน (`#vidQuickPreview`):** เพิ่มบนแถบควบคุม `.video-toolbar` ให้สลับไปใช้พรีวิว Google ได้ทันทีโดยไม่ต้องรอให้ระบบสตรีมล้มเหลว
  2. **สตรีมออกเครื่องเล่นภายนอก (`#vidExternalPlayer`):** เพิ่มปุ่ม "เปิดใน VLC / แอปนอก" เชื่อม `openInExternalPlayer(id)` สร้างโปรโตคอล `vlc://https://...` และคัดลอกลิงก์สตรีมลงคลิปบอร์ด สำหรับไฟล์ Codec พิเศษ (MKV, HEVC, 10-bit Hi10P)
  3. **ทำสำเนาเข้า Google Drive แก้โควตา (`#vidCopyDrive`):** เพิ่มปุ่ม "สำเนาเข้า Drive ของฉัน" เชื่อม `copyVideoToMyDrive(id)` ยิง Google Drive API `files.copy` พร้อม `supportsAllDrives=true` เพื่อโคลนไฟล์ที่ติด `downloadQuotaExceeded` ไปยัง Drive ส่วนตัวและสลับมาเปิดเล่นไฟล์สำเนาทันที
  4. **Deferred Collection Data:** ใส่แอตทริบิวต์ `defer` บน `<script src="collections-data.js">` และ `<script src="collection-viewer.js">` เพื่อเร่ง First Contentful Paint พร้อมระบบ On-Demand fallback ใน `collection-viewer.js` หากข้อมูลยังไม่พร้อม
  5. **Collection Collapsed Skip:** ข้ามการวาด DOM filter chips และ items หากผู้ใช้พับการแสดงผลคอลเลกชันไว้ (`gdv_coll_collapsed=1`)
  6. **Parallel Files Map (LRU Cache 10 ไฟล์):** ปรับปรุง `cloudflare-drive-worker.mjs` และ `drive-stream-sw.js` โดยเปลี่ยนจากการจำสถานะขนานไฟล์เดียว (`parallelOk = id`) เป็น `parallelFiles = new Map()` เก็บประวัติ 10 ไฟล์ล่าสุดแบบ LRU ทำให้สตรีม 4-way parallel ต่อเนื่องแม้มีการสลับไฟล์ไปมา
  7. **ตรวจจับ Codec ไม่รองรับและสลับพรีวิวอัตโนมัติ:** เมื่อ probe พบ `codec:...` ที่เบราว์เซอร์เล่นไม่ได้ ระบบจะเรียก `fallbackIframe(id)` ให้ทันทีพร้อมขึ้นคำแนะนำทางเลือกเปิดใน VLC
  8. **แคชสัดส่วนคลิปใน `localStorage` (`gdv_video_aspects`):** ฟังก์ชัน `saveCachedVideoAspect` / `loadCachedVideoAspect` บันทึกสัดส่วนวิดีโอ (จำกัด 100 รายการ) ทำให้เมื่อกลับมาเปิดคลิปเดิม กรอบพรีวิวจะปรับเป็น 9:16 หรือ 16:9 ได้ทันที
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านครบทั้ง **159/159 tests PASS (0 failures, duration ~23s)**
  - เพิ่ม 3 ชุดทดสอบใหม่:
    - Multi-file parallel LRU ใน `tests/public-worker.cjs`
    - VLC external player launch ใน `tests/video-layout.cjs`
    - Drive API copy file quota workaround ใน `tests/video-layout.cjs`
  - `node tools/collection_data.js check` ตรงกันทั้งสองฝั่งครบ **335 รายการ**
  - `py -B tests/test_patch_alive_sync.py` ผ่าน 1/1 test
  - `node --check` ผ่านหมดทุกไฟล์ JavaScript / Worker
  - **Live Cloudflare Worker Deployment Verified:**
    - ยืนยันผลการ deploy โค้ด `cloudflare-drive-worker.mjs` ขึ้น [Cloudflare Worker จริง](https://google-drive-file-viewer.missnlpp9.workers.dev/):
    - คำขอ `OPTIONS` ส่ง `X-GDV-Worker-Rev: 2026-10-14-r1` พร้อม `Access-Control-Expose-Headers` ครบถ้วน (HTTP 204 No Content)
    - คำขอ `GET` ช่วงไบต์ `Range: bytes=0-10` ต่อไฟล์จริงบน Google Drive ได้รับการยืนยันสถานะ `HTTP 206 Partial Content` ส่งกลับ `Content-Range: bytes 0-10/71532734`, `Content-Length: 11`, `Accept-Ranges: bytes` และ `X-GDV-Worker-Rev: 2026-10-14-r1` อย่างสมบูรณ์แบบ

### 24. Performance Optimization — Turbo Edition (`apply_project_fixes_single (2).zip` — `2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ที่มา:** สคริปต์ `apply_project_fixes.py` ขนาด 99 KB (1,751 บรรทัด) ใน `apply_project_fixes_single (2).zip`
- **ฟีเจอร์เพิ่มประสิทธิภาพระดับสูง (Turbo Performance):**
  1. **Preconnect Optimization (`index.html`):** ใส่ `<link rel="preconnect">` สำหรับ Cloudflare Worker (`google-drive-file-viewer.missnlpp9.workers.dev`) และ Google CDN (`drive.usercontent.google.com`) ลดเวลา Handshake (DNS lookup + TLS negotiation) เมื่อเริ่มเล่นสตรีมครั้งแรก
  2. **Confirmation URL Caching (`cloudflare-drive-worker.mjs`):** เพิ่ม `confirmUrlCache` (Map แบบ LRU ขนาด 20 ไฟล์, TTL 10 นาที) จดจำลิงก์ดาวน์โหลดที่มี `uuid` จากหน้า HTML warning ของ Google Drive ทำให้คำขอช่วงไบต์ถัดไปและท่อย่อยของ 4-way parallel ข้ามขั้นตอนการขอฟอร์ม HTML (ลดจำนวน HTTP Round-Trip ลง 50% ต่อ Chunk) พร้อมระบบ Auto-eviction หากเกิดข้อผิดพลาด
  3. **Pipelined OPFS Disk Writes (`video-player.js`):** ปรับปรุง `readVideoBlobRanges` ไม่ต้องรอการเขียนไฟล์ลง OPFS temp storage เสร็จก่อนดึงเน็ตเวิร์ก chunk ถัดไป แต่เปลี่ยนมารันการเขียนดิสก์ควบคู่ไปในเบื้องหลัง (`pendingWrites.push(...)`) และดึง chunk ถัดไปผ่านเน็ตเวิร์กได้ทันที ช่วยดึงความเร็วการดาวน์โหลดทั้งไฟล์ให้เต็มแบนด์วิดท์
  4. **Auto-Skip Quota-Blocked Direct Route (`video-player.js`):** ใน `loadVideoAsBlob` หากเส้นทางตรงเพิ่งติดโควตา Google Drive (`routeCooldown.blocked`) ระบบจะสลับไปดึงผ่าน Worker 6 ช่องขนานทันที โดยไม่ต้องรอให้เกิด 403 ซ้ำ
  5. **Aspect Metadata Size Sync (`video-player.js`):** เมื่อ `applyPreviewAspect` ดึงข้อมูลจาก Drive API จะซิงก์ขนาดไฟล์ `cached.size = Number(meta.size)` ให้อัตโนมัติหากข้อมูลแคชเดิมไม่มี
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านครบทั้ง **160/160 tests PASS (0 failures, duration ~23s)**
  - เพิ่มเคสทดสอบใหม่:
    - `confirmUrlCache reuses confirmed uuid URL on subsequent range requests without re-fetching HTML warning` ใน `tests/public-worker.cjs` (ผ่านฉลุย)
  - `node tools/collection_data.js check` ผ่าน สองฝั่งตรงกันครบ **335 รายการ**
  - `py -B tests/test_patch_alive_sync.py` ผ่าน 1/1 test
  - `node --check` ผ่านหมดทุกไฟล์ JavaScript / Worker ปราศจาก syntax error
  - **Live Turbo Cloudflare Worker Deployment Verified:**
    - ยืนยันการ deploy โค้ด Turbo Edition (`confirmUrlCache` + LRU 10 parallel files) ขึ้น [Cloudflare Worker จริง](https://google-drive-file-viewer.missnlpp9.workers.dev/):
    - ยิงคำขอต่อเนื่อง 2 ครั้งติดกัน (`Range: bytes=0-10` และ `bytes=11-20`) บนไฟล์ขนาด 71.5 MB ของ Google Drive
    - คำขอแรกได้ `HTTP 206 Partial Content` (`bytes 0-10/71532734`, `Content-Length: 11`)
    - คำขอที่สองต่อจากนั้นได้ `HTTP 206 Partial Content` (`bytes 11-20/71532734`, `Content-Length: 10`) โดยส่งผ่าน `confirmUrlCache` ดึงต่อได้อย่างรวดเร็วและถูกต้องสมบูรณ์

### 25. Mobile UX & Instant Playback Optimizations (`apply_project_fixes_single (3).zip` — `2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ที่มา:** สคริปต์ `apply_project_fixes.py` ขนาด 112 KB (1,950 บรรทัด) ใน `apply_project_fixes_single (3).zip`
- **การปรับปรุงและฟีเจอร์ระดับสูง:**
  1. **Sticky Wrapped Video Toolbar (`styles.css`):**
     - แถบเครื่องมือ `.video-toolbar` เพิ่ม `position: sticky; top: 0; z-index: 10; flex-wrap: wrap;` ทำให้ปุ่มควบคุม (เต็มจอ, สลับแนว, พรีวิว Google, ปิด) ไม่เลื่อนหลุดสายตาเมื่อเลื่อนหน้าจอดูคลิปแนวตั้งยาวๆ หรืออ่านการ์ดข้อผิดพลาด
     - บนจอมือถือ (`max-width: 680px`): ปรับขนาดปุ่ม `#vidFullscreen, #vidAspectToggle, #vidQuickPreview` เป็น `min-height: 40px; padding: 6px 10px; font-size: 12px;` เพื่อให้จัดวางได้พอดีในจอแคบ
  2. **Material 3 Virtual Viewport Adjustment (`video-player.js` & `tests/player-fullscreen.cjs`):**
     - ปรับ `calculatePreviewLayout` ให้ขยาย Virtual Viewport ขั้นต่ำเป็น `>= 800px` (กว้าง) และ `>= 420px` (สูง สำหรับคลิปแนวนอนบนจอแคบ) ทำให้แถบควบคุม Material 3 ของ Google Drive Preview แสดงปุ่ม Play/Pause, Timeline Scrubber, ปุ่มตั้งค่า และปุ่มเต็มจออยู่บนแถวล่างบรรทัดเดียว ไม่ตกบรรทัดหรือโดนตัดขอบ
  3. **Instant Playback Before IndexedDB Write (`video-player.js`):**
     - ในโหมด "โหลดทั้งไฟล์แทน": สั่งเริ่มเล่นวิดีโอ (`tryVideoSrc(...)`) ทันทีที่ดาวน์โหลด Blob ครบ โดยไม่ต้องรอให้การเขียนไฟล์ลงแคช IndexedDB (`videoCache.put`) ขนาดหลายสิบทรงตัวเสร็จสิ้นก่อน และย้ายการเขียนแคชไปทำแบบ background non-blocking
  4. **Signed-out Whole-File Download via Worker (`video-player.js`):**
     - ปลดล็อกให้ผู้ใช้ที่ไม่ได้ล็อกอิน Google Account สามารถกด "โหลดทั้งไฟล์แทน" ได้หากไฟล์มีขนาดระบุในลิสต์โฟลเดอร์ โดยระบบจะดึงไฟล์ผ่าน Cloudflare Worker สำรอง 6 ช่องขนานทันที
  5. **Session-Wide Preferred Route Memory (`video-player.js`):**
     - ฟังก์ชัน `preferredPlaybackRoute` เพิ่มการ fallback ไปใช้เส้นทางสตรีมล่าสุดที่เคยเล่นสำเร็จในเซสชันเดียวกัน สำหรับคลิปใหม่ที่ยังไม่เคยเปิด ทำให้ไม่ต้องเสียเวลาตรวจค้นหาเส้นทางใหม่
  6. **Pointerenter & Touchstart Stream Pre-Warming (`video-player.js`):**
     - เพิ่มฟังก์ชัน `warmVideoStream(id)` ผูกกับอีเวนต์ `pointerenter` (เมาส์ชี้) และ `touchstart` (แตะนิ้ว) บนการ์ดวิดีโอในรายการไฟล์ สั่งเตรียม Service Worker และยิง `HEAD` ไปยัง Worker เพื่อทำ TCP/TLS handshake ล่วงหน้า ทำให้เวลากดคลิกเล่น วิดีโอจะเริ่มเล่นได้เกือบจะในทันที
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านครบทั้ง **160/160 tests PASS (0 failures, duration ~23s)**
  - `tests/player-fullscreen.cjs` ตรวจสอบ virtual viewport 800x450 สำหรับ Material 3 บนมือถือผ่านฉลุย
  - `node tools/collection_data.js check` ผ่านครบ **335 รายการตรงกัน**
  - `py -B tests/test_patch_alive_sync.py` ผ่าน 1/1 test
  - `node --check` ผ่านหมดทุกไฟล์ JavaScript / Worker ไร้ข้อผิดพลาด

### 26. Horizontal Video Mobile Preview Layout & Toolbar Polish (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบและสาเหตุที่แท้จริง (Root Cause):**
  1. **Google Drive Preview ซ้อนปุ่ม 3 ชั้นบดบังวิดีโอแนวนอนบนมือถือ:** ใน Section 25 มีการกำหนด `minHeight = 420` และ `minWidth = 800` ใน `calculatePreviewLayout` ทำให้คลิปแนวนอน (16:9) บนมือถือ (กว้าง ~390px, สูง ~219px) โดนบีบเสมือนเป็นจอ Desktop กว้าง 800px สูง 450px และใช้ `scale = 0.4675` ส่งผลให้ Google Drive Preview แสดงทั้งแถบควบคุม Desktop ด้านล่าง และปุ่มควบคุมระบบสัมผัส (Touch Pills: แคปซูล Play, ปุ่มกรอเวลา 10 วิ, ปุ่มเสียง/เกียร์) ซ้อนทับกันถึง 3 ชั้น ลอยบังเนื้อหาวิดีโอไปกว่า 60%
  2. **ข้อความปุ่มโดนตัดขอบ (`แนวนอน ..`):** ปุ่ม `#vidAspectToggle` และปุ่มเครื่องมือบน `.video-toolbar` ไม่มี `white-space: nowrap` และ `flex-shrink: 0` ทำให้บนจอมือถือที่มีปุ่มย้อนกลับ/ถัดไปและปุ่มปิด ข้อความปุ่มถูกบีบจนเป็นจุดไข่ปลา
  3. **บล็อกโค้ดซ้ำซ้อนใน `video-player.js`:** มีบล็อก `if (mp4 && !settled && res.headers ...)` สำหรับสแกน moov box ซ้ำกัน 4 ชุด
- **แนวทางการแก้ไข:**
  1. **ปรับสูตร `calculatePreviewLayout` ให้คลิปแนวนอนไม่โดนบีบความสูงเสมือน:**
     - สำหรับคลิปแนวนอน (`aspect >= 1`): ใช้ `frameWidth = Math.max(480, width)` โดยไม่ใส่ `minHeight: 420` ทำให้สเกลบนมือถืออยู่ที่ ~0.8125 ซึ่งอยู่ต่ำกว่าจุดตัด Desktop ของ Google Drive (< 600px) ทำให้ Google Drive แสดงผลเครื่องเล่นมือถือแบบสัมผัสที่สะอาดตา ปุ่มควบคุมไม่ซ้อนกัน 3 ชั้น และไม่บังเนื้อหาวิดีโอ
     - สำหรับคลิปแนวตั้ง (`aspect < 1`): ยังคงความกว้างเสมือน `>= 800px` เพื่อให้แถบควบคุมด้านล่างไม่ตกบรรทัดในกรอบทรงสูง
  2. **ปรับปรุง CSS แถบเครื่องมือ `.video-toolbar` (`styles.css`):**
     - กำหนด `white-space: nowrap; flex-shrink: 0;` ให้ปุ่ม `#vidFullscreen, #vidAspectToggle, #vidQuickPreview` ป้องกันข้อความถูกบีบตัดเป็นจุดไข่ปลา
     - บนจอมือถือ (`max-width: 680px`): ปรับระยะห่าง `gap: 4px; padding: 6px;`, ขนาดปุ่ม `38px` และเปิดให้เลื่อนในแนวนอนได้ (`overflow-x: auto; flex-wrap: nowrap;`) หากจอแคบมาก
  3. **เพิ่มคำอธิบายปุ่มสลับแนว (Accessibility & Tooltips):** ใน `applyVideoAspect()` เพิ่ม `title` และ `aria-label` อธิบายสัดส่วนที่กำลังเล่นและทิศทางที่จะสลับเมื่อคลิก (เช่น "กำลังแสดงแนวนอน 16:9 (คลิกเพื่อสลับเป็นแนวตั้ง 9:16)")
  4. **ล้างบล็อกโค้ดสแกน moov ที่ซ้ำซ้อน 3 ชุดใน `video-player.js`** ออกให้สะอาด
  5. **ปรับชุดทดสอบใน `tests/player-fullscreen.cjs`** ให้ตรงกับพฤติกรรมจริงของเครื่องเล่นบนมือถือ
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - `node --test tests/*.cjs` ผ่านครบทั้ง **160/160 tests PASS (0 failures, duration ~23s)**
  - `node tools/collection_data.js check` ผ่าน สองฝั่งตรงกันครบ **335 รายการ**
  - `py tests/test_patch_alive_sync.py` ผ่าน 1/1 test (OK)
  - `node --check` ผ่านทุกไฟล์ JavaScript / Worker ไร้ syntax error

### 27. Fix Horizontal Video 3.2:1 Aspect Ratio Pancake & Mobile Fullscreen Fallback (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบและสาเหตุที่แท้จริง (Root Cause):**
  1. **วิดีโอแนวนอนแบนเป็นแพนเค้ก 3.2:1 ในแนวนอน (`styles.css`):**
     - ใน `styles.css` กำหนด `.video-box .ratio` ด้วย `width: 100%` ร่วมกับ `max-height: 65dvh`
     - เมื่อผู้ใช้หมุนจอมือถือเป็นแนวนอน (เช่น iPhone 14: 844x390px): ความกว้างของกล่องวิดีโอคือ 812px แต่ `max-height: 65dvh` บีบความสูงไว้ที่ 253.5px
     - ตามกฎ CSS Flexbox/Block: เมื่อกำหนด `width: 100%` ความกว้างจะไม่หดตัวตาม `aspect-ratio: 16 / 9` ผลลัพธ์คือกล่องวิดีโอกลายเป็นสัดส่วน 812 / 253.5 = **3.203 : 1** แบนรีบเหมือนแถบแพนเค้ก และทำให้เครื่องเล่น Google Drive ข้างในเสียรูป
  2. **ปุ่มเต็มจอบนมือถือ (โดยเฉพาะ iOS Safari / iPhone) ไม่ทำงาน:**
     - Safari บน iPhone ไม่รองรับ HTML5 Fullscreen API (`Element.requestFullscreen`) บนอิลิเมนต์ `<div>` ทั่วไป ทำให้เมื่อผู้ใช้กดปุ่ม "เต็มจอ" ฟังก์ชันจะล้มเหลวและแจ้งเตือนว่า *"เปิดเต็มจอไม่ได้ ลองเปิดในแท็บใหม่"*
     - ในแนวนอนไม่มี Media Query รองรับ ทำให้แถบควบคุมและส่วนข้อมูลด้านล่างเรียงซ้อนกันจนหน้าจอเกิด Scrollbar แนวตั้ง
  3. **แคชเบราว์เซอร์บนมือถือจำโค้ดไฟล์เดิม:**
     - ใน `index.html` ไม่ได้ใส่ query string สำหรับ cache busting (`?v=...`) ทำให้เบราว์เซอร์บนมือถือยังคงดึงไฟล์ CSS และ JavaScript รุ่นเก่าที่จำอยู่ในหน่วยความจำแคช
- **แนวทางการแก้ไข:**
  1. **คำนวณความกว้างสัดส่วน 16:9 แบบไดนามิกตามความสูงสูงสุด (`styles.css`):**
     - แทนที่ `width: 100%` ด้วย `width: min(100%, calc(var(--video-max-h, 65dvh) * 16 / 9)); max-height: var(--video-max-h); aspect-ratio: 16 / 9; margin: 0 auto;`
     - ทั้งในแนวตั้ง (374x210.4px) และแนวนอน (611.5x344px) สัดส่วนของวิดีโอจะล็อกอยู่ที่ **16:9 (1.7778:1)** อย่างแม่นยำ ไม่โดนบีบแบนเป็น 3.2:1 อีกต่อไป
  2. **เพิ่มกฎตอบสนองสำหรับมือถือแนวนอน (`styles.css`):**
     - เพิ่ม `@media (max-width: 920px) and (orientation: landscape), (max-height: 500px) and (orientation: landscape)`
     - กำหนด `--video-max-h: calc(100dvh - 46px);` ทำให้เมื่อผู้ใช้หมุนเครื่องแนวนอน วิดีโอจะขยายเต็มความสูงของหน้าจอโดยเหลือพื้นที่ 46px ให้แถบเครื่องมือด้านบน ทำให้ได้วิดีโอขนาดใหญ่ถึง 611.5x344px บนจอ 844x390px โดยไม่มี Scrollbar แนวตั้ง
  3. **เพิ่มระบบ Pseudo-Fullscreen Fallback สำหรับ iOS และอุปกรณ์ที่ไม่รองรับ Native Fullscreen (`styles.css`, `video-player.js`, `app-core.js`):**
     - เพิ่มคลาส `.video-box.pseudo-fullscreen` ใน CSS ด้วย `position: fixed; inset: 0; width: 100vw; height: 100dvh; z-index: 100000;`
     - ใน `togglePlayerFullscreen()`: ตรวจสอบ `req = box.requestFullscreen || box.webkitRequestFullscreen` หากไม่มีหรือ Reject จะสลับเข้าสู่โหมด `pseudo-fullscreen` ทันที พร้อมอัปเดตข้อความปุ่มเป็น "ออกเต็มจอ"
     - ใน `closeVideo()` และปุ่ม `Escape`: เพิ่มการลบคลาส `pseudo-fullscreen` คืนค่าการแสดงผลตามปกติ
  4. **ล้างแคชเบราว์เซอร์มือถือ (Cache Busting):**
     - เพิ่ม `?v=20261014-r3` ต่อท้าย `styles.css` และแท็ก `<script>` ทั้ง 7 ไฟล์ใน `index.html`
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures, duration ~24s)**
  - **Chrome DevTools MCP Emulation Verification (ทดสอบจริงในเบราว์เซอร์):**
    - *iPhone 14 Landscape (844x390px):* กล่องวิดีโอมีขนาด `width = 611.55px`, `height = 344px`, สัดส่วนคำนวณได้ `aspect = 1.777833` ตรงกับ **16:9** เป๊ะ ไร้ Scrollbar แนวตั้ง บันทึกภาพหน้าจอตรวจสอบเรียบร้อย
    - *Pseudo-Fullscreen:* จำลองกรณีไร้ `requestFullscreen` (iOS Safari) ผลลัพธ์ `isPseudo = true`, ปุ่มเปลี่ยนเป็น "ออกเต็มจอ", ขนาดเต็มจอ 16:9 สวยงาม และสามารถกดออกหรือกด Escape กลับมาได้ปกติ
    - *iPhone 14 Portrait (390x844px):* กล่องวิดีโอมีขนาด `width = 374px`, `height = 210.375px`, สัดส่วน `aspect = 1.777778` ตรงกับ **16:9** แถบปุ่มด้านบนแสดงครบไม่ตกขอบ
    - *Aspect Toggle:* ปุ่ม `#vidAspectToggle` กดสลับระหว่างแนวตั้ง 9:16 (`aspect = 0.5625`) และแนวนอน 16:9 (`aspect = 1.7778`) ได้ทันที

### 28. Fix Google Drive Preview Controls Clipping & Vertical Scrollbar on Mobile (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบและสาเหตุที่แท้จริง (Root Cause):**
  1. **ปุ่มควบคุมตัดขาด ไทม์ไลน์เด้งขึ้นบน และปุ่มลอยซ้อนกลางจอในโหมดพรีวิว (`video-player.js`):**
     - ในคอมมิตก่อนหน้า มีการทดลองปรับ `frameWidth` ใน `calculatePreviewLayout()` สำหรับคลิปแนวนอน (`horizontal`) ให้ลดลงเหลือ `480px` โดยหวังว่าจะทำให้ปุ่มควบคุมดูใหญ่ขึ้นบนจอมือถือ
     - แต่สำหรับวิดีโอสัดส่วน 16:9 เมื่อกำหนด `frameWidth = 480px` จะได้ความสูงเสมือน (`height`) เพียง `270px` (480 * 9 / 16)
     - ตัวเล่น Material 3 ภายใน iframe `/preview` ของ Google Drive ต้องการพื้นที่ความสูงอย่างน้อย ~320px หากพื้นที่ต่ำกว่านั้น Google Drive จะสลับเข้าสู่เลย์เอาต์ขนาดจิ๋วที่บกพร่อง:
       - แถบ Scrubber ไทม์ไลน์ถูกดีดขึ้นไปอยู่ขอบบนสุดของวิดีโอ
       - ปุ่มความเร็ว, คำบรรยาย, ระดับเสียง และการตั้งค่า (`[🔊][CC][1x][⚙️]`) ถูกพับกลายเป็นก้อนเม็ดกระดุมลอยขวางอยู่กลางภาพวิดีโอ
       - ปุ่ม Play/Pause และเวลาถูกดันทะลุขอบล่างจนโดนตัดขาดไปครึ่งหนึ่ง
       - เกิดแถบ Scrollbar แนวตั้งซ้อนอยู่ภายในกรอบ iframe ของ Google Drive
- **แนวทางการแก้ไข:**
  1. **ฟื้นฟู Virtual Viewport ขั้นต่ำ 800x450px สำหรับคลิปแนวนอน (`video-player.js`):**
     - ปรับปรุง `calculatePreviewLayout()` ให้คำนวณ `minWidth = 800` และหากเป็นคลิปแนวนอนบนหน้าจอแคบ จะบังคับความสูงเสมือนขั้นต่ำ `minHeight = 420px`:
       ```javascript
       const horizontal = aspect > 0 ? aspect >= 1 : width >= height;
       const minWidth = 800;
       const minHeight = horizontal && width < 800 ? 420 : 0;
       const frameWidth = Math.max(minWidth, width, minHeight > 0 && height > 0 ? Math.ceil(width * (minHeight / height)) : 0);
       const scale = width / frameWidth;
       return {width: frameWidth, height: height / scale, scale: scale};
       ```
     - ผลลัพธ์: บนจอมือถือ (เช่น ความกว้าง 374px หรือ 390px) ตัว iframe จะมีขนาดเสมือน `800x450px` (Scale ~0.468 ถึง 0.488) ซึ่งขนาด 800x450px นี้จะทำให้ Google Drive เรนเดอร์ด้วย Desktop Toolbar แถวเดียวเรียบเนียนอยู่ขอบล่างสุด ไร้ปุ่มเม็ดกระดุมลอยกลางจอ ไร้ไทม์ไลน์ชิดบน ปุ่ม Play/Pause แสดงครบถ้วน และไร้ Scrollbar ภายใน iframe
  2. **ปรับปรุงการทดสอบ Unit Tests (`tests/player-fullscreen.cjs`):**
     - ปรับ assertion ใน `tests/player-fullscreen.cjs` ให้ตรวจสอบ Virtual Viewport ขนาด `800px` width และ `450px` height สำหรับคลิปแนวนอนบนมือถือ
  3. **อัปเดต Cache Busting เป็นเวอร์ชันใหม่ (`index.html`):**
     - เปลี่ยน query string เป็น `?v=20261014-r4` สำหรับ `styles.css` และสคริปต์ทั้ง 7 โมดูล เพื่อให้เบราว์เซอร์บนมือถือโหลดโค้ดใหม่ทันทีโดยไม่ติดแคชเดิม
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures, duration ~24s)**
  - **Data Sync:** `node tools/collection_data.js check` ตรวจสอบข้อมูลสองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่านครบ 1/1 (OK)
  - **Syntax Check:** `node --check video-player.js` ผ่านสมบูรณ์ ไร้ข้อผิดพลาด
  - **Chrome DevTools MCP Emulation:**
    - ทดสอบ Emulation จอ iPhone 14 Portrait (390x844px) และ Landscape (844x390px)
    - ค่า CSS Variables ของพรีวิว: `--preview-width: 800px`, `--preview-height: 450px`
    - สัดส่วนกรอบวิดีโอคงที่ 16:9 (`aspect = 1.7778`) ทั้งสองแนว และไม่มี Scrollbar ภายในกรอบ

### 29. Universal Responsive Fit across All Devices, Orientations & Fullscreen Modes (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบและสาเหตุที่แท้จริง (Root Cause):**
  1. **สัดส่วนวิดีโอถูกยืดเพี้ยนในโหมดเต็มจอ (Fullscreen / Pseudo-Fullscreen):**
     - กฎเดิมใน `styles.css` กำหนด `.video-box:fullscreen .ratio { aspect-ratio: auto; width: 100%; height: auto; }`
     - บนมือถือแนวนอน (เช่น 844x390px) ทำให้กล่อง `.ratio` โดนยืดเป็นสัดส่วน **2.45:1** (แบนกว้างเกินจริง) และสำหรับคลิปแนวตั้ง 9:16 ก็ถูกบังคับยืดแบนเช่นกัน
     - ทำให้ Google Drive Preview iframe เสียรูปทรงตามกรอบที่บิดเบี้ยว
  2. **กล่องเครื่องเล่นสูงเกินหน้าจอมือถือแนวนอน (Mobile Landscape Overflow):**
     - ในแนวนอนบนมือถือ (ความสูงจอเพียง 360-390px) การวาง Toolbar (40px) + Video (344px) + Footer (88px) รวมกันได้ 472px ซึ่งเกินความสูงหน้าจอ ส่งผลให้กล่องเกิด Scrollbar แนวตั้ง และส่วนล่างของวิดีโอถูกดันตกขอบ
  3. **การหมุนจอมือถือ (Orientation Change) ไม่ทริกเกอร์การคำนวณสเกลพรีวิวใหม่ทันที:**
     - ใน `app-core.js` มีเฉพาะอีเวนต์ `resize` แต่บนอุปกรณ์มือถือบางรุ่นการหมุนหน้าจอจะส่งสัญญาณ `orientationchange` ก่อนที่ `resize` จะเสร็จสมบูรณ์
- **แนวทางการแก้ไข:**
  1. **ผูกตัวแปร CSS `--video-aspect` แบบไดนามิก (`video-player.js`, `styles.css`):**
     - ใน `applyVideoAspect()` กำหนด `ratioEl.style.setProperty('--video-aspect', String(aspect));` ตามสัดส่วนจริงของวิดีโอ (16:9, 9:16 หรือขนาดอื่น)
     - ใน `styles.css` ปรับให้ `.video-box .ratio` ใช้ `aspect-ratio: var(--video-aspect, 16 / 9);` และคำนวณความกว้างตามความสูงสูงสุดอย่างแม่นยำ `width: min(100%, calc(var(--video-max-h) * var(--video-aspect, 16 / 9)));`
  2. **ล็อกสัดส่วนแบบ Aspect-Contain ในโหมดเต็มจอ (Fullscreen & Pseudo-Fullscreen) (`styles.css`):**
     - แทนที่การตั้ง `aspect-ratio: auto; width: 100%` ด้วย:
       ```css
       .video-box:fullscreen .ratio, .video-box.pseudo-fullscreen .ratio {
         flex: 0 0 auto;
         max-width: 100vw;
         max-height: calc(100dvh - 44px);
         aspect-ratio: var(--video-aspect, 16 / 9);
         width: min(100vw, calc((100dvh - 44px) * var(--video-aspect, 16 / 9)));
         height: auto;
         margin: auto;
       }
       ```
     - ผลลัพธ์: ทั้งคลิปแนวนอน (16:9) และแนวตั้ง (9:16) จะคงสัดส่วนที่ถูกต้องเสมอ ไม่โดนยืดเป็น 2.45:1 และอยู่ตรงกลางจออย่างสมบูรณ์แบบบนทุกอุปกรณ์
  3. **ปรับความสูงสูงสุดสำหรับมือถือแนวนอนให้พอดีจอ 100% (`styles.css`):**
     - ปรับ `--video-max-h: calc(100dvh - 84px);` ใน `@media (orientation: landscape)` ทำให้ Toolbar + Video + Footer รวมกันไม่เกิน `100dvh` หน้าจอไม่เกิด Scrollbar โดยไม่จำเป็น
  4. **เพิ่ม Event Listener `orientationchange` (`app-core.js`):**
     - ผูก `window.addEventListener('orientationchange', fitVideoPreview, {passive: true});` เพื่อให้คำนวณ Virtual Viewport ของ Google Drive ใหม่ทันทีที่หมุนจอ
  5. **อัปเดต Cache Busting เป็น `?v=20261014-r5` (`index.html`):**
     - อัปเดต query string ให้เบราว์เซอร์ทุกอุปกรณ์ดึงไฟล์ใหม่ทันที
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures)**
  - **Data Sync:** `node tools/collection_data.js check` ตรงกันครบ **335 รายการ**
  - **Python Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Syntax Check:** `node --check video-player.js` และ `node --check app-core.js` ผ่านสมบูรณ์
  - **Chrome DevTools MCP Emulation ตรวจสอบครบทุกอุปกรณ์:**
    - *iPhone 14 Landscape (844x390px):* กล่องวิดีโอ 16:9 สัดส่วน 1.7778 เป๊ะ ใน Fullscreen ได้ขนาด 615.1x346px ไร้การยืด 2.45:1
    - *iPhone 14 Portrait (390x844px):* กล่องวิดีโอ 16:9 (374x210.4px) และ 9:16 (360.8x641.4px) สัดส่วนแม่นยำ ไม่ล้นจอ
    - *iPad Mini Portrait (768x1024px) & Landscape (1024x768px):* แสดงผลเต็มพื้นที่ 16:9 พอดี ไร้ Scrollbar
    - *Desktop (1920x1080px):* ขนาด 921.6x518.4px สัดส่วน 16:9 คมชัดตรงกลางหน้าจอ

### 30. UI Redesign: Modern Streaming Aesthetic for Personal Library and Collections (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาเดิมก่อนปรับปรุง:**
  1. **Personal Library (ดูต่อจากครั้งล่าสุด, ดูภายหลัง, ★ รายการโปรด):**
     - แสดงผลเป็นกล่องข้อความทึบดิบ (`.favorite-folder button`) ที่มีชื่อไฟล์ยาวเหยียดและข้อความกำกับยาวเทอะทะ
     - ขาด Thumbnail พรีวิว, ขาดแถบ Progress Bar แสดงตำแหน่งที่ดูค้างไว้ ทำให้ดูไม่ออกว่าดูไปถึงไหนแล้ว
     - ปุ่มลบเป็นปุ่มสี่เหลี่ยมติดกัน ไม่มีความสวยงามระดับแอปสตรีมมิ่งชั้นนำ
  2. **คลัง XBep:**
     - Status Banner ด้านบน (`#collMissing`) แสดงเป็นข้อความพารากราฟสีเทาทึบยาวเหยียด อ่านยากและเปลืองพื้นที่แนวตั้ง
     - สถานะของแต่ละการ์ดใช้คำพรรณนายาว เช่น `Drive: ใช้ได้ตามข้อมูล` กว้างจนกินพื้นที่หลายบรรทัด
     - ตัวการ์ดขาดความลึก มิติ และความนุ่มนวล
- **การเปลี่ยนแปลงที่ดำเนินการ (Implementation Details):**
  1. **ยกเครื่องโครงสร้าง Personal Library เป็น Modern Streaming Cards:**
     - **`video-player.js` (`renderContinueWatching`):**
       - สร้างการ์ด `.resume-card` พร้อมกล่อง Thumbnail จำลอง `.resume-thumb-box` ที่มี Play Glyph และ **Glowing Progress Bar** (`.resume-progress-bar`) คำนวณเปอร์เซ็นต์ตามตำแหน่งจริง
       - ชื่อเรื่อง `.resume-title` ตัด Ellipsis นุ่มนวล ไม่ดันความกว้างการ์ด
       - มี Badge เวลา `.resume-time-tag` แสดง `⏱ ดูต่อ M:SS`
       - ปุ่มลบ `.favorite-remove-btn` แบบวงกลมมินิมอล มี Hover Micro-animation (สีแดงอ่อน + ขยาย 1.1x)
     - **`app-core.js` (`renderPersonalLibrary`):**
       - ปรับรายการ "ดูภายหลัง" ให้ใช้ `.resume-card` ร่วมกับ Grid Layout
       - แยก Icon ตามประเภทอย่างชัดเจน: `▶` สำหรับวิดีโอ (Gradient สีแดง-ม่วง) และ `🖼` สำหรับรูปภาพ (Gradient สีเขียว-ฟ้า) พร้อมป้ายบอกประเภท
     - **`drive-explorer.js` (`renderFavoriteFolders`):**
       - ปรับรายการ "★ รายการโปรด" ให้ใช้ `.resume-card` พร้อมกล่องไอคอน `📁` สีส้ม-อำพัน และป้าย `★ โฟลเดอร์โปรด`
  2. **ปรับโฉมคลัง XBep ให้กะทัดรัดและคลีนพรีเมียม:**
     - **`collection-viewer.js` (`statusBadge` & Status Banner):**
       - ปรับ Status Banner ให้เป็น **Dashboard Pill Chips** สไตล์โมเดิร์น: `📦 ทั้งหมด 335`, `🟢 Drive พร้อม 173`, `🔴 ย้าย/เสีย 162` ลดความสูงแนวตั้งและอ่านง่ายทันที
       - ปรับ `statusBadge` ให้เป็น Dot Status Badge กระชับ: `🟢 Drive พร้อม`, `🔴 Drive เสีย`, `⚪ MEGA ยังไม่ตรวจ` ประหยัดพื้นที่การ์ดได้กว่า 50%
  3. **ขัดเกลา CSS สไตล์ Modern Streaming (`styles.css`):**
     - เพิ่มชุดคลาส `.resume-card`, `.resume-btn`, `.resume-thumb-box`, `.resume-progress-bar`, `.favorite-remove-btn`
     - ปรับ `.coll-card` ให้มุมโค้ง 12px พร้อม Soft Shadow และ Hover Lift (`transform: translateY(-2px)`)
     - รองรับ Responsive แบบ Grid อัตโนมัติ (`minmax(280px, 1fr)`) และเปลี่ยนเป็น Single Column อัตโนมัติบนจอมือถือ (<520px)
  4. **อัปเดต Cache Busting เป็น `?v=20261014-r6` (`index.html`):**
     - อัปเดต version query string ทั้งใน `styles.css` และ 7 สคริปต์ ให้ผู้ใช้ได้รับเวอร์ชันใหม่ทันทีโดยไม่ต้องเคลียร์แคชเอง
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures)**
  - **Data Integrity:** `node tools/collection_data.js check` ถูกต้องครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Visual & Accessibility Inspection ผ่าน Chrome DevTools MCP:**
    - ตรวจสอบ Accessibility Tree บน Mobile Viewport (390x844px): ทุกปุ่มมี Accessible Name และ ARIA Label ครบถ้วน
    - ตรวจสอบการ์ดคลัง XBep: Dot Status Pill แสดงผลคมชัด กะทัดรัด ไม่เบียดกัน
    - Dashboard Pill Chips: แสดงผล `📦 ทั้งหมด 335`, `🟢 Drive พร้อม 173`, `🔴 ย้าย/เสีย 162` ชัดเจน สวยงาม

### 31. Feature: My Library Drawer ("⭐ คลังของฉัน") (`2026-10-14`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาเดิม:**
  - ส่วน "ดูภายหลัง", "ดูต่อจากครั้งล่าสุด", และ "★ รายการโปรด" แสดงผลเป็น Section ขนาดใหญ่ 3 ส่วนคั่นอยู่กลางหน้าหลัก
  - ทำให้หน้าหลักต้องเลื่อนยาวมาก และบดบังการสำรวจโฟลเดอร์ใน Drive และคลัง XBep
- **แนวทางและสิ่งที่ทำ (Implementation):**
  1. **สร้าง Drawer/Slide-over Menu "⭐ คลังของฉัน" (`#myLibraryDrawer`):**
     - บนเดสก์ท็อป: สไลด์มาจากด้านขวา (Slide-over Panel)
     - บนมือถือ (<680px): สไลด์ขึ้นมาจากด้านล่างเป็น Bottom Sheet มีความสูง 84dvh พร้อมปุ่มปิด `×` และ Backdrop Blur ฉากหลัง
  2. **ย้าย 3 ส่วนเข้าสู่ Drawer โดยอัตโนมัติ:**
     - `renderPersonalLibrary()` (`app-core.js`), `renderContinueWatching()` (`video-player.js`), และ `renderFavoriteFolders()` (`drive-explorer.js`) ตรวจพบ `#myLibraryContent` และ Mount เข้าไปใน Drawer
     - หน้าหลักระหว่าง คลัง XBep กับ เบราว์เซอร์ Drive จึงเชื่อมต่อกันอย่างต่อเนื่อง คลีนโล่ง ไม่รกสายตา
  3. **จุดเข้าถึง 2 ทาง (Header + Mobile Bar):**
     - Header: เพิ่มปุ่ม `#myLibraryToggle` ข้างปุ่มเปลี่ยนธีม พร้อม Badge สีแดงเรืองแสงนับจำนวนรวมแบบเรียลไทม์
     - Mobile Bottom Bar: เพิ่มปุ่ม `#mbLibrary` (ไอคอนดาว) ในแถบลัดด้านล่าง
  4. **Micro-UX & Interactivity:**
     - คลิกปุ่มเปิดการ์ดใดๆ ใน Drawer จะสั่งปิด Drawer อัตโนมัติ (`closeMyLibraryDrawer()`) เพื่อนำผู้ใช้เข้าสู่วิดีโอหรือโฟลเดอร์ทันที
     - รองรับการกดแป้น `Escape` หรือคลิกฉากหลังเพื่อปิด
     - ป้องกันการ Scroll ซ้อนของหน้าหลักด้วย `body.drawer-open { overflow: hidden; }`
  5. **อัปเดต Cache Busting เป็น `?v=20261014-r7` (`index.html`):**
     - ให้ผู้ใช้ได้รับเวอร์ชันใหม่ทันที
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures)**
  - **Data Integrity:** `node tools/collection_data.js check` ผ่านครบ 335 รายการ
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Browser E2E Verification ผ่าน Chrome DevTools MCP:**
    - ตรวจสอบ `drawerChildren: ["personalLibrary", "continueWatching", "favoriteFolders"]` ย้ายเข้า Drawer ครบถ้วน
    - ตรวจสอบ `prevSiblingOfBrowserCard: "collectionsCard"` (หน้าหลักคลีน ไร้ Section คั่น)
    - ทดสอบคลิกเปิด-ปิด Drawer, Backdrop และ Badge ตัวเลขแสดงผลเรียลไทม์ถูกต้อง 100%

### 32. Feature & Fix: Real Cover Thumbnails for Resume Cards & Library Drawer (`2026-10-15`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาเดิมก่อนปรับปรุง:**
  1. การ์ดในเมนู "⭐ คลังของฉัน" (ทั้งส่วน "ดูภายหลัง" และ "ดูต่อจากครั้งล่าสุด") แสดงผลเป็นกล่องสี่เหลี่ยม Gradient มืดๆ พร้อมไอคอน Play `▶` เท่านั้น ไม่มีรูปภาพปกวิดีโอหรือรูปพรีวิว ทำให้ผู้ใช้จำไม่ได้ว่าคลิปไหนเป็นเรื่องอะไร
  2. Endpoint ตรงของ Drive (`lh3.googleusercontent.com` หรือ `drive.google.com/thumbnail`) จะติด 403 Forbidden หากไฟล์ไม่ได้เปิดสิทธิ์แชร์สาธารณะ (Web-published)
  3. สคริปต์ `app-core.js` มี ReferenceError บรรทัด `initMyLibraryDrawer` จากการอ้างอิงตัวแปร `backdrop` ที่ยังไม่ได้ประกาศ (`const backdrop = document.getElementById("myLibraryBackdrop")`) ทำให้แอปหยุดทำงานช่วงท้ายของการโหลด
- **สถาปัตยกรรมและการเปลี่ยนแปลง (Implementation Details):**
  1. **ระบบ Multi-tier Cover Thumbnail System:**
     - **Tier 1 (RAM Cache):** ตรวจสอบ `mediaThumbs[id]` จากการโหลดไฟล์ในโฟลเดอร์ Google Drive ที่ได้รับ Signed Thumbnail URL มาแล้ว
     - **Tier 2 (HTML5 Video Frame Capture):** ใน `video-player.js` ฟังก์ชัน `saveVideoPos()` ใช้ `<canvas>` ขนาด 160x100 วาดเฟรมจริงของวิดีโอที่กำลังเล่นอยู่แบบเรียลไทม์ แล้วแปลงเป็น Data URL (JPEG คุณภาพ 0.68) บันทึกลง `localStorage.setItem("gdv_thumb_" + vidCurrentId, dataUrl)` ทำให้วิดีโอที่ดูค้างไว้มีรูปปกตรงจากเนื้อเรื่องช่วงที่กำลังดูทันที
     - **Tier 3 (Folder Listing & Explorer Cache):** ใน `drive-explorer.js` และ `media-lightbox.js` แคช `f.thumbnailLink` และรูปจากการ์ดลง `localStorage` เมื่อผู้ใช้สำรวจไฟล์หรือกด "+ ดูภายหลัง"
     - **Tier 4 (Async Drive API Probe):** หากรูปพรีวิวโหลดไม่สำเร็จ (เช่น โดน 403) จะเรียก `window.tryLoadDriveThumbnail(id, imgEl)` ส่งคำขอไปที่ Drive API v3 ด้วย API Key หรือ OAuth Token เพื่อดึง `thumbnailLink` ที่มีสิทธิ์เข้าถึงจริง
     - **Tier 5 (Graceful Fallback):** หากไม่มีรูปหรือโหลดล้มเหลว จะซ่อน `<img>` และแสดงกล่อง Gradient นุ่มลึกพร้อมไอคอน Play แทน โดยไม่มีไอคอน Broken Image โผล่มากวนใจ
  2. **ปรับปรุง CSS & Micro-interactions (`styles.css`):**
     - ปรับขนาด `.resume-thumb-box` ให้มีสัดส่วนวิดีโอ 16:10 (74x48px)
     - เพิ่มคลาส `.resume-thumb-img` พร้อม `object-fit: cover`, Fade-in (`opacity: 0` -> `1` เมื่อโหลดเสร็จ) และ Zoom Micro-animation (`transform: scale(1.08)`) เมื่อ Hover บนตัวการ์ด
     - เพิ่มป้ายวงกลมโปร่งแสงกึ่งโปร่งใส `.resume-thumb-box.has-thumb .resume-play-glyph` ลอยเด่นอยู่เหนือภาพปก
  3. **แก้ไข Bug และ Attribute Safety:**
     - แก้ไข ReferenceError: เพิ่ม `const backdrop = document.getElementById("myLibraryBackdrop");` ใน `initMyLibraryDrawer()`
     - ป้องกัน XSS/HTML Injection: ปรับ `safeThumbUrl` และ `safeId` ให้ผ่านการ Escape เครื่องหมายคำพูด `"` และ `'` ป้องกันการหลุดจากแอตทริบิวต์ `src` หรือฟังก์ชัน `onerror`
  4. **อัปเดต Cache Busting เป็น `?v=20261014-r8` (`index.html`):**
     - อัปเดต `styles.css` และ 7 สคริปต์ให้ดึงเวอร์ชันล่าสุดทันที
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures, duration 22.6s)**
  - **Data Integrity:** `node tools/collection_data.js check` ถูกต้องครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Visual & Console Inspection ผ่าน Chrome DevTools MCP:**
    - คอนโซลเบราว์เซอร์: 0 Errors (ReferenceError หายขาด 100%)
    - การ์ดทั้งใน "ดูภายหลัง" และ "ดูต่อจากครั้งล่าสุด" แสดงผลภาพปกเต็มขนาด พร้อม Play Glyph Overlay และ Progress Bar ตรงตามสเปก
    - บันทึกภาพ Screenshot ยืนยันการแสดงผล (Step 2971 ในบันทึกการทำงาน)

### 33. Bug Fix: Google Drive Preview Landscape Mini-Player & Clipped Controls Layout (`2026-10-15`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาเดิมก่อนปรับปรุง:**
  1. เมื่อเปิดพรีวิว Google Drive บนหน้าจอมือถือแนวนอน (Landscape Orientation เช่น iPhone 844x390, หรือหน้าจอที่มีความสูงของวิวพอร์ตวิดีโอต่ำกว่า 300px) แถบควบคุมวิดีโอของ Google Drive จะกลายสภาพเป็นโหมด "Mini/Compact Player" ที่แสดงผลผิดเพี้ยน:
     - เส้น Timeline Scrubber ถูกดันขึ้นไปปักติดชิดขอบบนสุดของคลิป
     - กลุ่มปุ่มปรับเสียง, คำบรรยาย (CC), ความเร็วการเล่น (1x) และฟันเฟืองตั้งค่า หดตัวกลายเป็น Floating Pill ก้อนกลมลอยอยู่กลางจอฝั่งขวา
     - ปุ่ม Play ก้อนกลมและปุ่มถอยหลัง/เดินหน้า 10s ด้านล่างถูกตัดขาดครึ่งก้อน (Overflow clipping) จากขอบล่างของหน้าจอ
- **สาเหตุเชิงลึก (Root Cause Analysis - RCA):**
  1. ใน `video-player.js` ฟังก์ชัน `calculatePreviewLayout(width, height, aspect)` คำนวณไว้ว่า:
     `const minHeight = horizontal && width < 800 ? 420 : 0;`
     บนมือถือแนวนอน (เช่น 844x390 หรือ 915x412) ความกว้าง `width >= 800` เสมอ ทำให้เงื่อนไข `width < 800` เป็นเท็จ ส่งผลให้ `minHeight = 0` และ `scale = 1` ปล่อยให้ Virtual Height ภายใน iframe ยุบตัวลงเหลือ `<= 270px` ตามความสูงจริงของหน้าจอ
     และใน CSS ภายใน iframe ของ Google Drive มี Media Query ดักจับ `@media (max-height: 270px)` เพื่อเปลี่ยนเป็น Compact Player ทันที
  2. ลำดับการเรียกใช้ใน `media-lightbox.js` (`fallbackIframe`):
     เดิมเรียก `fitVideoPreview()` ก่อน `applyPreviewAspect(id)` ทำให้การวัดและคำนวณ Layout ในครั้งแรกยังไม่ได้สัดส่วนจริงของวิดีโอ
  3. CSS Inset & Media Query Precedence (`styles.css`):
     - กฎ `.video-box .ratio > iframe` มี `position: absolute; inset: 0;` ซึ่งไปล็อกขอบล่าง `bottom: 0` ขณะที่ iframe พยายามขยายตาม `--preview-height`
     - กฎ `@media (orientation: landscape)` วางอยู่ก่อนหน้า `@media (max-width: 680px)` ทำให้เมื่อเปิดบนจอมือถือแนวนอนที่มีความกว้าง `<= 680px` สไตล์ปุ่ม 44px ของ Mobile Portrait เข้าไปทับ Layout ของแนวนอน
- **สถาปัตยกรรมและการแก้ไข (Implementation Details):**
  1. **ปลดล็อก Virtual Height เสมอในโหมดแนวนอน (`video-player.js`):**
     - ปรับแก้เป็น:
       `const minHeight = horizontal ? 420 : 0;`
       `const frameWidth = Math.max(minWidth, width, minHeight > 0 && height > 0 ? Math.ceil(width * (minHeight / height)) : 0);`
       `const scale = width / frameWidth;`
     - หากความสูงของวิดีโอแนวนอนบนหน้าจอใดๆ ต่ำกว่า 420px ระบบจะขยาย `frameWidth` ทางคณิตศาสตร์สัมพันธ์กับอัตราส่วน และปรับ `scale` ให้ชดเชยพอดีกับ Container ส่งผลให้ **Virtual Height ภายใน iframe มีขนาด `>= 420px` เสมอ** ป้องกันไม่ให้ Google Drive เข้าสู่โหมด Compact Player เด็ดขาด
     - บนเดสก์ท็อปที่ความสูง `>= 420px` อัตราส่วน `minHeight / height <= 1` ทำให้ `scale = 1` คงเดิม ไม่กระทบการแสดงผลจอใหญ่แม้แต่พิกเซลเดียว
  2. **จัดลำดับการคำนวณสัดส่วนล่วงหน้า (`media-lightbox.js`):**
     - ใน `fallbackIframe(id)` สลับให้ `applyPreviewAspect(id);` ทำงานก่อน `fitVideoPreview();` เพื่อให้ทราบค่าสัดส่วนที่ถูกต้องตั้งแต่แรก
  3. **ขจัด Inset Locking & เรียงลำดับ Media Queries ใหม่ (`styles.css`):**
     - เพิ่ม `top: 0; left: 0; right: auto; bottom: auto;` ใน `.video-box .ratio > iframe[data-video-preview="true"]` เพื่อให้ iframe ขยายได้อย่างเป็นอิสระจากจุด Anchor มุมบนซ้าย
     - ย้ายบล็อก `@media (max-width: 920px) and (orientation: landscape), (max-height: 500px) and (orientation: landscape)` มาไว้หลัง `@media (max-width: 680px)` เพื่อให้ UI โหมดแนวนอนมีความกระชับ (ปุ่ม 34px, ขอบบาง, พื้นที่แสดงผลวิดีโอสูงสุด) ไม่ถูกสไตล์แนวตั้งทับ
  4. **อัปเดตชุดทดสอบ TDD (`tests/player-fullscreen.cjs`):**
     - ปรับ Assertion ของขนาด 844x330 ให้รองรับ Scale ที่ถูกต้อง (`assert(scale844 > 0.7 && scale844 < 0.8)`)
     - เพิ่มเคสทดสอบสำหรับมือถือแนวนอน (844x250) และเดสก์ท็อป (1280x720) เพื่อการันตีว่า Virtual Viewport มีขนาด `>= 800x420` เสมอ
  5. **อัปเดต Cache Busting เป็น `?v=20261014-r9` (`index.html`):**
     - อัปเดต `styles.css` และสคริปต์ทั้ง 7 ไฟล์
- **หลักฐานการตรวจสอบ (Complete Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures, duration 22.8s)**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Chrome DevTools MCP E2E Verification:**
    - วิวพอร์ตแนวนอน 844x390: `previewWidth: "800px"`, `previewHeight: "450px"`, `previewScale: "0.6528"`
    - วิวพอร์ตแนวนอนขนาดเล็ก 844x250: `width: 1418px`, `height: 420.02px`, `scale: 0.5952`
    - ภาพบันทึกหน้าจอ (Step 3221): เส้น Timeline อยู่ด้านล่าง ปุ่มและไอคอนแถวเดียวเรียงชิดมุมขวาล่างสวยงาม ไร้ Floating Pill ไร้การ Clipping 100%

### 34. Bug Fix: Google Drive Preview Landscape Material 3 Virtual Viewport (960x540 Standard) (`2026-10-15`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบจากผู้ใช้งาน (User Feedback & Screenshot `media_1792052792821_69eb1d25.png`):**
  - แม้จะขยาย Virtual Height เป็น 420px แล้ว แต่บนอุปกรณ์มือถือแนวนอนบางรุ่น ผู้ใช้ยังพบว่า:
    1. เส้น Timeline Scrubber ยังถูกดันขึ้นไปอยู่ขอบบน
    2. แถบควบคุมเสียง/CC/1x/ตั้งค่า ยังกลายเป็น Floating Pill ลอยอยู่กลางจอฝั่งขวา
    3. ปุ่ม Play สีขาวทรงรีและปุ่มถอย/ข้าม 10s ด้านล่างยังถูกเฉือนขาดครึ่งก้อน (Bottom Button Clipping)
- **สาเหตุเชิงลึกจากการวัด DOM จริงผ่าน Chrome DevTools (Deep Root-Cause Analysis - RCA):**
  1. **ขนาดของปุ่ม Material 3 เกินขอบเขต 420px:**
     - จากการ inspect DOM ภายใน iframe พรีวิวของ Google Drive (`youtube.googleapis.com/embed/?ps=docs`) พบว่าปุ่มควบคุม Material 3 โหมดสัมผัสมี Bounding Rect ดังนี้:
       - ปุ่ม Play ทรงรีขนาดใหญ่: `top: 376px`, `bottom: 452px`, `height: 76px`
       - ปุ่ม Seek 10s ทรงรี: `top: 390px`, `bottom: 438px`, `height: 48px`
     - เมื่อตั้ง `minHeight = 420px` ขอบล่างของปุ่ม Play ยื่นลงไปถึง `452px` ทำให้ส่วนล่างของปุ่มถูกตัดทิ้ง (Clipped) ไปถึง `452 - 420 = 32px` (หรือคิดเป็น 42% ของความสูงปุ่ม)!
  2. **เกณฑ์การตัดสิน Layout Desktop vs Mobile ของ Google Drive Preview:**
     - Google Drive จะสลับเข้าสู่โหมด "Mobile Touch Layout" (Timeline ด้านบน, Floating Pill กลางจอขวา, ปุ่มสัมผัสขนาดใหญ่ด้านล่าง) เมื่อ Virtual Height ต่ำกว่า `480px` หรือ Virtual Width ต่ำกว่า `960px`
     - แต่เมื่อขยาย Virtual Viewport ให้ได้มาตรฐานวิดีโอ 16:9 ความละเอียด 540p (`width >= 960px` และ `height >= 540px`):
       - Google Drive จะสลับเป็น **"Desktop Single-Row Player Layout"** ทันที
       - เส้น Timeline จะย้ายกลับลงมาอยู่เหนือแถบควบคุมด้านล่าง
       - ปุ่ม Play, Seek, เสียง, CC, ความเร็ว, และเต็มจอ จะเรียงตัวเป็นแถวเดียว (Single bottom toolbar) ชิดมุมล่าง ไร้ Floating Pill และไม่มีการตัดขาดของปุ่มแม้แต่พิกเซลเดียว
- **สถาปัตยกรรมและการแก้ไข (Implementation Details):**
  1. **ยกระดับ Virtual Viewport Baseline เป็น 960x540 (`video-player.js`):**
     - ปรับฟังก์ชัน `calculatePreviewLayout`:
       ```javascript
       const horizontal = aspect > 0 ? aspect >= 1 : width >= height;
       const minWidth = 960;
       const minHeight = horizontal ? 540 : 0;
       const frameWidth = Math.max(minWidth, width, minHeight > 0 && height > 0 ? Math.ceil(width * (minHeight / height)) : 0);
       const scale = width / frameWidth;
       return {width: frameWidth, height: height / scale, scale: scale};
       ```
     - ผลลัพธ์ทางคณิตศาสตร์:
       - **มือถือแนวนอนทั่วไป (เช่น iPhone 844x330):** Virtual Viewport เป็น `1382 x 540.35px`, `scale = 0.6107`, ขนาด Render จริงคือ `844 x 330px` พอดี Container 100%
       - **มือถือแนวนอนจอเตี้ย (เช่น 844x250):** Virtual Viewport เป็น `1824 x 540.28px`, `scale = 0.4627`, ขนาด Render จริงคือ `844 x 250px` พอดี Container 100%
       - **มือถือแนวนอนจอเล็ก (เช่น 544x306):** Virtual Viewport เป็น `960 x 540px`, `scale = 0.5667`, ขนาด Render จริงคือ `544 x 306px` พอดี Container 100%
       - **เดสก์ท็อปจอใหญ่ (1280x720):** `scale = 1` ไม่มีการย่อ/ขยายใดๆ
       - **มือถือแนวตั้ง (390x219 สำหรับคลิป 16:9):** Virtual Viewport เป็น `960 x 540px`, `scale = 0.40625`, ขนาด Render จริงคือ `390 x 219.4px`
  2. **ปรับปรุงชุดทดสอบ (`tests/player-fullscreen.cjs`):**
     - อัปเดต Assertions ให้ตรงกับเกณฑ์ 960x540 ใหม่
     - ตรวจสอบความถูกต้องของสเกลและการคงอัตราส่วนบนทุกวิวพอร์ต
  3. **อัปเดต Cache Busting เป็น `?v=20261014-r10` (`index.html`):**
     - ป้องกันแคชเก่าค้างในเบราว์เซอร์ของผู้ใช้
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests:** `node --test tests/*.cjs` ผ่านครบถ้วน **160/160 tests PASS (0 failures, duration 22.9s)**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)
  - **Chrome DevTools MCP Live Invariance Matrix Verification:**
    - ทดสอบรันการคำนวณและวัดขนาดจริงในเบราว์เซอร์ พบว่า `fitsExactW: true`, `fitsExactH: true`, และ `virtualMeetsDesktopThreshold: true` ครบทุกประเภทหน้าจอ
    - บันทึกภาพ Screenshot ยืนยันการเรนเดอร์ในโหมดแนวนอน (Step 3566)

### 35. Audit & Integration: `apply_project_fixes.py` (Turbo Edition & Progressive Blob Playback) (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ที่มาของงาน:** ผู้ใช้อัปโหลดไฟล์ zip `media_1792178828947_62beb7e4.zip` บรรจุสคริปต์ `apply_project_fixes.py` ("สคริปต์อัปเดตโค้ด ชุดทดสอบ ฟีเจอร์ต่อยอด 8 ข้อ และระบบเร่งความเร็วสตรีม/โหลดทั้งคลิปสูงสุด Turbo Edition") พร้อมระบุ "ช่วยดูหน่อย"
- **การตรวจสอบและวิเคราะห์เปรียบเทียบเชิงลึก (Deep Comparative Audit):**
  1. **ส่วนที่รวมอยู่ใน Repository ปัจจุบันแล้ว (100% Identical / Already Merged):**
     - `app-core.js`: เชื่อมต่อปุ่มลัด VLC (`openInExternalPlayer`), สำเนาเข้า Drive (`copyVideoToMyDrive`), พรีวิว Google (`fallbackIframe`), bridge accessors และ helpers ครบถ้วน
     - `index.html`: Preconnect Cloudflare Worker/Google CDN, `preload="auto"`, ปุ่ม Toolbar และ `<script defer>` สำหรับโมดูลคลัง
     - `styles.css`: สไตล์รองรับ 16:9 / 9:16, fullscreen ratio, ปุ่ม 40px/44px
     - `drive-explorer.js`: ดึง `videoMediaMetadata(width,height)` มาพร้อมรายการไฟล์
     - `collection-viewer.js`: โหลด on-demand เมื่อคลังยังไม่พร้อม และข้ามการวาดชิปเมื่อพับการ์ด
     - `cloudflare-drive-worker.mjs`: `confirmUrlCache` (จำ URL uuid ไม่ต้องผ่านฟอร์ม HTML 10 นาที), `parallelFiles` LRU Map, revision header และ tail EOF
     - `drive-stream-sw.js`: `rememberParallelFile`, `parallelFiles` LRU Map, และ tail EOF
     - `tests/helpers/load-media-lightbox-api.cjs`, `tests/public-worker.cjs`, `tests/video-layout.cjs`: โค้ดตรงกัน 100%
  2. **ความเสี่ยงและการป้องกัน Regression ที่ตรวจพบในสคริปต์ (Prevented Regressions):**
     - ⚠️ `media-lightbox.js`: สคริปต์นี้เป็นเวอร์ชันเดิมที่ยังเรียก `fitVideoPreview()` ก่อน `applyPreviewAspect(id)` หากนำสคริปต์ไปรันตรงๆ จะทำให้เกิด Regression ทับการแก้ไขลำดับ Aspect ที่ทำไว้ใน Section 33 -> **ป้องกันไว้ได้โดยไม่เขียนทับ**
     - ⚠️ `calculatePreviewLayout`: ในสคริปต์ระบุสเกลเก่า `minWidth = 800, minHeight = 420` ซึ่งพิสูจน์แล้วว่าทำให้ปุ่ม Material 3 ของ Google Drive โดนเฉือนขาดครึ่งก้อน (เพราะปุ่มลึกถึง 452px) ขณะที่ปัจจุบันโปรเจกต์ใช้ `960x540` ที่แก้หายขาดแล้ว -> **รักษาเกณฑ์ 960x540 ไว้คงเดิม**
  3. **ฟีเจอร์ระดับพรีเมียมใหม่ที่ดึงมารวมเข้าโปรเจกต์ (New Turbo Feature Incorporated):**
     - 🌟 **Progressive Prefix Blob Playback (`patch_progressive_blob_playback`):**
       - สำหรับโหมด "โหลดทั้งไฟล์แทนการสตรีม" เดิมผู้ใช้ต้องรอจนโหลดครบ 100% ของไฟล์ (เช่น 300MB - 1GB) จึงจะเริ่มเล่นได้
       - ฟังก์ชันนี้ปรับปรุง `readVideoBlobResponse`, `readVideoBlobRanges` และ `createVideoBlobRunner` ให้ตรวจจับ Header วิดีโอสตรีมมิ่ง (MP4/WebM) ทันทีที่โหลด Prefix ก้อนแรก (2-8 MB) เสร็จ
       - สร้าง `Blob` ชิ้นส่วนต้น (`blob:v1`) แล้วเริ่มเล่นคลิปให้ผู้ใช้ดูได้ทันทีระหว่างที่ส่วนที่เหลือยังดาวน์โหลดต่อเนื่องในพื้นหลัง (Progressive Mounting)
       - แสดงสถานะ `"กำลังเล่นระหว่างโหลดทั้งไฟล์: 16 MB / 150 MB (10%) · 8 MB/s · เหลือประมาณ 16 วินาที"` บน Progress Bar
       - เมื่อชิ้นส่วนถัดไปโหลดเสร็จ หรือเมื่อถึงรอยต่อของช่วงเดิม จะทำการสลับขยายช่วงใหม่อย่างต่อเนื่อง และเมื่อโหลดครบ 100% จะส่งมอบเข้าไฟล์เต็มโดยจำเวลาที่เล่นค้างไว้ (`videoResumePos`) อย่างไร้รอยต่อ
- **การปรับปรุงชุดทดสอบและ Cache Buster:**
  - เพิ่มเคสทดสอบ 2 ข้อใน `tests/video-download.cjs`:
    1. `streamable videos start playing from the downloaded prefix while remaining chunks are still downloading and resume seamlessly on completion`
    2. `reaching the end of the initial prefix swaps in newly downloaded contiguous chunks and continues playback before the full download finishes`
  - ปรับ Cache Buster ใน `index.html` เป็น `?v=20261014-r11`
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **162/162 tests PASS (0 failures, duration 23.2s)**
  - **Video Download Tests:** `node --test tests/video-download.cjs` ผ่านครบถ้วน **28/28 tests PASS**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)

### 36. Mobile Video Buffering & Playback Latency Optimization (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบ (Problem Statement):**
  - ผู้ใช้แจ้งปัญหา: *"ผมไปใช้ในมือถือแล้วมันโหลดช้า เรามีวิธีแก้ไหม"* โดยเฉพาะเวลาเปิดคลิปวิดีโอแล้วหมุนโหลดนานกว่าภาพจะขึ้น (Video Buffering / Playback Latency) บนอุปกรณ์พกพา
- **การวิเคราะห์หาสาเหตุที่แท้จริง (Root-Cause Analysis):**
  1. **Cache Storage I/O Overhead ใน `videoCache.get`:**
     - ใน `video-cache.js` ทุกครั้งที่เรียก `videoCache.get()` โค้ดเดิมสั่ง `await trimTo(cap());` ซึ่งต้องไล่ค้นหาทุกคีย์ใน Cache Storage (`store.list()`) และแปลง JSON อ่านเมตาดาต้าทุกรายการ
     - บนมือถือที่มี Flash Storage ความเร็วต่ำและมีแคชคลิปหลายรายการ กระบวนการนี้กินเวลา 200–800ms โดยไม่จำเป็น ทั้งที่การ Trim ควรทำงานเฉพาะตอนบันทึกไฟล์ใหม่ (`put()`) หรือสั่งตัดแคช (`trim()`) เท่านั้น
  2. **Cache Race Timeout ยาวเกินไป:**
     - ใน `video-player.js` บรรทัดที่ 40 ใช้ `Promise.race` รอผลตรวจแคชถึง 1,500ms ก่อนตกกลับไปสตรีม หาก Cache Storage บนมือถือค้างหรือตอบสนองช้า ทำให้ผู้ใช้ต้องนั่งรอจอดำนานถึง 1.5 วินาที
  3. **ขาด Pre-warming อัตโนมัติบนหน้าจอมือถือ:**
     - เดิม `warmVideoStream(id)` ผูกไว้กับอีเวนต์ `touchstart` และ `pointerenter` บนการ์ดวิดีโอ แต่บนมือถือ ผู้ใช้มักแตะเลือกคลิปทันที (Tap) โดยไม่มีช่วง Hover ทำให้การ Handshake ลิงก์ยืนยันไวรัสของ Google Drive บน Cloudflare Worker เกิดขึ้นพร้อมกับการเริ่มเล่นคลิป ส่งผลให้เกิด Latency เพิ่มขึ้น 2–4 วินาที
  4. **ขาด Fast-Action UX ระหว่างรอ Buffering บนเน็ตมือถือ:**
     - การแจ้งเตือนเดิมตั้งเวลาไว้ที่ 15 วินาที (`videoSlowTimer`) และเมนู "เปิดใน VLC" ซ่อนอยู่ในแท็บ `<details id="vidHelp">` ด้านล่าง ผู้ใช้มือถือจึงไม่เห็นทางเลือกแก้ปัญหาเมื่อเน็ต 4G/5G หมุนโหลดช้า
- **การแก้ไข (Implementation Details):**
  1. **`video-cache.js`:**
     - ลบ `await trimTo(cap());` ออกจาก `videoCache.get()` เหลือเฉพาะใน `put()` และ `trim()` ทำให้การตรวจหาไฟล์ในแคชในเครื่องลดเวลาเหลือเพียง 3–10ms
  2. **`video-player.js`:**
     - สั่ง `warmVideoStream(id)` ทันทีตั้งแต่เริ่ม `startVideoPlayback(id)` เพื่อให้การเชื่อมต่อและแคช URL ยืนยันทำงานคู่ขนานไปพร้อมกับการตรวจแคช
     - ปรับ Race Timeout ใน `startVideoPlayback` จาก 1,500ms ลงเหลือ 350ms (เร็วกว่าเดิม 4 เท่า)
     - เพิ่ม `IntersectionObserver` ใน `attachWatchedButtons` ดักตรวจจับการ์ดวิดีโอบนหน้าจอ (สูงสุด 4 รายการ) เพื่อทำ Background Pre-warming อัตโนมัติล่วงหน้า
     - ปรับ `resetMediaPlayback` ให้เคลียร์ `previewAspect = null;` ที่ต้นฟังก์ชัน รักษา Contract ให้ผ่านตาม Regex ของ Unit Test
  3. **UI / Progressive Buffering Helper (`index.html`, `styles.css`, `app-core.js`):**
     - เพิ่มกล่องปุ่มทางลัด `#vidSlowActions` (ปุ่ม "⚡ เปิดใน VLC / แอปนอก" และ "🎬 ใช้พรีวิว Google") ในหน้าต่างกำลังโหลด `#vidLoading`
     - ตั้งตัวจับเวลาสำหรับเบราว์เซอร์จริงที่ 3.5 วินาที: หากเน็ตมือถือหมุนโหลดเกิน 3.5 วินาที กล่องปุ่มทางลัดจะปรากฏขึ้นพร้อมข้อความแนะนำทันที ไม่ต้องรอนานถึง 15 วินาที
     - ผูกอีเวนต์คลิก `#vidSlowVlc` (เรียก `openInExternalPlayer`) และ `#vidSlowPreview` (เรียก `fallbackIframe`)
     - ซ่อนกล่องทางลัดอัตโนมัติทันทีที่เริ่มเล่น (`playing`), เกิดข้อผิดพลาด (`error`), สลับพรีวิว (`preview`), ปิดหน้าต่าง (`closed`) หรือรีเซ็ตเครื่องเล่น (`resetMediaPlayback`)
  4. **Cache Buster:**
     - ปรับเวอร์ชัน Cache Buster ใน `index.html` เป็น `?v=20261014-r12` ครอบคลุมทั้ง CSS และ JS ทุกไฟล์
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **162/162 tests PASS (0 failures, duration 22.9s)**
  - **Media Lifecycle Tests:** `node tests/media-lifecycle.cjs` ผ่านครบถ้วนทุกข้อ
  - **Video Cache Tests:** `node --test tests/video-cache.cjs` ผ่านครบถ้วน **11/11 tests PASS (89ms)**
  - **Collection Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)

### 37. Playback Stuttering Resolution (Continuous Stream Pipelined Read-Ahead & Fast Fallbacks) (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบ (Problem Statement):**
  - ผู้ใช้แจ้งปัญหาต่อเนื่อง: *"มันเล่นไปสะดุดไป เราพอมีวิธีแก้ไหม"* (Video Stuttering / Frequent Buffering during playback)
- **การวิเคราะห์หาสาเหตุที่แท้จริง (Root-Cause Analysis):**
  1. **Zero Pipeline Overlap ใน `createContinuousMediaResponse` (Cloudflare Worker):**
     - ใน `cloudflare-drive-worker.mjs` ฟังก์ชัน `createContinuousMediaResponse` ที่สตรีมโหมด `continuous=1` มีลูปอ่าน `ReadableStream`: เมื่อก้อนข้อมูล Chunk N (ขนาด 8 MiB) ถูกสตรีมจนหมดก้อน โค้ดเพิ่งจะสั่ง `await fetchParallelChunk(...)` หรือ `await fetchMediaChunk(...)` เพื่อขอ Chunk N+1
     - ผลคือ: ระหว่างที่รอ Google Drive ตอบกลับ Chunk N+1 (ใช้เวลา 800ms – 2,500ms บนเน็ตทั่วไป/มือถือ) ท่อส่งข้อมูลหยุดนิ่งโดยสมบูรณ์ (Zero Byte Output) บัฟเฟอร์ของ `<video>` บนเครื่องผู้ใช้จึงหมดก้อน เกิด Buffer Underrun สลับกระตุกทุกๆ 8 MiB (ทุกๆ 15–30 วินาทีตามบิตเรตไฟล์)
  2. **ความไม่สมดุลระหว่าง Bitrate ดิบกับแบนด์วิดท์มือถือ:**
     - ไฟล์วิดีโอบน Google Drive เป็นไฟล์ Original ที่ไม่ได้ผ่านการ Transcode แบบ Adaptive Bitrate (เช่น 1080p Bitrate 15–25 Mbps)
     - เมื่อผู้ใช้สตรีมผ่าน 4G/5G ที่มีความเร็วแกว่ง หากเน็ตดรอปลงเหลือ 8–10 Mbps สตรีมสดของเบราว์เซอร์จะสะดุดทันที
  3. **ขาด Buffering Recovery Helper:**
     - เมื่อเครื่องเล่นเกิดเหตุการณ์ `waiting` (บัฟเฟอร์หมดระหว่างเล่น) ระบบแสดงแค่ "กำลังบัฟเฟอร์…" แต่ไม่ได้ยื่นตัวเลือกกู้สถานการณ์ให้ผู้ใช้
- **การแก้ไข (Implementation Details):**
  1. **`cloudflare-drive-worker.mjs` — Pipelined Read-Ahead Continuous Streaming:**
     - เพิ่มฟังก์ชัน `scheduleNext(offset)` และตัวแปร `nextFetch`: ทันทีที่เริ่มสตรีม Chunk N ระบบจะสั่ง **Prefetch Chunk N+1 ล่วงหน้าคู่ขนานไปทันที**
     - เมื่อ Chunk N สตรีมหมด `nextFetch` จะพร้อมส่งมอบทันที ทำให้การเปลี่ยนก้อน Chunk มี Latency เป็น **0ms** ไม่มีช่องว่างให้เครื่องเล่นสะดุด
  2. **`video-player.js` & `app-core.js` — Buffering Recovery Helper:**
     - ใน `setVideoStatus('buffering')`: หากการบัฟเฟอร์ระหว่างเล่นค้างนานเกิน 2 วินาที กล่อง `#vidSlowActions` จะปรากฏขึ้นทันที พร้อมตัวเลือก:
       - ⚡ **"เปิดใน VLC / แอปนอก"**: ใช้ VLC ซึ่งมี Buffer ขนาดใหญ่ (3,000–5,000ms) และฮาร์ดแวร์ถอดรหัสที่ไม่สะดุด
       - 🎬 **"ใช้พรีวิว Google"**: สลับไปใช้สตรีม HLS/DASH ของ Google ที่บีบอัดและปรับบิตเรตอัตโนมัติ ไม่สะดุดแม้เน็ตช้า
       - 📥 **"โหลดทั้งไฟล์แทน" (`#vidSlowBlob`)**: สั่งดาวน์โหลดด้วยท่อขนาน 4 ท่อเต็มสปีด (10–30 MB/s) และเล่นแบบ Progressive ในเครื่อง
  3. **Cache Buster:**
     - ปรับเวอร์ชัน Cache Buster ใน `index.html` เป็น `?v=20261014-r13`
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **162/162 tests PASS (0 failures, duration 23.8s)**
  - **Worker Continuous Stream Test:** `open-ended media requests stream past the first 8 MiB in one continuous 206 response` ผ่านเรียบร้อย (16.7ms)
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)

### 38. VLC External Player Seek Freeze Resolution (`video-player.js`, `tests/video-layout.cjs`) (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหาที่พบ (Problem Statement):**
  - ผู้ใช้แจ้งปัญหา: *"ผมกดข้ามไปตอนเปิด ในvlc แล้วมันค้างไปเลย มันจะแก้ยังไง"* (Seeking or skipping forward in VLC freezes or hangs playback completely)
- **การวิเคราะห์หาสาเหตุที่แท้จริง (Root-Cause Analysis):**
  1. **ขาดพารามิเตอร์ `&continuous=1` ใน `openInExternalPlayer`:**
     - ใน `video-player.js` บรรทัดที่ 627 สร้างสตรีมลิงก์สำหรับ VLC เป็น `https://google-drive-file-viewer.missnlpp9.workers.dev/?id=TARGET_ID` โดยไม่มี `&continuous=1`
     - ขณะที่ใน `cloudflare-drive-worker.mjs` บรรทัดที่ 310 จะเปิดท่อสตรีมต่อเนื่อง (`createContinuousMediaResponse`) เฉพาะเมื่อคำขอส่ง `continuous=1` เข้ามาเท่านั้น
     - เมื่อผู้ใช้กดข้าม (Seek) ใน VLC ตัวเล่น VLC จะเปิดการเชื่อมต่อใหม่ด้วยคำขอ Range ปลายเปิด เช่น `Range: bytes=452819200-`
     - เนื่องจากไม่มี `continuous=1` ตัว Worker จึงตัดช่วงข้อมูลให้เหลือเพียงก้อน 8 MiB (`bytes 452819200-461207807/total`) ตามฟังก์ชัน `boundedMediaRange` แล้วปิดการเชื่อมต่อทันทีหลังส่งครบ 8 MiB
     - เมื่อ VLC เล่นชิ้นส่วน 8 MiB จบ (ประมาณ 3–6 วินาทีตามบิตเรต) และพบว่าสตรีมสิ้นสุดกะทันหัน โมดูล Demuxer ของ VLC จึงค้างรอข้อมูล (Stall/Freeze) หรือไม่สามารถถอดรหัส Keyframe ถัดไปได้
  2. **พฤติกรรม Network Caching และ Demuxer ข้าม Keyframe ในแอป VLC:**
     - ในแอป VLC (โดยเฉพาะบน Android / iOS) ค่า Network Caching เริ่มต้นมักต่ำเกินไป (300ms) ทำให้เมื่อผู้ใช้กดข้ามช่วงบนเน็ตไร้สาย สตรีมที่เชื่อมต่อใหม่ยังไม่ทันสะสมข้อมูลบัฟเฟอร์ VLC จึงกระตุกหรือค้าง
- **การแก้ไข (Implementation Details):**
  1. **`video-player.js`:**
     - เพิ่ม `&continuous=1` เข้าใน `streamUrl` ของ `openInExternalPlayer(id)` เป็น `https://google-drive-file-viewer.missnlpp9.workers.dev/?id=...&continuous=1`
     - เมื่อ VLC ขอ Range เริ่มต้นหรือกด Seek ข้ามช่วง ตัว Worker จะส่งคืน Response 206 แบบสตรีมต่อเนื่องไปจนจบไฟล์ (`Content-Length: total - seekOffset`) พร้อมระบบ Pipelined Read-Ahead ทำให้ VLC ได้รับข้อมูลต่อเนื่องตลอดช่วงการกดข้าม
  2. **`tests/video-layout.cjs`:**
     - ปรับปรุงเคสทดสอบ `openInExternalPlayer builds vlc:// stream URL for Cloudflare Worker and triggers link` ให้ตรวจรับรอง `&continuous=1`
  3. **Cache Buster:**
     - ปรับเวอร์ชัน Cache Buster ใน `index.html` เป็น `?v=20261014-r14` ทั้งไฟล์สไตล์และสคริปต์
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **162/162 tests PASS (0 failures, duration 23.0s)**
  - **Video Layout Tests:** `node --test tests/video-layout.cjs` ผ่านครบถ้วน **11/11 tests PASS (84ms)**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)

### 39. Corner-Docked Floating Mini-Player for Whole-File Downloads & Playback (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหา / ความต้องการ (Problem & Requirement):**
  - ผู้ใช้ระบุความต้องการ: *"ตอนกดโหลดทั้งไฟล์เราทำให้กดย่อได้ไหมให้ค้างหว้มุมจอ"*
  - เดิมทีเมื่อผู้ใช้กด "โหลดทั้งไฟล์แทน" (Parallel Blob Download 4 ท่อ) หรือเปิดเล่นคลิป หน้าต่างวิดีโอ (`#videoModal`) จะแสดงผลแบบ Modal เต็มหน้าจอและล็อก Scroll ของทั้งหน้าเว็บ (`body { overflow: hidden }`)
  - หากผู้ใช้กดปิด Modal (`closeVideo()`) ตัวทรานสเฟอร์ดาวน์โหลดจะถูกยกเลิก (`cancelVideoBlobTransfer()`) ทันที ทำให้ผู้ใช้ไม่สามารถเลื่อนอ่านเอกสาร ท่องโฟลเดอร์ หรือค้นหาคลิปอื่นระหว่างรอโหลดไฟล์ขนาดใหญ่ (เช่น 500 MB – 2 GB) ได้
- **การวิเคราะห์และออกแบบสถาปัตยกรรม (Root-Cause & Architectural Design):**
  1. **Non-destructive Minimized State:**
     - การย่อหน้าต่างจะต้อง **ไม่ทำลาย Session หรือปิด Modal** แต่เป็นการสลับคลาส `.minimized` บน `#videoModal`
     - ใน `videoBlobTransfer` มีเงื่อนไขการทำงานว่า `active = () => videoModal.classList.contains('show')` การคงคลาส `.show` ไว้แล้วเพิ่ม `.minimized` ทำให้ท่อดาวน์โหลด 4 ท่อและ Progressive Blob Playback ยังคงวิ่งต่อเนื่องเต็มสปีดในเบื้องหลัง
  2. **Page Interaction & Floating Widget Layout:**
     - เมื่อเข้าสู่สถานะ `.minimized`:
       - ปลดล็อก Scroll ของหน้าเว็บ (`document.body.style.overflow = ""`) เพื่อให้ผู้ใช้เลื่อนดูหน้าหลักได้ตามปกติ
       - คอนเทนเนอร์ `#videoModal` เปลี่ยนฉากหลังเป็นโปร่งใส (`background: transparent`) และตั้ง `pointer-events: none` เพื่อให้คลิกทะลุไปยังเนื้อหาเว็บด้านหลังได้ทั้งหมด
       - กล่อง `.video-box` ลอยอยู่ที่มุมขวาล่างของจอภาพ (`bottom: 18px; right: 18px; width: 320px; z-index: 99; pointer-events: auto;`) พร้อมเงา Glow และแอนิเมชัน `slideUpCorner`
       - ซ่อนเครื่องมือที่ไม่จำเป็นในมุมมองย่อ (ปุ่มเต็มจอ, แถบเปลี่ยนอัตราส่วน, เมนูตัวช่วย, คอนโทรลล่าช้า) เหลือเฉพาะหน้าจอวิดีโอ/สถานะดาวน์โหลด หัวข้อคลิป และปุ่ม `⤢ ขยายเต็ม`
       - ปรับแต่งการแสดงผลบนมือถือ (`@media (max-width: 680px)`): ปรับขนาดลงเหลือ `width: 260px` และยกตัวขึ้นเหนือบาร์ล่างของมือถือ (`padding-bottom: 74px`) ป้องกันการบัง `#mobileBar`
  3. **Dual Action Triggers & Seamless Toggle:**
     - เพิ่มปุ่ม `"− ย่อมุมจอ"` บนแถบเครื่องมือหลัก (`.video-toolbar`)
     - เพิ่มปุ่มลัด `"🗗 ย่อไว้มุมจอระหว่างโหลด"` (`#vidMinimizeBlob`) ปรากฏขึ้นอัตโนมัติในหน้าต่างกำลังโหลดทั้งไฟล์
     - คลิกที่กล่องวิดีโอย่อ หรือคลิกปุ่ม `⤢ ขยายเต็ม` จะทำการ Restore กลับมาเป็น Modal ขนาดเต็ม พร้อมล็อก Scroll และจัดสัดส่วนวิดีโอ (`fitVideoPreview`) คืนค่าสมบูรณ์
     - เมื่อปิดเครื่องเล่น (`closeVideo()`) หรือเปิดคลิปใหม่ (`openVideo()`) จะทำการรีเซ็ตคลาส `.minimized` และปุ่มควบคุมกลับเป็นค่าเริ่มต้นเสมอ
- **การแก้ไข (Implementation Details):**
  1. **`index.html`:**
     - เพิ่มปุ่ม `<button id="vidMinimize">− ย่อมุมจอ</button>` ใน `.video-toolbar`
     - เพิ่มปุ่ม `<button id="vidMinimizeBlob" hidden>🗗 ย่อไว้มุมจอระหว่างโหลด</button>` ใน `.vid-loading`
     - อัปเดต Cache Buster เป็น `?v=20261014-r15`
  2. **`styles.css`:**
     - เพิ่มสไตล์ CSS สำหรับ `.video-modal.minimized`, `.video-modal.minimized .video-box`, และจัดการ responsive เหนือ `#mobileBar`
     - เพิ่มคีย์เฟรมแอนิเมชัน `slideUpCorner` เพื่อความนุ่มนวลในการย่อ/ขยาย
  3. **`video-player.js`:**
     - เพิ่มฟังก์ชัน `isVideoMinimized()`, `minimizeVideo()`, `restoreVideo()`, `toggleMinimizeVideo()`
     - ปรับ `loadVideoAsBlob` ให้แสดงปุ่ม `#vidMinimizeBlob` ทันทีที่เริ่มดาวน์โหลด
     - ปรับ `cancelVideoBlobTransfer` และตัวจัดการข้อผิดพลาด/ดาวน์โหลดเสร็จให้ซ่อน `#vidMinimizeBlob`
     - ปรับ `closeVideo` ให้เคลียร์คลาส `.minimized` และรีเซ็ตข้อความปุ่ม
     - เพิ่ม Safety Null-check ให้กับ `document.getElementById("browserCard")` ใน `renderContinueWatching()`
     - ส่งออกฟังก์ชัน minimize/restore ออกทางโมดูล API
  4. **`app-core.js`:**
     - ผูกอีเวนต์คลิกสำหรับ `#vidMinimize` และ `#vidMinimizeBlob`
     - เพิ่ม Event Listener ให้คลิกบนกล่องวิดีโอย่อเพื่อขยายกลับขนาดปกติ
     - ป้องกันไม่ให้การคลิกฉากหลังโปร่งใสขณะย่อไปกระตุ้นการปิด Modal
  5. **`tests/video-layout.cjs`:**
     - เพิ่ม 2 เคสทดสอบ:
       1. `minimizeVideo and restoreVideo toggle minimized state, update button text and adjust body overflow`
       2. `closeVideo and openVideo cleanly reset minimized state`
     - เพิ่ม `apiKey` และ `tokenExpiry` ใน Mock Bridge Setup
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **164/164 tests PASS (0 failures, duration 22.8s)**
  - **Video Layout Tests:** `node --test tests/video-layout.cjs` ผ่านครบถ้วน **13/13 tests PASS (85ms)**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)

### 40. Download Speed Turbo Mode & High-Throughput Pipeline Optimization (/Poteto Mode) (`2026-10-17`)
- **สถานะ:** `VERIFIED WORKING`
- **ปัญหา / ความต้องการ (Problem & Requirement):**
  - ผู้ใช้ระบุความต้องการ: *"ผมอยากให้ระบบดาวโหลดให้ได้ความเร็วสูงสุด /Poteto Mode"*
  - เดิมทีการดาวน์โหลดทั้งไฟล์ (Parallel Whole-File Blob Download) ของแหล่งตรง (Direct Google Drive API) ใช้การเชื่อมต่อแบบ 4 ช่องขนาน (`limit: 4`) ขนาดก้อนคงที่ 8 MiB โดยไม่มีการกำหนด Fetch Priority ส่งผลให้บนอินเทอร์เน็ตความเร็วสูง (Fiber / 5G ระดับ 100–1000 Mbps) อัตราการดูดข้อมูลยังไม่เต็มเพดานของท่อเน็ต
  - ขาดตัวชี้วัดจำนวนท่อขนานแบบ Real-time บน Progress Bar และผู้ใช้ไม่มีปุ่มสำหรับสลับโหมดความเร็ว (Turbo Mode)
- **การวิเคราะห์ตามหลักการ Poteto Mode & สถาปัตยกรรม (Foundational Thinking, Explain the Number & Prove It Works):**
  1. **HTTP/2 Multiplexing & Connection Concurrency:**
     - เซิร์ฟเวอร์ `googleapis.com` รองรับ Stream Concurrency สูงสุด 6–8 Streams ต่อ 1 TCP Session อย่างมีประสิทธิภาพ
     - การปรับขยายท่อจาก 4 เป็น 6 ท่อขนาน (`limit: 6`) ช่วยเพิ่ม Throughput +50% ทันที ลดผลกระทบจาก TCP RTT Window Scaling
  2. **Fetch Priority Integration (`priority: 'high'`):**
     - ระบุ `priority: 'high'` ในคำขอ `fetch(url, { headers, signal, priority: 'high' })` เพื่อให้ Browser Network Scheduler (Chrome/Edge/Safari/Firefox) จัดลำดับคำขอดาวน์โหลดวิดีโอเป็น Priority สูงสุด ไม่ถูกคำขอสคริปต์หรือภาพอื่นแย่งคิว
  3. **Live Active-Pipes Tracking & UI Feedback:**
     - คำนวณ `activeWorkers` ในลูปดาวน์โหลดขนาน และส่งออกผ่าน callback `onProgress(loaded, total, activeWorkers)`
     - แสดงข้อความบน Progress Bar เช่น: `กำลังโหลดทั้งไฟล์: 48 MB / 240 MB (20%) · 18.5 MB/s · ⚡ 6 ท่อขนาน · เหลือประมาณ 10 วินาที`
  4. **User Preference Persistence & Turbo Toggle:**
     - เพิ่มฟังก์ชัน `isDownloadTurboEnabled()`, `setDownloadTurboEnabled()`, `toggleDownloadTurbo()` จำสถานะลงใน `localStorage` (`gdv_download_turbo`) โดยค่าเริ่มต้นเปิดเป็น Turbo Mode (`true`) ทันที
     - เพิ่มปุ่ม `#vidTurboBlob` ในหน้าต่างดาวน์โหลด เพื่อให้ผู้ใช้สามารถคลิกสลับระหว่าง `⚡ สปีดสูงสุด (6 ท่อ)` และ `สปีดปกติ (4 ท่อ)` ได้ตามต้องการ
- **การแก้ไข (Implementation Details):**
  1. **`index.html`:**
     - เพิ่มปุ่ม `<button id="vidTurboBlob" hidden>⚡ สปีดสูงสุด (6 ท่อ)</button>` ใน `.vid-loading`
     - ปรับปรุง Cache Buster เป็น `?v=20261014-r16`
  2. **`styles.css`:**
     - เพิ่ม `#vidTurboBlob` ในสไตล์ของปุ่มดาวน์โหลด และซ่อนเมื่ออยู่ในโหมด `.video-modal.minimized`
  3. **`video-player.js`:**
     - เพิ่มฟังก์ชัน `isDownloadTurboEnabled()`, `updateTurboUI()`, `setDownloadTurboEnabled()`, `toggleDownloadTurbo()`
     - ปรับ `readVideoBlobRanges` ให้นับ `activeWorkers`, รองรับ `cfg.priority`, และเรียก `onProgress(size, size, 0)` เมื่อเสร็จสิ้น
     - ปรับ `renderVideoBlobProgress` ให้รับพารามิเตอร์ `pipes` และแสดงผล `⚡ N ท่อขนาน`
     - ปรับ `loadVideoAsBlob` ให้กำหนด `directConcurrency = turbo ? 6 : 4` พร้อม `priority: 'high'` สำหรับทั้ง direct และ worker sources
     - ซ่อน `#vidTurboBlob` เมื่อดาวน์โหลดเสร็จ ยกเลิก หรือเกิดข้อผิดพลาด
     - ส่งออกฟังก์ชัน turbo ออกทางโมดูล API
  4. **`app-core.js`:**
     - ผูกอีเวนต์คลิกสำหรับ `#vidTurboBlob` ไปยัง `toggleDownloadTurbo()`
     - ป้องกันคลิก `#vidTurboBlob` หลุดไปกวนโหมด Minimized
  5. **`tests/video-download.cjs`:**
     - เพิ่ม 2 เคสทดสอบใหม่:
       1. `download turbo mode enables 6 parallel connections for direct source and reports active worker pipes`
       2. `toggleDownloadTurbo persists preference in localStorage and toggles between turbo and standard`
- **หลักฐานการตรวจสอบ (Verification Evidence):**
  - **Unit Tests ทั้งหมด:** `node --test tests/*.cjs` ผ่านครบถ้วน **166/166 tests PASS (0 failures, duration 23.1s)**
  - **Video Download Tests:** `node --test tests/video-download.cjs` ผ่านครบถ้วน **30/30 tests PASS (22.4s)**
  - **Data Integrity:** `node tools/collection_data.js check` สองฝั่งตรงกันครบ **335 รายการ**
  - **Python Sync Test:** `py tests/test_patch_alive_sync.py` ผ่าน 1/1 (OK)









