const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {loadAppSource,loadAppJs,loadHtml,loadCss,sliceFunction}=require('./helpers/load-app-source.cjs');
const html=loadAppSource();
const viewerJs=loadAppJs().includes('function collMatches(')?loadAppJs():'';
const dataJs='';
const css=loadCss();
const src=html;

// ดึง collMatches (พร้อมตัวแปร closure ที่ต้องใช้) มารันใน vm
const start=src.indexOf('function collMatches(');
assert(start>=0,'collMatches exists');
const end=src.indexOf('\n  }',start);
const ctx={};vm.createContext(ctx);
vm.runInContext('var q="",showDead=false,showNoDate=true,activeDate="all";\nfunction effSq(c){if(typeof c.squirting!=="undefined")return !!c.squirting;return !!c.solo_squirt;}\n'+src.slice(start,end+4),ctx);
const matches=ctx.collMatches;

const item={title:"โพสต์ทดสอบ",desc:"คำอธิบายสั้น ๆ",url:"",id:"abc123",kind:"folder",date:"1.5.69",drive_name:"1.5.69 ชื่อโฟลเดอร์",dead:false};
assert.equal(matches(item),true,'alive item passes default filters');

// NFC: ฝั่งค้นหาและฝั่งข้อมูลเรียงสระ/วรรณยุกต์ต่างกันก็ต้องเจอกัน
vm.runInContext('q="ทดสอบ".normalize("NFD");',ctx);
assert.equal(matches(item),true,'NFD query matches NFC title');
const nfdItem=Object.assign({},item,{title:"โพสต์ทดสอบ".normalize("NFD")});
vm.runInContext('q="ทดสอบ";',ctx);
assert.equal(matches(nfdItem),true,'NFC query matches NFD title');
vm.runInContext('q="ไม่มีในข้อมูล";',ctx);
assert.equal(matches(item),false,'non-matching query fails');

// สถานะตาย/ตัวกรอง
vm.runInContext('q="";',ctx);
const deadItem=Object.assign({},item,{dead:true});
assert.equal(matches(deadItem),false,'dead item hidden by default');
vm.runInContext('showDead=true;',ctx);
assert.equal(matches(deadItem),true,'dead item shown with showDead');
vm.runInContext('showDead=false;activeDate="2.5.69";',ctx);
assert.equal(matches(item),false,'date filter applies');
vm.runInContext('activeDate="all";',ctx);

// ตัวกรองน้ำพุ่ง (เฉพาะ squirting — solo ไม่เกี่ยว)
const soloItem=Object.assign({},item,{squirting:true});
const nonSoloItem=Object.assign({},item,{squirting:false});
assert.equal(matches(soloItem),true,'squirt item matches default');
assert.equal(matches(nonSoloItem),true,'non-squirt item matches default');
vm.runInContext('showSoloSquirt=true;',ctx);
assert.equal(matches(soloItem),true,'squirt item matches when filter active');
assert.equal(matches(nonSoloItem),false,'non-squirt item rejected when filter active');
vm.runInContext('showSoloSquirt=false;',ctx);
// solo badge แยกอิสระ: มี solo_squirt แต่ไม่มี squirting ต้องผ่านฟิลเตอร์ปิด (ไม่ถูกกรองออก)
const soloOnlyItem=Object.assign({},item,{solo_squirt:true});
assert.equal(matches(soloOnlyItem),true,'solo-only item not filtered by squirt filter');
// badge น้ำพุ่งต้องมีในโค้ด, Solo badge เอาออกแล้ว (เหลือฟิลเตอร์)
assert(src.includes('💦 น้ำพุ่ง'),'squirt badge exists');

// ป้ายวันตรวจสถานะต้องมาจากตัวแปรเดียว ไม่มี hardcode ซ้ำ
const checkedMatch = src.match(/const COLL_CHECKED_AT = "([^"]+)";/);
assert(checkedMatch && checkedMatch[1].trim().length > 0,'COLL_CHECKED_AT declared');
const hard = src.split(checkedMatch[1]).length - 1;
assert.equal(hard,1,'check-time date appears only in COLL_CHECKED_AT, got '+hard);

// tagSchedulePush ต้องรอให้ tagPushMerged อัปโหลดเสร็จจริงก่อนขึ้น "บันทึกแล้ว ✓" และแจ้งเตือนเมื่ออัปโหลดล้มเหลว
const tagStart = viewerJs.indexOf('var TAG_LS = "gdv_tags_v1"');
const tagEnd = viewerJs.indexOf('function toggleTag(', tagStart);
assert(tagStart >= 0 && tagEnd > tagStart, 'tag sync functions exist');
let scheduledCb = null, statusText = '', fetchImpl = null;
const tagCtx = {
  localStorage: { getItem: k => k === 'gdv_tags_fileid' ? 'file-123' : null, setItem() {} },
  document: { getElementById: id => id === 'collTagSyncStatus' ? { set textContent(v) { statusText = v; }, get textContent() { return statusText; } } : null },
  fetch: (...args) => fetchImpl(...args),
  setTimeout: cb => { scheduledCb = cb; return 1; },
  clearTimeout() {},
  accessToken: 'tok-1',
  render() {}
};
tagCtx.window = { GDVCollectionApi: {
  get accessToken() { return tagCtx.accessToken; },
  showToast() {},
  ensureToken: async () => tagCtx.accessToken
} };
vm.createContext(tagCtx);
vm.runInContext('const appApi=window.GDVCollectionApi;\n'+viewerJs.slice(tagStart, tagEnd), tagCtx);

(async () => {
  let resolveUpload;
  fetchImpl = () => new Promise(r => { resolveUpload = r; });
  tagCtx.tagSchedulePush();
  scheduledCb();
  assert.equal(statusText, 'กำลังบันทึก…', 'status stays กำลังบันทึก… while upload is in flight');
  resolveUpload({ ok: true });
  await new Promise(r => setTimeout(r, 10));
  assert.equal(statusText, 'บันทึกแล้ว ✓', 'status becomes บันทึกแล้ว ✓ after upload resolves ok');

  fetchImpl = () => Promise.resolve({ ok: false, status: 500 });
  tagCtx.tagSchedulePush();
  scheduledCb();
  await new Promise(r => setTimeout(r, 10));
  assert.notEqual(statusText, 'บันทึกแล้ว ✓', 'failed upload must never report הบันทึกแล้ว ✓');
  assert.match(statusText, /ไม่สำเร็จ/, 'failed upload reports failure status');

  // P1 UI/UX Checks:
  // 1. Noto Sans Thai must be active in body font-family
  assert.match(src, /body\s*\{[^}]*font-family:\s*"Noto Sans Thai"/s, 'body font-family must include Noto Sans Thai first');
  // 2. WCAG AA contrast on --accent-hover and .coll-actions .btn-primary:hover
  assert(!src.includes('--accent-hover: #828fff'), '--accent-hover must not use low-contrast #828fff (2.9:1 on white)');
  assert.match(src, /\.coll-actions\s+\.btn-primary:hover\s*\{\s*background:\s*var\(--accent-hover\)/, 'collection primary button hover uses --accent-hover token');
  // 3. Light mode tokens for collection cards & badges
  assert.match(src, /html\[data-theme="light"\]\s*\{[^}]*--surface-subtle:/s, 'light theme defines --surface-subtle token');
  assert.match(src, /\.coll-card\s*\{\s*background:\s*var\(--surface-subtle\)/, '.coll-card uses theme-aware --surface-subtle variable');
  // 4. Collection toolbar cognitive load organization (filter drawer)
  assert.match(html, /<details[^>]*class="coll-filter-drawer"[^>]*id="collFilterDrawer"/, 'secondary collection filters are grouped in coll-filter-drawer');

  // P2 UI/UX Checks:
  // 5. Lightbox displays file title (#lbTitle) and lbImg has valid placeholder src
  assert(html.includes('id="lbTitle"'), 'lightbox includes #lbTitle element for image/PDF filename');
  assert.match(html, /<img\s+id="lbImg"\s+src="data:image\/gif;base64,/, 'lbImg has initial transparent data URI src');
  // 6. Progress bar uses GPU transform transition instead of layout width transition
  assert(!/transition:\s*width\b/.test(src), 'vid-progress-bar must not animate layout width');
  assert.match(src, /\.vid-progress-bar\s*\{[^}]*transition:\s*transform/s, 'vid-progress-bar animates transform');
  // 7. No zero-offset chromatic glow on --shadow-glow
  assert(!src.includes('--shadow-glow: 0 0 24px'), '--shadow-glow uses directional elevation instead of zero-offset glow');

  // Bug 3: openCollectionItem ต้องรีเซ็ต navStack เป็นระดับบนสุด 1 รายการ ไม่ใช่ push ซ้อนกันเหมือนโฟลเดอร์ย่อย
  const openCollStart = viewerJs.indexOf('function openCollectionItem(');
  const openCollEnd = viewerJs.indexOf('function randomPick(', openCollStart);
  assert(openCollStart >= 0 && openCollEnd > openCollStart, 'openCollectionItem exists');
  const openCollCtx = {
    driveLink: { value: '' },
    extractId(u) { const m = String(u).match(/folders\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; },
    handleFileClick() {},
    window: { open() {} },
    navStack: [{ id: 'old-root', name: 'Old Root' }, { id: 'old-sub', name: 'Old Sub' }],
    pushHash() {},
    openFolderAndReveal() {}
  };
  openCollCtx.window = { GDVCollectionApi: openCollCtx };
  vm.createContext(openCollCtx);
  vm.runInContext('const appApi=window.GDVCollectionApi;\n'+viewerJs.slice(openCollStart, openCollEnd), openCollCtx);
  openCollCtx.openCollectionItem({ url: 'https://drive.google.com/drive/folders/folderA', kind: 'folder', date: '1.5.69', title: '📌 อีเวนต์ A' });
  openCollCtx.openCollectionItem({ url: 'https://drive.google.com/drive/folders/folderB', kind: 'folder', date: '2.5.69', title: 'อีเวนต์ B' });
  assert.equal(openCollCtx.navStack.length, 1, 'opening a top-level collection folder resets navStack to 1 root entry');
  assert.deepEqual(JSON.parse(JSON.stringify(openCollCtx.navStack[0])), { id: 'folderB', name: '2.5.69 - อีเวนต์ B' });

  // Bug 4: ไม่เรนเดอร์คลังซ้ำซ้อน 2 รอบตอนเริ่มต้นหน้าเว็บ (ต้องไม่เรียก renderChips(); render(); ต่อท้าย Status banner ก่อนประกาศ statusBadge/ตั้งค่าตัวกรอง)
  const beforeStatusBadge = src.slice(src.indexOf('// Status banner'), src.indexOf('function statusBadge('));
  assert(!/renderChips\(\);\s*render\(\);/.test(beforeStatusBadge), 'renderChips(); render(); must not be called prematurely before filter initialization');

  console.log('PASS collection search normalize and check-time constant');
})().catch(err => { console.error(err); process.exit(1); });


