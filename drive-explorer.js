// drive-explorer.js — Drive Explorer IIFE
// Depends on: collections-data.js (XBEP_COLLECTION), window.GDVVideoApi (video helpers)
// Depends on: window.GDVExplorerApi (the explicit boundary to the main app)
//
// Bridge contract: every shared value below is read/written as a bare
// identifier, which resolves against `with (appApi)`. The main app therefore
// owns the state and must expose it as live accessors:
//
//   accessors (get/set)   accessToken, apiKey, clientId, tokenExpiry, tokenClient,
//                         tokenResolver, userProfile, authRestoreAttempted,
//                         navStack, driveLink, displayedFolderId, folderPositions,
//                         folderRequest, folderAbort, currentFolderId, allFiles,
//                         mediaThumbs, folderCoverQueue, folderCoverActive,
//                         pdfInLightbox, vidCurrentId
//   read-only values      clientIdInput, clientIdDot, clientIdStatus, clientIdText,
//                         apiKeyInput, keyDot, keyStatus, keyStatusText, keyStatusText,
//                         settingsHint, authBtnText, userInfo, breadcrumb, filesWrap,
//                         mobileBar, mbSearch, folderCoverCache, folderCoverObserved,
//                         folderCoverObserver, google
//   helpers (functions)   lsGet, lsSet, escapeHtml, escapeAttr, formatSize,
//                         formatDateTh, fileTypeOf, fileExt, fileIconKind,
//                         genericIconSvg, showToast, squirtFile, readPersonalData,
//                         attachPersonalButtons, attachWatchedButtons, openLightbox,
//                         openDocument, openVideo, stepPdfPage, mediaList,
//                         navigateMedia, ensureFolderName, renderNeedAuth
//
// The module publishes its 34 top-level functions back on
// window.GDVExplorerApi.explorer so the main app can call them after this script
// has run. Copied bodies are byte-for-byte verbatim; only this header, the `with`
// wrapper and the export block are new. (No "use strict": the `with` statement
// that binds the bare identifiers is illegal in strict mode.)
(function () {
  const appApi = window.GDVExplorerApi;
  if (!appApi) throw new Error("Drive explorer requires GDVExplorerApi");

  // Holder for the async function declarations inside the `with` block below;
  // see the comment where it is filled in.
  const asyncBridge = {};

  with (appApi) {
      function refreshClientIdStatus() {

        const isSet = !!clientId;

        clientIdDot.classList.toggle("set", isSet);

        clientIdStatus.classList.toggle("text-set", isSet);

        clientIdText.textContent = isSet ? "Client ID พร้อมใช้งาน ✓" : "ยังไม่ได้ตั้ง Client ID";

        clientIdInput.value = clientId;

        refreshSettingsHint();

        initTokenClient();

      }

      function refreshKeyStatus() {

        const isSet = !!apiKey;

        keyDot.classList.toggle("set", isSet);

        keyStatus.classList.toggle("text-set", isSet);

        keyStatusText.textContent = isSet ? "API Key พร้อมใช้งาน ✓" : "ยังไม่ได้ตั้ง API Key";

        apiKeyInput.value = apiKey;

        refreshSettingsHint();

      }

      function refreshSettingsHint() {

        const ok = !!clientId && !!apiKey;

        settingsHint.textContent = ok ? "ตั้งค่าไว้แล้ว ✓ (คลิกเพื่อแก้ไข)" : "ตั้งค่ายังไม่ครบ — คลิกเพื่อตั้งค่า";

        settingsHint.style.color = ok ? "var(--success)" : "var(--danger)";

      }

      function waitForGis(cb) {

        let waited = 0;

        (function poll() {

          if (window.google && google.accounts && google.accounts.oauth2) { cb(); return; }

          if (waited >= 15000) { showToast("โหลด Google Sign-In ไม่สำเร็จ — ตรวจอินเทอร์เน็ตหรือสคริปต์ถูกบล็อก"); return; }

          waited += 200;

          setTimeout(poll, 200);

        })();

      }

      function finishTokenRequest(resp) {
        if (resp && !resp.error && resp.access_token) {
          accessToken = resp.access_token;
          tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
          lsSet('gdv_auth_remember', clientId);
          fetchUserProfile();
        } else {
          accessToken = null;
          tokenExpiry = 0;
          userProfile = null;
        }
        refreshAuthUI(!!accessToken);
        try{window.dispatchEvent(new CustomEvent("gdv-auth",{detail:{signedIn:!!accessToken}}));}catch(_){}
        const resolve = tokenResolver;
        tokenResolver = null;
        if (resolve) resolve(accessToken);
      }

      function initTokenClient() {
        if (!clientId) return;
        waitForGis(function () {
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.appdata",
            callback: finishTokenRequest,
            error_callback: function () { finishTokenRequest(null); }
          });
          refreshAuthUI(!!accessToken);
          if (!authRestoreAttempted && !accessToken && lsGet('gdv_auth_remember') === clientId) {
            authRestoreAttempted = true;
            // Best effort only: browsers can block this popup without a user gesture.
            // Never loop; leave a reconnect button when interaction is required.
            try { tokenClient.requestAccessToken({prompt: 'none'}); }
            catch (_) { finishTokenRequest(null); }
          }
        });
      }

      function ensureToken(forceRefresh) {
        return new Promise(function (resolve) {
          if (forceRefresh) {
            accessToken = null;
            tokenExpiry = 0;
            userProfile = null;
            refreshAuthUI(false);
          }
          if (accessToken && Date.now() < tokenExpiry - 60000) { resolve(accessToken); return; }
          if (!tokenClient || tokenResolver) { resolve(null); return; }
          tokenResolver = resolve;
          const remembered = lsGet('gdv_auth_remember') === clientId;
          try { tokenClient.requestAccessToken({prompt: accessToken || remembered ? '' : 'consent'}); }
          catch (_) { finishTokenRequest(null); }
        });
      }

      function switchGoogleAccount() {
        // เปิดหน้าเลือกบัญชีของ Google แล้วคืน token ของบัญชีที่เลือก (null ถ้าถูกยกเลิก)
        return new Promise(function (resolve) {
          if (!tokenClient || tokenResolver) { resolve(null); return; }
          tokenResolver = resolve;
          try { tokenClient.requestAccessToken({prompt: "select_account"}); }
          catch (_) { finishTokenRequest(null); }
        });
      }

      async function fetchUserProfile() {

        if (!accessToken) return;
        const profileToken = accessToken;

        try {

          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {

            headers: { Authorization: "Bearer " + accessToken }

          });

          if (res.ok) {
            const profile = await res.json();
            if (accessToken === profileToken) { userProfile = profile; refreshAuthUI(true); }
          }

        } catch (_) {}

      }

      function refreshAuthUI(signedIn) {

        if (signedIn && userProfile) {

          userInfo.innerHTML =

            '<img src="' + escapeAttr(userProfile.picture) + '" alt="" />' +

            '<div class="user-text">' +

              '<div class="user-name">' + escapeHtml(userProfile.name || "ผู้ใช้") + '</div>' +

              '<div class="user-email">' + escapeHtml(userProfile.email || "") + '</div>' +

            '</div>';

          authBtnText.textContent = "ออกจากระบบ";

        } else if (signedIn) {

          userInfo.innerHTML = '<span class="auth-placeholder">ลงชื่อเข้าใช้แล้ว ✓</span>';

          authBtnText.textContent = "ออกจากระบบ";

        } else {

          const remembered = lsGet('gdv_auth_remember') === clientId;
          userInfo.innerHTML = '<span class="auth-placeholder">' + (remembered ? 'จำการเชื่อมต่อ Google ไว้แล้ว · กดเชื่อมต่ออีกครั้งหากเบราว์เซอร์ไม่อนุญาตให้อัตโนมัติ' : 'ยังไม่ได้ลงชื่อเข้าใช้ Google') + '</span>';
          authBtnText.textContent = remembered ? "เชื่อมต่อ Google อีกครั้ง" : "ลงชื่อเข้าใช้ Google";

        }

      }

      function extractId(raw) {

              if (!raw) return null;

              // ลบช่องว่าง/นิวไลน์/แท็บทั้งหมดก่อน parse (กันลิงก์จาก Messenger/LINE ที่มีช่องว่างแทรก)

              const url = String(raw).replace(/\s+/g, "").trim();

              if (!url) return null;

        let m = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]{20,})/); if (m) return m[1];

        m = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/); if (m) return m[1];

        m = url.match(/[?&#]id=([a-zA-Z0-9_-]{20,})/); if (m) return m[1];

        if (!/\s/.test(url) && /^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;

        return null;

      }

      function authParams() {

        if (accessToken) return { mode: "bearer", headers: { Authorization: "Bearer " + accessToken } };

        if (apiKey) return { mode: "key" };

        return { mode: "none" };

      }

      async function openFolderAndReveal(folderId, folderName) {
        await listFolder(folderId, folderName);
      }

      function saveFolderPosition() {
        if (!displayedFolderId) return;
        const search = document.getElementById("fileSearch");
        folderPositions.set(displayedFolderId, { y: window.scrollY, query: search ? search.value : "" });
      }

      function loadFavoriteFolders() {
        try {
          const data = JSON.parse(lsGet("gdv_favorites") || "[]");
          return Array.isArray(data) ? data.filter(x => x && typeof x.id === "string" && /^[\w-]+$/.test(x.id) && typeof x.name === "string") : [];
        } catch (_) { return []; }
      }

      function renderFavoriteFolders() {
        let section = document.getElementById("favoriteFolders");
        const drawerMount = document.getElementById("myLibraryContent");
        if (!section) {
          section = document.createElement("section");
          section.id = "favoriteFolders";
          section.className = "favorite-folders";
          if (drawerMount) drawerMount.appendChild(section);
          else document.getElementById("browserCard").before(section);
        } else if (drawerMount && section.parentElement !== drawerMount) {
          drawerMount.appendChild(section);
        }
        section.innerHTML = '<h3>★ รายการโปรด</h3><p>บันทึกในเบราว์เซอร์นี้ · เปิดโฟลเดอร์แล้วกด ☆ เพื่อเพิ่ม</p>';
        const favs = loadFavoriteFolders();
        if (!favs.length) {
          if (window.updateMyLibraryBadge) window.updateMyLibraryBadge();
          return;
        }
        const grid = document.createElement("div");
        grid.className = "resume-grid";
        favs.forEach(item => {
          const row = document.createElement("div");
          row.className = "favorite-folder resume-card";
          const open = document.createElement("button");
          open.type = "button";
          open.className = "resume-btn";
          const safeName = (item.name || "").replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
          open.innerHTML = `
            <div class="resume-thumb-box is-folder" aria-hidden="true">
              <span class="resume-play-glyph">📁</span>
            </div>
            <div class="resume-info">
              <span class="resume-title" title="${safeName}">${safeName}</span>
              <span class="resume-time-tag">★ โฟลเดอร์โปรด</span>
            </div>
          `;
          open.onclick = () => {
            if (window.closeMyLibraryDrawer) window.closeMyLibraryDrawer();
            navStack = [{ id: item.id, name: item.name }];
            pushHash(item.id);
            openFolderAndReveal(item.id, item.name);
          };
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "favorite-remove-btn";
          remove.textContent = "×";
          remove.setAttribute("aria-label", "ลบ " + item.name + " จากรายการโปรด");
          remove.onclick = (e) => {
            e.stopPropagation();
            lsSet("gdv_favorites", JSON.stringify(loadFavoriteFolders().filter(x => x.id !== item.id)));
            renderFavoriteFolders();
            renderBreadcrumb();
          };
          row.append(open, remove);
          grid.appendChild(row);
        });
        section.appendChild(grid);
        if (window.updateMyLibraryBadge) window.updateMyLibraryBadge();
      }

      function showFolderCoverStatus(target, failed) {
        if (!target.isConnected) return;
        const previous = target.querySelector(".cover-status");
        if (previous) previous.remove();
        const status = document.createElement(failed ? "button" : "span");
        status.className = "cover-status";
        status.textContent = failed ? "โหลดปกไม่สำเร็จ · ลองใหม่" : "ไม่มีภาพตัวอย่าง";
        if (failed) {
          status.type = "button";
          status.onclick = event => {
            event.stopPropagation();
            status.remove();
            folderCoverQueue.push(target);
            drainFolderCovers();
          };
        }
        target.appendChild(status);
      }

      async function findFolderCover(folderId) {
        const auth = authParams();
        if (auth.mode === "none") return null;
        const signal = AbortSignal.timeout(12000);
        const selected = readPersonalData().covers.find(item => item.id === folderId);
        if (selected) {
          let url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(selected.fileId) + "?fields=thumbnailLink,mimeType";
          if (auth.mode === "key") url += "&key=" + encodeURIComponent(apiKey);
          const response = await fetch(url, { headers: auth.headers || {}, signal });
          if (!response.ok) throw new Error("Selected cover unavailable");
          const file = await response.json();
          if (!file.thumbnailLink) throw new Error("Selected cover has no thumbnail");
          return { url: file.thumbnailLink, video: false };
        }
        let pageToken = "";
        // Bound API work; only inspect media directly inside this folder.
        for (let page = 0; page < 3; page++) {
          const query = "'" + folderId.replace(/'/g, "\\'") + "' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')";
          let url = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(query) +
            "&orderBy=name&pageSize=100&fields=files(thumbnailLink,mimeType),nextPageToken";
          if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
          if (auth.mode === "key") url += "&key=" + encodeURIComponent(apiKey);
          const response = await fetch(url, { headers: auth.headers || {}, signal });
          if (!response.ok) throw new Error("Folder cover unavailable");
          const data = await response.json();
          const file = (data.files || []).find(f => f.thumbnailLink);
          if (file) return { url: file.thumbnailLink, video: file.mimeType.startsWith("video/") };
          pageToken = data.nextPageToken;
          if (!pageToken) break;
        }
        return null;
      }

      function observeFolderCovers(root) {
        folderCoverObserved.forEach(el => {
          if (!el.isConnected) {
            folderCoverObserver.unobserve(el);
            folderCoverObserved.delete(el);
          }
        });
        root.querySelectorAll("[data-folder-cover]").forEach(el => {
          if (el.dataset.coverObserved) return;
          el.dataset.coverObserved = "1";
          if (folderCoverObserver) {
            folderCoverObserved.add(el);
            folderCoverObserver.observe(el);
          } else folderCoverQueue.push(el);
        });
        drainFolderCovers();
      }

      function drainFolderCovers() {
        while (folderCoverActive < 3 && folderCoverQueue.length) {
          const target = folderCoverQueue.shift();
          if (!target.isConnected || readPersonalData().hideCovers) continue;
          const coverVersion = target.dataset.coverVersion;
          folderCoverActive++;
          const id = target.dataset.folderCover;
          const key = (accessToken || apiKey) + ":" + id;
          let cached = folderCoverCache.get(key);
          if (!cached || cached.expires < Date.now()) {
            cached = { expires: Date.now() + 300000, value: findFolderCover(id) };
            folderCoverCache.set(key, cached);
            if (folderCoverCache.size > 300) folderCoverCache.delete(folderCoverCache.keys().next().value);
          }
          cached.value.then(cover => {
            if (!target.isConnected || target.dataset.coverVersion !== coverVersion || readPersonalData().hideCovers) return;
            if (!cover) { showFolderCoverStatus(target, false); return; }
            const img = document.createElement("img");
            img.className = "thumb-img";
            img.alt = "";
            img.decoding = "async";
            img.onload = () => {
              if (!target.isConnected || target.dataset.coverVersion !== coverVersion || readPersonalData().hideCovers) return;
              target.appendChild(img);
              if (cover.video) {
                const badge = document.createElement("span");
                badge.className = "folder-video-badge";
                badge.textContent = "▶";
                badge.title = "ปกจากวิดีโอ";
                target.appendChild(badge);
              }
            };
            img.onerror = () => { folderCoverCache.delete(key); if (target.dataset.coverVersion === coverVersion && !readPersonalData().hideCovers) showFolderCoverStatus(target, true); };
            img.src = cover.url;
          }).catch(() => { folderCoverCache.delete(key); if (target.dataset.coverVersion === coverVersion && !readPersonalData().hideCovers) showFolderCoverStatus(target, true); }).finally(() => {
            folderCoverActive--;
            drainFolderCovers();
          });
        }
      }

      async function listFolder(folderId, folderName) {
        saveFolderPosition();
        displayedFolderId = null;
        const request = ++folderRequest;
        if (folderAbort) folderAbort.abort();
        const controller = folderAbort = new AbortController();
        renderBreadcrumb();

        const auth = authParams();
        if (auth.mode === "none") { renderNeedAuth(); return; }

        renderLoading(folderName);
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
          let collected = [];
          let pageToken = null;

          while (true) {
            let url = "https://www.googleapis.com/drive/v3/files?q=" +
              encodeURIComponent("'" + folderId + "' in parents and trashed=false") +
              "&orderBy=folder,name&pageSize=1000&fields=files(id,name,mimeType,thumbnailLink,iconLink,modifiedTime,size,videoMediaMetadata(width,height)),nextPageToken";
            if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
            if (auth.mode === "key") url += "&key=" + apiKey;

            const res = await fetch(url, { headers: auth.headers || {}, signal: controller.signal });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              const failure = new Error(err.error?.message || ("HTTP " + res.status));
              failure.status = res.status;
              failure.reason = (err.error && err.error.errors && err.error.errors[0] && err.error.errors[0].reason) || "";
              throw failure;
            }
            const data = await res.json();
            if (request !== folderRequest) return;
            collected = collected.concat(data.files || []);
            pageToken = data.nextPageToken;
            if (!pageToken) break;
          }

          if (request === folderRequest) {
            renderFiles(collected);
            displayedFolderId = folderId;
            const saved = folderPositions.get(folderId);
            const search = document.getElementById("fileSearch");
            if (saved && search) {
              search.value = saved.query;
              search.dispatchEvent(new Event("input"));
            }
            requestAnimationFrame(() => {
              if (request !== folderRequest) return;
              if (saved) window.scrollTo({ top: saved.y, behavior: "instant" });
              else document.getElementById("browserCard").scrollIntoView({ block: "start", behavior: "instant" });
            });
          }
        } catch (e) {
          if (request !== folderRequest) return;
          renderApiError(e, folderId);
        } finally {
          clearTimeout(timeout);
        }
      }

      function renderLoading(targetName) {
        let cards = "";
        for (let i = 0; i < 8; i++) {
          cards += '<div class="sk-card"><div class="sk-thumb"></div><div class="sk-line"></div><div class="sk-line short"></div></div>';
        }
        const current = navStack[navStack.length - 1];
        const name = targetName || (current ? current.name : "โฟลเดอร์");
        filesWrap.innerHTML =
          '<div class="folder-loading-box" role="status">' +
            '<div class="folder-loading-header">' +
              '<span class="folder-spinner" aria-hidden="true"></span>' +
              '<span>กำลังเปิดโฟลเดอร์: <strong style="color:var(--text-strong);">' + escapeHtml(name) + '</strong>…</span>' +
            '</div>' +
            '<div class="sk-grid" aria-hidden="true">' + cards + '</div>' +
          '</div>';
      }

      function classifyApiError(code, reason, signedIn) {
        if ((code >= 500 && code <= 599) || reason === "backendError") return "server";
        if (code === 429) return "quota";
        if (code === 404) return "notfound";
        if (code === 401) return signedIn ? "session" : "signedout";
        if (code === 403) {
          if (/(rateLimit|QuotaExceeded|dailyLimit|quota|sharingRateLimit)/i.test(reason || "")) return "quota";
          return signedIn ? "permission" : "signedout";
        }
        return "network";
      }

      function renderApiError(errorObj, folderId) {
        const code = errorObj ? errorObj.status : null;
        const reason = errorObj ? (errorObj.reason || "") : "";
        const isAbort = errorObj && (errorObj.name === "AbortError" || (errorObj.message && errorObj.message.includes("aborted")));
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        const signedIn = !!accessToken;

        let errCategory = classifyApiError(code, reason, signedIn);
        let badgeText = "📡 เครือข่าย / สัญญาณขัดข้อง";
        let titleText = "เชื่อมต่อไม่สำเร็จ หรือคำขอหมดเวลา";
        let descText = isAbort
          ? "โหลดนานเกิน 30 วินาที หรือถูกยกเลิกเนื่องจากสัญญาณช้า กรุณากดลองใหม่อีกครั้ง"
          : isOffline
            ? "อุปกรณ์ของคุณออฟไลน์อยู่ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
            : (errorObj && errorObj.message) ? escapeHtml(errorObj.message) : "ไม่สามารถติดต่อ Google Drive API ได้ กรุณาลองใหม่อีกครั้ง";

        if (errCategory === "signedout") {
          badgeText = "🔑 ยังไม่ได้ลงชื่อเข้าใช้";
          titleText = "ลงชื่อเข้าใช้ก่อนถึงจะเปิดโฟลเดอร์นี้ได้";
          descText = "ตอนนี้แอปทำงานในโหมดสาธารณะ (ยังไม่ได้ลงชื่อเข้าใช้) จึงเห็นได้เฉพาะโฟลเดอร์สาธารณะ — โฟลเดอร์ที่เจ้าของแชร์ให้บัญชีเฉพาะจะขึ้นว่าไม่มีสิทธิ์เสมอ ลงชื่อเข้าใช้ด้วยบัญชี Google ที่มีสิทธิ์ แล้วกดลองใหม่";
        } else if (errCategory === "session") {
          badgeText = "⏳ การลงชื่อเข้าใช้หมดอายุ";
          titleText = "ลงชื่อเข้าใช้อีกครั้งเพื่อใช้งานต่อ";
          descText = "การยืนยันกับ Google หมดอายุไปแล้ว ลงชื่อเข้าใช้ใหม่ด้วยบัญชีที่มีสิทธิ์เข้าถึงโฟลเดอร์นี้ แล้วกดลองใหม่";
        } else if (errCategory === "server") {
          badgeText = "🛠️ Google Drive ขัดข้องชั่วคราว";
          titleText = "เซิร์ฟเวอร์ Google ยังไม่สามารถตอบคำขอได้";
          descText = "กรุณารอสักครู่แล้วกดลองใหม่ หากยังไม่สำเร็จ ให้ลองเปิดใน Google Drive โดยตรง";
        } else if (errCategory === "quota") {
          badgeText = "⏳ โควตา API เต็มชั่วคราว";
          titleText = "มีคำขอมากเกินไปชั่วคราว (ไม่ใช่ปัญหาสิทธิ์)";
          descText = "Google Drive API จำกัดจำนวนคำขอชั่วคราว กรุณารอสักครู่ (10-30 วินาที) แล้วกดปุ่มลองใหม่";
        } else if (errCategory === "permission") {
          badgeText = "🔒 ไม่มีสิทธิ์เข้าถึง (Access Denied)";
          titleText = "บัญชีที่ล็อกอินอยู่ยังไม่มีสิทธิ์ดูโฟลเดอร์นี้";
          descText = "เจ้าของโฟลเดอร์ยังไม่ได้แชร์กับบัญชีที่ล็อกอินอยู่ — กด 'เปิดใน Drive' เพื่อขอสิทธิ์จากเจ้าของ หรือสลับไปบัญชี Google ที่มีสิทธิ์ แล้วกดลองใหม่";
        } else if (errCategory === "notfound") {
          badgeText = "🗑️ ไม่พบโฟลเดอร์ (404 Not Found)";
          titleText = "ไม่พบโฟลเดอร์ หรือลิงก์เสีย";
          descText = "โฟลเดอร์นี้อาจถูกลบ ย้าย หรือลิงก์หมดอายุไปแล้ว คุณสามารถลองตรวจสอบลิงก์สำรอง หรือกลับไปยังหน้าคลัง";
        }

        const current = navStack[navStack.length - 1];
        const activeId = folderId || (current ? current.id : null);

        // ตรวจสอบว่าคอลเลกชันปัจจุบันมีลิงก์สำรอง (MEGA / OD / MF) หรือไม่
        let altLinksHtml = "";
        if (activeId && typeof XBEP_COLLECTION !== "undefined") {
          const item = XBEP_COLLECTION.find(x => x.id === activeId);
          if (item) {
            const alts = [];
            if (item.mega_url && !item.mega_dead) alts.push('<a class="btn-ghost btn-mega" href="' + item.mega_url + '" target="_blank" rel="noopener" style="padding:6px 12px;font-size:0.82rem;text-decoration:none;">เปิด MEGA ↗</a>');
            if (item.od_url) alts.push('<a class="btn-ghost btn-od" href="' + item.od_url + '" target="_blank" rel="noopener" style="padding:6px 12px;font-size:0.82rem;text-decoration:none;">เปิด OneDrive ↗</a>');
            if (item.mf_url) alts.push('<a class="btn-ghost btn-mf" href="' + item.mf_url + '" target="_blank" rel="noopener" style="padding:6px 12px;font-size:0.82rem;text-decoration:none;">เปิด MediaFire ↗</a>');
            if (alts.length) {
              altLinksHtml = '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-soft);display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;"><span style="font-size:0.78rem;color:var(--muted);">มีลิงก์สำรอง:</span> ' + alts.join(" ") + '</div>';
            }
          }
        }

        const driveDirectLink = activeId
          ? '<a class="btn-ghost" href="https://drive.google.com/drive/folders/' + encodeURIComponent(activeId) + '" target="_blank" rel="noopener" style="min-height:40px;padding:8px 14px;display:inline-flex;align-items:center;gap:5px;text-decoration:none;"><span>เปิดใน Drive ↗</span></a>'
          : '';

        const retryCurrentFolder = function () {
          const cur = navStack[navStack.length - 1];
          if (cur) openFolderAndReveal(cur.id, cur.name);
        };
        const needAuthBtn = errCategory === "signedout" || errCategory === "session";
        const refreshBtnSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
        const authBtnSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        const switchBtnSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
        const primaryBtnHtml = needAuthBtn
          ? '<button type="button" class="btn-primary" id="errSignIn" style="min-height:40px;padding:8px 18px;display:inline-flex;align-items:center;gap:6px;">' + authBtnSvg + '<span>ลงชื่อเข้าใช้และลองใหม่</span></button>'
          : '<button type="button" class="btn-primary" id="retryFolder" style="min-height:40px;padding:8px 18px;display:inline-flex;align-items:center;gap:6px;">' + refreshBtnSvg + '<span>ลองใหม่</span></button>';
        const switchAccountBtnHtml = errCategory === "permission"
          ? '<button type="button" class="btn-ghost" id="errSwitchAccount" style="min-height:40px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;">' + switchBtnSvg + '<span>สลับบัญชี Google</span></button>'
          : '';

        filesWrap.innerHTML =
          '<div class="state-box error-state ' + errCategory + '" style="max-width:540px;margin:24px auto;text-align:center;">' +
            '<div class="err-badge" style="display:inline-block;padding:3px 10px;font-size:0.75rem;border-radius:20px;margin-bottom:12px;font-weight:600;">' + badgeText + '</div>' +
            '<h3 style="margin-bottom:8px;font-size:1.1rem;color:var(--text-strong);">' + titleText + '</h3>' +
            '<p style="color:var(--muted);font-size:0.86rem;line-height:1.5;margin-bottom:18px;">' + descText + '</p>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">' +
              primaryBtnHtml +
              driveDirectLink +
              switchAccountBtnHtml +
              '<button type="button" class="btn-ghost" id="errBackHome" style="min-height:40px;padding:8px 14px;">กลับคลัง</button>' +
            '</div>' +
            altLinksHtml +
          '</div>';

        const retryBtn = document.getElementById("retryFolder");
        if (retryBtn) {
          retryBtn.addEventListener("click", retryCurrentFolder);
        }
        const signInBtn = document.getElementById("errSignIn");
        if (signInBtn) {
          signInBtn.addEventListener("click", function () {
            signInBtn.disabled = true;
            ensureToken(code === 401).then(function (t) { if (t) retryCurrentFolder(); else signInBtn.disabled = false; });
          });
        }
        const switchAccountBtn = document.getElementById("errSwitchAccount");
        if (switchAccountBtn) {
          switchAccountBtn.addEventListener("click", function () {
            switchAccountBtn.disabled = true;
            switchGoogleAccount().then(function (t) { if (t) retryCurrentFolder(); else switchAccountBtn.disabled = false; });
          });
        }
        const homeBtn = document.getElementById("errBackHome");
        if (homeBtn) {
          homeBtn.addEventListener("click", goHome);
        }
      }

      function folderRecovery() {
        // ปุ่มกู้คืนสำหรับ state-box "ไม่พบไฟล์ที่เข้าถึงได้" (โฟลเดอร์ว่าง/ไฟล์ข้างในไม่มีสิทธิ์)
        const cur = navStack[navStack.length - 1];
        const driveDirectLink = cur
          ? '<a class="btn-ghost" href="https://drive.google.com/drive/folders/' + encodeURIComponent(cur.id) + '" target="_blank" rel="noopener" style="min-height:36px;padding:7px 12px;display:inline-flex;align-items:center;gap:5px;text-decoration:none;"><span>เปิดใน Drive ↗</span></a>'
          : '';
        return '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:14px;">' +
                 '<button type="button" class="btn-primary" id="emptyBackHome" style="min-height:36px;padding:7px 14px;">กลับคลัง</button>' +
                 driveDirectLink +
               '</div>';
      }

      function renderFiles(files) {

              renderBreadcrumb();

              allFiles = files; // เก็บไว้สำหรับค้นหา/สลับ media

              mediaThumbs = {};

              files.forEach(function (f) { if (f.thumbnailLink) mediaThumbs[f.id] = f.thumbnailLink; });

              if (!files.length) {

                filesWrap.innerHTML =

                  '<div class="state-box">' +

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +

                    '<h3>ไม่พบไฟล์ที่เข้าถึงได้</h3><p>โฟลเดอร์อาจว่าง หรือบัญชีปัจจุบันไม่มีสิทธิ์ดูไฟล์ภายใน ลองเปิดใน Google Drive หรือลงชื่อเข้าใช้บัญชีที่มีสิทธิ์</p>' + folderRecovery() +

                  '</div>';

                const emptyBackBtn = document.getElementById("emptyBackHome");
                if (emptyBackBtn) emptyBackBtn.addEventListener("click", goHome);

                return;

              }

              const folderCount = files.filter(f => f.mimeType === "application/vnd.google-apps.folder").length;

              const fileCount = files.length - folderCount;

              currentFolderId = navStack[navStack.length - 1].id;

              // ===== ชิปกรองชนิดไฟล์ (แสดงเฉพาะประเภทที่มีจริง) =====

              const FILTERS = [

                { key: "all", label: "ทั้งหมด" },

                { key: "folder", label: "โฟลเดอร์" },

                { key: "image", label: "รูป" },

                { key: "video", label: "วิดีโอ" },

                { key: "audio", label: "เสียง" },

                { key: "doc", label: "เอกสาร" }

              ];

              const typeCounts = { all: files.length };

              files.forEach(function (f) {

                const t = fileTypeOf(f);

                typeCounts[t] = (typeCounts[t] || 0) + 1;

              });

              let chipsHtml = "";

              FILTERS.forEach(function (flt) {

                const n = typeCounts[flt.key] || 0;

                if (flt.key !== "all" && !n) return;

                chipsHtml += '<button type="button" class="filter-chip' + (flt.key === "all" ? " active" : "") + '" data-filter="' + flt.key + '">' + flt.label + ' <span>' + n + '</span></button>';

              });

              let html = '<div class="files-header">' +

                '<div>' +

                  '<h2 style="margin: 0; padding-bottom: 2px;">' + escapeHtml(navStack[navStack.length - 1].name) + '</h2>' +

                  '<span class="files-count" id="filesCount">' + folderCount + ' โฟลเดอร์ · ' + fileCount + ' ไฟล์</span>' +

                '</div>' +

                '<div class="search-wrap">' +

                  '<input type="text" id="fileSearch" placeholder="ค้นหาในโฟลเดอร์นี้…" aria-label="ค้นหาเฉพาะโฟลเดอร์นี้ ไม่รวมโฟลเดอร์ย่อย" autocomplete="off" />' +
                  '<small class="search-scope">เฉพาะโฟลเดอร์นี้ ไม่รวมโฟลเดอร์ย่อย</small>' +

                  '<button type="button" class="search-clear" id="searchClear" title="ล้างค้นหา" style="display:none;">&times;</button>' +

                '</div>' +

                '<div class="view-toggle" id="viewToggle">' +

                            '<button type="button" id="sortBtn" class="" title="จัดเรียง: ชื่อไฟล์">' +

                              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/></svg>' +

                              '<span id="sortLabel">ชื่อ</span>' +

                            '</button>' +

                            '<button type="button" id="viewGrid" class="active" title="ตาราง">' +

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +

                  '</button>' +

                  '<button type="button" id="viewList" title="รายการ">' +

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +

                  '</button>' +

                            '<button type="button" id="densityBtn" class="" title="ขนาดการ์ด: ปกติ">' +

                              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/></svg>' +

                              '<span id="densityLabel">ปกติ</span>' +

                            '</button>' +

                '</div>' +

                '<button type="button" class="btn-primary btn-sm" id="folderZipInfo" title="ดูขนาดไฟล์ก่อนเปิด Google Drive เพื่อดาวน์โหลด ZIP" style="display: flex; align-items: center; gap: 4px;">' +

                                  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +

                                  'ดาวน์โหลด ZIP' +

                                '</button>' +

              '</div>' +

              (Object.keys(typeCounts).length > 2 ? '<div class="filter-chips" id="filterChips">' + chipsHtml + '</div>' : '') +

              '<div class="files-grid" id="filesGrid">';



        files.forEach(function (f, idx) {

          const isFolder = f.mimeType === "application/vnd.google-apps.folder";

          const isVideo  = f.mimeType && f.mimeType.startsWith("video/");

          const isImage  = f.mimeType && f.mimeType.startsWith("image/");

          const kind = isFolder ? "folder" : isVideo ? "video" : isImage ? "image" : "file";



          let thumbHtml = "";

          const iconKind = kind === "file" ? fileIconKind(f.name, f.mimeType) : kind;

          const dataType = fileTypeOf(f);

          // ไอคอนเป็นฐานเสมอ + ภาพตัวอย่างของ Drive วางทับ (รูป/วิดีโอ/PDF/เอกสาร)

          // ถ้าภาพโหลดพลาด (onerror) ซ่อนภาพ จะเหลือไอคอนอยู่ข้างหลัง

          thumbHtml = genericIconSvg(iconKind);

          if (f.thumbnailLink && !isFolder) {

            thumbHtml += '<img class="thumb-img" src="' + escapeAttr(f.thumbnailLink) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />';

          }

          // badge: ไฟล์ทั่วไปแสดงนามสกุลจริง (CSS uppercase ให้เอง)

          const ext = fileExt(f.name);

          const badgeText = isFolder ? "Folder" : kind !== "file" ? kind : iconKind === "pdf" ? "PDF" : (ext || "file");

          // บรรทัดรอง: โฟลเดอร์ · วันที่ หรือ ขนาด · วันที่

          const subBits = [];

          if (isFolder) subBits.push("โฟลเดอร์");

          else if (f.size) subBits.push(formatSize(f.size));

          const dateTxt = formatDateTh(f.modifiedTime);

          if (dateTxt) subBits.push(dateTxt);

          const subText = subBits.join(" · ");

          const playOverlay = isVideo ? '<div class="play-overlay"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' : "";



          // stagger animation delay (cap at 0.4s)

          const delay = Math.min(idx * 0.03, 0.4);



          html +=

            '<div class="file-card" data-id="' + escapeAttr(f.id) + '" data-kind="' + kind + '" data-type="' + dataType + '" data-mime="' + escapeAttr(f.mimeType || '') + '" data-name="' + escapeAttr(f.name) + '" data-size="' + (f.size || '') + '" data-date="' + escapeAttr(f.modifiedTime || '') + '" style="animation-delay:' + delay + 's">' +

              '<div class="file-thumb"' + (isFolder ? ' data-folder-cover="' + escapeAttr(f.id) + '"' : '') + '>' +

                '<span class="thumb-badge ' + kind + '">' + escapeHtml(badgeText) + '</span>' +

                (squirtFile(f.name) ? '<span class="squirt-badge" title="น้ำพุ่ง Squirting (จับจากชื่อไฟล์)">💦</span>' : '') +

                thumbHtml + playOverlay +

              '</div>' +

              '<div class="file-meta">' +

                '<div class="file-meta-content">' +

                  '<div class="file-name" title="' + escapeAttr(f.name) + '">' + escapeHtml(f.name) + '</div>' +

                  '<div class="file-sub">' + escapeHtml(subText) + '</div>' +

                '</div>' +

                '<button type="button" class="dl-btn" title="' + (isFolder ? 'เปิดโฟลเดอร์ใน Google Drive' : 'ดาวน์โหลดไฟล์') + '" data-dl-id="' + escapeAttr(f.id) + '" data-dl-kind="' + kind + '">' +

                   (isFolder ? 

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' :

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>') +

                '</button>' +

              '</div>' +

            '</div>';

        });

        html += '</div>';

        filesWrap.innerHTML = html;
        attachWatchedButtons();
        attachPersonalButtons();
        observeFolderCovers(filesWrap);

        if (mbSearch) mbSearch.disabled = false; // มีไฟล์แล้ว → ปุ่มค้นหาแถบล่างใช้ได้



        filesWrap.querySelectorAll(".file-card").forEach(function (card) {

          card.addEventListener("click", function () {

            handleFileClick(card.dataset.id, card.dataset.kind, card.dataset.name, card.dataset.mime);

          });

        });



        filesWrap.querySelectorAll(".dl-btn").forEach(function (btn) {

                  btn.addEventListener("click", function (e) {

                    e.stopPropagation();

                    const id = btn.dataset.dlId;

                    const kind = btn.dataset.dlKind;

                    if (kind === "folder") {

                      window.open("https://drive.google.com/drive/folders/" + id, "_blank");

                    } else {

                      window.open("https://drive.google.com/uc?export=download&id=" + id, "_blank");

                    }

                  });

                });



                // ===== Search + ตัวกรองชนิดไฟล์ (filter ไฟล์ที่โหลดแล้ว) =====

                const searchInput = document.getElementById("fileSearch");

                const searchClear = document.getElementById("searchClear");

                const filesCountEl = document.getElementById("filesCount");

                let activeType = "all";

                function applyFilter() {

                  const q = searchInput.value.trim().normalize("NFC").toLowerCase();

                  const cards = filesWrap.querySelectorAll(".file-card");

                  let shown = 0;

                  cards.forEach(function (card) {

                    const name = (card.dataset.name || "").normalize("NFC").toLowerCase();

                    const matchText = !q || name.indexOf(q) !== -1;

                    const matchType = activeType === "all" || card.dataset.type === activeType;

                    const match = matchText && matchType;

                    card.style.display = match ? "" : "none";

                    if (match) shown++;

                  });

                  if (searchClear) searchClear.style.display = q ? "block" : "none";

                  if (filesCountEl) {

                    filesCountEl.textContent = shown + " จาก " + cards.length + " รายการ" + (q ? " (ค้นหา: \"" + searchInput.value.trim() + "\")" : "");

                  }

                }

                if (searchInput) {

                  searchInput.addEventListener("input", applyFilter);

                  if (searchClear) searchClear.addEventListener("click", function () { searchInput.value = ""; applyFilter(); searchInput.focus(); });

                }

                const chipsWrap = document.getElementById("filterChips");

                if (chipsWrap) chipsWrap.querySelectorAll(".filter-chip").forEach(function (chip) {

                  chip.addEventListener("click", function () {

                    activeType = chip.dataset.filter;

                    chipsWrap.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.toggle("active", c === chip); });

                    applyFilter();

                  });

                });



                // ===== View toggle (grid / list) =====

                                const gridBtn = document.getElementById("viewGrid");

                                const listBtn = document.getElementById("viewList");

                                const gridEl = document.getElementById("filesGrid");

                                function setView(mode) {

                                  if (!gridEl) return;

                                  const isList = mode === "list";

                                  gridEl.classList.toggle("list-view", isList);

                                  if (gridBtn) gridBtn.classList.toggle("active", !isList);

                                  if (listBtn) listBtn.classList.toggle("active", isList);

                                  lsSet("gdv_view", mode);

                                }

                                if (gridBtn) gridBtn.addEventListener("click", function () { setView("grid"); });

                                if (listBtn) listBtn.addEventListener("click", function () { setView("list"); });

                                setView(lsGet("gdv_view") === "list" ? "list" : "grid");



                                // ===== Sort (ชื่อ/ขนาด/วันที่/ชนิด) =====

												let sortKey = lsGet("gdv_sort") || "name";

                                                const sortBtn = document.getElementById("sortBtn");

                                                const sortLabel = document.getElementById("sortLabel");

                                                const SORT_OPTIONS = [

                                                  { key: "name", label: "ชื่อ" },

                                                  { key: "size", label: "ขนาด" },

                                                  { key: "date", label: "วันที่" },

                                                  { key: "kind", label: "ชนิด" }

                                                ];

                                                function naturalCompare(a, b) {

                                                  // เรียงตัวเลขในชื่อแบบธรรมชาติ: "ไฟล์ 2" มาก่อน "ไฟล์ 10" (ไม่ใช่ 1, 10, 2)
                                                  return String(a).localeCompare(String(b), "th", { numeric: true });
                                                }

                                                function cmpSort(a, b) {

                                                  // โฟลเดอร์มาก่อนเสมอ

                                                  const af = a.mimeType === "application/vnd.google-apps.folder" ? 0 : 1;

                                                  const bf = b.mimeType === "application/vnd.google-apps.folder" ? 0 : 1;

                                                  if (af !== bf) return af - bf;

                                                  let va, vb;

                                                  if (sortKey === "size") { va = Number(a.size) || 0; vb = Number(b.size) || 0; return vb - va; }

                                                  if (sortKey === "date") { va = String(a.modifiedTime || ""); vb = String(b.modifiedTime || ""); return va < vb ? 1 : va > vb ? -1 : 0; }

                                                  if (sortKey === "kind") { va = a.mimeType || ""; vb = b.mimeType || ""; return va < vb ? -1 : va > vb ? 1 : 0; }

                                                  // name: เรียงไทย/อังกฤษ case-insensitive + ตัวเลขแบบธรรมชาติ (1, 2, 10 ไม่ใช่ 1, 10, 2)

                                                  va = String(a.name || "").toLowerCase(); vb = String(b.name || "").toLowerCase();

                                                  return naturalCompare(va, vb);

                                                }

                                                function applySort() {

                                                  const grid = document.getElementById("filesGrid");

                                                  if (!grid) return;

                                                  const cards = Array.prototype.slice.call(grid.querySelectorAll(".file-card"));

                                                  cards.sort(function (ca, cb) {

                                                    const a = { id: ca.dataset.id, name: ca.dataset.name, mimeType: ca.dataset.mime || (ca.dataset.kind === "folder" ? "application/vnd.google-apps.folder" : ca.dataset.type || ca.dataset.kind || ""), size: ca.dataset.size, modifiedTime: ca.dataset.date };

                                                    const b = { id: cb.dataset.id, name: cb.dataset.name, mimeType: cb.dataset.mime || (cb.dataset.kind === "folder" ? "application/vnd.google-apps.folder" : cb.dataset.type || cb.dataset.kind || ""), size: cb.dataset.size, modifiedTime: cb.dataset.date };

                                                    return cmpSort(a, b);

                                                  });

                                                  cards.forEach(function (card) { grid.appendChild(card); });

                                                  if (sortLabel) sortLabel.textContent = (SORT_OPTIONS.find(function (o) { return o.key === sortKey; }) || {}).label || "ชื่อ";

                                                }

                                                function cycleSort() {

                                                  const idx = SORT_OPTIONS.findIndex(function (o) { return o.key === sortKey; });

                                                  sortKey = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key;

												  lsSet("gdv_sort", sortKey);

                                                  applySort();

                                                }

                                                if (sortBtn) sortBtn.addEventListener("click", cycleSort);

                                                // เรียก sort ครั้งแรกตามค่าที่จำไว้

                                                applySort();



                // ===== Density (ขนาดการ์ด: เล็ก/ปกติ/ใหญ่) =====

                let density = lsGet("gdv_density") || "md";

                const densityBtn = document.getElementById("densityBtn");

                const densityLabel = document.getElementById("densityLabel");

                const DENSITY_OPTIONS = [

                  { key: "sm", label: "เล็ก" },

                  { key: "md", label: "ปกติ" },

                  { key: "lg", label: "ใหญ่" }

                ];

                function applyDensity() {

                  if (!gridEl) return;

                  gridEl.classList.toggle("density-sm", density === "sm");

                  gridEl.classList.toggle("density-lg", density === "lg");

                  const opt = DENSITY_OPTIONS.find(function (o) { return o.key === density; }) || {};

                  if (densityLabel) densityLabel.textContent = opt.label || "ปกติ";

                  if (densityBtn) densityBtn.title = "ขนาดการ์ด: " + (opt.label || "ปกติ");

                }

                function cycleDensity() {

                  const idx = DENSITY_OPTIONS.findIndex(function (o) { return o.key === density; });

                  density = DENSITY_OPTIONS[(idx + 1) % DENSITY_OPTIONS.length].key;

                  lsSet("gdv_density", density);

                  applyDensity();

                }

                if (densityBtn) densityBtn.addEventListener("click", cycleDensity);

                applyDensity();



                // ---------- Media nav (lightbox + video) ----------

                window._gdvMediaNav = window._gdvMediaNav || {};

                window._gdvMediaNav.navigateLightbox = function (dir) { if (pdfInLightbox && (!filesWrap || mediaList("image").length <= 1)) { stepPdfPage(dir, false); return; } navigateMedia("image", dir); };
                window._gdvMediaNav.navigateVideo = function (dir) { if (!vidCurrentId) { navigateMedia("image", dir); return; } navigateMedia("video", dir); };

                const lbPrevBtn = document.getElementById("lbPrev");

                const lbNextBtn = document.getElementById("lbNext");

                const vidPrevBtn = document.getElementById("vidPrev");

                const vidNextBtn = document.getElementById("vidNext");

                if (lbPrevBtn) { lbPrevBtn.onclick = function () { window._gdvMediaNav.navigateLightbox(-1); }; }

                if (lbNextBtn) { lbNextBtn.onclick = function () { window._gdvMediaNav.navigateLightbox(1); }; }

                if (vidPrevBtn) { vidPrevBtn.onclick = function () { window._gdvMediaNav.navigateVideo(-1); }; }

                if (vidNextBtn) { vidNextBtn.onclick = function () { window._gdvMediaNav.navigateVideo(1); }; }

              }

      function handleFileClick(id, kind, name, mimeType) {

              if (kind === "folder") {

                navStack.push({ id: id, name: name });

                openFolderAndReveal(id);

                pushHash(id); // update URL ให้ bookmark/back ได้



              } else if (kind === "image") {

          openLightbox(id);

        } else if (kind === "video") {

          openVideo(id, name);

        } else {

          const fileMeta = allFiles.find(function (file) { return file.id === id; });
          openDocument(id, name, mimeType || fileMeta && fileMeta.mimeType);

        }

      }

      function renderBreadcrumb() {
        if (!navStack.length) {
          breadcrumb.classList.remove("show");
          if (mobileBar) { mobileBar.classList.remove("show"); mobileBar.setAttribute("aria-hidden", "true"); }
          document.body.classList.remove("has-mobile-bar");
          return;
        }

        breadcrumb.classList.add("show");
        const canGoUp = navStack.length > 1;

        // อัปเดตแถบลัดล่างจอ (มือถือ)
        if (mobileBar) {
          mobileBar.classList.add("show");
          mobileBar.setAttribute("aria-hidden", "false");
          const mbUp = document.getElementById("mbUp");
          if (mbUp) {
            mbUp.disabled = !canGoUp;
            mbUp.style.opacity = canGoUp ? "1" : "0.35";
          }
        }
        document.body.classList.add("has-mobile-bar");

        let html = "";
        const chevron = '<span class="crumb-sep" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>';

        navStack.forEach(function (item, i) {
          if (i > 0) html += chevron;
          const isCurrent = i === navStack.length - 1;
          const cls = isCurrent ? "crumb current" : "crumb";
          const titleAttr = escapeHtml(item.name || "");
          html += '<button type="button" class="' + cls + '" data-idx="' + i + '" title="' + titleAttr + '">' +
                  (isCurrent ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' : '') +
                  escapeHtml(item.name || "โฟลเดอร์") +
                  '</button>';
        });

        html += '<span class="breadcrumb-actions">' +
                  '<button type="button" class="btn-ghost btn-sm" id="bcBack" title="ย้อนกลับ (ประวัติการเปิด)">' +
                    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
                    '<span>ย้อนกลับ</span>' +
                  '</button>' +
                  '<button type="button" class="btn-ghost btn-sm" id="bcUp" title="' + (canGoUp ? 'ขึ้นไปยังโฟลเดอร์ชั้นก่อนหน้า' : 'อยู่ที่โฟลเดอร์บนสุดแล้ว') + '"' + (canGoUp ? '' : ' disabled') + '>' +
                    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>' +
                    '<span>ขึ้นหนึ่งระดับ</span>' +
                  '</button>' +
                  '<button type="button" class="btn-ghost btn-sm" id="bcHome" title="ออกจากโฟลเดอร์และกลับไปยังคลังคอลเลกชัน">' +
                    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
                    '<span>กลับคลัง</span>' +
                  '</button>' +
                '</span>';

        breadcrumb.innerHTML = html;
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "btn-ghost btn-sm";
        const current = navStack[navStack.length - 1];
        const isFavorite = loadFavoriteFolders().some(x => x.id === current.id);
        favorite.textContent = isFavorite ? "★ บันทึกแล้ว" : "☆ เพิ่มรายการโปรด";
        favorite.setAttribute("aria-pressed", String(isFavorite));
        favorite.onclick = () => {
          const items = loadFavoriteFolders().filter(x => x.id !== current.id);
          if (!isFavorite) items.unshift({ id: current.id, name: current.name || "Drive" });
          lsSet("gdv_favorites", JSON.stringify(items));
          renderFavoriteFolders();
          renderBreadcrumb();
        };
        breadcrumb.appendChild(favorite);

        breadcrumb.querySelectorAll(".crumb").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const idx = parseInt(btn.dataset.idx, 10);
            if (idx === navStack.length - 1) return;
            navStack = navStack.slice(0, idx + 1);
            const target = navStack[navStack.length - 1];
            pushHash(target.id);
            openFolderAndReveal(target.id, target.name);
          });
        });

        const bcUp = document.getElementById("bcUp");
        if (bcUp && canGoUp) bcUp.addEventListener("click", goUp);

        const bcHome = document.getElementById("bcHome");
        if (bcHome) bcHome.addEventListener("click", goHome);

        const bcBack = document.getElementById("bcBack");
        if (bcBack) bcBack.addEventListener("click", function () { smartBack(); });
      }

      function goUp() {
        if (navStack.length < 2) { goHome(); return; }
        navStack.pop();
        const parent = navStack[navStack.length - 1];
        history.pushState({ fid: parent.id }, "", "#/f/" + parent.id);
        openFolderAndReveal(parent.id, parent.name);
      }

      function goHome(fromHistory) {
        saveFolderPosition();
        displayedFolderId = null;
        ++folderRequest;
        if (folderAbort) folderAbort.abort();
        navStack = [];
        filesWrap.innerHTML =
          '<div class="state-box">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
            '<h3>ยังไม่ได้เปิดโฟลเดอร์</h3><p>วางลิงก์ Google Drive ข้างบนแล้วกด "เปิด" หรือเลือกจากคลังด้านล่าง</p>' +
          '</div>';
        breadcrumb.classList.remove("show");
        if (mobileBar) { mobileBar.classList.remove("show"); mobileBar.setAttribute("aria-hidden", "true"); }
        document.body.classList.remove("has-mobile-bar");
        if (mbSearch) mbSearch.disabled = true;
        if (fromHistory !== true) { try { history.pushState(null, "", location.pathname + location.search); } catch(_) {} }
        const collCard = document.getElementById("collectionsCard");
        if (collCard) collCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function currentHashId() {

        const m = (location.hash || "").match(/^#\/f\/([a-zA-Z0-9_-]+)/);

        return m ? m[1] : null;

      }

      function applyHash(id) {

        if (!id) return;

        driveLink.value = "https://drive.google.com/drive/folders/" + id;

        navStack = [{ id: id, name: "Drive" }];

        listFolder(id);

        ensureFolderName(id);

      }

      function smartBack() {

        const st = history.state;

        if (st && st.fid) {

          try { history.back(); return; } catch (_) {}

        }

        if (navStack.length > 1) { goUp(); return; }

        goHome();

        try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}

      }

      function pushHash(id) {

        try { history.pushState({ fid: id }, "", "#/f/" + id); }

        catch (_) { location.hash = "#/f/" + id; }

      }

    // Async function declarations are block-scoped to the `with` statement
    // (unlike sync ones, Annex B does not hoist them out), so capture the four
    // of them here, where their bindings are still visible. Sync functions are
    // hoisted to the module IIFE and referenced directly in the export below.
    // Copied bodies above are untouched; only this capture is new.
    with (appApi) {
      asyncBridge.fetchUserProfile = fetchUserProfile;
      asyncBridge.openFolderAndReveal = openFolderAndReveal;
      asyncBridge.findFolderCover = findFolderCover;
      asyncBridge.listFolder = listFolder;
    }
  }

  // Publish the extracted API back to the main app (bridge direction: module -> app).
  const {
    fetchUserProfile,
    openFolderAndReveal,
    findFolderCover,
    listFolder,
  } = asyncBridge;
  appApi.explorer = {
    refreshClientIdStatus,
    refreshKeyStatus,
    refreshSettingsHint,
    waitForGis,
    finishTokenRequest,
    initTokenClient,
    ensureToken,
    switchGoogleAccount,
    fetchUserProfile,
    refreshAuthUI,
    extractId,
    authParams,
    openFolderAndReveal,
    saveFolderPosition,
    loadFavoriteFolders,
    renderFavoriteFolders,
    showFolderCoverStatus,
    findFolderCover,
    observeFolderCovers,
    drainFolderCovers,
    listFolder,
    renderLoading,
    classifyApiError,
    renderApiError,
    folderRecovery,
    renderFiles,
    handleFileClick,
    renderBreadcrumb,
    goUp,
    goHome,
    currentHashId,
    applyHash,
    smartBack,
    pushHash
  };

  // The main app IIFE runs before this script, so the explorer-dependent part of
  // its startup ran against a bridge with no explorer API yet and was skipped
  // (it guards on `window.GDVExplorerApi.explorer`). Replay that work now that
  // the API exists: settings status, the favourite-folders sidebar, and the
  // deep-link hash read. Everything else in the app's startup is unaffected.
  if (typeof module !== "undefined" && module.exports) {
    // Node tests import the real module API and supply the bridge state; skip
    // browser-only startup effects (DOM rendering and initial hash navigation).
    module.exports = appApi.explorer;
  } else {
    refreshClientIdStatus();
    refreshKeyStatus();
    renderFavoriteFolders();
    if (window.GDVExplorerOpenInitialHash) window.GDVExplorerOpenInitialHash(currentHashId());
  }
})();
