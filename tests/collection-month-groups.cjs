// monthGroupsOf — จัดกลุ่มคลังเป็นแถวม้วนรายเดือนบนหน้าหลัก (redesign A · round A)
// Slice the pure helper out of collection-viewer.js and run it in a vm,
// same convention as tests/collection-search.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const viewerJs = fs.readFileSync(path.join(__dirname, '..', 'collection-viewer.js'), 'utf8');

function loadMonthGroupsOf() {
  const start = viewerJs.indexOf('function monthGroupsOf(');
  assert(start >= 0, 'monthGroupsOf exists in collection-viewer.js');
  const end = viewerJs.indexOf('\n  }', start);
  assert(end > start, 'monthGroupsOf has its closing brace');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(viewerJs.slice(start, end + 4), ctx);
  return ctx.monthGroupsOf;
}

test('groups items by m.yy parsed from d.m.yy dates', () => {
  const monthGroupsOf = loadMonthGroupsOf();
  const groups = monthGroupsOf([
    { date: '1.5.69', dead: false },
    { date: '2.5.69', dead: true },
    { date: '1.6.69', dead: false },
  ]);
  assert.deepEqual(Array.from(groups.map(g => g.month)), ['6.69', '5.69'], 'one group per m.yy month');
  const may = groups.find(g => g.month === '5.69');
  assert.equal(may.count, 2, 'count covers every item of the month');
  assert.equal(may.items.length, 2, 'items holds the grouped records');
});

test('orders groups newest first, year before month', () => {
  const monthGroupsOf = loadMonthGroupsOf();
  const groups = monthGroupsOf([
    { date: '1.5.69', dead: false },
    { date: '1.1.70', dead: false },
    { date: '12.12.69', dead: false },
  ]);
  assert.deepEqual(Array.from(groups.map(g => g.month)), ['1.70', '12.69', '5.69']);
});

test('alive counts only items that are not dead', () => {
  const monthGroupsOf = loadMonthGroupsOf();
  const groups = monthGroupsOf([
    { date: '1.5.69', dead: false },
    { date: '2.5.69', dead: true },
    { date: '3.5.69', dead: true },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 3, 'count is the whole month');
  assert.equal(groups[0].alive, 1, 'alive counts !dead items only');
});

test('label names the month in Thai abbreviations', () => {
  const monthGroupsOf = loadMonthGroupsOf();
  const groups = monthGroupsOf([{ date: '9.9.69', dead: false }, { date: '1.1.70', dead: false }]);
  assert.equal(groups.find(g => g.month === '9.69').label, 'ก.ย. 69');
  assert.equal(groups.find(g => g.month === '1.70').label, 'ม.ค. 70');
});

test('items without a parseable date join no group', () => {
  const monthGroupsOf = loadMonthGroupsOf();
  const groups = monthGroupsOf([
    { date: '1.5.69', dead: false },
    { date: '', dead: false },
    { date: 'ไม่ระบุ', dead: false },
    { dead: false },
  ]);
  assert.equal(groups.length, 1, 'only the dated item forms a group');
  assert.equal(groups[0].count, 1);
});

test('the helper is exposed on the GDVCollectionApi bridge from inside the IIFE', () => {
  assert.match(viewerJs, /appApi\.monthGroupsOf\s*=\s*monthGroupsOf\s*;/, 'export assignment exists in collection-viewer.js');
});
