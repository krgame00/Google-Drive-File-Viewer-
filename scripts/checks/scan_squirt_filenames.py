#!/usr/bin/env python3
"""Scan filenames inside collection folders (missing from deep-scan cache) + keyword match for น้ำพุ่ง."""
import json, pathlib, urllib.request, urllib.parse, time, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
IDX = ROOT / "index.html"
CACHE = ROOT / "reports" / "drive_deep_scan_cache.json"
COLLECTIONS = ROOT / "collections_merged.json"

key = re.search(r'DEFAULT_APIKEY\s*=\s*"([^"]+)"', IDX.read_text(encoding="utf-8")).group(1)
merged = json.loads(COLLECTIONS.read_text(encoding="utf-8"))
cache = json.loads(CACHE.read_text(encoding="utf-8"))

need = [x for x in merged if x.get("kind") == "folder" and not x.get("dead") and x["id"] not in cache]
print(f"cache has {len(cache)}, need scan {len(need)} alive folders (skip dead)")

def list_children(fid):
    files, page = [], None
    for _ in range(30):
        q = urllib.parse.quote(f"'{fid}' in parents and trashed=false")
        url = f"https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id,name,mimeType,size),nextPageToken&pageSize=1000&key={key}"
        if page: url += "&pageToken=" + urllib.parse.quote(page)
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                j = json.loads(r.read().decode())
        except Exception as e:
            return None, str(e)[:120]
        if "error" in j:
            return None, str(j["error"])[:120]
        files.extend(j.get("files", []))
        page = j.get("nextPageToken")
        if not page: break
        time.sleep(0.08)
    return files, None

ok, fail = 0, 0
for i, x in enumerate(need, 1):
    files, err = list_children(x["id"])
    if files is None:
        fail += 1
        print(f"  [{i}/{len(need)}] FAIL {x['id']} {x.get('date')} :: {err}")
    else:
        ok += 1
        cache[x["id"]] = {"date": x.get("date"), "title": x.get("title"),
                          "fileCount": len(files), "files": [f.get("name", "") for f in files]}
    if i % 20 == 0 or i == len(need):
        print(f"  {i}/{len(need)} ok={ok} fail={fail}")
        CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    time.sleep(0.12)
    if fail >= 5 and ok == 0:
        print("ABORT: key likely invalid"); sys.exit(2)

CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

KW = ["squirt", "squirting", "shiofuki", "潮吹", "น้ำพุ่ง", "พุ่ง"]
hits = {}
for fid, v in cache.items():
    for fn in v.get("files", []):
        fl = fn.lower()
        for kw in KW:
            if kw.lower() in fl:
                hits.setdefault(fid, []).append((kw, fn))
                break

print(f"\nDONE cache={len(cache)} ok={ok} fail={fail}")
print(f"squirt-keyword folders: {len(hits)}")
for fid, lst in hits.items():
    m = next((x for x in merged if x["id"] == fid), {})
    print(f"  {m.get('date','?'):10} {m.get('title','?')[:40]:42} files={len(lst)} e.g. {lst[0][1][:70]}")
out = ROOT / "reports" / "squirt_matched_files_report.json"
out.write_text(json.dumps([{"id": f, "files": n} for f, n in hits.items()], ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out)
