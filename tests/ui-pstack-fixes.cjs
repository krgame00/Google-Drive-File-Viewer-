// [REFACTOR-AUDIT: video-player.js slicing]
// Slices/checks in video-player.js & index.html:
//   - checks index.html script tag list: 'video-player.js' (line ~62)
//   - checks video-player.js shortcuts & UI bindings: vidCount, SPEED_STEPS, KeyS, KeyJ, KeyL (lines ~74-82)
// Phase impact:
//   - When new modular script tags are added to index.html in Phases 1-6, add them to the deferred scripts list here.
//   - Keyboard shortcut wiring stays in video-player.js core across all phases.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');

test('styles.css defines every static CSS custom property referenced via var(--...)', () => {
  const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const defined = new Set();
  for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) defined.add(m[1]);
  const runtimeInjected = new Set(['--video-aspect', '--preview-width', '--preview-height', '--preview-scale']);
  const missing = [];
  for (const m of css.matchAll(/var\((--[a-zA-Z0-9_-]+)(?:\s*,|\))/g)) {
    const name = m[1];
    if (!defined.has(name) && !runtimeInjected.has(name)) missing.push(name);
  }
  assert.deepEqual([...new Set(missing)], [], 'every static CSS var() must be defined in styles.css');
});

test('styles.css defines opaque drawer background without undefined --bg-card', () => {
  const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  assert.equal(css.includes('var(--bg-card)'), false, 'undefined --bg-card makes drawer transparent');
  assert.match(css, /\.drawer-panel\s*\{[^}]*background:\s*var\(--bg-elevated\)/s);
  assert.match(css, /\.drawer-header\s*\{[^}]*background:\s*var\(--bg-elevated\)/s);
});

test('styles.css includes Thai font fallback on all monospace UI rules', () => {
  const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  for (const selector of ['.coll-head', '.coll-id', '.coll-pagi-info', '.guide-step code']) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '\\s*\\{[^}]*font-family:[^;]*Noto Sans Thai', 's');
    assert.match(css, re, selector + ' must include Noto Sans Thai fallback');
  }
});

test('styles.css renders vector SVG mask icons for #vidMinimize and #vidFullscreen', () => {
  const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  assert.match(css, /#vidMinimize::before\s*\{[^}]*mask-image:\s*url\("data:image\/svg\+xml/s);
  assert.match(css, /\.video-modal\.minimized\s+#vidMinimize::before\s*\{[^}]*mask-image:\s*url\("data:image\/svg\+xml/s);
  assert.match(css, /#vidFullscreen::before\s*\{[^}]*mask-image:\s*url\("data:image\/svg\+xml/s);
  assert.match(css, /#vidFullscreen\[aria-pressed="true"\]::before\s*\{[^}]*mask-image:\s*url\("data:image\/svg\+xml/s);
});

test('index.html loads Google Fonts non-blocking, defers all 8 app scripts, bumps ?v=, and wires player controls', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.match(html, /rel="preload"\s+as="style"\s+href="https:\/\/fonts\.googleapis\.com\/css2/);
  assert.match(html, /href="styles\.css\?v=20261122-r1"/);
  assert.match(html, /id="vidCount"/);
  assert.match(html, /id="vidSpeed"/);
  assert.match(html, /id="vidTagToggle"/);
  assert.equal(html.includes('id="vidMinimizeBlob" hidden>↘'), true, '#vidMinimizeBlob must not use obscure 🗗 glyph');
  assert.match(html, /data-active-view/);
  assert.match(html, /window\.GDVSetActiveView = setActiveView;/);
  assert.match(html, /addEventListener\("popstate", syncViewFromHash\)/);
  assert.match(html, /id="linkInputCard"/);
  for (const script of [
    'video-cache.js',
    'stream-protocol.js',
    'app-core.js',
    'video-runners.js',
    'video-codec.js',
    'video-seek-preview.js',
    'video-player.js',
    'drive-explorer.js',
    'media-lightbox.js',
    'collections-data.js',
    'collection-viewer.js',
  ]) {
    const re = new RegExp('<script[ \\t]+src="' + script.replace(/[.]/g, '[.]') + '[^"]*"[ \\t]+defer></script>');
    assert.match(html, re, script + ' must use defer to avoid blocking HTML parse');
  }
});

test('video-player.js wires #vidCount clip counter, #vidSpeed toggle, and S / J / L shortcuts', () => {
  const src = fs.readFileSync(path.join(rootDir, 'video-player.js'), 'utf8');
  for (const expr of [
    "app.document.getElementById('vidCount')",
    'const SPEED_STEPS = [1, 1.5, 2];',
    "ev.code === 'KeyS'",
    "ev.code === 'KeyJ' || ev.code === 'KeyL'",
  ]) {
    assert.equal(src.includes(expr), true, 'video-player.js must contain ' + expr);
  }
});

test('collection-viewer.js wires in-player quick-tag shortcut (KeyT / Shift+KeyT), ⋯ popover, and recoEsc escaping', () => {
  const src = fs.readFileSync(path.join(rootDir, 'collection-viewer.js'), 'utf8');
  for (const expr of [
    'recoEsc(c.url)', 'recoEsc(c.mega_url)', 'recoEsc(c.od_url)', 'recoEsc(c.mf_url)',
    'recoEsc(c.title)', 'recoEsc(c.desc)', 'recoEsc(c.id)',
    'window.GDVCollectionTag', 'ev.code === "KeyT"', 'ev.shiftKey && window.GDVVideo'
  ]) {
    assert.equal(src.includes(expr), true, 'collection-viewer.js must contain ' + expr);
  }
  assert.equal(src.includes("card.querySelector('.coll-more-links')"), true, 'checkLink should mount inside .coll-more-links popover');
});

test('styles.css implements View Switcher, cinema player header, speed/tag styles, and deduplicates mobile bars', () => {
  const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  assert.match(css, /#pageShell\[data-active-view="collections"\]/);
  assert.match(css, /#pageShell\[data-active-view="browser"\]/);
  assert.match(css, /\.video-modal:not\(\.minimized\)\s+\.video-box\s+\.title-overlay\s*\{[^}]*order:\s*-1;/s);
  assert.match(css, /\.vid-speed-btn\[data-fast="true"\]/);
  assert.match(css, /\.title-overlay\s+\.menu-panel\s*\{[^}]*top:\s*calc\(100% \+ 8px\);\s*bottom:\s*auto;/s);
  assert.match(css, /\.video-modal\s+\.video-title\s*\{[^}]*color:\s*#f7f8f8;/s);
  assert.match(css, /#vidTagToggle\[aria-pressed="true"\]/);
  assert.match(css, /#mobileBar #mbHome,\s*#mobileBar #mbLibrary,\s*#mobileBar #mbSearch\s*\{\s*display:\s*none;/s);
});

test('drive-explorer.js wires permanent Worker session refresh, revoke, and 30-minute cover cache TTL', () => {
  const src = fs.readFileSync(path.join(rootDir, 'drive-explorer.js'), 'utf8');
  assert.match(src, /expires:\s*Date\.now\(\)\s*\+\s*1800000/);
  assert.equal(src.includes("const WORKER_SESSION_KEY = 'gdv_auth_session';"), true);
  assert.equal(src.includes('/auth/exchange'), true);
  assert.equal(src.includes('/auth/refresh'), true);
  assert.equal(src.includes('/auth/revoke'), true);
});

test('drive-explorer.js findFolderCover falls back to 1-level subfolders with supportsAllDrives and sets no-referrer', async () => {
  const src = fs.readFileSync(path.join(rootDir, 'drive-explorer.js'), 'utf8');
  assert.equal(src.includes('img.referrerPolicy = "no-referrer";'), true);
  assert.equal(src.includes('&supportsAllDrives=true&includeItemsFromAllDrives=true'), true);
  const explorerPath = require.resolve(path.join(rootDir, 'drive-explorer.js'));
  const prevWin = global.window;
  try {
    const urls = [];
    const bridge = {
      readPersonalData: () => ({ covers: [], hideCovers: false }),
      accessToken: null,
      apiKey: 'k',
      AbortSignal,
      fetch: async (url) => {
        urls.push(String(url));
        if (urls.length === 1) return { ok: true, json: async () => ({ files: [] }) };
        if (urls.length === 2) return { ok: true, json: async () => ({ files: [{ id: 'subFolder1' }] }) };
        return { ok: true, json: async () => ({ files: [{ mimeType: 'image/jpeg', thumbnailLink: 'https://example.test/sub-cover.jpg' }] }) };
      }
    };
    global.window = { GDVExplorerApi: bridge };
    delete require.cache[explorerPath];
    const api = require(explorerPath);
    const cover = await api.findFolderCover('month7Folder');
    assert.deepEqual(cover, { url: 'https://example.test/sub-cover.jpg', video: false });
    assert.ok(urls[2].includes('subFolder1'));
  } finally {
    if (prevWin === undefined) delete global.window;
    else global.window = prevWin;
  }
});

test('drive-stream-sw.js boundedMediaRange uses BigInt for exact large byte offsets', () => {
  const src = fs.readFileSync(path.join(rootDir, 'drive-stream-sw.js'), 'utf8');
  const match = src.match(/const MEDIA_CHUNK_BYTES = \d+;[\s\S]*?function boundedMediaRange\([\s\S]*?\n\}/);
  assert.ok(match, 'boundedMediaRange definition should exist in drive-stream-sw.js');
  const ctx = {};
  vm.runInNewContext(match[0] + '; this.boundedMediaRange = boundedMediaRange;', ctx);
  assert.equal(ctx.boundedMediaRange('bytes=0-'), 'bytes=0-16777215');
  assert.equal(
    ctx.boundedMediaRange('bytes=9007199254740993-'),
    'bytes=9007199254740993-9007199271518208',
    'large byte offset above Number.MAX_SAFE_INTEGER must remain exact'
  );
  assert.equal(ctx.boundedMediaRange('bytes=0-63'), 'bytes=0-63');
});
