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

function requestToken(clients, id) {
  return new Promise(resolve => {
    let settled = false;
    const finish = token => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(typeof token === 'string' ? token : null);
    };
    const timer = setTimeout(() => finish(null), 3000);
    // Each client gets its own MessageChannel port; the page answering for the
    // file that is currently playing supplies the first valid token.
    let sent = 0;
    for (const client of clients) {
      const channel = new MessageChannel();
      channel.port1.onmessage = event => finish(event.data && event.data.token);
      try { client.postMessage({type: 'drive-stream-token', id}, [channel.port2]); sent++; } catch (_) {}
    }
    if (!sent) { settled = true; clearTimeout(timer); resolve(null); }
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
    if (range) headers.set('Range', range);
    let upstream;
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
      reporter.postMessage({type:'drive-stream-error',id,status:upstream.status,reason,attempt});
      return failure(upstream.status);
    }
    const type = upstream.headers.get('Content-Type') || '';
    if (!/^(video\/|audio\/|application\/octet-stream(?:;|$))/i.test(type)) {
      if (upstream.body) await upstream.body.cancel();
      return failure(502);
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
