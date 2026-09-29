#!/usr/bin/env python3
import json, pathlib, urllib.request, urllib.parse, time
from collections import defaultdict

key = "AIzaSyBytkL4FtZuSfo_XMnZYujrcgrud6NqF9g"
merged = json.loads(pathlib.Path(r"C:/Users/PC/ZCodeProject/collections_merged.json").read_text(encoding="utf-8"))
alive = [x for x in merged if not x.get("dead")]

def month_key(d):
    if d=="ไม่ระบุ": return "ไม่ระบุ"
    p=d.split(".")
    return f"{p[1]}.{p[2]}"

def list_children(fid):
    files=[]
    page=None
    for _ in range(30):
        q=urllib.parse.quote(f"'{fid}' in parents and trashed=false")
        url=f"https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id,name,mimeType,size),nextPageToken&pageSize=1000&key={key}"
        if page: url+="&pageToken="+urllib.parse.quote(page)
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                j=json.loads(r.read().decode())
        except Exception as e:
            return None, str(e)
        files.extend(j.get("files",[]))
        page=j.get("nextPageToken")
        if not page: break
        time.sleep(0.08)
    return files, None

def folder_size_recursive(fid, depth=0, max_depth=4):
    if depth>max_depth: return 0,0
    children, err = list_children(fid)
    if children is None:
        return None, err
    total=0; cnt=0
    for f in children:
        if f.get("mimeType")=="application/vnd.google-apps.folder":
            sub_total, sub_cnt = folder_size_recursive(f["id"], depth+1, max_depth)
            if sub_total is None: return None, sub_cnt
            total+=sub_total; cnt+=sub_cnt
        else:
            try: total+=int(f.get("size") or 0)
            except: pass
            cnt+=1
    return total, cnt

groups=defaultdict(list)
for it in alive:
    groups[month_key(it["date"])].append(it)

report={}
out_txt=[]
for mkey in sorted(groups, key=lambda x: (99,99) if x=="ไม่ระบุ" else (int(x.split(".")[1]), int(x.split(".")[0]))):
    items=groups[mkey]
    out_txt.append(f"\n== {mkey} — {len(items)} โฟลเดอร์ ==")
    m_total=0; m_cnt=0; m_err=0
    for i,it in enumerate(items,1):
        fid=it["id"]
        print(f"[{mkey} {i}/{len(items)}] {fid} {it['date']}", flush=True)
        sz,cnt = folder_size_recursive(fid)
        if sz is None:
            print(f"  ERR {cnt}", flush=True)
            m_err+=1
            report[fid]={"error":cnt,"date":it["date"]}
        else:
            m_total+=sz; m_cnt+=cnt
            report[fid]={"size":sz,"count":cnt,"date":it["date"]}
            print(f"  -> {cnt} files {sz/1024/1024:.1f} MB", flush=True)
        time.sleep(0.18)
        # progress save every 10
        if i%10==0:
            pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/sizes_progress.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    out_txt.append(f"รวม {mkey}: {m_cnt} ไฟล์  {m_total/1024/1024/1024:.2f} GB  ({m_total} bytes)  err {m_err}")
    print(out_txt[-1], flush=True)

# summary
grand_total=sum(v.get("size",0) for v in report.values())
grand_cnt=sum(v.get("count",0) for v in report.values())
out_txt.append(f"\n=== รวมทั้งหมด {len(alive)} โฟลเดอร์ ===")
out_txt.append(f"{grand_cnt} ไฟล์  {grand_total/1024/1024/1024:.2f} GB")
for line in out_txt: print(line)

pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/sizes_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/sizes_report.txt").write_text("\n".join(out_txt), encoding="utf-8")
# also per month files
import json as js
month_summary={}
for mkey,items in groups.items():
    s=sum(report.get(it["id"],{}).get("size",0) for it in items)
    c=sum(report.get(it["id"],{}).get("count",0) for it in items)
    month_summary[mkey]={"folders":len(items),"files":c,"bytes":s,"gb":round(s/1024/1024/1024,2)}
pathlib.Path(r"C:/Users/PC/ZCodeProject/reports/sizes_by_month.json").write_text(js.dumps(month_summary, ensure_ascii=False, indent=2), encoding="utf-8")
print("\nSaved sizes_report.json / txt / by_month")
