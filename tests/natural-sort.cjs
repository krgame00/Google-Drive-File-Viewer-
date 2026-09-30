const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');

// ดึง naturalCompare (pure function) มารันใน vm
const start=html.indexOf('function naturalCompare(');
assert(start>=0,'naturalCompare exists');
const lineStart=html.lastIndexOf('\n',start)+1;
const indent=html.slice(lineStart,start);
const end=html.indexOf('\n'+indent+'}',start);
const ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(start,end+indent.length+2),ctx);
const nat=ctx.naturalCompare;

// กรณีที่ผู้ใช้แจ้ง: 1, 2, 10 ไม่ใช่ 1, 10, 2
const names=['โพสต์ 10','โพสต์ 1','โพสต์ 2','โพสต์ 20','โพสต์ 3'];
const sorted=[...names].sort(nat);
assert.deepEqual(sorted,['โพสต์ 1','โพสต์ 2','โพสต์ 3','โพสต์ 10','โพสต์ 20'],'Thai names sort naturally');
assert.deepEqual(['10','1','2'].sort(nat),['1','2','10'],'plain numbers sort naturally');
assert.deepEqual(['file 2.jpg','file 10.jpg'].sort(nat),['file 2.jpg','file 10.jpg'],'file names sort naturally');
assert.deepEqual(['รูป 9','รูป 10'].sort(nat),['รูป 9','รูป 10'],'9 before 10');
assert(nat('abc','abd')<0,'letters still compare');

// การ์ดเรียงไฟล์ใช้ naturalCompare และคลังยังคง numeric:true
assert(html.includes('return naturalCompare(va, vb);'),'cmpSort name branch uses naturalCompare');
assert(html.includes('{numeric:true}'),'collection sort keeps numeric collation');

console.log('PASS natural name sorting in file browser');
