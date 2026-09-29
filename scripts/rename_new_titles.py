import pathlib, re, json
from collections import Counter

cj = pathlib.Path(r'C:/Users/PC/ZCodeProject/collections_merged.json')
d = json.loads(cj.read_text(encoding='utf-8'))

olds = [x for x in d if x.get('source') == 'XBep 40โพสต์']
lens = Counter(len(x.get('desc', '')) for x in olds)
print('old desc lens:', lens.most_common(5))
L = lens.most_common(1)[0][0]

news = [x for x in d if x.get('source') == 'XBep 41-80/Clean14']
other_titles = set(x['title'] for x in d if x.get('source') != 'XBep 41-80/Clean14')
collisions = []
for x in news:
    m = re.search(r'p(\d+)\]?$', x.get('raw_header', ''))
    assert m, x.get('raw_header')
    num = m.group(1)
    date = x.get('date', 'ไม่ระบุ')
    title = f"โพสต์ #{num} — {date}" if date != 'ไม่ระบุ' else f"โพสต์ #{num}"
    x['title'] = title
    x['raw_header'] = f"[โพสต์ที่ {num}] 📅"
    body = x.get('desc', '')
    if body.startswith('📝 '): body = body[2:]
    x['desc'] = '📝 ' + body[:L - 2]
    if title in other_titles:
        collisions.append((title, x['id']))

cj.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')

p = pathlib.Path(r'C:/Users/PC/ZCodeProject/index.html')
s = p.read_text(encoding='utf-8')
m = re.search(r'(const XBEP_COLLECTION = )\[.*?\];', s, flags=re.DOTALL)
assert m, 'XBEP const not found'
s = s[:m.start()] + m.group(1) + json.dumps(d, ensure_ascii=False) + ';' + s[m.end():]
p.write_text(s, encoding='utf-8')

print('renamed:', len(news), '| desc len std:', L, '| collisions with old:', collisions if collisions else 'none')
for x in news[:6]: print(' ', repr(x['title']), '|', repr(x['desc'][:60]), '| raw:', repr(x['raw_header']))
