// Public files only. Never forward an account token or Google cookies.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store',
};
const jsonError = (status, reason) => new Response(JSON.stringify({error: reason}), {
  status, headers: {...cors, 'Content-Type': 'application/json; charset=utf-8'},
});
const MEDIA_CHUNK_BYTES = 8388608;
export function boundedMediaRange(range, chunkBytes = MEDIA_CHUNK_BYTES) {
  const open = range && range.match(/^bytes=(\d{1,20})-$/i);
  if (!open) return range;
  const start = BigInt(open[1]);
  return 'bytes=' + start + '-' + (start + BigInt(chunkBytes) - 1n);
}
// One prefetched chunk for the next media request; lost if the isolate restarts.
let ahead = null;
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)]
  .map(m => [m[1].toLowerCase(), m[2].replace(/&amp;/g, '&')]));
function confirmationUrl(html, id) {
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i);
  if (!form) return null;
  const action = attrs(form[0].slice(0, form[0].indexOf('>') + 1)).action;
  if (!action) return null;
  const url = new URL(action, 'https://drive.google.com');
  if (url.protocol !== 'https:' || !['drive.google.com', 'drive.usercontent.google.com'].includes(url.hostname)
      || !['/uc', '/download'].includes(url.pathname)) return null;
  for (const tag of form[0].matchAll(/<input\b[^>]*>/gi)) {
    const a = attrs(tag[0]);
    if (a.type === 'hidden' && ['id', 'export', 'confirm', 'uuid'].includes(a.name)) url.searchParams.set(a.name, a.value || '');
  }
  return url.searchParams.get('id') === id && url.searchParams.has('confirm') ? url.href : null;
}
async function readWarning(body) {
  if (!body) return '';
  const reader = body.getReader(), decoder = new TextDecoder();
  let text = '', size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      size += chunk.value.byteLength;
      if (size > 65536) throw new Error('warningTooLarge');
      text += decoder.decode(chunk.value, {stream: true});
    }
  } finally { await reader.cancel().catch(() => {}); }
}
async function fetchMediaChunk(id, range, signal, fetchImpl) {
  // Walk Google's confirmation flow for one bounded interval. Returns
  // {res, servedRange} on success or {error, status?} on failure.
  let boundedRange = boundedMediaRange(range), rangeRetries = 0;
  const headers = new Headers();
  if (boundedRange) headers.set('Range', boundedRange);
  const seen = new Set();
  let url = 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t';
  for (let step = 0; step < 3; step++) {
    if (seen.has(url)) return {error: 'confirmationFailed'};
    seen.add(url);
    const res = await fetchImpl(url, {method: 'GET', headers, redirect: 'follow', signal});
    const type = res.headers.get('Content-Type') || '';
    if (!res.ok || /text\/html/i.test(type)) {
      const warning = await readWarning(res.body);
      if (/downloadQuotaExceeded|too many users|quota exceeded/i.test(warning)) {
        if (boundedRange !== range && rangeRetries < 2 && !signal.aborted) {
          boundedRange = boundedMediaRange(range, rangeRetries++ === 0 ? 2097152 : 1048576);
          headers.set('Range', boundedRange);
          // Each smaller interval gets its own bounded confirmation sequence.
          seen.clear(); step = -1;
          url = 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t';
          continue;
        }
        return {error: 'downloadQuotaExceeded', status: 403};
      }
      if (!res.ok) return {error: 'upstreamRejected', status: res.status};
      const next = confirmationUrl(warning, id);
      if (!next) return {error: 'upstreamReturnedHtml'};
      url = next; continue;
    }
    if (!/^(video\/|audio\/|application\/octet-stream(?:;|$))/i.test(type)) {
      if (res.body) await res.body.cancel();
      return {error: 'unsupportedContentType'};
    }
    return {res, servedRange: boundedRange};
  }
  return {error: 'confirmationFailed'};
}
export function createDriveWorker(fetchImpl = fetch) {
  return {async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (!['GET', 'HEAD'].includes(request.method)) return jsonError(405, 'methodNotAllowed');
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[\w-]{1,200}$/.test(id)) return jsonError(400, 'invalidFileId');
    const range = request.headers.get('Range');
    const abort = new AbortController();
    const cancel = () => abort.abort();
    request.signal.addEventListener('abort', cancel, {once: true});
    if (request.signal.aborted) cancel();
    // 60s ต่อคำขอ: ช่วง 8 MiB ต้องการเพียง ~1.1 Mbps ต่อการเชื่อมต่อจึงจะทันบนเน็ตมือถือช้า ๆ
    const timeout = setTimeout(cancel, 60000);
    try {
      // A chunk prefetched for the previous request may already cover this one.
      let result = null;
      const requestedBound = /^bytes=(\d+)-(\d+)$/.exec(boundedMediaRange(range) || '');
      if (request.method === 'GET' && ahead && ahead.id === id && requestedBound && ahead.start === BigInt(requestedBound[1])) {
        const hit = ahead;
        ahead = null;
        try {
          const cached = await hit.promise;
          if (cached && cached.res) result = cached;
        } catch (_) {}
      }
      if (!result) result = await fetchMediaChunk(id, range, abort.signal, fetchImpl);
      if (result.error) return jsonError(result.status || 502, result.error);
      const res = result.res, servedRange = result.servedRange;
      // A capped request must return a partial 206, never a full-file 200.
      // A readable interval header must match the request; when Google hides
      // Content-Range from scripts (CORS exposure) the 206 itself certifies
      // the interval, so pass it through. Quota errors stay intact above.
      if (servedRange !== range) {
        const actual = (res.headers.get('Content-Range') || '').match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/i);
        const requested = servedRange.match(/^bytes=(\d+)-(\d+)$/);
        if (res.status !== 206 || (actual && (BigInt(actual[1]) !== BigInt(requested[1])
            || BigInt(actual[2]) < BigInt(actual[1]) || BigInt(actual[2]) > BigInt(requested[2])
            || (actual[3] !== '*' && BigInt(actual[3]) <= BigInt(actual[2]))))) {
          if (res.body) await res.body.cancel();
          return jsonError(502, 'upstreamIgnoredRange');
        }
      }
      // Keep the next chunk in flight so the following media request starts
      // without waiting for a fresh upstream confirmation flow. A seek aborts
      // the stale prefetch; a failed one simply falls back to a fresh fetch.
      const servedBound = /^bytes=(\d+)-(\d+)$/.exec(servedRange);
      if (request.method === 'GET' && servedBound && servedRange !== range && !request.signal.aborted) {
        const nextStart = BigInt(servedBound[2]) + 1n;
        if (ahead && (ahead.id !== id || ahead.start !== nextStart)) {
          ahead.controller.abort();
          ahead = null;
        }
        if (!ahead) {
          const controller = new AbortController();
          const entry = {id: id, start: nextStart, controller: controller};
          entry.promise = fetchMediaChunk(
            id, 'bytes=' + nextStart + '-' + (nextStart + BigInt(MEDIA_CHUNK_BYTES) - 1n), controller.signal, fetchImpl
          ).then(function (outcome) { clearTimeout(timer); return outcome; }).catch(function () { clearTimeout(timer); return null; });
          const timer = setTimeout(function () { if (ahead === entry) { ahead = null; controller.abort(); } }, 60000);
          ahead = entry;
        }
      }
      const output = new Headers(cors);
      for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const value = res.headers.get(name); if (value) output.set(name, value);
      }
      // Keep real type and range status; do not relabel HTML or fake range support.
      if (request.method === 'HEAD' && res.body) await res.body.cancel();
      return new Response(request.method === 'HEAD' ? null : res.body, {status: res.status, headers: output});
    } catch (_) { return jsonError(502, 'streamFetchFailed'); }
    finally {
      clearTimeout(timeout);
      // Leave the cancellation listener on while the successful body is streaming.
      if (abort.signal.aborted) request.signal.removeEventListener('abort', cancel);
    }
  }};
}
export default createDriveWorker();
