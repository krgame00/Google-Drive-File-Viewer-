/* Completed downloads only. No credentials or upstream URLs are persisted. */
(function (root) {
  'use strict';
  function browserStore(name) {
    if (!root.caches || !root.location || !/^https?:$/.test(root.location.protocol)) return null;
    const open = () => root.caches.open(name);
    const url = key => new URL('__video_cache/' + encodeURIComponent(key), root.location.href).href;
    return {
      async list() {
        const cache = await open(), keys = await cache.keys(), records = [];
        for (const request of keys) {
          if (!request.url.endsWith('/meta')) continue;
          try { const res = await cache.match(request); const record = await res.json();
            if (record && typeof record.key === 'string' && Number.isFinite(record.size) && record.size > 0 && Number.isFinite(record.at)) records.push(record);
            else await cache.delete(request);
          } catch (_) { await cache.delete(request); }
        }
        const payloads = new Set(records.map(r => url(r.key)));
        for (const request of keys) if (!request.url.endsWith('/meta') && !payloads.has(request.url)) await cache.delete(request);
        return records;
      },
      async get(key) {
        const cache = await open(), meta = await cache.match(url(key) + '/meta'), payload = await cache.match(url(key));
        if (!meta || !payload) return null;
        return Object.assign(await meta.json(), {blob: await payload.blob()});
      },
      async put(record) {
        const cache = await open();
        await cache.put(url(record.key), new Response(record.blob));
        try { await this.touch(record); } catch (err) { await this.remove(record.key); throw err; }
      },
      async touch({blob, ...record}) { const cache = await open(); await cache.put(url(record.key) + '/meta', new Response(JSON.stringify(record))); },
      async remove(key) { const cache = await open(); await cache.delete(url(key)); await cache.delete(url(key) + '/meta'); },
      async clear() { await root.caches.delete(name); }
    };
  }
  function createVideoCache(options = {}) {
    const store = options.store === undefined ? browserStore(options.cacheName || 'gdv-completed-videos-v1') : options.store;
    const now = options.now || Date.now, limit = options.limit || (() => 2 * 1073741824);
    let tail = Promise.resolve(), generation = 0;
    const serial = fn => {
      const run = () => root.navigator && root.navigator.locks ? root.navigator.locks.request('gdv-video-cache', fn) : fn();
      const result = tail.then(run); tail = result.catch(() => {}); return result;
    };
    const cap = () => Math.max(0, Number(limit()) || 0);
    const keyOf = (id, scope) => JSON.stringify([scope, id]);
    async function trimTo(bytes, except) {
      const records = (await store.list()).filter(r => r.key !== except).sort((a,b) => a.at - b.at);
      let total = records.reduce((sum,r) => sum + r.size, 0);
      for (const record of records) { if (total <= bytes) break; await store.remove(record.key); total -= record.size; }
    }
    return {
      supported: !!store,
      async get(id, meta = {}, scope) {
        if (!store || !scope || !cap()) return null;
        return serial(async () => {
          await trimTo(cap());
          const key = keyOf(id,scope), record = await store.get(key);
          if (!record) return null;
          if (!record.blob || record.blob.size !== record.size || (Number(meta.size) > 0 && Number(meta.size) !== record.size) || (meta.modifiedTime && meta.modifiedTime !== record.modifiedTime)) { await store.remove(key); return null; }
          record.at = now();
          if (store.touch) await store.touch(record); else await store.put(record);
          return record.blob;
        }).catch(() => null);
      },
      async put(id, blob, meta = {}, scope) {
        const epoch = generation;
        if (!store || !scope || !blob || !blob.size || /^(text\/|application\/json)/i.test(blob.type || '') || blob.size > cap() || (Number(meta.size) > 0 && Number(meta.size) !== blob.size)) return false;
        return serial(async () => {
          if (epoch !== generation || blob.size > cap()) return false;
          const key = keyOf(id,scope);
          await store.remove(key); await trimTo(cap() - blob.size, key);
          await store.put({key, size:blob.size, modifiedTime:meta.modifiedTime || '', at:now(), blob});
          if (epoch !== generation) { await store.remove(key); return false; }
          return true;
        }).catch(() => false);
      },
      async trim() { if (store) return serial(() => trimTo(cap())).catch(() => {}); },
      async remove(id, scope) { if (store && scope) return serial(() => store.remove(keyOf(id,scope))).catch(() => {}); },
      async clear() { ++generation; if (!store) return false; return serial(async () => { await store.clear(); return true; }).catch(() => false); },
      async stats() { if (!store) return {bytes:0,count:0}; return serial(async () => { const records = await store.list(); return {bytes:records.reduce((sum,r) => sum+r.size,0),count:records.length}; }).catch(() => ({bytes:0,count:0})); }
    };
  }
  function createRouteCooldown(now = Date.now) {
    const records = new Map(), key = (id,mode,route) => JSON.stringify([id,mode,route]);
    function prune() { for (const [k,at] of records) if (now()-at >= 300000) records.delete(k); }
    return {
      fail(id,mode,route) { if (!['bearer','worker','usercontent','key'].includes(route)) return; prune(); records.set(key(id,mode,route),now()); if (records.size>200) records.delete(records.keys().next().value); },
      blocked(id,mode,route) { prune(); return records.has(key(id,mode,route)); },
      clear(id,mode) { for (const k of records.keys()) { const r=JSON.parse(k); if(r[0]===id && r[1]===mode) records.delete(k); } },
      success(id,mode,route) { records.delete(key(id,mode,route)); }
    };
  }
  const api = {createVideoCache, createRouteCooldown};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GDVVideoCache = api;
})(typeof window !== 'undefined' ? window : globalThis);
