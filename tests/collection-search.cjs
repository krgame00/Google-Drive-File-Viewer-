const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');

// ดึง collMatches (พร้อมตัวแปร closure ที่ต้องใช้) มารันใน vm
const start=html.indexOf('        function collMatches(');
assert(start>=0,'collMatches exists');
const end=html.indexOf('\n        }',start);
const ctx={};vm.createContext(ctx);
vm.runInContext('var q="",showDead=false,showNoDate=true,activeDate="all";\nfunction effSq(c){if(typeof c.squirting!=="undefined")return !!c.squirting;return !!c.solo_squirt;}\n'+html.slice(start,end+10),ctx);
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
assert(html.includes('💦 น้ำพุ่ง'),'squirt badge exists');

// ป้ายวันตรวจสถานะต้องมาจากตัวแปรเดียว ไม่มี hardcode ซ้ำ
const checkedMatch = html.match(/const COLL_CHECKED_AT = "([^"]+)";/);
assert(checkedMatch && checkedMatch[1].trim().length > 0,'COLL_CHECKED_AT declared');
const hard = html.split(checkedMatch[1]).length - 1;
assert.equal(hard,1,'check-time date appears only in COLL_CHECKED_AT, got '+hard);

// tagSchedulePush ต้องรอให้ tagPushMerged อัปโหลดเสร็จจริงก่อนขึ้น "บันทึกแล้ว ✓" และแจ้งเตือนเมื่ออัปโหลดล้มเหลว
const tagStart = html.indexOf('        var TAG_LS = "gdv_tags_v1"');
const tagEnd = html.indexOf('        function toggleTag(', tagStart);
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
vm.createContext(tagCtx);
vm.runInContext(html.slice(tagStart, tagEnd), tagCtx);

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
  assert.notEqual(statusText, 'บันทึกแล้ว ✓', 'failed upload must never report הבันทึกแล้ว ✓');
  assert.match(statusText, /ไม่สำเร็จ/, 'failed upload reports failure status');

  console.log('PASS collection search normalize and check-time constant');
})().catch(err => { console.error(err); process.exit(1); });
