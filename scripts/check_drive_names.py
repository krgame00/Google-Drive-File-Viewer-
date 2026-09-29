#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ตรวจชื่อโฟลเดอร์จริงจาก Google Drive API
รัน: python check_drive_names.py --api-key AIza...  (หรือตั้ง env GDRIVE_API_KEY)
"""
import json, pathlib, argparse, sys, time, re
try:
    import requests
except ImportError:
    print("ต้องลง requests: pip install requests")
    sys.exit(1)

COLLECTIONS = pathlib.Path(__file__).with_name("collections_merged.json")

def load_ids():
    data = json.loads(COLLECTIONS.read_text(encoding="utf-8"))
    return data

def fetch_name(api_key, fid, is_file=False):
    # files?fields=name,mimeType,parents,modifiedTime,owners
    url = f"https://www.googleapis.com/drive/v3/files/{fid}?fields=id,name,mimeType,modifiedTime,owners(displayName)&key={api_key}"
    r = requests.get(url, timeout=15)
    if r.status_code == 200:
        j = r.json()
        return {"ok": True, "name": j.get("name"), "mime": j.get("mimeType"), "modified": j.get("modifiedTime"), "raw": j}
    else:
        try: j = r.json()
        except: j = {"error": r.text[:500]}
        return {"ok": False, "status": r.status_code, "error": j, "status_text": r.text[:300]}

def list_children(api_key, folder_id):
    url = f"https://www.googleapis.com/drive/v3/files?q='{folder_id}' in parents and trashed=false&fields=files(id,name,mimeType)&pageSize=10&key={api_key}"
    r = requests.get(url, timeout=15)
    if r.status_code == 200:
        return r.json().get("files", [])
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-key", default=None, help="Google Drive API key (AIza...)")
    ap.add_argument("--limit", type=int, default=0, help="ตรวจแค่ N ตัวแรก (0=ทั้งหมด)")
    ap.add_argument("--delay", type=float, default=0.12, help="ดีเลย์ระหว่างรีเควส")
    ap.add_argument("--out", default="drive_names_report.json")
    args = ap.parse_args()

    api_key = args.api_key or pathlib.os.environ.get("GDRIVE_API_KEY") or pathlib.os.environ.get("GOOGLE_DRIVE_API_KEY")
    if not api_key or api_key.strip().startswith("AIzaSy..."):
        print("❌ ยังไม่มี API key จริง")
        print("  ใส่แบบนี้: python check_drive_names.py --api-key AIzaSyXXXX...")
        print("  หรือ: set GDRIVE_API_KEY=AIzaSyXXXX && python check_drive_names.py")
        print("  หาได้ที่ https://console.cloud.google.com/apis/credentials → Create API key → เปิด Drive API")
        sys.exit(2)

    items = load_ids()
    if args.limit: items = items[:args.limit]
    print(f"ตรวจ {len(items)} ids ด้วย key {api_key[:10]}...{api_key[-4:]}")

    report = []
    empty = []
    no_name_match = []
    ok = 0
    fail = 0
    for i, it in enumerate(items, 1):
        fid = it["id"]
        # quick sleep to avoid 429
        if i > 1: time.sleep(args.delay)
        res = fetch_name(api_key, fid, it["kind"] == "file")
        entry = {"idx": i, "id": fid, "kind": it["kind"], "parsed_date": it["date"], "parsed_title": it["title"], "source": it.get("source"), "approx": it.get("approx")}
        if res["ok"]:
            entry["drive_name"] = res["name"]
            entry["mime"] = res["mime"]
            entry["modified"] = res["modified"]
            # check if drive_name contains date like 1.5.69
            m = re.search(r"(\d{1,2}\.\d{1,2}\.\d{2})", res["name"] or "")
            entry["name_date"] = m.group(1) if m else None
            if entry["name_date"] and entry["name_date"] != it["date"] and it["date"] != "ไม่ระบุ":
                entry["date_mismatch"] = True
            children = list_children(api_key, fid) if res["mime"] == "application/vnd.google-apps.folder" else None
            if children is not None:
                entry["children_count"] = len(children)
                entry["children_sample"] = [c["name"] for c in children[:3]]
                if len(children) == 0:
                    empty.append(entry)
                    entry["empty"] = True
            ok += 1
            # detect folders with non-date name
            if not m and res["mime"] == "application/vnd.google-apps.folder":
                no_name_match.append(entry)
        else:
            entry["error"] = res["error"]
            entry["status"] = res["status"]
            fail += 1

        report.append(entry)
        # progress
        if i % 20 == 0 or i == len(items):
            print(f"  {i}/{len(items)} ok={ok} fail={fail} empty={len(empty)} no-date-name={len(no_name_match)}")

        # early abort on invalid key
        if fail >= 3 and ok == 0:
            print("\n❌ ดูเหมือน API key ไม่ถูกต้อง (fail 3 ครั้งติด ไม่สำเร็จเลย) — หยุด")
            break

    out = pathlib.Path(args.out)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ เสร็จ — เขียน {out} ({len(report)} รายการ)")
    print(f"   สำเร็จ {ok} / ล้ม {fail} / โฟลเดอร์ว่าง {len(empty)} / ชื่อไม่มีวันที่ {len(no_name_match)}")

    if empty:
        print("\n— โฟลเดอร์ว่างเปล่า (10 ตัวอย่าง) —")
        for e in empty[:10]:
            print(f"  {e['parsed_date']:10} {e['id']}  drive_name={e.get('drive_name')!r}  parsed={e['parsed_title']}")
        print(f"  ... รวม {len(empty)} โฟลเดอร์")

    if no_name_match:
        print("\n— ชื่อไม่มีวันที่ (10 ตัวอย่าง) —")
        for e in no_name_match[:10]:
            print(f"  {e['id']}  name={e.get('drive_name')!r}  parsed={e['parsed_date']}")
        print(f"  ... รวม {len(no_name_match)} รายการ")

    mism = [r for r in report if r.get("date_mismatch")]
    if mism:
        print(f"\n— วันที่ parsed ไม่ตรงชื่อจริง {len(mism)} รายการ —")
        for e in mism[:10]:
            print(f"  {e['id']} parsed={e['parsed_date']} name_date={e['name_date']} name={e['drive_name']!r}")

if __name__ == "__main__":
    main()
