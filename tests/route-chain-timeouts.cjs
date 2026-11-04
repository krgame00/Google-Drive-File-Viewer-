const { test } = require('node:test');
const assert = require('node:assert/strict');

// Provide minimal window shim for video-player.js import
global.window = global.window || { GDVVideoApi: {} };
const videoApi = require('../video-player.js');

test('TIMEOUTS ladder has frozen, canonical values', () => {
  const { TIMEOUTS } = videoApi;
  assert(TIMEOUTS, 'TIMEOUTS must be exported');
  assert.equal(Object.isFrozen(TIMEOUTS), true, 'TIMEOUTS table must be frozen');

  assert.equal(TIMEOUTS.cacheRaceMs, 350);
  assert.equal(TIMEOUTS.bufferingMs, 2000);
  assert.equal(TIMEOUTS.vlcHintMs, 3500);
  assert.equal(TIMEOUTS.workerRegisterMs, 6000);
  assert.equal(TIMEOUTS.probeMs, 8000);
  assert.equal(TIMEOUTS.genericMs, 12000);
  assert.equal(TIMEOUTS.slowMs, 15000);
  assert.equal(TIMEOUTS.bearerMs, 60000);
  assert.equal(TIMEOUTS.workerMs, 65000);
  assert.equal(TIMEOUTS.blobPlaybackMs, 120000);
});

test('WORKER_URL and EXPECTED_WORKER_REV default constants', () => {
  assert.equal(videoApi.WORKER_URL, 'https://google-drive-file-viewer.missnlpp9.workers.dev/');
  assert.equal(videoApi.EXPECTED_WORKER_REV, '');
});

test('route chain applies timeout ladder per playback source route', async () => {
  const sources = [];
  const ctx = {
    preferredPlaybackRoute: () => null,
    apiKey: 'test-key',
    accessToken: null,
    mediaSession: 1,
    videoAttempt: 1,
    vidCurrentId: 'file-timeout-test',
    videoModal: { classList: { contains: () => true } },
    probePublicStreamError: async () => null,
    vidPlayer: { style: {}, removeAttribute() {} },
    revokeCurrentVideo() {},
    tryVideoSrc: (url, fail, timeoutMs, route) => sources.push({ url, fail, timeoutMs, route }),
    showStreamFailure: () => {},
    setVideoStatus: () => {}
  };

  const tryPublicStream = videoApi.createPublicStreamRunner(ctx);
  tryPublicStream('file-timeout-test');

  // Route 1: Worker
  assert.equal(sources.length, 1);
  assert.equal(sources[0].route, 'worker');
  assert.equal(sources[0].timeoutMs, videoApi.TIMEOUTS.workerMs, 'Worker route gets TIMEOUTS.workerMs (65000ms)');

  // Fail worker -> Route 2: usercontent
  sources[0].fail();
  assert.equal(sources.length, 2);
  assert.equal(sources[1].route, 'usercontent');
  assert.equal(sources[1].timeoutMs, videoApi.TIMEOUTS.genericMs, 'Usercontent route gets TIMEOUTS.genericMs (12000ms)');

  // Fail usercontent -> Route 3: key
  sources[1].fail();
  await Promise.resolve();
  assert.equal(sources.length, 3);
  assert.equal(sources[2].route, 'key');
  assert.equal(sources[2].timeoutMs, videoApi.TIMEOUTS.genericMs, 'API key route gets TIMEOUTS.genericMs (12000ms)');
});

test('Brave-block memory lifecycle round-trip', () => {
  const mockStorage = new Map();
  const storageShim = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k)
  };

  const oldStorage = global.sessionStorage;
  global.sessionStorage = storageShim;
  try {
    assert.equal(videoApi.streamBlocked(), false, 'stream starts unblocked');
    videoApi.rememberStreamBlocked();
    assert.equal(videoApi.streamBlocked(), true, 'rememberStreamBlocked marks session as blocked');
    videoApi.clearStreamBlocked();
    assert.equal(videoApi.streamBlocked(), false, 'clearStreamBlocked resets session block');
  } finally {
    global.sessionStorage = oldStorage;
  }
});
