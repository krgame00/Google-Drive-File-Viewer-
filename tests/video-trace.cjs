const { test } = require('node:test');
const assert = require('node:assert/strict');

// Minimal window shim for video-player.js import (same as route-chain-timeouts.cjs)
global.window = global.window || { GDVVideoApi: {} };
const videoApi = require('../video-player.js');

function makeTraceSpy() {
  const events = [];
  const spy = function (e, d) { events.push({ e: e, d: String(d) }); };
  spy.events = events;
  return spy;
}

test('public runner traces each failed public route with its label', () => {
  const trace = makeTraceSpy();
  const sources = [];
  const ctx = {
    traceVideoEvent: trace,
    preferredPlaybackRoute: () => null,
    apiKey: 'test-key',
    accessToken: null,
    mediaSession: 1,
    videoAttempt: 1,
    vidCurrentId: 'file-trace-public',
    videoModal: { classList: { contains: () => true } },
    vidPlayer: { style: {}, removeAttribute() {} },
    revokeCurrentVideo() {},
    tryVideoSrc: (url, fail, timeoutMs, route) => sources.push({ route: route, fail: fail }),
    probePublicStreamError: async () => null
  };
  const onFailEvents = [];
  const tryPublicStream = videoApi.createPublicStreamRunner(ctx);
  tryPublicStream('file-trace-public', (notes) => onFailEvents.push(notes));

  assert.equal(sources.length, 1);
  assert.equal(sources[0].route, 'worker');
  sources[0].fail('timeout');
  assert.equal(sources.length, 2);
  assert.equal(sources[1].route, 'usercontent');
  sources[1].fail('media', 'M2/N0/R0');

  const fails = trace.events.filter((ev) => ev.e === 'fail');
  assert.ok(fails.some((ev) => ev.d.indexOf('worker: หมดเวลา') === 0), 'worker timeout traced, got ' + JSON.stringify(fails));
  assert.ok(fails.some((ev) => ev.d.indexOf('ลิงก์ตรง: M2/N0/R0') === 0), 'usercontent media failure traced');
  assert.equal(onFailEvents.length, 0, 'chain still running after two failures');
});

test('source runner traces route start, timeout, and media diagnostic', () => {
  const trace = makeTraceSpy();
  function run() {
    const captured = { timers: [] };
    const ctx = {
      traceVideoEvent: trace,
      accessToken: null,
      mediaSession: 1,
      videoAttempt: 1,
      vidCurrentId: 'file-trace-src',
      location: { href: 'https://site.example/index.html' },
      vidPlayer: { style: {}, removeAttribute() {}, setAttribute() {} },
      videoModal: { classList: { contains: () => true } },
      cancelVideoBlobTransfer() {},
      cancelVideoAttempt() {},
      applyVideoAspect() {},
      setVideoStatus() {},
      setTimeout: (fn) => { captured.timers.push(fn); return captured.timers.length; },
      clearTimeout() {}
    };
    const fails = [];
    const tryVideoSrc = videoApi.createVideoSourceRunner(ctx);
    tryVideoSrc(new URL('https://site.example/__drive_stream?id=file-trace-src'), (reason, diagnostic) => fails.push({ reason: reason, diagnostic: diagnostic }), 3000, 'bearer');
    return { ctx: ctx, captured: captured, fails: fails };
  }

  const first = run();
  assert.ok(trace.events.some((ev) => ev.e === 'route' && ev.d.indexOf('bearer เริ่ม (หมดเวลา 3 วิ)') !== -1), 'route start traced, got ' + JSON.stringify(trace.events));

  first.captured.timers.forEach((fn) => fn());
  assert.equal(first.fails.length, 1);
  assert.equal(first.fails[0].reason, 'timeout');
  assert.ok(trace.events.some((ev) => ev.e === 'fail' && ev.d === 'bearer หมดเวลา'), 'timeout traced');

  const second = run();
  second.ctx.vidPlayer.error = { code: 3 };
  second.ctx.vidPlayer.networkState = 2;
  second.ctx.vidPlayer.readyState = 0;
  second.ctx.vidPlayer.onerror();
  assert.equal(second.fails.length, 1);
  assert.equal(second.fails[0].reason, 'media');
  assert.equal(second.fails[0].diagnostic, 'M3/N2/R0');
  assert.ok(trace.events.some((ev) => ev.e === 'fail' && ev.d === 'bearer media M3/N2/R0'), 'media diagnostic traced');
});

test('trace renders into the modal elements via the real center functions', () => {
  const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');
  const persisted = [];
  const elements = {};
  const makeEl = () => ({ hidden: true, textContent: '', style: {}, classList: { add() {}, remove() {} }, open: false, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {} });
  for (const id of ['vidErrorStatus', 'vidLoadingText', 'vidHelp', 'vidTitle', 'vidFullTitle', 'vidPreviewNote', 'vidInfo', 'vidSlowActions', 'vidTrace', 'vidTraceLines', 'vidTraceToggle']) {
    elements[id] = makeEl();
  }
  const bridge = {
    document: { getElementById: (id) => elements[id] || null },
    window: {},
    videoModal: { classList: { contains: () => true, add() {}, remove() {} } },
    vidPlayer: { style: {}, removeAttribute() {}, setAttribute() {} },
    vidLoading: { classList: { add() {}, remove() {} } },
    location: { href: 'https://site.example/index.html' },
    accessToken: null,
    mediaSession: 1,
    videoAttempt: 1,
    vidCurrentId: 'file-render',
    cancelVideoBlobTransfer() {},
    cancelVideoAttempt() {},
    applyVideoAspect() {},
    lsSet: (k, v) => persisted.push([k, v])
  };
  const video = loadVideoPlayerApi(bridge);
  const fails = [];
  const tryVideoSrc = video.createVideoSourceRunner(bridge);
  tryVideoSrc(new URL('https://site.example/__drive_stream?id=file-render'), (reason) => fails.push(reason), 4000, 'bearer');

  assert.ok(elements.vidTraceLines.textContent.indexOf('bearer เริ่ม (หมดเวลา 4 วิ)') !== -1, 'route start rendered, got: ' + elements.vidTraceLines.textContent);
  assert.ok(elements.vidTraceToggle.textContent.indexOf('วินิจฉัย') === 0 && /\(\d+\)/.test(elements.vidTraceToggle.textContent), 'toggle shows the event count, got: ' + elements.vidTraceToggle.textContent);
  assert.ok(elements.vidTraceLines.textContent.indexOf('[status] loading') !== -1, 'status transitions rendered too');
  assert.equal(elements.vidTrace.hidden, false, 'trace box visible while loading');
  assert.ok(persisted.length > 0 && persisted[0][0] === 'gdv_video_trace_v1', 'trace persisted to the localStorage key');
  assert.equal(fails.length, 0);
});

test('runners without a trace dependency fall back to a no-op', () => {
  const sources = [];
  const ctx = {
    preferredPlaybackRoute: () => null,
    apiKey: 'test-key',
    accessToken: null,
    mediaSession: 1,
    videoAttempt: 1,
    vidCurrentId: 'file-no-trace',
    videoModal: { classList: { contains: () => true } },
    vidPlayer: { style: {}, removeAttribute() {} },
    revokeCurrentVideo() {},
    tryVideoSrc: (url, fail, timeoutMs, route) => sources.push({ route: route, fail: fail }),
    probePublicStreamError: async () => null
  };
  const tryPublicStream = videoApi.createPublicStreamRunner(ctx);
  tryPublicStream('file-no-trace', () => {});
  assert.doesNotThrow(() => sources[0].fail('timeout'));
  assert.equal(sources.length, 2);
});

test('buffering overlay recovers via canplay after a seek', () => {
  const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');
  const elements = {};
  const makeEl = () => ({ hidden: true, textContent: '', style: {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } }, open: false, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {} });
  for (const id of ['vidErrorStatus', 'vidLoading', 'vidLoadingText', 'vidHelp', 'vidTitle', 'vidFullTitle', 'vidPreviewNote', 'vidInfo', 'vidSlowActions', 'vidTrace', 'vidTraceLines', 'vidTraceToggle']) {
    elements[id] = makeEl();
  }
  const handlers = {};
  const bridge = {
    document: { getElementById: (id) => elements[id] || null },
    window: {},
    videoModal: { classList: { contains: () => true, add() {}, remove() {} } },
    vidPlayer: { style: {}, removeAttribute() {}, setAttribute() {}, addEventListener(type, fn) { handlers[type] = fn; }, paused: false },
    vidLoading: elements.vidLoading,
    location: { href: 'https://site.example/index.html' },
    accessToken: null,
    lsSet: () => {}
  };
  loadVideoPlayerApi(bridge);
  assert.equal(typeof handlers.waiting, 'function', 'waiting listener wired');
  assert.equal(typeof handlers.canplay, 'function', 'canplay recovery listener wired');

  handlers.waiting();
  assert.ok(elements.vidLoading.classList.contains('show'), 'buffering shows the overlay');
  handlers.canplay();
  assert.ok(!elements.vidLoading.classList.contains('show'), 'canplay clears the overlay');
  assert.equal(elements.vidTrace.hidden, false, 'trace pill stays available once playback resumes');

  handlers.waiting();
  assert.ok(elements.vidLoading.classList.contains('show'), 'second stall shows the overlay again');
  bridge.vidPlayer.readyState = 2;
  handlers.timeupdate();
  assert.ok(!elements.vidLoading.classList.contains('show'), 'advancing frames at readyState 2 clear the overlay');
  bridge.vidPlayer.readyState = 1;
  handlers.waiting();
  bridge.vidPlayer.readyState = 1;
  handlers.timeupdate();
  assert.ok(elements.vidLoading.classList.contains('show'), 'no frame data yet keeps the buffering overlay');
});
