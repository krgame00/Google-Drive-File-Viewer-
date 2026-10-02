import pathlib, re, json
ROOT = pathlib.Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(ROOT / "scripts" / "shared"))
from project_paths import get_settings
LINK_SOURCE_ROOT = get_settings()["linkSourceRoot"]
from collections import Counter

TH = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,
      'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12}

def get_date(body):
    m = re.search(r'(\d{1,2}\.\d{1,2}\.\d{2})', body)
    if m: return m.group(1)
    m = re.search(r'(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)', body)
    if m: return f"{int(m.group(1))}.{TH[m.group(2)]}.69"
    return 'ไม่ระบุ'

def parse_file(path, tag):
    t = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore').replace('http s://', 'https://')
    blocks = re.split(r'📌 \[โพสต์ที่', t)
    recs = []
    for b in blocks[1:]:
        num = b.split(']')[0].strip()
        bm = re.search(r'📝(.*?)(🔗|\(ไม่พบลิ้งก์\)|\$)', b, flags=re.DOTALL)
        body = (bm.group(1).strip().replace('\n', ' ') if bm else '')
        date = get_date(body)
        gd = re.findall(r'https?://drive\.google\.com/[^\s\)\"\']+', b)
        mega = [u.split('?')[0].rstrip('.,;') for u in re.findall(r'https?://mega\.nz/[^\s\)\"\']+', b)]
        od = [u.split('?')[0].rstrip('.,;') for u in re.findall(r'https?://1drv\.ms/[^\s\)\"\']+', b)]
        mf = re.findall(r'https?://(?:www\.)?mediafire\.com/[^\s\)\"\']+', b)
        wu = re.findall(r'https?://workupload\.com/[^\s\)\"\']+', b)
        recs.append(dict(post=f"{tag}p{num}", body=body, date=date, gd=gd, mega=mega, od=od, mf=mf, wu=wu))
    return recs

recs = parse_file(LINK_SOURCE_ROOT / "XBep_Links_Clean_2026-09-14.txt", 'clean14') + \
       parse_file(LINK_SOURCE_ROOT / "XBep_Posts_41_to_80.txt", 'p41_80')

# per-drive aggregation (first-seen wins for date/body, collect all mega/od)
drive_info = {}
for r in recs:
    for u in r['gd']:
        m1 = re.search(r'/folders/([A-Za-z0-9_-]+)', u) or re.search(r'/file/d/([A-Za-z0-9_-]+)', u)
        if not m1: continue
        did = m1.group(1)
        kind = 'folder' if '/folders/' in u else 'file'
        e = drive_info.setdefault(did, dict(kind=kind, url=u.split('?')[0] + ('?usp=drive_link' if kind=='folder' else '/view') if '?' not in u and '/view' not in u else u,
                                                posts=[], dates=[], bodies=[], megas=[], ods=[]))
        e['posts'].append(r['post']); e['dates'].append(r['date']); e['bodies'].append(r['body'])
        e['megas'] += r['mega']; e['ods'] += r['od']

old = json.loads((ROOT / "collections_merged.json").read_text(encoding='utf-8'))
oldids = set(x['id'] for x in old)
oldmap = {x['id']: x for x in old}
megamap = json.loads((ROOT / "reports/drive_mega_map.json").read_text(encoding='utf-8'))

fresh, overlap = [], []
for did, e in drive_info.items():
    if did in oldids: overlap.append((did, e))
    else: fresh.append((did, e))

# best date: first non-ไม่ระบุ else ไม่ระบุ
def best_date(e):
    for d in e['dates']:
        if d != 'ไม่ระบุ': return d
    return 'ไม่ระบุ'

new_entries = []
for did, e in sorted(fresh, key=lambda kv: kv[0]):
    d = best_date(e)
    body = next((b for b, dd in zip(e['bodies'], e['dates']) if dd == d), e['bodies'][0])
    mega = list(dict.fromkeys(e['megas']))[:1]
    ent = {
        "title": f"โพสต์ #{e['posts'][0]} — {d}" if d != 'ไม่ระบุ' else f"โพสต์ #{e['posts'][0]}",
        "desc": f"📝 {body[:150]}",
        "url": e['url'], "id": did, "kind": e['kind'], "date": d,
        "source": "XBep 41-80/Clean14", "approx": False,
        "raw_header": f"[{e['posts'][0]}]",
        "drive_name": None, "drive_mime": None, "drive_date_in_name": None,
        "children_count": None, "dead": None, "dead_status": None,
    }
    if mega:
        ent["mega_url"] = mega[0]
        ent["mega_dead"] = None; ent["mega_code"] = None
    if len(e['posts']) > 1:
        ent["dup_posts"] = e['posts']
    new_entries.append(ent)

# overlap: fill missing mega_url
patched = 0
for did, e in overlap:
    o = oldmap[did]
    megas = list(dict.fromkeys(e['megas']))
    if megas and not o.get('mega_url'):
        o['mega_url'] = megas[0]
        o['mega_dead'] = None; o['mega_code'] = None
        megamap[did] = megas[0]
        patched += 1

# append fresh
old.extend(new_entries)
for ent in new_entries:
    if ent.get('mega_url'):
        megamap[ent['id']] = ent['mega_url']

(ROOT / "collections_merged.json").write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')
(ROOT / "reports/drive_mega_map.json").write_text(json.dumps(megamap, ensure_ascii=False, indent=1), encoding='utf-8')

# patch index.html XBEP_COLLECTION: replace old array with new
p = (ROOT / "index.html")
s = p.read_text(encoding='utf-8')
m = re.search(r'(const XBEP_COLLECTION = )\[.*?\];', s, flags=re.DOTALL)
assert m, 'XBEP const not found'
new_js = m.group(1) + json.dumps(old, ensure_ascii=False) + ';'
s = s[:m.start()] + new_js + s[m.end():]
p.write_text(s, encoding='utf-8')

print(json.dumps({
    "old_total": len(oldids), "new_total": len(old),
    "fresh_added": len(new_entries), "overlap": len(overlap),
    "overlap_mega_patched": patched,
    "fresh_dates": Counter(best_date(e) for _, e in fresh),
    "fresh_nodate": sum(1 for _, e in fresh if best_date(e) == 'ไม่ระบุ'),
    "mega_only_orphan_p3": "srwx3TqA (OD+MEGA, no GD)",
}, ensure_ascii=False, indent=1))
print('TITLES:')
for ent in new_entries: print(' +', ent['title'], ent['id'], '| mega' if ent.get('mega_url') else '| no-mega')
