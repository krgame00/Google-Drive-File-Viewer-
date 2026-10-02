const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');

// ดึง collMatches (พร้อมตัวแปร closure ที่ต้องใช้) มารันใน vm
const start=html.indexOf('        function collMatches(');
assert(start>=0,'collMatches exists');
const end=html.indexOf('\n        }',start);
const ctx={};vm.createContext(ctx);
vm.runInContext('var q="",showDead=false,showNoDate=true,activeDate="all";\n'+html.slice(start,end+10),ctx);
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

// ตัวกรอง Solo Special
const soloItem=Object.assign({},item,{solo_squirt:true});
const nonSoloItem=Object.assign({},item,{solo_squirt:false});
assert.equal(matches(soloItem),true,'solo item matches default');
assert.equal(matches(nonSoloItem),true,'non-solo item matches default');
vm.runInContext('showSoloSquirt=true;',ctx);
assert.equal(matches(soloItem),true,'solo item matches when filter active');
assert.equal(matches(nonSoloItem),false,'non-solo item rejected when filter active');
vm.runInContext('showSoloSquirt=false;',ctx);

// ป้ายวันตรวจสถานะต้องมาจากตัวแปรเดียว ไม่มี hardcode ซ้ำ
assert(html.includes('const COLL_CHECKED_AT = '),'COLL_CHECKED_AT declared');
const hard=(html.match(/14 ก\.ย\. 69/g)||[]).length;
assert.equal(hard,1,'check-time date appears only in COLL_CHECKED_AT, got '+hard);

console.log('PASS collection search normalize and check-time constant');
