const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeEl(id) {
  const el = {
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, append() {}, prepend() {}, after() {}, before() {},
    replaceWith() {}, remove() {}, insertAdjacentHTML() {}, insertAdjacentElement() {},
    contains() { return false; }, hasChildNodes() { return false; },
    cloneNode() { return makeEl(this.id); },
    querySelector(sel) { return makeEl(String(sel)); },
    querySelectorAll() { return []; },
    dataset: {},
    hidden: false, textContent: '', innerHTML: '', value: '',
    focus() {}, blur() {}, closest() { return null; }, open: false,
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 }; },
    pause() {}, load() {}, play() { return Promise.resolve(); },
    canPlayType() { return ''; }
  };
  return el;
}

function buildBrowserContext() {
  const els = {};
  const timers = new Set();
  const ctx = {
    console, URL, URLSearchParams, Blob, AbortController, Promise, Date, Math, JSON, Number, String, Boolean, Object, Array, Error, TypeError, SyntaxError, ReferenceError,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    setTimeout(cb) { const t = setTimeout(cb, 0); return t; },
    clearTimeout(t) { clearTimeout(t); },
    setInterval(cb) { timers.add(cb); return 0; },
    clearInterval() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, clear() {}, key() { return null; }, get length() { return 0; } },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, clear() {}, key() { return null; }, get length() { return 0; } },
    navigator: { serviceWorker: { addEventListener() {}, getRegistrations: async () => [], get controller() { return null; } }, onLine: true, clipboard: { writeText: async () => {} } },
    location: { href: 'https://example.test/index.html', origin: 'https://example.test', pathname: '/index.html', search: '', hash: '', protocol: 'https:', host: 'example.test', hostname: 'example.test', assign() {}, replace() {} },
    history: { pushState() {}, replaceState() {}, back() {} },
    document: {
      title: '',
      body: { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, appendChild() {}, setAttribute() {}, removeAttribute() {} },
      documentElement: { style: {}, setAttribute() {}, getAttribute() { return null; }, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } },
      getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement(tag) { return makeEl(tag); },
      addEventListener() {}, removeEventListener() {},
      exitFullscreen() { return Promise.resolve(); },
      fullscreenElement: null,
      createEvent() { return { initEvent() {} }; }
    },
    window: null,
    addEventListener() {}, removeEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
    fetch() { return Promise.resolve({ ok: false, status: 0, headers: { get() { return null; } }, json: async () => ({}) }); },
    requestAnimationFrame(cb) { cb(Date.now()); return 0; },
    cancelAnimationFrame() {},
    getSelection() { return { removeAllRanges() {}, addRange() {} }; },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    google: { accounts: { oauth2: { initTokenClient() { return { requestAccessToken() {} }; } }, id: { initialize() {}, renderButton() {} } } },
    gapi: {},
    alert() {}, confirm() { return false; }, prompt() { return null; },
    open() { return null; }
  };
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

test('all index.html scripts execute sequentially in a single shared browser context without global collisions', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const scriptRegex = /<script\s+src="([^"]+)"/g;
  const scriptSrcs = [];
  let match;
  while ((match = scriptRegex.exec(indexHtml)) !== null) {
    const src = match[1];
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      scriptSrcs.push(src.split('?')[0]);
    }
  }

  assert.ok(scriptSrcs.length >= 10, 'must find index.html scripts');
  assert.ok(scriptSrcs.includes('video-player.js'), 'video-player.js must be in scripts');

  const context = buildBrowserContext();

  for (const scriptFile of scriptSrcs) {
    const fullPath = path.join(__dirname, '..', scriptFile);
    assert.ok(fs.existsSync(fullPath), `script file exists: ${scriptFile}`);
    const code = fs.readFileSync(fullPath, 'utf8');
    // Must run in the SAME shared context to catch global lexical identifier collisions
    vm.runInContext(code, context, { filename: scriptFile });
  }

  assert.equal(typeof context.window.GDVVideoApi, 'object', 'window.GDVVideoApi must be an object');
  assert.equal(typeof context.window.GDVVideo, 'object', 'window.GDVVideo must be an object');
  assert.equal(typeof context.window.GDVVideo.open, 'function', 'window.GDVVideo.open must be a function');
});
