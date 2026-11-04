const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

function makeEl() {
  const listeners = {};
  return {
    hidden: true,
    textContent: '',
    title: '',
    style: { display: 'block' },
    listeners,
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener(type, fn) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(f => f !== fn);
      }
    },
    removeAttribute() {},
    setAttribute() {},
    pause() {},
    load() {},
    currentTime: 0,
    click() {
      if (listeners.click) {
        listeners.click.forEach(fn => fn({ stopPropagation() {} }));
      }
    }
  };
}

function createHarness(options = {}) {
  const els = {
    vidNextUp: makeEl(),
    vidNextUpName: makeEl(),
    vidNextUpCount: makeEl(),
    vidNextUpPlay: makeEl(),
    vidNextUpCancel: makeEl(),
    vidTitle: makeEl()
  };
  const player = makeEl();
  const opened = [];
  const posted = [];
  const lsRemoved = [];
  let nextUpTick = null;

  const prevDoc = global.document;
  const prevWin = global.window;
  const prevInterval = global.setInterval;
  const prevClear = global.clearInterval;

  global.document = { getElementById: id => els[id] || null };
  global.setInterval = (fn) => { nextUpTick = fn; return 42; };
  global.clearInterval = () => { nextUpTick = null; };

  const list = options.list || [
    { id: 'ep1', name: 'Episode 1' },
    { id: 'ep2', name: 'Episode 2' },
    { id: 'ep3', name: 'Episode 3' }
  ];

  const bridge = {
    vidPlayer: player,
    vidFrame: makeEl(),
    vidLoading: { classList: { add() {}, remove() {}, contains() { return false; } } },
    vidProgressBar: makeEl(),
    vidTitle: els.vidTitle,
    vidOpenTab: makeEl(),
    resetPdfViewer: () => {},
    revokeCurrentDoc: () => {},
    routeCooldown: { blocked: () => false, clear: () => {} },
    fetch: () => new Promise(() => {}),
    videoModal: {
      classList: {
        contains: (c) => (options.modalHidden ? false : (c === 'show')),
        remove: () => {},
        add: () => {}
      },
      setAttribute: () => {},
      removeAttribute: () => {}
    },
    lightbox: {
      classList: {
        contains: () => false
      }
    },
    closeLightbox: () => {},
    document: { getElementById: id => els[id] || null, body: { style: { overflow: '' } } },
    navigator: {
      serviceWorker: {
        controller: {
          postMessage: (m) => posted.push(m)
        }
      },
      connection: options.saveData ? { saveData: true } : {}
    },
    vidCurrentId: options.currentId || 'ep1',
    accessToken: options.accessToken !== undefined ? options.accessToken : 'token-abc',
    videoCacheLimit: () => (options.cacheLimit !== undefined ? options.cacheLimit : 2147483648),
    videoCacheScope: () => (options.cacheScope !== undefined ? options.cacheScope : 'public'),
    fileMetaOf: (id) => ({ size: 5000000, modifiedTime: '2026-11-04T00:00:00Z' }),
    lsGet: () => null,
    lsSet: () => {},
    lsRemove: (k) => lsRemoved.push(k),
    pruneVpos: () => {},
    videoBlobTransfer: options.videoBlobTransfer || null
  };

  const testWindow = {
    GDVLightboxApi: {
      media: {
        mediaList: () => list
      }
    }
  };

  const api = loadVideoPlayerApi(Object.assign(bridge, { window: testWindow }));
  global.window = testWindow;

  // Intercept openVideo to record calls
  const originalOpen = api.openVideo;
  api.openVideo = (id, name) => {
    opened.push({ id, name });
    if (typeof originalOpen === 'function') {
      try { originalOpen(id, name); } catch (_) {}
    }
  };

  function cleanup() {
    if (prevDoc === undefined) delete global.document; else global.document = prevDoc;
    if (prevWin === undefined) delete global.window; else global.window = prevWin;
    global.setInterval = prevInterval;
    global.clearInterval = prevClear;
  }

  return {
    api,
    els,
    player,
    opened,
    posted,
    lsRemoved,
    tick: () => { if (nextUpTick) nextUpTick(); },
    hasTimer: () => nextUpTick !== null,
    cleanup
  };
}

test('auto-advance: ended shows next-up strip, posts prefetch grant, and ticks countdown to completion', () => {
  const h = createHarness();
  try {
    assert.equal(h.player.listeners.ended.length, 1);
    h.player.listeners.ended[0]();

    assert.equal(h.els.vidNextUp.hidden, false, 'strip becomes visible');
    assert.equal(h.els.vidNextUpName.textContent, 'Episode 2', 'displays next episode title');
    assert.equal(h.els.vidNextUpCount.textContent, '5', 'starts 5 second countdown');
    assert.deepEqual(h.lsRemoved, ['gdv_vpos_ep1'], 'removes watched vpos');

    assert.equal(h.posted.length, 1, 'posts one prefetch grant');
    assert.equal(h.posted[0].type, 'drive-stream-prefetch');
    assert.equal(h.posted[0].id, 'ep2');

    // Tick 4 times
    h.tick(); assert.equal(h.els.vidNextUpCount.textContent, '4');
    h.tick(); assert.equal(h.els.vidNextUpCount.textContent, '3');
    h.tick(); assert.equal(h.els.vidNextUpCount.textContent, '2');
    h.tick(); assert.equal(h.els.vidNextUpCount.textContent, '1');
    assert.equal(h.opened.length, 0, 'does not open yet');

    // 5th tick triggers playback
    h.tick();
    assert.equal(h.api.vidCurrentId, 'ep2', 'opens next video');
    assert.equal(h.els.vidTitle.textContent, 'Episode 2', 'sets next video title');
    assert.equal(h.els.vidNextUp.hidden, true, 'strip is hidden');
    assert.equal(h.hasTimer(), false, 'timer is cleared');
  } finally {
    h.cleanup();
  }
});

test('auto-advance: play button immediately triggers next episode', () => {
  const h = createHarness();
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.hasTimer(), true);

    h.els.vidNextUpPlay.click();
    assert.equal(h.api.vidCurrentId, 'ep2', 'immediately advances on click');
    assert.equal(h.els.vidTitle.textContent, 'Episode 2');
    assert.equal(h.els.vidNextUp.hidden, true);
    assert.equal(h.hasTimer(), false);
  } finally {
    h.cleanup();
  }
});

test('auto-advance: cancel button hides strip and halts countdown', () => {
  const h = createHarness();
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.hasTimer(), true);

    h.els.vidNextUpCancel.click();
    assert.equal(h.opened.length, 0);
    assert.equal(h.els.vidNextUp.hidden, true);
    assert.equal(h.hasTimer(), false);
  } finally {
    h.cleanup();
  }
});

test('auto-advance: user play event cancels active countdown and prefetches head', () => {
  const h = createHarness();
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.hasTimer(), true);
    assert.equal(h.posted.length, 1); // prefetch for ep2

    h.player.listeners.play[0]();
    assert.equal(h.els.vidNextUp.hidden, true, 'strip hidden on play');
    assert.equal(h.hasTimer(), false, 'timer cancelled on play');
  } finally {
    h.cleanup();
  }
});

test('auto-advance: progressive whole-file download ignores ended', () => {
  const h = createHarness({ videoBlobTransfer: { active: true } });
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.els.vidNextUp.hidden, true, 'progressive transfer keeps ended ownership');
    assert.equal(h.hasTimer(), false);
    assert.equal(h.posted.length, 0);
  } finally {
    h.cleanup();
  }
});

test('auto-advance: closed modal ignores ended', () => {
  const h = createHarness({ modalHidden: true });
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.els.vidNextUp.hidden, true);
    assert.equal(h.hasTimer(), false);
    assert.equal(h.posted.length, 0);
  } finally {
    h.cleanup();
  }
});

test('auto-advance: single item playlist hides strip and does not countdown', () => {
  const h = createHarness({ list: [{ id: 'only', name: 'Only Item' }], currentId: 'only' });
  try {
    h.player.listeners.ended[0]();
    assert.equal(h.els.vidNextUp.hidden, true);
    assert.equal(h.hasTimer(), false);
    assert.equal(h.posted.length, 0);
  } finally {
    h.cleanup();
  }
});

test('auto-advance: prefetch respects saveData, zero cache limit, and deduplication', () => {
  // 1. saveData enabled
  const hDataSaver = createHarness({ saveData: true });
  try {
    hDataSaver.player.listeners.ended[0]();
    assert.equal(hDataSaver.posted.length, 0, 'saveData prevents prefetch');
  } finally {
    hDataSaver.cleanup();
  }

  // 2. zero cache limit
  const hZeroCache = createHarness({ cacheLimit: 0 });
  try {
    hZeroCache.player.listeners.ended[0]();
    assert.equal(hZeroCache.posted.length, 0, 'zero cache limit prevents prefetch');
  } finally {
    hZeroCache.cleanup();
  }

  // 3. deduplication across repeated events
  const hDedup = createHarness();
  try {
    hDedup.player.listeners.ended[0]();
    assert.equal(hDedup.posted.length, 1);
    hDedup.els.vidNextUpCancel.click();

    // Fire ended again for same ep1 -> ep2 should NOT be posted again
    hDedup.player.listeners.ended[0]();
    assert.equal(hDedup.posted.length, 1, 'dedup prevents second prefetch for same target');
  } finally {
    hDedup.cleanup();
  }
});
