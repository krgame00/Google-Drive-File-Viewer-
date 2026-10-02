import pathlib, re, json, time, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
import urllib.request, urllib.error

IDX = (ROOT / "index.html")
API_KEY = re.search(r'DEFAULT_APIKEY\s*=\s*"([^"]+)"', IDX.read_text(encoding="utf-8")).group(1)
MEGA_MAP = json.loads((ROOT / "reports/drive_mega_map.json").read_text(encoding="utf-8")) if (ROOT / "reports/drive_mega_map.json").exists() else {}

m = re.search(r"const XBEP_COLLECTION = (\[.*?\]);", IDX.read_text(encoding="utf-8"), flags=re.DOTALL)
COLL = json.loads(m.group(1))
IDS = [c["id"] for c in COLL]
print(f"Drive check {len(IDS)} ids key {API_KEY[:12]}...")

def check_drive(ids, api_key):
    import concurrent.futures, time
    results={}
    def fetch(did):
        url = f"https://www.googleapis.com/drive/v3/files/{did}?fields=id,name,mimeType,trashed&key={api_key}"
        for attempt in range(2):
            try:
                with urllib.request.urlopen(url, timeout=12) as r:
                    j=json.loads(r.read().decode())
                    return (did, {"ok": True, "name": j.get("name"), "mime": j.get("mimeType"), "trashed": j.get("trashed")})
            except urllib.error.HTTPError as e:
                body=e.read().decode(errors="ignore")[:500]
                code=e.code
                if code==403 and "rateLimit" in body.lower() and attempt==0:
                    time.sleep(2)
                    continue
                return (did, {"ok": False, "code": code, "body": body[:300]})
            except Exception as e:
                if attempt==0:
                    time.sleep(1)
                    continue
                return (did, {"ok": False, "code": 0, "body": str(e)[:300]})
        return (did, {"ok": False, "code": 0, "body": "unknown"})
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futs={ex.submit(fetch, did): did for did in ids}
        done=0
        for fut in concurrent.futures.as_completed(futs):
            did, res = fut.result()
            results[did]=res
            done+=1
            if done%30==0 or done==len(ids):
                ok=sum(1 for v in results.values() if v.get("ok") and not v.get("trashed"))
                dead=len(results)-ok
                print(f"  {done}/{len(ids)} alive {ok} dead {dead}")
            time.sleep(0.04)  # gentle
    return results

drive_res = check_drive(IDS, API_KEY)
out = (ROOT / "reports/drive_alive_report.json")
out.write_text(json.dumps(drive_res, ensure_ascii=False, indent=2), encoding="utf-8")
alive = sum(1 for v in drive_res.values() if v.get("ok") and not v.get("trashed"))
dead = len(drive_res)-alive
print(f"\nDrive DONE alive {alive} dead {dead} saved {out}")
# detail by code
from collections import Counter
codes=Counter((v.get("code") for v in drive_res.values() if not v.get("ok")))
print("dead codes", dict(codes))
# hit mega map
print(f"MEGA map {len(MEGA_MAP)} to check next")
