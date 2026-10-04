# CONTEXT.md — Google Drive File Viewer (XBep Collection)

## น้ำพุ่ง (Squirting)

**Definition:** วิดีโอที่มีฉากหลั่งน้ำพุ่ง (female squirting) ปรากฏอยู่จริง ไม่ใช่แค่ชื่อไฟล์หรือคำบรรยายบอก

**Why it matters:** เป็นแท็กแยกหมวดหลักที่ผู้ใช้ต้องการกรองดูเฉพาะกลุ่มนี้

**Usage in code:**
- ฟิลด์แท็กใช้ชื่อ `squirting` (boolean) — ห้ามรวมกับ `solo`
- ตัวกรอง UI ใช้ชื่อ `น้ำพุ่ง`
- Related concepts: โซโล่ (Solo)

**Examples:**
- Good: `squirting: true` = เปิดดูแล้วเจอฉากจริง
- Bad: `solo_squirt` (ชื่อเก่าที่รวมสองความหมายไว้ในฟิลด์เดียว — เลิกใช้)
