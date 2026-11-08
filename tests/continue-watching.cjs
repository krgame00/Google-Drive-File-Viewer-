const assert = require('node:assert/strict');
const path = require('node:path');

const playerModulePath = require.resolve(path.join(__dirname, '..', 'video-player.js'));

function installPlayer(bridge) {
  const previousWindow = global.window;
  try {
    global.window = { GDVVideoApi: bridge };
    delete require.cache[playerModulePath];
    return require(playerModulePath);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

const data = new Map();
const bridge = {
  lsGet: key => data.get(key),
  lsSet: (key, value) => data.set(key, String(value)),
  lsRemove: key => data.delete(key),
  pruneVpos() {},
  Date: Date,
  vidPlayer: { currentTime: 42, duration: 100, ended: false, style: { display: 'block' } },
  vidCurrentId: 'test-id',
  vidTitle: { textContent: 'Test video' }
};
const player = installPlayer(bridge);

player.saveVideoPos();
assert.equal(player.loadContinueWatching()[0].position, 42);
assert.equal(data.get('gdv_vpos_test-id'), '42');

bridge.vidPlayer.currentTime = 50;
player.saveVideoPos();
assert.equal(player.loadContinueWatching().length, 1);
assert.equal(player.loadContinueWatching()[0].position, 50);

bridge.vidPlayer.style.display = 'none';
bridge.vidPlayer.currentTime = 80;
player.saveVideoPos();
assert.equal(player.loadContinueWatching()[0].position, 50);

bridge.vidPlayer.style.display = 'block';
bridge.vidPlayer.ended = true;
player.saveVideoPos();
assert.equal(player.loadContinueWatching().length, 0);
assert.equal(data.has('gdv_vpos_test-id'), false);

data.set('gdv_continue', 'bad json');
assert.equal(player.loadContinueWatching().length, 0);
console.log('PASS resume time, deduplication, iframe exclusion, completion and corrupt storage');

// cwHero cases — the home-rail hero mirrors the first resume item and hides
// when the list empties. Drawer cards must keep rendering exactly as before.
function makeDomEl(tag) {
  const el = {
    tagName: tag, type: '', id: '', className: '', textContent: '',
    title: '', hidden: true, children: [], style: {}, listeners: {},
    setAttribute(name, value) { this['attr_' + name] = value; },
    getAttribute(name) { return this['attr_' + name] !== undefined ? this['attr_' + name] : null; },
    appendChild(ch) { this.children.push(ch); return ch; },
    prepend(ch) { this.children.unshift(ch); return ch; },
    append(...els) { this.children.push(...els); },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  };
  let inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return inner; },
    set(value) { inner = value; if (value === '') el.children.length = 0; }
  });
  return el;
}
function findEl(root, className) {
  for (const el of root.children || []) {
    if (String(el.className).split(' ').includes(className)) return el;
    const hit = findEl(el, className);
    if (hit) return hit;
  }
  return null;
}

{
  const heroData = new Map();
  const heroEls = { cwHero: makeDomEl('div'), myLibraryContent: makeDomEl('div') };
  const classListStub = () => ({ _s: new Set(), contains(c) { return this._s.has(c); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); } });
  const heroBridge = {
    window: {},
    document: { getElementById: id => heroEls[id] || null, createElement: t => makeDomEl(t), body: { style: { overflow: '' } } },
    lsGet: key => heroData.get(key),
    lsSet: (key, value) => heroData.set(key, String(value)),
    lsRemove: key => heroData.delete(key),
    pruneVpos() {},
    Date: Date,
    apiKey: undefined,
    accessToken: undefined,
    location: { href: 'http://localhost/index.html' },
    vidPlayer: { currentTime: 0, duration: 0, style: { display: 'none' }, classList: classListStub(), pause() {}, load() {}, removeAttribute() {}, setAttribute() {} },
    vidFrame: { src: '', style: {}, removeAttribute() {} },
    vidTitle: { textContent: '' },
    vidOpenTab: { href: '' },
    vidProgressBar: { style: {} },
    vidLoading: { classList: classListStub() },
    lightbox: { classList: { contains: () => false } },
    videoModal: { classList: classListStub(), setAttribute() {}, querySelector: () => null },
    resetPdfViewer() {},
    revokeCurrentDoc() {},
    fetch: () => Promise.resolve({ headers: { get: () => null } }),
    setTimeout: () => 0,
    clearTimeout: () => {}
  };
  heroBridge.window.closeMyLibraryDrawer = () => {};
  const heroPlayer = installPlayer(heroBridge);
  heroData.set('gdv_continue', JSON.stringify([{ id: 'hero-id-1', name: 'คลิปทดสอบ #1', position: 42, duration: 100, updated: 1 }]));

  heroPlayer.renderContinueWatching();
  const hero = heroEls.cwHero;
  assert.equal(hero.hidden, false, 'hero shows when a resume item exists');
  const heroTitle = findEl(hero, 'cw-hero-title');
  assert.ok(heroTitle, 'hero renders a title element');
  assert.equal(heroTitle.textContent, 'คลิปทดสอบ #1', 'hero names the first resume item');
  const heroMeta = findEl(hero, 'cw-hero-meta');
  assert.ok(heroMeta && heroMeta.textContent.includes('ความคืบหน้า 42%'), 'hero shows the first item progress percent, got ' + (heroMeta && heroMeta.textContent));
  assert.ok(heroMeta.textContent.includes('ดูต่อที่ 0:42'), 'hero shows the resume timestamp');
  const playBtn = findEl(hero, 'cw-hero-play');
  const folderBtn = findEl(hero, 'cw-hero-folder');
  assert.ok(playBtn && typeof playBtn.onclick === 'function', 'hero has a wired resume button');
  assert.ok(folderBtn, 'hero has a folder button');
  playBtn.onclick();
  assert.equal(heroData.get('gdv_vpos_hero-id-1'), '42', 'resume button re-arms the saved position before openVideo');
  assert.equal(heroBridge.vidCurrentId, 'hero-id-1', 'resume button opens the same video the drawer card opens');

  const drawerSection = findEl(heroEls.myLibraryContent, () => false) || heroEls.myLibraryContent.children.find(c => c.id === 'continueWatching');
  assert.ok(drawerSection, 'drawer section still mounts');
  const drawerGrid = findEl(drawerSection, 'resume-grid');
  assert.ok(drawerGrid && drawerGrid.children.length === 1, 'drawer keeps rendering its resume card row');
  assert.ok(findEl(drawerGrid, 'resume-btn'), 'drawer card keeps its resume button');

  heroData.set('gdv_continue', '[]');
  heroPlayer.renderContinueWatching();
  assert.equal(hero.hidden, true, 'hero hides again when the resume list empties');
  assert.equal(hero.innerHTML, '', 'hero content is cleared when empty');
  assert.equal(findEl(hero, 'cw-hero-title'), null, 'no hero title remains after the list empties');
  console.log('PASS cwHero renders the first item with progress and buttons, and hides when empty');
}
console.log('PASS cwHero red-green cases');
