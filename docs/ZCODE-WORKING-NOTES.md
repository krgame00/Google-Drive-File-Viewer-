# ZCode Working Notes — Google Drive File Viewer

<!-- session-index:auto:start -->
## 📇 ดัชนีแชตอัตโนมัติ (Stop hook — ห้ามแก้มือ)

อัปเดตอัตโนมัติจากฐานข้อมูล ZCode ทุกครั้งที่ AI ตอบจบรอบ (ใหม่→เก่า, สูงสุด 120 รายการ) — แชตไหนหายจาก UI ให้ยก session id ในรายการนี้ให้ AI เพื่อกู้คืนเนื้อหาเต็มจากฐานข้อมูล

- 17 พ.ย. 22:23 · `f990abef` · "อ่าน ZCODE-WORKING-NOTES.md ก่อนทำงาน" · ✅
- 9 พ.ย. 00:43 · `b8ce9235` · "ออกแบบ UI ใหม่ทั้งหมดให้ดู" · ✅ · ↳ "ลองออกแบบ ui ใหม่ทั้งหมดมาให้ผมดูหน่อย ผมอยากลองดู"
- 8 พ.ย. 23:22 · `6b41960c` · "ห้ามอ่านไฟล์ audit-4-video-playing.png" · ⚠️ · ↳ "ไปทำงานจากที่ผมทำไว้ /poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-…"
- 8 พ.ย. 22:22 · `d1635973` · "ZCode GLM-5.3-Flash Content Filter Block" · ⚠️ · ↳ "ทำต่อ"
- 8 พ.ย. 22:12 · `cb02b926` · "ยังไม่ได้ อย่าไปดูภาพเดิมสิ" · ⚠️ · ↳ "/poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-File-Viewer-/) — โหมด…"
- 8 พ.ย. 21:57 · `4f893414` · "ZCode content filter error on GLM-5.3-Flash" · ⚠️ · ↳ "คุณเห็นงานที่ผมทำงานค้างไว้ไหม"
- 8 พ.ย. 21:44 · `96aa56e6` · "แก้ปัญหา pstack-poteto-help หมุนนานไม่โหลด" · ⚠️ · ↳ "/poteto-mode ตรวจระบบทั้งหมดของเว็บบน production หลังการเปลี่ยนแปลง 2 วันนี้ (https://krgame00.github.io/Google-Drive-File-Viewer-/) — โหมด…"
- 7 พ.ย. 00:16 · `56eb1c14` · "สอบถามวิธี git push" · ⚠️ · ↳ "เล่นไม่ได้เลย มันหมุนนานมาก"
<!-- session-index:auto:end -->

บันทึกประวัติการทำงานของ ZCode ทุก session เรียงจาก **ใหม่ไปเก่า** (ไฟล์นี้เป็นโน้ตหลักของโปรเจกต์ GDFV ตั้งแต่ 2026-11-17 — ประวัติเก่า #1-#75 อยู่ที่ docs/AI-WORKING-NOTES.md ซึ่งเป็น archive ไม่รับ entry ใหม่แล้ว)

กติกา: จบ session ไหนให้เพิ่ม entry ใหม่ **ด้านบนสุด** ของรายการ โดยระบุสิ่งที่ทำ หลักฐาน/ผลตรวจ สถานะ commit และลิงก์เอกสารละเดียดถ้ามี

## ย้ายโน้ตทั้งระบบมามาตรฐานเดียว + hook project-aware (poteto-mode) — 2026-11-17

### Status: hook ทุกตัวรู้จักโปรเจกต์ตัวเองแล้ว — ไฟล์นี้คือโน้ตหลักของ GDFV ตั้งแต่นี้ (push ยังไม่ได้ทำ รอคำสั่ง)

- **ที่มา (วัดจากของจริง):** working-notes.mjs เดิมฉีดหัวโน้ต SuperK (path แข็ง) เข้าทุกแชตทุกโปรเจกต์ และ Stop hook เขียนดัชนีลงไฟล์ SuperK เท่านั้น — พิสูจน์จาก config.json + probe cwd/env ของ hook จริง
- **แก้:** hooks อ่าน `ZCODE_PROJECT_DIR` / `CLAUDE_PROJECT_DIR` / cwd (วัดได้ว่า ZCode ฉีดให้ hook ทุกตัว) → ฉีดและเขียนดัชนีที่ `docs/ZCODE-WORKING-NOTES.md` ของโปรเจกต์นั้น โปรเจกต์ไหนยังไม่มีไฟล์นี้ hook จะไม่ทำอะไรเลย
- **สถานะงานล่าสุดของโปรเจกต์ (ยกจาก archive):** #74 ล็อกอิน zero-click (silent redirect prompt=none, production-verified ถึงขั้น Google ตอบ interaction_required ในแท็บ automation — รอผู้ใช้ reload ในเบราว์เซอร์ตัวเองยืนยัน) · #73 เฟรมพรีวิวบนแถบเวลา (67c9b1f, รอทดสอบกับไฟล์ Drive จริงในเบราว์เซอร์ผู้ใช้) · session คู่ขนาน 2026-11-15/17: `0a7ebda` auth decouple แก้ของค้าง #74 + `800a72e` telemetry บน Cloudflare Worker (live proof แล้ว, suite 231/231)
- **ค้างเปิด:** seek หน่วง 9.8s + status lag (audit #65) · หน้าคอลเลกชันเต็มจอ (optional parity) · SW saga dormant (เครื่องผู้ใช้) · gotcha: ก่อน push grep `^<<<<<<<` ตรงต้นบรรทัดเท่านั้น (ไฟล์เก่ามีข้อความอ้างอิง marker)
