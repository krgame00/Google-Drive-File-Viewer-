const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

test('sendVideoTelemetry dispatches telemetry payload to worker with deduplication per file session', async () => {
  const sentBeacons = [];
  const fetches = [];
  const elements = {};
  const makeEl = () => ({ hidden: true, textContent: '', style: {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } }, open: false, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {} });
  for (const id of ['vidErrorStatus', 'vidLoading', 'vidLoadingText', 'vidHelp', 'vidTitle', 'vidFullTitle', 'vidPreviewNote', 'vidInfo', 'vidSlowActions', 'vidTrace', 'vidTraceLines', 'vidTraceToggle']) {
    elements[id] = makeEl();
  }
  elements.vidTitle.textContent = 'Test Episode 1';

  const bridge = {
    document: { getElementById: (id) => elements[id] || null, scripts: [], body: { style: {} } },
    window: {},
    lightbox: { classList: { contains: () => false } },
    videoModal: { classList: { contains: () => true, add() {}, remove() {} }, setAttribute: () => {}, removeAttribute: () => {} },
    vidPlayer: { style: {}, removeAttribute() {}, setAttribute() {}, addEventListener() {}, paused: false, pause() {}, load() {} },
    vidFrame: { src: '', getAttribute: () => null, removeAttribute: () => {}, style: { display: '', setProperty() {} } },
    resetPdfViewer: () => {},
    saveVideoPos: () => {},
    renderContinueWatching: () => {},
    loadContinueWatching: () => [],
    revokeCurrentVideo: () => {},
    vidLoading: elements.vidLoading,
    vidTitle: elements.vidTitle,
    vidOpenTab: {},
    vidProgressBar: { style: {} },
    revokeCurrentDoc: () => {},
    location: { href: 'https://site.example/index.html' },
    accessToken: null,
    apiKey: null,
    lsGet: () => null,
    lsSet: () => {},
    startVideoPlayback: () => {},
    tryVideoSrc: () => {},
    fetch: async (url, opts) => {
      fetches.push({ url: String(url), opts });
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
  };

  const video = loadVideoPlayerApi(bridge);
  assert.equal(typeof video.sendVideoTelemetry, 'function', 'sendVideoTelemetry is exposed on video center');

  const telemetryFetches = () => fetches.filter(f => f.url.includes('/telemetry'));

  // When no video is currently opened, sendVideoTelemetry is a safe no-op
  video.sendVideoTelemetry('downloadQuotaExceeded', 'M4/N3/R0');
  assert.equal(telemetryFetches().length, 0, 'no telemetry sent when no video is active');

  // Open a video
  video.open('test-file-telemetry-1', 'Test Episode 1');
  assert.equal(telemetryFetches().length, 0);

  // Send telemetry
  video.sendVideoTelemetry('downloadQuotaExceeded', 'M4/N3/R0');
  assert.equal(telemetryFetches().length, 1, 'telemetry dispatched to worker');
  assert.ok(telemetryFetches()[0].url.includes('telemetry'), 'URL targets /telemetry endpoint');
  assert.equal(telemetryFetches()[0].opts.method, 'POST');

  const payload = JSON.parse(telemetryFetches()[0].opts.body);
  assert.equal(payload.fileId, 'test-file-telemetry-1');
  assert.equal(payload.title, 'Test Episode 1');
  assert.equal(payload.error, 'downloadQuotaExceeded');
  assert.equal(payload.detail, 'M4/N3/R0');
  assert.ok(Array.isArray(payload.routes), 'routes is an array');
  assert.ok(typeof payload.env === 'string', 'env is a string');
  assert.ok(typeof payload.timestamp === 'string', 'timestamp is an ISO string');

  // Deduplication: sending again for the same video session must be suppressed
  video.sendVideoTelemetry('secondError', 'M2/N0/R0');
  assert.equal(telemetryFetches().length, 1, 'duplicate telemetry suppressed for same video session');

  // Opening a new video resets the deduplication guard
  video.open('test-file-telemetry-2', 'Test Episode 2');
  video.sendVideoTelemetry('timeout', 'worker 65s');
  assert.equal(telemetryFetches().length, 2, 'new video session allows sending telemetry');
  const secondPayload = JSON.parse(telemetryFetches()[1].opts.body);
  assert.equal(secondPayload.fileId, 'test-file-telemetry-2');
  assert.equal(secondPayload.error, 'timeout');
});
