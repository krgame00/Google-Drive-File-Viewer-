# ADR-0001: ซิงก์แท็กน้ำพุ่งผ่าน Drive appData

**Status:** accepted
**Date:** 2026-10-04
**Deciders:** krgame00 + Hermes

## Context

แท็กน้ำพุ่ง (squirting) ต้องจำข้ามเครื่อง แต่เว็บเป็น static บน GitHub Pages ไม่มีเซิร์ฟเวอร์เก็บ state กลาง

## Decision

เก็บแท็กในไฟล์ `gdv-tags.json` บน Drive appData Folder ของผู้ใช้เอง (`drive.appdata` scope) ผูกกับปุ่ม Sign-in ที่มีอยู่แล้ว กดปุ่ม 💦 แล้วบันทึก local ทันที + push ขึ้น Drive อัตโนมัติ (debounce 1.5 วิ) ชนกันให้เครื่องที่กดหลังสุดชนะ (last-write-wins ต่อ id)

## Rationale

ตัวเลือกที่พิจารณา: (1) Export/Import ไฟล์ manual — ชัวร์แต่ต้องทำเองทุกครั้ง ไม่ผ่านเพราะผู้ใช้ขอออโต้ (2) ฝังแท็กใน URL — ย้ายเครื่องได้แต่ไม่มีที่เก็บถาวร เหมาะเป็นทางเสริมไม่ใช่หลัก (3) commit กลับ GitHub ผ่าน PAT — ออโต้ได้แต่ต้องฝัง token ในเบราว์เซอร์ หลุดแล้วคนอื่นเขียน repo ได้ เสี่ยงเกิน (4) Drive appData — ข้อมูลอยู่ใน Drive ผู้ใช้เอง มองเห็นเฉพาะแอปเรา ไม่ต้องมีเซิร์ฟเวอร์ ไม่ต้องฝัง token

## Consequences

- ต้องเพิ่ม `drive.appdata` ใน OAuth scope → ผู้ใช้เก่าต้อง sign-in ใหม่ 1 ครั้ง (popup consent)
- ยังไม่ sign-in = เก็บ local อย่างเดียว แล้วรวมตอน sign-in (merge ตาม timestamp)
- ฟิลด์เก่า `solo_squirt` ใน `collections_merged.json` ยังคงอยู่เป็นค่า default; override อยู่ใน `gdv-tags.json` แยกกัน ไม่แก้ไฟล์คลัง
