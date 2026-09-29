import pathlib, re, json

def parse_file(path, tag):
    t = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore').replace('http s://', 'https://')
    blocks = re.split(r'📌 \[โพสต์ที่', t)
    recs = []
    for b in blocks[1:]:
        num = b.split(']')[0].strip()
        gd = re.findall(r'https?://drive\.google\.com/[^\s\)\"\']+', b)
        mega = [u.split('?')[0].rstrip('.,;') for u in re.findall(r'https?://mega\.nz/[^\s\)\"\']+', b)]
        od = [u.split('?')[0].rstrip('.,;') for u in re.findall(r'https?://1drv\.ms/[^\s\)\"\']+', b)]
        mf = list(dict.fromkeys(
            re.sub(r'^https?://www\.mediafire\.com', 'https://mediafire.com',
                   u.split('?')[0].rstrip('.,;'))
            for u in re.findall(r'https?://(?:www\.)?mediafire\.com/[^\s\)\"\']+', b)))
        wu = [u.split('?')[0].rstrip('.,;') for u in re.findall(r'https?://workupload\.com/[^\s\)\"\']+', b)]
        recs.append(dict(post=f"{tag}p{num}", gd=gd, mega=mega, od=od, mf=mf, wu=wu))
    return recs

recs = parse_file(r'C:/Users/PC/Downloads/XBep_Links_Clean_2026-09-14.txt', 'clean14') + \
       parse_file(r'C:/Users/PC/Downloads/XBep_Posts_41_to_80.txt', 'p41_80')

linkmap = {}
for r in recs:
    for u in r['gd']:
        m1 = re.search(r'/folders/([A-Za-z0-9_-]+)', u) or re.search(r'/file/d/([A-Za-z0-9_-]+)', u)
        if not m1: continue
        e = linkmap.setdefault(m1.group(1), dict(megas=[], ods=[], mfs=[], wus=[]))
        e['megas'] += r['mega']; e['ods'] += r['od']; e['mfs'] += r['mf']; e['wus'] += r['wu']

coll = json.loads(pathlib.Path(r'C:/Users/PC/ZCodeProject/collections_merged.json').read_text(encoding='utf-8'))
n_od = n_mf = n_wu = n_megafill = 0
for c in coll:
    e = linkmap.get(c['id'])
    if not e: continue
    if e['ods'] and not c.get('od_url'):
        c['od_url'] = list(dict.fromkeys(e['ods']))[0]; n_od += 1
    if e['mfs'] and not c.get('mf_url'):
        c['mf_url'] = list(dict.fromkeys(e['mfs']))[0]; n_mf += 1
    if e['wus'] and not c.get('wu_url'):
        c['wu_url'] = list(dict.fromkeys(e['wus']))[0]; n_wu += 1
    if e['megas'] and not c.get('mega_url'):
        c['mega_url'] = list(dict.fromkeys(e['megas']))[0]
        c.setdefault('mega_dead', None); c.setdefault('mega_code', None); n_megafill += 1

pathlib.Path(r'C:/Users/PC/ZCodeProject/collections_merged.json').write_text(
    json.dumps(coll, ensure_ascii=False, indent=1), encoding='utf-8')

p = pathlib.Path(r'C:/Users/PC/ZCodeProject/index.html')
s = p.read_text(encoding='utf-8')
m = re.search(r'(const XBEP_COLLECTION = )\[.*?\];', s, flags=re.DOTALL)
assert m, 'XBEP const not found'
s = s[:m.start()] + m.group(1) + json.dumps(coll, ensure_ascii=False) + ';' + s[m.end():]
p.write_text(s, encoding='utf-8')

tot_od = sum(1 for c in coll if c.get('od_url'))
tot_mf = sum(1 for c in coll if c.get('mf_url'))
tot_wu = sum(1 for c in coll if c.get('wu_url'))
tot_mega = sum(1 for c in coll if c.get('mega_url'))
print(f"filled: od+{n_od} mf+{n_mf} wu+{n_wu} megafill+{n_megafill}")
print(f"totals: coll={len(coll)} od={tot_od} mf={tot_mf} wu={tot_wu} mega={tot_mega}")
