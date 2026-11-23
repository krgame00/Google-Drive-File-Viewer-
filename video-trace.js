// video-trace.js — On-Screen Route Diagnostics & Telemetry for Google Drive File Viewer
// Contains:
//   - createVideoTrace factory
//   - traceVideoEvent
//   - videoTraceEnvLine
//   - resetVideoTrace
//   - videoTraceReport
//   - sendVideoTelemetry
//   - copyVideoTrace
//   - copyVideoTraceFallback
//   - toggleVideoTrace
//   - renderVideoTrace

function createVideoTrace(deps) {
  'use strict';
  deps = deps || {};

  const videoTrace = [];
  let videoTraceT0 = null;
  let telemetrySentId = null;

  function nowMs() {
    return (typeof deps.Date !== 'undefined' ? deps.Date : Date).now();
  }

  function getVidCurrentId() {
    if (typeof deps.getVidCurrentId === 'function') return deps.getVidCurrentId();
    if (typeof deps.vidCurrentId === 'function') return deps.vidCurrentId();
    return deps.vidCurrentId || null;
  }

  function traceVideoEvent(e, d) {
    if (videoTraceT0 === null) videoTraceT0 = nowMs();
    const dStr = String(d === undefined ? '' : d).slice(0, 220);
    const t = (nowMs() - videoTraceT0) / 1000;
    const last = videoTrace[videoTrace.length - 1];
    if (last && last.e === String(e) && last.d === dStr) last.t = t;
    else videoTrace.push({ t: t, e: String(e), d: dStr });
    if (videoTrace.length > 60) videoTrace.splice(0, videoTrace.length - 60);
    if (typeof deps.lsSet === 'function') {
      try { deps.lsSet('gdv_video_trace_v1', JSON.stringify(videoTrace)); } catch (_) {}
    }
    renderVideoTrace();
  }

  function videoTraceEnvLine() {
    let versions = 'ไม่ทราบเวอร์ชัน';
    try {
      const tags = [];
      const doc = deps.document || (typeof document !== 'undefined' ? document : null);
      const scripts = doc && doc.scripts;
      for (let i = 0; scripts && i < scripts.length; i++) {
        const m = String(scripts[i].src || '').match(/(video-player|app-core)\.js\?v=[^?]*?(r\d+)/);
        if (m) tags.push(m[1] + ' ' + m[2]);
      }
      if (tags.length) versions = tags.join(', ');
    } catch (_) {}
    let login = 'ไม่ล็อกอิน';
    try {
      const token = typeof deps.accessToken === 'function' ? deps.accessToken() : deps.accessToken;
      if (token) login = 'ล็อกอิน';
    } catch (_) {}
    let sw = 'ไม่ทราบสถานะ';
    try {
      const nav = deps.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      sw = (nav && nav.serviceWorker && nav.serviceWorker.controller) ? 'ควบคุมหน้าอยู่' : 'ไม่มี controller';
    } catch (_) {}
    let origin = '';
    try {
      const loc = deps.location || (typeof location !== 'undefined' ? location : null);
      origin = loc && loc.origin ? String(loc.origin) : '';
    } catch (_) {}
    let ua = '';
    try {
      const nav = deps.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      ua = (nav && nav.userAgent) ? ' · ' + String(nav.userAgent).slice(0, 120) : '';
    } catch (_) {}
    return 'เวอร์ชัน ' + versions + ' · ' + login + ' · SW ' + sw + (origin ? ' · ' + origin : '') + ua;
  }

  function resetVideoTrace() {
    videoTrace.length = 0;
    videoTraceT0 = null;
    telemetrySentId = null;
    traceVideoEvent('env', videoTraceEnvLine());
  }

  function videoTraceReport() {
    const DateCtor = typeof deps.Date !== 'undefined' ? deps.Date : Date;
    const currentId = getVidCurrentId();
    const lines = ['รายงานวินิจฉัยวิดีโอ ' + new DateCtor().toISOString(), videoTraceEnvLine(), currentId ? 'ไฟล์ ' + currentId : 'ไม่ทราบไฟล์'];
    videoTrace.forEach(function (ev, i) { lines.push((i + 1) + '. ' + ev.t.toFixed(1) + 's [' + ev.e + '] ' + ev.d); });
    return lines.join('\n');
  }

  function sendVideoTelemetry(errorReason, detail) {
    const currentId = getVidCurrentId();
    if (!currentId || telemetrySentId === currentId) return;
    telemetrySentId = currentId;
    const DateCtor = typeof deps.Date !== 'undefined' ? deps.Date : Date;
    const title = (deps.vidTitle && deps.vidTitle.textContent) || '';
    const payload = {
      fileId: currentId,
      title: title,
      error: String(errorReason || 'playback_failed'),
      detail: String(detail || ''),
      routes: (typeof videoTrace !== 'undefined' ? videoTrace : []).filter(function (ev) {
        return ev.e === 'route' || ev.e === 'fail' || ev.e === 'swtok' || ev.e === 'swerr';
      }).slice(-12),
      env: typeof videoTraceEnvLine === 'function' ? videoTraceEnvLine() : '',
      timestamp: new DateCtor().toISOString()
    };
    const workerUrl = deps.WORKER_URL || '';
    const telemetryUrl = (workerUrl || '').replace(/\/+$/, '') + '/telemetry';
    try {
      const body = JSON.stringify(payload);
      const nav = deps.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      const BlobCtor = typeof Blob !== 'undefined' ? Blob : (deps.Blob || null);
      if (nav && typeof nav.sendBeacon === 'function' && BlobCtor) {
        const blob = new BlobCtor([body], { type: 'application/json' });
        if (nav.sendBeacon(telemetryUrl, blob)) return;
      }
      if (typeof deps.fetch === 'function') {
        deps.fetch(telemetryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          mode: 'cors',
          keepalive: true
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function copyVideoTrace() {
    const text = videoTraceReport();
    const doc = deps.document || (typeof document !== 'undefined' ? document : null);
    const btn = doc && doc.getElementById ? doc.getElementById('vidTraceCopy') : null;
    const win = deps.window || (typeof window !== 'undefined' ? window : null);
    const timeoutFn = (deps.setTimeout || (win && win.setTimeout) || setTimeout);
    const flash = function () {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = 'คัดลอกแล้ว ✓';
      timeoutFn(function () { if (btn.textContent === 'คัดลอกแล้ว ✓') btn.textContent = prev; }, 2000);
    };
    const fail = function () {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = 'คัดลอกไม่สำเร็จ — เลือกข้อความแล้วกด Ctrl+C';
      timeoutFn(function () { if (btn.textContent !== prev) btn.textContent = prev; }, 2500);
    };
    const nav = deps.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      nav.clipboard.writeText(text).then(flash, function () { copyVideoTraceFallback(text, flash, fail); });
      return;
    }
    copyVideoTraceFallback(text, flash, fail);
  }

  function copyVideoTraceFallback(text, flash, fail) {
    try {
      const doc = deps.document || (typeof document !== 'undefined' ? document : null);
      if (!doc || !doc.createElement || !doc.body) { if (fail) fail(); return; }
      const ta = doc.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      doc.body.appendChild(ta);
      ta.select();
      const ok = doc.execCommand ? doc.execCommand('copy') : false;
      doc.body.removeChild(ta);
      if (ok) flash();
      else if (fail) fail();
    } catch (_) { if (fail) fail(); }
  }

  function toggleVideoTrace() {
    const doc = deps.document || (typeof document !== 'undefined' ? document : null);
    const box = doc && doc.getElementById ? doc.getElementById('vidTrace') : null;
    if (box && box.classList) box.classList.toggle('collapsed');
  }

  function renderVideoTrace() {
    const doc = deps.document || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.getElementById) return;
    const box = doc.getElementById('vidTrace');
    const lines = doc.getElementById('vidTraceLines');
    const toggle = doc.getElementById('vidTraceToggle');
    if (toggle) toggle.textContent = 'วินิจฉัย (' + videoTrace.length + ')';
    if (!box || !lines) return;
    lines.textContent = videoTrace.map(function (ev) { return ev.t.toFixed(1) + 's [' + ev.e + '] ' + ev.d; }).join('\n');
    if (typeof lines.scrollTop === 'number') lines.scrollTop = lines.scrollHeight;
    box.hidden = false;
  }

  return {
    videoTrace,
    traceVideoEvent,
    videoTraceEnvLine,
    resetVideoTrace,
    videoTraceReport,
    sendVideoTelemetry,
    copyVideoTrace,
    copyVideoTraceFallback,
    toggleVideoTrace,
    renderVideoTrace
  };
}

const defaultTrace = createVideoTrace({});

const traceApi = {
  createVideoTrace,
  traceVideoEvent: defaultTrace.traceVideoEvent,
  videoTraceEnvLine: defaultTrace.videoTraceEnvLine,
  resetVideoTrace: defaultTrace.resetVideoTrace,
  videoTraceReport: defaultTrace.videoTraceReport,
  sendVideoTelemetry: defaultTrace.sendVideoTelemetry,
  copyVideoTrace: defaultTrace.copyVideoTrace,
  copyVideoTraceFallback: defaultTrace.copyVideoTraceFallback,
  toggleVideoTrace: defaultTrace.toggleVideoTrace,
  renderVideoTrace: defaultTrace.renderVideoTrace
};

if (typeof window !== 'undefined') {
  window.GDVVideoTrace = traceApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = traceApi;
}
