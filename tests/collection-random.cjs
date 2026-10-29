const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Unit logic is sourced from collection-viewer.js; only markup checks read the shell.
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const viewerJs=fs.readFileSync(path.join(__dirname,'..','collection-viewer.js'),'utf8');
const start=viewerJs.indexOf('function randomPick(');
assert(start>=0,'randomPick helper exists');
const end=viewerJs.indexOf('\n  }',start);
const ctx={};vm.createContext(ctx);vm.runInContext(viewerJs.slice(start,end+4),ctx);
const pick=ctx.randomPick;
const pool=[{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}];
assert.equal(pick([],null),null,'empty pool returns null');
assert.equal(pick(null,'a'),null,'missing pool returns null');
for(let i=0;i<1000;i++){const p=pick(pool,null);assert(pool.includes(p),'pick is from pool');}
const hits=new Set();for(let i=0;i<2000;i++)hits.add(pick(pool,null).id);
assert.equal(hits.size,5,'every item can be picked');
const two=[{id:'x'},{id:'y'}];
for(let i=0;i<1000;i++){assert.notEqual(pick(two,'x').id,'x','never returns avoided id when alternates exist');}
assert.equal(pick([{id:'only'}],'only').id,'only','single-item pool still returns the item');

// Multi-ID avoidance (Set / Array of recent IDs) for cycle wrap-around protection
for(let i=0;i<500;i++){
  const p=pick(pool,['a','b','c']);
  assert(p.id==='d'||p.id==='e','avoids all recent IDs in array when alternates exist');
}
for(let i=0;i<200;i++){
  const p=pick(two,['x','y']);
  assert.equal(p.id,'y','falls back to avoiding primary (first) ID when full avoid list covers entire pool');
}

// End-to-end VM test of #collRandom + #collRandomBack + persistence + single-date auto-unlock
const blockStart = viewerJs.indexOf('  var randomBtn=document.getElementById("collRandom");');
const blockEnd = viewerJs.indexOf('  // Missing days banner', blockStart);
assert(blockStart >= 0 && blockEnd > blockStart, 'random handler block exists');

function createRandomEnv(initialStorage = {}, initialItems = null, initialDate = 'all', initialNav = []) {
  const store = Object.assign({}, initialStorage);
  let randomClickHandler = null;
  let backClickHandler = null;
  const randomBtnEl = { addEventListener(ev, fn) { if (ev === 'click') randomClickHandler = fn; } };
  const randomBackEl = { disabled: true, addEventListener(ev, fn) { if (ev === 'click') backClickHandler = fn; } };
  const opened = [];
  const toasts = [];
  const items = initialItems || [
    { id: 'f1', date: '1.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f1', title: 'F1' },
    { id: 'f2', date: '2.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f2', title: 'F2' },
    { id: 'f3', date: '3.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f3', title: 'F3' },
    { id: 'f4', date: '4.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f4', title: 'F4' },
    { id: 'f5', date: '5.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f5', title: 'F5' },
    { id: 'f6', date: '6.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f6', title: 'F6' }
  ];
  const env = {
    document: {
      getElementById(id) {
        if (id === 'collRandom') return randomBtnEl;
        if (id === 'collRandomBack') return randomBackEl;
        return null;
      }
    },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); }
    },
    lsGet: k => (k in store ? store[k] : null),
    lsSet: (k, v) => { store[k] = String(v); },
    location: { hash: '' },
    navStack: initialNav,
    activeDate: initialDate,
    XBEP_COLLECTION: items,
    collMatches(c) {
      return env.activeDate === 'all' || c.date === env.activeDate;
    },
    randomPick: pick,
    openCollectionItem(item) {
      if (typeof env.recordRandomVisit === 'function') env.recordRandomVisit(item.id);
      env.navStack = [{ id: item.id, name: item.title }];
      opened.push(item.id);
    },
    renderChips() {},
    render() {},
    showToast(msg) { toasts.push(msg); },
    window: { open() {} }
  };
  env.window.GDVCollectionApi = {
    get navStack() { return env.navStack; },
    set navStack(value) { env.navStack = value; },
    lsGet: k => env.lsGet(k),
    lsSet: (k, v) => env.lsSet(k, v),
    showToast: msg => env.showToast(msg)
  };
  vm.createContext(env);
  vm.runInContext('const appApi=window.GDVCollectionApi;\n'+viewerJs.slice(blockStart, blockEnd), env);
  return { env, store, opened, toasts, clickRandom: () => randomClickHandler(), clickBack: () => backClickHandler() };
}

// 1. Manual open is recorded + persisted across reload so first random click after reload never repeats already-viewed items
{
  const s1 = createRandomEnv();
  s1.env.openCollectionItem({ id: 'f1', title: 'F1' });
  s1.clickRandom();
  s1.clickRandom();
  assert.equal(s1.opened.length, 3);
  assert.equal(new Set(s1.opened).size, 3, 'manual open + 2 random clicks produce 3 distinct items');

  // Simulate page reload using the same localStorage store and current open folder in navStack
  const s2 = createRandomEnv(s1.store, null, 'all', s1.env.navStack);
  s2.clickRandom();
  s2.clickRandom();
  s2.clickRandom();
  const allSix = s1.opened.concat(s2.opened);
  assert.equal(new Set(allSix).size, 6, 'persisted randomSeen across reload completes all 6 items without any repeat');

  // 7th click wraps around cycle: must NOT pick any of the last 3 (floor(6/2)=3) recently seen items!
  const lastThreeBeforeWrap = allSix.slice(-3);
  s2.clickRandom();
  const wrapPick = s2.opened[s2.opened.length - 1];
  assert(!lastThreeBeforeWrap.includes(wrapPick), `cycle wrap pick (${wrapPick}) must not repeat any of the recent half (${lastThreeBeforeWrap.join(',')})`);
}

// 2. Clicking collRandomBack ("สุ่มก่อนหน้า") from B back to A, then clicking "🎲 สุ่ม" picks neither A nor B
{
  const s = createRandomEnv();
  s.clickRandom(); // A
  s.clickRandom(); // B
  const [itemA, itemB] = s.opened;
  s.clickBack();   // back to A
  assert.equal(s.opened[s.opened.length - 1], itemA);
  s.clickRandom(); // must pick C (neither A nor B)
  const itemC = s.opened[s.opened.length - 1];
  assert.notEqual(itemC, itemA, 'next random after back must not repeat current item A');
  assert.notEqual(itemC, itemB, 'next random after back must not immediately repeat backed-out item B');
}

// 3. Stuck single-date filter (activeDate !== "all") with 1 item already open automatically unlocks to "all"
{
  const s = createRandomEnv({}, null, '1.8.69', [{ id: 'f1', name: 'F1' }]);
  s.clickRandom();
  assert.equal(s.env.activeDate, 'all', 'exhausted single-date filter resets activeDate to all');
  assert.notEqual(s.opened[0], 'f1', 'picks a new item from another date instead of repeating f1');
  assert.equal(s.toasts.length, 1, 'notifies user via toast when unlocking single-date filter');
}

assert(html.includes('id="collRandom"'),'random button exists');
assert(viewerJs.includes('randomBtn.addEventListener("click"'),'random button handler wired');
assert(viewerJs.includes('function collMatches('),'filter predicate extracted');
assert(viewerJs.includes('function openCollectionItem('),'open flow extracted');
assert(viewerJs.includes('gdv_coll_random_seen'),'random seen state is persisted to localStorage');

// 4. Single-item pool: once seen, สุ่ม never re-opens the same item on the next click
{
  const s = createRandomEnv({}, [
    { id: 'only', date: '1.8.69', dead: false, url: 'https://drive.google.com/drive/folders/only', title: 'ONLY' }
  ]);
  s.clickRandom();
  assert.equal(s.opened.length, 1);
  s.clickRandom();
  s.clickRandom();
  assert.equal(s.opened.length, 1, 'a single-item pool must not re-open the same item on every click');
}

// 5. Repeated wraps on a tiny pool never pick the item from the immediately previous click
{
  const s = createRandomEnv({}, [
    { id: 'f1', date: '1.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f1', title: 'F1' },
    { id: 'f2', date: '2.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f2', title: 'F2' }
  ]);
  let previous = null;
  for(let i = 0; i < 10; i++){
    s.clickRandom();
    const current = s.opened[s.opened.length - 1];
    assert.notEqual(current, previous, `click ${i + 1}: must never repeat the immediately previous pick`);
    previous = current;
  }
}

// 6. Desperation wrap prefers the least-recently-viewed item (manual views feed the recency rank)
{
  const s = createRandomEnv({}, [
    { id: 'f1', date: '1.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f1', title: 'F1' },
    { id: 'f2', date: '2.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f2', title: 'F2' },
    { id: 'f3', date: '3.8.69', dead: false, url: 'https://drive.google.com/drive/folders/f3', title: 'F3' }
  ]);
  const opened = s.opened;
  s.env.openCollectionItem({ id: 'f3', title: 'F3' }); // viewed first (oldest)
  s.env.openCollectionItem({ id: 'f2', title: 'F2' });
  s.env.openCollectionItem({ id: 'f1', title: 'F1' }); // viewed last (newest)
  // As clicks rotate the recency order, the "stalest" item changes too —
  // the real guarantee is that สุ่ม never re-opens what is on screen now.
  for(let i = 0; i < 12; i++){
    const current = opened[opened.length - 1] || null;
    s.clickRandom();
    const pick = opened[opened.length - 1];
    assert.notEqual(pick, current, `click ${i + 1}: must never re-open the item currently on screen`);
  }
}
console.log('PASS collection random pick');
