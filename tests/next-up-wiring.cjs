// BUG 2 trap: executes the REAL ended/play wiring from video-player.js (no
// source grep). On the pre-redesign code the wiring sat outside the `with`
// block, so firing 'ended' threw on bare `vidCurrentId`, the strip never
// showed, and no prefetch grant was ever posted — this test fails there.
const assert=require('node:assert/strict');
const test=require('node:test').test;
const fs=require('node:fs');
const path=require('node:path');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

function makeEl() { return {hidden: true, textContent: '', title: '', listeners: {}, addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }, removeAttribute() {}}; }

test('firing ended shows the Next-Up strip and posts one prefetch grant', () => {
  const els = {vidNextUp: makeEl(), vidNextUpName: makeEl(), vidNextUpCount: makeEl(), vidNextUpPlay: makeEl(), vidNextUpCancel: makeEl()};
  const player = makeEl();
  const lsRemoved = [];
  const posted = [];
  const prevDoc = global.document, prevWin = global.window, prevInterval = global.setInterval, prevClear = global.clearInterval;
  global.document = {getElementById: id => els[id] || null};
  global.setInterval = (fn) => { global.__nextUpTick = fn; return 7; };
  global.clearInterval = () => { global.__nextUpTick = null; };
  let navigatorPatched = true;
  try {
    Object.defineProperty(globalThis, 'navigator', {value: {serviceWorker: {controller: {postMessage(m) { posted.push(m); }}}}, configurable: true});
  } catch (_) { navigatorPatched = false; }
  const list = [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}, {id: 'c', name: 'C'}];
  const bridge = {
    vidPlayer: player, videoModal: {classList: {contains: () => true}},
    vidCurrentId: 'a', accessToken: 'tok',
    videoCacheLimit: () => 2147483648, videoCacheScope: () => 'public',
    fileMetaOf: () => ({size: 123, modifiedTime: '2026-01-01'}),
    lsRemove: k => lsRemoved.push(k),
  };
  const testWindow = {};
  try {
    const video = loadVideoPlayerApi(Object.assign(bridge, {window: testWindow}));
    global.window = testWindow;
    testWindow.GDVLightboxApi = {media: {mediaList: () => list}};

    assert.equal((player.listeners.ended || []).length, 1, 'exactly one ended listener is registered');
    assert.equal((player.listeners.play || []).length, 1, 'exactly one play listener is registered');

    player.listeners.ended[0]();
    assert.equal(els.vidNextUp.hidden, false, 'the Next-Up strip shows when a video ends');
    assert.equal(els.vidNextUpName.textContent, 'B', 'the strip names the next episode');
    assert.equal(els.vidNextUpCount.textContent, '5', 'the countdown starts at five');
    assert.deepEqual(lsRemoved, ['gdv_vpos_a'], 'the ended position is cleaned up');
    if (navigatorPatched) {
      assert.deepEqual(posted.map(m => m.id), ['b'], 'the next episode head is prefetched when the strip shows');
      assert.equal(posted[0].type, 'drive-stream-prefetch');
      assert.equal(posted[0].heads, true);
    }

    assert.equal(typeof global.__nextUpTick, 'function', 'the countdown interval is running');
    global.__nextUpTick();
    assert.equal(els.vidNextUpCount.textContent, '4', 'each tick advances the countdown');

    player.listeners.play[0]();
    assert.equal(els.vidNextUp.hidden, true, 'play cancels the countdown and hides the strip');
    assert.equal(global.__nextUpTick, null, 'the countdown interval is cleared on play');
    if (navigatorPatched) assert.equal(posted.length, 1, 'no duplicate grant after cancel');
  } finally {
    if (prevDoc === undefined) delete global.document; else global.document = prevDoc;
    if (prevWin === undefined) delete global.window; else global.window = prevWin;
    global.setInterval = prevInterval;
    global.clearInterval = prevClear;
    try { delete global.__nextUpTick; } catch (_) {}
  }
});

test('app-core no longer auto-advances on ended (one policy owner)', () => {
  const appCoreJs = fs.readFileSync(path.join(__dirname, '..', 'app-core.js'), 'utf8');
  assert(!appCoreJs.includes('addEventListener("ended"'), 'app-core must not register its own ended listener');
  const playerJs = fs.readFileSync(path.join(__dirname, '..', 'video-player.js'), 'utf8');
  assert.equal(playerJs.split("vidPlayer.addEventListener('ended'").length - 1, 1, 'the player registers exactly one ended listener');
});
