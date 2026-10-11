# AI Working Notes — Google Drive File Viewer (XBep Collection)

เอกสารนี้บันทึกสถานะการทำงาน การตรวจสอบระบบ และหลักฐานการทดสอบ (Verification Evidence) ตามกฎการทำงานของโปรเจกต์

## สถานะโมดูลหลัก (Current Baseline Status)

| โมดูล / ฟีเจอร์ | สถานะ | รายละเอียดและหลักฐานการทดสอบ (Verification Evidence) |
| --- | --- | --- |
| **Account Streaming (`drive-stream-sw.js`)** | `VERIFIED WORKING` | สตรีมผ่าน Service Worker ด้วย Bearer Token, รองรับ Bounded Range (16 MiB), 4-way Parallel Sub-intervals, และ Read-ahead Prefetch พร้อมส่ง `controller.signal` ยกเลิกทั้ง 4 ท่อเมื่อผู้ใช้ Seek ข้ามช่วง (`node --test tests/authenticated-stream.cjs` — 27/27 PASS) |
| **Public Stream Worker (`cloudflare-drive-worker.mjs`)** | `VERIFIED WORKING` | สตรีมสาธารณะผ่าน Cloudflare Worker, แปลง Range ปลายเปิดเป็นช่วง 8 MiB, รองรับการลดขนาดช่วงเมื่อติด `downloadQuotaExceeded` และทำ Parallel Sub-intervals (`node --test tests/public-worker.cjs` — PASS) |
| **Completed Video Cache (`video-cache.js`)** | `VERIFIED WORKING` | แคชคลิปที่โหลดจบลง Cache Storage แยกตาม Scope บัญชี, จำกัดขนาดแบบ LRU, ป้องกัน Race Condition ด้วย `navigator.locks` และ `generation` epoch (`node --test tests/video-cache.cjs` — PASS) |
| **Image & PDF Lightbox Viewer (`index.html`)** | `VERIFIED WORKING` | รองรับการซูม/ลาก (Pinch/Pan/Double-tap) ทั้งภาพปกติ (`lbImg`) และเอกสาร PDF (`pdfCanvas` ผ่าน PDF.js), แสดงปุ่ม `#lbPrev`/`#lbNext` ในโหมด PDF ให้กดข้ามไปดูรูปถัดไปในโฟลเดอร์ได้ทันที, รอ `await prevTask.promise` หลัง `cancel()` ป้องกัน Canvas Lock ตอนกดข้ามหน้ารัวๆ และเชื่อมลำดับมีเดียระหว่าง PDF กับรูปภาพในโฟลเดอร์ (`node tests/image-viewer.cjs` & `node tests/media-lifecycle.cjs` — PASS) |
| **Collection Search & Tag Sync (`index.html`, `ADR-0001`)** | `VERIFIED WORKING` | ค้นหาชื่อไทยแบบ NFC/NFD normalize, กรองแท็ก `💦 น้ำพุ่ง` (`squirting`), ซิงก์ `gdv-tags.json` ขึ้น Drive `appDataFolder` แบบรอผล `await tagPushMerged` จริงก่อนแสดง `"บันทึกแล้ว ✓"` และตรวจ `COLL_CHECKED_AT` แบบไดนามิกไม่พังเมื่อสคริปต์รายวันอัปเดตเวลา (`node tests/collection-search.cjs` — PASS) |
| **Collection Data Sync (`tools/collection_data.js`)** | `VERIFIED WORKING` | ซิงก์ข้อมูลระหว่าง `collections_merged.json` และ `index.html` ตรงกันทั้งสองฝั่ง (`node tools/collection_data.js check` — 325 รายการตรงกัน) |
| **UI/UX Typography, WCAG Contrast, Light Theme, Toolbar & P2 Polish (`index.html`)** | `VERIFIED WORKING` | เปิดใช้งานฟอนต์ `"Noto Sans Thai"` ใน `body`, ปรับลำดับขั้นขนาดหัวข้อ (`≥ 1.25x` Modular Type Scale), แยก `--accent-hover` (`#4e5ac0`, คอนทราสต์ `5.41:1` ผ่าน WCAG AA) กับ `--accent-text`, เพิ่ม CSS Variables สำหรับโหมดสว่าง (`html[data-theme="light"]`), จัดระเบียบแถบเครื่องมือ `#collectionsCard` ด้วย `<details class="coll-filter-drawer" id="collFilterDrawer">`, เพิ่มป้ายชื่อไฟล์ `#lbTitle` ใน Lightbox, ปรับ `.vid-progress-bar` และ `--shadow-glow` ให้ผ่านเกณฑ์ GPU/Elevation และลบกฎ CSS ที่ซ้ำซ้อน (`impeccable detect --json index.html` — `[]` 0 warnings & `node --test tests/*.cjs` — 130/130 PASS) |

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
