// video-runners.js — Stream & Download Runners for Google Drive File Viewer
// Contains:
//   - TIMEOUTS, WORKER_URL, EXPECTED_WORKER_REV
//   - createPublicStreamRunner (public proxy, direct usercontent, api key)
//   - createVideoBlobRunner (whole-file blob download, parallel chunks, OPFS)
//   - createVideoSourceRunner (video src setter, canplay/error listeners, timeout)

(function () {
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
        if (!googleOnly) {
          const metaObj = typeof fileMetaOf === 'function' ? fileMetaOf(id) : null;
          const metaSize = Number(metaObj && metaObj.size) || 0;
          const sizeHint = metaSize > 8388608 ? '&size=' + metaSize : '';
          sources.push({route:'worker', label:'worker', url: WORKER_URL + '?id=' + encodeURIComponent(id) + '&continuous=1' + sizeHint});
        }
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

const videoRunners = {
  TIMEOUTS,
  WORKER_URL,
  EXPECTED_WORKER_REV,
  createPublicStreamRunner,
  createVideoBlobRunner,
  createVideoSourceRunner
};

if (typeof window !== 'undefined') {
  window.GDVVideoRunners = videoRunners;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = videoRunners;
}
})();
