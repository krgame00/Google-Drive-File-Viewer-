// Only handles media requests. No offline cache and no persisted credentials.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const endpoint = new URL('__drive_stream', self.registration.scope);
  if (url.origin === endpoint.origin && url.pathname === endpoint.pathname) {
    event.respondWith(streamFile(event, url.searchParams.get('id'), url.searchParams.get('attempt')));
  }
});

function failure(status) {
  return new Response('Video stream unavailable', {status, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'
  }});
}

const MEDIA_CHUNK_BYTES = 16777216;
function boundedMediaRange(range, chunkBytes = MEDIA_CHUNK_BYTES) {
  const open = range && range.match(/^bytes=(\d{1,20})-$/i);
  if (!open) return range;
  const start = BigInt(open[1]);
  return 'bytes=' + start + '-' + (start + BigInt(chunkBytes) - 1n);
}
// One prefetched chunk for the next media request; lost if the worker restarts.
let ahead = null;
// Files whose source answered with a usable length stream in parallel (LRU up to 10 files).
let parallelOk = null;
let parallelTotal = null;
const parallelFiles = new Map();
function rememberParallelFile(id, total) {
  parallelOk = id;
  parallelTotal = total;
  if (parallelFiles.has(id)) parallelFiles.delete(id);
  parallelFiles.set(id, total);
  if (parallelFiles.size > 10) parallelFiles.delete(parallelFiles.keys().next().value);
}
async function fetchParallelChunk(id, start, end, token, signal) {
  // Split one bounded interval into four sub-intervals fetched in parallel
  // and stream them to the player in order; returns the composite 206
  // Response, or null to fall back to a single connection.
  const total = end - start + 1n;
  if (total < 4n) return null;
  const part = total / 4n;
  const ranges = [];
  for (let i = 0n; i < 4n; i++) {
    const s = start + i * part;
    ranges.push([s, i === 3n ? end : s + part - 1n]);
  }
  let responses;
  try {
    responses = await Promise.all(ranges.map(function (pair) {
      return fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
        method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: signal,
        headers: new Headers({Authorization: 'Bearer ' + token, Range: 'bytes=' + pair[0] + '-' + pair[1]})
      });
    }));
  } catch (_) { return null; }
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    const actual = res.ok && res.status === 206 ? (res.headers.get('Content-Range') || '').match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/i) : null;
    const actualStart = actual ? BigInt(actual[1]) : -1n;
    const actualEnd = actual ? BigInt(actual[2]) : -1n;
    if (!actual || actualStart !== ranges[i][0] || actualEnd < actualStart || actualEnd > ranges[i][1] || (i < ranges.length - 1 && actualEnd !== ranges[i][1])) {
      for (const other of responses) if (other.body) other.body.cancel().catch(function () {});
      return null;
    }
  }
  let delivered = 0n, known = true, fileTotal = null;
  for (const res of responses) {
    const length = Number(res.headers.get('Content-Length'));
    if (Number.isFinite(length) && length >= 0) delivered += BigInt(length); else known = false;
    const headerTotal = (res.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
    if (headerTotal && headerTotal[1] !== '*') fileTotal = BigInt(headerTotal[1]);
  }
  if (!known || delivered === 0n) { for (const res of responses) if (res.body) res.body.cancel().catch(function () {}); return null; }
  const type = responses[responses.length - 1].headers.get('Content-Type') || 'application/octet-stream';
  const stop = start + delivered - 1n;
  const compositeRange = 'bytes ' + start + '-' + stop + '/' + (fileTotal !== null && fileTotal > stop ? fileTotal.toString() : '*');
  const readers = responses.map(function (res) { return res.body.getReader(); });
  let index = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      while (index < readers.length) {
        const chunk = await readers[index].read();
        if (chunk.done) { index++; continue; }
        controller.enqueue(chunk.value);
        return;
      }
      controller.close();
    },
    cancel() { for (const reader of readers) reader.cancel().catch(function () {}); }
  });
  const headers = new Headers({'Cache-Control': 'no-store', 'Content-Type': type, 'Content-Range': compositeRange, 'Accept-Ranges': 'bytes', 'Content-Length': delivered.toString()});
  return new Response(stream, {status: 206, headers: headers});
}

// Head-start cache: the opening chunk of each streamed file, so re-opens and
// seeks back into the first seconds start from disk instead of Google. Keys
// mirror the page-side video-cache store ('__video_head/<encoded key>') so its
// stats/clear controls see this cache too.
const HEAD_CACHE_NAME = 'gdv-video-heads-v1';
const HEAD_BUDGET_BYTES = 536870912;
const HEAD_MAX_ENTRIES = 32;
const HEAD_TTL_MS = 30 * 86400000;
function headCacheUrl(scope, id) {
  return new URL('__video_head/' + encodeURIComponent(JSON.stringify([scope, id])), self.registration.scope).href;
}
async function readHead(id, ctx) {
  try {
    const cache = await caches.open(HEAD_CACHE_NAME);
    const key = headCacheUrl(ctx.scope, id);
    const metaRes = await cache.match(key + '/meta');
    const payloadRes = await cache.match(key);
    if (!metaRes || !payloadRes) return null;
    const record = await metaRes.json();
    const stale = !record || !Number.isFinite(record.size) || record.size <= 0
      || (Number(ctx.size) > 0 && String(record.total || '') !== String(ctx.size))
      || (ctx.modifiedTime && record.modifiedTime && ctx.modifiedTime !== record.modifiedTime)
      || (Date.now() - Number(record.at) > HEAD_TTL_MS);
    if (stale) { await cache.delete(key); await cache.delete(key + '/meta'); return null; }
    const blob = await payloadRes.blob();
    if (!blob.size) { await cache.delete(key); await cache.delete(key + '/meta'); return null; }
    return {blob: blob, total: String(record.total || ''), type: String(record.type || '')};
  } catch (_) { return null; }
}
async function writeHead(id, ctx, bodySource, info) {
  try {
    const blob = bodySource instanceof Blob ? bodySource : await new Response(bodySource).blob();
    if (!blob.size) return false;
    const cache = await caches.open(HEAD_CACHE_NAME);
    const key = headCacheUrl(ctx.scope, id);
    const meta = {key: JSON.stringify([ctx.scope, id]), size: blob.size, modifiedTime: ctx.modifiedTime || '', total: String(info.total || ''), type: String(info.type || ''), at: Date.now()};
    await cache.put(key, new Response(blob));
    await cache.put(key + '/meta', new Response(JSON.stringify(meta), {headers: {'Content-Type': 'application/json'}}));
    await trimHeads(cache);
    return true;
  } catch (_) { return false; }
}
async function trimHeads(cache) {
  try {
    const keys = await cache.keys();
    const metaUrls = [], records = [];
    for (const request of keys) {
      if (!request.url.endsWith('/meta')) continue;
      const payloadUrl = request.url.slice(0, -'/meta'.length);
      try {
        const res = await cache.match(request);
        const record = await res.json();
        if (record && record.key && Number.isFinite(record.size) && record.size > 0) { records.push(record); metaUrls.push(payloadUrl); }
        else { await cache.delete(request); await cache.delete(payloadUrl); }
      } catch (_) { await cache.delete(request); await cache.delete(payloadUrl); }
    }
    const payloadUrls = new Set(metaUrls);
    for (const request of keys) {
      if (!request.url.endsWith('/meta') && !payloadUrls.has(request.url)) await cache.delete(request);
    }
    const entries = records.map((record, i) => ({at: Number(record.at) || 0, payload: metaUrls[i], meta: metaUrls[i] + '/meta', size: record.size})).sort((a, b) => a.at - b.at);
    let total = entries.reduce((sum, entry) => sum + entry.size, 0);
    let count = entries.length;
    for (const entry of entries) {
      if (total <= HEAD_BUDGET_BYTES && count <= HEAD_MAX_ENTRIES) break;
      await cache.delete(entry.payload);
      await cache.delete(entry.meta);
      total -= entry.size;
      count--;
    }
  } catch (_) {}
}
function serveHeadRange(head, requestedBound) {
  const reqStart = BigInt(requestedBound[1]);
  const reqEnd = BigInt(requestedBound[2]);
  const headEnd = BigInt(head.blob.size) - 1n;
  if (reqEnd < reqStart || reqStart > headEnd) return null;
  const sliceEnd = reqEnd < headEnd ? reqEnd : headEnd;
  const total = /^\d+$/.test(head.total) && BigInt(head.total) > sliceEnd ? head.total : '*';
  const type = head.type || 'video/mp4';
  const headers = new Headers({
    'Cache-Control': 'no-store', 'Content-Type': type,
    'Content-Range': 'bytes ' + reqStart + '-' + sliceEnd + '/' + total,
    'Accept-Ranges': 'bytes', 'Content-Length': (sliceEnd - reqStart + 1n).toString()
  });
  const body = head.blob.slice(Number(reqStart), Number(sliceEnd) + 1, type);
  return {sliceEnd: sliceEnd.toString(), response: new Response(body, {status: 206, headers: headers})};
}
function scheduleAheadChunk(id, token, nextStart) {
  if (ahead && (ahead.id !== id || ahead.start !== nextStart)) {
    ahead.controller.abort();
    ahead = null;
  }
  if (ahead) return;
  const controller = new AbortController();
  const entry = {id: id, start: nextStart, controller: controller};
  const guard = setTimeout(function () { if (ahead === entry) { ahead = null; controller.abort(); } }, 120000);
  const end = nextStart + BigInt(MEDIA_CHUNK_BYTES) - 1n;
  const activeParallel = parallelOk === id || parallelFiles.has(id);
  const activeTotal = parallelFiles.has(id) ? parallelFiles.get(id) : (parallelOk === id ? parallelTotal : null);
  const nextReachesEnd = activeTotal !== null && end >= activeTotal;
  entry.promise = (activeParallel && !nextReachesEnd
    ? fetchParallelChunk(id, nextStart, end, token, controller.signal)
    : fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
        method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: new Headers({Authorization: 'Bearer ' + token, Range: 'bytes=' + nextStart + '-' + end})
      })
  ).then(function (res) { clearTimeout(guard); return res; }, function () { clearTimeout(guard); return null; });
  ahead = entry;
}

function requestToken(clients, id) {
  // The page may attach stream metadata (scope/size/modifiedTime/heads) to the
  // token reply so the worker can validate and serve the cached head chunk.
  return new Promise(resolve => {
    let settled = false, pending = clients.length;
    const ports = [];
    const finish = data => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const port of ports) port.close();
      const token = data && typeof data.token === 'string' && data.token.length ? data.token : null;
      resolve(token ? {
        token: token,
        scope: data && typeof data.scope === 'string' && data.scope.length <= 200 ? data.scope : null,
        size: data ? Number(data.size) || 0 : 0,
        modifiedTime: data && typeof data.modifiedTime === 'string' ? data.modifiedTime.slice(0, 100) : '',
        heads: !!(data && data.heads === true)
      } : null);
    };
    const timer = setTimeout(() => finish(null), 3000);
    // A non-playing tab answers null; wait for the playing tab's valid token.
    for (const client of clients) {
      const channel = new MessageChannel();
      ports.push(channel.port1);
      let answered = false;
      const reply = data => {
        if (answered || settled) return;
        answered = true;
        if (data && typeof data.token === 'string' && data.token.length) finish(data);
        else if (--pending === 0) finish(null);
      };
      channel.port1.onmessage = event => reply(event.data);
      try { client.postMessage({type: 'drive-stream-token', id}, [channel.port2]); }
      catch (_) { channel.port2.close(); reply(null); }
    }
    if (!clients.length) finish(null);
  });
}

async function streamFile(event, id, attempt) {
  const request = event.request;
  if (!['GET', 'HEAD'].includes(request.method)) return failure(405);
  if (!id || !/^[\w-]{1,200}$/.test(id)) return failure(400);
  try {
    // Media element requests can arrive without a clientId (observed on Brave),
    // so ask every in-scope window client; the page only answers for the file
    // it is currently playing, which keeps the handshake scoped.
    const targets = [];
    const primary = event.clientId && await self.clients.get(event.clientId);
    if (primary && primary.url.startsWith(self.registration.scope)) targets.push(primary);
    if (!targets.length) {
      const all = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
      for (const c of all) if (c.url.startsWith(self.registration.scope)) targets.push(c);
    }
    if (!targets.length) return failure(401);
    const reporter = targets[0];
    const reply = await requestToken(targets, id);
    if (!reply || !reply.token) {
      reporter.postMessage({type:'drive-stream-error',id,status:401,attempt});
      return failure(401);
    }
    const token = reply.token;
    // With page-vouched metadata the worker can serve the opening chunk from
    // the head cache; without it everything behaves exactly as before.
    const headCtx = reply.heads && reply.scope ? {scope: reply.scope, size: reply.size, modifiedTime: reply.modifiedTime} : null;
    const headers = new Headers({Authorization: 'Bearer ' + token});
    const range = request.headers.get('Range');
    let boundedRange = boundedMediaRange(range);
    if (boundedRange) headers.set('Range', boundedRange);
    // A chunk prefetched during the previous request may already cover this one.
    let upstream = null;
    const requestedBound = /^bytes=(\d+)-(\d+)$/.exec(boundedRange || '');
    if (request.method === 'GET' && ahead) {
      if (ahead.id === id && requestedBound && ahead.start === BigInt(requestedBound[1])) {
        const hit = ahead;
        ahead = null;
        try {
          const cached = await hit.promise;
          if (cached && cached.ok) upstream = cached;
          else if (cached && cached.body) await cached.body.cancel();
        } catch (_) {}
      } else {
        ahead.controller.abort();
        ahead = null;
      }
    }
    // Re-open or seek into the opening chunk: serve from the head cache and
    // warm the next chunk so playback continues without waiting on Google.
    if (!upstream && request.method === 'GET' && headCtx && requestedBound) {
      const head = await readHead(id, headCtx);
      if (head) {
        const served = serveHeadRange(head, requestedBound);
        if (served) {
          const headEnd = BigInt(served.sliceEnd);
          const headTotal = /^\d+$/.test(head.total) ? BigInt(head.total) : null;
          if (!request.signal.aborted && (!headTotal || headEnd + 1n < headTotal)) scheduleAheadChunk(id, token, headEnd + 1n);
          return served.response;
        }
      }
    }
    const canParallel = parallelOk === id || parallelFiles.has(id);
    const knownTotal = parallelFiles.has(id) ? parallelFiles.get(id) : (parallelOk === id ? parallelTotal : null);
    const reachesKnownEnd = canParallel && knownTotal !== null && requestedBound && BigInt(requestedBound[2]) >= knownTotal;
    if (!upstream) {
      if (request.method === 'GET' && requestedBound && boundedRange !== range && canParallel && !reachesKnownEnd) {
        upstream = await fetchParallelChunk(id, BigInt(requestedBound[1]), BigInt(requestedBound[2]), token, request.signal);
      }
      if (!upstream) {
        for (let retry = 0; retry < 3; retry++) {
          try { upstream = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
            method: request.method, headers, credentials: 'omit', cache: 'no-store',
            redirect: 'error', signal: request.signal
          }); } catch (_) {
            if (!request.signal.aborted) reporter.postMessage({type:'drive-stream-error',id,status:502,reason:'streamFetchFailed',attempt});
            return failure(502);
          }
          if (!upstream.ok) {
            let reason='';
            try { const body=await upstream.json(); reason=body.error?.errors?.[0]?.reason || ''; } catch (_) {}
            if (upstream.status === 403 && reason === 'downloadQuotaExceeded' && boundedRange !== range && retry < 2 && !request.signal.aborted) {
              boundedRange = boundedMediaRange(range, retry === 0 ? 2097152 : 1048576);
              headers.set('Range', boundedRange);
              continue;
            }
            reporter.postMessage({type:'drive-stream-error',id,status:upstream.status,reason,attempt});
            return failure(upstream.status);
          }
          break;
        }
      }
    }
    // A source that reports usable lengths can be fetched in parallel from
    // the next interval on; lengthless answers keep the single connection.
    if (upstream && upstream.status === 206 && upstream.headers.get('Content-Length')) {
      const totalMatch = (upstream.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
      rememberParallelFile(id, totalMatch && totalMatch[1] !== '*' ? BigInt(totalMatch[1]) : (parallelFiles.get(id) || null));
    }
    const type = upstream.headers.get('Content-Type') || '';
    if (!/^(video\/|audio\/|application\/octet-stream(?:;|$))/i.test(type)) {
      if (upstream.body) await upstream.body.cancel();
      return failure(502);
    }
    if (boundedRange !== range) {
      const actual = (upstream.headers.get('Content-Range') || '').match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/i);
      const requested = boundedRange.match(/^bytes=(\d+)-(\d+)$/);
      // A 206 certifies the bounded interval; some responses hide Content-Range
      // from scripts (CORS exposure), so an unreadable header passes through.
      const rangeFailure = upstream.status !== 206 ? 'status' : !actual ? null
        : BigInt(actual[1]) !== BigInt(requested[1]) ? 'start'
        : BigInt(actual[2]) < BigInt(actual[1]) || BigInt(actual[2]) > BigInt(requested[2]) ? 'end'
        : actual[3] !== '*' && BigInt(actual[3]) <= BigInt(actual[2]) ? 'total' : null;
      if (rangeFailure) {
        if (upstream.body) await upstream.body.cancel();
        reporter.postMessage({type:'drive-stream-error',id,status:502,reason:'streamRangeUnsupported',attempt,rangeFailure,upstreamStatus:upstream.status});
        return failure(502);
      }
    }
    // Persist the opening chunk while it streams: one tee branch keeps feeding
    // the player, the other drains into the head cache in the background.
    if (request.method === 'GET' && headCtx && upstream.status === 206 && requestedBound && BigInt(requestedBound[1]) === 0n && upstream.body) {
      const branches = upstream.body.tee();
      const upstreamTotal = (upstream.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
      const headType = upstream.headers.get('Content-Type') || '';
      const cacheWrite = writeHead(id, headCtx, branches[1], {total: upstreamTotal && upstreamTotal[1] !== '*' ? upstreamTotal[1] : '', type: headType});
      if (event.waitUntil) event.waitUntil(cacheWrite);
      upstream = new Response(branches[0], {status: upstream.status, headers: upstream.headers});
    }
    // Keep the next chunk in flight so the following media request starts
    // without waiting for a fresh upstream connection. A seek aborts the stale
    // prefetch; a failed one simply falls back to the normal fetch above.
    const servedBound = /^bytes=(\d+)-(\d+)$/.exec(boundedRange || '');
    const servedTotal = (upstream.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
    const atFileEnd = servedTotal && servedTotal[1] !== '*' && servedBound && BigInt(servedTotal[1]) <= BigInt(servedBound[2]) + 1n;
    if (request.method === 'GET' && servedBound && boundedRange !== range && !atFileEnd && !request.signal.aborted) {
      scheduleAheadChunk(id, token, BigInt(servedBound[2]) + 1n);
    }
    const responseHeaders = new Headers({'Cache-Control': 'no-store', 'Content-Type': type});
    for (const name of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status, headers: responseHeaders
    });
  } catch (_) {
    return failure(502);
  }
}

// The page can grant a one-file prefetch (its own token, its own scope) so the
// opening chunk of the next episode is already on disk before playback starts.
const prefetchInFlight = new Set();
self.addEventListener('message', event => {
  const data = event.data;
  if (!data || data.type !== 'drive-stream-prefetch') return;
  const id = typeof data.id === 'string' ? data.id : '';
  const token = typeof data.token === 'string' ? data.token : '';
  const scope = typeof data.scope === 'string' && data.scope.length <= 200 ? data.scope : '';
  if (!id || !/^[\w-]{1,200}$/.test(id) || !token || !scope || data.heads !== true) return;
  const port = event.ports && event.ports[0];
  if (prefetchInFlight.has(id)) {
    if (port) try { port.postMessage({type: 'drive-stream-prefetch-result', ok: false, reason: 'inflight'}); } catch (_) {}
    return;
  }
  const size = Number(data.size) || 0;
  const modifiedTime = typeof data.modifiedTime === 'string' ? data.modifiedTime.slice(0, 100) : '';
  const controller = new AbortController();
  const guard = setTimeout(() => controller.abort(), 45000);
  prefetchInFlight.add(id);
  const job = (async () => {
    try {
      if (await readHead(id, {scope: scope, size: size, modifiedTime: modifiedTime})) return true;
      let res = null;
      try { res = await fetchParallelChunk(id, 0n, BigInt(MEDIA_CHUNK_BYTES) - 1n, token, controller.signal); } catch (_) { res = null; }
      if (!res || !res.ok) {
        res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
          method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
          headers: new Headers({Authorization: 'Bearer ' + token, Range: 'bytes=0-' + (MEDIA_CHUNK_BYTES - 1)})
        });
      }
      if (!res || res.status !== 206 || !res.body) {
        if (res && res.body) { try { await res.body.cancel(); } catch (_) {} }
        return false;
      }
      const contentRange = (res.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
      const type = res.headers.get('Content-Type') || '';
      if (!contentRange || !/^(video\/|audio\/|application\/octet-stream(?:;|$))/i.test(type)) {
        try { await res.body.cancel(); } catch (_) {}
        return false;
      }
      return await writeHead(id, {scope: scope, modifiedTime: modifiedTime}, res.body, {total: contentRange[1] !== '*' ? contentRange[1] : '', type: type});
    } catch (_) {
      return false;
    } finally {
      clearTimeout(guard);
      prefetchInFlight.delete(id);
    }
  })();
  if (event.waitUntil) event.waitUntil(job.catch(() => {}));
  if (port) job.then(ok => { try { port.postMessage({type: 'drive-stream-prefetch-result', ok: !!ok}); } catch (_) {} }).catch(() => {});
});
