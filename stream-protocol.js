/* Stream protocol — the ONLY place the page↔SW wire contract and the head-cache
 * identity exist. Loaded three ways: classic script on the page (window.GDVStreamProtocol),
 * importScripts inside the service worker (self.GDVStreamProtocol), and CommonJS for tests.
 * Wire shapes must stay byte-compatible with drive-stream-sw.js responses across SW updates
 * (old SW × new page and new SW × old page must both keep streaming). No credentials here. */
(function (root) {
  'use strict';

  const HEAD_CACHE_NAME = 'gdv-video-heads-v1';
  // Number('probe') is NaN, so attempt gates in the player reject probe reports.
  const PROBE_ATTEMPT = 'probe';
  const FILE_ID_RE = /^[\w-]{1,200}$/;

  function isFileId(v) { return typeof v === 'string' && FILE_ID_RE.test(v); }
  function isProbeAttempt(a) { return a === PROBE_ATTEMPT; }

  // Head-cache identity: the one key derivation in the codebase. SW uses it to
  // read/write; tests use it to pin the on-disk layout. The page never enumerates
  // the head cache (stats/clear go over messages), so it needs no derivation.
  function headCacheKey(scope, id) { return JSON.stringify([scope, id]); }
  function headCacheUrl(scope, id, base) {
    return new URL('__video_head/' + encodeURIComponent(headCacheKey(scope, id)), base).href;
  }

  // ---- token handshake (SW asks, the playing page vouches) ----
  // Reply shape: { token, scope|null, size, modifiedTime, heads }. Legacy pages that
  // answer plain {token} degrade to heads:false; unknown extra fields are ignored.
  function normalizeTokenReply(raw) {
    const token = raw && typeof raw.token === 'string' && raw.token.length ? raw.token : null;
    if (!token) return null;
    return {
      token: token,
      scope: raw && typeof raw.scope === 'string' && raw.scope.length <= 200 ? raw.scope : null,
      size: raw ? Number(raw.size) || 0 : 0,
      modifiedTime: raw && typeof raw.modifiedTime === 'string' ? raw.modifiedTime.slice(0, 100) : '',
      heads: !!(raw && raw.heads === true)
    };
  }

  // ---- error reports (SW → page, gated on id + attempt by the receiver) ----
  // Shape: { type:'drive-stream-error', id, status, attempt, reason?, rangeFailure?, upstreamStatus? }
  function streamError(fields) {
    if (!fields || !isFileId(fields.id) || !Number.isFinite(Number(fields.status))) return null;
    const report = { type: 'drive-stream-error', id: fields.id, status: Number(fields.status), attempt: fields.attempt };
    if (typeof fields.reason === 'string' && fields.reason.length <= 100) report.reason = fields.reason;
    if (typeof fields.rangeFailure === 'string' && fields.rangeFailure.length <= 20) report.rangeFailure = fields.rangeFailure;
    if (Number.isFinite(Number(fields.upstreamStatus))) report.upstreamStatus = Number(fields.upstreamStatus);
    return report;
  }
  function parseStreamError(data) {
    if (!data || data.type !== 'drive-stream-error' || !isFileId(data.id)) return null;
    const report = streamError(data);
    return report && data.type === report.type ? report : null;
  }

  // ---- prefetch grant (page → SW; the page supplies its own token for one file) ----
  // Shape: { type:'drive-stream-prefetch', id, token, scope, size, modifiedTime, heads:true }
  // The SW replies { type:'drive-stream-prefetch-result', ok, reason? } when a port exists.
  function prefetchGrant(fields) {
    if (!fields || !isFileId(fields.id)) return null;
    if (typeof fields.token !== 'string' || !fields.token) return null;
    if (typeof fields.scope !== 'string' || !fields.scope || fields.scope.length > 200) return null;
    return {
      type: 'drive-stream-prefetch', id: fields.id, token: fields.token, scope: fields.scope,
      size: Number(fields.size) || 0,
      modifiedTime: typeof fields.modifiedTime === 'string' ? fields.modifiedTime.slice(0, 100) : '',
      heads: true
    };
  }
  function parsePrefetchGrant(raw) {
    return raw && raw.type === 'drive-stream-prefetch' && raw.heads === true ? prefetchGrant(raw) : null;
  }
  function prefetchResult(ok, reason) {
    const reply = { type: 'drive-stream-prefetch-result', ok: !!ok };
    if (typeof reason === 'string' && reason.length <= 40) reply.reason = reason;
    return reply;
  }

  // ---- head-cache admin (page → SW; the SW is sole writer and sole GC) ----
  // Shape: { type:'drive-stream-head-stats', requestId } → { requestId, supported:true, bytes, count }
  //        { type:'drive-stream-heads-clear', requestId } → { requestId, cleared:boolean }
  // A missing/old SW answers nothing; the page treats silence as supported:false.
  function headStatsRequest(requestId) { return { type: 'drive-stream-head-stats', requestId: String(requestId) }; }
  function parseHeadStatsReply(data, requestId) {
    if (!data || data.type !== 'drive-stream-head-stats-result' || String(data.requestId) !== String(requestId)) return null;
    if (data.supported !== true) return { supported: false };
    const bytes = Number(data.bytes), count = Number(data.count);
    if (!Number.isFinite(bytes) || !Number.isFinite(count) || bytes < 0 || count < 0) return { supported: false };
    return { supported: true, bytes: bytes, count: count };
  }
  function headStatsResult(requestId, bytes, count) {
    return { type: 'drive-stream-head-stats-result', requestId: String(requestId), supported: true, bytes: bytes, count: count };
  }
  function headClearRequest(requestId) { return { type: 'drive-stream-heads-clear', requestId: String(requestId) }; }
  function parseHeadClearReply(data, requestId) {
    if (!data || data.type !== 'drive-stream-heads-clear-result' || String(data.requestId) !== String(requestId)) return null;
    return { cleared: data.cleared === true };
  }
  function headClearResult(requestId, cleared) {
    return { type: 'drive-stream-heads-clear-result', requestId: String(requestId), cleared: cleared === true };
  }

  const api = {
    HEAD_CACHE_NAME: HEAD_CACHE_NAME, PROBE_ATTEMPT: PROBE_ATTEMPT,
    isFileId: isFileId, isProbeAttempt: isProbeAttempt,
    headCacheKey: headCacheKey, headCacheUrl: headCacheUrl,
    normalizeTokenReply: normalizeTokenReply,
    streamError: streamError, parseStreamError: parseStreamError,
    prefetchGrant: prefetchGrant, parsePrefetchGrant: parsePrefetchGrant, prefetchResult: prefetchResult,
    headStatsRequest: headStatsRequest, headStatsResult: headStatsResult, parseHeadStatsReply: parseHeadStatsReply,
    headClearRequest: headClearRequest, headClearResult: headClearResult, parseHeadClearReply: parseHeadClearReply
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GDVStreamProtocol = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
