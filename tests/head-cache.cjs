const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');

const TOTAL = 1000; // mock file size; each upstream answer serves at most 48 bytes

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
  const dispatchMessage = async data => {
    const channel = new MessageChannel(); const replies = [];
    channel.port1.onmessage = e => replies.push(JSON.parse(JSON.stringify(e.data)));
    const waited = [];
    events.message({data, ports: [channel.port2], waitUntil(p) { waited.push(p); }});
    await Promise.allSettled(waited);
    // Port message delivery is a macrotask; yield once before closing.
    await new Promise(r => setImmediate(r));
    channel.port1.close(); try { channel.port2.close(); } catch (_) {}
    return replies;
  };
  return {request, dispatchMessage, calls, errors, ctx, events, caches: cachesInstance};
}

const fullReply = {token: 'tok', scope: 'account:t@example.com', size: TOTAL, modifiedTime: '2026-01-01T00:00:00Z', heads: true};

test('the first stream stores the opening chunk and a fresh worker serves it from disk', async () => {
  const first = setup({reply: fullReply});
  const res = await first.request();
  assert.equal(res.status, 206);
  const body = await res.text();
  assert.equal(body.length, 48);
  assert.equal(first.caches.stores.get('gdv-video-heads-v1').size, 2, 'payload + meta stored');
  assert.equal(first.calls.length, 1);

  const second = setup({reply: fullReply, cachesMock: first.caches});
  const res2 = await second.request();
  assert.equal(res2.status, 206);
  assert.equal(res2.headers.get('Content-Range'), 'bytes 0-47/' + TOTAL);
  assert.equal(res2.headers.get('Content-Length'), '48');
  assert.equal(res2.headers.get('Content-Type'), 'video/mp4');
  assert.equal(res2.headers.get('Cache-Control'), 'no-store');
  assert.equal(await res2.text(), body, 'head bytes match the streamed opening chunk');
  assert.ok(second.calls.every(c => c.options.headers.get('Range') !== 'bytes=0-16777215'), 'no upstream fetch for the opening chunk');
});

test('a seek back into the opening chunk is served from disk', async () => {
  const first = setup({reply: fullReply});
  const body = await (await first.request()).text();
  const second = setup({reply: fullReply, cachesMock: first.caches});
  const res = await second.request('__drive_stream?id=file1', 'GET', 'tab-1', 'bytes=5-');
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('Content-Range'), 'bytes 5-47/' + TOTAL);
  assert.equal(await res.text(), body.slice(5), 'served slice starts at the requested offset');
});

test('a size mismatch invalidates the head and refetches from upstream', async () => {
  const first = setup({reply: fullReply});
  await first.request();
  const second = setup({reply: Object.assign({}, fullReply, {size: TOTAL + 1}), cachesMock: first.caches});
  const res = await second.request();
  assert.equal(res.status, 206);
  assert.equal(second.calls[0].options.headers.get('Range'), 'bytes=0-16777215', 'upstream was hit for the opening chunk');
  assert.equal(second.caches.stores.get('gdv-video-heads-v1').size, 2, 'a fresh head replaced the stale one');
});

test('a modifiedTime mismatch invalidates the head', async () => {
  const first = setup({reply: fullReply});
  await first.request();
  const second = setup({reply: Object.assign({}, fullReply, {modifiedTime: '2027-06-06T00:00:00Z'}), cachesMock: first.caches});
  await second.request();
  assert.equal(second.calls[0].options.headers.get('Range'), 'bytes=0-16777215');
});

test('expired heads are dropped after the TTL', async () => {
  const first = setup({reply: fullReply});
  await first.request();
  const store = first.caches.stores.get('gdv-video-heads-v1');
  for (const [url, rec] of [...store]) {
    if (!url.endsWith('/meta')) continue;
    const meta = JSON.parse(Buffer.from(rec.body).toString('utf8'));
    meta.at = Date.now() - 31 * 86400000;
    await (await first.caches.open('gdv-video-heads-v1')).put(url, new Response(JSON.stringify(meta), {headers: {'Content-Type': 'application/json'}}));
  }
  const second = setup({reply: fullReply, cachesMock: first.caches});
  await second.request();
  assert.equal(second.calls[0].options.headers.get('Range'), 'bytes=0-16777215');
});

test('heads off or a missing scope never writes or serves the head', async () => {
  const off = setup({reply: Object.assign({}, fullReply, {heads: false})});
  await off.request();
  assert.equal(off.caches.stores.get('gdv-video-heads-v1'), undefined, 'nothing stored');

  const noScope = setup({reply: Object.assign({}, fullReply, {scope: null, heads: true})});
  await noScope.request();
  assert.equal(noScope.caches.stores.get('gdv-video-heads-v1'), undefined, 'nothing stored without a scope');
});

test('a legacy plain token reply streams exactly as before', async () => {
  const legacy = setup({reply: {token: 'test-token'}});
  const res = await legacy.request();
  assert.equal(res.status, 206);
  assert.equal((await res.text()).length, 48);
  assert.equal(legacy.caches.stores.get('gdv-video-heads-v1'), undefined);
});

test('the prefetch message stores the next episode head and is idempotent', async () => {
  const app = setup({reply: fullReply});
  const message = {type: 'drive-stream-prefetch', id: 'file2', token: 'tok', scope: 'account:t@example.com', size: TOTAL, modifiedTime: '2026-01-01T00:00:00Z', heads: true};
  const replies = await app.dispatchMessage(message);
  assert.deepEqual(replies, [{type: 'drive-stream-prefetch-result', ok: true}]);
  const store = app.caches.stores.get('gdv-video-heads-v1');
  assert.ok(store && store.size === 2, 'payload + meta stored');
  const fetchesAfterFirst = app.calls.length;
  assert.ok(fetchesAfterFirst > 0);

  const replies2 = await app.dispatchMessage(message);
  assert.deepEqual(replies2, [{type: 'drive-stream-prefetch-result', ok: true}]);
  assert.equal(app.calls.length, fetchesAfterFirst, 'second prefetch was served by the cache');

  const player = setup({reply: Object.assign({}, fullReply, {size: TOTAL}), cachesMock: app.caches});
  const res = await player.request('__drive_stream?id=file2');
  assert.equal(res.status, 206);
  assert.equal(player.calls.filter(c => c.options.headers.get('Range') === 'bytes=0-16777215').length, 0, 'player got the prefetched head without an upstream fetch');
});

test('a slow in-flight prefetch is not duplicated', async () => {
  const gate = {resolve: null};
  const blocker = new Promise(resolve => { gate.resolve = resolve; });
  const seen = [];
  const slowFetch = async (url, options) => {
    seen.push({url, options});
    await blocker;
    const m = /^bytes=(\d+)-(\d+)$/.exec(options.headers.get('Range') || '');
    return new Response('x', {status: 206, headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes ' + m[1] + '-' + m[1] + '/' + TOTAL, 'Content-Length': '1'}});
  };
  const app = setup({reply: fullReply, fetchImpl: slowFetch});
  const message = {type: 'drive-stream-prefetch', id: 'file2', token: 'tok', scope: 'account:t@example.com', size: TOTAL, modifiedTime: '', heads: true};
  const firstPort = new MessageChannel(); const secondPort = new MessageChannel();
  const firstReplies = [], secondReplies = [];
  firstPort.port1.onmessage = e => firstReplies.push(e.data);
  secondPort.port1.onmessage = e => secondReplies.push(e.data);
  app.events.message({data: message, ports: [firstPort.port2], waitUntil() {}});
  app.events.message({data: message, ports: [secondPort.port2], waitUntil() {}});
  await new Promise(r => setTimeout(r, 10));
  gate.resolve();
  await new Promise(r => setTimeout(r, 20));
  firstPort.port1.close(); secondPort.port1.close();
  try { firstPort.port2.close(); } catch (_) {}
  try { secondPort.port2.close(); } catch (_) {}
  assert.deepEqual(firstReplies.map(r => r.ok), [true]);
  assert.deepEqual(secondReplies, [{type: 'drive-stream-prefetch-result', ok: false, reason: 'inflight'}]);
  assert.equal(seen.length, 5, 'one parallel batch plus one fallback fetch, nothing more');
});

test('prefetch without token, scope or consent is ignored', async () => {
  const app = setup({reply: fullReply});
  for (const bad of [
    {type: 'drive-stream-prefetch', id: 'f', scope: 's', heads: true},
    {type: 'drive-stream-prefetch', id: 'f', token: 'tok', scope: '', heads: true},
    {type: 'drive-stream-prefetch', id: 'f', token: 'tok', scope: 's', heads: false},
    {type: 'drive-stream-prefetch', id: '../etc', token: 'tok', scope: 's', heads: true}
  ]) {
    await app.dispatchMessage(bad);
  }
  assert.equal(app.calls.length, 0);
  assert.equal(app.caches.stores.get('gdv-video-heads-v1'), undefined);
});
