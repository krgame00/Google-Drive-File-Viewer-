// media-lightbox.js — Lightbox, image gestures, and PDF/document viewer.
// Depends on: window.GDVLightboxApi (live state/helpers), loaded after drive-explorer.js.
// Classic script on purpose: no bundler/build step; PDF.js is loaded through dynamic import().
(function () {
  const appApi = window.GDVLightboxApi;
  if (!appApi) throw new Error("Media lightbox requires GDVLightboxApi");
  const asyncBridge = {};

  // Shared app state remains owned by index.html; writes flow through live bridge accessors.
  with (appApi) {
      function mediaList(kind) {

                const cards = filesWrap.querySelectorAll(".file-card");

                const out = [];

                cards.forEach(function (card) {

                  if (card.offsetParent === null) return; // ข้ามการ์ดที่ถูกค้นหา/กรองซ่อนไว้

                  const k = card.dataset.kind;

                  if (kind === "image" && (k === "image" || card.dataset.type === "pdf" || /\.pdf$/i.test(card.dataset.name || ""))) out.push({ id: card.dataset.id, name: card.dataset.name, kind: k === "image" ? "image" : "pdf" });

                  else if (kind === "video" && k === "video") out.push({ id: card.dataset.id, name: card.dataset.name });

                });

                return out;

      }

      function navigateMedia(kind, dir) {

                const list = mediaList(kind);

                if (!list.length) return;

                if (currentMediaIndex < 0 || currentMediaKind !== kind) {

                  // หา index ปัจจุบันจากรายการที่แสดง (เรียกครั้งแรกหรือสลับชนิด)

                  const cur = list.findIndex(function (item) { return item.id === (kind === "image" ? lbImg.dataset.fid : vidCurrentId); });

                  currentMediaIndex = cur >= 0 ? cur : 0;

                  currentMediaKind = kind;

                }

                currentMediaIndex = (currentMediaIndex + dir + list.length) % list.length;

                const item = list[currentMediaIndex];

                if (kind === "image") { if (item.kind === "pdf") openPdfDocument(item.id, item.name, "application/pdf"); else openLightbox(item.id); }

                else openVideo(item.id, item.name);

      }

      function openLightbox(id, forceOriginal) {
        if (videoModal.classList.contains("show")) closeVideo();

        if (pdfInLightbox) closeLightbox();
        resetPdfViewer();
        lbImg.style.display = "";

              lbImg.dataset.fid = id; // จำเป็น: media nav ใช้ชี้หา index

              // reset index ให้ตรงกับภาพที่เปิด (กัน nav ผิด)

              currentMediaIndex = -1;

              currentMediaKind = "image";

              lightbox.classList.add("show");
              document.body.style.overflow = "hidden";

              lightbox.setAttribute("aria-hidden", "false");

              lbImg.src = "";

              resetImageView();

              setImageControlsVisible(true);

              cancelImageTap();

              updateLbCount();

              if (lbOrig) { lbOrig.classList.remove("show"); lbOrig.disabled = false; lbOrig.textContent = "ดูต้นฉบับ"; }



        // มีลิงก์ภาพย่อ (และไม่ได้กดขอต้นฉบับ) → โหลดจาก CDN ของ Google ทันที

        const cdn = !forceOriginal && cdnLargeUrl(mediaThumbs[id]);

        if (cdn) {

          lbImg.onload = function () { lbImg.onload = null; prefetchNextImage(); };

          lbImg.onerror = function () { lbImg.onerror = null; loadOriginalImage(id); };

          lbImg.src = cdn;

          if (lbOrig) lbOrig.classList.add("show");

          return;

        }

        loadOriginalImage(id);

      }

      function loadOriginalImage(id) {

        if (lbOrig) { lbOrig.disabled = true; lbOrig.textContent = "กำลังโหลดต้นฉบับ…"; }

        const auth = authParams();

        if (auth.mode === "none") { fallbackImage(id); return; }

        const url = "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media" +

          (auth.mode === "key" ? "&key=" + apiKey : "");

        const headers = auth.mode === "bearer" ? { Authorization: "Bearer " + accessToken } : {};

        getBlobCached(origCacheKey(id), url, headers, null)

          .then(function (blob) {

            if (lbImg.dataset.fid !== id) return; // ผู้ใช้เปลี่ยนรูไปแล้ว

            if (lbImg._blobUrl) URL.revokeObjectURL(lbImg._blobUrl);

            lbImg._blobUrl = URL.createObjectURL(blob);

            lbImg.src = lbImg._blobUrl;

            if (lbOrig) lbOrig.classList.remove("show");

          })

          .catch(function () {

            if (lbImg.dataset.fid !== id) return;

            if (lbOrig) { lbOrig.disabled = false; lbOrig.textContent = "ดูต้นฉบับ"; }

            fallbackImage(id);

          });

      }

      function prefetchNextImage() {

        const list = mediaList("image");

        if (list.length < 2) return;

        const cur = list.findIndex(function (item) { return item.id === lbImg.dataset.fid; });

        const next = list[(cur + 1 + list.length) % list.length];

        const cdn = next && cdnLargeUrl(mediaThumbs[next.id]);

        if (cdn) { const im = new Image(); im.src = cdn; }

      }

      function fallbackImage(id) {

        lbImg.onerror = function () { showToast("โหลดรูปไม่ได้"); };

        lbImg.src = "https://drive.google.com/uc?export=view&id=" + id +

          (apiKey ? "&key=" + apiKey : "");

      }

      function toggleLightboxFullscreen() {
        if (!document.fullscreenElement) {
          if (lightbox.requestFullscreen) lightbox.requestFullscreen().catch(() => {});
          else if (lightbox.webkitRequestFullscreen) lightbox.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        }
      }

      function closeLightbox() {
        const closingPdf = pdfInLightbox;
        lightbox.classList.remove("show");
        lightbox.setAttribute("aria-hidden", "true");
        lbImg.src = "";
        lbImg.style.display = "";
        resetPdfViewer();
        revokeCurrentDoc();
        if (closingPdf) mediaSession++;
        resetImageView();
        cancelImageTap();
        const lbTitleEl = document.getElementById("lbTitle");
        if (lbTitleEl) lbTitleEl.textContent = "";
        if (lbImg._blobUrl) { URL.revokeObjectURL(lbImg._blobUrl); lbImg._blobUrl = null; }
        document.body.style.overflow = "";
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }

      function updateLbCount() {

        const el = document.getElementById("lbCount");

        if (!el) return;

        const list = mediaList("image");

        if (!list.length) { el.textContent = ""; return; }

        const idx = list.findIndex(function (item) { return item.id === lbImg.dataset.fid; });

        el.textContent = (idx >= 0 ? idx + 1 : "-") + " / " + list.length;
        const titleEl = document.getElementById("lbTitle");
        if (titleEl) {
          const item = (idx >= 0 ? list[idx] : null) || (typeof allFiles !== "undefined" && allFiles.find(function (f) { return f.id === lbImg.dataset.fid; }));
          titleEl.textContent = (item && item.name) || "";
        }

      }

      function clampImageScale(v) {
        v = Number(v); if (!isFinite(v)) return 1;
        return Math.min(4, Math.max(1, v));
      }

      function clampImagePan(state, w, h) {
        const s = clampImageScale(state.scale);
        const mx = Math.max(0, (w || 0) * (s - 1) / 2), my = Math.max(0, (h || 0) * (s - 1) / 2);
        return { scale: s, x: Math.min(mx, Math.max(-mx, state.x || 0)) || 0, y: Math.min(my, Math.max(-my, state.y || 0)) || 0 };
      }

      function applyImageView() {
        const surface = pdfInLightbox ? pdfCanvas : lbImg;
        surface.style.transform = 'translate(' + imageView.x + 'px,' + imageView.y + 'px) scale(' + imageView.scale + ')';
      }

      function resetImageView() {
        imageView = { scale: 1, x: 0, y: 0 };
        applyImageView();
        return { scale: imageView.scale, x: imageView.x, y: imageView.y };
      }

      function imageGestureMode(pointerCount, scale) {
        if (pointerCount >= 2) return 'pinch';
        return scale > 1 ? 'pan' : 'swipe';
      }

      function swipeNavigateFor(dx, dy, threshold) {
        threshold = threshold || 48;
        if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? 1 : -1;
        return 0;
      }

      function setImageControlsVisible(visible) {
        const controls = document.querySelectorAll ? document.querySelectorAll('.lightbox .lb-ui') : [];
        const focusEl = document.activeElement;
        if (!visible && focusEl && focusEl.classList && focusEl.classList.contains('lb-ui')) return false;
        for (const el of controls) {
          el.classList.toggle('lb-ui-hidden', !visible);
          el.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }
        imageControlsVisible = !!visible;
        return true;
      }

      function cancelImageTap() {
        if (imgTapTimer !== null) { clearTimeout(imgTapTimer); imgTapTimer = null; }
      }

      function handleImageTap(x, y, moved) {
        if (moved) return 'none';
        const now = Date.now();
        if (now - imgLastTapTime < 300 && Math.abs(x - imgLastTapX) < 40 && Math.abs(y - imgLastTapY) < 40) {
          cancelImageTap();
          imgLastTapTime = 0;
          const surface = pdfInLightbox ? pdfCanvas : lbImg;
          if (imageView.scale > 1.01) { resetImageView(); } else { imageView = clampImagePan({ scale: 2, x: 0, y: 0 }, surface.clientWidth, surface.clientHeight); applyImageView(); }
          setImageControlsVisible(true);
          return 'zoom';
        }
        imgLastTapTime = now; imgLastTapX = x; imgLastTapY = y;
        cancelImageTap();
        imgTapTimer = setTimeout(function () { imgTapTimer = null; setImageControlsVisible(!imageControlsVisible); }, 280);
        return 'single';
      }

      function attachPersonalButtons() {
        const data = readPersonalData();
        filesWrap.querySelectorAll(".personal-file-actions").forEach(el => el.remove());
        filesWrap.querySelectorAll('.file-card[data-kind="video"], .file-card[data-kind="image"]').forEach(card => {
          const actions = document.createElement("div"); actions.className = "personal-file-actions";
          const later = document.createElement("button"); later.type = "button"; later.className = "watched-toggle";
          const saved = data.watchLater.some(x => x.id === card.dataset.id);
          later.textContent = saved ? "✓ ดูภายหลัง" : "+ ดูภายหลัง"; later.setAttribute("aria-pressed", String(saved));
          later.onclick = event => {
            event.stopPropagation();
            const thumbImg = card.querySelector(".thumb-img");
            if (thumbImg && thumbImg.src) {
              try { localStorage.setItem("gdv_thumb_" + card.dataset.id, thumbImg.src); } catch (_) {}
              if (typeof mediaThumbs !== "undefined" && mediaThumbs) mediaThumbs[card.dataset.id] = thumbImg.src;
            }
            if (updatePersonalData(state => {
              state.watchLater = state.watchLater.filter(x => x.id !== card.dataset.id);
              if (!saved) state.watchLater.unshift({ id: card.dataset.id, name: card.dataset.name, kind: card.dataset.kind });
            })) { renderPersonalLibrary(); attachPersonalButtons(); }
          };
          actions.appendChild(later);
          if (card.dataset.kind === "image") {
            const cover = document.createElement("button"); cover.type = "button"; cover.className = "watched-toggle";
            const folderId = navStack.length ? navStack[navStack.length - 1].id : null;
            const selected = data.covers.some(x => x.id === folderId && x.fileId === card.dataset.id);
            cover.textContent = selected ? "✓ ปกโฟลเดอร์นี้" : "ใช้เป็นปกโฟลเดอร์";
            cover.setAttribute("aria-pressed", String(selected));
            cover.onclick = event => {
              event.stopPropagation(); if (!folderId) return;
              if (updatePersonalData(state => { state.covers = state.covers.filter(x => x.id !== folderId); state.covers.push({ id: folderId, fileId: card.dataset.id }); })) { refreshFolderCovers(); attachPersonalButtons(); }
            };
            actions.appendChild(cover);
          }
          card.querySelector(".file-meta-content").appendChild(actions);
        });
      }

      function fallbackIframe(id) {
        if (!videoModal.classList.contains("show") || vidCurrentId !== id) return;
        cancelVideoBlobTransfer();
        cancelVideoAttempt();
        vidPlayer.oncanplay = null;
        vidPlayer.onerror = null;
        vidPlayer.pause();
        vidPlayer.removeAttribute("src");
        vidPlayer.load();
        vidPlayer.style.display = "none";
        configurePreviewFullscreen();
        vidFrame.setAttribute('data-video-preview', 'true');
        vidFrame.style.display = "block";
        applyPreviewAspect(id);
        fitVideoPreview();
        setVideoStatus('preview', 'พรีวิว Google ใช้บัญชีแยกจากเว็บนี้ บนมือถือให้ใช้ปุ่ม “เต็มจอ” ด้านบน · หากขึ้นกำลังประมวลผลหรือดูไม่ได้ กด “โหลดทั้งไฟล์แทน” หรือ “เปิดใน VLC / แอปนอก” ด้านล่าง');
        vidFrame.src = "https://drive.google.com/file/d/" + id + "/preview";
      }

      function resetPdfViewer() {
        pdfRenderVersion++;
        if (pdfRenderTask) { try { pdfRenderTask.cancel(); } catch (_) {} pdfRenderTask = null; }
        if (pdfDocument) { try { Promise.resolve(pdfDocument.destroy()).catch(function () {}); } catch (_) {} pdfDocument = null; }
        if (pdfStage) pdfStage.hidden = true;
        if (pdfControls) pdfControls.hidden = true;
        if (pdfCanvas) { pdfCanvas.width = 0; pdfCanvas.height = 0; pdfCanvas.style.transform = ''; }
        if (pdfLoading) pdfLoading.hidden = false;
        if (lightbox) lightbox.removeAttribute('data-viewer');
        if (typeof lbPrev !== 'undefined' && lbPrev) lbPrev.disabled = false;
        if (typeof lbNext !== 'undefined' && lbNext) lbNext.disabled = false;
        pdfInLightbox = false;
      }

      function loadPdfLibrary() {
        if (!pdfLibraryPromise) {
          pdfLibraryPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs')
            .then(function (pdfjs) {
              pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
              return pdfjs;
            })
            .catch(function (error) { pdfLibraryPromise = null; throw error; });
        }
        return pdfLibraryPromise;
      }

      function updatePdfNavState() {
        const total = pdfDocument && pdfDocument.numPages ? pdfDocument.numPages : 0;
        if (pdfPageCount) pdfPageCount.textContent = total ? (pdfPageNumber + ' / ' + total) : '…';
        const prevBtn = document.getElementById('pdfPrev');
        const nextBtn = document.getElementById('pdfNext');
        const atStart = !total || pdfPageNumber <= 1;
        const atEnd = !total || pdfPageNumber >= total;
        const hasSiblingMedia = pdfInLightbox && typeof filesWrap !== 'undefined' && filesWrap && mediaList('image').length > 1;
        if (prevBtn) prevBtn.disabled = atStart && !hasSiblingMedia;
        if (nextBtn) nextBtn.disabled = atEnd && !hasSiblingMedia;
        if (pdfInLightbox) {
          if (typeof lbPrev !== 'undefined' && lbPrev) lbPrev.disabled = atStart && !hasSiblingMedia;
          if (typeof lbNext !== 'undefined' && lbNext) lbNext.disabled = atEnd && !hasSiblingMedia;
        }
      }

      function stepPdfPage(dir, allowMediaFallback) {
        if (!pdfInLightbox) return false;
        if (pdfDocument && pdfDocument.numPages) {
          const nextPage = pdfPageNumber + dir;
          if (nextPage >= 1 && nextPage <= pdfDocument.numPages) {
            pdfPageNumber = nextPage;
            if (pdfStage) pdfStage.scrollTop = 0;
            resetImageView();
            updatePdfNavState();
            renderPdfPage();
            return true;
          }
        }
        if (allowMediaFallback && typeof filesWrap !== 'undefined' && filesWrap && mediaList('image').length > 1) {
          navigateMedia('image', dir);
          return true;
        }
        return false;
      }

      async function renderPdfPage() {
        if (!pdfDocument || !pdfStage || pdfStage.hidden) return;
        const renderVersion = ++pdfRenderVersion;
        const targetPage = pdfPageNumber;
        updatePdfNavState();
        while (pdfRenderTask) {
          const prevTask = pdfRenderTask;
          try { prevTask.cancel(); } catch (_) {}
          try { await prevTask.promise; } catch (_) {}
          if (pdfRenderTask === prevTask) pdfRenderTask = null;
          if (renderVersion !== pdfRenderVersion || !pdfDocument || !pdfStage || pdfStage.hidden) return;
        }
        let renderTask = null;
        try {
          const page = await pdfDocument.getPage(targetPage);
          while (pdfRenderTask) {
            const prevTask = pdfRenderTask;
            try { prevTask.cancel(); } catch (_) {}
            try { await prevTask.promise; } catch (_) {}
            if (pdfRenderTask === prevTask) pdfRenderTask = null;
          }
          if (renderVersion !== pdfRenderVersion || !pdfDocument || !pdfStage || pdfStage.hidden) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const stageStyle = window.getComputedStyle(pdfStage);
          const width = Math.max(1, pdfStage.clientWidth - parseFloat(stageStyle.paddingLeft) - parseFloat(stageStyle.paddingRight));
          const height = Math.max(1, pdfStage.clientHeight - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom));
          const fitScale = pdfFitMode === 'page'
            ? Math.min(width / baseViewport.width, height / baseViewport.height)
            : width / baseViewport.width;
          const scale = pdfFitMode ? fitScale : pdfScale;
          const cssViewport = page.getViewport({ scale: scale });
          const maxPixels = 12 * 1024 * 1024;
          const pixelRatio = Math.max(0.5, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(maxPixels / (cssViewport.width * cssViewport.height))));
          const renderViewport = page.getViewport({ scale: scale * pixelRatio });
          pdfCanvas.width = Math.ceil(renderViewport.width);
          pdfCanvas.height = Math.ceil(renderViewport.height);
          pdfCanvas.style.width = cssViewport.width + 'px';
          pdfCanvas.style.height = cssViewport.height + 'px';
          const context = pdfCanvas.getContext('2d', { alpha: false });
          context.fillStyle = '#fff';
          context.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
          renderTask = page.render({ canvasContext: context, viewport: renderViewport });
          pdfRenderTask = renderTask;
          await renderTask.promise;
          if (renderVersion === pdfRenderVersion) {
            updatePdfNavState();
          }
        } catch (error) {
          if (renderVersion !== pdfRenderVersion) return;
          if (error && (error.name === 'RenderingCancelledException' || /cancelled|multiple render/i.test(error.message || ''))) return;
          console.warn('PDF page render failed', error);
          if (pdfInLightbox && lightbox.classList.contains('show') && targetPage === 1 && !pdfCanvas.width) {
            fallbackPdfToDrive(lbImg.dataset.fid, vidTitle.textContent);
          }
        } finally {
          if (renderTask && pdfRenderTask === renderTask) pdfRenderTask = null;
        }
      }

      async function openPdfBlob(blob, id, session) {
        pdfInLightbox = true;
        lightbox.dataset.viewer = 'pdf';
        lbImg.style.display = 'none';
        pdfStage.hidden = false;
        pdfControls.hidden = false;
        pdfPageNumber = 1;
        pdfFitMode = 'page';
        pdfLoadingState(true, 'กำลังเตรียมหน้า PDF…');
        try {
          const pdfjs = await loadPdfLibrary();
          if (session !== mediaSession || !lightbox.classList.contains('show')) return;
          const docSource = blob && typeof blob.arrayBuffer === 'function' ? { data: await blob.arrayBuffer() } : { url: currentDocUrl };
          if (session !== mediaSession || !lightbox.classList.contains('show')) return;
          const loadingTask = pdfjs.getDocument(docSource);
          const loadedDocument = await loadingTask.promise;
          if (session !== mediaSession || !lightbox.classList.contains('show')) { Promise.resolve(loadedDocument.destroy()).catch(function () {}); return; }
          pdfDocument = loadedDocument;
          updatePdfNavState();
          pdfLoadingState(false);
          await renderPdfPage();
        } catch (error) {
          if (session !== mediaSession || !lightbox.classList.contains('show')) return;
          console.warn('PDF.js viewer unavailable; falling back to Google preview', error);
          fallbackPdfToDrive(id, vidTitle.textContent);
        }
      }

      function pdfLoadingState(loading, message) {
        if (loading) {
          pdfLoadingText.textContent = message || 'กำลังโหลด PDF…';
          pdfLoading.hidden = false;
        } else {
          pdfLoading.hidden = true;
        }
      }

      function fitPdfScale(page) {
        const viewport = page.getViewport({ scale: 1 });
        const style = window.getComputedStyle(pdfStage);
        const width = pdfStage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = pdfStage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        return Math.min(Math.max(1, width) / viewport.width, Math.max(1, height) / viewport.height);
      }

      function zoomPdf(multiplier) {
        if (!pdfDocument) return;
        pdfDocument.getPage(pdfPageNumber).then(function (page) {
          const baseScale = pdfFitMode ? fitPdfScale(page) : pdfScale;
          pdfScale = Math.min(4, Math.max(0.25, baseScale * multiplier));
          pdfFitMode = null;
          resetImageView();
          renderPdfPage();
        });
      }

      function fallbackPdfToDrive(id, name) {
        if (lightbox.classList.contains('show')) closeLightbox();
        openDocument(id, name, 'application/pdf', true);
      }

      function openPdfDocument(id, name, mimeType) {
        if (videoModal.classList.contains('show')) closeVideo();
        if (lightbox.classList.contains('show')) closeLightbox();
        mediaPreviousOverflow = document.body.style.overflow;
        resetMediaPlayback();
        const session = mediaSession;
        const auth = authParams();
        vidTitle.textContent = name || 'PDF';
        const lbTitleEl = document.getElementById('lbTitle');
        if (lbTitleEl) lbTitleEl.textContent = name || 'PDF';
        vidOpenTab.href = 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
        currentMediaIndex = -1;
        currentMediaKind = 'pdf';
        lbImg.dataset.fid = id;
        lbImg.style.display = 'none';
        lbImg.src = '';
        setImageControlsVisible(true);
        cancelImageTap();
        resetImageView();
        pdfStage.hidden = false;
        pdfControls.hidden = false;
        pdfInLightbox = true;
        lightbox.dataset.viewer = 'pdf';
        lightbox.classList.add('show');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        pdfPageNumber = 1;
        pdfFitMode = 'page';
        pdfLoadingState(true, 'กำลังโหลด PDF…');
        updatePdfNavState();
        updateLbCount();
        if (auth.mode === 'none') { fallbackPdfToDrive(id, name); return; }
        const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media' + (auth.mode === 'key' ? '&key=' + apiKey : '');
        const headers = auth.mode === 'bearer' ? { Authorization: 'Bearer ' + accessToken } : {};
        getBlobCached(origCacheKey(id), url, headers, function (event) {
          if (session !== mediaSession || !event.lengthComputable) return;
          pdfLoadingState(true, 'กำลังโหลด PDF… ' + Math.round(event.loaded / event.total * 100) + '%');
        }).then(function (blob) {
          if (session !== mediaSession || !lightbox.classList.contains('show')) return;
          revokeCurrentDoc();
          currentDocUrl = URL.createObjectURL(blob);
          openPdfBlob(blob, id, session);
        }).catch(function () {
          if (session !== mediaSession || !lightbox.classList.contains('show')) return;
          fallbackPdfToDrive(id, name);
        });
      }

      function revokeCurrentDoc() {

        if (currentDocUrl) {

          URL.revokeObjectURL(currentDocUrl);

          currentDocUrl = null;

        }

      }

      function openDocument(id, name, mimeType, forceDrivePreview) {
        const isPdf = !forceDrivePreview && (String(mimeType || '').toLowerCase().split(';')[0].trim() === 'application/pdf' || /\.pdf$/i.test(name || ''));
        if (isPdf) { openPdfDocument(id, name, mimeType); return; }
        if (lightbox.classList.contains("show")) closeLightbox();
        if (!videoModal.classList.contains("show")) mediaPreviousOverflow = document.body.style.overflow;
        resetMediaPlayback();
        vidFrame.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
        vidFrame.setAttribute('allowfullscreen', '');
        const session = mediaSession;
        vidCurrentId = null;
        lbImg.dataset.fid = id;
        currentMediaIndex = -1;
        currentMediaKind = "pdf";
        document.body.style.overflow = "hidden";

        vidTitle.textContent = name || "เอกสาร";

        vidOpenTab.href = "https://drive.google.com/file/d/" + id + "/view";

        vidPlayer.pause();

        vidPlayer.removeAttribute("src");

        vidPlayer.style.display = "none";

        vidLoading.classList.remove("show");

        vidFrame.style.display = "block";

        revokeCurrentDoc();

        // ใช้ blob + iframe เปิดเอกสาร (PDF/office) ผ่าน alt=media ไม่ติด quota (+ แคช ดูซ้ำได้ทันที)

        const auth = authParams();

        if (auth.mode !== "none") {

          const url = "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media" +

            (auth.mode === "key" ? "&key=" + apiKey : "");

          const headers = auth.mode === "bearer" ? { Authorization: "Bearer " + accessToken } : {};

          vidLoading.classList.add("show");

          vidLoadingText.textContent = "กำลังโหลดเอกสาร…";

          vidProgressBar.style.width = "0%";

          getBlobCached(origCacheKey(id), url, headers,

            function (e) {

              if (session !== mediaSession) return;
              if (e.lengthComputable) {

                vidProgressBar.style.width = Math.round(e.loaded / e.total * 100) + "%";

                vidLoadingText.textContent = "กำลังโหลดเอกสาร… " + Math.round(e.loaded / e.total * 100) + "%";

              }

            })

          .then(function (blob) {
              if (session !== mediaSession) return;

              vidLoading.classList.remove("show");

              revokeCurrentDoc();

              currentDocUrl = URL.createObjectURL(blob);
              vidFrame.src = currentDocUrl;

            })

          .catch(function () { if (session !== mediaSession) return; vidLoading.classList.remove("show"); fallbackDocIframe(id); });

        } else {

          fallbackDocIframe(id);

        }

        videoModal.classList.add("show");

        videoModal.setAttribute("aria-hidden", "false");

      }

      function fallbackDocIframe(id) {

        vidLoading.classList.remove("show");

        resetPdfViewer();

        vidFrame.style.display = "block";

        revokeCurrentDoc();

        vidFrame.src = "https://drive.google.com/file/d/" + id + "/preview";

      }
    // Async declarations inside with are block-scoped; capture before leaving.
    with (appApi) {
      asyncBridge.renderPdfPage = renderPdfPage;
      asyncBridge.openPdfBlob = openPdfBlob;
    }
  }

  const { renderPdfPage, openPdfBlob } = asyncBridge;
  appApi.media = {
    mediaList,
    navigateMedia,
    openLightbox,
    loadOriginalImage,
    prefetchNextImage,
    fallbackImage,
    toggleLightboxFullscreen,
    closeLightbox,
    updateLbCount,
    clampImageScale,
    clampImagePan,
    applyImageView,
    resetImageView,
    imageGestureMode,
    swipeNavigateFor,
    setImageControlsVisible,
    cancelImageTap,
    handleImageTap,
    attachPersonalButtons,
    fallbackIframe,
    resetPdfViewer,
    loadPdfLibrary,
    updatePdfNavState,
    stepPdfPage,
    renderPdfPage,
    openPdfBlob,
    pdfLoadingState,
    fitPdfScale,
    zoomPdf,
    fallbackPdfToDrive,
    openPdfDocument,
    revokeCurrentDoc,
    openDocument,
    fallbackDocIframe
  };

  // Keep the production browser script classic/no-bundler, while allowing Node
  // tests to require this module directly and inspect its public API.
  if (typeof module !== "undefined" && module.exports) module.exports = appApi.media;
})();
