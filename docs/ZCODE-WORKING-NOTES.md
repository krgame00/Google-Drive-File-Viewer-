# ZCode Working Notes — Google Drive File Viewer

<!-- session-index:auto:start -->
## 📇 ดัชนีแชตอัตโนมัติ (Stop hook — ห้ามแก้มือ)

อัปเดตอัตโนมัติจากฐานข้อมูล ZCode ทุกครั้งที่ AI ตอบจบรอบ (ใหม่→เก่า, สูงสุด 120 รายการ) — แชตไหนหายจาก UI ให้ยก session id ในรายการนี้ให้ AI เพื่อกู้คืนเนื้อหาเต็มจากฐานข้อมูล

- 18 พ.ย. 01:19 · `f990abef` · "อ่าน ZCODE-WORKING-NOTES.md ก่อนทำงาน" · ⚠️ · ↳ "เป็นไงบ้าง"
- 9 พ.ย. 00:43 · `b8ce9235` · "ออกแบบ UI ใหม่ทั้งหมดให้ดู" · ✅ · ↳ "ลองออกแบบ ui ใหม่ทั้งหมดมาให้ผมดูหน่อย ผมอยากลองดู"
- 8 พ.ย. 23:22 · `6b41960c` · "ห้ามอ่านไฟล์ audit-4-video-playing.png" · ⚠️ · ↳ "ไปทำงานจากที่ผมทำไว้ /poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-…"
- 8 พ.ย. 22:22 · `d1635973` · "ZCode GLM-5.3-Flash Content Filter Block" · ⚠️ · ↳ "ทำต่อ"
- 8 พ.ย. 22:12 · `cb02b926` · "ยังไม่ได้ อย่าไปดูภาพเดิมสิ" · ⚠️ · ↳ "/poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-File-Viewer-/) — โหมด…"
- 8 พ.ย. 21:57 · `4f893414` · "ZCode content filter error on GLM-5.3-Flash" · ⚠️ · ↳ "คุณเห็นงานที่ผมทำงานค้างไว้ไหม"
- 8 พ.ย. 21:44 · `96aa56e6` · "แก้ปัญหา pstack-poteto-help หมุนนานไม่โหลด" · ⚠️ · ↳ "/poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-File-Viewer-/) — โหมด…"
- 7 พ.ย. 00:16 · `56eb1c14` · "สอบถามวิธี git push" · ⚠️ · ↳ "เล่นไม่ได้เลย มันหมุนนานมาก"
<!-- session-index:auto:end -->

## แก้ปุ่มสุ่ม: สุ่มได้แต่อันเดิม (poteto-mode, playbook Bug fix) — 2026-11-18

### Status: commit d38ecd1 (ยังไม่ push) — red-first + verify บนหน้าจริงแล้ว (กดสุ่ม 8 ครั้งเปลี่ยนหน้าในแอปทุกครั้ง)

- **อาการ (ผู้ใช้รายงาน):** กดปุ่มสุ่มแล้วได้แต่อันเดิม หน้าไม่เปลี่ยน
- **root cause (วัดบน production):** pool มีชีวิต 34 = โฟลเดอร์ 21 + ไฟล์ 13 และไฟล์ทั้ง 13 เปิดในแอปไม่ได้ (.rar / ไม่มี drive_mime) — openCollectionItem เขวไป window.open หน้าโหลดไฟล์ Drive ในแท็บใหม่ → ~38% ของการกดไม่เปลี่ยนอะไรในแอปเลย (กดซ้ำที่ดูเหมือน "อันเดิม" จริง ๆ คือกดถัดไปโดนไฟล์ hash เลยไม่ขยับ)
- **แก้:** randomOpenable(c) กรอง pool ของปุ่มสุ่มให้เหลือรายการที่เปิดในแอปได้จริง (โฟลเดอร์ หรือไฟล์ video/image/pdf mime หรือนามสกุลสื่อ) — fallback รายการตายที่มี mega/od คงเดิม, red-first เทสต์บล็อก 7 ใน tests/collection-random.cjs (แดงจริง: "archive file without mime must never be picked" → เขียว)
- **หลักฐานหน้าจริง (server :8033):** กดสุ่ม 8 ครั้งติด → เปลี่ยนหน้าในแอปทุกครั้ง (hash คนละโฟลเดอร์ 8 ที่) ไม่มี window.open แม้แต่ครั้งเดียว ไม่มี console error
- **buster:** collection-viewer 20261109-r3 → 20261118-r1 ในคอมมิตเดียวกัน
- **ค้าง:** push รอคำสั่ง (รวมกับ 7dc00d2/084a1d2 ที่ค้างจากโน้ตมาตรฐาน + audit) · หลัง push ควรยืนยันซ้ำบน production ของจริง


## ตรวจระบบทั้งหมดบน production (audit หลัง telemetry + auth decouple + seek preview) — 2026-11-17

### Status: ผ่านทุกระบบที่ตรวจได้ใน automation ไม่มี console error — เหลือ 2 จุดที่ต้องยืนยันในเบราว์เซอร์ผู้ใช้ (ของที่พ่วง Google session ของตัวเอง)

- **Deploy/CDN:** buster ล่าสุดครบ (styles 20261115-r1, video-player 20261117-r1, drive-explorer 20261115-r2, collections-data 20261117-r1) — origin tip 812d4a4
- **ล็อกอิน zero-click:** redirect ยิงทุก boot จริง (navigation entry กลับมา #error=interaction_required เหมือนเดิม — โปรไฟล์ automation ไม่มี Google session) + loop guard ถูกต้องไม่มีลูป + ป้าย reconnect แสดงถูก · **ตัวชี้ขาดยังเป็น reload ในเบราว์เซอร์ผู้ใช้**
- **คลิกเปิดคลิปแบบไม่ล็อกอิน:** ensureToken พยายาม popup เงียบก่อน (คลิกจริง = gesture ผ่าน) แล้วเปิดหน้า sign-in เมื่อไม่มี session — พฤติกรรมถูกดีไซน์ ในเบราว์เซอร์ผู้ใช้ popup เงียบจะปิดตัวเองแล้วเล่นต่อ
- **หน้าแรก/คอลเลกชัน:** rail (.page-rail), หัวแถวเดียว, ชั้นเดือน ก.ย./ต.ค./พ.ย. การ์ด 60 ใบพร้อมจุด alive/dead, ดูต่อซ่อนถูกต้องเมื่อไม่มีประวัติ, search สองทางเดินถูก (topSearch→collSearch), deep link #/f/... อัปเดต, breadcrumbs + toolbar ZIP + ชิปกรอง (ทั้งหมด 10/โฟลเดอร์ 5/วิดี 5) ครบ
- **มือถือ 390:** แถบแท็บสองชั้น 5 ปุ่ม, rail ซ่อน, search คงค่าข้าม viewport, กลับเดสก์ท็อปคืนทุกอย่างถูก
- **telemetry:** GET /telemetry 200, POST คืน {ok:true,stored:1}, sender อยู่ใน video-player ที่เสิร์ฟ (7 จุด) — หมายเหตุ: ผมยิง probe "audit-probe" 1 รายการจะปรากฏใน dashboard ของคุณ
- **console:** 0 error / 0 unhandledrejection ระหว่าง sweep ทั้งหมด
- **ค้าง (ของผู้ใช้):** (1) reload เบราว์เซอร์ตัวเองยืนยัน zero-click สำเร็จ (2) เปิดคลิปจริงแล้วชี้แถบเวลาดูเฟรมพรีวิวกับไฟล์ Drive จริง


บันทึกประวัติการทำงานของ ZCode ทุก session เรียงจาก **ใหม่ไปเก่า** (ไฟล์นี้เป็นโน้ตหลักของโปรเจกต์ GDFV ตั้งแต่ 2026-11-17 — ประวัติเก่า #1-#75 อยู่ที่ docs/AI-WORKING-NOTES.md ซึ่งเป็น archive ไม่รับ entry ใหม่แล้ว)

กติกา: จบ session ไหนให้เพิ่ม entry ใหม่ **ด้านบนสุด** ของรายการ โดยระบุสิ่งที่ทำ หลักฐาน/ผลตรวจ สถานะ commit และลิงก์เอกสารละเดียดถ้ามี

## ย้ายโน้ตทั้งระบบมามาตรฐานเดียว + hook project-aware (poteto-mode) — 2026-11-17

### Status: hook ทุกตัวรู้จักโปรเจกต์ตัวเองแล้ว — ไฟล์นี้คือโน้ตหลักของ GDFV ตั้งแต่นี้ (push ยังไม่ได้ทำ รอคำสั่ง)

- **ที่มา (วัดจากของจริง):** working-notes.mjs เดิมฉีดหัวโน้ต SuperK (path แข็ง) เข้าทุกแชตทุกโปรเจกต์ และ Stop hook เขียนดัชนีลงไฟล์ SuperK เท่านั้น — พิสูจน์จาก config.json + probe cwd/env ของ hook จริง
- **แก้:** hooks อ่าน `ZCODE_PROJECT_DIR` / `CLAUDE_PROJECT_DIR` / cwd (วัดได้ว่า ZCode ฉีดให้ hook ทุกตัว) → ฉีดและเขียนดัชนีที่ `docs/ZCODE-WORKING-NOTES.md` ของโปรเจกต์นั้น โปรเจกต์ไหนยังไม่มีไฟล์นี้ hook จะไม่ทำอะไรเลย
- **สถานะงานล่าสุดของโปรเจกต์ (ยกจาก archive):** #74 ล็อกอิน zero-click (silent redirect prompt=none, production-verified ถึงขั้น Google ตอบ interaction_required ในแท็บ automation — รอผู้ใช้ reload ในเบราว์เซอร์ตัวเองยืนยัน) · #73 เฟรมพรีวิวบนแถบเวลา (67c9b1f, รอทดสอบกับไฟล์ Drive จริงในเบราว์เซอร์ผู้ใช้) · session คู่ขนาน 2026-11-15/17: `0a7ebda` auth decouple แก้ของค้าง #74 + `800a72e` telemetry บน Cloudflare Worker (live proof แล้ว, suite 231/231)
- **ค้างเปิด:** seek หน่วง 9.8s + status lag (audit #65) · หน้าคอลเลกชันเต็มจอ (optional parity) · SW saga dormant (เครื่องผู้ใช้) · gotcha: ก่อน push grep `^<<<<<<<` ตรงต้นบรรทัดเท่านั้น (ไฟล์เก่ามีข้อความอ้างอิง marker)
