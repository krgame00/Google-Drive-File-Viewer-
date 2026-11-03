// BUG 1 trap + head-cache admin protocol: the page asks the SW over messages
// and never enumerates gdv-video-heads-v1, so a page-init stats refresh can
// never orphan-sweep the SW's payloads (the pre-redesign failure mode).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');
const protocol=require('../stream-protocol.js');

const TOTAL = 1000;

function createCachesMock() {
  const stores = new Map();
  const urlOf = r => typeof r === 'string' ? new Request(r).url : r.url;
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(key) { const rec = store.get(urlOf(key)); return rec ? new Response(Uint8Array.from(rec.body), {status: rec.status, headers: rec.headers}) : undefined; },
        async put(key, res) {
          const body = res.body ? Buffer.from(await new Response(res.body).arrayBuffer()) : Buffer.alloc(0);
          store.set(urlOf(key), {status: res.status, headers: [...res.headers], body});
        },
        async delete(key) { return store.delete(urlOf(key)); },
        async keys() { return [...store.keys()].map(u => new Request(u)); }
      };
    },
    async delete(name) { return stores.delete(name); }
  };
}

function setup({reply = null, cachesMock = null, fetchImpl = null} = {}) {
  const events = {}, calls = [], errors = [];
  const theClient = {url: 'https://example.com/app/index.html', postMessage(data, ports) {
    if (ports) { ports[0].postMessage(reply !== null ? reply : {token: 'test-token'}); ports[0].close(); }
    else { errors.push(data); }
  }};
  const streamBody = s => new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(s)); c.close(); }});
  const defaultFetch = async (url, options) => {
    calls.push({url, options});
    const m = /^bytes=(\d+)-(\d+)$/.exec(options.headers.get('Range') || '');
    const s = m ? Number(m[1]) : 0, e = m ? Math.min(Number(m[2]), s + 47) : 47;
    if (s >= TOTAL) return new Response('', {status: 416, headers: {'Content-Type': 'text/plain'}});
    let payload = '';
    for (let i = s; i <= e; i++) payload += String.fromCharCode(48 + (i % 74));
    return new Response(streamBody(payload), {status: 206, headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes ' + s + '-' + (s + payload.length - 1) + '/' + TOTAL, 'Content-Length': String(payload.length)}});
  };
  const cachesInstance = cachesMock || createCachesMock();
  const ctx = {URL, Headers, Response, Request, Blob, MessageChannel, AbortController, ReadableStream, setTimeout, clearTimeout,
    importScripts() { ctx.GDVStreamProtocol = require('../stream-protocol.js'); },
    caches: cachesInstance,
    self: {registration: {scope: 'https://example.com/app/'}, addEventListener(n, f) { events[n] = f; },
      clients: {get: async id => theClient, matchAll: async () => [theClient]}}};
  ctx.fetch = fetchImpl || defaultFetch;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('drive-stream-sw.js', 'utf8'), ctx);
  const request = async (path = '__drive_stream?id=file1', method = 'GET', clientId = 'tab-1', range = 'bytes=0-') => {
    let result; const waited = [];
    events.fetch({clientId, request: new Request('https://example.com/app/' + path, {method, headers: {Range: range}}), respondWith(p) { result = p; }, waitUntil(p) { waited.push(p); }});
    const res = await result;
    await Promise.allSettled(waited);
    return res;
  };
  const dispatchMessage = async (data, expectReplies = 0) => {
    const channel = new MessageChannel(); const replies = [];
    channel.port1.onmessage = e => replies.push(JSON.parse(JSON.stringify(e.data)));
    const waited = [];
    events.message({data, ports: [channel.port2], waitUntil(p) { waited.push(p); }});
    await Promise.allSettled(waited);
    await new Promise(resolve => {
      const started = Date.now();
      const check = () => (replies.length >= expectReplies || Date.now() - started > 1000) ? resolve() : setTimeout(check, 5);
      check();
    });
    channel.port1.close(); try { channel.port2.close(); } catch (_) {}
    return replies;
  };
  return {request, dispatchMessage, calls, errors, ctx, events, caches: cachesInstance};
}

const fullReply = {token: 'tok', scope: 'account:t@example.com', size: TOTAL, modifiedTime: '2026-01-01T00:00:00Z', heads: true};
const HEAD_STORE = 'gdv-video-heads-v1';

test('page-init stats via the protocol report SW heads and never delete them (BUG 1 trap)', async () => {
  const first = setup({reply: fullReply});
  const res = await first.request();
  const body = await res.text();
  assert.equal(first.caches.stores.get(HEAD_STORE).size, 2, 'payload + meta stored by the SW');

  const replies = await first.dispatchMessage(protocol.headStatsRequest('req-1'), 1);
  assert.deepEqual(replies, [{type: 'drive-stream-head-stats-result', requestId: 'req-1', supported: true, bytes: body.length, count: 1}]);
  assert.equal(first.caches.stores.get(HEAD_STORE).size, 2, 'stats swept nothing');

  const second = setup({reply: fullReply, cachesMock: first.caches});
  const res2 = await second.request();
  assert.equal(res2.status, 206);
  assert.equal(await res2.text(), body, 'the head survived the stats refresh and still serves');
  assert.ok(second.calls.every(c => c.options.headers.get('Range') !== 'bytes=0-16777215'), 'no upstream refetch after stats');
});

test('head-stats self-heals ghost metas left without payloads', async () => {
  const app = setup({reply: fullReply});
  await app.request();
  const store = app.caches.stores.get(HEAD_STORE);
  for (const url of [...store.keys()]) if (!url.endsWith('/meta')) store.delete(url);

  const replies = await app.dispatchMessage(protocol.headStatsRequest('req-2'), 1);
  assert.deepEqual(replies, [{type: 'drive-stream-head-stats-result', requestId: 'req-2', supported: true, bytes: 0, count: 0}]);
  assert.equal(store.size, 0, 'the orphaned meta was cleaned up with the payload gone');
});

test('readHead refreshes stale LRU timestamps on use', async () => {
  const app = setup({reply: fullReply});
  await app.request();
  const cache = await app.caches.open(HEAD_STORE);
  for (const request of await cache.keys()) {
    if (!request.url.endsWith('/meta')) continue;
    const rec = await cache.match(request);
    const meta = JSON.parse(Buffer.from(await rec.arrayBuffer()).toString('utf8'));
    meta.at = Date.now() - 120000;
    await cache.put(request.url, new Response(JSON.stringify(meta), {headers: {'Content-Type': 'application/json'}}));
  }
  const before = Date.now();
  await app.request('__drive_stream?id=file1', 'GET', 'tab-1', 'bytes=0-');
  for (const request of await cache.keys()) {
    if (!request.url.endsWith('/meta')) continue;
    const rec = await cache.match(request);
    const meta = JSON.parse(Buffer.from(await rec.arrayBuffer()).toString('utf8'));
    assert.ok(meta.at >= before, 'meta timestamp was refreshed by the read');
  }
});

test('heads-clear empties the cache and answers cleared:true', async () => {
  const app = setup({reply: fullReply});
  await app.request();
  assert.ok(app.caches.stores.get(HEAD_STORE).size > 0);

  const replies = await app.dispatchMessage(protocol.headClearRequest('req-3'), 1);
  assert.deepEqual(replies, [{type: 'drive-stream-heads-clear-result', requestId: 'req-3', cleared: true}]);
  assert.equal(app.caches.stores.get(HEAD_STORE), undefined, 'whole cache deleted by its owner');
});

test('protocol.headCacheUrl round-trips with the layout the SW writes', async () => {
  const app = setup({reply: fullReply});
  await app.request();
  const keys = [...app.caches.stores.get(HEAD_STORE).keys()];
  const payloadKey = keys.find(u => !u.endsWith('/meta'));
  assert.equal(payloadKey, protocol.headCacheUrl('account:t@example.com', 'file1', 'https://example.com/app/'), 'one derivation, two consumers');
});

test('wire helpers: legacy token replies degrade, probe attempts never pass gates', () => {
  const legacy = protocol.normalizeTokenReply({token: 'plain'});
  assert.equal(legacy.token, 'plain');
  assert.equal(legacy.heads, false);
  assert.equal(legacy.scope, null);
  assert.equal(protocol.normalizeTokenReply({token: ''}), null);
  assert.equal(protocol.isProbeAttempt('probe'), true);
  assert.equal(protocol.isProbeAttempt(3), false);
  assert.equal(protocol.parsePrefetchGrant({type: 'drive-stream-prefetch', id: 'f', token: 't', scope: '', heads: true}), null, 'empty scope rejected');
  assert.equal(protocol.parsePrefetchGrant({type: 'drive-stream-prefetch', id: '../x', token: 't', scope: 's', heads: true}), null, 'bad id rejected');
  assert.deepEqual(JSON.parse(JSON.stringify(protocol.prefetchResult(true))), {type: 'drive-stream-prefetch-result', ok: true});
});

test('video-cache browserStore never validates or sweeps foreign prefixes', async () => {
  const cachesMock = createCachesMock();
  const previousWindow = global.window;
  const testWindow = {caches: cachesMock, location: {href: 'https://example.com/app/index.html', protocol: 'https:'}};
  global.window = testWindow;
  delete require.cache[require.resolve('../video-cache.js')];
  try {
    const cacheApi = require('../video-cache.js').createVideoCache({});
    assert.ok(cacheApi.supported, 'browserStore active against the mock caches');
    await cacheApi.put('ownkey', new Blob(['own-payload']), {size: 11}, 'public');
    // A foreign store's entries share the same Cache Storage name but not the
    // __video_cache/ prefix — exactly the head-cache drift that wiped payloads.
    const shared = await cachesMock.open('gdv-completed-videos-v1');
    await shared.put('https://example.com/app/__video_head/foreign', new Response('head-payload'));
    await shared.put('https://example.com/app/__video_head/foreign/meta', new Response(JSON.stringify({key: 'foreign', size: 11, at: Date.now()}), {headers: {'Content-Type': 'application/json'}}));

    const stats = await cacheApi.stats();
    assert.equal(stats.count, 1, 'only the own-prefix record is counted');
    const headStore = cachesMock.stores.get('gdv-completed-videos-v1');
    assert.ok(headStore.get('https://example.com/app/__video_head/foreign'), 'foreign payload untouched by the sweep');
    assert.ok(headStore.get('https://example.com/app/__video_head/foreign/meta'), 'foreign meta untouched by validation');
  } finally {
    if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
    delete require.cache[require.resolve('../video-cache.js')];
  }
});
