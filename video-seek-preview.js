// video-seek-preview.js — Hover/Touch Timeline Seek Preview (variant B, YouTube-style) for Google Drive File Viewer
// Contains:
//   - createSeekPreview factory
//   - safeOn helper
// State lives in a single object (sp): idle -> hover -> seeking
// Reuses the main player's video URL in a hidden <video> element to decode preview frames without extra bandwidth.

function safeOn(el, evt, handler, opts) {
  if (el && typeof el.addEventListener === 'function') {
    try { el.addEventListener(evt, handler, opts); } catch (_) {}
  }
}

function createSeekPreview(app) {
  'use strict';
  app = app || {};
  const showVideoChrome = typeof app.showVideoChrome === 'function' ? app.showVideoChrome : function () {};

  const FRAME_THROTTLE_MS = 300;
  const SCRUB_THROTTLE_MS = 150;
  const POP_HALF_FALLBACK = 98; // ครึ่งความกว้างการ์ด 192px เมื่อวัด offsetWidth ไม่ได้
  const getEl = function (id) {
    return (app.document && app.document.getElementById) ? app.document.getElementById(id) : null;
  };
  const strip = getEl('vidSeekStrip');
  const pop = getEl('vidSeekPop');
  const timeEl = getEl('vidSeekTime');
  const pill = getEl('vidSeekPill');
  const canvas = getEl('vidSeekCanvas');
  const track = childOfClass(strip, 'vid-seek-track');
  const playedEl = childOfClass(track, 'vid-seek-played');
  const marker = childOfClass(track, 'vid-seek-marker');
  const sp = { state: 'idle', hoverFrac: 0, lastFrameAt: 0, lastSeekAt: 0, seekInFlight: false };
  let previewEl = null;
  let pendingCapture = null;
  const win = (app.window && typeof app.window.setTimeout === 'function') ? app.window : null;
  const nowMs = function () { return (typeof app.Date !== 'undefined' ? app.Date : Date).now(); };

  function childOfClass(parent, cls) {
    if (!parent || !parent.children) return null;
    for (let i = 0; i < parent.children.length; i++) {
      const ch = parent.children[i];
      if (ch && typeof ch.className === 'string' && ch.className.split(' ').indexOf(cls) !== -1) return ch;
    }
    return null;
  }

  function playerDuration() {
    const dur = Number(app.vidPlayer && app.vidPlayer.duration);
    return Number.isFinite(dur) && dur > 0 ? dur : 0;
  }

  function fmtSeekTime(s) {
    const total = Math.max(0, Math.round(Number(s) || 0));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }

  function fracFromEvent(e) {
    if (!strip || typeof strip.getBoundingClientRect !== 'function') return null;
    const br = strip.getBoundingClientRect();
    if (!br || !(Number(br.width) > 0)) return null;
    const x = Number(e && e.clientX);
    if (!Number.isFinite(x)) return null;
    return Math.max(0, Math.min(1, (x - br.left) / br.width));
  }

  function updateHoverVisuals(frac) {
    sp.hoverFrac = frac;
    if (timeEl) timeEl.textContent = fmtSeekTime(frac * playerDuration());
    if (marker) marker.style.left = (frac * 100) + '%';
    if (pop) {
      pop.hidden = false;
      // จำกัดการ์ดไม่ให้ล้นขอบแถบ (ครึ่งการ์ด + ระยะปลอดภัย 2px เหมือนโปรโตไทป์)
      if (strip && typeof strip.getBoundingClientRect === 'function') {
        const br = strip.getBoundingClientRect();
        if (br && Number(br.width) > 0) {
          const half = (typeof pop.offsetWidth === 'number' && pop.offsetWidth > 0) ? pop.offsetWidth / 2 : POP_HALF_FALLBACK;
          const x = Math.max(half + 2, Math.min(br.width - half - 2, frac * br.width));
          pop.style.left = x + 'px';
        }
      }
    }
  }

  function createPreviewEl() {
    if (!app.document || typeof app.document.createElement !== 'function') return null;
    let el = null;
    try { el = app.document.createElement('video'); } catch (_) { return null; }
    if (!el) return null;
    // วิดีโอนี้ไม่ถูก append เข้า DOM — เบราว์เซอร์ decode เฟรมจาก currentTime ได้เลย
    el.muted = true;
    el.playsInline = true;
    el.preload = 'metadata';
    safeOn(el, 'seeked', function () {
      sp.seekInFlight = false;
      try {
        const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
        if (ctx && typeof ctx.drawImage === 'function') ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      } catch (_) {}
    });
    safeOn(el, 'error', function () { sp.seekInFlight = false; });
    return el;
  }

  function dispatchPreviewSeek() {
    const dur = playerDuration();
    if (!(dur > 0)) return;
    const src = (app.vidPlayer && (app.vidPlayer.currentSrc || app.vidPlayer.src)) || '';
    if (!src) return;
    if (!previewEl) previewEl = createPreviewEl();
    if (!previewEl) return;
    // reuse URL เดิมเสมอ — ตั้งใหม่เฉพาะเมื่อเปลี่ยนคลิป กัน reload ซ้ำระหว่าง hover
    if (String(previewEl.src || '') !== String(src)) previewEl.src = src;
    sp.lastFrameAt = nowMs();
    sp.seekInFlight = true;
    try { previewEl.currentTime = sp.hoverFrac * dur; } catch (_) { sp.seekInFlight = false; }
  }

  function requestPreviewFrame() {
    if (!(playerDuration() > 0)) return;
    if (sp.seekInFlight) return;
    const elapsed = nowMs() - sp.lastFrameAt;
    if (elapsed < FRAME_THROTTLE_MS) {
      // เลื่อนเร็วกว่า 300ms — ตั้งจับเวลาตามหาเฟรมตำแหน่งสุดท้าย กันเฟรมหลุดช่วงที่เมาส์หยุด
      scheduleTrailingCapture(FRAME_THROTTLE_MS - elapsed);
      return;
    }
    dispatchPreviewSeek();
  }

  function scheduleTrailingCapture(delayMs) {
    if (!win || typeof win.setTimeout !== 'function' || pendingCapture !== null) return;
    pendingCapture = win.setTimeout(function () {
      pendingCapture = null;
      if (sp.state === 'idle' || sp.seekInFlight) return;
      dispatchPreviewSeek();
    }, Math.max(1, delayMs));
  }

  function seekPlayerTo(frac) {
    if (!(playerDuration() > 0) || !app.vidPlayer) return;
    sp.lastSeekAt = nowMs();
    try { app.vidPlayer.currentTime = frac * playerDuration(); } catch (_) {}
  }

  function showTouchPill(frac) {
    sp.hoverFrac = frac;
    if (marker) marker.style.left = (frac * 100) + '%';
    if (pill) { pill.textContent = fmtSeekTime(frac * playerDuration()); pill.hidden = false; }
  }

  function onStripPointerMove(e) {
    if (!strip || strip.hidden) return;
    const isTouch = !!(e && e.pointerType === 'touch');
    const frac = fracFromEvent(e);
    if (frac === null) return;
    showVideoChrome();
    if (isTouch) {
      // มือถือไม่มี hover — โชว์เม็ดเวลาระหว่างลากเท่านั้น ไม่ดึงเฟรมพรีวิว (ประหยัดแบนด์วิดท์)
      if (sp.state !== 'seeking') return;
      showTouchPill(frac);
      return;
    }
    if (sp.state === 'idle') sp.state = 'hover';
    updateHoverVisuals(frac);
    if (sp.state === 'seeking') {
      const elapsed = nowMs() - sp.lastSeekAt;
      if (elapsed >= SCRUB_THROTTLE_MS) seekPlayerTo(frac);
    }
    requestPreviewFrame();
  }

  function onStripPointerDown(e) {
    if (!strip || strip.hidden) return;
    const isTouch = !!(e && e.pointerType === 'touch');
    const frac = fracFromEvent(e);
    if (frac === null) return;
    showVideoChrome();
    if (isTouch) {
      // จอสัมผัส: รอดูตำแหน่งก่อน แล้วเลื่อนจริงตอนปล่อยนิ้ว
      sp.state = 'seeking';
      showTouchPill(frac);
      return;
    }
    sp.state = 'seeking';
    updateHoverVisuals(frac);
    seekPlayerTo(frac);
  }

  function onStripPointerUp(e) {
    if (!strip || strip.hidden) return;
    const isTouch = !!(e && e.pointerType === 'touch');
    const frac = fracFromEvent(e);
    if (isTouch) {
      if (sp.state !== 'seeking') return;
      sp.state = 'idle';
      if (pill) pill.hidden = true;
      if (frac !== null) seekPlayerTo(frac);
      return;
    }
    // ปล่อยปุ่มบนเดสก์ท็อป: ตำแหน่งถูกเลื่อนแล้วตอนกด/ลาก การ์ดค้างไว้จนเมาส์ออกนอกแถบ
    sp.state = 'hover';
  }

  function onStripPointerLeave() {
    if (pendingCapture !== null && win && typeof win.clearTimeout === 'function') win.clearTimeout(pendingCapture);
    pendingCapture = null;
    sp.state = 'idle';
    if (pop) pop.hidden = true;
    if (pill) pill.hidden = true;
  }

  function onPlayerTimeUpdate() {
    if (!strip || strip.hidden) return;
    const dur = playerDuration();
    if (!(dur > 0)) return;
    const cur = Number(app.vidPlayer && app.vidPlayer.currentTime);
    if (!Number.isFinite(cur)) return;
    if (playedEl) playedEl.style.width = (Math.max(0, Math.min(1, cur / dur)) * 100) + '%';
  }

  function refresh() {
    if (!strip) return;
    const modal = app.videoModal;
    const open = !!(modal && modal.classList && typeof modal.classList.contains === 'function' && modal.classList.contains('show'));
    const frameEl = app.vidFrame;
    const iframeMode = !!(frameEl && ((frameEl.style && frameEl.style.display === 'block') ||
      (typeof frameEl.getAttribute === 'function' && frameEl.getAttribute('data-video-preview') === 'true')));
    const src = (app.vidPlayer && app.vidPlayer.src) || '';
    strip.hidden = !(open && !iframeMode && !!src && playerDuration() > 0);
  }

  function reset() {
    sp.state = 'idle';
    sp.hoverFrac = 0;
    sp.lastFrameAt = 0;
    sp.lastSeekAt = 0;
    sp.seekInFlight = false;
    if (pendingCapture !== null && win && typeof win.clearTimeout === 'function') win.clearTimeout(pendingCapture);
    pendingCapture = null;
    if (pop) pop.hidden = true;
    if (pill) pill.hidden = true;
    if (strip) strip.hidden = true;
    if (previewEl) {
      // หยุดการดึงช่วงไฟล์ค้างของวิดีโอพรีวิวทันทีที่ปิดหรือเปลี่ยนคลิป
      try { previewEl.removeAttribute('src'); previewEl.load(); } catch (_) {}
    }
  }

  safeOn(strip, 'pointermove', onStripPointerMove, { passive: true });
  safeOn(strip, 'pointerdown', onStripPointerDown);
  safeOn(strip, 'pointerup', onStripPointerUp);
  safeOn(strip, 'pointerleave', onStripPointerLeave);
  safeOn(strip, 'pointercancel', onStripPointerLeave);
  safeOn(app.vidPlayer, 'loadedmetadata', refresh);
  safeOn(app.vidPlayer, 'durationchange', refresh);
  safeOn(app.vidPlayer, 'timeupdate', onPlayerTimeUpdate);

  return { reset: reset, refresh: refresh };
}

const seekPreviewApi = {
  createSeekPreview
};

if (typeof window !== 'undefined') {
  window.GDVSeekPreview = seekPreviewApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = seekPreviewApi;
}
