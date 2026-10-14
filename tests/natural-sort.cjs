const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// File sorting/search functions are owned by drive-explorer.js; page-only
// markup is read separately from index.html, and collection collation from its module.
const html=fs.readFileSync(path.join(__dirname,'..','drive-explorer.js'),'utf8');
const appHtml=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const viewerJs=fs.readFileSync(path.join(__dirname,'..','collection-viewer.js'),'utf8');
const src=viewerJs;

// naturalCompare is nested in a browser-shell closure; isolate that pure helper for this focused unit test.
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
assert(src.includes('{numeric:true}'),'collection sort keeps numeric collation');

// Bug 1: การเรียงตาม "ชนิด" (sortKey === "kind") ใน applySort() ต้องส่ง data-mime จาก .file-card เข้า cmpSort จริง
assert(html.includes('data-mime="'), 'renderFiles stores data-mime attribute on .file-card');
const cmpStart = html.indexOf('function cmpSort(');
const applySortStart = html.indexOf('function applySort(');
const applySortEnd = html.indexOf('function cycleSort(', applySortStart);
assert(cmpStart >= 0 && applySortStart > cmpStart && applySortEnd > applySortStart, 'cmpSort and applySort exist');

const sortCards = [
  { dataset: { id: 'f1', kind: 'video', type: 'video', mime: 'video/mp4', name: 'A.mp4', size: '100', date: '2026-01-01' } },
  { dataset: { id: 'f2', kind: 'file', type: 'doc', mime: 'application/pdf', name: 'B', size: '100', date: '2026-01-01' } },
  { dataset: { id: 'f3', kind: 'image', type: 'image', mime: 'image/jpeg', name: 'C.jpg', size: '100', date: '2026-01-01' } },
  { dataset: { id: 'dir1', kind: 'folder', type: 'folder', mime: 'application/vnd.google-apps.folder', name: 'Z Folder', size: '', date: '' } }
];
const appendedIds = [];
const sortCtx = {
  sortKey: 'kind',
  SORT_OPTIONS: [{ key: 'name', label: 'ชื่อ' }, { key: 'size', label: 'ขนาด' }, { key: 'date', label: 'วันที่' }, { key: 'kind', label: 'ชนิด' }],
  sortLabel: { textContent: '' },
  naturalCompare: nat,
  document: {
    getElementById(id) {
      if (id === 'filesGrid') {
        return {
          querySelectorAll() { return sortCards; },
          appendChild(card) { appendedIds.push(card.dataset.id); }
        };
      }
      return null;
    }
  }
};
vm.createContext(sortCtx);
vm.runInContext(html.slice(cmpStart, applySortEnd), sortCtx);
sortCtx.applySort();
assert.deepEqual(
  appendedIds,
  ['dir1', 'f2', 'f3', 'f1'],
  'applySort with sortKey="kind" keeps folders first and sorts files by mimeType (application/pdf < image/jpeg < video/mp4)'
);

// Bug 2: คลิกการ์ดไฟล์ในโฟลเดอร์ต้องส่ง card.dataset.mime เข้า handleFileClick เพื่อให้ PDF ที่ไม่มีนามสกุล .pdf เปิดใน Lightbox ได้
assert.match(
  html,
  /handleFileClick\(\s*card\.dataset\.id\s*,\s*card\.dataset\.kind\s*,\s*card\.dataset\.name\s*,\s*card\.dataset\.mime\s*\)/,
  'file-card click handler forwards card.dataset.mime to handleFileClick'
);

// Bug 5: ค้นหาไฟล์ในโฟลเดอร์ (applyFilter) ต้อง normalize("NFC") ทั้งคำค้นและชื่อไฟล์ภาษาไทย
const filterStart = html.indexOf('function applyFilter()');
const filterEnd = html.indexOf('\n                }', filterStart);
assert(filterStart >= 0 && filterEnd > filterStart, 'applyFilter exists');
const fileCards = [
  { dataset: { name: 'ไฟล์น้ำพุ่ง'.normalize('NFD'), type: 'video' }, style: { display: '' } },
  { dataset: { name: 'เอกสารทั่วไป'.normalize('NFC'), type: 'doc' }, style: { display: '' } }
];
const filterCtx = {
  searchInput: { value: 'น้ำพุ่ง'.normalize('NFC') },
  filesWrap: { querySelectorAll() { return fileCards; } },
  activeType: 'all',
  searchClear: { style: { display: '' } },
  filesCountEl: { textContent: '' }
};
vm.createContext(filterCtx);
vm.runInContext(html.slice(filterStart, filterEnd + 18), filterCtx);
filterCtx.applyFilter();
assert.equal(fileCards[0].style.display, '', 'NFC search query matches NFD Thai filename in folder search');
assert.equal(fileCards[1].style.display, 'none', 'non-matching file is hidden in folder search');

console.log('PASS natural name sorting in file browser');

