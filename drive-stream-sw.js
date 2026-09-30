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

function requestToken(client, id) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = token => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(typeof token === 'string' ? token : null);
    };
    const timer = setTimeout(() => finish(null), 3000);
    channel.port1.onmessage = event => finish(event.data && event.data.token);
    client.postMessage({type: 'drive-stream-token', id}, [channel.port2]);
  });
}

async function streamFile(event, id, attempt) {
  const request = event.request;
  if (!['GET', 'HEAD'].includes(request.method)) return failure(405);
  if (!id || !/^[\w-]{1,200}$/.test(id)) return failure(400);
  try {
    // Request credentials only from the tab making this media request.
    const client = event.clientId && await self.clients.get(event.clientId);
    if (!client || !client.url.startsWith(self.registration.scope)) return failure(401);
    const token = await requestToken(client, id);
    if (!token) {
      client.postMessage({type:'drive-stream-error',id,status:401,attempt});
      return failure(401);
    }
    const headers = new Headers({Authorization: 'Bearer ' + token});
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);
    const upstream = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
      method: request.method, headers, credentials: 'omit', cache: 'no-store',
      redirect: 'error', signal: request.signal
    });
    if (!upstream.ok) {
      let reason='';
      try { const body=await upstream.json(); reason=body.error?.errors?.[0]?.reason || ''; } catch (_) {}
      client.postMessage({type:'drive-stream-error',id,status:upstream.status,reason,attempt});
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
