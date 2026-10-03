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
// Files whose source answered with a usable length stream in parallel.
let parallelOk = null;
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
    if (!actual || BigInt(actual[1]) !== ranges[i][0] || BigInt(actual[2]) > ranges[i][1]) {
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

function requestToken(clients, id) {
  return new Promise(resolve => {
    let settled = false, pending = clients.length;
    const ports = [];
    const finish = token => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const port of ports) port.close();
      resolve(typeof token === 'string' && token.length ? token : null);
    };
    const timer = setTimeout(() => finish(null), 3000);
    // A non-playing tab answers null; wait for the playing tab's valid token.
    for (const client of clients) {
      const channel = new MessageChannel();
      ports.push(channel.port1);
      let answered = false;
      const reply = token => {
        if (answered || settled) return;
        answered = true;
        if (typeof token === 'string' && token.length) finish(token);
        else if (--pending === 0) finish(null);
      };
      channel.port1.onmessage = event => reply(event.data && event.data.token);
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
    const token = await requestToken(targets, id);
    if (!token) {
      reporter.postMessage({type:'drive-stream-error',id,status:401,attempt});
      return failure(401);
    }
    const headers = new Headers({Authorization: 'Bearer ' + token});
    const range = request.headers.get('Range');
    let boundedRange = boundedMediaRange(range);
    if (boundedRange) headers.set('Range', boundedRange);
    // A chunk prefetched during the previous request may already cover this one.
    let upstream = null;
    const requestedBound = /^bytes=(\d+)-(\d+)$/.exec(boundedRange || '');
    if (request.method === 'GET' && ahead && ahead.id === id && requestedBound && ahead.start === BigInt(requestedBound[1])) {
      const hit = ahead;
      ahead = null;
      try {
        const cached = await hit.promise;
        if (cached && cached.ok) upstream = cached;
        else if (cached && cached.body) await cached.body.cancel();
      } catch (_) {}
    }
    if (!upstream) {
      if (request.method === 'GET' && requestedBound && boundedRange !== range && parallelOk === id) {
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
    if (upstream && upstream.status === 206 && upstream.headers.get('Content-Length')) parallelOk = id;
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
    // Keep the next chunk in flight so the following media request starts
    // without waiting for a fresh upstream connection. A seek aborts the stale
    // prefetch; a failed one simply falls back to the normal fetch above.
    const servedBound = /^bytes=(\d+)-(\d+)$/.exec(boundedRange || '');
    const servedTotal = (upstream.headers.get('Content-Range') || '').match(/^bytes \d+-\d+\/(\d+|\*)$/i);
    const atFileEnd = servedTotal && servedTotal[1] !== '*' && requestedBound && BigInt(servedTotal[1]) <= BigInt(servedBound[2]) + 1n;
    if (request.method === 'GET' && servedBound && boundedRange !== range && !atFileEnd && !request.signal.aborted) {
      const nextStart = BigInt(servedBound[2]) + 1n;
      if (ahead && (ahead.id !== id || ahead.start !== nextStart)) {
        ahead.controller.abort();
        ahead = null;
      }
      if (!ahead) {
        const controller = new AbortController();
        const entry = {id: id, start: nextStart, controller: controller};
        const guard = setTimeout(function () { if (ahead === entry) { ahead = null; controller.abort(); } }, 120000);
        const end = nextStart + BigInt(MEDIA_CHUNK_BYTES) - 1n;
        entry.promise = (parallelOk === id
          ? fetchParallelChunk(id, nextStart, end, token)
          : fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
              method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
              headers: new Headers({Authorization: 'Bearer ' + token, Range: 'bytes=' + nextStart + '-' + end})
            })
        ).then(function (res) { clearTimeout(guard); return res; }, function () { clearTimeout(guard); return null; });
        ahead = entry;
      }
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
