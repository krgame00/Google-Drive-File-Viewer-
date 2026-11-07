// video-player.js — Video Player (createVideoCenter factory)
// Depends on: video-cache.js (window.GDVVideoCache: createVideoCache, createRouteCooldown)
// Depends on: window.GDVVideoApi (the explicit boundary to the main app)
//
// Center contract: the factory takes one `app` argument — the live accessor bag the
// main app publishes as window.GDVVideoApi. Every shared value is read/written as an
// explicit `app.<name>` property (no `with`, no bare identifiers, no DOM named
// access), so this module runs in strict mode and code pasted outside the factory
// cannot silently resolve state names. State ownership still lives in the main app
// until slice 2b relocates it into this closure.
//
//   accessors (get/set)   accessToken, apiKey, tokenExpiry, mediaSession,
//                         videoAttempt, videoAttemptTimer, videoSlowTimer,
//                         vidCurrentId, currentVideoUrl, videoStatus,
//                         videoResumePos, streamWorkerReady, failedVideoAttempt,
//                         previewAspect, videoBlobTransfer, mediaPreviousOverflow,
//                         currentMediaIndex, currentMediaKind
//   read-only values      videoCache, routeCooldown, MEDIA_STREAM_FAIL_MSG,
//                         videoModal, vidPlayer, vidFrame, vidLoading,
//                         vidLoadingText, vidTitle, vidOpenTab, vidProgressBar,
//                         lightbox, filesWrap
//   helpers (functions)   lsGet, lsSet, lsRemove, fileMetaOf, formatSize,
//                         authParams, classifyApiError, closeLightbox, showToast,
//                         refreshVideoCacheUI, videoCacheScope, videoCacheLimit,
//                         resetPdfViewer, revokeCurrentDoc, pruneVpos,
//                         fallbackIframe, ensureToken
//
// The center returns the player API; the boot wrapper publishes it on
// window.GDVVideoApi.video and window.GDVVideo and exports the factory for tests.

const TIMEOUTS = Object.freeze({
  cacheRaceMs: 350,
  bufferingMs: 2000,
  vlcHintMs: 3500,
  workerRegisterMs: 12000,
  probeMs: 8000,
  genericMs: 12000,
  slowMs: 15000,
  bearerMs: 60000,
  workerMs: 65000,
  blobPlaybackMs: 120000,
});

const WORKER_URL = 'https://google-drive-file-viewer.missnlpp9.workers.dev/';
const EXPECTED_WORKER_REV = '';

function createPublicStreamRunner(deps, fallbacks) {
  // Live scope: test stubs (deps) win, then the module's own functions, then globals.
  const scope = new Proxy({}, {
    has(t, key) { return (deps && key in deps) || (fallbacks && key in fallbacks); },
    get(t, key) { if (deps && key in deps) return deps[key]; if (fallbacks && key in fallbacks) return fallbacks[key]; return undefined; },
    set(t, key, value) { if (deps) deps[key] = value; return true; }
  });
  // Deps-only test invocations omit the fallbacks, so default the trace to a no-op.
  const traceVideoEvent = (deps && typeof deps.traceVideoEvent === 'function') ? deps.traceVideoEvent
    : (fallbacks && typeof fallbacks.traceVideoEvent === 'function') ? fallbacks.traceVideoEvent
    : function () {};
        return function tryPublicStream(id, onFail, googleOnly = false) {
          with (scope) {
        revokeCurrentVideo();
        // Public download sources may not expose CORS headers.
        vidPlayer.removeAttribute('crossorigin');
        vidPlayer.style.display = "block";
        const session = mediaSession;
        const active = function () { return session === mediaSession && id === vidCurrentId && videoModal.classList.contains('show'); };
        // Public proxy only; no account credentials are sent to Cloudflare.
        const notes = [];
        let publicError = null;
        const note = function (label, reason, diagnostic) {
          notes.push(label + ': ' + (reason === 'timeout' ? 'หมดเวลา' : diagnostic || reason));
          traceVideoEvent('fail', label + ': ' + (reason === 'timeout' ? 'หมดเวลา' : diagnostic || reason));
        };
        const fail = function () {
          if (onFail) { onFail(notes); return; }
          const routeNotes = notes.length ? ' (' + notes.join(' · ') + ')' : '';
          showStreamFailure('แหล่งสตรีมสาธารณะเล่นไฟล์นี้ไม่ได้ ลองเชื่อมต่อ Google โหลดทั้งไฟล์ หรือเลือกใช้พรีวิว Google' + routeNotes);
          if (publicError) { setVideoStatus('error', publicError + routeNotes); return; }
          const session = mediaSession, attempt = videoAttempt;
          probePublicStreamError(id).then(function (message) {
            if (!message || session !== mediaSession || attempt !== videoAttempt || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
            setVideoStatus('error', message + routeNotes);
          });
        };
        const sources = [];
        if (!googleOnly) sources.push({route:'worker', label:'worker', url: WORKER_URL + '?id=' + encodeURIComponent(id) + '&continuous=1'});
        sources.push({route:'usercontent', label:'ลิงก์ตรง', url:'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t'});
        if (apiKey) sources.push({route:'key', label:'API key', url:'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&key=' + apiKey});
        else notes.push('API key: ไม่ได้ตั้งค่า');
        const preferred = preferredPlaybackRoute(id);
        if (typeof routeCooldown !== 'undefined' && routeCooldown) {
          const mode = accessToken ? 'signedin' : 'public';
          for (let i = sources.length - 1; i >= 0; i--) if (routeCooldown.blocked(id, mode, sources[i].route)) { notes.push(sources[i].label + ': เพิ่งเล่นไม่สำเร็จ กดลองเล่นใหม่เพื่อลองอีกครั้ง'); sources.splice(i, 1); }
        }
        const orderedSources = prioritizePlaybackSource(sources, preferred);
        function next() {
          if (!active()) return;
          const source = orderedSources.shift();
          if (!source) { fail(); return; }
          const play = function () {
            if (!active()) return;
            // The Worker may need most of its 60s upstream budget to fetch an 8 MiB range.
            // Do not let the player abandon that request at the generic 12s source timeout.
            const timeoutMs = source.route === 'worker' ? TIMEOUTS.workerMs : TIMEOUTS.genericMs;
            tryVideoSrc(source.url, function (reason, diagnostic) { note(source.label, reason, diagnostic); next(); }, timeoutMs, source.route);
          };
          if (source.route !== 'key') { play(); return; }
          // Bounded API probe skips confirmed permission/quota failures before creating a player request.
          const probeAttempt = videoAttempt;
          probePublicStreamError(id).then(function (message) {
            if (!active() || probeAttempt !== videoAttempt) return;
            if (message) { publicError = message; if (typeof routeCooldown !== 'undefined' && routeCooldown) routeCooldown.fail(id, accessToken ? 'signedin' : 'public', source.route); note(source.label, 'upstream', message); next(); }
            else play();
          });
        }
        next();
          }
        };
      }

function createVideoBlobRunner(deps, fallbacks) {
  // Live scope: test stubs (deps) win, then the module's own functions, then globals.
  const scope = new Proxy({}, {
    has(t, key) { return (deps && key in deps) || (fallbacks && key in fallbacks); },
    get(t, key) { if (deps && key in deps) return deps[key]; if (fallbacks && key in fallbacks) return fallbacks[key]; return undefined; },
    set(t, key, value) { if (deps) deps[key] = value; return true; }
  });
        return function loadVideoAsBlob(id, onGiveUp, priorNotes) {
          with (scope) {
        // ทางแก้เมื่อเบราว์เซอร์ (เช่น Brave) บล็อก fetch ข้ามโดเมนจาก service worker:
        // หน้าเว็บดึงไฟล์เต็มเป็น blob ด้วย Bearer เอง พร้อมเริ่มเล่นส่วนต้นทันทีที่พร้อม (ดูระหว่างโหลดทั้งไฟล์)
        // onGiveUp = เรียกเมื่อขั้นโหลดทั้งไฟล์ล้มทุกทาง เพื่อให้ผู้เรียกวินิจฉัยต่อได้
        // priorNotes = บันทึกการลองแหล่งก่อนหน้า แนบไปกับข้อความล้มเพื่อให้เห็นภาพรวม
        const prior = priorNotes && priorNotes.length ? ' การลองสำรองก่อนหน้า: ' + priorNotes.join(' · ') : '';
        if (!id || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
        const auth = authParams();
        if (auth.mode === 'none' && !(Number(fileMetaOf(id) && fileMetaOf(id).size) > 0)) { showStreamFailure('ต้องลงชื่อเข้าใช้หรือตั้งค่า API key ก่อนจึงจะโหลดทั้งไฟล์ได้' + prior); if (onGiveUp) onGiveUp(); return; }
        cancelVideoBlobTransfer();
        cancelVideoAttempt();
        const transfer = videoBlobTransfer = {
          id: id,
          session: mediaSession,
          startedAt: Date.now(),
          controller: new AbortController(),
          previewStarted: false,
          previewUrl: null,
          previewChunks: 0,
          waitingForMore: false,
          finished: false,
          resumeTime: 0,
          wasPaused: false,
          lastLoaded: 0,
          lastTotal: 0
        };
        const cacheScope = typeof videoCacheScope === 'function' ? videoCacheScope() : null;
        const cacheMeta = fileMetaOf(id);
        const active = function () { return videoBlobTransfer === transfer && transfer.session === mediaSession && id === vidCurrentId && videoModal.classList.contains('show'); };
        const revokePreviewUrl = function () {
          if (transfer.previewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
            try { URL.revokeObjectURL(transfer.previewUrl); } catch (_) {}
          }
          transfer.previewUrl = null;
        };
        const resetProgressivePreview = function () {
          revokePreviewUrl();
          if (transfer.previewStarted) {
            transfer.previewStarted = false;
            transfer.previewChunks = 0;
            transfer.waitingForMore = false;
            vidPlayer.oncanplay = null;
            vidPlayer.onerror = null;
            vidPlayer.onended = null;
            vidPlayer.ontimeupdate = null;
            vidPlayer.pause();
            vidPlayer.removeAttribute('src');
            vidPlayer.load();
            vidPlayer.style.display = 'none';
          }
        };
        const isPlayableStreamHeader = function (head) {
          if (!head || head.length < 4) return false;
          const webm = head[0] === 26 && head[1] === 69 && head[2] === 223 && head[3] === 163;
          if (webm) return true;
          const mp4 = head.length >= 8 && head[4] === 102 && head[5] === 116 && head[6] === 121 && head[7] === 112;
          if (mp4 && typeof readMp4CodecInfo === 'function') {
            const info = readMp4CodecInfo(head);
            return !!(info && info.playable);
          }
          return false;
        };
        const btn = document.getElementById('vidBlob');
        const cancel = document.getElementById('vidCancelBlob');
        const minBlob = document.getElementById('vidMinimizeBlob');
        const turboBtn = document.getElementById('vidTurboBlob');
        if (btn) btn.disabled = true;
        if (cancel) cancel.hidden = false;
        if (minBlob) minBlob.hidden = false;
        if (turboBtn) { turboBtn.hidden = false; updateTurboUI(); }
        vidPlayer.pause(); vidPlayer.removeAttribute('src'); vidPlayer.load(); vidPlayer.style.display = 'none';
        vidFrame.src = 'about:blank'; vidFrame.style.display = 'none'; vidFrame.removeAttribute('data-video-preview');
        previewAspect = null; vidPlayer.playerAspect = null; applyVideoAspect();
        setVideoStatus('loading', 'กำลังโหลดทั้งไฟล์แทนการสตรีม (ใช้เน็ตตามขนาดไฟล์)…');
        renderVideoBlobProgress(0, 0);
        const directUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media' + (auth.mode === 'key' ? '&key=' + apiKey : '');
        const directHeaders = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + accessToken } : {};
        const directRoute = auth.mode === 'bearer' ? 'bearer' : 'key';
        const directBlocked = typeof routeCooldown !== 'undefined' && routeCooldown && routeCooldown.blocked(id, accessToken ? 'signedin' : 'public', directRoute);
        const turbo = isDownloadTurboEnabled();
        const directConcurrency = turbo ? 8 : 4;
        const directSource = {
          note: turbo ? ' (⚡ สปีดสูงสุด 8 ท่อ)' : '',
          url: directUrl,
          headers: directHeaders,
          rangeOpts: {chunk: 8388608, limit: directConcurrency, retries: 2, priority: 'high'}
        };
        const workerSource = {
          note: ' (ผ่านเซิร์ฟเวอร์สำรอง' + (turbo ? ' 8 ท่อ' : '') + ')',
          url: WORKER_URL + '?id=' + encodeURIComponent(id) + '&continuous=1',
          headers: {},
          rangeOpts: {chunk: 4194304, limit: 8, retries: 3, priority: 'high'}
        };
        // หากแหล่งตรงเพิ่งติดโควตา ให้ข้ามไปเริ่มดึงผ่าน Worker 6 ช่องขนานทันทีโดยไม่ต้องรอติด 403 ซ้ำ
        const sources = auth.mode === 'none' ? [workerSource] : (directBlocked ? [workerSource, directSource] : [directSource, workerSource]);
        const progressBlob = function (loaded, total, pipes) {
          transfer.lastLoaded = loaded;
          transfer.lastTotal = total;
          if (active()) renderVideoBlobProgress(loaded, total, pipes);
        };
        const mountProgressiveSlice = function (sliceParts, sliceCount, mimeType, hasMoreGetter) {
          if (!active() || transfer.finished || sliceCount <= transfer.previewChunks) return;
          if (transfer.previewStarted) {
            const cur = Number(vidPlayer.currentTime);
            if (Number.isFinite(cur) && cur > 0) transfer.resumeTime = cur;
          }
          const partialBlob = new Blob(sliceParts, {type: mimeType || 'video/mp4'});
          const prevUrl = transfer.previewUrl;
          const nextPreviewUrl = URL.createObjectURL(partialBlob);
          transfer.previewUrl = nextPreviewUrl;
          transfer.previewChunks = sliceCount;
          transfer.previewStarted = true;
          transfer.waitingForMore = false;
          if (prevUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
            try { URL.revokeObjectURL(prevUrl); } catch (_) {}
          }
          vidPlayer.removeAttribute('crossorigin');
          vidPlayer.removeAttribute('poster');
          vidPlayer.style.display = 'block';
          if (transfer.lastLoaded > 0) renderVideoBlobProgress(transfer.lastLoaded, transfer.lastTotal);
          const advanceIfMore = function () {
            if (!active() || transfer.finished || transfer.previewUrl !== nextPreviewUrl) return;
            const cur = Number(vidPlayer.currentTime);
            if (Number.isFinite(cur) && cur > 0) transfer.resumeTime = cur;
            if (!hasMoreGetter()) {
              transfer.waitingForMore = true;
              if (typeof vidLoading !== 'undefined' && vidLoading && vidLoading.classList) vidLoading.classList.add('show');
            }
          };
          vidPlayer.onloadedmetadata = function () {
            if (!active() || transfer.finished || transfer.previewUrl !== nextPreviewUrl) return;
            try { applyNativeVideoAspect(); } catch (_) {}
          };
          vidPlayer.oncanplay = function () {
            if (!active() || transfer.finished || transfer.previewUrl !== nextPreviewUrl) return;
            try { applyNativeVideoAspect(); } catch (_) {}
            if (typeof vidLoading !== 'undefined' && vidLoading && vidLoading.classList) vidLoading.classList.remove('show');
            const fallbackResume = typeof videoResumePos !== 'undefined' ? Number(videoResumePos) || 0 : 0;
            const targetTime = transfer.resumeTime > 0 ? transfer.resumeTime : fallbackResume;
            if (targetTime > 0) {
              try { vidPlayer.currentTime = targetTime; } catch (_) {}
              transfer.resumeTime = 0;
            }
            if (!transfer.wasPaused && typeof vidPlayer.play === 'function') {
              Promise.resolve(vidPlayer.play()).catch(function () {});
            }
          };
          vidPlayer.ontimeupdate = function () {
            if (!active() || transfer.finished || transfer.previewUrl !== nextPreviewUrl) return;
            const cur = Number(vidPlayer.currentTime);
            if (Number.isFinite(cur) && cur > 0) transfer.resumeTime = cur;
            if (vidPlayer.buffered && vidPlayer.buffered.length > 0) {
              try {
                const bufEnd = vidPlayer.buffered.end(vidPlayer.buffered.length - 1);
                if (bufEnd > 0 && cur >= bufEnd - 1.2) {
                  transfer.wasPaused = !!vidPlayer.paused;
                  hasMoreGetter();
                }
              } catch (_) {}
            }
          };
          vidPlayer.onended = advanceIfMore;
          vidPlayer.onerror = advanceIfMore;
          vidPlayer.preload = 'auto';
          vidPlayer.src = nextPreviewUrl;
        };
        const loadSingle = function () {
          resetProgressivePreview();
          let singleStreamable = null;
          const onSingleChunk = function (chunks, loaded, total, mimeType) {
            if (!active() || transfer.finished || (total > 0 && loaded >= total)) return;
            if (singleStreamable === null && loaded >= 65536) {
              const cap = Math.min(loaded, 1048576);
              const head = new Uint8Array(cap);
              let offset = 0;
              for (let i = 0; i < chunks.length && offset < cap; i++) {
                const part = chunks[i];
                const take = Math.min(part.byteLength, cap - offset);
                head.set(part.subarray(0, take), offset);
                offset += take;
              }
              singleStreamable = isPlayableStreamHeader(head);
            }
            if (singleStreamable && loaded >= 2097152 && (!transfer.previewStarted || transfer.waitingForMore)) {
              mountProgressiveSlice(chunks.slice(), chunks.length, mimeType, function () {
                if (chunks.length > transfer.previewChunks) {
                  mountProgressiveSlice(chunks.slice(), chunks.length, mimeType, function () { return false; });
                  return true;
                }
                return false;
              });
            }
          };
          return fetch(directUrl, { headers: directHeaders, signal: transfer.controller.signal })
            .then(function (res) {
              if (!active()) { transfer.controller.abort(); const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; }
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return readVideoBlobResponse(res, transfer.controller.signal, progressBlob, onSingleChunk);
            });
        };
        const size = Number(fileMetaOf(id).size);
        const attemptParallel = function (source) {
          // เบราว์เซอร์ที่รองรับ OPFS จะเขียนทุกช่วงลงดิสก์ระหว่างโหลด แล้วเล่นจากไฟล์บนดิสก์
          // พร้อมเปิดเล่นส่วนต้น (Contiguous Prefix Blob) ทันทีที่ส่วนหัวพร้อม โดยไม่ต้องรอโหลดครบ 100%
          resetProgressivePreview();
          const MAX_PREVIEW_CHUNKS = 16;
          const prefixParts = [];
          let contiguousCount = 0;
          let completedCount = 0;
          let streamablePrefix = null;
          let detectedMime = 'video/mp4';
          const tryMountPrefix = function () {
            if (!active() || transfer.finished || !streamablePrefix || contiguousCount < 1) return false;
            if (contiguousCount <= transfer.previewChunks) return false;
            mountProgressiveSlice(prefixParts.slice(0, contiguousCount), contiguousCount, detectedMime, tryMountPrefix);
            return true;
          };
          const handleChunkReady = function (index, start, chunk, totalChunks, mimeType) {
            completedCount++;
            if (mimeType) detectedMime = mimeType;
            if (index < MAX_PREVIEW_CHUNKS) {
              prefixParts[index] = chunk;
              while (contiguousCount < MAX_PREVIEW_CHUNKS && prefixParts[contiguousCount]) {
                contiguousCount++;
              }
            }
            if (completedCount >= totalChunks) return;
            if (index === 0 && streamablePrefix === null && chunk && typeof chunk.slice === 'function') {
              streamablePrefix = false;
              Promise.resolve(chunk.slice(0, Math.min(chunk.size || 0, 1048576)).arrayBuffer()).then(function (buf) {
                if (!active() || transfer.finished || completedCount >= totalChunks) return;
                streamablePrefix = isPlayableStreamHeader(new Uint8Array(buf));
                if (streamablePrefix) tryMountPrefix();
              }).catch(function () {});
            } else if (streamablePrefix === true && (!transfer.previewStarted || transfer.waitingForMore)) {
              tryMountPrefix();
            }
          };
          const rangeOpts = Object.assign({}, source.rangeOpts, {onChunkReady: handleChunkReady});
          return openVideoTempWriter().then(function (temp) {
            const assembled = readVideoBlobRanges(source.url, source.headers, size, transfer.controller.signal, progressBlob,
              temp ? function (index, start, chunk) { return temp.write(chunk, start); } : null, rangeOpts);
            return temp
              ? assembled.then(function () {
                  // Do not commit a completed temp file after the player was closed or switched to another file.
                  if (transfer.controller.signal.aborted || !active()) {
                    const error = new Error('Cancelled'); error.name = 'AbortError'; throw error;
                  }
                  return temp.done();
                })
                .catch(function (err) { return Promise.resolve(temp.stop()).catch(function () {}).then(function () { throw err; }); })
              : assembled;
          });
        };
        const load = size > 2 * 8388608 ? function () {
          let index = 0;
          const tryNext = function () {
            if (!active()) return Promise.reject(Object.assign(new Error('Cancelled'), {name: 'AbortError'}));
            if (index >= sources.length) return loadSingle();
            const source = sources[index++];
            setVideoStatus('loading', 'กำลังโหลดทั้งไฟล์แทนการสตรีม (ใช้เน็ตตามขนาดไฟล์)' + source.note + '…');
            renderVideoBlobProgress(0, 0);
            return attemptParallel(source).catch(function (err) {
              if ((err && err.name === 'AbortError') || transfer.controller.signal.aborted || !active()) throw err;
              return tryNext();
            });
          };
          return tryNext();
        } : loadSingle;
        return load().then(async function (blob) {
            transfer.finished = true;
            if (!active()) { revokePreviewUrl(); return; }
            if (transfer.previewStarted) {
              const liveTime = Number(vidPlayer.currentTime);
              const nextResume = Number.isFinite(liveTime) && liveTime > 0 ? liveTime : (transfer.resumeTime > 0 ? transfer.resumeTime : 0);
              if (nextResume > 0) {
                if (typeof videoResumePos !== 'undefined') videoResumePos = nextResume;
                else deps.videoResumePos = nextResume;
              }
            }
            revokePreviewUrl();
            const nextUrl = URL.createObjectURL(blob);
            videoBlobTransfer = null;
            if (cancel) cancel.hidden = true;
            const minBlob = document.getElementById('vidMinimizeBlob');
            if (minBlob) minBlob.hidden = true;
            const turboBtn = document.getElementById('vidTurboBlob');
            if (turboBtn) turboBtn.hidden = true;
            if (btn) btn.disabled = false;
            revokeCurrentVideo();
            currentVideoUrl = nextUrl;
            vidPlayer.removeAttribute('crossorigin');
            vidPlayer.style.display = 'block';
            tryVideoSrc(currentVideoUrl, function () { showStreamFailure('โหลดทั้งไฟล์แล้วแต่ยังเล่นไม่ได้ — ไฟล์อาจอยู่ในรูปแบบที่เบราว์เซอร์นี้ไม่รองรับ' + describeCodecSupport(deviceCodecSupport()) + prior); if (onGiveUp) onGiveUp(); }, TIMEOUTS.blobPlaybackMs);
            setVideoStatus('loading', 'โหลดทั้งไฟล์ครบแล้ว กำลังเตรียมเครื่องเล่น…');
            if (typeof videoCache !== 'undefined' && videoCache && cacheScope) {
              try {
                await videoCache.put(id, blob, cacheMeta, cacheScope);
                if (typeof refreshVideoCacheUI === 'function') refreshVideoCacheUI();
              } catch (_) {}
            }
          })
          .catch(function (err) {
            transfer.finished = true;
            if (!active()) { revokePreviewUrl(); return; }
            resetProgressivePreview();
            videoBlobTransfer = null;
            if (cancel) cancel.hidden = true;
            const minBlob2 = document.getElementById('vidMinimizeBlob');
            if (minBlob2) minBlob2.hidden = true;
            const turboBtn2 = document.getElementById('vidTurboBlob');
            if (turboBtn2) turboBtn2.hidden = true;
            if (err && err.name === 'AbortError') { if (btn) btn.disabled = false; return; }
            const blobFailMsg = err && err.message ? err.message : 'ลองใหม่อีกครั้ง';
            const blobHint = !accessToken && /40[13]/.test(blobFailMsg) ? ' — ลองล็อกอิน Google ก่อนแล้วกดใหม่ (ไฟล์ส่วนตัว หรือ Google จำกัดโควตาการดาวน์โหลดของคนไม่ล็อกอิน)' : '';
            setVideoStatus('error', 'โหลดทั้งไฟล์ไม่สำเร็จ (' + blobFailMsg + ')' + blobHint + prior);
            if (btn) btn.disabled = false;
            if (onGiveUp) onGiveUp();
          });
          }
        };
      }

function createVideoSourceRunner(deps, fallbacks) {
  // Live scope: test stubs (deps) win, then the module's own functions, then globals.
  const scope = new Proxy({}, {
    has(t, key) { return (deps && key in deps) || (fallbacks && key in fallbacks); },
    get(t, key) { if (deps && key in deps) return deps[key]; if (fallbacks && key in fallbacks) return fallbacks[key]; return undefined; },
    set(t, key, value) { if (deps) deps[key] = value; return true; }
  });
  // Deps-only test invocations omit the fallbacks, so default the trace to a no-op.
  const traceVideoEvent = (deps && typeof deps.traceVideoEvent === 'function') ? deps.traceVideoEvent
    : (fallbacks && typeof fallbacks.traceVideoEvent === 'function') ? fallbacks.traceVideoEvent
    : function () {};
        return function tryVideoSrc(url, onFail, timeoutMs = (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.genericMs : 12000), route = null) {
          with (scope) {
        cancelVideoBlobTransfer();
        cancelVideoAttempt();
        vidPlayer.playerAspect = null;
        applyVideoAspect();
        const session = mediaSession;
        const attempt = videoAttempt;
        const playbackId = vidCurrentId;
        if (route && typeof routeCooldown !== 'undefined' && routeCooldown) {
          const reportFailure = onFail, mode = accessToken ? 'signedin' : 'public';
          onFail = function (reason, diagnostic) { routeCooldown.fail(playbackId, mode, route); reportFailure(reason, diagnostic); };
        }

        if (url && url.searchParams) url.searchParams.set('attempt', String(attempt));
        vidPlayer.playbackRoute = route ? {id: vidCurrentId, session: session, mode: accessToken ? 'signedin' : 'public', route: route, url: new URL(String(url), location.href).href} : null;
        traceVideoEvent('route', (route || 'src') + ' เริ่ม (หมดเวลา ' + Math.round(timeoutMs / 1000) + ' วิ)');

        let done = false;
        vidPlayer.onloadedmetadata = function () {
          if (done || session !== mediaSession || attempt !== videoAttempt) return;
          applyNativeVideoAspect();
        };

        const timer = videoAttemptTimer = setTimeout(function () { if (!done && session === mediaSession && attempt === videoAttempt) { done = true; cancelVideoAttempt(); failedVideoAttempt = attempt; traceVideoEvent('fail', (route || 'src') + ' หมดเวลา'); onFail('timeout'); } }, timeoutMs);

        // โหลดช้ากว่าปกติ — แจ้งเตือนหลัง 15 วินาที แต่ยังรอต่อถึงเพดานที่ตั้งไว้
        videoSlowTimer = setTimeout(function () {
          if (!done && session === mediaSession && attempt === videoAttempt) {
            setVideoStatus('loading', 'โหลดนานกว่าปกติ กำลังพยายามต่อ…');
            const slowActions = document.getElementById ? document.getElementById('vidSlowActions') : null;
            if (slowActions) slowActions.style.display = 'flex';
          }
        }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.slowMs : 15000));

        // สำหรับเบราว์เซอร์จริง (มือถือ/เน็ตช้า) — แสดงทางลัด VLC / พรีวิว Google หลังหมุน 3.5 วินาที
        if (typeof window !== 'undefined' && window.setTimeout) {
          window.setTimeout(function () {
            if (!done && session === mediaSession && attempt === videoAttempt && (videoStatus === 'loading' || videoStatus === 'connecting')) {
              const slowActions = document.getElementById ? document.getElementById('vidSlowActions') : null;
              if (slowActions) slowActions.style.display = 'flex';
              setVideoStatus('loading', 'กำลังเตรียมข้อมูลวิดีโอ… หากหมุนนาน สามารถกด “เปิดใน VLC” หรือ “พรีวิว Google” ได้ทันที');
            }
          }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.vlcHintMs : 3500));
        }

        vidPlayer.onerror = function () {

          if (done || session !== mediaSession || attempt !== videoAttempt) return;

          const diagnostic = 'M' + (Number(vidPlayer.error && vidPlayer.error.code) || 0) + '/N' + (Number(vidPlayer.networkState) || 0) + '/R' + (Number(vidPlayer.readyState) || 0);
          done = true; cancelVideoAttempt(); failedVideoAttempt = attempt; traceVideoEvent('fail', (route || 'src') + ' media ' + diagnostic); onFail('media', diagnostic);

        };

        vidPlayer.oncanplay = function () {

          if (done || session !== mediaSession || attempt !== videoAttempt) return;

          applyNativeVideoAspect();
          done = true;

          cancelVideoAttempt();

          // Startup succeeded; retain a separate handler for failures while watching.
          const runningAttempt = videoAttempt;
          vidPlayer.onerror = function () {
            if (session !== mediaSession || runningAttempt !== videoAttempt || playbackId !== vidCurrentId || !videoModal.classList.contains('show') || vidPlayer.style.display === 'none') return;
            const time = Number(vidPlayer.currentTime);
            if (Number.isFinite(time) && time > 2 && !vidPlayer.ended) { videoResumePos = time; saveVideoPos(); }
            const code = Number(vidPlayer.error && vidPlayer.error.code) || 0;
            const diagnostic = 'M' + code + '/N' + (Number(vidPlayer.networkState) || 0) + '/R' + (Number(vidPlayer.readyState) || 0);
            if (videoStatus !== 'error') setVideoStatus('error', code === 2
              ? 'รับข้อมูลวิดีโอระหว่างเล่นไม่สำเร็จ กดลองใหม่เพื่อดูต่อจากตำแหน่งเดิม'
              : code === 3 ? 'เบราว์เซอร์ถอดรหัสข้อมูลวิดีโอระหว่างเล่นไม่สำเร็จ กดลองใหม่หรือใช้พรีวิว Google'
              : 'เครื่องเล่นหยุดระหว่างดู กดลองใหม่เพื่อดูต่อ หรือใช้พรีวิว Google');
            cancelVideoAttempt(); failedVideoAttempt = runningAttempt;
            onFail('media', diagnostic);
          };

          setVideoStatus('playing');

          // กลับไปตำแหน่งที่เคยดูค้างไว้ (ถ้ามี)

          if (videoResumePos > 0) {

            try { vidPlayer.currentTime = videoResumePos; } catch (_) {}

          }

          vidPlayer.play().catch(function () {});

        };

        setVideoStatus('loading');
        vidPlayer.preload = 'auto';

        vidPlayer.src = url;

          }
        };
      }

function createVideoCenter(app) {
  'use strict';

  // Playback state variables physically owned by this closure (Slice 2b)
  let mediaSession = (app && 'mediaSession' in app && app.mediaSession !== undefined) ? app.mediaSession : 0;
  let videoAttempt = (app && 'videoAttempt' in app && app.videoAttempt !== undefined) ? app.videoAttempt : 0;
  let videoAttemptTimer = (app && 'videoAttemptTimer' in app && app.videoAttemptTimer !== undefined) ? app.videoAttemptTimer : null;
  let videoSlowTimer = (app && 'videoSlowTimer' in app && app.videoSlowTimer !== undefined) ? app.videoSlowTimer : null;
  let vidCurrentId = (app && 'vidCurrentId' in app && app.vidCurrentId !== undefined) ? app.vidCurrentId : null;
  let currentVideoUrl = (app && 'currentVideoUrl' in app && app.currentVideoUrl !== undefined) ? app.currentVideoUrl : null;
  let videoStatus = (app && 'videoStatus' in app && app.videoStatus !== undefined) ? app.videoStatus : 'closed';
  let videoResumePos = (app && 'videoResumePos' in app && app.videoResumePos !== undefined) ? app.videoResumePos : 0;
  let streamWorkerReady = (app && 'streamWorkerReady' in app && app.streamWorkerReady !== undefined) ? app.streamWorkerReady : null;
  // Each openVideo bumps the epoch; a registration attempt from an earlier
  // epoch must not trace into, or fail, the session that reused it.
  let streamWorkerEpoch = 0;
  let streamWorkerAttemptEpoch = 0;
  let streamWorkerDeadlineRefresh = null;
  let failedVideoAttempt = (app && 'failedVideoAttempt' in app && app.failedVideoAttempt !== undefined) ? app.failedVideoAttempt : null;
  let previewAspect = (app && 'previewAspect' in app && app.previewAspect !== undefined) ? app.previewAspect : null;
  let videoBlobTransfer = (app && 'videoBlobTransfer' in app && app.videoBlobTransfer !== undefined) ? app.videoBlobTransfer : null;
  let mediaPreviousOverflow = (app && 'mediaPreviousOverflow' in app && app.mediaPreviousOverflow !== undefined) ? app.mediaPreviousOverflow : "";
  let chromeHideTimer = null;

  function videoCacheScope() {
    return typeof app.videoCacheScope === 'function' ? app.videoCacheScope() : (app.videoCacheScope || null);
  }
  function videoCacheLimit() {
    return typeof app.videoCacheLimit === 'function' ? app.videoCacheLimit() : (Number(app.videoCacheLimit) || 0);
  }

  const stateProps = {
    mediaSession: { get() { return mediaSession; }, set(v) { mediaSession = v; }, configurable: true, enumerable: true },
    videoAttempt: { get() { return videoAttempt; }, set(v) { videoAttempt = v; }, configurable: true, enumerable: true },
    videoAttemptTimer: { get() { return videoAttemptTimer; }, set(v) { videoAttemptTimer = v; }, configurable: true, enumerable: true },
    videoSlowTimer: { get() { return videoSlowTimer; }, set(v) { videoSlowTimer = v; }, configurable: true, enumerable: true },
    vidCurrentId: { get() { return vidCurrentId; }, set(v) { vidCurrentId = v; }, configurable: true, enumerable: true },
    currentVideoUrl: { get() { return currentVideoUrl; }, set(v) { currentVideoUrl = v; }, configurable: true, enumerable: true },
    videoStatus: { get() { return videoStatus; }, set(v) { videoStatus = v; }, configurable: true, enumerable: true },
    videoResumePos: { get() { return videoResumePos; }, set(v) { videoResumePos = v; }, configurable: true, enumerable: true },
    streamWorkerReady: { get() { return streamWorkerReady; }, set(v) { streamWorkerReady = v; }, configurable: true, enumerable: true },
    failedVideoAttempt: { get() { return failedVideoAttempt; }, set(v) { failedVideoAttempt = v; }, configurable: true, enumerable: true },
    previewAspect: { get() { return previewAspect; }, set(v) { previewAspect = v; }, configurable: true, enumerable: true },
    videoBlobTransfer: { get() { return videoBlobTransfer; }, set(v) { videoBlobTransfer = v; }, configurable: true, enumerable: true },
    mediaPreviousOverflow: { get() { return mediaPreviousOverflow; }, set(v) { mediaPreviousOverflow = v; }, configurable: true, enumerable: true }
  };
  if (app) {
    try { Object.defineProperties(app, stateProps); } catch (_) {}
  }

  // Service Worker token handshake listener (moved into createVideoCenter in Slice 2b)
  const nav = app.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  const loc = app.location || (typeof location !== 'undefined' ? location : null);
  const URLCtor = app.URL || (typeof URL !== 'undefined' ? URL : null);
  if (nav && 'serviceWorker' in nav && loc && URLCtor) {
    const streamSwScript = new URLCtor('drive-stream-sw.js', loc.href).href;
    nav.serviceWorker.addEventListener('message', function (event) {
      if (!event.source || event.source.scriptURL !== streamSwScript) return;
      if (event.data && event.data.type === 'drive-stream-error') {
        handleDriveStreamError(event.data);
        return;
      }
      if (!event.ports || !event.ports[0]) return;
      if (!event.data || event.data.type !== 'drive-stream-token') return;
      const expiry = typeof app.tokenExpiry === 'function' ? app.tokenExpiry() : app.tokenExpiry;
      const tokenNow = (app.Date || Date).now();
      const idMatch = event.data.id === vidCurrentId;
      const modalOpen = !!(app.videoModal && app.videoModal.classList && app.videoModal.classList.contains('show'));
      const sessionValid = tokenNow < expiry;
      const allowed = idMatch && modalOpen && sessionValid;
      traceVideoEvent('swtok', allowed
        ? 'ตอบ token ให้ SW (ไฟล์ตรง เซสชันโอเค)'
        : 'ปฏิเสธ: ' + (!idMatch ? 'ไฟล์ไม่ตรง' : !modalOpen ? 'โมดัลปิด' : 'เซสชันหมดอายุ'));
      let streamMeta = null;
      if (allowed && vidCurrentId && typeof app.fileMetaOf === 'function') {
        try { streamMeta = app.fileMetaOf(vidCurrentId); } catch (_) { streamMeta = null; }
      }
      event.ports[0].postMessage({
        token: allowed ? (typeof app.accessToken === 'function' ? app.accessToken() : app.accessToken) : null,
        scope: allowed ? videoCacheScope() : null,
        size: streamMeta && Number(streamMeta.size) > 0 ? Number(streamMeta.size) : 0,
        modifiedTime: streamMeta && streamMeta.modifiedTime ? String(streamMeta.modifiedTime) : '',
        heads: !!(allowed && videoCacheLimit() > 0 && videoCacheScope())
      });
    });
  }

  // Runner fallbacks: every module function the verbatim runner bodies reference.
  const runnerFallbacks = Object.assign({}, app, {
    TIMEOUTS: TIMEOUTS,
    WORKER_URL: WORKER_URL,
    EXPECTED_WORKER_REV: EXPECTED_WORKER_REV,
    startVideoPlayback: startVideoPlayback,
    playbackRouteRecords: playbackRouteRecords,
    rememberPlaybackRoute: rememberPlaybackRoute,
    preferredPlaybackRoute: preferredPlaybackRoute,
    recordActivePlaybackRoute: recordActivePlaybackRoute,
    setVideoStatus: setVideoStatus,
    handleDriveStreamError: handleDriveStreamError,
    traceVideoEvent: traceVideoEvent,
    cancelVideoAttempt: cancelVideoAttempt,
    resetMediaPlayback: resetMediaPlayback,
    cachedVideoThumb: cachedVideoThumb,
    openVideo: openVideo,
    streamBlocked: streamBlocked,
    rememberStreamBlocked: rememberStreamBlocked,
    clearStreamBlocked: clearStreamBlocked,
    streamBlockVerdict: streamBlockVerdict,
    shouldRememberStreamBlock: shouldRememberStreamBlock,
    deviceCodecSupport: deviceCodecSupport,
    describeCodecSupport: describeCodecSupport,
    readMp4CodecInfo: readMp4CodecInfo,
    probeStreamEndpoint: probeStreamEndpoint,
    calculatePreviewLayout: calculatePreviewLayout,
    fitVideoPreview: fitVideoPreview,
    clampPreviewAspect: clampPreviewAspect,
    loadCachedVideoAspect: loadCachedVideoAspect,
    saveCachedVideoAspect: saveCachedVideoAspect,
    applyPreviewAspect: applyPreviewAspect,
    configurePreviewFullscreen: configurePreviewFullscreen,
    lockHorizontalPlayerOrientation: lockHorizontalPlayerOrientation,
    getPlayerAspect: getPlayerAspect,
    releasePlayerOrientation: releasePlayerOrientation,
    applyVideoAspect: applyVideoAspect,
    togglePreviewAspect: togglePreviewAspect,
    openInExternalPlayer: openInExternalPlayer,
    copyVideoToMyDrive: copyVideoToMyDrive,
    applyNativeVideoAspect: applyNativeVideoAspect,
    togglePlayerFullscreen: togglePlayerFullscreen,
    isVideoMinimized: isVideoMinimized,
    minimizeVideo: minimizeVideo,
    restoreVideo: restoreVideo,
    toggleMinimizeVideo: toggleMinimizeVideo,
    isDownloadTurboEnabled: isDownloadTurboEnabled,
    updateTurboUI: updateTurboUI,
    setDownloadTurboEnabled: setDownloadTurboEnabled,
    toggleDownloadTurbo: toggleDownloadTurbo,
    prepareStreamWorker: prepareStreamWorker,
    showStreamFailure: showStreamFailure,
    tryStreamDirect: tryStreamDirect,
    probePublicStreamError: probePublicStreamError,
    prioritizePlaybackSource: prioritizePlaybackSource,
    createPublicStreamRunner: createPublicStreamRunner,
    tryPublicStream: tryPublicStream,
    readVideoBlobResponse: readVideoBlobResponse,
    readVideoBlobRanges: readVideoBlobRanges,
    openVideoTempWriter: openVideoTempWriter,
    renderVideoBlobProgress: renderVideoBlobProgress,
    cancelVideoBlobTransfer: cancelVideoBlobTransfer,
    requestVideoBlob: requestVideoBlob,
    createVideoBlobRunner: createVideoBlobRunner,
    loadVideoAsBlob: loadVideoAsBlob,
    createVideoSourceRunner: createVideoSourceRunner,
    tryVideoSrc: tryVideoSrc,
    loadWatchedVideos: loadWatchedVideos,
    toggleWatchedVideo: toggleWatchedVideo,
    warmVideoStream: warmVideoStream,
    attachWatchedButtons: attachWatchedButtons,
    loadContinueWatching: loadContinueWatching,
    saveVideoPos: saveVideoPos,
    renderContinueWatching: renderContinueWatching,
    revokeCurrentVideo: revokeCurrentVideo,
    closeVideo: closeVideo,
    nextVideoInList: nextVideoInList,
    hideNextUp: hideNextUp,
    showNextUp: showNextUp,
    playNextUp: playNextUp,
    prefetchHeadFor: prefetchHeadFor,
    prefetchNextUp: prefetchNextUp
  });
  Object.defineProperties(runnerFallbacks, stateProps);


      function startVideoPlayback(id) {
        if (typeof warmVideoStream === 'function') warmVideoStream(id);
        if (typeof app.videoCache === 'undefined' || !app.videoCache) { tryStreamDirect(id); return Promise.resolve(); }
        const session = mediaSession, attempt = videoAttempt, token = app.accessToken, scope = app.videoCacheScope();
        const active = function () { return session === mediaSession && attempt === videoAttempt && token === app.accessToken && id === vidCurrentId && app.videoModal.classList.contains('show'); };
        let timer;
        setVideoStatus('connecting', 'กำลังตรวจคลิปที่เก็บไว้ในเครื่อง…');
        return Promise.race([app.videoCache.get(id, app.fileMetaOf(id), scope), new Promise(function (resolve) { timer = app.setTimeout(function () { resolve(null); }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.cacheRaceMs : 350)); })]).then(function (blob) {
          app.clearTimeout(timer);
          if (!active()) return;
          if (!blob) { tryStreamDirect(id); return; }
          revokeCurrentVideo();
          currentVideoUrl = URL.createObjectURL(blob);
          app.vidPlayer.removeAttribute('crossorigin'); app.vidPlayer.style.display = 'block';
          tryVideoSrc(currentVideoUrl, function () {
            if (session !== mediaSession || token !== app.accessToken || id !== vidCurrentId || !app.videoModal.classList.contains('show')) return;
            return app.videoCache.remove(id, scope).then(function () {
              if (session === mediaSession && token === app.accessToken && id === vidCurrentId && app.videoModal.classList.contains('show')) tryStreamDirect(id);
            });
          }, 120000);
          setVideoStatus('loading', 'กำลังเปิดคลิปที่เก็บไว้ในเครื่อง…');
        });
      }

      function playbackRouteRecords() {
        try {
          const records = JSON.parse(app.lsGet('gdv_playback_routes') || '[]');
          if (!Array.isArray(records)) return [];
          return records.filter(function (r) { return r && typeof r.id === 'string' && r.id.length <= 200 && ['signedin', 'public'].includes(r.mode) && ['bearer', 'worker', 'usercontent', 'key'].includes(r.route) && Number.isFinite(r.at) && r.at <= app.Date.now() && app.Date.now() - r.at < 7 * 86400000; }).slice(-50);
        } catch (_) { return []; }
      }

      function rememberPlaybackRoute(id, route) {
        if (!['bearer', 'worker', 'usercontent', 'key'].includes(route)) return;
        const mode = app.accessToken ? 'signedin' : 'public';
        const records = playbackRouteRecords().filter(function (r) { return r.id !== id || r.mode !== mode; });
        records.push({id: id, mode: mode, route: route, at: app.Date.now()});
        app.lsSet('gdv_playback_routes', JSON.stringify(records.slice(-50)));
      }

      function preferredPlaybackRoute(id) {
        const mode = app.accessToken ? 'signedin' : 'public';
        const records = playbackRouteRecords();
        const record = records.find(function (r) { return r.id === id && r.mode === mode; });
        if (record) return record.route;
        const latest = records.slice().reverse().find(function (r) { return r.mode === mode; });
        return latest ? latest.route : null;
      }

      function recordActivePlaybackRoute() {
        const source = app.vidPlayer.playbackRoute;
        if (!source || source.session !== mediaSession || source.id !== vidCurrentId || source.mode !== (app.accessToken ? 'signedin' : 'public') || !app.videoModal.classList.contains('show') || app.vidPlayer.paused || app.vidPlayer.style.display === 'none' || String(app.vidPlayer.src) !== source.url) return;
        rememberPlaybackRoute(source.id, source.route);
        if (typeof app.routeCooldown !== 'undefined' && app.routeCooldown) app.routeCooldown.success(source.id, source.mode, source.route);
      }

      // Cinematic overlay chrome (Prototype A): pointer activity shows the
      // chrome, and 2.5s of stillness hides it — but only while the video is
      // actually playing. Loading / error / preview / minimized states always
      // show chrome. With no real video (headless tests) nothing ever hides.
      function showVideoChrome() {
        if (chromeHideTimer !== null) { app.clearTimeout(chromeHideTimer); chromeHideTimer = null; }
        if (app.videoModal && app.videoModal.classList && app.videoModal.classList.remove) app.videoModal.classList.remove('chrome-hidden');
        if (videoStatus !== 'playing') return;
        if (typeof app.window === 'undefined' || !app.window || typeof app.window.setTimeout !== 'function') return;
        chromeHideTimer = app.window.setTimeout(function () {
          chromeHideTimer = null;
          if (videoStatus !== 'playing' || !app.videoModal || !app.videoModal.classList) return;
          if (!app.videoModal.classList.contains('show') || app.videoModal.classList.contains('minimized')) return;
          const menu = app.document && app.document.getElementById ? app.document.getElementById('vidHelp') : null;
          if (menu && menu.open) return;
          app.videoModal.classList.add('chrome-hidden');
        }, 2500);
      }

      // On-screen route diagnostics: signed-in playback failures cannot be
      // reproduced without the user's account, so the route ladder reports
      // itself here and the user copies one report for the developer.
      const videoTrace = [];
      let videoTraceT0 = null;

      function traceVideoEvent(e, d) {
        if (videoTraceT0 === null) videoTraceT0 = (typeof app.Date !== 'undefined' ? app.Date : Date).now();
        const dStr = String(d === undefined ? '' : d).slice(0, 220);
        const t = ((typeof app.Date !== 'undefined' ? app.Date : Date).now() - videoTraceT0) / 1000;
        const last = videoTrace[videoTrace.length - 1];
        if (last && last.e === String(e) && last.d === dStr) last.t = t;
        else videoTrace.push({ t: t, e: String(e), d: dStr });
        if (videoTrace.length > 60) videoTrace.splice(0, videoTrace.length - 60);
        if (typeof app.lsSet === 'function') { try { app.lsSet('gdv_video_trace_v1', JSON.stringify(videoTrace)); } catch (_) {} }
        renderVideoTrace();
      }

      function videoTraceEnvLine() {
        let versions = 'ไม่ทราบเวอร์ชัน';
        try {
          const tags = [];
          const scripts = app.document && app.document.scripts;
          for (let i = 0; scripts && i < scripts.length; i++) {
            const m = String(scripts[i].src || '').match(/(video-player|app-core)\.js\?v=[^?]*?(r\d+)/);
            if (m) tags.push(m[1] + ' ' + m[2]);
          }
          if (tags.length) versions = tags.join(', ');
        } catch (_) {}
        let login = 'ไม่ล็อกอิน';
        try {
          const token = typeof app.accessToken === 'function' ? app.accessToken() : app.accessToken;
          if (token) login = 'ล็อกอิน';
        } catch (_) {}
        let sw = 'ไม่ทราบสถานะ';
        try {
          sw = (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) ? 'ควบคุมหน้าอยู่' : 'ไม่มี controller';
        } catch (_) {}
        let origin = '';
        try { origin = app.location && app.location.origin ? String(app.location.origin) : ''; } catch (_) {}
        let ua = '';
        try { ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? ' · ' + String(navigator.userAgent).slice(0, 120) : ''; } catch (_) {}
        return 'เวอร์ชัน ' + versions + ' · ' + login + ' · SW ' + sw + (origin ? ' · ' + origin : '') + ua;
      }

      function resetVideoTrace() {
        videoTrace.length = 0;
        videoTraceT0 = null;
        traceVideoEvent('env', videoTraceEnvLine());
      }

      function videoTraceReport() {
        const lines = ['รายงานวินิจฉัยวิดีโอ ' + new (typeof app.Date !== 'undefined' ? app.Date : Date)().toISOString(), videoTraceEnvLine(), vidCurrentId ? 'ไฟล์ ' + vidCurrentId : 'ไม่ทราบไฟล์'];
        videoTrace.forEach(function (ev, i) { lines.push((i + 1) + '. ' + ev.t.toFixed(1) + 's [' + ev.e + '] ' + ev.d); });
        return lines.join('\n');
      }

      function copyVideoTrace() {
        const text = videoTraceReport();
        const doc = app.document;
        const btn = doc && doc.getElementById ? doc.getElementById('vidTraceCopy') : null;
        const flash = function () {
          if (!btn) return;
          const prev = btn.textContent;
          btn.textContent = 'คัดลอกแล้ว ✓';
          app.setTimeout(function () { if (btn.textContent === 'คัดลอกแล้ว ✓') btn.textContent = prev; }, 2000);
        };
        const fail = function () {
          if (!btn) return;
          const prev = btn.textContent;
          btn.textContent = 'คัดลอกไม่สำเร็จ — เลือกข้อความแล้วกด Ctrl+C';
          app.setTimeout(function () { if (btn.textContent !== prev) btn.textContent = prev; }, 2500);
        };
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(flash, function () { copyVideoTraceFallback(text, flash, fail); });
          return;
        }
        copyVideoTraceFallback(text, flash, fail);
      }

      function copyVideoTraceFallback(text, flash, fail) {
        try {
          const ta = app.document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          app.document.body.appendChild(ta);
          ta.select();
          const ok = app.document.execCommand('copy');
          app.document.body.removeChild(ta);
          if (ok) flash();
          else if (fail) fail();
        } catch (_) { if (fail) fail(); }
      }

      function toggleVideoTrace() {
        const doc = app.document;
        const box = doc && doc.getElementById ? doc.getElementById('vidTrace') : null;
        if (box && box.classList) box.classList.toggle('collapsed');
      }

      function renderVideoTrace() {
        const doc = app.document;
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

      function setVideoStatus(state, message) {
        const prev = videoStatus;
        videoStatus = state;
        traceVideoEvent('status', state + (message ? ' — ' + message : ''));
        const status = app.document.getElementById ? app.document.getElementById('vidErrorStatus') : null;
        const loadingText = app.document.getElementById ? app.document.getElementById('vidLoadingText') : null;
        const help = app.document.getElementById ? app.document.getElementById('vidHelp') : null;
        const title = app.document.getElementById('vidTitle');
        const fullTitle = app.document.getElementById('vidFullTitle');
        const note = app.document.getElementById('vidPreviewNote');
        const info = app.document.getElementById('vidInfo');
        if (fullTitle && title) fullTitle.textContent = title.textContent;
        if (note) { note.hidden = state !== 'preview'; if (state === 'preview') note.textContent = message || ''; }
        if (info && (state === 'closed' || state === 'connecting')) info.open = false;
        if (status) status.setAttribute('data-preview-note', state === 'preview' ? 'true' : 'false');
        const slowActions = app.document.getElementById ? app.document.getElementById('vidSlowActions') : null;
        if (state === 'playing') { app.vidLoading.classList.remove('show'); if (slowActions) slowActions.style.display = 'none'; if (status) status.hidden = true; if (prev !== 'playing' && help) help.open = false; if (typeof showVideoChrome === 'function') showVideoChrome(); }
        else if (state === 'error' || state === 'preview') { app.vidLoading.classList.remove('show'); if (slowActions) slowActions.style.display = 'none'; if (status) { if (message) status.textContent = message; status.hidden = !message; } if (((state === 'error' && prev !== 'error') || (state === 'preview' && prev !== 'preview')) && help) help.open = true; }
        else if (state === 'closed') { app.vidLoading.classList.remove('show'); if (slowActions) slowActions.style.display = 'none'; if (status) status.hidden = true; }
        else {
          app.vidLoading.classList.add('show');
          if (status) status.hidden = true;
          if (loadingText) loadingText.textContent = message || (state === 'connecting' ? 'กำลังเชื่อมต่อ…' : state === 'buffering' ? 'กำลังบัฟเฟอร์…' : 'กำลังโหลดวิดีโอ…');
          if (state === 'buffering' && typeof app.window !== 'undefined' && app.window.setTimeout) {
            app.window.setTimeout(function () {
              if (videoStatus === 'buffering') {
                if (slowActions) slowActions.style.display = 'flex';
                if (loadingText) loadingText.textContent = 'วิดีโอกำลังบัฟเฟอร์… หากเน็ตสะดุด แนะนำเปิดใน VLC หรือใช้พรีวิว Google';
              }
            }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.bufferingMs : 2000));
          }
        }
        return videoStatus;
      }

      function handleDriveStreamError(data) {
        if (!data || data.type !== 'drive-stream-error') return false;
        if (data.id !== vidCurrentId || !app.videoModal.classList.contains('show')) return false;
        const failedAttempt = typeof failedVideoAttempt === 'undefined' ? null : failedVideoAttempt;
        if (data.attempt != null && Number(data.attempt) !== videoAttempt && !(videoStatus === 'error' && failedAttempt !== null && Number(data.attempt) === failedAttempt)) return false;
        traceVideoEvent('swerr', 'status ' + data.status + (data.reason ? ' ' + data.reason : '') + (data.upstreamStatus ? ' HTTP ' + data.upstreamStatus : ''));
        if (data.reason === 'streamRangeUnsupported') {
          const kinds = ['status','header','start','end','total'];
          const kind = kinds.includes(data.rangeFailure) ? data.rangeFailure : 'unknown';
          const status = Number(data.upstreamStatus);
          const diagnostic = Number.isInteger(status) && status >= 100 && status <= 599 ? ' [RANGE/' + kind + '/HTTP' + status + ']' : '';
          setVideoStatus('error', 'แหล่งสตรีมไม่รองรับช่วงข้อมูลที่เว็บร้องขอ กดลองใหม่หรือใช้พรีวิว Google' + diagnostic);
          if (app.vidPlayer.onerror) app.vidPlayer.onerror();
          return true;
        }
        if (data.reason === 'streamFetchFailed') {
          rememberStreamBlocked();
          setVideoStatus('error', 'เชื่อมต่อแหล่งสตรีมไม่ได้ [FETCH] อาจเกิดจากเครือข่ายหรือการบล็อกคำขอ หากใช้ Brave ลองปิด Shields เฉพาะเว็บนี้ชั่วคราวแล้วรีเฟรชเพื่อทดสอบ');
          if (app.vidPlayer.onerror) app.vidPlayer.onerror();
          return true;
        }
        const category = app.classifyApiError(data.status, data.reason, !!app.accessToken);
        const messages = {session:'เซสชันหมดอายุ กดเชื่อมต่อ Google ใหม่',signedout:'กรุณาเชื่อมต่อ Google เพื่อเล่นไฟล์นี้',permission:'บัญชีนี้อาจไม่มีสิทธิ์ดาวน์โหลดไฟล์ เปิดใน Drive เพื่อตรวจสอบ',quota:'Google จำกัดการใช้งานชั่วคราว กรุณาลองภายหลัง',server:'Google Drive ขัดข้องชั่วคราว',notfound:'ไม่พบไฟล์หรือบัญชีนี้เข้าถึงไม่ได้'};
        setVideoStatus('error', messages[category] || 'เชื่อมต่อวิดีโอไม่สำเร็จ กรุณาลองใหม่');
        // The response already confirms this route cannot play; do not wait for the media timeout.
        if (['session', 'signedout', 'permission', 'quota', 'notfound'].includes(category) && app.vidPlayer.onerror) app.vidPlayer.onerror();
        return true;
      }

      function cancelVideoAttempt() {
        ++videoAttempt;
        failedVideoAttempt = null;
        if (videoAttemptTimer !== null) app.clearTimeout(videoAttemptTimer);
        videoAttemptTimer = null;
        if (videoSlowTimer !== null) app.clearTimeout(videoSlowTimer);
        videoSlowTimer = null;
        const slowActions = app.document.getElementById ? app.document.getElementById('vidSlowActions') : null;
        if (slowActions) slowActions.style.display = 'none';
        app.vidPlayer.onerror = null;
        app.vidPlayer.oncanplay = null;
        app.vidPlayer.onloadedmetadata = null;
      }

      function resetMediaPlayback() {
        previewAspect = null;
        saveVideoPos();
        cancelVideoBlobTransfer();
        const slowActions = app.document.getElementById ? app.document.getElementById('vidSlowActions') : null;
        if (slowActions) slowActions.style.display = 'none';
        ++mediaSession;
        cancelVideoAttempt();
        releasePlayerOrientation();
        app.vidPlayer.playerAspect = null;
        app.vidPlayer.playbackRoute = null;
        app.vidPlayer.pause();
        app.vidPlayer.removeAttribute("src");
        app.vidPlayer.removeAttribute('poster');
        app.vidPlayer.load();
        app.vidPlayer.style.display = "none";
        app.vidFrame.src = "about:blank";
        app.vidFrame.style.display = "none";
        app.vidFrame.removeAttribute('data-video-preview');
        if (app.vidFrame.parentElement) {
          app.vidFrame.parentElement.style.aspectRatio = '';
          if (typeof app.vidFrame.parentElement.removeAttribute === 'function') app.vidFrame.parentElement.removeAttribute('data-orientation');
        }
        const aspectBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidAspectToggle') : null;
        if (aspectBtn) aspectBtn.textContent = '⇅';
        app.vidLoading.classList.remove("show");
        app.resetPdfViewer();
      }

      function cachedVideoThumb(id) {
        if (typeof app.mediaThumbs !== 'undefined' && app.mediaThumbs && app.mediaThumbs[id]) return app.mediaThumbs[id];
        try { const stored = app.lsGet('gdv_thumb_' + id); if (stored) return stored; } catch (_) {}
        const meta = typeof app.fileMetaOf === 'function' ? app.fileMetaOf(id) : null;
        return meta && meta.thumbnailLink ? meta.thumbnailLink : null;
      }

      function openVideo(id, name) {
        resetVideoTrace();
        streamWorkerEpoch++;
        traceVideoEvent('open', id + (name ? ' · ' + name : ''));
        hideNextUp();
        if (app.lightbox.classList.contains("show")) app.closeLightbox();
        if (!app.videoModal.classList.contains("show")) mediaPreviousOverflow = app.document.body.style.overflow;
        if (app.videoModal && app.videoModal.classList && app.videoModal.classList.remove) app.videoModal.classList.remove('minimized');
        const minBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidMinimize') : null;
        if (minBtn) {
          minBtn.textContent = '🗗';
          if (typeof minBtn.setAttribute === 'function') {
            minBtn.setAttribute('aria-label', 'ย่อเครื่องเล่นไว้มุมจอ');
            minBtn.setAttribute('title', 'ย่อไว้มุมจอเพื่อเปิดดูหน้าเว็บต่อระหว่างดาวน์โหลดหรือเล่นวิดีโอ');
          }
        }
        resetMediaPlayback();

                    vidCurrentId = id;

                    // reset index ให้ตรงกับวิดีโอที่เปิด (กัน nav ผิด)

                    app.currentMediaIndex = -1;

                    app.currentMediaKind = "video";

                    app.vidTitle.textContent = name || "วิดีโอ";

              app.vidOpenTab.href = "https://drive.google.com/file/d/" + id + "/view";

              app.vidPlayer.style.display = "none";

              app.vidFrame.style.display = "none";

              app.vidFrame.src = "about:blank";

              app.revokeCurrentDoc();
        app.document.body.style.overflow = "";

              app.vidProgressBar.style.width = "0%";

              setVideoStatus("connecting", "กำลังเตรียมวิดีโอ…");

              // โชว์เฟรมแรกจาก thumbnail ทันทีที่รู้จัก ระหว่างรอสตรีมจริง (กันจอดำ)
              const openThumb = cachedVideoThumb(id);
              if (openThumb) app.vidPlayer.poster = openThumb;
              else app.vidPlayer.removeAttribute('poster');

              app.videoModal.classList.add("show");
              app.document.body.style.overflow = "hidden";

              app.videoModal.setAttribute("aria-hidden", "false");

              // เรียกคืนตำแหน่งที่เคยดูค้างไว้ (ถ้ามี)

              const historyItem = loadContinueWatching().find(item => item.id === id);
              const saved = historyItem ? historyItem.position : app.lsGet("gdv_vpos_" + id);

              videoResumePos = saved ? Number(saved) : 0;



              // สตรีมตรงก่อนเสมอ (เริ่มเล่นทันที + เลื่อนช่วงได้) — ไม่ได้ค่อย fallback ตามโหมด auth

              startVideoPlayback(id);

            }

      function streamBlocked() {
        try { return sessionStorage.getItem('gdfvStreamBlocked') === '1'; } catch (_) { return false; }
      }

      function rememberStreamBlocked() {
        try { sessionStorage.setItem('gdfvStreamBlocked', '1'); } catch (_) {}
      }

      function clearStreamBlocked() {
        try { sessionStorage.removeItem('gdfvStreamBlocked'); } catch (_) {}
      }

      function streamBlockVerdict(status) {
        // 200/206 confirms HTTP access only, not successful media decoding.
        // 401/403/404/429 = Google ตอบกลับเรื่องสิทธิ์/โควตา — ไม่ใช่เบราว์เซอร์บล็อก
        // Other responses indicate transport failure; its cause is not proven.
        if (status === 200 || status === 206) return 'works';
        if (status === 401 || status === 403 || status === 404 || status === 429) return 'auth';
        return 'browser';
      }

      function shouldRememberStreamBlock(verdict) {
        // Failure is per file or request; never disable playback for the session.
        return false; // A file failure or transient response must not disable other files.
      }

      function deviceCodecSupport() {
        // Browser-advertised support does not identify the codec of this file.
        try {
          const probe = app.document.createElement('video');
          return [['H.264', 'video/mp4; codecs="avc1.42E01E"'], ['HEVC', 'video/mp4; codecs="hvc1.1.6.L93.B0"'], ['AV1', 'video/mp4; codecs="av01.0.05M.08"'], ['VP9', 'video/webm; codecs="vp9"']]
            .map(function (pair) { return { label: pair[0], ok: !!probe.canPlayType(pair[1]) }; });
        } catch (_) { return null; }
      }

      function describeCodecSupport(support) {
        if (!support || !support.length) return '';
        return ' เบราว์เซอร์ระบุว่ารองรับ: ' + support.map(function (s) { return s.label + (s.ok ? ' ✓' : ' ✗'); }).join(' ');
      }

      function readMp4CodecInfo(bytes) {
        // Best-effort read of the first video sample entry in a bounded MP4
        // prefix. Returns null while the needed boxes are incomplete, else
        // {playable, label} for the first recognized codec entry.
        if (!bytes || bytes.length < 16) return null;
        const u32 = off => ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;
        const typeAt = off => String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        const containers = ['moov', 'trak', 'mdia', 'minf', 'stbl'];
        const stsdBoxes = [];
        function collect(start, end, depth) {
          let off = start;
          while (off + 8 <= end) {
            const size = u32(off);
            if (size < 8 || off + size > end) return;
            const type = typeAt(off);
            if (type === 'stsd') { stsdBoxes.push([off + 8, off + size]); }
            else if (depth > 0 && containers.indexOf(type) !== -1) { collect(off + 8, off + size, depth - 1); }
            off += size;
          }
        }
        collect(0, bytes.length, 6);
        // If a tail range starts inside mdat before moov, scan for the moov box header.
        if (!stsdBoxes.length) {
          for (let i = 0; i + 8 <= bytes.length; i++) {
            if (bytes[i + 4] === 109 && bytes[i + 5] === 111 && bytes[i + 6] === 111 && bytes[i + 7] === 118) {
              const size = u32(i);
              if (size >= 8 && i + size <= bytes.length) {
                collect(i + 8, i + size, 5);
                if (stsdBoxes.length) break;
              }
            }
          }
        }
        if (!stsdBoxes.length) return null;
        const profiles = {66: 'Baseline', 77: 'Main', 88: 'Extended', 100: 'High', 110: 'High 10 (Hi10P)', 122: 'High 4:2:2', 244: 'High 4:4:4'};
        let fallback = null;
        for (const [stsdBody, stsdEnd] of stsdBoxes) {
          if (stsdBody + 16 > stsdEnd || !u32(stsdBody + 4)) return null;
          const entry = stsdBody + 8, entryEnd = entry + u32(entry);
          if (entryEnd > bytes.length) return null;
          const format = typeAt(entry);
          if (format === 'avc1' || format === 'avc3' || format === 'encv') {
            // 8-byte header + 6 reserved + 2 data refs + 70 visual fields = +86
            if (entryEnd < entry + 94) return null;
            let avcC = null;
            let off = entry + 86;
            while (off + 8 <= entryEnd) {
              const size = u32(off);
              if (size < 8 || off + size > entryEnd) break;
              if (typeAt(off) === 'avcC') { avcC = [off + 8, off + size]; break; }
              off += size;
            }
            if (!avcC || avcC[0] + 4 > avcC[1]) return null;
            const profile = bytes[avcC[0] + 1];
            return {playable: [66, 77, 88, 100].indexOf(profile) !== -1, label: 'H.264 โปรไฟล์ ' + (profiles[profile] || ('รหัส ' + profile))};
          }
          if (!fallback) fallback = {playable: true, label: format === 'hvc1' || format === 'hev1' ? 'HEVC' : format === 'vp09' ? 'VP9' : format === 'av01' ? 'AV1' : 'รูปแบบ ' + format};
        }
        return fallback;
      }

      function probeStreamEndpoint(id, attempt) {
        // Inspect a bounded prefix; a container signature does not prove decoding.
        // The read walks far enough into moov to identify the codec profile and
        // then cancels the rest, so the probe never buffers a whole video.
        return new Promise(function (resolve) {
          let settled = false, timer = null, reader = null;
          const controller = typeof AbortController === 'function' ? new AbortController() : null;
          const done = function (verdict) {
            if (settled) return;
            settled = true;
            if (timer !== null) app.clearTimeout(timer);
            if (reader) { const active = reader; reader = null; Promise.resolve(active.cancel()).catch(function () {}).then(function () { if (active.releaseLock) active.releaseLock(); }); }
            if (controller) controller.abort();
            resolve(verdict);
          };
          timer = app.setTimeout(function () { done('browser'); }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.probeMs : 8000));
          try {
            const url = new URL('__drive_stream', app.location.href);
            url.searchParams.set('id', id);
            url.searchParams.set('attempt', String(attempt));
            app.fetch(url.href, { headers: { Range: 'bytes=0-1048575' }, signal: controller ? controller.signal : undefined })
              .then(async function (res) {
                if (settled) { if (res.body) await res.body.cancel(); return; }
                const verdict = streamBlockVerdict(res.status);
                if (verdict !== 'works') { if (res.body) await res.body.cancel(); done(verdict); return; }
                if (!res.body || typeof res.body.getReader !== 'function') { done('unknown'); return; }
                reader = res.body.getReader();
                const cap = 1048576;
                let head = new Uint8Array(0), length = 0, mp4 = false;
                while (!settled && length < cap) {
                  const chunk = await reader.read();
                  if (settled) return;
                  if (chunk.done) break;
                  const grown = new Uint8Array(length + chunk.value.byteLength);
                  grown.set(head); grown.set(chunk.value, length);
                  head = grown; length = head.length;
                  if (!mp4 && length >= 12) mp4 = head[4] === 102 && head[5] === 116 && head[6] === 121 && head[7] === 112;
                  if (mp4) {
                    const info = readMp4CodecInfo(head);
                    if (info) { done(info.playable ? 'works' : 'codec:' + info.label); return; }
                  }
                }
                if (mp4 && !settled && res.headers && typeof res.headers.get === 'function') {
                  const cr = (res.headers.get('Content-Range') || '').match(/^bytes \d+-(\d+)\/(\d+)$/i);
                  const endByte = cr ? Number(cr[1]) : 0, totalBytes = cr ? Number(cr[2]) : 0;
                  if (Number.isFinite(totalBytes) && totalBytes > endByte + 1) {
                    const tailStart = Math.max(endByte + 1, totalBytes - cap);
                    try {
                      const tailRes = await app.fetch(url.href, { headers: { Range: 'bytes=' + tailStart + '-' + (totalBytes - 1) }, signal: controller ? controller.signal : undefined });
                      if (!settled && tailRes && (tailRes.status === 206 || tailRes.status === 200) && tailRes.body && typeof tailRes.body.getReader === 'function') {
                        reader = tailRes.body.getReader();
                        let tail = new Uint8Array(0), tailLen = 0;
                        while (!settled && tailLen < cap) {
                          const part = await reader.read();
                          if (settled || part.done) break;
                          const next = new Uint8Array(tailLen + part.value.byteLength);
                          next.set(tail); next.set(part.value, tailLen);
                          tail = next; tailLen = tail.length;
                          const info = readMp4CodecInfo(tail);
                          if (info) { done(info.playable ? 'works' : 'codec:' + info.label); return; }
                        }
                      } else if (tailRes && tailRes.body && tailRes.body.cancel) {
                        await tailRes.body.cancel();
                      }
                    } catch (_) {}
                  }
                }
                const webm = length >= 4 && head[0] === 26 && head[1] === 69 && head[2] === 223 && head[3] === 163;
                const text = Array.from(head.subarray(0, Math.min(length, 16))).map(function (x) { return String.fromCharCode(x); }).join('').trim();
                done(mp4 || webm ? 'works' : /^[<{\[]/.test(text) ? 'invalid' : 'unknown');
              })
              .catch(function () { done(reader ? 'unknown' : 'browser'); });
          } catch (_) { done('browser'); }
        });
      }

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
        if (app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
        const bounds = app.vidFrame.parentElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const layout = calculatePreviewLayout(bounds.width, bounds.height, previewAspect && previewAspect.value);
        app.vidFrame.style.setProperty('--preview-width', layout.width + 'px');
        app.vidFrame.style.setProperty('--preview-height', layout.height + 'px');
        app.vidFrame.style.setProperty('--preview-scale', String(layout.scale));
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
          list.push({ id: id, aspect: val, at: app.Date.now() });
          app.lsSet('gdv_video_aspects', JSON.stringify(list.slice(-100)));
        } catch (_) {}
      }

      function applyPreviewAspect(id) {
        // ปรับกรอบพรีวิวให้ตรงสัดส่วนวิดีโอจริง ไม่ล็อก 16:9 (วิดีโอแนวตั้งจะได้กรอบสูง ไม่เป็นแถบเล็ก ๆ กลางจอ)
        const ratioEl = app.vidFrame.parentElement;
        if (!ratioEl) return;
        if (previewAspect && previewAspect.id === id) { applyVideoAspect(); return; }
        ratioEl.style.aspectRatio = '';
        if (typeof ratioEl.removeAttribute === 'function') ratioEl.removeAttribute('data-orientation');
        const cached = typeof app.fileMetaOf === 'function' ? app.fileMetaOf(id) : null;
        const cw = cached && cached.videoMediaMetadata && Number(cached.videoMediaMetadata.width);
        const ch = cached && cached.videoMediaMetadata && Number(cached.videoMediaMetadata.height);
        if (cw > 0 && ch > 0) {
          const val = clampPreviewAspect(cw, ch);
          previewAspect = { id: id, value: val };
          if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(id, val);
          applyVideoAspect();
          return;
        }
        const remembered = typeof loadCachedVideoAspect === 'function' ? loadCachedVideoAspect(id) : null;
        if (remembered) {
          previewAspect = { id: id, value: remembered };
          applyVideoAspect();
          return;
        }
        const session = mediaSession;
        const probeThumb = function (thumbUrl) {
          if (typeof app.Image !== 'function') { fitVideoPreview(); return; }
          const img = new app.Image();
          img.onload = function () {
            if (session !== mediaSession || id !== vidCurrentId || !app.videoModal.classList.contains('show') || app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
            const tw = Number(img.naturalWidth || img.width), th = Number(img.naturalHeight || img.height);
            if (tw > 0 && th > 0) {
              const val = clampPreviewAspect(tw, th);
              previewAspect = { id: id, value: val };
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
        const auth = app.authParams();
        if (auth.mode === 'none') { probeThumb(); return; }
        const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=size,videoMediaMetadata(width,height),thumbnailLink' + (auth.mode === 'key' ? '&key=' + app.apiKey : '');
        const headers = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + app.accessToken } : {};
        app.fetch(url, { headers: headers })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (meta) {
            if (meta && Number(meta.size) > 0 && cached && !(Number(cached.size) > 0)) cached.size = Number(meta.size);
            if (meta && meta.thumbnailLink) {
              if (typeof app.mediaThumbs !== 'undefined' && app.mediaThumbs) app.mediaThumbs[id] = meta.thumbnailLink;
              try { localStorage.setItem("gdv_thumb_" + id, meta.thumbnailLink); } catch (_) {}
            }
            if (session !== mediaSession || id !== vidCurrentId || !app.videoModal.classList.contains('show') || app.vidFrame.getAttribute('data-video-preview') !== 'true') return;
            const w = meta && meta.videoMediaMetadata && Number(meta.videoMediaMetadata.width);
            const h = meta && meta.videoMediaMetadata && Number(meta.videoMediaMetadata.height);
            if (!w || !h) { probeThumb(meta && meta.thumbnailLink); return; }
            const val = clampPreviewAspect(w, h);
            previewAspect = { id: id, value: val };
            if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(id, val);
            applyVideoAspect();
          })
          .catch(function () { probeThumb(); });
      }

      function configurePreviewFullscreen() {
        const mobile = app.window.matchMedia && app.window.matchMedia('(max-width: 680px)').matches;
        // Use the app wrapper on mobile instead of the embedded player's fullscreen path.
        app.vidFrame.setAttribute('allow', mobile ? "autoplay; encrypted-media; fullscreen 'none'" : 'autoplay; encrypted-media; fullscreen');
        if (mobile) app.vidFrame.removeAttribute('allowfullscreen');
        else app.vidFrame.setAttribute('allowfullscreen', '');
      }

      function lockHorizontalPlayerOrientation(box) {
        const orientation = app.window.screen && app.window.screen.orientation;
        const aspect = getPlayerAspect();
        if (app.document.fullscreenElement !== box || !(aspect > 1)) { releasePlayerOrientation(); return Promise.resolve(); }
        if (!orientation || !orientation.lock || box.playerOrientationLocked || box.playerOrientationPending) return Promise.resolve();
        const request = box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        box.playerOrientationPending = true;
        try {
          return Promise.resolve(orientation.lock('landscape')).then(function () {
            if (request === box.playerOrientationRequest && app.document.fullscreenElement === box && getPlayerAspect() > 1) {
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
        return app.vidFrame.getAttribute('data-video-preview') === 'true'
          ? previewAspect && previewAspect.value
          : app.vidPlayer.playerAspect;
      }

      function releasePlayerOrientation() {
        const box = app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
        if (!box) return;
        box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        const held = box.playerOrientationLocked || box.playerOrientationPending;
        box.playerOrientationLocked = false;
        box.playerOrientationPending = false;
        try { if (held && app.window.screen && app.window.screen.orientation && app.window.screen.orientation.unlock) app.window.screen.orientation.unlock(); } catch (_) {}
      }

      function applyVideoAspect() {
        const ratioEl = app.vidFrame.parentElement;
        if (!ratioEl) return;
        const box = app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
        const aspect = getPlayerAspect();
        const isFullscreen = !!(box && (app.document.fullscreenElement === box || (box.classList && box.classList.contains('pseudo-fullscreen'))));
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
        const aspectBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidAspectToggle') : null;
        if (aspectBtn) {
          aspectBtn.textContent = aspect ? (aspect < 1 ? '↕' : '↔') : '⇅';
          if (typeof aspectBtn.setAttribute === 'function') {
            aspectBtn.setAttribute('title', aspect ? (aspect < 1 ? 'กำลังแสดงแนวตั้ง (คลิกเพื่อสลับเป็นแนวนอน 16:9)' : 'กำลังแสดงแนวนอน (คลิกเพื่อสลับเป็นแนวตั้ง 9:16)') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
            aspectBtn.setAttribute('aria-label', aspect ? (aspect < 1 ? 'สลับเป็นแนวนอน' : 'สลับเป็นแนวตั้ง') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
          }
        }
        fitVideoPreview();
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fitVideoPreview);
        if (box && app.videoModal.classList.contains('show')) lockHorizontalPlayerOrientation(box);
      }

      function togglePreviewAspect() {
        if (!app.videoModal.classList.contains('show') || !vidCurrentId) return null;
        const current = getPlayerAspect();
        const next = current && current < 1 ? 16 / 9 : 9 / 16;
        previewAspect = { id: vidCurrentId, value: next };
        app.vidPlayer.playerAspect = next;
        if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(vidCurrentId, next);
        applyVideoAspect();
        return next;
      }

      function openInExternalPlayer(id) {
        const targetId = id || vidCurrentId;
        if (!targetId) return null;
        const streamUrl = WORKER_URL + '?id=' + encodeURIComponent(targetId) + '&continuous=1';
        const vlcUrl = 'vlc://' + streamUrl;
        if (typeof app.navigator !== 'undefined' && app.navigator.clipboard && typeof app.navigator.clipboard.writeText === 'function') {
          Promise.resolve(app.navigator.clipboard.writeText(streamUrl)).catch(function () {});
        }
        if (typeof app.showToast === 'function') {
          app.showToast('กำลังส่งสตรีมเข้าแอป VLC… (คัดลอกลิงก์สตรีมให้แล้วหากต้องการวางในแอปอื่น)');
        }
        try {
          if (typeof app.document !== 'undefined' && app.document.createElement) {
            const a = app.document.createElement('a');
            a.href = vlcUrl;
            a.rel = 'noopener';
            if (typeof a.click === 'function') a.click();
          } else if (typeof app.window !== 'undefined' && app.window.location) {
            app.window.location.href = vlcUrl;
          }
        } catch (_) {}
        return vlcUrl;
      }

      function copyVideoToMyDrive(id) {
        const targetId = id || vidCurrentId;
        if (!targetId) return Promise.resolve(null);
        const session = mediaSession;
        const runCopy = function (token) {
          if (!token) {
            if (typeof app.showToast === 'function') app.showToast('กรุณาเชื่อมต่อบัญชี Google ก่อนทำสำเนาเข้า Drive ของคุณ');
            return Promise.resolve(null);
          }
          if (typeof app.showToast === 'function') app.showToast('กำลังทำสำเนาไฟล์เข้า Google Drive ของคุณ…');
          const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(targetId) + '/copy?supportsAllDrives=true&fields=id,name,mimeType,size,videoMediaMetadata(width,height)';
          return app.fetch(url, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          }).then(function (res) {
            if (!res || !res.ok) throw new Error('copy-failed-' + (res ? res.status : 0));
            return res.json();
          }).then(function (copied) {
            if (!copied || !copied.id) throw new Error('copy-invalid');
            if (session !== mediaSession || !app.videoModal.classList.contains('show')) return copied;
            if (typeof app.showToast === 'function') app.showToast('ทำสำเนาเข้า Drive สำเร็จ กำลังเปิดเล่นไฟล์สำเนา…');
            try {
              const titleText = copied.name || (typeof app.vidTitle !== 'undefined' && app.vidTitle && app.vidTitle.textContent) || 'วิดีโอ (สำเนา)';
              if (typeof app !== 'undefined' && app && typeof app.openVideo === 'function') app.openVideo(copied.id, titleText);
              else openVideo(copied.id, titleText);
            } catch (_) {}
            return copied;
          }).catch(function () {
            if (typeof app.showToast === 'function') app.showToast('ทำสำเนาเข้า Drive ไม่สำเร็จ (ตรวจสอบพื้นที่ Drive หรือสิทธิ์บัญชี)');
            return null;
          });
        };
        if (app.accessToken) return runCopy(app.accessToken);
        if (typeof app.ensureToken === 'function') {
          return Promise.resolve(app.ensureToken(true)).then(runCopy).catch(function () { return runCopy(null); });
        }
        return runCopy(null);
      }

      function applyNativeVideoAspect() {
        if (!app.videoModal.classList.contains('show') || app.vidFrame.getAttribute('data-video-preview') === 'true' || app.vidPlayer.style.display === 'none') return;
        const aspect = Number(app.vidPlayer.videoWidth) / Number(app.vidPlayer.videoHeight);
        if (!Number.isFinite(aspect) || aspect <= 0) return;
        app.vidPlayer.playerAspect = aspect;
        if (vidCurrentId && typeof saveCachedVideoAspect === 'function' && typeof clampPreviewAspect === 'function') {
          saveCachedVideoAspect(vidCurrentId, clampPreviewAspect(app.vidPlayer.videoWidth, app.vidPlayer.videoHeight));
        }
        applyVideoAspect();
      }

      function togglePlayerFullscreen() {
        if (!app.videoModal.classList.contains('show')) return Promise.resolve();
        const box = app.videoModal.querySelector('.video-box');
        if (!box) return Promise.resolve();
        const failed = function () { app.showToast('เปิดเต็มจอไม่ได้ ลองเปิดในแท็บใหม่'); };
        try {
          if (app.document.fullscreenElement === box || (app.document.webkitFullscreenElement && app.document.webkitFullscreenElement === box)) {
            const exit = app.document.exitFullscreen || app.document.webkitExitFullscreen;
            if (exit) return Promise.resolve(exit.call(app.document)).catch(failed);
          }
          if (box.classList && box.classList.contains && box.classList.contains('pseudo-fullscreen')) {
            box.classList.remove('pseudo-fullscreen');
            const btn = app.document.getElementById ? app.document.getElementById('vidFullscreen') : null;
            if (btn) { btn.textContent = '⛶'; btn.setAttribute('aria-pressed', 'false'); }
            applyVideoAspect();
            if (typeof fitVideoPreview === 'function') fitVideoPreview();
            return Promise.resolve();
          }
          const req = box.requestFullscreen || box.webkitRequestFullscreen;
          if (req) {
            return Promise.resolve(req.call(box)).then(function () {
              return lockHorizontalPlayerOrientation(box);
            }).catch(function () {
              if (box.classList && box.classList.add) box.classList.add('pseudo-fullscreen');
              const btn = app.document.getElementById ? app.document.getElementById('vidFullscreen') : null;
              if (btn) { btn.textContent = '⤡'; btn.setAttribute('aria-pressed', 'true'); }
              applyVideoAspect();
              if (typeof fitVideoPreview === 'function') fitVideoPreview();
              failed();
            });
          }
          if (box.classList && box.classList.add) box.classList.add('pseudo-fullscreen');
          const btn = app.document.getElementById ? app.document.getElementById('vidFullscreen') : null;
          if (btn) { btn.textContent = '⤡'; btn.setAttribute('aria-pressed', 'true'); }
          applyVideoAspect();
          if (typeof fitVideoPreview === 'function') fitVideoPreview();
          return Promise.resolve();
        } catch (_) { failed(); return Promise.resolve(); }
      }

      function isVideoMinimized() {
        return !!(app.videoModal && app.videoModal.classList && app.videoModal.classList.contains('minimized'));
      }

      function minimizeVideo() {
        if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show')) return false;
        if (typeof app.document !== 'undefined') {
          if (app.document.fullscreenElement && app.videoModal.contains && app.videoModal.contains(app.document.fullscreenElement) && app.document.exitFullscreen) {
            Promise.resolve(app.document.exitFullscreen()).catch(function () {});
          }
          const box = app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
          if (box && box.classList && box.classList.remove) box.classList.remove('pseudo-fullscreen');
          const fsBtn = app.document.getElementById ? app.document.getElementById('vidFullscreen') : null;
          if (fsBtn) { fsBtn.textContent = '⛶'; fsBtn.setAttribute('aria-pressed', 'false'); }
          const minBtn = app.document.getElementById ? app.document.getElementById('vidMinimize') : null;
          if (minBtn) {
            minBtn.textContent = '⤢';
            if (typeof minBtn.setAttribute === 'function') {
              minBtn.setAttribute('aria-label', 'ขยายเครื่องเล่นกลับขนาดเต็ม');
              minBtn.setAttribute('title', 'คลิกเพื่อขยายเครื่องเล่นกลับเป็นขนาดปกติ');
            }
          }
          if (app.document.body && app.document.body.style) {
            app.document.body.style.overflow = (typeof app.lightbox !== 'undefined' && app.lightbox && app.lightbox.classList && app.lightbox.classList.contains("show")) ? "hidden" : (typeof mediaPreviousOverflow !== 'undefined' ? mediaPreviousOverflow : "");
          }
        }
        app.videoModal.classList.add('minimized');
        if (typeof app.showToast === 'function') {
          app.showToast('ย่อเครื่องเล่นไว้มุมจอแล้ว (แตะที่หน้าต่างมุมจอเพื่อขยายกลับ)');
        }
        return true;
      }

      function restoreVideo() {
        if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('minimized')) return false;
        app.videoModal.classList.remove('minimized');
        if (typeof app.document !== 'undefined') {
          if (app.document.body && app.document.body.style) app.document.body.style.overflow = "hidden";
          const minBtn = app.document.getElementById ? app.document.getElementById('vidMinimize') : null;
          if (minBtn) {
            minBtn.textContent = '🗗';
            if (typeof minBtn.setAttribute === 'function') {
              minBtn.setAttribute('aria-label', 'ย่อเครื่องเล่นไว้มุมจอ');
              minBtn.setAttribute('title', 'ย่อไว้มุมจอเพื่อเปิดดูหน้าเว็บต่อระหว่างดาวน์โหลดหรือเล่นวิดีโอ');
            }
          }
        }
        applyVideoAspect();
        if (typeof fitVideoPreview === 'function') {
          try { requestAnimationFrame(fitVideoPreview); } catch (_) { fitVideoPreview(); }
        }
        return true;
      }

      function toggleMinimizeVideo() {
        return isVideoMinimized() ? restoreVideo() : minimizeVideo();
      }

      function isDownloadTurboEnabled() {
        try {
          const v = typeof app.lsGet === 'function' ? app.lsGet('gdv_download_turbo') : null;
          return v === null ? true : (v === 'true' || v === '1');
        } catch (_) { return true; }
      }

      function updateTurboUI() {
        if (typeof app.document === 'undefined' || !app.document.getElementById) return;
        const turbo = isDownloadTurboEnabled();
        const btn = app.document.getElementById('vidTurboBlob');
        if (btn) {
          btn.textContent = turbo ? '⚡ สปีดสูงสุด (8 ท่อ)' : 'สปีดปกติ (4 ท่อ)';
          if (typeof btn.setAttribute === 'function') {
            btn.setAttribute('aria-pressed', turbo ? 'true' : 'false');
            btn.setAttribute('title', turbo ? 'โหมดสปีดสูงสุด (8 ท่อขนานเต็มสูบ) — คลิกเพื่อสลับเป็น 4 ท่อ' : 'โหมดสปีดปกติ (4 ท่อขนาน) — คลิกเพื่อเร่งเป็นสปีดสูงสุด 8 ท่อ');
          }
        }
      }

      function setDownloadTurboEnabled(enabled) {
        try {
          if (typeof app.lsSet === 'function') app.lsSet('gdv_download_turbo', enabled ? 'true' : 'false');
        } catch (_) {}
        updateTurboUI();
      }

      function toggleDownloadTurbo() {
        const next = !isDownloadTurboEnabled();
        setDownloadTurboEnabled(next);
        if (typeof app.showToast === 'function') {
          app.showToast(next ? '⚡ เปิดโหมดสปีดสูงสุดแล้ว (ดาวน์โหลด 6 ท่อขนานเต็มสูบ)' : 'สลับกลับโหมดดาวน์โหลดปกติ (4 ท่อ)');
        }
        return next;
      }

      function prepareStreamWorker() {
        if (!app.window.isSecureContext) { traceVideoEvent('sw', 'ข้าม: ไม่ใช่ secure context'); return Promise.resolve(false); }
        if (!('serviceWorker' in app.navigator)) { traceVideoEvent('sw', 'ข้าม: เบราว์เซอร์ไม่รองรับ Service Worker'); return Promise.resolve(false); }
        if (app.location.protocol === 'file:') { traceVideoEvent('sw', 'ข้าม: เปิดจาก file://'); return Promise.resolve(false); }
        if (!streamWorkerReady) {
          streamWorkerAttemptEpoch = ++streamWorkerEpoch;
          const attempt = new Promise(function (resolve) {
            const workers = app.navigator.serviceWorker;
            const script = new URL('drive-stream-sw.js', app.location.href).href;
            let done = false;
            let timer = 0;
            function finish(ok, reason) {
              if (done) return;
              done = true;
              app.clearTimeout(timer);
              workers.removeEventListener('controllerchange', check);
              if (streamWorkerAttemptEpoch === streamWorkerEpoch) traceVideoEvent('sw', ok ? 'พร้อม' : 'ลงทะเบียนไม่สำเร็จ' + (reason ? ': ' + reason : ''));
              resolve(ok);
            }
            function check() { if (workers.controller && workers.controller.scriptURL === script) finish(true); }
            // A later session reusing this in-flight attempt refreshes the
            // deadline, so it always gets its own full window.
            streamWorkerDeadlineRefresh = function () {
              app.clearTimeout(timer);
              timer = app.setTimeout(function () { finish(false, 'หมดเวลา'); }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.workerRegisterMs : 12000));
              streamWorkerAttemptEpoch = streamWorkerEpoch;
            };
            streamWorkerDeadlineRefresh();
            workers.addEventListener('controllerchange', check);
            workers.register(script, {scope: './', updateViaCache: 'none'}).then(check).catch(function (err) { finish(false, err && err.message ? err.message : (err && err.name) || 'ไม่ทราบสาเหตุ'); });
            check();
          });
          streamWorkerReady = attempt.then(function (ok) {
            // A stale epoch's late resolution must not clobber a newer attempt.
            if (streamWorkerReady === attempt && !ok) { streamWorkerReady = null; streamWorkerDeadlineRefresh = null; }
            return ok;
          });
        } else if (streamWorkerDeadlineRefresh) {
          streamWorkerDeadlineRefresh();
        }
        return streamWorkerReady;
      }

      function showStreamFailure(message, diagnostic) {
        const failedAttempt = typeof failedVideoAttempt === 'undefined' ? null : failedVideoAttempt;
        cancelVideoAttempt();
        failedVideoAttempt = failedAttempt;
        app.vidPlayer.pause();
        app.vidPlayer.removeAttribute('src');
        app.vidPlayer.load();
        app.vidPlayer.style.display = 'none';
        const status = app.document.getElementById('vidErrorStatus');
        // Preserve a more specific permission/quota error reported by the worker.
        const detail = typeof diagnostic === 'string' && /^M[0-4]\/N[0-3]\/R[0-4]$/.test(diagnostic) ? ' [' + diagnostic + ']' : '';
        setVideoStatus('error', (status && !status.hidden && status.textContent ? status.textContent : message) + detail);
      }

      function tryStreamDirect(id, usePreferred = true, skipPublic = false) {
        if (!app.accessToken) { tryPublicStream(id); return; }
        if (!skipPublic && typeof app.routeCooldown !== 'undefined' && app.routeCooldown && app.routeCooldown.blocked(id, 'signedin', 'bearer')) { traceVideoEvent('route', 'ข้าม bearer: เพิ่งล้ม (cooldown) → ลองสาธารณะก่อน'); tryPublicStream(id); return; }
        const preferred = usePreferred ? preferredPlaybackRoute(id) : null;
        // A remembered public route (including the Worker) plays without bearer setup first.
        if (['usercontent', 'key', 'worker'].includes(preferred) && (preferred !== 'key' || app.apiKey)) {
          traceVideoEvent('route', 'ข้าม bearer: จำเส้นทางเดิม (' + preferred + ') → ลองสาธารณะก่อน');
          tryPublicStream(id, function () { tryStreamDirect(id, false, true); }, false);
          return;
        }
        clearStreamBlocked();
        const session = mediaSession;
        const token = app.accessToken;
        prepareStreamWorker().then(function (ready) {
          if (session !== mediaSession || token !== app.accessToken || id !== vidCurrentId || !app.videoModal.classList.contains('show')) return;
          if (!ready || app.Date.now() >= app.tokenExpiry) {
            showStreamFailure(app.Date.now() >= app.tokenExpiry ? 'เซสชันหมดอายุ กดเชื่อมต่อ Google ใหม่' : 'เบราว์เซอร์นี้ยังใช้สตรีมบัญชีไม่ได้ กดลองเล่นใหม่ ใช้พรีวิว Google หรือกด "โหลดทั้งไฟล์แทน" ในเมนู ดูแบบอื่น');
            return;
          }
          revokeCurrentVideo();
          // CORS mode is required for service-worker partial media responses,
          // including this same-origin endpoint; configure it before src.
          app.vidPlayer.setAttribute('crossorigin', 'anonymous');
          app.vidPlayer.style.display = 'block';
          const url = new URL('__drive_stream', app.location.href);
          url.searchParams.set('id', id);
          tryVideoSrc(url, function (reason, diagnostic) {
            showStreamFailure(reason === 'timeout'
              ? 'วิดีโอใช้เวลาโหลดนานเกิน 1 นาที กดลองเล่นใหม่ ตรวจสอบเครือข่าย หรือเลือกใช้พรีวิว Google'
              : app.MEDIA_STREAM_FAIL_MSG, diagnostic);
            // พิสูจน์หลังล้มด้วยโพรบ (attempt ปลอม ไม่ให้ error ของโพรบทับการ์ด)
            // แล้วเปลี่ยนข้อความการ์ดเป็นสาเหตุจริง ถ้าการ์ดยังโชว์ข้อความทั่วไปอยู่
            if (reason === 'media') {
              const originalStatus = app.document.getElementById('vidErrorStatus').textContent;
              setVideoStatus('loading', 'กำลังลองแหล่งสำรองของ Google…');
              const finishFailure = function () {
                if (session !== mediaSession || token !== app.accessToken || !app.videoModal.classList.contains('show') || id !== vidCurrentId) return;
                  showStreamFailure(originalStatus);
                  const failedAttempt = videoAttempt;
                  probeStreamEndpoint(id, 'probe').then(function (verdict) {
                    if (session !== mediaSession || failedAttempt !== videoAttempt || !app.videoModal.classList.contains('show') || id !== vidCurrentId || videoStatus !== 'error') return;
                    const status = app.document.getElementById('vidErrorStatus');
                    if (!status || status.hidden || typeof status.textContent !== 'string' || status.textContent.indexOf(app.MEDIA_STREAM_FAIL_MSG) !== 0) return;
                    if (String(verdict).indexOf('codec:') === 0 && typeof app.fallbackIframe === 'function') {
                      const codecLabel = String(verdict).slice(6);
                      app.fallbackIframe(id);
                      setVideoStatus('preview', 'สลับมาใช้พรีวิว Google อัตโนมัติ (ไฟล์ใช้การเข้ารหัส ' + codecLabel + ' ซึ่งเบราว์เซอร์ถอดรหัสไม่ได้) · หากพรีวิวดูไม่ได้ กด “เปิดใน VLC / แอปนอก” ด้านล่าง');
                      return;
                    }
                    setVideoStatus('error', verdict === 'auth'
                      ? 'Google ปฏิเสธการดาวน์โหลดไฟล์นี้ (สิทธิ์หรือโควตา) — ใช้พรีวิว Google หรือเปิดใน Drive'
                      : String(verdict).indexOf('codec:') === 0
                        ? 'ไฟล์นี้ใช้การเข้ารหัส ' + String(verdict).slice(6) + ' ซึ่งเบราว์เซอร์นี้ถอดรหัสไม่ได้ — ใช้พรีวิว Google ดูคลิปนี้แทน'
                        : verdict === 'works'
                        ? 'ตรวจพบข้อมูลวิดีโอต้นฉบับ แต่เครื่องเล่นยังเล่นไม่ได้ ยังไม่ยืนยันว่าสาเหตุมาจากรูปแบบไฟล์หรือการรับส่งข้อมูล — ลองโหลดทั้งไฟล์หรือเปิดใน Drive' + describeCodecSupport(deviceCodecSupport())
                        : verdict === 'invalid'
                          ? 'แหล่งสตรีมส่งหน้าเว็บหรือข้อความแทนวิดีโอ — ลองใหม่หรือเปิดใน Drive'
                          : verdict === 'unknown'
                            ? 'ยังตรวจสอบข้อมูลวิดีโอไม่สำเร็จ ไม่สามารถยืนยันรูปแบบไฟล์ได้ — ลองใหม่หรือเปิดใน Drive'
                            : 'เชื่อมต่อสตรีมทดสอบไม่สำเร็จ อาจเป็นเครือข่ายหรือระบบสตรีม — ลองใหม่หรือเปิดใน Drive');
                  });
              };
              if (skipPublic) finishFailure();
              // Include the public Worker as a fallback: only the file ID reaches
              // Cloudflare, and this route plays when the file is publicly readable.
              else tryPublicStream(id, finishFailure, false);
            }
          }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.bearerMs : 60000), 'bearer');
        });
      }

      function probePublicStreamError(id) {
        if (!app.apiKey) return Promise.resolve(null);
        return new Promise(function (resolve) {
          const controller = new AbortController();
          let settled = false, reader = null;
          const done = function (message) {
            if (settled) return;
            settled = true; app.clearTimeout(timer);
            if (reader) { const active = reader; reader = null; Promise.resolve(active.cancel()).catch(function () {}); }
            controller.abort(); resolve(message);
          };
          const timer = app.setTimeout(function () { done(null); }, (typeof TIMEOUTS !== 'undefined' ? TIMEOUTS.probeMs : 8000));
          const url = new URL('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id));
          url.searchParams.set('alt', 'media'); url.searchParams.set('key', app.apiKey);
          app.fetch(url.href, { headers: { Range: 'bytes=0-1' }, signal: controller.signal })
            .then(async function (res) {
              if (settled || res.ok || !/application\/json/i.test(res.headers.get('Content-Type') || '')) {
                if (res.body) await res.body.cancel(); done(null); return;
              }
              reader = res.body.getReader();
              const bytes = new Uint8Array(8192); let length = 0;
              while (!settled && length < bytes.length) {
                const chunk = await reader.read();
                if (settled) return;
                if (chunk.done) break;
                const part = chunk.value.subarray(0, bytes.length - length);
                bytes.set(part, length); length += part.length;
              }
              const text = Array.from(bytes.subarray(0, length)).map(function (x) { return String.fromCharCode(x); }).join('');
              let reason = '';
              try { const data = JSON.parse(text); reason = data.error && data.error.errors && data.error.errors[0] && data.error.errors[0].reason || ''; } catch (_) {}
              done(reason === 'downloadQuotaExceeded'
                ? 'Google จำกัดการดาวน์โหลดไฟล์นี้ (downloadQuotaExceeded) จึงเริ่มสตรีมไม่ได้ในขณะนี้ — ลองใหม่ภายหลัง'
                : null);
            }).catch(function () { done(null); });
        });
      }

      // Pure ordering seam: keep source-priority rules independently testable
      // without extracting the orchestration closure into a synthetic VM.
      function prioritizePlaybackSource(sources, preferred) {
        const ordered = sources.slice();
        const first = ordered.findIndex(function (source) { return source.route === preferred; });
        if (first > 0) ordered.unshift(ordered.splice(first, 1)[0]);
        return ordered;
      }

      
      const runPublicStream = createPublicStreamRunner(app, runnerFallbacks);
      function tryPublicStream(id, onFail, googleOnly = false) {
        return runPublicStream(id, onFail, googleOnly);
      }

      function readVideoBlobResponse(res, signal, onProgress, onChunkData) {
        return (async function () {
          const aborted = function () { if (signal.aborted) { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; } };
          aborted();
          const length = Number(res.headers && res.headers.get('content-length'));
          const total = Number.isFinite(length) && length > 0 ? length : 0;
          const mimeType = (res.headers && res.headers.get('content-type')) || 'application/octet-stream';
          onProgress(0, total);
          if (!res.body || !res.body.getReader) {
            const blob = await res.blob(); aborted(); onProgress(Number(blob.size) || 0, total); return blob;
          }
          const reader = res.body.getReader(), chunks = [];
          const cancel = function () { Promise.resolve(reader.cancel()).catch(function () {}); };
          signal.addEventListener('abort', cancel, {once: true});
          let loaded = 0;
          try {
            while (true) {
              aborted();
              const part = await reader.read(); aborted();
              if (part.done) break;
              chunks.push(part.value); loaded += part.value.byteLength; onProgress(loaded, total);
              if (typeof onChunkData === 'function') {
                try { onChunkData(chunks, loaded, total, mimeType); } catch (_) {}
              }
            }
            return new Blob(chunks, {type: mimeType});
          } finally {
            signal.removeEventListener('abort', cancel);
            if (reader.releaseLock) reader.releaseLock();
          }
        })();
      }

      function readVideoBlobRanges(url, headers, size, signal, onProgress, onChunk, opts) {
        // โหลดไฟล์เต็มด้วยหลายคำขอช่วงพร้อมกัน (ค่าเริ่ม: 4 คำขอ × 8 MiB; ปรับได้ผ่าน opts {chunk, limit, retries, onChunkReady, priority})
        // ไม่ส่ง onChunk: ประกอบเป็น Blob ในแรมตามลำดับเดิม  |  ส่ง onChunk(index, start, blob):
        // ส่งต่อทุกช่วงให้ผู้เรียก (เช่น เขียนลงดิสก์) แล้วคืนค่า content-type แทน Blob
        // โยน AbortError เมื่อผู้ใช้ยกเลิก ส่วนความล้มเหลวอื่นให้ผู้เรียกตกกลับไปโหลดเชื่อมต่อเดียว
        const cfg = opts || {};
        const CHUNK = cfg.chunk || 8388608, LIMIT = cfg.limit || 4, RETRIES = cfg.retries || 2;
        const onChunkReady = typeof cfg.onChunkReady === 'function' ? cfg.onChunkReady : null;
        const chunks = Math.ceil(size / CHUNK);
        const parts = onChunk ? null : new Array(chunks);
        const loaded = new Array(chunks).fill(0);
        let type = '';
        let activeWorkers = 0;
        const progress = function () {
          let sum = 0;
          for (let i = 0; i < chunks; i++) sum += loaded[i];
          onProgress(Math.min(sum, size), size, activeWorkers);
        };
        // หน่วงก่อนรีไทร (สคริปต์ทดสอบไม่มี app.setTimeout จึงเดินต่อทันที)
        const pause = function (ms) {
          return new Promise(function (resolve) {
            if (typeof app.setTimeout === 'function') app.setTimeout(resolve, ms); else resolve();
          });
        };
        const fetchChunk = function (index, attempt) {
          const start = index * CHUNK;
          const end = Math.min(start + CHUNK, size) - 1;
          const fetchOpts = {headers: Object.assign({}, headers, {Range: 'bytes=' + start + '-' + end}), signal: signal};
          if (cfg.priority) fetchOpts.priority = cfg.priority;
          return app.fetch(url, fetchOpts).then(function (res) {
            if (res.status !== 206) {
              if (res.body) Promise.resolve(res.body.cancel()).catch(function () {});
              const error = new Error('range-status-' + res.status);
              // 403 คือโควตาดาวน์โหลดของ Google ที่แกว่งเองได้ — ลองซ้ำพร้อมหน่วง ไม่ใช่ความล้มถาวร
              if (res.status !== 403) error.permanent = true;
              error.quota = res.status === 403;
              throw error;
            }
            const actual = (res.headers.get('Content-Range') || '').match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
            // คำขอ same-origin (ผ่าน service worker) อ่าน Content-Range ได้ — ตรวจช่วงและขนาดรวมเต็มรูปแบบ
            // ส่วนคำขอข้าม origin ถูก CORS กรอง header นี้ทิ้ง จึงตรวจด้วยความยาวเนื้อหาจริงแทน (ช่วงสุดท้ายยืนยันขนาดไฟล์)
            if (actual && (Number(actual[1]) !== start || Number(actual[2]) !== end || Number(actual[3]) !== size)) {
              if (res.body) Promise.resolve(res.body.cancel()).catch(function () {});
              const error = new Error('upstream sent a wrong interval');
              error.permanent = true;
              throw error;
            }
            if (!type) type = res.headers.get('Content-Type') || '';
            return readVideoBlobResponse(res, signal, function (n) { loaded[index] = n; progress(); }).then(function (blob) {
              if (blob.size !== end - start + 1) {
                const error = new Error('chunk length mismatch');
                error.permanent = true;
                throw error;
              }
              return blob;
            });
          }).catch(function (err) {
            if ((err && err.name === 'AbortError') || signal.aborted || err.permanent || attempt >= RETRIES) throw err;
            return pause(err.quota ? 1200 * (attempt + 1) : 0).then(function () { return fetchChunk(index, attempt + 1); });
          });
        };
        let next = 0;
        const pendingWrites = [];
        let writeError = null;
        const worker = function () {
          if (writeError) return Promise.reject(writeError);
          if (next >= chunks) return Promise.resolve();
          const index = next++;
          const start = index * CHUNK;
          activeWorkers++;
          progress();
          return fetchChunk(index, 0).then(function (blob) {
            activeWorkers = Math.max(0, activeWorkers - 1);
            if (writeError) throw writeError;
            if (onChunkReady) {
              try { onChunkReady(index, start, blob, chunks, type || 'video/mp4'); } catch (_) {}
            }
            if (!onChunk) { parts[index] = blob; return worker(); }
            // Pipeline OPFS disk write concurrently while immediately starting the next network chunk app.fetch!
            const p = Promise.resolve().then(function () { return onChunk(index, start, blob); }).catch(function (err) {
              err.permanent = true;
              writeError = err;
              throw err;
            });
            pendingWrites.push(p);
            return worker();
          }).catch(function (err) {
            activeWorkers = Math.max(0, activeWorkers - 1);
            throw err;
          });
        };
        const pool = [];
        for (let i = 0; i < Math.min(LIMIT, chunks); i++) pool.push(worker());
        return Promise.all(pool).then(function () {
          return Promise.all(pendingWrites);
        }).then(function () {
          onProgress(size, size, 0);
          return onChunk ? type : new Blob(parts, {type: type || 'application/octet-stream'});
        });
      }

      function openVideoTempWriter() {
        // เตรียมไฟล์ชั่วคราวใน OPFS เพื่อเขียนช่วงข้อมูลลงดิสก์ระหว่างโหลด (createWritable ตัดเนื้อหาเดิมทิ้งทุกครั้ง)
        // จึงเหลือไฟล์ค้างสูงสุดไฟล์เดียวต่อเว็บ คืน null เมื่อเบราว์เซอร์ไม่รองรับ ผู้เรียกจะประกอบ Blob ในแรมแทน
        try {
          if (typeof app.navigator === 'undefined' || !app.navigator.storage || !app.navigator.storage.getDirectory) return Promise.resolve(null);
          return app.navigator.storage.getDirectory().then(function (dir) {
            return dir.getFileHandle('gdv-vblob.part', {create: true}).then(function (handle) {
              return handle.createWritable().then(function (writable) {
                return {
                  write: function (chunk, start) { return writable.write({type: 'write', position: start, data: chunk}); },
                  done: function () { return writable.close().then(function () { return handle.getFile(); }); },
                  stop: function () { try { return Promise.resolve(writable.abort()).catch(function () {}); } catch (_) { return Promise.resolve(); } }
                };
              });
            });
          }).catch(function () { return null; });
        } catch (_) { return Promise.resolve(null); }
      }

      function renderVideoBlobProgress(loaded, total, pipes) {
        const percent = total > 0 ? Math.min(100, Math.floor(loaded / total * 100)) : null;
        const elapsed = videoBlobTransfer ? (app.Date.now() - videoBlobTransfer.startedAt) / 1000 : 0;
        const speed = elapsed >= 1 && loaded > 0 ? loaded / elapsed : 0;
        const remaining = speed > 0 && total > loaded ? Math.ceil((total - loaded) / speed) : 0;
        const eta = remaining > 0 ? ' · เหลือประมาณ ' + (remaining < 60 ? remaining + ' วินาที' : Math.ceil(remaining / 60) + ' นาที') : '';
        const watching = !!(videoBlobTransfer && videoBlobTransfer.previewStarted);
        const prefix = watching ? 'กำลังเล่นระหว่างโหลดทั้งไฟล์: ' : 'กำลังโหลดทั้งไฟล์: ';
        const pipeText = pipes && pipes > 1 ? ' · ⚡ ' + pipes + ' ท่อขนาน' : '';
        const text = prefix + (app.formatSize(loaded) || '0 B') + (percent === null ? ' · ไม่ทราบขนาดรวม' : ' / ' + app.formatSize(total) + ' (' + percent + '%)') + (speed > 0 ? ' · ' + app.formatSize(speed) + '/s' : '') + pipeText + eta;
        const label = app.document.getElementById('vidLoadingText');
        const bar = app.document.getElementById('vidProgressBar');
        if (label) label.textContent = text;
        if (bar) bar.style.width = percent === null ? '0%' : percent + '%';
        if (watching) {
          const status = app.document.getElementById('vidErrorStatus');
          if (status) { status.textContent = text; status.hidden = false; }
        }
      }

      function cancelVideoBlobTransfer(showMessage) {
        const transfer = videoBlobTransfer;
        if (!transfer) return;
        videoBlobTransfer = null;
        transfer.controller.abort();
        if (transfer.previewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          try { URL.revokeObjectURL(transfer.previewUrl); } catch (_) {}
          transfer.previewUrl = null;
        }
        if (transfer.previewStarted && showMessage && typeof app.vidPlayer !== 'undefined' && app.vidPlayer) {
          try {
            app.vidPlayer.oncanplay = null;
            app.vidPlayer.onerror = null;
            app.vidPlayer.onended = null;
            app.vidPlayer.ontimeupdate = null;
            app.vidPlayer.pause();
            app.vidPlayer.removeAttribute('src');
            app.vidPlayer.load();
            app.vidPlayer.style.display = 'none';
          } catch (_) {}
        }
        const cancel = app.document.getElementById('vidCancelBlob');
        const minBlob = app.document.getElementById('vidMinimizeBlob');
        const turboBtn = app.document.getElementById('vidTurboBlob');
        const button = app.document.getElementById('vidBlob');
        if (cancel) cancel.hidden = true;
        if (minBlob) minBlob.hidden = true;
        if (turboBtn) turboBtn.hidden = true;
        if (button) button.disabled = false;
        if (showMessage) setVideoStatus('error', 'ยกเลิกการโหลดแล้ว เลือกลองใหม่หรือใช้พรีวิว Google');
      }

      function requestVideoBlob(id) {
        if (!id || id !== vidCurrentId || !app.videoModal.classList.contains('show')) return;
        const size = Number(app.fileMetaOf(id).size);
        if (!(size > 0) || size >= 256 * 1024 * 1024) {
          const detail = size > 0 ? 'ขนาด ' + app.formatSize(size) : 'ไม่ทราบขนาดไฟล์';
          if (!app.window.confirm('โหลดวิดีโอทั้งไฟล์ (' + detail + ') เพื่อเล่นในเว็บ? ระบบจะเริ่มเล่นทันทีที่ส่วนต้นพร้อม และโหลดส่วนที่เหลือต่อในพื้นหลัง (ใช้เน็ตตามขนาดไฟล์และพื้นที่จัดเก็บชั่วคราวบนเครื่อง สามารถยกเลิกระหว่างโหลดได้)')) return;
        }
        return loadVideoAsBlob(id);
      }

      
      const runVideoBlob = createVideoBlobRunner(app, runnerFallbacks);
      function loadVideoAsBlob(id, onGiveUp, priorNotes) {
        return runVideoBlob(id, onGiveUp, priorNotes);
      }

      
      const runVideoSource = createVideoSourceRunner(app, runnerFallbacks);
      function tryVideoSrc(url, onFail, timeoutMs = TIMEOUTS.genericMs, route = null) {
        return runVideoSource(url, onFail, timeoutMs, route);
      }

      function loadWatchedVideos() {
        try {
          const ids = JSON.parse(app.lsGet("gdv_watched") || "[]");
          return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === "string" && /^[\w-]+$/.test(id)))] : [];
        } catch (_) { return []; }
      }

      function toggleWatchedVideo(id) {
        const ids = loadWatchedVideos();
        const watched = !ids.includes(id);
        app.lsSet("gdv_watched", JSON.stringify(watched ? ids.concat(id) : ids.filter(x => x !== id)));
        return watched;
      }

      const warmedVideoIds = new Set();
      function warmVideoStream(id) {
        if (!id || warmedVideoIds.has(id)) return false;
        warmedVideoIds.add(id);
        if (typeof app.accessToken !== 'undefined' && app.accessToken && typeof prepareStreamWorker === 'function') {
          try { prepareStreamWorker(); } catch (_) {}
        }
        if (typeof app.fetch === 'function') {
          try {
            app.fetch(WORKER_URL + '?id=' + encodeURIComponent(id), { method: 'HEAD', mode: 'cors' })
              .then(function (res) {
                if (!res || !EXPECTED_WORKER_REV) return;
                const rev = res.headers && typeof res.headers.get === 'function' ? res.headers.get('x-gdv-worker-rev') : null;
                if (rev && rev !== EXPECTED_WORKER_REV && typeof console !== 'undefined' && console.warn) {
                  console.warn('[GDV] Worker revision mismatch: got ' + rev + ', expected ' + EXPECTED_WORKER_REV);
                }
              })
              .catch(function () {});
          } catch (_) {}
        }
        return true;
      }

      function attachWatchedButtons() {
        if (typeof app.accessToken !== 'undefined' && app.accessToken && typeof prepareStreamWorker === 'function') {
          try { prepareStreamWorker(); } catch (_) {}
        }
        const watched = new Set(loadWatchedVideos());
        let warmCount = 0;
        const maxWarm = 4;
        const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && warmCount < maxWarm && entry.target && entry.target.dataset && entry.target.dataset.id) {
              warmCount++;
              warmVideoStream(entry.target.dataset.id);
              try { observer.unobserve(entry.target); } catch (_) {}
            }
          });
        }, { rootMargin: '100px' }) : null;
        app.filesWrap.querySelectorAll('.file-card[data-kind="video"]').forEach(card => {
          if (card && typeof card.addEventListener === 'function' && card.dataset && card.dataset.id) {
            const warm = function () { warmVideoStream(card.dataset.id); };
            card.addEventListener('touchstart', warm, { passive: true, once: true });
            card.addEventListener('pointerenter', warm, { passive: true, once: true });
            if (observer && warmCount < maxWarm) {
              try { observer.observe(card); } catch (_) {}
            }
          }
          const button = app.document.createElement("button");
          button.type = "button";
          button.className = "watched-toggle";
          const update = value => {
            button.textContent = value ? "✓ ดูแล้ว" : "○ ยังไม่ดู";
            button.setAttribute("aria-pressed", String(value));
            button.setAttribute("aria-label", card.dataset.name + (value ? " · ดูแล้ว กดเพื่อเปลี่ยนเป็นยังไม่ดู" : " · ยังไม่ดู กดเพื่อทำเครื่องหมายดูแล้ว"));
            button.title = "บันทึกสถานะในเบราว์เซอร์นี้";
          };
          update(watched.has(card.dataset.id));
          button.addEventListener("click", event => {
            event.stopPropagation();
            update(toggleWatchedVideo(card.dataset.id));
          });
          card.querySelector(".file-meta-content").appendChild(button);
        });
      }

      function loadContinueWatching() {
        try {
          const items = JSON.parse(app.lsGet("gdv_continue") || "[]");
          return Array.isArray(items) ? items.filter(x => x && typeof x.id === "string" && /^[\w-]+$/.test(x.id) && typeof x.name === "string" && Number.isFinite(x.position) && x.position > 2).slice(0, 30) : [];
        } catch (_) { return []; }
      }

      function saveVideoPos() {
        if (!vidCurrentId || app.vidPlayer.style.display === "none") return;
        const time = app.vidPlayer.currentTime;
        if (!Number.isFinite(time)) return;
        // บันทึกภาพเฟรมปัจจุบันของวิดีโอเป็นภาพปกสำรอง (ถ้ายังไม่มีในแคช)
        try {
          if (app.vidPlayer.videoWidth > 0 && typeof localStorage !== "undefined" && !localStorage.getItem("gdv_thumb_" + vidCurrentId)) {
            const canvas = app.document.createElement("canvas");
            canvas.width = 160;
            canvas.height = Math.round(160 * (app.vidPlayer.videoHeight / app.vidPlayer.videoWidth));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(app.vidPlayer, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.68);
            if (dataUrl && dataUrl.length > 100) {
              localStorage.setItem("gdv_thumb_" + vidCurrentId, dataUrl);
            }
          }
        } catch (_) {}
        const items = loadContinueWatching().filter(x => x.id !== vidCurrentId);
        if (app.vidPlayer.ended) {
          app.lsRemove("gdv_vpos_" + vidCurrentId);
        } else {
          if (time <= 2) return;
          const position = Math.floor(time);
          app.lsSet("gdv_vpos_" + vidCurrentId, position);
          items.unshift({ id: vidCurrentId, name: app.vidTitle.textContent || "วิดีโอ", position, updated: app.Date.now() });
        }
        app.lsSet("gdv_continue", JSON.stringify(items.slice(0, 30)));
        app.pruneVpos(100);
      }

      function renderContinueWatching() {
        let section = app.document.getElementById("continueWatching");
        const drawerMount = app.document.getElementById("myLibraryContent");
        if (!section) {
          section = app.document.createElement("section");
          section.id = "continueWatching";
          section.className = "favorite-folders";
          if (drawerMount) drawerMount.appendChild(section);
          else {
            const card = app.document.getElementById("browserCard");
            if (card && typeof card.before === 'function') card.before(section);
          }
        } else if (drawerMount && section.parentElement !== drawerMount) {
          drawerMount.appendChild(section);
        }
        section.innerHTML = '<h3>ดูต่อจากครั้งล่าสุด</h3><p>บันทึกในเบราว์เซอร์นี้ สูงสุด 30 รายการ · จำเวลาได้เฉพาะเครื่องเล่นโดยตรง ไม่รวมพรีวิว Google Drive</p>';
        const items = loadContinueWatching();
        if (!items.length) {
          const empty = app.document.createElement("p");
          empty.textContent = "วิดีโอที่ดูค้างไว้จะปรากฏที่นี่";
          section.appendChild(empty);
          if (app.window.updateMyLibraryBadge) app.window.updateMyLibraryBadge();
          return;
        }
        const grid = app.document.createElement("div");
        grid.className = "resume-grid";
        items.forEach(item => {
          const row = app.document.createElement("div");
          row.className = "favorite-folder resume-card";
          const button = app.document.createElement("button");
          button.type = "button";
          button.className = "resume-btn";
          const minutes = Math.floor(item.position / 60);
          const seconds = String(item.position % 60).padStart(2, "0");
          const progressPercent = Math.min(96, Math.max(8, Math.round((item.position / (item.duration || (item.position + 120))) * 100)));
          const safeName = (item.name || "").replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));

          const cachedThumb = (function () {
            if (typeof app.mediaThumbs !== "undefined" && app.mediaThumbs && app.mediaThumbs[item.id]) return app.mediaThumbs[item.id];
            try { return localStorage.getItem("gdv_thumb_" + item.id); } catch (_) { return null; }
          })();
          const thumbUrl = cachedThumb || ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(item.id) + "&sz=w320");
          const safeThumbUrl = (thumbUrl || "").replace(/"/g, '&quot;');
          const safeId = (item.id || "").replace(/['"\\]/g, "");

          button.innerHTML = `
            <div class="resume-thumb-box${cachedThumb ? ' has-thumb' : ''}" aria-hidden="true">
              <img class="resume-thumb-img${cachedThumb ? ' loaded' : ''}" src="${safeThumbUrl}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.remove('has-thumb');if(window.tryLoadDriveThumbnail)window.tryLoadDriveThumbnail('${safeId}',this)" onload="this.classList.add('loaded');this.parentElement.classList.add('has-thumb')" />
              <span class="resume-play-glyph">▶</span>
              <div class="resume-progress-track"><div class="resume-progress-bar" style="width:${progressPercent}%"></div></div>
            </div>
            <div class="resume-info">
              <span class="resume-title" title="${safeName}">${safeName}</span>
              <span class="resume-time-tag">⏱ ดูต่อ ${minutes}:${seconds}</span>
            </div>
          `;
          button.onclick = () => {
            if (app.window.closeMyLibraryDrawer) app.window.closeMyLibraryDrawer();
            app.lsSet("gdv_vpos_" + item.id, item.position);
            openVideo(item.id, item.name);
          };
          const remove = app.document.createElement("button");
          remove.type = "button";
          remove.className = "favorite-remove-btn";
          remove.textContent = "×";
          remove.setAttribute("aria-label", "ลบ " + item.name + " จากรายการดูต่อ");
          remove.onclick = (e) => {
            e.stopPropagation();
            app.lsSet("gdv_continue", JSON.stringify(loadContinueWatching().filter(x => x.id !== item.id)));
            app.lsRemove("gdv_vpos_" + item.id);
            renderContinueWatching();
          };
          row.append(button, remove);
          grid.appendChild(row);
        });
        section.appendChild(grid);
        if (app.window.updateMyLibraryBadge) app.window.updateMyLibraryBadge();
      }

      function revokeCurrentVideo() {

        if (currentVideoUrl) {

          URL.revokeObjectURL(currentVideoUrl);

          currentVideoUrl = null;

        }

      }

      function closeVideo() {
        hideNextUp();
        if (app.document.fullscreenElement && app.videoModal.contains && app.videoModal.contains(app.document.fullscreenElement) && app.document.exitFullscreen) {
          Promise.resolve(app.document.exitFullscreen()).catch(function () {});
        }
        const box = app.videoModal.querySelector && app.videoModal.querySelector('.video-box');
        if (box && box.classList && box.classList.remove) box.classList.remove('pseudo-fullscreen');
        const btn = app.document.getElementById ? app.document.getElementById('vidFullscreen') : null;
        if (btn) { btn.textContent = '⛶'; btn.setAttribute('aria-pressed', 'false'); }
        const minBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidMinimize') : null;
        if (minBtn) {
          minBtn.textContent = '🗗';
          if (typeof minBtn.setAttribute === 'function') minBtn.setAttribute('aria-label', 'ย่อเครื่องเล่นไว้มุมจอ');
        }
        if (app.videoModal && app.videoModal.classList && app.videoModal.classList.remove) app.videoModal.classList.remove('minimized');
        resetMediaPlayback();
        vidCurrentId = null;
        app.document.body.style.overflow = app.lightbox.classList.contains("show") ? "hidden" : mediaPreviousOverflow;

        app.videoModal.classList.remove("show");

        app.vidPlayer.pause();

        app.vidPlayer.removeAttribute("src");

        app.vidFrame.src = "about:blank";

        revokeCurrentVideo();

        app.revokeCurrentDoc();

        app.videoModal.setAttribute("aria-hidden", "true");
        setVideoStatus('closed');
        renderContinueWatching();

      }

      // ===== Auto-next (playlist) — นโยบายเดียวของระบบ: เสนอตอนถัดไปแบบนับถอยหลัง 5 วิ
      // (พร้อม prefetch หัวคลิปตอนถัดไป) ไม่มี immediate-advance อีกแล้ว — listener เดียว
      // ที่ฟัง ended ต้องอยู่ "ใน" บล็อก with เสมอ ไม่เช่นนั้น bare identifier จะกลายเป็น
      // ReferenceError ที่ถูก try/catch กลืน (บั๊ก dead-code ที่ตรวจพบในงาน architect)
      let nextUpTimer = null;
      let nextUpTarget = null;
      function nextVideoInList(list, currentId) {
        if (!Array.isArray(list) || list.length < 2 || !currentId) return null;
        const idx = list.findIndex(function (item) { return item && item.id === currentId; });
        if (idx < 0) return null;
        const next = list[(idx + 1) % list.length];
        return next && next.id && next.id !== currentId ? next : null;
      }
      function hideNextUp() {
        if (nextUpTimer) { clearInterval(nextUpTimer); nextUpTimer = null; }
        nextUpTarget = null;
        const strip = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidNextUp') : null;
        if (strip) strip.hidden = true;
      }
      function showNextUp(next) {
        if (!next || typeof app.document === 'undefined' || !app.document.getElementById) return;
        hideNextUp();
        nextUpTarget = next;
        prefetchHeadFor(next);
        const strip = app.document.getElementById('vidNextUp');
        const nameEl = app.document.getElementById('vidNextUpName');
        const countEl = app.document.getElementById('vidNextUpCount');
        if (!strip || !nameEl || !countEl) { nextUpTarget = null; return; }
        nameEl.textContent = next.name || next.id;
        nameEl.title = next.name || '';
        strip.hidden = false;
        let remain = 5;
        countEl.textContent = String(remain);
        nextUpTimer = setInterval(function () {
          remain -= 1;
          if (remain <= 0) { playNextUp(); return; }
          countEl.textContent = String(remain);
        }, 1000);
      }
      function playNextUp() {
        const target = nextUpTarget;
        hideNextUp();
        if (target && typeof openVideo === 'function') openVideo(target.id, target.name);
      }
      // ===== Prefetch หัวคลิปตอนถัดไป — ให้กด "ต่อไป" แล้วเริ่มเล่นทันที =====
      // หน้าเว็บเป็นคนส่ง token ของไฟล์นั้นให้ SW เอง (ไฟล์เดียวจบ ไม่ครอบคลุมอย่างอื่น)
      const prefetchedHeads = new Set();
      function prefetchHeadFor(target) {
        try {
          if (!target || !target.id || prefetchedHeads.has(target.id)) return;
          if (typeof app.accessToken === 'undefined' || !app.accessToken || !vidCurrentId) return;
          if (typeof app.videoCacheLimit !== 'function' || app.videoCacheLimit() <= 0) return;
          if (typeof app.videoCacheScope !== 'function' || !app.videoCacheScope()) return;
          if (typeof app.navigator !== 'undefined' && app.navigator.connection && app.navigator.connection.saveData) return;
          const worker = typeof app.navigator !== 'undefined' ? app.navigator.serviceWorker : null;
          const controller = worker && worker.controller;
          if (!controller || typeof controller.postMessage !== 'function') return;
          const meta = typeof app.fileMetaOf === 'function' ? app.fileMetaOf(target.id) : null;
          prefetchedHeads.add(target.id);
          controller.postMessage({
            type: 'drive-stream-prefetch',
            id: target.id,
            token: typeof app.accessToken === 'function' ? app.accessToken() : app.accessToken,
            scope: typeof app.videoCacheScope === 'function' ? app.videoCacheScope() : app.videoCacheScope,
            size: meta && Number(meta.size) > 0 ? Number(meta.size) : 0,
            modifiedTime: meta && meta.modifiedTime ? String(meta.modifiedTime) : '',
            heads: true
          });
        } catch (_) {}
      }
      function prefetchNextUp() {
        try {
          const api = app.window.GDVLightboxApi && app.window.GDVLightboxApi.media;
          const list = api && typeof api.mediaList === 'function' ? api.mediaList('video') : [];
          const target = nextVideoInList(list, vidCurrentId);
          if (target) prefetchHeadFor(target);
        } catch (_) {}
      }
      if (typeof app.vidPlayer !== 'undefined' && app.vidPlayer && typeof app.vidPlayer.addEventListener === 'function') {
        app.vidPlayer.addEventListener('ended', function () {
          try {
            showVideoChrome(); // วิดีโอจบ — เรียก chrome กลับมาทันที
            // โหมด progressive download มี onended ของตัวเอง (รอ slice ถัดไป) — ไม่แทรก auto-next
            if (typeof videoBlobTransfer !== 'undefined' && videoBlobTransfer) return;
            if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show')) return;
            try { app.lsRemove("gdv_vpos_" + vidCurrentId); } catch (_) {} // เล่นจบแล้ว — ล้างตำแหน่งค้าง (จาก ended-listener เดิมของ app-core)
            const api = app.window.GDVLightboxApi && app.window.GDVLightboxApi.media;
            const list = api && typeof api.mediaList === 'function' ? api.mediaList('video') : [];
            const next = nextVideoInList(list, vidCurrentId);
            if (!next) { hideNextUp(); return; }
            showNextUp(next);
          } catch (_) {}
        });
        app.vidPlayer.addEventListener('play', function () {
          hideNextUp();
          // เฟรมแรกขึ้นแล้ว — ไม่ต้องโชว์ poster อีก กันแฟลชตอนสลับ src
          try { app.vidPlayer.removeAttribute('poster'); } catch (_) {}
          prefetchNextUp();
        });
        const nextUpPlayBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidNextUpPlay') : null;
        const nextUpCancelBtn = typeof app.document !== 'undefined' && app.document.getElementById ? app.document.getElementById('vidNextUpCancel') : null;
        if (nextUpPlayBtn) nextUpPlayBtn.addEventListener('click', playNextUp);
        if (nextUpCancelBtn) nextUpCancelBtn.addEventListener('click', hideNextUp);
      }


  function syncFullscreen() {
    const box = app.videoModal ? (app.videoModal.querySelector ? app.videoModal.querySelector('.video-box') : null) : null;
    const doc = app.document || (typeof document !== 'undefined' ? document : null);
    const active = Boolean(
      (doc && doc.fullscreenElement && doc.fullscreenElement === box) ||
      (doc && doc.webkitFullscreenElement && doc.webkitFullscreenElement === box) ||
      (box && box.classList && box.classList.contains && box.classList.contains('pseudo-fullscreen'))
    );
    if (!active) releasePlayerOrientation();
    const button = doc && doc.getElementById ? doc.getElementById('vidFullscreen') : null;
    if (button) {
      button.textContent = active ? '⤡' : '⛶';
      button.setAttribute('aria-pressed', String(active));
    }
    applyVideoAspect();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fitVideoPreview);
    } else {
      fitVideoPreview();
    }
    return active;
  }

  function escape() {
    if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains('show')) return false;
    // Escape closes the "ดูแบบอื่น" menu first; a second press closes the modal.
    const openMenu = app.document && app.document.getElementById ? app.document.getElementById('vidHelp') : null;
    if (openMenu && openMenu.open) { openMenu.open = false; return true; }
    const box = app.videoModal.querySelector ? app.videoModal.querySelector('.video-box') : null;
    if (box && box.classList && box.classList.contains && box.classList.contains('pseudo-fullscreen')) {
      box.classList.remove('pseudo-fullscreen');
      syncFullscreen();
      return true;
    }
    closeVideo();
    return true;
  }

  function suspend() {
    if (app.videoModal && app.videoModal.classList && !app.videoModal.classList.contains("show")) {
      mediaPreviousOverflow = (app.document && app.document.body) ? app.document.body.style.overflow : "";
    }
    resetMediaPlayback();
    vidCurrentId = null;
    revokeCurrentVideo();
    if (app.vidPlayer) {
      try { app.vidPlayer.pause(); } catch (_) {}
      try { app.vidPlayer.removeAttribute("src"); } catch (_) {}
    }
  }

  function enterPreview(id) {
    if (!app.videoModal || !app.videoModal.classList || !app.videoModal.classList.contains("show") || vidCurrentId !== id) return;
    cancelVideoBlobTransfer();
    cancelVideoAttempt();
    if (app.vidPlayer) {
      app.vidPlayer.oncanplay = null;
      app.vidPlayer.onerror = null;
      try { app.vidPlayer.pause(); } catch (_) {}
      try { app.vidPlayer.removeAttribute("src"); } catch (_) {}
      try { app.vidPlayer.load(); } catch (_) {}
      app.vidPlayer.style.display = "none";
    }
    configurePreviewFullscreen();
    if (app.vidFrame) {
      app.vidFrame.setAttribute('data-video-preview', 'true');
      app.vidFrame.style.display = "block";
      app.vidFrame.src = "https://drive.google.com/file/d/" + id + "/preview";
    }
    applyPreviewAspect(id);
    fitVideoPreview();
    setVideoStatus('preview', 'พรีวิว Google ใช้บัญชีแยกจากเว็บนี้ บนมือถือให้ใช้ปุ่ม “เต็มจอ” ด้านบน · หากขึ้นกำลังประมวลผลหรือดูไม่ได้ กด “โหลดทั้งไฟล์แทน” หรือ “เปิดใน VLC / แอปนอก” ด้านล่าง');
  }

  function clearRetryRoutes() {
    const rc = app.routeCooldown || (app.window && app.window.GDVVideoCache ? app.window.GDVVideoCache.createRouteCooldown() : null);
    if (rc && vidCurrentId) {
      rc.clear(vidCurrentId, app.accessToken ? 'signedin' : 'public');
    }
  }

  function retry() {
    if (app.videoModal && app.videoModal.classList && app.videoModal.classList.contains('show') && vidCurrentId) {
      clearRetryRoutes();
      clearStreamBlocked();
      openVideo(vidCurrentId, (app.vidTitle && app.vidTitle.textContent) || "วิดีโอ");
    }
  }

  function reconnect() {
    const id = vidCurrentId;
    const session = mediaSession;
    const name = (app.vidTitle && app.vidTitle.textContent) || "วิดีโอ";
    const ensure = typeof app.ensureToken === 'function' ? app.ensureToken(true) : Promise.resolve(null);
    return ensure.then(function (token) {
      if (token && session === mediaSession && id === vidCurrentId && app.videoModal && app.videoModal.classList && app.videoModal.classList.contains('show')) {
        clearRetryRoutes();
        clearStreamBlocked();
        openVideo(id, name);
      }
      return token;
    });
  }

  function onNav(dir) {
    try {
      const api = app.window && app.window.GDVLightboxApi ? app.window.GDVLightboxApi.media : null;
      if (api && typeof api.navigateMedia === 'function') {
        if (!vidCurrentId) {
          api.navigateMedia("image", dir);
        } else {
          api.navigateMedia("video", dir);
        }
        return;
      }
      const list = typeof app.playlist === 'function' ? app.playlist('video') : [];
      const next = nextVideoInList(list, vidCurrentId);
      if (next) openVideo(next.id, next.name);
    } catch (_) {}
  }

  function safeOn(el, evt, handler, opts) {
    if (el && typeof el.addEventListener === 'function') {
      try { el.addEventListener(evt, handler, opts); } catch (_) {}
    }
  }

  function wireVideoListeners() {
    const doc = app.document || (typeof document !== 'undefined' ? document : null);
    const win = app.window || (typeof window !== 'undefined' ? window : null);
    if (!doc) return;

    const getEl = id => (app[id] && app[id].addEventListener ? app[id] : (doc.getElementById ? doc.getElementById(id) : null));

    // Fullscreen buttons & changes
    const vidFullscreenBtn = getEl('vidFullscreen');
    safeOn(vidFullscreenBtn, 'click', togglePlayerFullscreen);
    safeOn(doc, 'fullscreenchange', syncFullscreen);
    safeOn(doc, 'webkitfullscreenchange', syncFullscreen);

    // Minimize buttons
    const vidMinimizeBtn = getEl('vidMinimize');
    safeOn(vidMinimizeBtn, 'click', function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      toggleMinimizeVideo();
    });
    const vidMinimizeBlobBtn = getEl('vidMinimizeBlob');
    safeOn(vidMinimizeBlobBtn, 'click', function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      minimizeVideo();
    });

    // Turbo button
    const vidTurboBlobBtn = getEl('vidTurboBlob');
    safeOn(vidTurboBlobBtn, 'click', function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      toggleDownloadTurbo();
    });

    // Restore from minimized on modal click / backdrop click
    const vModal = app.videoModal || getEl('videoModal');
    if (vModal) {
      const videoBoxEl = vModal.querySelector ? vModal.querySelector('.video-box') : null;
      safeOn(videoBoxEl, 'click', function (e) {
        if (!vModal.classList.contains('minimized')) return;
        if (e && e.target && e.target.closest && e.target.closest('#vidClose, #vidCancelBlob, #vidMinimize, #vidTurboBlob, .lb-close, button')) return;
        restoreVideo();
      });
      safeOn(vModal, 'click', function (e) {
        if (e && e.target === vModal && !vModal.classList.contains('minimized')) closeVideo();
      });
    }

    // Aspect & Preview buttons
    const vidAspectToggleBtn = getEl('vidAspectToggle');
    safeOn(vidAspectToggleBtn, 'click', togglePreviewAspect);

    const vidQuickPreviewBtn = getEl('vidQuickPreview');
    safeOn(vidQuickPreviewBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) enterPreview(vidCurrentId);
    });
    const vidPreviewBtn = getEl('vidPreview');
    safeOn(vidPreviewBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) enterPreview(vidCurrentId);
    });
    const vidSlowPreviewBtn = getEl('vidSlowPreview');
    safeOn(vidSlowPreviewBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) enterPreview(vidCurrentId);
    });

    // External player buttons
    const vidExternalPlayerBtn = getEl('vidExternalPlayer');
    safeOn(vidExternalPlayerBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) openInExternalPlayer(vidCurrentId);
    });
    const vidSlowVlcBtn = getEl('vidSlowVlc');
    safeOn(vidSlowVlcBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) openInExternalPlayer(vidCurrentId);
    });

    // Whole-file blob download buttons
    const vidBlobBtn = getEl('vidBlob');
    safeOn(vidBlobBtn, 'click', function () {
      if (vidCurrentId) requestVideoBlob(vidCurrentId);
    });
    const vidSlowBlobBtn = getEl('vidSlowBlob');
    safeOn(vidSlowBlobBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) requestVideoBlob(vidCurrentId);
    });
    const vidCancelBlobBtn = getEl('vidCancelBlob');
    safeOn(vidCancelBlobBtn, 'click', function () {
      cancelVideoBlobTransfer(true);
    });

    // Copy to Drive button
    const vidCopyDriveBtn = getEl('vidCopyDrive');
    safeOn(vidCopyDriveBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) copyVideoToMyDrive(vidCurrentId);
    });

    // Retry and Reconnect buttons
    const vidRetryBtn = getEl('vidRetry');
    safeOn(vidRetryBtn, 'click', function () {
      if (vModal && vModal.classList.contains('show') && vidCurrentId) {
        clearRetryRoutes();
        clearStreamBlocked();
        openVideo(vidCurrentId, (app.vidTitle && app.vidTitle.textContent) || "วิดีโอ");
      }
    });
    const vidReconnectBtn = getEl('vidReconnect');
    safeOn(vidReconnectBtn, 'click', function () {
      const id = vidCurrentId, session = mediaSession, name = (app.vidTitle && app.vidTitle.textContent) || "วิดีโอ";
      const ensure = typeof app.ensureToken === 'function' ? app.ensureToken(true) : Promise.resolve(null);
      ensure.then(function (token) {
        if (token && session === mediaSession && id === vidCurrentId && vModal && vModal.classList.contains('show')) {
          clearRetryRoutes();
          clearStreamBlocked();
          openVideo(id, name);
        }
      });
    });

    // Close button
    const vidCloseBtn = getEl('vidClose');
    safeOn(vidCloseBtn, 'click', closeVideo);

    // Diagnostics trace copy + collapse toggle (elements live next to vidErrorStatus)
    safeOn(getEl('vidTraceCopy'), 'click', copyVideoTrace);
    safeOn(getEl('vidTraceToggle'), 'click', toggleVideoTrace);

    // Prev / Next buttons
    const vidPrevBtn = getEl('vidPrev');
    safeOn(vidPrevBtn, 'click', function () { onNav(-1); });
    const vidNextBtn = getEl('vidNext');
    safeOn(vidNextBtn, 'click', function () { onNav(1); });

    // Consolidated menu (details/summary toggles natively) — close on outside click
    const vidHelpMenu = getEl('vidHelp');
    safeOn(doc, 'click', function (e) {
      if (!vidHelpMenu || !vidHelpMenu.open || typeof vidHelpMenu.contains !== 'function') return;
      if (e && e.target && vidHelpMenu.contains(e.target)) return;
      vidHelpMenu.open = false;
    });

    // Cinematic idle auto-hide: pointer activity shows chrome, stillness hides
    // it after 2.5s while playing (all guards live in showVideoChrome)
    safeOn(vModal, 'pointermove', showVideoChrome, { passive: true });
    safeOn(vModal, 'pointerdown', showVideoChrome, { passive: true });

    // Viewport resize & orientation
    if (win) {
      if (win.ResizeObserver && app.vidFrame && app.vidFrame.parentElement) {
        try { new win.ResizeObserver(fitVideoPreview).observe(app.vidFrame.parentElement); } catch (_) {}
      }
      safeOn(win, 'resize', fitVideoPreview, { passive: true });
      safeOn(win, 'orientationchange', fitVideoPreview, { passive: true });
      safeOn(win, 'pagehide', saveVideoPos);
      if (!(typeof module !== 'undefined' && module.exports) && typeof win.setInterval === 'function') {
        win._gdvVideoTimer = win._gdvVideoTimer || win.setInterval(saveVideoPos, 3000);
      }
    }
    if (app.vidFrame) safeOn(app.vidFrame, 'load', fitVideoPreview);

    // Media element event listeners
    if (app.vidPlayer) {
      safeOn(app.vidPlayer, 'loadedmetadata', function () {
        if (vModal && vModal.classList.contains('show') && videoStatus === 'connecting') setVideoStatus('loading');
      });
      safeOn(app.vidPlayer, 'playing', function () {
        if (vModal && vModal.classList.contains('show')) { recordActivePlaybackRoute(); setVideoStatus('playing'); }
      });
      safeOn(app.vidPlayer, 'waiting', function () {
        if (vModal && vModal.classList.contains('show') && videoStatus !== 'error') setVideoStatus('buffering');
      });
      // canplay completes the buffering transition: a mid-watch seek can
      // recover without the browser firing 'playing' again, which left the
      // loading overlay stuck over the native controls (can't seek).
      safeOn(app.vidPlayer, 'canplay', function () {
        if (vModal && vModal.classList.contains('show') && videoStatus === 'buffering' && !app.vidPlayer.paused) setVideoStatus('playing');
      });
      // timeupdate is the ground truth for progressing playback: a slow
      // upstream can hold readyState at 2 with frames advancing, and waiting
      // for canplay kept the curtain over a video that was already moving.
      safeOn(app.vidPlayer, 'timeupdate', function () {
        if (vModal && vModal.classList.contains('show') && videoStatus === 'buffering' && !app.vidPlayer.paused && app.vidPlayer.readyState >= 2) setVideoStatus('playing');
      });
      // Pausing must bring the overlay chrome back even without pointer movement
      // (ended shares the single ended listener below, per the one-listener rule)
      safeOn(app.vidPlayer, 'pause', showVideoChrome);
    }
  }

  wireVideoListeners();

  const video = {
    // Target interface (24 names)
    open: openVideo,
    close: closeVideo,
    suspend,
    retry,
    reconnect,
    escape,
    openPreview: enterPreview,
    openExternal: openInExternalPlayer,
    copyToDrive: copyVideoToMyDrive,
    requestBlob: requestVideoBlob,
    cancelBlob: cancelVideoBlobTransfer,
    toggleFullscreen: togglePlayerFullscreen,
    toggleAspect: togglePreviewAspect,
    toggleMinimize: toggleMinimizeVideo,
    toggleTurbo: toggleDownloadTurbo,
    onNav,
    enterPreview,
    refreshLibrary: renderContinueWatching,
    watched: {
      list: loadWatchedVideos,
      toggle: toggleWatchedVideo,
      attach: attachWatchedButtons
    },
    headCache: {
      stats: function () {
        return typeof app.headCacheStats === 'function' ? app.headCacheStats() : Promise.resolve({ supported: false });
      },
      clear: function () {
        return typeof app.headCacheClear === 'function' ? app.headCacheClear() : Promise.resolve({ cleared: false });
      }
    },
    syncFullscreen,
    clearRetryRoutes,
    startVideoPlayback,
    playbackRouteRecords,
    rememberPlaybackRoute,
    preferredPlaybackRoute,
    recordActivePlaybackRoute,
    setVideoStatus,
    handleDriveStreamError,
    cancelVideoAttempt,
    resetMediaPlayback,
    openVideo,
    streamBlocked,
    rememberStreamBlocked,
    clearStreamBlocked,
    streamBlockVerdict,
    shouldRememberStreamBlock,
    deviceCodecSupport,
    describeCodecSupport,
    readMp4CodecInfo,
    probeStreamEndpoint,
    calculatePreviewLayout,
    fitVideoPreview,
    clampPreviewAspect,
    loadCachedVideoAspect,
    saveCachedVideoAspect,
    applyPreviewAspect,
    configurePreviewFullscreen,
    lockHorizontalPlayerOrientation,
    getPlayerAspect,
    releasePlayerOrientation,
    applyVideoAspect,
    togglePreviewAspect,
    openInExternalPlayer,
    copyVideoToMyDrive,
    isVideoMinimized,
    minimizeVideo,
    restoreVideo,
    toggleMinimizeVideo,
    isDownloadTurboEnabled,
    updateTurboUI,
    setDownloadTurboEnabled,
    toggleDownloadTurbo,
    applyNativeVideoAspect,
    togglePlayerFullscreen,
    prepareStreamWorker,
    showStreamFailure,
    nextVideoInList,
    showNextUp,
    hideNextUp,
    prefetchHeadFor,
    prefetchNextUp,
    cachedVideoThumb,
    tryStreamDirect,
    probePublicStreamError,
    prioritizePlaybackSource,
    createPublicStreamRunner: (deps) => createPublicStreamRunner(deps, runnerFallbacks),
    tryPublicStream,
    readVideoBlobResponse,
    readVideoBlobRanges,
    openVideoTempWriter,
    createVideoBlobRunner: (deps) => createVideoBlobRunner(deps, runnerFallbacks),
    renderVideoBlobProgress,
    cancelVideoBlobTransfer,
    requestVideoBlob,
    loadVideoAsBlob,
    createVideoSourceRunner: (deps) => createVideoSourceRunner(deps, runnerFallbacks),
    tryVideoSrc,
    loadWatchedVideos,
    toggleWatchedVideo,
    attachWatchedButtons,
    loadContinueWatching,
    saveVideoPos,
    renderContinueWatching,
    revokeCurrentVideo,
    closeVideo,
  };
  Object.defineProperties(video, stateProps);
  return video;
}

(function () {
  const host = (typeof window !== 'undefined' && window.GDVVideoHost) || null;
  const appApi = (typeof window !== 'undefined' && window.GDVVideoApi) || host;
  if (!appApi) throw new Error("Video player requires GDVVideoApi or GDVVideoHost");
  const video = createVideoCenter(appApi);
  appApi.video = video;
  window.GDVVideo = video;
  // In the browser, the main app skips this at startup (this module is not
  // loaded yet there); render after the API exists. CommonJS tests get the API
  // directly and do not run browser startup side effects.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = video;
    module.exports.createVideoCenter = createVideoCenter;
    module.exports.TIMEOUTS = TIMEOUTS;
    module.exports.WORKER_URL = WORKER_URL;
    module.exports.EXPECTED_WORKER_REV = EXPECTED_WORKER_REV;
  } else {
    video.renderContinueWatching();
  }
})();
