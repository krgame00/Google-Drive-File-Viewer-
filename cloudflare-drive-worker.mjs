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
export function boundedMediaRange(range, chunkBytes = 8388608) {
  const open = range && range.match(/^bytes=(\d{1,20})-$/i);
  if (!open) return range;
  const start = BigInt(open[1]);
  return 'bytes=' + start + '-' + (start + BigInt(chunkBytes) - 1n);
}
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
export function createDriveWorker(fetchImpl = fetch) {
  return {async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (!['GET', 'HEAD'].includes(request.method)) return jsonError(405, 'methodNotAllowed');
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[\w-]{1,200}$/.test(id)) return jsonError(400, 'invalidFileId');
    const headers = new Headers(), range = request.headers.get('Range');
    let boundedRange = boundedMediaRange(range), rangeRetries = 0;
    if (boundedRange) headers.set('Range', boundedRange);
    const abort = new AbortController();
    const cancel = () => abort.abort();
    request.signal.addEventListener('abort', cancel, {once: true});
    if (request.signal.aborted) cancel();
    // 60s ต่อคำขอ: ช่วง 8 MiB ต้องการเพียง ~1.1 Mbps ต่อการเชื่อมต่อจึงจะทันบนเน็ตมือถือช้า ๆ
    const timeout = setTimeout(cancel, 60000);
    const seen = new Set();
    let url = 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t';
    try {
      for (let step = 0; step < 3; step++) {
        if (seen.has(url)) return jsonError(502, 'confirmationFailed');
        seen.add(url);
        const res = await fetchImpl(url, {method: 'GET', headers, redirect: 'follow', signal: abort.signal});
        const type = res.headers.get('Content-Type') || '';
        if (!res.ok || /text\/html/i.test(type)) {
          const warning = await readWarning(res.body);
          if (/downloadQuotaExceeded|too many users|quota exceeded/i.test(warning)) {
            if (boundedRange !== range && rangeRetries < 2 && !abort.signal.aborted) {
              boundedRange = boundedMediaRange(range, rangeRetries++ === 0 ? 2097152 : 1048576);
              headers.set('Range', boundedRange);
              // Each smaller interval gets its own bounded confirmation sequence.
              seen.clear(); step = -1;
              url = 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t';
              continue;
            }
            return jsonError(403, 'downloadQuotaExceeded');
          }
          if (!res.ok) return jsonError(res.status, 'upstreamRejected');
          const next = confirmationUrl(warning, id);
          if (!next) return jsonError(502, 'upstreamReturnedHtml');
          url = next; continue;
        }
        if (!/^(video\/|audio\/|application\/octet-stream(?:;|$))/i.test(type)) {
          if (res.body) await res.body.cancel();
          return jsonError(502, 'unsupportedContentType');
        }
        // A capped request must return a partial 206, never a full-file 200.
        // A readable interval header must match the request; when Google hides
        // Content-Range from scripts (CORS exposure) the 206 itself certifies
        // the interval, so pass it through. Quota errors stay intact above.
        if (boundedRange !== range) {
          const actual = (res.headers.get('Content-Range') || '').match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/i);
          const requested = boundedRange.match(/^bytes=(\d+)-(\d+)$/);
          if (res.status !== 206 || (actual && (BigInt(actual[1]) !== BigInt(requested[1])
              || BigInt(actual[2]) < BigInt(actual[1]) || BigInt(actual[2]) > BigInt(requested[2])
              || (actual[3] !== '*' && BigInt(actual[3]) <= BigInt(actual[2]))))) {
            if (res.body) await res.body.cancel();
            return jsonError(502, 'upstreamIgnoredRange');
          }
        }
        const output = new Headers(cors);
        for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
          const value = res.headers.get(name); if (value) output.set(name, value);
        }
        // Keep real type and range status; do not relabel HTML or fake range support.
        if (request.method === 'HEAD' && res.body) await res.body.cancel();
        return new Response(request.method === 'HEAD' ? null : res.body, {status: res.status, headers: output});
      }
      return jsonError(502, 'confirmationFailed');
    } catch (_) { return jsonError(502, 'streamFetchFailed'); }
    finally {
      clearTimeout(timeout);
      // Leave the cancellation listener on while the successful body is streaming.
      if (abort.signal.aborted) request.signal.removeEventListener('abort', cancel);
    }
  }};
}
export default createDriveWorker();
