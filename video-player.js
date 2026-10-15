// video-player.js — Video Player IIFE
// Depends on: video-cache.js (window.GDVVideoCache: createVideoCache, createRouteCooldown)
// Depends on: window.GDVVideoApi (the explicit boundary to the main app)
//
// Bridge contract: every shared value below is read/written as a bare
// identifier, which resolves against `with (appApi)`. The main app therefore
// owns the state and must expose it as live accessors:
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
//                         refreshVideoCacheUI, videoCacheScope, resetPdfViewer,
//                         revokeCurrentDoc, pruneVpos
//
// The module publishes its 51 functions back on window.GDVVideoApi.video so the
// main app can call openVideo/closeVideo/setVideoStatus/etc. after this script
// has run. Copied bodies are byte-for-byte verbatim; only this header, the
// `with` wrapper and the export block are new. (No "use strict": the `with`
// statement that binds the bare identifiers is illegal in strict mode.)
(function () {
  const appApi = window.GDVVideoApi;
  if (!appApi) throw new Error("Video player requires GDVVideoApi");

  with (appApi) {
      function startVideoPlayback(id) {
        if (typeof videoCache === 'undefined' || !videoCache) { tryStreamDirect(id); return Promise.resolve(); }
        const session = mediaSession, attempt = videoAttempt, token = accessToken, scope = videoCacheScope();
        const active = function () { return session === mediaSession && attempt === videoAttempt && token === accessToken && id === vidCurrentId && videoModal.classList.contains('show'); };
        let timer;
        setVideoStatus('connecting', 'กำลังตรวจคลิปที่เก็บไว้ในเครื่อง…');
        return Promise.race([videoCache.get(id, fileMetaOf(id), scope), new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, 1500); })]).then(function (blob) {
          clearTimeout(timer);
          if (!active()) return;
          if (!blob) { tryStreamDirect(id); return; }
          revokeCurrentVideo();
          currentVideoUrl = URL.createObjectURL(blob);
          vidPlayer.removeAttribute('crossorigin'); vidPlayer.style.display = 'block';
          tryVideoSrc(currentVideoUrl, function () {
            if (session !== mediaSession || token !== accessToken || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
            return videoCache.remove(id, scope).then(function () {
              if (session === mediaSession && token === accessToken && id === vidCurrentId && videoModal.classList.contains('show')) tryStreamDirect(id);
            });
          }, 120000);
          setVideoStatus('loading', 'กำลังเปิดคลิปที่เก็บไว้ในเครื่อง…');
        });
      }

      function playbackRouteRecords() {
        try {
          const records = JSON.parse(lsGet('gdv_playback_routes') || '[]');
          if (!Array.isArray(records)) return [];
          return records.filter(function (r) { return r && typeof r.id === 'string' && r.id.length <= 200 && ['signedin', 'public'].includes(r.mode) && ['bearer', 'worker', 'usercontent', 'key'].includes(r.route) && Number.isFinite(r.at) && r.at <= Date.now() && Date.now() - r.at < 7 * 86400000; }).slice(-50);
        } catch (_) { return []; }
      }

      function rememberPlaybackRoute(id, route) {
        if (!['bearer', 'worker', 'usercontent', 'key'].includes(route)) return;
        const mode = accessToken ? 'signedin' : 'public';
        const records = playbackRouteRecords().filter(function (r) { return r.id !== id || r.mode !== mode; });
        records.push({id: id, mode: mode, route: route, at: Date.now()});
        lsSet('gdv_playback_routes', JSON.stringify(records.slice(-50)));
      }

      function preferredPlaybackRoute(id) {
        const mode = accessToken ? 'signedin' : 'public';
        const records = playbackRouteRecords();
        const record = records.find(function (r) { return r.id === id && r.mode === mode; });
        if (record) return record.route;
        const latest = records.slice().reverse().find(function (r) { return r.mode === mode; });
        return latest ? latest.route : null;
      }

      function recordActivePlaybackRoute() {
        const source = vidPlayer.playbackRoute;
        if (!source || source.session !== mediaSession || source.id !== vidCurrentId || source.mode !== (accessToken ? 'signedin' : 'public') || !videoModal.classList.contains('show') || vidPlayer.paused || vidPlayer.style.display === 'none' || String(vidPlayer.src) !== source.url) return;
        rememberPlaybackRoute(source.id, source.route);
        if (typeof routeCooldown !== 'undefined' && routeCooldown) routeCooldown.success(source.id, source.mode, source.route);
      }

      function setVideoStatus(state, message) {
        const prev = videoStatus;
        videoStatus = state;
        const status = document.getElementById ? document.getElementById('vidErrorStatus') : null;
        const loadingText = document.getElementById ? document.getElementById('vidLoadingText') : null;
        const help = document.getElementById ? document.getElementById('vidHelp') : null;
        const title = document.getElementById('vidTitle');
        const fullTitle = document.getElementById('vidFullTitle');
        const note = document.getElementById('vidPreviewNote');
        const info = document.getElementById('vidInfo');
        if (fullTitle && title) fullTitle.textContent = title.textContent;
        if (note) { note.hidden = state !== 'preview'; if (state === 'preview') note.textContent = message || ''; }
        if (info && (state === 'closed' || state === 'connecting')) info.open = false;
        if (status) status.setAttribute('data-preview-note', state === 'preview' ? 'true' : 'false');
        if (state === 'playing') { vidLoading.classList.remove('show'); if (status) status.hidden = true; if (prev !== 'playing' && help) help.open = false; }
        else if (state === 'error' || state === 'preview') { vidLoading.classList.remove('show'); if (status) { if (message) status.textContent = message; status.hidden = !message; } if (((state === 'error' && prev !== 'error') || (state === 'preview' && prev !== 'preview')) && help) help.open = true; }
        else if (state === 'closed') { vidLoading.classList.remove('show'); if (status) status.hidden = true; }
        else { vidLoading.classList.add('show'); if (status) status.hidden = true; if (loadingText) loadingText.textContent = message || (state === 'connecting' ? 'กำลังเชื่อมต่อ…' : state === 'buffering' ? 'กำลังบัฟเฟอร์…' : 'กำลังโหลดวิดีโอ…'); }
        return videoStatus;
      }

      function handleDriveStreamError(data) {
        if (!data || data.type !== 'drive-stream-error') return false;
        if (data.id !== vidCurrentId || !videoModal.classList.contains('show')) return false;
        const failedAttempt = typeof failedVideoAttempt === 'undefined' ? null : failedVideoAttempt;
        if (data.attempt != null && Number(data.attempt) !== videoAttempt && !(videoStatus === 'error' && failedAttempt !== null && Number(data.attempt) === failedAttempt)) return false;
        if (data.reason === 'streamRangeUnsupported') {
          const kinds = ['status','header','start','end','total'];
          const kind = kinds.includes(data.rangeFailure) ? data.rangeFailure : 'unknown';
          const status = Number(data.upstreamStatus);
          const diagnostic = Number.isInteger(status) && status >= 100 && status <= 599 ? ' [RANGE/' + kind + '/HTTP' + status + ']' : '';
          setVideoStatus('error', 'แหล่งสตรีมไม่รองรับช่วงข้อมูลที่เว็บร้องขอ กดลองใหม่หรือใช้พรีวิว Google' + diagnostic);
          if (vidPlayer.onerror) vidPlayer.onerror();
          return true;
        }
        if (data.reason === 'streamFetchFailed') {
          rememberStreamBlocked();
          setVideoStatus('error', 'เชื่อมต่อแหล่งสตรีมไม่ได้ [FETCH] อาจเกิดจากเครือข่ายหรือการบล็อกคำขอ หากใช้ Brave ลองปิด Shields เฉพาะเว็บนี้ชั่วคราวแล้วรีเฟรชเพื่อทดสอบ');
          if (vidPlayer.onerror) vidPlayer.onerror();
          return true;
        }
        const category = classifyApiError(data.status, data.reason, !!accessToken);
        const messages = {session:'เซสชันหมดอายุ กดเชื่อมต่อ Google ใหม่',signedout:'กรุณาเชื่อมต่อ Google เพื่อเล่นไฟล์นี้',permission:'บัญชีนี้อาจไม่มีสิทธิ์ดาวน์โหลดไฟล์ เปิดใน Drive เพื่อตรวจสอบ',quota:'Google จำกัดการใช้งานชั่วคราว กรุณาลองภายหลัง',server:'Google Drive ขัดข้องชั่วคราว',notfound:'ไม่พบไฟล์หรือบัญชีนี้เข้าถึงไม่ได้'};
        setVideoStatus('error', messages[category] || 'เชื่อมต่อวิดีโอไม่สำเร็จ กรุณาลองใหม่');
        // The response already confirms this route cannot play; do not wait for the media timeout.
        if (['session', 'signedout', 'permission', 'quota', 'notfound'].includes(category) && vidPlayer.onerror) vidPlayer.onerror();
        return true;
      }

      function cancelVideoAttempt() {
        ++videoAttempt;
        failedVideoAttempt = null;
        if (videoAttemptTimer !== null) clearTimeout(videoAttemptTimer);
        videoAttemptTimer = null;
        if (videoSlowTimer !== null) clearTimeout(videoSlowTimer);
        videoSlowTimer = null;
        vidPlayer.onerror = null;
        vidPlayer.oncanplay = null;
        vidPlayer.onloadedmetadata = null;
      }

      function resetMediaPlayback() {
        saveVideoPos();
        cancelVideoBlobTransfer();
        ++mediaSession;
        cancelVideoAttempt();
        releasePlayerOrientation();
        vidPlayer.playerAspect = null;
        vidPlayer.playbackRoute = null;
        vidPlayer.pause();
        vidPlayer.removeAttribute("src");
        vidPlayer.load();
        vidPlayer.style.display = "none";
        vidFrame.src = "about:blank";
        vidFrame.style.display = "none";
        vidFrame.removeAttribute('data-video-preview');
        previewAspect = null;
        if (vidFrame.parentElement) {
          vidFrame.parentElement.style.aspectRatio = '';
          if (typeof vidFrame.parentElement.removeAttribute === 'function') vidFrame.parentElement.removeAttribute('data-orientation');
        }
        const aspectBtn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('vidAspectToggle') : null;
        if (aspectBtn) aspectBtn.textContent = 'สลับแนว ↕↔';
        vidLoading.classList.remove("show");
        resetPdfViewer();
      }

      function openVideo(id, name) {
        if (lightbox.classList.contains("show")) closeLightbox();
        if (!videoModal.classList.contains("show")) mediaPreviousOverflow = document.body.style.overflow;
        resetMediaPlayback();

                    vidCurrentId = id;

                    // reset index ให้ตรงกับวิดีโอที่เปิด (กัน nav ผิด)

                    currentMediaIndex = -1;

                    currentMediaKind = "video";

                    vidTitle.textContent = name || "วิดีโอ";

              vidOpenTab.href = "https://drive.google.com/file/d/" + id + "/view";

              vidPlayer.style.display = "none";

              vidFrame.style.display = "none";

              vidFrame.src = "about:blank";

              revokeCurrentDoc();
        document.body.style.overflow = "";

              vidProgressBar.style.width = "0%";

              setVideoStatus("connecting", "กำลังเตรียมวิดีโอ…");

              videoModal.classList.add("show");
              document.body.style.overflow = "hidden";

              videoModal.setAttribute("aria-hidden", "false");

              // เรียกคืนตำแหน่งที่เคยดูค้างไว้ (ถ้ามี)

              const historyItem = loadContinueWatching().find(item => item.id === id);
              const saved = historyItem ? historyItem.position : lsGet("gdv_vpos_" + id);

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
          const probe = document.createElement('video');
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
            if (timer !== null) clearTimeout(timer);
            if (reader) { const active = reader; reader = null; Promise.resolve(active.cancel()).catch(function () {}).then(function () { if (active.releaseLock) active.releaseLock(); }); }
            if (controller) controller.abort();
            resolve(verdict);
          };
          timer = setTimeout(function () { done('browser'); }, 8000);
          try {
            const url = new URL('__drive_stream', location.href);
            url.searchParams.set('id', id);
            url.searchParams.set('attempt', String(attempt));
            fetch(url.href, { headers: { Range: 'bytes=0-1048575' }, signal: controller ? controller.signal : undefined })
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
                      const tailRes = await fetch(url.href, { headers: { Range: 'bytes=' + tailStart + '-' + (totalBytes - 1) }, signal: controller ? controller.signal : undefined });
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
        // Google Drive's Material 3 control bar needs >= 760px virtual width and >= 420px virtual height
        // so the timeline and control pills stay on a single bottom row without wrapping or clipping.
        const horizontal = aspect > 0 ? aspect >= 1 : width >= height;
        const minWidth = 800;
        const minHeight = horizontal ? 420 : 0;
        const frameWidth = Math.max(minWidth, width, minHeight > 0 && height > 0 ? Math.ceil(width * (minHeight / height)) : 0);
        const scale = width / frameWidth;
        return {width: frameWidth, height: height / scale, scale: scale};
      }

      function fitVideoPreview() {
        if (vidFrame.getAttribute('data-video-preview') !== 'true') return;
        const bounds = vidFrame.parentElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const layout = calculatePreviewLayout(bounds.width, bounds.height, previewAspect && previewAspect.value);
        vidFrame.style.setProperty('--preview-width', layout.width + 'px');
        vidFrame.style.setProperty('--preview-height', layout.height + 'px');
        vidFrame.style.setProperty('--preview-scale', String(layout.scale));
      }

      function clampPreviewAspect(w, h) {
        const ratio = Number(w) / Number(h);
        if (!isFinite(ratio) || ratio <= 0) return 16 / 9;
        return Math.min(2.2, Math.max(0.45, ratio));
      }

      function loadCachedVideoAspect(id) {
        if (!id || typeof lsGet !== 'function') return null;
        try {
          const items = JSON.parse(lsGet('gdv_video_aspects') || '[]');
          if (!Array.isArray(items)) return null;
          const found = items.find(function (x) { return x && x.id === id && Number.isFinite(x.aspect) && x.aspect >= 0.45 && x.aspect <= 2.2; });
          return found ? Number(found.aspect) : null;
        } catch (_) { return null; }
      }

      function saveCachedVideoAspect(id, aspect) {
        const val = Number(aspect);
        if (!id || typeof lsGet !== 'function' || typeof lsSet !== 'function' || !Number.isFinite(val) || val < 0.45 || val > 2.2) return;
        try {
          const raw = JSON.parse(lsGet('gdv_video_aspects') || '[]');
          const list = Array.isArray(raw) ? raw.filter(function (x) { return x && typeof x.id === 'string' && x.id !== id && Number.isFinite(x.aspect); }) : [];
          list.push({ id: id, aspect: val, at: Date.now() });
          lsSet('gdv_video_aspects', JSON.stringify(list.slice(-100)));
        } catch (_) {}
      }

      function applyPreviewAspect(id) {
        // ปรับกรอบพรีวิวให้ตรงสัดส่วนวิดีโอจริง ไม่ล็อก 16:9 (วิดีโอแนวตั้งจะได้กรอบสูง ไม่เป็นแถบเล็ก ๆ กลางจอ)
        const ratioEl = vidFrame.parentElement;
        if (!ratioEl) return;
        if (previewAspect && previewAspect.id === id) { applyVideoAspect(); return; }
        ratioEl.style.aspectRatio = '';
        if (typeof ratioEl.removeAttribute === 'function') ratioEl.removeAttribute('data-orientation');
        const cached = typeof fileMetaOf === 'function' ? fileMetaOf(id) : null;
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
          if (typeof Image !== 'function') { fitVideoPreview(); return; }
          const img = new Image();
          img.onload = function () {
            if (session !== mediaSession || id !== vidCurrentId || !videoModal.classList.contains('show') || vidFrame.getAttribute('data-video-preview') !== 'true') return;
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
          const knownThumb = thumbUrl || (typeof mediaThumbs !== 'undefined' && mediaThumbs && mediaThumbs[id]) || (cached && cached.thumbnailLink);
          img.src = knownThumb || ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w320');
        };
        const auth = authParams();
        if (auth.mode === 'none') { probeThumb(); return; }
        const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=size,videoMediaMetadata(width,height),thumbnailLink' + (auth.mode === 'key' ? '&key=' + apiKey : '');
        const headers = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + accessToken } : {};
        fetch(url, { headers: headers })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (meta) {
            if (meta && Number(meta.size) > 0 && cached && !(Number(cached.size) > 0)) cached.size = Number(meta.size);
            if (meta && meta.thumbnailLink) {
              if (typeof mediaThumbs !== 'undefined' && mediaThumbs) mediaThumbs[id] = meta.thumbnailLink;
              try { localStorage.setItem("gdv_thumb_" + id, meta.thumbnailLink); } catch (_) {}
            }
            if (session !== mediaSession || id !== vidCurrentId || !videoModal.classList.contains('show') || vidFrame.getAttribute('data-video-preview') !== 'true') return;
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
        const mobile = window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
        // Use the app wrapper on mobile instead of the embedded player's fullscreen path.
        vidFrame.setAttribute('allow', mobile ? "autoplay; encrypted-media; fullscreen 'none'" : 'autoplay; encrypted-media; fullscreen');
        if (mobile) vidFrame.removeAttribute('allowfullscreen');
        else vidFrame.setAttribute('allowfullscreen', '');
      }

      function lockHorizontalPlayerOrientation(box) {
        const orientation = window.screen && window.screen.orientation;
        const aspect = getPlayerAspect();
        if (document.fullscreenElement !== box || !(aspect > 1)) { releasePlayerOrientation(); return Promise.resolve(); }
        if (!orientation || !orientation.lock || box.playerOrientationLocked || box.playerOrientationPending) return Promise.resolve();
        const request = box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        box.playerOrientationPending = true;
        try {
          return Promise.resolve(orientation.lock('landscape')).then(function () {
            if (request === box.playerOrientationRequest && document.fullscreenElement === box && getPlayerAspect() > 1) {
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
        return vidFrame.getAttribute('data-video-preview') === 'true'
          ? previewAspect && previewAspect.value
          : vidPlayer.playerAspect;
      }

      function releasePlayerOrientation() {
        const box = videoModal.querySelector && videoModal.querySelector('.video-box');
        if (!box) return;
        box.playerOrientationRequest = (box.playerOrientationRequest || 0) + 1;
        const held = box.playerOrientationLocked || box.playerOrientationPending;
        box.playerOrientationLocked = false;
        box.playerOrientationPending = false;
        try { if (held && window.screen && window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock(); } catch (_) {}
      }

      function applyVideoAspect() {
        const ratioEl = vidFrame.parentElement;
        if (!ratioEl) return;
        const box = videoModal.querySelector && videoModal.querySelector('.video-box');
        const aspect = getPlayerAspect();
        const isFullscreen = !!(box && (document.fullscreenElement === box || (box.classList && box.classList.contains('pseudo-fullscreen'))));
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
        const aspectBtn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('vidAspectToggle') : null;
        if (aspectBtn) {
          aspectBtn.textContent = aspect ? (aspect < 1 ? 'แนวตั้ง ↕' : 'แนวนอน ↔') : 'สลับแนว ↕↔';
          if (typeof aspectBtn.setAttribute === 'function') {
            aspectBtn.setAttribute('title', aspect ? (aspect < 1 ? 'กำลังแสดงแนวตั้ง (คลิกเพื่อสลับเป็นแนวนอน 16:9)' : 'กำลังแสดงแนวนอน (คลิกเพื่อสลับเป็นแนวตั้ง 9:16)') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
            aspectBtn.setAttribute('aria-label', aspect ? (aspect < 1 ? 'สลับเป็นแนวนอน' : 'สลับเป็นแนวตั้ง') : 'สลับสัดส่วนแนวตั้งและแนวนอน');
          }
        }
        fitVideoPreview();
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fitVideoPreview);
        if (box && videoModal.classList.contains('show')) lockHorizontalPlayerOrientation(box);
      }

      function togglePreviewAspect() {
        if (!videoModal.classList.contains('show') || !vidCurrentId) return null;
        const current = getPlayerAspect();
        const next = current && current < 1 ? 16 / 9 : 9 / 16;
        previewAspect = { id: vidCurrentId, value: next };
        vidPlayer.playerAspect = next;
        if (typeof saveCachedVideoAspect === 'function') saveCachedVideoAspect(vidCurrentId, next);
        applyVideoAspect();
        return next;
      }

      function openInExternalPlayer(id) {
        const targetId = id || vidCurrentId;
        if (!targetId) return null;
        const streamUrl = 'https://google-drive-file-viewer.missnlpp9.workers.dev/?id=' + encodeURIComponent(targetId);
        const vlcUrl = 'vlc://' + streamUrl;
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          Promise.resolve(navigator.clipboard.writeText(streamUrl)).catch(function () {});
        }
        if (typeof showToast === 'function') {
          showToast('กำลังส่งสตรีมเข้าแอป VLC… (คัดลอกลิงก์สตรีมให้แล้วหากต้องการวางในแอปอื่น)');
        }
        try {
          if (typeof document !== 'undefined' && document.createElement) {
            const a = document.createElement('a');
            a.href = vlcUrl;
            a.rel = 'noopener';
            if (typeof a.click === 'function') a.click();
          } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = vlcUrl;
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
            if (typeof showToast === 'function') showToast('กรุณาเชื่อมต่อบัญชี Google ก่อนทำสำเนาเข้า Drive ของคุณ');
            return Promise.resolve(null);
          }
          if (typeof showToast === 'function') showToast('กำลังทำสำเนาไฟล์เข้า Google Drive ของคุณ…');
          const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(targetId) + '/copy?supportsAllDrives=true&fields=id,name,mimeType,size,videoMediaMetadata(width,height)';
          return fetch(url, {
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
            if (session !== mediaSession || !videoModal.classList.contains('show')) return copied;
            if (typeof showToast === 'function') showToast('ทำสำเนาเข้า Drive สำเร็จ กำลังเปิดเล่นไฟล์สำเนา…');
            try {
              const titleText = copied.name || (typeof vidTitle !== 'undefined' && vidTitle && vidTitle.textContent) || 'วิดีโอ (สำเนา)';
              if (typeof appApi !== 'undefined' && appApi && typeof appApi.openVideo === 'function') appApi.openVideo(copied.id, titleText);
              else openVideo(copied.id, titleText);
            } catch (_) {}
            return copied;
          }).catch(function () {
            if (typeof showToast === 'function') showToast('ทำสำเนาเข้า Drive ไม่สำเร็จ (ตรวจสอบพื้นที่ Drive หรือสิทธิ์บัญชี)');
            return null;
          });
        };
        if (accessToken) return runCopy(accessToken);
        if (typeof ensureToken === 'function') {
          return Promise.resolve(ensureToken(true)).then(runCopy).catch(function () { return runCopy(null); });
        }
        return runCopy(null);
      }

      function applyNativeVideoAspect() {
        if (!videoModal.classList.contains('show') || vidFrame.getAttribute('data-video-preview') === 'true' || vidPlayer.style.display === 'none') return;
        const aspect = Number(vidPlayer.videoWidth) / Number(vidPlayer.videoHeight);
        if (!Number.isFinite(aspect) || aspect <= 0) return;
        vidPlayer.playerAspect = aspect;
        if (vidCurrentId && typeof saveCachedVideoAspect === 'function' && typeof clampPreviewAspect === 'function') {
          saveCachedVideoAspect(vidCurrentId, clampPreviewAspect(vidPlayer.videoWidth, vidPlayer.videoHeight));
        }
        applyVideoAspect();
      }

      function togglePlayerFullscreen() {
        if (!videoModal.classList.contains('show')) return Promise.resolve();
        const box = videoModal.querySelector('.video-box');
        if (!box) return Promise.resolve();
        const failed = function () { showToast('เปิดเต็มจอไม่ได้ ลองเปิดในแท็บใหม่'); };
        try {
          if (document.fullscreenElement === box || (document.webkitFullscreenElement && document.webkitFullscreenElement === box)) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) return Promise.resolve(exit.call(document)).catch(failed);
          }
          if (box.classList && box.classList.contains && box.classList.contains('pseudo-fullscreen')) {
            box.classList.remove('pseudo-fullscreen');
            const btn = document.getElementById ? document.getElementById('vidFullscreen') : null;
            if (btn) { btn.textContent = 'เต็มจอ'; btn.setAttribute('aria-pressed', 'false'); }
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
              const btn = document.getElementById ? document.getElementById('vidFullscreen') : null;
              if (btn) { btn.textContent = 'ออกเต็มจอ'; btn.setAttribute('aria-pressed', 'true'); }
              applyVideoAspect();
              if (typeof fitVideoPreview === 'function') fitVideoPreview();
              failed();
            });
          }
          if (box.classList && box.classList.add) box.classList.add('pseudo-fullscreen');
          const btn = document.getElementById ? document.getElementById('vidFullscreen') : null;
          if (btn) { btn.textContent = 'ออกเต็มจอ'; btn.setAttribute('aria-pressed', 'true'); }
          applyVideoAspect();
          if (typeof fitVideoPreview === 'function') fitVideoPreview();
          return Promise.resolve();
        } catch (_) { failed(); return Promise.resolve(); }
      }

      function prepareStreamWorker() {
        if (!window.isSecureContext || !('serviceWorker' in navigator) || location.protocol === 'file:') return Promise.resolve(false);
        if (!streamWorkerReady) {
          streamWorkerReady = new Promise(function (resolve) {
            const workers = navigator.serviceWorker;
            const script = new URL('drive-stream-sw.js', location.href).href;
            function finish(ok) {
              clearTimeout(timer);
              workers.removeEventListener('controllerchange', check);
              resolve(ok);
            }
            function check() { if (workers.controller && workers.controller.scriptURL === script) finish(true); }
            const timer = setTimeout(function () { finish(false); }, 6000);
            workers.addEventListener('controllerchange', check);
            workers.register(script, {scope: './', updateViaCache: 'none'}).then(check).catch(function () { finish(false); });
            check();
          }).then(function (ok) { if (!ok) streamWorkerReady = null; return ok; });
        }
        return streamWorkerReady;
      }

      function showStreamFailure(message, diagnostic) {
        const failedAttempt = typeof failedVideoAttempt === 'undefined' ? null : failedVideoAttempt;
        cancelVideoAttempt();
        failedVideoAttempt = failedAttempt;
        vidPlayer.pause();
        vidPlayer.removeAttribute('src');
        vidPlayer.load();
        vidPlayer.style.display = 'none';
        const status = document.getElementById('vidErrorStatus');
        // Preserve a more specific permission/quota error reported by the worker.
        const detail = typeof diagnostic === 'string' && /^M[0-4]\/N[0-3]\/R[0-4]$/.test(diagnostic) ? ' [' + diagnostic + ']' : '';
        setVideoStatus('error', (status && !status.hidden && status.textContent ? status.textContent : message) + detail);
      }

      function tryStreamDirect(id, usePreferred = true, skipPublic = false) {
        if (!accessToken) { tryPublicStream(id); return; }
        if (!skipPublic && typeof routeCooldown !== 'undefined' && routeCooldown && routeCooldown.blocked(id, 'signedin', 'bearer')) { tryPublicStream(id); return; }
        const preferred = usePreferred ? preferredPlaybackRoute(id) : null;
        // A remembered public route (including the Worker) plays without bearer setup first.
        if (['usercontent', 'key', 'worker'].includes(preferred) && (preferred !== 'key' || apiKey)) {
          tryPublicStream(id, function () { tryStreamDirect(id, false, true); }, false);
          return;
        }
        clearStreamBlocked();
        const session = mediaSession;
        const token = accessToken;
        prepareStreamWorker().then(function (ready) {
          if (session !== mediaSession || token !== accessToken || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
          if (!ready || Date.now() >= tokenExpiry) {
            showStreamFailure(Date.now() >= tokenExpiry ? 'เซสชันหมดอายุ กดเชื่อมต่อ Google ใหม่' : 'เบราว์เซอร์นี้ยังใช้สตรีมบัญชีไม่ได้ กดลองเล่นใหม่ หรือเลือกใช้พรีวิว Google');
            return;
          }
          revokeCurrentVideo();
          // CORS mode is required for service-worker partial media responses,
          // including this same-origin endpoint; configure it before src.
          vidPlayer.setAttribute('crossorigin', 'anonymous');
          vidPlayer.style.display = 'block';
          const url = new URL('__drive_stream', location.href);
          url.searchParams.set('id', id);
          tryVideoSrc(url, function (reason, diagnostic) {
            showStreamFailure(reason === 'timeout'
              ? 'วิดีโอใช้เวลาโหลดนานเกิน 1 นาที กดลองเล่นใหม่ ตรวจสอบเครือข่าย หรือเลือกใช้พรีวิว Google'
              : MEDIA_STREAM_FAIL_MSG, diagnostic);
            // พิสูจน์หลังล้มด้วยโพรบ (attempt ปลอม ไม่ให้ error ของโพรบทับการ์ด)
            // แล้วเปลี่ยนข้อความการ์ดเป็นสาเหตุจริง ถ้าการ์ดยังโชว์ข้อความทั่วไปอยู่
            if (reason === 'media') {
              const originalStatus = document.getElementById('vidErrorStatus').textContent;
              setVideoStatus('loading', 'กำลังลองแหล่งสำรองของ Google…');
              const finishFailure = function () {
                if (session !== mediaSession || token !== accessToken || !videoModal.classList.contains('show') || id !== vidCurrentId) return;
                  showStreamFailure(originalStatus);
                  const failedAttempt = videoAttempt;
                  probeStreamEndpoint(id, 'probe').then(function (verdict) {
                    if (session !== mediaSession || failedAttempt !== videoAttempt || !videoModal.classList.contains('show') || id !== vidCurrentId || videoStatus !== 'error') return;
                    const status = document.getElementById('vidErrorStatus');
                    if (!status || status.hidden || typeof status.textContent !== 'string' || status.textContent.indexOf(MEDIA_STREAM_FAIL_MSG) !== 0) return;
                    if (String(verdict).indexOf('codec:') === 0 && typeof fallbackIframe === 'function') {
                      const codecLabel = String(verdict).slice(6);
                      fallbackIframe(id);
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
          }, 60000, 'bearer');
        });
      }

      function probePublicStreamError(id) {
        if (!apiKey) return Promise.resolve(null);
        return new Promise(function (resolve) {
          const controller = new AbortController();
          let settled = false, reader = null;
          const done = function (message) {
            if (settled) return;
            settled = true; clearTimeout(timer);
            if (reader) { const active = reader; reader = null; Promise.resolve(active.cancel()).catch(function () {}); }
            controller.abort(); resolve(message);
          };
          const timer = setTimeout(function () { done(null); }, 8000);
          const url = new URL('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id));
          url.searchParams.set('alt', 'media'); url.searchParams.set('key', apiKey);
          fetch(url.href, { headers: { Range: 'bytes=0-1' }, signal: controller.signal })
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

      function createPublicStreamRunner(deps) {
        return function tryPublicStream(id, onFail, googleOnly = false) {
          with (deps) {
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
        if (!googleOnly) sources.push({route:'worker', label:'worker', url:'https://google-drive-file-viewer.missnlpp9.workers.dev/?id=' + encodeURIComponent(id) + '&continuous=1'});
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
            const timeoutMs = source.route === 'worker' ? 65000 : 12000;
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
      const runPublicStream = createPublicStreamRunner(appApi);
      function tryPublicStream(id, onFail, googleOnly = false) {
        return runPublicStream(id, onFail, googleOnly);
      }

      function readVideoBlobResponse(res, signal, onProgress) {
        return (async function () {
          const aborted = function () { if (signal.aborted) { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; } };
          aborted();
          const length = Number(res.headers && res.headers.get('content-length'));
          const total = Number.isFinite(length) && length > 0 ? length : 0;
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
            }
            return new Blob(chunks, {type: res.headers.get('content-type') || 'application/octet-stream'});
          } finally {
            signal.removeEventListener('abort', cancel);
            if (reader.releaseLock) reader.releaseLock();
          }
        })();
      }

      function readVideoBlobRanges(url, headers, size, signal, onProgress, onChunk, opts) {
        // โหลดไฟล์เต็มด้วยหลายคำขอช่วงพร้อมกัน (ค่าเริ่ม: 4 คำขอ × 8 MiB; ปรับได้ผ่าน opts {chunk, limit, retries})
        // ไม่ส่ง onChunk: ประกอบเป็น Blob ในแรมตามลำดับเดิม  |  ส่ง onChunk(index, start, blob):
        // ส่งต่อทุกช่วงให้ผู้เรียก (เช่น เขียนลงดิสก์) แล้วคืนค่า content-type แทน Blob
        // โยน AbortError เมื่อผู้ใช้ยกเลิก ส่วนความล้มเหลวอื่นให้ผู้เรียกตกกลับไปโหลดเชื่อมต่อเดียว
        const cfg = opts || {};
        const CHUNK = cfg.chunk || 8388608, LIMIT = cfg.limit || 4, RETRIES = cfg.retries || 2;
        const chunks = Math.ceil(size / CHUNK);
        const parts = onChunk ? null : new Array(chunks);
        const loaded = new Array(chunks).fill(0);
        let type = '';
        const progress = function () {
          let sum = 0;
          for (let i = 0; i < chunks; i++) sum += loaded[i];
          onProgress(Math.min(sum, size), size);
        };
        // หน่วงก่อนรีไทร (สคริปต์ทดสอบไม่มี setTimeout จึงเดินต่อทันที)
        const pause = function (ms) {
          return new Promise(function (resolve) {
            if (typeof setTimeout === 'function') setTimeout(resolve, ms); else resolve();
          });
        };
        const fetchChunk = function (index, attempt) {
          const start = index * CHUNK;
          const end = Math.min(start + CHUNK, size) - 1;
          return fetch(url, {headers: Object.assign({}, headers, {Range: 'bytes=' + start + '-' + end}), signal: signal}).then(function (res) {
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
          return fetchChunk(index, 0).then(function (blob) {
            if (writeError) throw writeError;
            if (!onChunk) { parts[index] = blob; return worker(); }
            // Pipeline OPFS disk write concurrently while immediately starting the next network chunk fetch!
            const p = Promise.resolve().then(function () { return onChunk(index, start, blob); }).catch(function (err) {
              err.permanent = true;
              writeError = err;
              throw err;
            });
            pendingWrites.push(p);
            return worker();
          });
        };
        const pool = [];
        for (let i = 0; i < Math.min(LIMIT, chunks); i++) pool.push(worker());
        return Promise.all(pool).then(function () {
          return Promise.all(pendingWrites);
        }).then(function () { return onChunk ? type : new Blob(parts, {type: type || 'application/octet-stream'}); });
      }

      function openVideoTempWriter() {
        // เตรียมไฟล์ชั่วคราวใน OPFS เพื่อเขียนช่วงข้อมูลลงดิสก์ระหว่างโหลด (createWritable ตัดเนื้อหาเดิมทิ้งทุกครั้ง)
        // จึงเหลือไฟล์ค้างสูงสุดไฟล์เดียวต่อเว็บ คืน null เมื่อเบราว์เซอร์ไม่รองรับ ผู้เรียกจะประกอบ Blob ในแรมแทน
        try {
          if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) return Promise.resolve(null);
          return navigator.storage.getDirectory().then(function (dir) {
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

      function renderVideoBlobProgress(loaded, total) {
        const percent = total > 0 ? Math.min(100, Math.floor(loaded / total * 100)) : null;
        const elapsed = videoBlobTransfer ? (Date.now() - videoBlobTransfer.startedAt) / 1000 : 0;
        const speed = elapsed >= 1 && loaded > 0 ? loaded / elapsed : 0;
        const remaining = speed > 0 && total > loaded ? Math.ceil((total - loaded) / speed) : 0;
        const eta = remaining > 0 ? ' · เหลือประมาณ ' + (remaining < 60 ? remaining + ' วินาที' : Math.ceil(remaining / 60) + ' นาที') : '';
        const text = 'กำลังโหลดทั้งไฟล์: ' + (formatSize(loaded) || '0 B') + (percent === null ? ' · ไม่ทราบขนาดรวม' : ' / ' + formatSize(total) + ' (' + percent + '%)') + (speed > 0 ? ' · ' + formatSize(speed) + '/s' : '') + eta;
        const label = document.getElementById('vidLoadingText');
        const bar = document.getElementById('vidProgressBar');
        if (label) label.textContent = text;
        if (bar) bar.style.width = percent === null ? '0%' : percent + '%';
      }

      function cancelVideoBlobTransfer(showMessage) {
        const transfer = videoBlobTransfer;
        if (!transfer) return;
        videoBlobTransfer = null;
        transfer.controller.abort();
        const cancel = document.getElementById('vidCancelBlob');
        const button = document.getElementById('vidBlob');
        if (cancel) cancel.hidden = true;
        if (button) button.disabled = false;
        if (showMessage) setVideoStatus('error', 'ยกเลิกการโหลดแล้ว เลือกลองใหม่หรือใช้พรีวิว Google');
      }

      function requestVideoBlob(id) {
        if (!id || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
        const size = Number(fileMetaOf(id).size);
        if (!(size > 0) || size >= 256 * 1024 * 1024) {
          const detail = size > 0 ? 'ขนาด ' + formatSize(size) : 'ไม่ทราบขนาดไฟล์';
          if (!window.confirm('โหลดวิดีโอทั้งไฟล์ (' + detail + ') เพื่อเล่นในเว็บ? ต้องรอโหลดครบ ใช้เน็ตตามขนาดไฟล์และพื้นที่จัดเก็บชั่วคราวบนเครื่อง สามารถยกเลิกระหว่างโหลดได้')) return;
        }
        return loadVideoAsBlob(id);
      }

      function createVideoBlobRunner(deps) {
        return function loadVideoAsBlob(id, onGiveUp, priorNotes) {
          with (deps) {
        // ทางแก้เมื่อเบราว์เซอร์ (เช่น Brave) บล็อก fetch ข้ามโดเมนจาก service worker:
        // หน้าเว็บดึงไฟล์เต็มเป็น blob ด้วย Bearer เอง แล้วเล่นจากไฟล์ในเครื่อง (ไม่มี seek ก่อนโหลดครบ)
        // onGiveUp = เรียกเมื่อขั้นโหลดทั้งไฟล์ล้มทุกทาง เพื่อให้ผู้เรียกวินิจฉัยต่อได้
        // priorNotes = บันทึกการลองแหล่งก่อนหน้า แนบไปกับข้อความล้มเพื่อให้เห็นภาพรวม
        const prior = priorNotes && priorNotes.length ? ' การลองสำรองก่อนหน้า: ' + priorNotes.join(' · ') : '';
        if (!id || id !== vidCurrentId || !videoModal.classList.contains('show')) return;
        const auth = authParams();
        if (auth.mode === 'none' && !(Number(fileMetaOf(id) && fileMetaOf(id).size) > 0)) { showStreamFailure('ต้องลงชื่อเข้าใช้หรือตั้งค่า API key ก่อนจึงจะโหลดทั้งไฟล์ได้' + prior); if (onGiveUp) onGiveUp(); return; }
        cancelVideoBlobTransfer();
        cancelVideoAttempt();
        const transfer = videoBlobTransfer = {id: id, session: mediaSession, startedAt: Date.now(), controller: new AbortController()};
        const cacheScope = typeof videoCacheScope === 'function' ? videoCacheScope() : null;
        const cacheMeta = fileMetaOf(id);
        const active = function () { return videoBlobTransfer === transfer && transfer.session === mediaSession && id === vidCurrentId && videoModal.classList.contains('show'); };
        const btn = document.getElementById('vidBlob');
        const cancel = document.getElementById('vidCancelBlob');
        if (btn) btn.disabled = true;
        if (cancel) cancel.hidden = false;
        vidPlayer.pause(); vidPlayer.removeAttribute('src'); vidPlayer.load(); vidPlayer.style.display = 'none';
        vidFrame.src = 'about:blank'; vidFrame.style.display = 'none'; vidFrame.removeAttribute('data-video-preview');
        previewAspect = null; vidPlayer.playerAspect = null; applyVideoAspect();
        setVideoStatus('loading', 'กำลังโหลดทั้งไฟล์แทนการสตรีม (ใช้เน็ตตามขนาดไฟล์)…');
        renderVideoBlobProgress(0, 0);
        const directUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media' + (auth.mode === 'key' ? '&key=' + apiKey : '');
        const directHeaders = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + accessToken } : {};
        const directRoute = auth.mode === 'bearer' ? 'bearer' : 'key';
        const directBlocked = typeof routeCooldown !== 'undefined' && routeCooldown && routeCooldown.blocked(id, accessToken ? 'signedin' : 'public', directRoute);
        const directSource = {note: '', url: directUrl, headers: directHeaders};
        const workerSource = {note: ' (ผ่านเซิร์ฟเวอร์สำรอง)', url: 'https://google-drive-file-viewer.missnlpp9.workers.dev/?id=' + encodeURIComponent(id) + '&continuous=1', headers: {}, rangeOpts: {chunk: 4194304, limit: 6, retries: 3}};
        // หากแหล่งตรงเพิ่งติดโควตา ให้ข้ามไปเริ่มดึงผ่าน Worker 6 ช่องขนานทันทีโดยไม่ต้องรอติด 403 ซ้ำ
        const sources = auth.mode === 'none' ? [workerSource] : (directBlocked ? [workerSource, directSource] : [directSource, workerSource]);
        const progressBlob = function (loaded, total) { if (active()) renderVideoBlobProgress(loaded, total); };
        const loadSingle = function () {
          return fetch(directUrl, { headers: directHeaders, signal: transfer.controller.signal })
            .then(function (res) {
              if (!active()) { transfer.controller.abort(); const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; }
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return readVideoBlobResponse(res, transfer.controller.signal, progressBlob);
            });
        };
        const size = Number(fileMetaOf(id).size);
        const attemptParallel = function (source) {
          // เบราว์เซอร์ที่รองรับ OPFS จะเขียนทุกช่วงลงดิสก์ระหว่างโหลด แล้วเล่นจากไฟล์บนดิสก์
          // ลดแรมสูงสุด ไม่เช่นนั้นไฟล์ใหญ่จะทำให้แท็บถูกฆ่า (Aw, Snap) ตอนประกอบ Blob เต็ม
          return openVideoTempWriter().then(function (temp) {
            const assembled = readVideoBlobRanges(source.url, source.headers, size, transfer.controller.signal, progressBlob,
              temp ? function (index, start, chunk) { return temp.write(chunk, start); } : null, source.rangeOpts);
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
            if (!active()) return;
            const nextUrl = URL.createObjectURL(blob);
            videoBlobTransfer = null;
            if (cancel) cancel.hidden = true;
            if (btn) btn.disabled = false;
            revokeCurrentVideo();
            currentVideoUrl = nextUrl;
            vidPlayer.removeAttribute('crossorigin');
            vidPlayer.style.display = 'block';
            tryVideoSrc(currentVideoUrl, function () { showStreamFailure('โหลดทั้งไฟล์แล้วแต่ยังเล่นไม่ได้ — ไฟล์อาจอยู่ในรูปแบบที่เบราว์เซอร์นี้ไม่รองรับ' + describeCodecSupport(deviceCodecSupport()) + prior); if (onGiveUp) onGiveUp(); }, 120000);
            setVideoStatus('loading', 'โหลดทั้งไฟล์ครบแล้ว กำลังเตรียมเครื่องเล่น…');
            if (typeof videoCache !== 'undefined' && videoCache && cacheScope) {
              try {
                await videoCache.put(id, blob, cacheMeta, cacheScope);
                if (typeof refreshVideoCacheUI === 'function') refreshVideoCacheUI();
              } catch (_) {}
            }
          })
          .catch(function (err) {
            if (!active()) return;
            videoBlobTransfer = null;
            if (cancel) cancel.hidden = true;
            if (err && err.name === 'AbortError') { if (btn) btn.disabled = false; return; }
            setVideoStatus('error', 'โหลดทั้งไฟล์ไม่สำเร็จ (' + (err && err.message ? err.message : 'ลองใหม่อีกครั้ง') + ')' + prior);
            if (btn) btn.disabled = false;
            if (onGiveUp) onGiveUp();
          });
          }
        };
      }
      const runVideoBlob = createVideoBlobRunner(appApi);
      function loadVideoAsBlob(id, onGiveUp, priorNotes) {
        return runVideoBlob(id, onGiveUp, priorNotes);
      }

      function createVideoSourceRunner(deps) {
        return function tryVideoSrc(url, onFail, timeoutMs = 12000, route = null) {
          with (deps) {
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

        let done = false;
        vidPlayer.onloadedmetadata = function () {
          if (done || session !== mediaSession || attempt !== videoAttempt) return;
          applyNativeVideoAspect();
        };

        const timer = videoAttemptTimer = setTimeout(function () { if (!done && session === mediaSession && attempt === videoAttempt) { done = true; cancelVideoAttempt(); failedVideoAttempt = attempt; onFail('timeout'); } }, timeoutMs);

        // โหลดช้ากว่าปกติ — แจ้งเตือนหลัง 15 วินาที แต่ยังรอต่อถึงเพดานที่ตั้งไว้

        videoSlowTimer = setTimeout(function () { if (!done && session === mediaSession && attempt === videoAttempt) setVideoStatus('loading', 'โหลดนานกว่าปกติ กำลังพยายามต่อ…'); }, 15000);

        vidPlayer.onerror = function () {

          if (done || session !== mediaSession || attempt !== videoAttempt) return;

          const diagnostic = 'M' + (Number(vidPlayer.error && vidPlayer.error.code) || 0) + '/N' + (Number(vidPlayer.networkState) || 0) + '/R' + (Number(vidPlayer.readyState) || 0);
          done = true; cancelVideoAttempt(); failedVideoAttempt = attempt; onFail('media', diagnostic);

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
      const runVideoSource = createVideoSourceRunner(appApi);
      function tryVideoSrc(url, onFail, timeoutMs = 12000, route = null) {
        return runVideoSource(url, onFail, timeoutMs, route);
      }

      function loadWatchedVideos() {
        try {
          const ids = JSON.parse(lsGet("gdv_watched") || "[]");
          return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === "string" && /^[\w-]+$/.test(id)))] : [];
        } catch (_) { return []; }
      }

      function toggleWatchedVideo(id) {
        const ids = loadWatchedVideos();
        const watched = !ids.includes(id);
        lsSet("gdv_watched", JSON.stringify(watched ? ids.concat(id) : ids.filter(x => x !== id)));
        return watched;
      }

      const warmedVideoIds = new Set();
      function warmVideoStream(id) {
        if (!id || warmedVideoIds.has(id)) return false;
        warmedVideoIds.add(id);
        if (typeof accessToken !== 'undefined' && accessToken && typeof prepareStreamWorker === 'function') {
          try { prepareStreamWorker(); } catch (_) {}
        }
        if (typeof fetch === 'function') {
          try { fetch('https://google-drive-file-viewer.missnlpp9.workers.dev/?id=' + encodeURIComponent(id), { method: 'HEAD', mode: 'cors' }).catch(function () {}); } catch (_) {}
        }
        return true;
      }

      function attachWatchedButtons() {
        if (typeof accessToken !== 'undefined' && accessToken && typeof prepareStreamWorker === 'function') {
          try { prepareStreamWorker(); } catch (_) {}
        }
        const watched = new Set(loadWatchedVideos());
        filesWrap.querySelectorAll('.file-card[data-kind="video"]').forEach(card => {
          if (card && typeof card.addEventListener === 'function' && card.dataset && card.dataset.id) {
            const warm = function () { warmVideoStream(card.dataset.id); };
            card.addEventListener('touchstart', warm, { passive: true, once: true });
            card.addEventListener('pointerenter', warm, { passive: true, once: true });
          }
          const button = document.createElement("button");
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
          const items = JSON.parse(lsGet("gdv_continue") || "[]");
          return Array.isArray(items) ? items.filter(x => x && typeof x.id === "string" && /^[\w-]+$/.test(x.id) && typeof x.name === "string" && Number.isFinite(x.position) && x.position > 2).slice(0, 30) : [];
        } catch (_) { return []; }
      }

      function saveVideoPos() {
        if (!vidCurrentId || vidPlayer.style.display === "none") return;
        const time = vidPlayer.currentTime;
        if (!Number.isFinite(time)) return;
        // บันทึกภาพเฟรมปัจจุบันของวิดีโอเป็นภาพปกสำรอง (ถ้ายังไม่มีในแคช)
        try {
          if (vidPlayer.videoWidth > 0 && typeof localStorage !== "undefined" && !localStorage.getItem("gdv_thumb_" + vidCurrentId)) {
            const canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = Math.round(160 * (vidPlayer.videoHeight / vidPlayer.videoWidth));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(vidPlayer, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.68);
            if (dataUrl && dataUrl.length > 100) {
              localStorage.setItem("gdv_thumb_" + vidCurrentId, dataUrl);
            }
          }
        } catch (_) {}
        const items = loadContinueWatching().filter(x => x.id !== vidCurrentId);
        if (vidPlayer.ended) {
          lsRemove("gdv_vpos_" + vidCurrentId);
        } else {
          if (time <= 2) return;
          const position = Math.floor(time);
          lsSet("gdv_vpos_" + vidCurrentId, position);
          items.unshift({ id: vidCurrentId, name: vidTitle.textContent || "วิดีโอ", position, updated: Date.now() });
        }
        lsSet("gdv_continue", JSON.stringify(items.slice(0, 30)));
        pruneVpos(100);
      }

      function renderContinueWatching() {
        let section = document.getElementById("continueWatching");
        const drawerMount = document.getElementById("myLibraryContent");
        if (!section) {
          section = document.createElement("section");
          section.id = "continueWatching";
          section.className = "favorite-folders";
          if (drawerMount) drawerMount.appendChild(section);
          else document.getElementById("browserCard").before(section);
        } else if (drawerMount && section.parentElement !== drawerMount) {
          drawerMount.appendChild(section);
        }
        section.innerHTML = '<h3>ดูต่อจากครั้งล่าสุด</h3><p>บันทึกในเบราว์เซอร์นี้ สูงสุด 30 รายการ · จำเวลาได้เฉพาะเครื่องเล่นโดยตรง ไม่รวมพรีวิว Google Drive</p>';
        const items = loadContinueWatching();
        if (!items.length) {
          const empty = document.createElement("p");
          empty.textContent = "วิดีโอที่ดูค้างไว้จะปรากฏที่นี่";
          section.appendChild(empty);
          if (window.updateMyLibraryBadge) window.updateMyLibraryBadge();
          return;
        }
        const grid = document.createElement("div");
        grid.className = "resume-grid";
        items.forEach(item => {
          const row = document.createElement("div");
          row.className = "favorite-folder resume-card";
          const button = document.createElement("button");
          button.type = "button";
          button.className = "resume-btn";
          const minutes = Math.floor(item.position / 60);
          const seconds = String(item.position % 60).padStart(2, "0");
          const progressPercent = Math.min(96, Math.max(8, Math.round((item.position / (item.duration || (item.position + 120))) * 100)));
          const safeName = (item.name || "").replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));

          const cachedThumb = (function () {
            if (typeof mediaThumbs !== "undefined" && mediaThumbs && mediaThumbs[item.id]) return mediaThumbs[item.id];
            try { return localStorage.getItem("gdv_thumb_" + item.id); } catch (_) { return null; }
          })();
          const thumbUrl = cachedThumb || ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(item.id) + "&sz=w320");
          const safeThumbUrl = (thumbUrl || "").replace(/"/g, '&quot;');
          const safeId = (item.id || "").replace(/['"\\]/g, "");

          button.innerHTML = `
            <div class="resume-thumb-box${cachedThumb ? ' has-thumb' : ''}" aria-hidden="true">
              <img class="resume-thumb-img${cachedThumb ? ' loaded' : ''}" src="${safeThumbUrl}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-thumb');if(window.tryLoadDriveThumbnail)window.tryLoadDriveThumbnail('${safeId}',this)" onload="this.classList.add('loaded');this.parentElement.classList.add('has-thumb')" />
              <span class="resume-play-glyph">▶</span>
              <div class="resume-progress-track"><div class="resume-progress-bar" style="width:${progressPercent}%"></div></div>
            </div>
            <div class="resume-info">
              <span class="resume-title" title="${safeName}">${safeName}</span>
              <span class="resume-time-tag">⏱ ดูต่อ ${minutes}:${seconds}</span>
            </div>
          `;
          button.onclick = () => {
            if (window.closeMyLibraryDrawer) window.closeMyLibraryDrawer();
            lsSet("gdv_vpos_" + item.id, item.position);
            openVideo(item.id, item.name);
          };
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "favorite-remove-btn";
          remove.textContent = "×";
          remove.setAttribute("aria-label", "ลบ " + item.name + " จากรายการดูต่อ");
          remove.onclick = (e) => {
            e.stopPropagation();
            lsSet("gdv_continue", JSON.stringify(loadContinueWatching().filter(x => x.id !== item.id)));
            lsRemove("gdv_vpos_" + item.id);
            renderContinueWatching();
          };
          row.append(button, remove);
          grid.appendChild(row);
        });
        section.appendChild(grid);
        if (window.updateMyLibraryBadge) window.updateMyLibraryBadge();
      }

      function revokeCurrentVideo() {

        if (currentVideoUrl) {

          URL.revokeObjectURL(currentVideoUrl);

          currentVideoUrl = null;

        }

      }

      function closeVideo() {
        if (document.fullscreenElement && videoModal.contains && videoModal.contains(document.fullscreenElement) && document.exitFullscreen) {
          Promise.resolve(document.exitFullscreen()).catch(function () {});
        }
        const box = videoModal.querySelector && videoModal.querySelector('.video-box');
        if (box && box.classList && box.classList.remove) box.classList.remove('pseudo-fullscreen');
        const btn = document.getElementById ? document.getElementById('vidFullscreen') : null;
        if (btn) { btn.textContent = 'เต็มจอ'; btn.setAttribute('aria-pressed', 'false'); }
        resetMediaPlayback();
        vidCurrentId = null;
        document.body.style.overflow = lightbox.classList.contains("show") ? "hidden" : mediaPreviousOverflow;

        videoModal.classList.remove("show");

        vidPlayer.pause();

        vidPlayer.removeAttribute("src");

        vidFrame.src = "about:blank";

        revokeCurrentVideo();

        revokeCurrentDoc();

        videoModal.setAttribute("aria-hidden", "true");
        setVideoStatus('closed');
        renderContinueWatching();

      }

  }

  // Publish the extracted API back to the main app (bridge direction: module -> app).
  appApi.video = {
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
    applyNativeVideoAspect,
    togglePlayerFullscreen,
    prepareStreamWorker,
    showStreamFailure,
    tryStreamDirect,
    probePublicStreamError,
    prioritizePlaybackSource,
    createPublicStreamRunner,
    tryPublicStream,
    readVideoBlobResponse,
    readVideoBlobRanges,
    openVideoTempWriter,
    createVideoBlobRunner,
    renderVideoBlobProgress,
    cancelVideoBlobTransfer,
    requestVideoBlob,
    loadVideoAsBlob,
    createVideoSourceRunner,
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
  // In the browser, the main app skips this at startup (this module is not
  // loaded yet there); render after the API exists. CommonJS tests get the API
  // directly and do not run browser startup side effects.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = appApi.video;
  } else {
    appApi.video.renderContinueWatching();
  }
})();
