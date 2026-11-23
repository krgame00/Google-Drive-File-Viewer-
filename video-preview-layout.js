// video-preview-layout.js — Aspect ratio, preview layout, and orientation handling for Google Drive File Viewer
// Contains:
//   - createVideoPreviewLayout factory
//   - calculatePreviewLayout
//   - fitVideoPreview
//   - clampPreviewAspect
//   - loadCachedVideoAspect
//   - saveCachedVideoAspect
//   - applyPreviewAspect
//   - configurePreviewFullscreen
//   - lockHorizontalPlayerOrientation
//   - releasePlayerOrientation
//   - getPlayerAspect
//   - applyVideoAspect
//   - togglePreviewAspect
//   - applyNativeVideoAspect

function createVideoPreviewLayout(app, deps) {
  'use strict';
  app = app || {};
  deps = deps || {};

  let previewAspect = (deps && typeof deps.getPreviewAspect === 'function')
    ? deps.getPreviewAspect()
    : ((app && 'previewAspect' in app && app.previewAspect !== undefined) ? app.previewAspect : null);

      function calculatePreviewLayout(width, height, aspect) {
        // Google Drive's Material 3 player layout:
        // - If virtual height < 480px or virtual width < 960px, Google Drive renders its mobile touch layout
        //   (timeline pinned to top, floating tools in middle right, oversized bottom buttons that extend to y=452px, causing clipping).
        // - With virtual width >= 960px and virtual height >= 540px (standard 16:9 540p desktop baseline),
        //   Google Drive renders the clean desktop player: all controls in one neat bottom bar, no floating pills, zero clipping.
        const horizontal = aspect > 0 ? aspect >= 1 : width >= height;
        const minWidth = 960;
        const minHeight = horizontal ? 540 : 0;
        const frameWidth = Math.max(minWidth, width, minHeight > 0 && height > 0 ? Math.ceil(width * (minHeight / height)) : 0);
        const scale = width / frameWidth;
        return {width: frameWidth, height: height / scale, scale: scale};
      }

      function fitVideoPreview() {
        if (!app.vidFrame || typeof app.vidFrame.getAttribute !== 'function' || app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
        if (!app.vidFrame.parentElement || typeof app.vidFrame.parentElement.getBoundingClientRect !== 'function') return;
        const bounds = app.vidFrame.parentElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const aspectVal = (typeof deps !== 'undefined' && typeof deps.getPreviewAspect === 'function')
          ? (deps.getPreviewAspect() && deps.getPreviewAspect().value)
          : (typeof previewAspect !== 'undefined' && previewAspect ? previewAspect.value : (app.previewAspect && app.previewAspect.value));
        const layout = calculatePreviewLayout(bounds.width, bounds.height, aspectVal);
        if (app.vidFrame.style && typeof app.vidFrame.style.setProperty === 'function') {
          app.vidFrame.style.setProperty('--preview-width', layout.width + 'px');
          app.vidFrame.style.setProperty('--preview-height', layout.height + 'px');
          app.vidFrame.style.setProperty('--preview-scale', String(layout.scale));
        }
      }

      function clampPreviewAspect(w, h) {
        const ratio = Number(w) / Number(h);
        if (!isFinite(ratio) || ratio <= 0) return 16 / 9;
        return Math.min(2.2, Math.max(0.45, ratio));
      }

      function loadCachedVideoAspect(id) {
        if (!id || typeof app.lsGet !== 'function') return null;
        try {
          const items = JSON.parse(app.lsGet('gdv_video_aspects') || '[]');
          if (!Array.isArray(items)) return null;
          const found = items.find(function (x) { return x && x.id === id && Number.isFinite(x.aspect) && x.aspect >= 0.45 && x.aspect <= 2.2; });
          return found ? Number(found.aspect) : null;
        } catch (_) { return null; }
      }

      function saveCachedVideoAspect(id, aspect) {
        const val = Number(aspect);
        if (!id || typeof app.lsGet !== 'function' || typeof app.lsSet !== 'function' || !Number.isFinite(val) || val < 0.45 || val > 2.2) return;
        try {
          const raw = JSON.parse(app.lsGet('gdv_video_aspects') || '[]');
          const list = Array.isArray(raw) ? raw.filter(function (x) { return x && typeof x.id === 'string' && x.id !== id && Number.isFinite(x.aspect); }) : [];
          const now = (app.Date && typeof app.Date.now === 'function') ? app.Date.now() : (typeof Date !== 'undefined' ? Date.now() : 0);
          list.push({ id: id, aspect: val, at: now });
          app.lsSet('gdv_video_aspects', JSON.stringify(list.slice(-100)));
        } catch (_) {}
      }

      function applyPreviewAspect(id) {
        // ปรับกรอบพรีวิวให้ตรงสัดส่วนวิดีโอจริง ไม่ล็อก 16:9 (วิดีโอแนวตั้งจะได้กรอบสูง ไม่เป็นแถบเล็ก ๆ กลางจอ)
        const ratioEl = app.vidFrame && app.vidFrame.parentElement;
        if (!ratioEl) return;
        let aspectObj = (typeof deps !== 'undefined' && typeof deps.getPreviewAspect === 'function')
          ? deps.getPreviewAspect()
          : (typeof previewAspect !== 'undefined' ? previewAspect : (app.previewAspect || null));
        if (aspectObj && aspectObj.id === id) { applyVideoAspect(); return; }
        if (ratioEl.style) ratioEl.style.aspectRatio = '';
        if (typeof ratioEl.removeAttribute === 'function') ratioEl.removeAttribute('data-orientation');
        const cached = typeof app.fileMetaOf === 'function' ? app.fileMetaOf(id) : null;
        const cw = cached && cached.videoMediaMetadata && Number(cached.videoMediaMetadata.width);
        const ch = cached && cached.videoMediaMetadata && Number(cached.videoMediaMetadata.height);
        if (cw > 0 && ch > 0) {
          const val = clampPreviewAspect(cw, ch);
          aspectObj = { id: id, value: val };
          if (typeof deps !== 'undefined' && typeof deps.setPreviewAspect === 'function') deps.setPreviewAspect(aspectObj);
          if (typeof previewAspect !== 'undefined') previewAspect = aspectObj;
          if (app && 'previewAspect' in app) { try { app.previewAspect = aspectObj; } catch (_) {} }
          if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(id, val);
          applyVideoAspect();
          return;
        }
        const remembered = typeof loadCachedVideoAspect === 'function' ? loadCachedVideoAspect(id) : null;
        if (remembered) {
          aspectObj = { id: id, value: remembered };
          if (typeof deps !== 'undefined' && typeof deps.setPreviewAspect === 'function') deps.setPreviewAspect(aspectObj);
          if (typeof previewAspect !== 'undefined') previewAspect = aspectObj;
          if (app && 'previewAspect' in app) { try { app.previewAspect = aspectObj; } catch (_) {} }
          applyVideoAspect();
          return;
        }
        const session = (typeof deps !== 'undefined' && typeof deps.getMediaSession === 'function')
          ? deps.getMediaSession()
          : (typeof mediaSession !== 'undefined' ? mediaSession : (app.mediaSession || 0));
        const probeThumb = function (thumbUrl) {
          if (typeof app.Image !== 'function') { fitVideoPreview(); return; }
          const img = new app.Image();
          img.onload = function () {
            const curSession = (typeof deps !== 'undefined' && typeof deps.getMediaSession === 'function')
              ? deps.getMediaSession()
              : (typeof mediaSession !== 'undefined' ? mediaSession : (app.mediaSession || 0));
            const curId = (typeof deps !== 'undefined' && typeof deps.getVidCurrentId === 'function')
              ? deps.getVidCurrentId()
              : (typeof vidCurrentId !== 'undefined' ? vidCurrentId : (app.vidCurrentId || null));
            if (session !== curSession || id !== curId || !app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show') || !app.vidFrame || app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
            const tw = Number(img.naturalWidth || img.width), th = Number(img.naturalHeight || img.height);
            if (tw > 0 && th > 0) {
              const val = clampPreviewAspect(tw, th);
              const nextObj = { id: id, value: val };
              if (typeof deps !== 'undefined' && typeof deps.setPreviewAspect === 'function') deps.setPreviewAspect(nextObj);
              if (typeof previewAspect !== 'undefined') previewAspect = nextObj;
              if (app && 'previewAspect' in app) { try { app.previewAspect = nextObj; } catch (_) {} }
              if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(id, val);
              applyVideoAspect();
            } else {
              fitVideoPreview();
            }
          };
          img.onerror = function () { fitVideoPreview(); };
          const knownThumb = thumbUrl || (typeof app.mediaThumbs !== 'undefined' && app.mediaThumbs && app.mediaThumbs[id]) || (cached && cached.thumbnailLink);
          img.src = knownThumb || ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w320');
        };
        const auth = (typeof app.authParams === 'function') ? app.authParams() : { mode: 'none' };
        if (auth.mode === 'none') { probeThumb(); return; }
        const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=size,videoMediaMetadata(width,height),thumbnailLink' + (auth.mode === 'key' ? '&key=' + app.apiKey : '');
        const headers = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + app.accessToken } : {};
        if (typeof app.fetch !== 'function') { probeThumb(); return; }
        app.fetch(url, { headers: headers })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (meta) {
            if (meta && Number(meta.size) > 0 && cached && !(Number(cached.size) > 0)) cached.size = Number(meta.size);
            if (meta && meta.thumbnailLink) {
              if (typeof app.mediaThumbs !== 'undefined' && app.mediaThumbs) app.mediaThumbs[id] = meta.thumbnailLink;
              try { localStorage.setItem("gdv_thumb_" + id, meta.thumbnailLink); } catch (_) {}
            }
            const curSession = (typeof deps !== 'undefined' && typeof deps.getMediaSession === 'function')
              ? deps.getMediaSession()
              : (typeof mediaSession !== 'undefined' ? mediaSession : (app.mediaSession || 0));
            const curId = (typeof deps !== 'undefined' && typeof deps.getVidCurrentId === 'function')
              ? deps.getVidCurrentId()
              : (typeof vidCurrentId !== 'undefined' ? vidCurrentId : (app.vidCurrentId || null));
            if (session !== curSession || id !== curId || !app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show') || !app.vidFrame || app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
            const w = meta && meta.videoMediaMetadata && Number(meta.videoMediaMetadata.width);
            const h = meta && meta.videoMediaMetadata && Number(meta.videoMediaMetadata.height);
            if (!w || !h) { probeThumb(meta && meta.thumbnailLink); return; }
            const val = clampPreviewAspect(w, h);
            const nextObj = { id: id, value: val };
            if (typeof deps !== 'undefined' && typeof deps.setPreviewAspect === 'function') deps.setPreviewAspect(nextObj);
            if (typeof previewAspect !== 'undefined') previewAspect = nextObj;
            if (app && 'previewAspect' in app) { try { app.previewAspect = nextObj; } catch (_) {} }
            if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(id, val);
            applyVideoAspect();
          })
          .catch(function () { probeThumb(); });
      }

      function configurePreviewFullscreen() {
        if (!app.vidFrame || typeof app.vidFrame.setAttribute !== 'function') return;
        const win = app.window || (typeof window !== 'undefined' ? window : null);
        const mobile = win && win.matchMedia && win.matchMedia('(max-width: 680px)').matches;
        // Use the app wrapper on mobile instead of the embedded player's fullscreen path.
        app.vidFrame.setAttribute('allow', mobile ? "autoplay; encrypted-media; fullscreen 'none'" : 'autoplay; encrypted-media; fullscreen');
        if (mobile && typeof app.vidFrame.removeAttribute === 'function') app.vidFrame.removeAttribute('allowfullscreen');
        else app.vidFrame.setAttribute('allowfullscreen', '');
      }

      function lockHorizontalPlayerOrientation(box) {
        const win = app.window || (typeof window !== 'undefined' ? window : null);
        const doc = app.document || (typeof document !== 'undefined' ? document : null);
        const orientation = win && win.screen && win.screen.orientation;
        const aspect = getPlayerAspect();
        if ((doc && doc.fullscreenElement !== box) || !(aspect > 1)) { releasePlayerOrientation(); return Promise.resolve(); }
        if (!orientation || !orientation.lock || (box && (box.playerOrientationLocked || box.playerOrientationPending))) return Promise.resolve();
        const request = box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        box.playerOrientationPending = true;
        try {
          return Promise.resolve(orientation.lock('landscape')).then(function () {
            if (request === box.playerOrientationRequest && doc && doc.fullscreenElement === box && getPlayerAspect() > 1) {
              box.playerOrientationPending = false;
              box.playerOrientationLocked = true;
            } else {
              if (request === box.playerOrientationRequest) box.playerOrientationPending = false;
              if (!box.playerOrientationLocked && !box.playerOrientationPending && orientation.unlock) orientation.unlock();
            }
          }).catch(function () { if (request === box.playerOrientationRequest) box.playerOrientationPending = false; });
        } catch (_) { box.playerOrientationPending = false; return Promise.resolve(); }
      }

      function getPlayerAspect() {
        const isPreview = app.vidFrame && typeof app.vidFrame.getAttribute === 'function' && app.vidFrame.getAttribute('data-video-preview') === 'true';
        if (isPreview) {
          const aspectObj = (typeof deps !== 'undefined' && typeof deps.getPreviewAspect === 'function')
            ? deps.getPreviewAspect()
            : (typeof previewAspect !== 'undefined' ? previewAspect : (app.previewAspect || null));
          return aspectObj && aspectObj.value;
        }
        return app.vidPlayer ? app.vidPlayer.playerAspect : null;
      }

      function releasePlayerOrientation() {
        const box = app.videoModal && app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
        if (!box) return;
        box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        const held = box.playerOrientationLocked || box.playerOrientationPending;
        box.playerOrientationLocked = false;
        box.playerOrientationPending = false;
        const win = app.window || (typeof window !== 'undefined' ? window : null);
        try { if (held && win && win.screen && win.screen.orientation && win.screen.orientation.unlock) win.screen.orientation.unlock(); } catch (_) {}
      }

      function applyVideoAspect() {
        const ratioEl = app.vidFrame && app.vidFrame.parentElement;
        if (!ratioEl) return;
        const box = app.videoModal && app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
        const aspect = getPlayerAspect();
        const doc = app.document || (typeof document !== 'undefined' ? document : null);
        const isFullscreen = !!(box && ((doc && doc.fullscreenElement === box) || (box.classList && box.classList.contains('pseudo-fullscreen'))));
        if (ratioEl.style && typeof ratioEl.style.setProperty === 'function') {
          if (aspect) ratioEl.style.setProperty('--video-aspect', String(aspect));
          else if (typeof ratioEl.style.removeProperty === 'function') ratioEl.style.removeProperty('--video-aspect');
        }
        if (ratioEl.style) {
          ratioEl.style.aspectRatio = isFullscreen ? '' : aspect ? String(aspect) : '';
        }
        if (typeof ratioEl.setAttribute === 'function' && typeof ratioEl.removeAttribute === 'function') {
          if (!isFullscreen && aspect) ratioEl.setAttribute('data-orientation', aspect < 1 ? 'portrait' : 'landscape');
          else ratioEl.removeAttribute('data-orientation');
        }
        const aspectBtn = doc && doc.getElementById ? doc.getElementById('vidAspectToggle') : null;
        if (aspectBtn) {
          aspectBtn.textContent = aspect ? (aspect < 1 ? '↕' : '↔') : '⇅';
          if (typeof aspectBtn.setAttribute === 'function') {
            aspectBtn.setAttribute('title', aspect ? (aspect < 1 ? 'กำลังแสดงแนวตั้ง (คลิกเพื่อสลับเป็นแนวนอน 16:9)' : 'กำลังแสดงแนวนอน (คลิกเพื่อสลับเป็นแนวตั้ง 9:16)') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
            aspectBtn.setAttribute('aria-label', aspect ? (aspect < 1 ? 'สลับเป็นแนวนอน' : 'สลับเป็นแนวตั้ง') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
          }
        }
        fitVideoPreview();
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fitVideoPreview);
        if (box && app.videoModal && app.videoModal.classList && app.videoModal.classList.contains('show')) lockHorizontalPlayerOrientation(box);
      }

      function togglePreviewAspect() {
        const curId = (typeof deps !== 'undefined' && typeof deps.getVidCurrentId === 'function')
          ? deps.getVidCurrentId()
          : (typeof vidCurrentId !== 'undefined' ? vidCurrentId : (app.vidCurrentId || null));
        if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show') || !curId) return null;
        const current = getPlayerAspect();
        const next = current && current < 1 ? 16 / 9 : 9 / 16;
        const nextObj = { id: curId, value: next };
        if (typeof deps !== 'undefined' && typeof deps.setPreviewAspect === 'function') deps.setPreviewAspect(nextObj);
        if (typeof previewAspect !== 'undefined') previewAspect = nextObj;
        if (app && 'previewAspect' in app) { try { app.previewAspect = nextObj; } catch (_) {} }
        if (app.vidPlayer) app.vidPlayer.playerAspect = next;
        if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(curId, next);
        applyVideoAspect();
        return next;
      }

      function applyNativeVideoAspect() {
        if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show')) return;
        if (app.vidFrame && typeof app.vidFrame.getAttribute === 'function' && app.vidFrame.getAttribute('data-video-preview') === 'true') return;
        if (!app.vidPlayer || (app.vidPlayer.style && app.vidPlayer.style.display === 'none')) return;
        const aspect = Number(app.vidPlayer.videoWidth) / Number(app.vidPlayer.videoHeight);
        if (!Number.isFinite(aspect) || aspect <= 0) return;
        app.vidPlayer.playerAspect = aspect;
        const curId = (typeof deps !== 'undefined' && typeof deps.getVidCurrentId === 'function')
          ? deps.getVidCurrentId()
          : (typeof vidCurrentId !== 'undefined' ? vidCurrentId : (app.vidCurrentId || null));
        if (curId && typeof saveCachedVideoAspect === 'function' && typeof clampPreviewAspect === 'function') {
          saveCachedVideoAspect(curId, clampPreviewAspect(app.vidPlayer.videoWidth, app.vidPlayer.videoHeight));
        }
        applyVideoAspect();
      }

  return {
    calculatePreviewLayout,
    fitVideoPreview,
    clampPreviewAspect,
    loadCachedVideoAspect,
    saveCachedVideoAspect,
    applyPreviewAspect,
    configurePreviewFullscreen,
    lockHorizontalPlayerOrientation,
    releasePlayerOrientation,
    getPlayerAspect,
    applyVideoAspect,
    togglePreviewAspect,
    applyNativeVideoAspect
  };
}

const defaultLayout = createVideoPreviewLayout({});

const layoutApi = {
  createVideoPreviewLayout,
  calculatePreviewLayout: defaultLayout.calculatePreviewLayout,
  fitVideoPreview: defaultLayout.fitVideoPreview,
  clampPreviewAspect: defaultLayout.clampPreviewAspect,
  loadCachedVideoAspect: defaultLayout.loadCachedVideoAspect,
  saveCachedVideoAspect: defaultLayout.saveCachedVideoAspect,
  applyPreviewAspect: defaultLayout.applyPreviewAspect,
  configurePreviewFullscreen: defaultLayout.configurePreviewFullscreen,
  lockHorizontalPlayerOrientation: defaultLayout.lockHorizontalPlayerOrientation,
  releasePlayerOrientation: defaultLayout.releasePlayerOrientation,
  getPlayerAspect: defaultLayout.getPlayerAspect,
  applyVideoAspect: defaultLayout.applyVideoAspect,
  togglePreviewAspect: defaultLayout.togglePreviewAspect,
  applyNativeVideoAspect: defaultLayout.applyNativeVideoAspect
};

if (typeof window !== 'undefined') {
  window.GDVVideoPreviewLayout = layoutApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = layoutApi;
}
