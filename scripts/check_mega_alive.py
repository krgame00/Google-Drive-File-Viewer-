import pathlib, re, json, time, urllib.request, urllib.error
import concurrent.futures

IDX = pathlib.Path(r"C:/Users/PC/ZCodeProject/index.html")
m = re.search(r"const XBEP_COLLECTION = (\[.*?\]);", IDX.read_text(encoding="utf-8"), flags=re.DOTALL)
coll = json.loads(m.group(1))
targets = [(c["id"], c.get("mega_url"), c.get("date","ไม่ระบุ"), c.get("title","")) for c in coll if c.get("mega_url")]
print(f"MEGA check {len(targets)} links")

# extract handle from mega_url
def handle_of(url):
    mm = re.search(r"mega\.nz/folder/([A-Za-z0-9_-]+)", url or "")
    return mm.group(1) if mm else None

def check_one(item):
    did, mega_url, date, title = item
    handle = handle_of(mega_url)
    if not handle:
        return (did, {"ok": False, "code": -1, "handle": handle, "error": "bad url"})
    url = f"https://g.api.mega.co.nz/cs?id=0&n={handle}"
    payload = [{"a":"f","c":1}]
    data = json.dumps(payload).encode()
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=15) as r:
                txt = r.read().decode(errors="ignore")
                if txt.startswith("["):
                    # alive — try count children
                    try:
                        j=json.loads(txt)
                        cnt = len(j[0].get("f",[])) if j and isinstance(j[0], dict) else 0
                    except: cnt = -1
                    return (did, {"ok": True, "handle": handle, "children": cnt, "raw": txt[:300]})
                else:
                    # error code like -2
                    code = int(txt.strip().split()[0]) if txt.strip().lstrip("-").isdigit() else txt.strip()[:20]
                    try: code = int(txt.strip())
                    except: pass
                    return (did, {"ok": False, "handle": handle, "code": code, "raw": txt[:300]})
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="ignore")[:300] if hasattr(e,'read') else str(e)
            if attempt==0:
                time.sleep(0.8)
                continue
            return (did, {"ok": False, "handle": handle, "code": e.code, "error": body[:300]})
        except Exception as e:
            if attempt==0:
                time.sleep(0.8)
                continue
            return (did, {"ok": False, "handle": handle, "code": 0, "error": str(e)[:300]})
    return (did, {"ok": False, "handle": handle, "code": 0, "error": "unknown"})

results={}
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    futs={ex.submit(check_one, it): it for it in targets}
    done=0
    for fut in concurrent.futures.as_completed(futs):
        did, res = fut.result()
        results[did]=res
        done+=1
        if done%30==0 or done==len(targets):
            ok=sum(1 for v in results.values() if v.get("ok"))
            print(f"  {done}/{len(targets)} alive {ok} dead {done-ok}")
        time.sleep(0.08)

out = pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/mega_alive_report.json")
out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
alive=sum(1 for v in results.values() if v.get("ok"))
dead=len(results)-alive
print(f"\nMEGA DONE alive {alive} dead {dead} saved {out}")
from collections import Counter
codes=Counter(str(v.get("code")) for v in results.values() if not v.get("ok"))
print("dead codes", dict(codes))
# per date
from collections import defaultdict
per=defaultdict(lambda:[0,0])
for did, v in results.items():
    # find date
    date = next((c.get("date") for c in coll if c["id"]==did), "?")
    if v.get("ok"): per[date][0]+=1
    else: per[date][1]+=1
for d in sorted(per.keys(), key=lambda x: 999999 if x in ["?","ไม่ระบุ"] else int(x.split(".")[2])*10000+int(x.split(".")[1])*100+int(x.split(".")[0])):
    print(f" {d:10s} alive:{per[d][0]:2d} dead:{per[d][1]:2d}")
# map mega_url -> status for patch
import json as js
detail_path = pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/mega_alive_detail.json")
detail_path.write_text(js.dumps({did: {"mega_url": next(c["mega_url"] for c in coll if c["id"]==did), "ok": v.get("ok"), "code": v.get("code"), "children": v.get("children")} for did,v in results.items()}, ensure_ascii=False, indent=2), encoding="utf-8")
