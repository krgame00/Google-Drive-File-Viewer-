# แผนงานตรวจแก้และเตรียมปล่อย Google Drive File Viewer
วันที่ตรวจสถานะ: 14 ตุลาคม 2026

## เป้าหมาย
ทำให้การเล่นวิดีโอสาธารณะใช้งานได้จริงโดยไม่ต้องล็อกอิน Google, รักษาพฤติกรรมวิดีโอสำหรับบัญชีที่ล็อกอิน, ปิดงานแยกโมดูล/Phase 4 เท่าที่จำเป็น และยืนยันว่าเวอร์ชันที่เผยแพร่ตรงกับโค้ดในเครื่อง

## สถานะจากการตรวจล่าสุด

- [x] แยกโค้ดหลักออกเป็นโมดูล JavaScript; `index.html` เหลือโครงหน้าและ script tags เป็นหลัก
- [x] ตรวจในเครื่องว่าโมดูลหลักและ bridge ได้แก่ `GDVVideoApi`, `GDVExplorerApi`, `GDVLightboxApi`, `GDVCollectionApi` โหลดได้
- [x] รันทดสอบ `node --test tests/*.cjs` ล่าสุด: **158/158 ผ่าน, 0 fail**
- [x] ยืนยันว่าคำขอแบบ Range ไปยัง Worker ตอบกลับ `206 Partial Content` และมี `Content-Range` ที่สอดคล้องกับช่วงที่ขอในการทดสอบก่อนหน้า
- [ ] **ยังไม่ผ่านการยอมรับใช้งานจริง:** ตัวเล่นวิดีโอสาธารณะยังไม่โหลด metadata/เริ่มเล่นใน Chrome แม้ fetch แบบ Range จะได้ข้อมูลกลับมา
- [ ] สถานะการ Deploy ของ Cloudflare Worker ยังต้องตรวจให้แน่ชัดว่าโค้ดบน Cloudflare ตรงกับไฟล์ `cloudflare-drive-worker.mjs` ปัจจุบันหรือไม่; เอกสารเดิมมีบันทึก deployment ที่ไม่ตรงกัน
- [ ] ยังไม่ได้ยืนยันการ Deploy เวอร์ชันปัจจุบันบน GitHub Pages
- [ ] Phase 4 ยังเป็น partial เพราะยังมีบาง test ที่ต้องใช้ VM/browser globals/closure state
- [ ] Git working tree ยังมีงานที่แก้ไขและไฟล์ใหม่ที่ยังไม่ commit; มีไฟล์ถูกลบใน working tree ด้วย ต้องตรวจ diff ก่อนเตรียมปล่อย ห้าม reset/clean หรือ restore แบบเหมารวม

## P0 — แก้ตัวเล่นวิดีโอสาธารณะที่ยังเล่นไม่ได้

### 0.1 เก็บหลักฐานจากการเล่นจริงก่อนแก้เพิ่ม
- [ ] เปิดไฟล์ตัวอย่างเดิมแบบไม่ล็อกอิน Google และบันทึก `currentSrc`, `readyState`, `networkState`, `video.error`, `canPlayType`, `loadedmetadata`, `canplay`, `error` และลำดับเวลา
- [ ] ตรวจ Network ของคำขอที่เกิดจากแท็ก `<video>` จริง ไม่ใช้ผล `fetch()` อย่างเดียว; บันทึก URL route, status, Range, Content-Range, Content-Type และ CORS/CORP ที่เกี่ยวข้อง โดยไม่เก็บ token/cookie
- [ ] ทดลองคลิป H.264/MP4 ขนาดเล็กที่รู้ว่าเล่นได้ในเบราว์เซอร์เดียวกัน เพื่อแยกปัญหาใน player ออกจาก codec/ไฟล์ต้นทาง/ข้อจำกัดของ Google
- [ ] ตรวจ codec ที่อ่านจาก metadata ของไฟล์จริงเทียบกับความสามารถของเบราว์เซอร์ หาก metadata อยู่ท้ายไฟล์ ต้องทดสอบการขอช่วงท้ายด้วย
- [ ] ยืนยันว่าระบบไม่รายงานว่าเล่นสำเร็จเพียงเพราะ Worker ตอบ HTTP 206

### 0.2 ตรวจ Worker และเส้นทาง fallback
- [ ] เปรียบเทียบโค้ด Worker ที่ Deploy จริงกับ `cloudflare-drive-worker.mjs` ในเครื่อง รวมการแปลง open-ended Range, adaptive retry 8 → 2 → 1 MiB, Content-Range และ CORS/CORP
- [ ] เพิ่มวิธียืนยัน revision ที่ปลอดภัย เช่น response header สำหรับ revision และเปิดเผย header ผ่าน CORS หรือบันทึกหลักฐานจาก Cloudflare หลัง Deploy
- [ ] ตรวจลำดับ Worker → Google direct/usercontent → เส้นทางสำรองที่รองรับ และยืนยันว่าแต่ละ route มี diagnostic ชัดเจน ไม่ทับ error ของ route ก่อนหน้า
- [ ] ทบทวน timeout Worker 65 วินาทีหลังได้หลักฐาน Network; อย่าเพิ่ม timeout อีกโดยไม่มีหลักฐานว่าคำขอยังเดินหน้าอยู่
- [ ] ตรวจว่าการ retry, เปลี่ยนไฟล์, ปิด player และ seek ยกเลิกคำขอเก่าได้ และไม่ทำให้ error เก่ากลับมาแสดงในคลิปใหม่

### เกณฑ์ผ่าน P0
- [ ] ในหน้าต่างแบบไม่ล็อกอิน Google คลิปสาธารณะเริ่มเล่นจริงและเกิด `loadedmetadata/canplay`
- [ ] เล่นต่อเนื่องได้ และ seek ไปประมาณ 8 วินาที กลับต้นคลิป และข้ามไปยังช่วงท้ายได้
- [ ] ไม่รับรองความสำเร็จจาก HTTP 206 เพียงอย่างเดียว; ถ้าเล่นไม่ได้ ต้องบอกสาเหตุที่ยืนยันได้หรือระบุว่าไม่ทราบอย่างตรงไปตรงมา
- [ ] ทดสอบอย่างน้อย Chrome desktop และ Chrome บนมือถือ; Brave เป็นการทดสอบเพิ่มเติม
- [ ] รัน regression tests หลังแก้และไม่มี test เดิมเสีย

## P1 — ยืนยัน Worker และ Static Site ที่เผยแพร่
- [ ] Deploy Worker แยกจากเว็บ static หลังตรวจ diff และยืนยัน source ที่จะปล่อย
- [ ] ตรวจว่า GitHub Pages/ปลายทางจริงโหลด script files ตามลำดับเดียวกับ `index.html` ในเครื่อง และไม่ใช้ไฟล์เก่าจาก cache/service worker
- [ ] เปิด URL ที่เผยแพร่จริงในหน้าต่างสะอาด/ไม่ล็อกอิน แล้วทดสอบรายการไฟล์, รูปภาพ, PDF, วิดีโอสาธารณะ และวิดีโอที่ต้องใช้บัญชี
- [ ] ยืนยันว่าไม่มี credential หรือ access token ใน URL, log, Worker response หรือแคชที่ไม่ควรเก็บ
- [ ] บันทึก URL/commit/revision และผล smoke test ในรายงานทดสอบเมื่อพร้อมปล่อย

## P2 — ปิดงาน Phase 4 / Test seams โดยไม่ลดความน่าเชื่อถือ
- [ ] สำรวจ test ที่ยังใช้ VM/source slicing/browser globals แล้วระบุเหตุผลและ dependency ของแต่ละไฟล์
- [ ] ย้ายเฉพาะ test ที่มี API/dependency seam ที่เหมาะสมไปเรียก module API จริง; อย่าเปลี่ยนเป็น `require()` หากยัง mock internal closure ไม่ได้
- [ ] คง VM สำหรับกรณีที่จำเป็นต้องจำลอง Service Worker, browser globals หรือ integration ที่ยังไม่มี seam สาธารณะ
- [ ] ตรวจว่า `loadAppSource()` และการนำ source หลายโมดูลมาต่อกันไม่กลับมาใน test harness
- [ ] อัปเดต `docs/AI-WORKING-NOTES.md` ด้วยสถานะ Phase 4 และหลักฐานจริงเมื่อทำแต่ละส่วนเสร็จ

## P3 — ตรวจความสอดคล้องข้อมูลและ regression ก่อนปล่อย
- [ ] รัน `node --test tests/*.cjs` — baseline ณ วันที่ 14 ตุลาคม 2026 คือ 158/158 ผ่าน
- [ ] รัน `node tools/collection_data.js check` และยืนยันข้อมูลสองฝั่งตรงกันครบ 335 รายการ
- [ ] รัน `py -B tests/test_patch_alive_sync.py` เพื่อยืนยันสคริปต์อัปเดตสถานะ Drive ซิงก์กับ JSON
- [ ] รัน `node --check` กับ JavaScript/Worker ทุกไฟล์ที่เปลี่ยน และ `git diff --check`
- [ ] ทำ browser smoke test อีกครั้งหลังรวมการเปลี่ยนแปลงจริง ไม่ใช้ผลเทสต์ unit แทนการทดสอบในเบราว์เซอร์

## P4 — Git และการปล่อยเวอร์ชัน
- [ ] ตรวจ `git status` และ `git diff --stat` / diff รายไฟล์ แยกงานที่เกี่ยวข้องกับการเล่นวิดีโอออกจากงาน refactor เดิม
- [ ] ตรวจเจตนาการลบ `docs/PHASE3-HANDOFF.md` และ `tests/helpers/load-app-source.cjs` รวมทั้งไฟล์ใหม่ที่ยัง untracked; อย่ากู้คืนหรือลบจนกว่าจะตรวจว่าจำเป็นหรือไม่
- [ ] ตรวจไฟล์ที่ staged แล้วแยกจากไฟล์ที่ยังไม่ stage เพื่อป้องกันการรวมงานผิดชุด
- [ ] ทำ commit/push เฉพาะหลังตรวจ diff, ทดสอบครบ และได้รับคำสั่งปล่อยจากผู้ใช้; ห้ามใช้ `git reset --hard`, `git clean` หรือทิ้ง working tree เพื่อแก้สถานะให้สะอาด
- [ ] หลังเผยแพร่ ให้ตรวจ URL จริงอีกครั้งและจดผล/ปัญหาที่พบลงในรายงาน

## ลำดับทำงานที่แนะนำ
1. P0.1 เก็บ diagnostics จากแท็กวิดีโอจริง และแยก codec/route/browser issue
2. P0.2 ตรวจ revision ของ Worker และแก้ต้นเหตุจากหลักฐาน
3. P0 acceptance test บน Chrome desktop + mobile
4. P3 รันทดสอบทั้งหมดหลังแก้
5. P1 ตรวจ Deploy จริง
6. P2 เก็บงาน test seams ที่เหลือโดยไม่เร่ง refactor ที่ไม่จำเป็น
7. P4 ตรวจ diff แล้วจึงเตรียม commit/release

## ขอบเขต / ข้อควรระวัง
- แผนนี้ไม่ได้ถือว่า playback bug ได้รับการแก้แล้ว; ตอนนี้ยังเป็น blocker จนกว่าจะพิสูจน์การเล่นจริงและ seek ผ่าน
- การที่ Google ส่ง 403/quota หรือไม่อนุญาตไฟล์ ไม่ควรถูกตีความว่า Worker ทำให้ข้ามข้อจำกัดของ Google ได้
- การจัดทำแผนไม่เปลี่ยนการตั้งค่า Cloudflare/GitHub Pages และไม่ commit/push โค้ดใด ๆ
