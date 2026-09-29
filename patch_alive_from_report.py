import pathlib, re, json
IDX = pathlib.Path(r"C:/Users/PC/ZCodeProject/index.html")
REPORT = pathlib.Path(r"C:/Users/PC/ZCodeProject/drive_alive_report.json")
if not REPORT.exists():
    print("no report"); raise SystemExit(1)
rep = json.loads(REPORT.read_text(encoding="utf-8"))
s = IDX.read_text(encoding="utf-8")
m = re.search(r"const XBEP_COLLECTION = (\[.*?\]);", s, flags=re.DOTALL)
coll = json.loads(m.group(1))
changed=0
for c in coll:
    did=c.get("id")
    r=rep.get(did)
    if not r: continue
    alive = bool(r.get("ok") and not r.get("trashed"))
    was_dead = bool(c.get("dead"))
    now_dead = not alive
    if was_dead != now_dead:
        changed+=1
    c["dead"]=now_dead
    if now_dead:
        c["dead_status"]=r.get("code",404)
        c["drive_name"]=None
    else:
        c["dead_status"]=None
        # keep drive_name from report if we have it
        if r.get("name"):
            c["drive_name"]=r["name"]
            # try extract date
            import re as re2
            dm=re2.search(r"\d{1,2}\.\d{1,2}\.\d{2}", r["name"] or "")
            c["drive_date_in_name"]=dm.group(0) if dm else None
# write back
new_full = "const XBEP_COLLECTION = " + json.dumps(coll, ensure_ascii=False) + ";"
s2 = s[:m.start()] + new_full + s[m.end():]
# อัปเดตป้ายวันตรวจสถานะที่การ์ดคลังแสดง (COLL_CHECKED_AT ใน index.html)
import datetime
now = datetime.datetime.now()
THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
stamp = f'{now.day} {THAI_MONTHS[now.month-1]} {str(now.year+543)[-2:]} ({now.hour:02d}:{now.minute:02d} น.)'
s2, nsub = re.subn(r'const COLL_CHECKED_AT = ".*?";', f'const COLL_CHECKED_AT = "{stamp}";', s2)
if nsub == 1:
    print(f"check time -> {stamp}")
else:
    print(f"WARN: COLL_CHECKED_AT not updated (found {nsub})")
IDX.write_text(s2, encoding="utf-8")
print(f"patched {changed} changed, total {len(coll)} dead {sum(1 for c in coll if c.get('dead'))} alive {sum(1 for c in coll if not c.get('dead'))}")
# also save summary
alive=sum(1 for c in coll if not c.get("dead"))
dead=len(coll)-alive
print(f"alive {alive} dead {dead}")
