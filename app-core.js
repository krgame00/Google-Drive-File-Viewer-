// app-core.js — main application state, event wiring, and bridge setup.
// Loaded after video-cache.js and before feature modules; keep this script order in index.html.


    (function () {

      "use strict";



      // ===== DOM =====

      const clientIdInput   = document.getElementById("clientId");

      const saveClientIdBtn = document.getElementById("saveClientIdBtn");

      const clientIdStatus  = document.getElementById("clientIdStatus");

      const clientIdDot     = document.getElementById("clientIdDot");

      const clientIdText    = document.getElementById("clientIdStatusText");

      const apiKeyInput     = document.getElementById("apiKey");

      const saveKeyBtn      = document.getElementById("saveKeyBtn");

      const keyStatus       = document.getElementById("keyStatus");

      const keyDot          = document.getElementById("keyDot");

      const keyStatusText   = document.getElementById("keyStatusText");

      const authBtn         = document.getElementById("authBtn");

      const authBtnText     = document.getElementById("authBtnText");

      const settingsHint    = document.getElementById("settingsHint");

      const userInfo        = document.getElementById("userInfo");

      const viewerForm      = document.getElementById("viewerForm");

            const driveLink       = document.getElementById("driveLink");



            // ===== Theme toggle (สว่าง / มืด) =====

            const themeToggle     = document.getElementById("themeToggle");

            const themeIcon       = document.getElementById("themeIcon");

            const themeLabel      = document.getElementById("themeLabel");

            function applyTheme(theme) {

              const isLight = theme === "light";

              document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");

              lsSet("gdv_theme", theme);

              if (themeIcon) {

                themeIcon.innerHTML = isLight

                  ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'

                  : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

              }

              if (themeLabel) themeLabel.textContent = isLight ? "สว่าง" : "มืด";

            }

            let savedTheme = "dark";

            try { savedTheme = localStorage.getItem("gdv_theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"); } catch (_) {}

            applyTheme(savedTheme);

            if (themeToggle) themeToggle.addEventListener("click", function () {

              const isLight = document.documentElement.getAttribute("data-theme") === "light";

              applyTheme(isLight ? "dark" : "light");

            });

      const linkError       = document.getElementById("linkError");

      const breadcrumb      = document.getElementById("breadcrumb");

      const filesWrap       = document.getElementById("filesWrap");

      const toast           = document.getElementById("toast");

      const lightbox        = document.getElementById("lightbox");

      const lbImg           = document.getElementById("lbImg");

      const lbClose         = document.getElementById("lbClose");

      const videoModal      = document.getElementById("videoModal");

      const vidPlayer       = document.getElementById("vidPlayer");

      const vidFrame        = document.getElementById("vidFrame");

      const vidLoading      = document.getElementById("vidLoading");

      const vidProgressBar  = document.getElementById("vidProgressBar");

      const vidLoadingText  = document.getElementById("vidLoadingText");

      const vidTitle        = document.getElementById("vidTitle");

      const vidOpenTab      = document.getElementById("vidOpenTab");

      const vidClose        = document.getElementById("vidClose");

      const pdfStage        = document.getElementById("pdfStage");
      const pdfCanvas       = document.getElementById("pdfCanvas");
      const pdfControls     = document.getElementById("pdfControls");
      const pdfPageCount    = document.getElementById("pdfPageCount");
      const pdfLoading      = document.getElementById("pdfLoading");
      const pdfLoadingText  = document.getElementById("pdfLoadingText");

      const lbPrev          = document.getElementById("lbPrev");

      const lbNext          = document.getElementById("lbNext");

      const lbOrig          = document.getElementById("lbOrig");

      const vidPrev         = document.getElementById("vidPrev");

      const vidNext         = document.getElementById("vidNext");

      const mobileBar       = document.getElementById("mobileBar");

      const mbBack          = document.getElementById("mbBack");

      const mbHome          = document.getElementById("mbHome");

      const mbSearch        = document.getElementById("mbSearch");



      // ===== State =====

      // ★ ค่า default ฝังในโค้ด — ใช้ได้ทันทีโดยไม่ต้องใส่

      //   (ถ้าเคยบันทึกใน localStorage จะใช้ค่านั้นก่อน)

      const DEFAULT_CLIENTID = "264440467830-5ouk3t1j4mv10f0go5hnga7dmkcarc6p.apps.googleusercontent.com";

      const DEFAULT_APIKEY   = "AIzaSyBytkL4FtZuSfo_XMnZYujrcgrud6NqF9g";



      const LS_CLIENTID = "gdv_clientid";

      const LS_APIKEY   = "gdv_apikey";

      let clientId = lsGet(LS_CLIENTID) || DEFAULT_CLIENTID;

      let apiKey   = lsGet(LS_APIKEY)   || DEFAULT_APIKEY;



      let accessToken = null;   // OAuth token (ในหน่วยความจำ ไม่เก็บ localStorage)

      let tokenExpiry = 0;

      let tokenClient = null;   // GIS token client

      let tokenResolver = null; // callback ค้างไว้สำหรับ requestAccessToken

      let userProfile = null;   // { name, email, picture }



      let navStack = [];

      let currentVideoUrl = null; // blob URL วิดีโอปัจจุบัน เก็บไว้ revoke

      let currentDocUrl = null;   // blob URL เอกสารปัจจุบัน เก็บไว้ revoke

      let pdfDocument = null;
      let pdfRenderTask = null;
      let pdfLibraryPromise = null;
      let pdfPageNumber = 1;
      let pdfScale = 1;
      let pdfFitMode = 'page';
      let pdfRenderVersion = 0;
      let pdfInLightbox = false;
      let lastPdfWheelTime = 0;
      let pdfScrollToBottomOnRender = false;

      let allFiles = [];          // ไฟล์ทั้งหมดในโฟลเดอร์ปัจจุบัน (สำหรับค้นหา/สลับ media)

      let currentFolderId = null; // id โฟลเดอร์ที่กำลังแสดง

      let vidCurrentId = null;    // id วิดีโอที่กำลังเล่น (สำหรับ nav)

      let mediaThumbs = {};       // id → thumbnailLink (โหลดภาพย่อ CDN เร็วใน lightbox)



      // ===== Toast / Error helpers =====

      function showToast(msg) {

        toast.textContent = msg;

        toast.classList.add("show");

        clearTimeout(showToast._t);

        showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);

      }

      function showLinkError(show) { linkError.classList.toggle("show", show); }



      // ===== Safe localStorage (กันพังใน private mode / พื้นที่เต็ม) =====

      function lsGet(key) {

        try { return localStorage.getItem(key); } catch (_) { return null; }

      }

      function lsSet(key, val) {

        try { localStorage.setItem(key, val); } catch (_) {}

      }

      function lsRemove(key) {

        try { localStorage.removeItem(key); } catch (_) {}

      }

      function lsGetJSON(key, fallback) {

        try {

          const v = JSON.parse(lsGet(key) || "null");

          return Array.isArray(v) ? v : fallback;

        } catch (_) { return fallback; }

      }



      // ===== Media cache (Cache Storage — ดูซ้ำได้ทันที; ใช้ไม่ได้ก็ข้ามเงียบ ๆ) =====

      const MEDIA_CACHE = "gdv-media-v1";

      function cacheGet(key) {

        return Promise.resolve().then(function () {

          if (!("caches" in window)) return null;

          return caches.open(MEDIA_CACHE)

            .then(function (c) { return c.match(key); })

            .catch(function () { return null; });

        });

      }

      function cachePut(key, blob) {

        if (!("caches" in window)) return;

        caches.open(MEDIA_CACHE).then(function (c) {

          c.put(key, new Response(blob));

          // กันแคชบวมเกิน: เกิน 300 รายการล้างทั้งก้อนเริ่มใหม่

          c.keys().then(function (keys) {

            if (keys.length > 300) caches.delete(MEDIA_CACHE);

          }).catch(function () {});

        }).catch(function () {});

      }

      // XHR ดึง blob → Promise (พร้อม progress callback)

      function xhrBlob(url, headers, onprogress) {

        return new Promise(function (resolve, reject) {

          const xhr = new XMLHttpRequest();

          xhr.open("GET", url, true);

          xhr.responseType = "blob";

          Object.keys(headers || {}).forEach(function (h) { xhr.setRequestHeader(h, headers[h]); });

          if (onprogress) xhr.onprogress = onprogress;

          xhr.onload = function () { xhr.status === 200 ? resolve(xhr.response) : reject(new Error("HTTP " + xhr.status)); };

          xhr.onerror = function () { reject(new Error("network")); };

          xhr.send();

        });

      }

      async function getBlobCached(key, url, headers, onprogress) {

        const hit = await cacheGet(key);

        if (hit) return await hit.blob();

        const blob = await xhrBlob(url, headers, onprogress);

        cachePut(key, blob);

        return blob;

      }

      // คีย์แคชต้องเป็น path สัมพัทธ์ (ห้ามขึ้นต้น "xxx:" — URL parser ตีความเป็น scheme แล้ว Request พัง)

      function origCacheKey(id) {

        return "/gdv/orig/" + id + "@" + (fileMetaOf(id).modifiedTime || "");

      }



      // ===== Escape helpers =====

      function escapeHtml(s) {

        return String(s == null ? "" : s)

          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      }

      function escapeAttr(s) { return escapeHtml(s); }

      function formatSize(bytes) {

        if (!bytes) return "";

        const n = Number(bytes);

        if (!isFinite(n)) return "";

        if (n < 1024) return n + " B";

        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";

        if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB";

        return (n / 1024 / 1024 / 1024).toFixed(1) + " GB";

      }



      // ===== File info helpers =====

      let _dtf = null;

      try { _dtf = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }); } catch (_) {}

      function formatDateTh(iso) {

        if (!iso) return "";

        const d = new Date(iso);

        if (isNaN(d.getTime())) return "";

        try { return _dtf ? _dtf.format(d) : d.toLocaleDateString(); } catch (_) { return ""; }

      }

      function squirtFile(name){
          var n=(name||'').toLowerCase();
          return /squirt|squirting|shiofuki|潮吹|น้ำพุ่ง|พุ่ง/.test(n);
        }
        function fileExt(name) {

        const s = String(name || "");

        const i = s.lastIndexOf(".");

        if (i <= 0 || i === s.length - 1) return "";

        return s.slice(i + 1).toLowerCase().slice(0, 5);

      }

      function fileMetaOf(id) {

        return allFiles.find(function (f) { return f.id === id; }) || {};

      }

      // ลิงก์ภาพย่อของ Drive → ขอไซซ์ใหญ่ขึ้น (=s1600) สำหรับดูใน lightbox — โหลดจาก CDN ของ Google เอง เร็วมาก

      function cdnLargeUrl(link) {

        if (!link) return null;

        return link.replace(/=s\d+(-[a-z]+)*/i, "=s1600").replace(/=w\d+-h\d+(-[a-z]+)*/i, "=s1600");

      }

      // จับคู่นามสกุล/mime → ชนิดไอคอน (pdf/word/excel/ppt/audio/archive/text)

      function fileIconKind(name, mime) {

        const ext = fileExt(name);

        if (mime && mime.indexOf("audio/") === 0) return "audio";

        if (ext === "pdf" || String(mime || "").toLowerCase().split(";")[0].trim() === "application/pdf") return "pdf";

        if (["doc", "docx", "odt", "rtf"].indexOf(ext) >= 0) return "word";

        if (["xls", "xlsx", "csv", "ods"].indexOf(ext) >= 0) return "excel";

        if (["ppt", "pptx", "odp"].indexOf(ext) >= 0) return "ppt";

        if (["zip", "rar", "7z", "tar", "gz", "iso"].indexOf(ext) >= 0) return "archive";

        if (["txt", "md", "json", "xml", "js", "ts", "py", "html", "css", "srt", "vtt", "apk"].indexOf(ext) >= 0) return "text";

        return "file";

      }

      // ชนิดไฟล์สำหรับชิปกรอง (folder/image/video/audio/doc/other)

      function fileTypeOf(f) {

        if (f.mimeType === "application/vnd.google-apps.folder") return "folder";

        if (f.mimeType && f.mimeType.indexOf("video/") === 0) return "video";

        if (f.mimeType && f.mimeType.indexOf("image/") === 0) return "image";

        if (f.mimeType && f.mimeType.indexOf("audio/") === 0) return "audio";

        if (["pdf", "word", "excel", "ppt", "text"].indexOf(fileIconKind(f.name, f.mimeType)) >= 0) return "doc";

        return "other";

      }



      // ===== Status displays =====

      function refreshClientIdStatus(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.refreshClientIdStatus !== "function") return undefined;
        return api.refreshClientIdStatus(...args);
      }

      function refreshKeyStatus(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.refreshKeyStatus !== "function") return undefined;
        return api.refreshKeyStatus(...args);
      }

      function refreshSettingsHint(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.refreshSettingsHint !== "function") return undefined;
        return api.refreshSettingsHint(...args);
      }



      // ===== Save buttons =====

      saveClientIdBtn.addEventListener("click", function () {

        const val = clientIdInput.value.trim();

        if (!val) { showToast("กรุณาวาง Client ID ก่อน"); return; }

        clientId = val;

        lsSet(LS_CLIENTID, val);

        refreshClientIdStatus();

        showToast("บันทึก Client ID แล้ว!");

      });

      saveKeyBtn.addEventListener("click", function () {

        const val = apiKeyInput.value.trim();

        if (!val) { showToast("กรุณาวาง API Key ก่อน"); return; }

        apiKey = val;

        lsSet(LS_APIKEY, val);

        refreshKeyStatus();

        showToast("บันทึก API Key แล้ว!");

      });



      // ===== OAuth (Google Identity Services) =====

      // รอ GIS โหลดเสร็จแล้ว init token client (เพดาน ~15 วิ กันรอเงียบไม่รู้จบ)

      function waitForGis(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.waitForGis !== "function") return undefined;
        return api.waitForGis(...args);
      }



      let authRestoreAttempted = false;
      function finishTokenRequest(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.finishTokenRequest !== "function") return undefined;
        return api.finishTokenRequest(...args);
      }

      function initTokenClient(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.initTokenClient !== "function") return undefined;
        return api.initTokenClient(...args);
      }

      function ensureToken(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.ensureToken !== "function") return Promise.resolve(null);
        return api.ensureToken(...args);
      }

      function switchGoogleAccount(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.switchGoogleAccount !== "function") return undefined;
        return api.switchGoogleAccount(...args);
      }

      function fetchUserProfile(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.fetchUserProfile !== "function") return Promise.resolve(null);
        return api.fetchUserProfile(...args);
      }



      function refreshAuthUI(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.refreshAuthUI !== "function") return undefined;
        return api.refreshAuthUI(...args);
      }



      authBtn.addEventListener("click", function () {

        if (accessToken) {

          // Sign out

          if (window.google && google.accounts && google.accounts.oauth2) {

            google.accounts.oauth2.revoke(accessToken, function () {});

          }

          accessToken = null; tokenExpiry = 0; userProfile = null;
          if (videoCache) videoCache.clear().then(refreshVideoCacheUI);
          lsRemove('gdv_auth_remember');
          if (typeof caches !== "undefined" && caches && caches.delete) Promise.resolve(caches.delete(MEDIA_CACHE)).catch(function () {});
          if (videoModal.classList.contains("show")) closeVideo();
          if (lightbox.classList.contains("show")) closeLightbox();

          refreshAuthUI(false);

          showToast("ออกจากระบบแล้ว");

        } else {

          if (!clientId) {

            showToast("กรุณาตั้ง Client ID ก่อน");

            clientIdInput.focus();

            return;

          }

          ensureToken().then(function (token) {

            if (token) showToast("ลงชื่อเข้าใช้สำเร็จ!");

            else showToast("ลงชื่อเข้าใช้ไม่สำเร็จ");

          });

        }

      });



      // ===== Extract ID =====

      function extractId(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.extractId !== "function") return null;
        return api.extractId(...args);
      }



      // ===== Auth header builder =====

      // คืน { headers } ถ้ามี token; คืน { keyParam } ถ้ามีแค่ apiKey

      function authParams(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.authParams !== "function") return { mode: "none" };
        return api.authParams(...args);
      }

      document.addEventListener('click', function(event) {
        if(!event.target.closest('#folderZipInfo')) return;
        const files=allFiles.filter(f=>f.mimeType!=='application/vnd.google-apps.folder');
        const bytes=files.reduce((sum,f)=>sum+(Number(f.size)||0),0);
        const unknown=files.filter(f=>!f.size).length;
        const folder=navStack[navStack.length-1];
        if(!folder) return;
        if(confirm('ไฟล์ในโฟลเดอร์นี้ '+files.length+' ไฟล์ · ขนาดที่ทราบ '+formatSize(bytes)+'\nไม่รวมโฟลเดอร์ย่อย'+(unknown?' และมี '+unknown+' ไฟล์ที่ไม่ทราบขนาด':'')+'\nเปิด Google Drive แล้วเลือกดาวน์โหลดได้ ความคืบหน้าและการยกเลิกจัดการใน Google Drive/เบราว์เซอร์')) {
          window.open('https://drive.google.com/drive/folders/'+encodeURIComponent(folder.id),'_blank','noopener');
        }
      });



      // ===== Drive API: list folder (พร้อม pagination ดึงครบทุกหน้า & Concurrency Guard) =====

      function openFolderAndReveal(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.openFolderAndReveal !== "function") return Promise.resolve(null);
        return api.openFolderAndReveal(...args);
      }

      const folderPositions = new Map();
      let displayedFolderId = null;
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";

      function saveFolderPosition(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.saveFolderPosition !== "function") return undefined;
        return api.saveFolderPosition(...args);
      }

      function loadFavoriteFolders(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.loadFavoriteFolders !== "function") return undefined;
        return api.loadFavoriteFolders(...args);
      }

      function renderFavoriteFolders(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.renderFavoriteFolders !== "function") return undefined;
        return api.renderFavoriteFolders(...args);
      }

      function showFolderCoverStatus(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.showFolderCoverStatus !== "function") return undefined;
        return api.showFolderCoverStatus(...args);
      }

      let folderRequest = 0, folderAbort = null;
      const folderCoverCache = new Map();
      const folderCoverQueue = [];
      let folderCoverActive = 0;
      const folderCoverObserved = new Set();
      const folderCoverObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          folderCoverObserver.unobserve(entry.target);
          folderCoverObserved.delete(entry.target);
          folderCoverQueue.push(entry.target);
        });
        drainFolderCovers();
      }, { rootMargin: "200px" }) : null;

      function findFolderCover(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.findFolderCover !== "function") return undefined;
        return api.findFolderCover(...args);
      }

      function observeFolderCovers(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.observeFolderCovers !== "function") return undefined;
        return api.observeFolderCovers(...args);
      }

      function drainFolderCovers(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.drainFolderCovers !== "function") return undefined;
        return api.drainFolderCovers(...args);
      }

      function listFolder(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.listFolder !== "function") return Promise.resolve(null);
        return api.listFolder(...args);
      }

      function renderLoading(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.renderLoading !== "function") return undefined;
        return api.renderLoading(...args);
      }

      function classifyApiError(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.classifyApiError !== "function") return undefined;
        return api.classifyApiError(...args);
      }

      function renderApiError(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.renderApiError !== "function") return undefined;
        return api.renderApiError(...args);
      }

      function folderRecovery(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.folderRecovery !== "function") return undefined;
        return api.folderRecovery(...args);
      }

      function renderFiles(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.renderFiles !== "function") return undefined;
        return api.renderFiles(...args);
      }



              // ===== Media series navigation =====

              // หาไฟล์ media (image/video) ทั้งหมดในโฟลเดอร์ปัจจุบัน เรียงตามลำดับที่แสดง

              function mediaList(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.mediaList !== "function") { return []; }
        return api.mediaList(...args);
      }

              let currentMediaIndex = -1;

              let currentMediaKind = null;

              function navigateMedia(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.navigateMedia !== "function") { return undefined; }
        return api.navigateMedia(...args);
      }



      function handleFileClick(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.handleFileClick !== "function") return undefined;
        return api.handleFileClick(...args);
      }



      // ===== Breadcrumb & Navigation Controls =====

      function renderBreadcrumb(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.renderBreadcrumb !== "function") return undefined;
        return api.renderBreadcrumb(...args);
      }

      function goUp(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.goUp !== "function") return undefined;
        return api.goUp(...args);
      }

      function goHome(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.goHome !== "function") return undefined;
        return api.goHome(...args);
      }

      function openLightbox(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.openLightbox !== "function") { return undefined; }
        return api.openLightbox(...args);
      }



      // โหลดไฟล์ต้นฉบับผ่าน Drive API (blob + แคช ดูซ้ำได้ทันที)

      function loadOriginalImage(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.loadOriginalImage !== "function") { return undefined; }
        return api.loadOriginalImage(...args);
      }



      // ดึงภาพย่อรูปถัดไปมารอล่วงหน้า (เบา — เป็นไฟล์ย่อจาก CDN)

      function prefetchNextImage(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.prefetchNextImage !== "function") { return undefined; }
        return api.prefetchNextImage(...args);
      }

      function fallbackImage(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.fallbackImage !== "function") { return undefined; }
        return api.fallbackImage(...args);
      }

      function toggleLightboxFullscreen(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.toggleLightboxFullscreen !== "function") { return undefined; }
        return api.toggleLightboxFullscreen(...args);
      }

      function closeLightbox(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.closeLightbox !== "function") { return undefined; }
        return api.closeLightbox(...args);
      }

      lbClose.addEventListener("click", closeLightbox);
      const lbFsBtn = document.getElementById("lbFullscreen");
      if (lbFsBtn) lbFsBtn.addEventListener("click", toggleLightboxFullscreen);
      lightbox.addEventListener("click", function (e) { if (e.target === lightbox && !imgDownOnImage) closeLightbox(); imgDownOnImage = false; });

      if (lbOrig) lbOrig.addEventListener("click", function () { loadOriginalImage(lbImg.dataset.fid); });



      // ตัวนับรูป "3 / 25"

      function updateLbCount(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.updateLbCount !== "function") { return undefined; }
        return api.updateLbCount(...args);
      }

      // ===== ตัวดูภาพ: ซูมสองนิ้ว ลากภาพ ปัดเปลี่ยนภาพ (Pointer Events) =====

      let imageView = { scale: 1, x: 0, y: 0 };

      function clampImageScale(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.clampImageScale !== "function") { const value = Number(args[0]); return Number.isFinite(value) ? Math.min(4, Math.max(1, value)) : 1; }
        return api.clampImageScale(...args);
      }

      function clampImagePan(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.clampImagePan !== "function") { return undefined; }
        return api.clampImagePan(...args);
      }

      function applyImageView(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.applyImageView !== "function") { return undefined; }
        return api.applyImageView(...args);
      }

      function resetImageView(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.resetImageView !== "function") { return undefined; }
        return api.resetImageView(...args);
      }

      function imageGestureMode(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.imageGestureMode !== "function") { return 'swipe'; }
        return api.imageGestureMode(...args);
      }

      function swipeNavigateFor(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.swipeNavigateFor !== "function") { return 0; }
        return api.swipeNavigateFor(...args);
      }

      let imageControlsVisible = true;
      let imgTapTimer = null;
      let imgLastTapTime = 0, imgLastTapX = 0, imgLastTapY = 0;
      function setImageControlsVisible(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.setImageControlsVisible !== "function") { return undefined; }
        return api.setImageControlsVisible(...args);
      }
      function cancelImageTap(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.cancelImageTap !== "function") { return undefined; }
        return api.cancelImageTap(...args);
      }
      function handleImageTap(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.handleImageTap !== "function") { return undefined; }
        return api.handleImageTap(...args);
      }
      function swipeNavigateVerticalFor(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.swipeNavigateVerticalFor !== "function") { return 0; }
        return api.swipeNavigateVerticalFor(...args);
      }

      const imgPointers = new Map();
      let imgGesture = null;
      let imgDownOnImage = false;

      lightbox.addEventListener('pointerdown', function (e) {
        if (e.target !== lbImg && !(pdfInLightbox && (e.target === pdfCanvas || e.target === pdfStage))) return; // ปุ่ม/พื้นหลังใช้พฤติกรรมเดิม
        imgDownOnImage = true;
        imgPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (imgPointers.size >= 2) {
          const pts = Array.from(imgPointers.values());
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          imgGesture = { mode: 'pinch', startDist: d, startScale: imageView.scale, midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2, panX: imageView.x, panY: imageView.y };
        } else {
          imgGesture = {
            mode: imageGestureMode(1, imageView.scale),
            startX: e.clientX,
            startY: e.clientY,
            panX: imageView.x,
            panY: imageView.y,
            startScrollTop: (pdfStage && pdfInLightbox) ? pdfStage.scrollTop : 0
          };
        }
        try { lightbox.setPointerCapture(e.pointerId); } catch (_) {}
      });

      lightbox.addEventListener('pointermove', function (e) {
        if (!imgPointers.has(e.pointerId) || !imgGesture) return;
        imgPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const surface = pdfInLightbox ? pdfCanvas : lbImg;
        const vw = surface.clientWidth || window.innerWidth, vh = surface.clientHeight || window.innerHeight;
        if (imgGesture.mode === 'pinch' && imgPointers.size >= 2) {
          const pts = Array.from(imgPointers.values());
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
          const scale = clampImageScale(imgGesture.startScale * d / imgGesture.startDist);
          const k = scale / imgGesture.startScale;
          imageView = clampImagePan({ scale: scale, x: mx - (imgGesture.midX - imgGesture.panX) * k, y: my - (imgGesture.midY - imgGesture.panY) * k }, vw, vh);
          applyImageView();
        } else if (imgGesture.mode === 'pan' && imgPointers.size === 1) {
          const dx = e.clientX - imgGesture.startX, dy = e.clientY - imgGesture.startY;
          imageView = clampImagePan({ scale: imageView.scale, x: imgGesture.panX + dx, y: imgGesture.panY + dy }, vw, vh);
          applyImageView();
        } else if (pdfInLightbox && pdfFitMode === 'width' && imgGesture.mode === 'swipe' && imgPointers.size === 1) {
          const dy = e.clientY - imgGesture.startY;
          if (pdfStage) pdfStage.scrollTop = imgGesture.startScrollTop - dy;
        }
      });

      lightbox.addEventListener('pointerup', function (e) {
        if (!imgPointers.has(e.pointerId)) return;
        imgPointers.delete(e.pointerId);
        if (imgGesture && imgGesture.mode === 'swipe') {
          const dx = e.clientX - imgGesture.startX, dy = e.clientY - imgGesture.startY;
          const moved = Math.abs(dx) + Math.abs(dy) >= 8;
          let dir = moved ? swipeNavigateFor(dx, dy) : 0;
          if (!dir && pdfInLightbox && moved) {
            const vDir = swipeNavigateVerticalFor(dy, dx);
            if (vDir) {
              if (pdfFitMode === 'page') {
                stepPdfPage(vDir, false);
              } else if (pdfStage) {
                const atBottom = pdfStage.scrollTop + pdfStage.clientHeight >= pdfStage.scrollHeight - 8;
                const atTop = pdfStage.scrollTop <= 6;
                if (vDir > 0 && atBottom) stepPdfPage(1, false);
                else if (vDir < 0 && atTop) stepPdfPage(-1, false);
              }
            }
          } else if (dir && pdfInLightbox) {
            stepPdfPage(dir, true);
          } else if (dir) navigateMedia('image', dir);
          handleImageTap(e.clientX, e.clientY, moved);
        }
        imgGesture = null;
      });
      lightbox.addEventListener('pointercancel', function (e) {
        imgPointers.delete(e.pointerId);
        imgGesture = null;
        cancelImageTap();
      });
      const lbResetBtn = document.getElementById('lbReset');
      if (lbResetBtn) lbResetBtn.addEventListener('click', function () {
        if (pdfInLightbox) { pdfFitMode = 'page'; resetImageView(); renderPdfPage(); }
        else resetImageView();
      });
      window.addEventListener('orientationchange', function () {
        if (lightbox.classList.contains('show')) {
          if (pdfInLightbox) { pdfFitMode = 'page'; resetImageView(); renderPdfPage(); }
          else resetImageView();
        }
        if (videoModal.classList.contains('show')) {
          applyVideoAspect();
          requestAnimationFrame(fitVideoPreview);
        }
      });



      // ===== Video Modal =====

      // ★ bypass "limit hit": direct streaming ผ่าน Drive API (alt=media) + direct download URL

      let mediaSession = 0;
      let videoAttemptTimer = null;
      let videoAttempt = 0;
      let mediaPreviousOverflow = "";
      let videoStatus = 'closed';
      let videoSlowTimer = null;
      let videoBlobTransfer = null;
      const routeCooldown = window.GDVVideoCache ? window.GDVVideoCache.createRouteCooldown() : null;
      const videoCache = window.GDVVideoCache ? window.GDVVideoCache.createVideoCache({limit: videoCacheLimit}) : null;
      // หัวคลิป (16 MiB แรกของคลิปที่สตรีม) SW เขียน/อ่านเอง — หน้าเว็บใช้แค่ดูสถิติกับล้าง
      const headCacheAdmin = window.GDVVideoCache ? window.GDVVideoCache.createVideoCache({cacheName: 'gdv-video-heads-v1'}) : null;
      document.getElementById('videoCacheLimit').addEventListener('change', function (event) {
        lsSet('gdv_video_cache_gb', event.target.value);
        if (videoCache) videoCache.trim().then(refreshVideoCacheUI);
      });
      document.getElementById('clearVideoCache').addEventListener('click', function () {
        const button = this;
        if (!videoCache) return;
        button.disabled = true;
        Promise.all([videoCache.clear(), headCacheAdmin ? headCacheAdmin.clear() : Promise.resolve(false)]).then(function (results) {
          refreshVideoCacheUI();
          showToast(results[0] ? 'ล้างคลิปที่เก็บไว้แล้ว' : 'ล้างคลิปไม่สำเร็จ ลองอีกครั้ง');
        }).finally(function () { button.disabled = false; });
      });
      refreshVideoCacheUI();
      function videoCacheLimit() {
        const setting = lsGet('gdv_video_cache_gb');
        return (['0','1','2','5'].includes(setting) ? Number(setting) : 2) * 1073741824;
      }
      function videoCacheScope() {
        if (!accessToken) return 'public';
        return userProfile && userProfile.email ? 'account:' + userProfile.email : null;
      }
      function clearRetryRoutes() {
        if (routeCooldown && vidCurrentId) routeCooldown.clear(vidCurrentId, accessToken ? 'signedin' : 'public');
      }
      function refreshVideoCacheUI() {
        const select = document.getElementById('videoCacheLimit');
        const status = document.getElementById('videoCacheStatus');
        if (!select || !status) return;
        select.value = String(videoCacheLimit() / 1073741824);
        if (!videoCache || !videoCache.supported) { select.disabled = true; document.getElementById('clearVideoCache').disabled = true; status.textContent = 'เบราว์เซอร์นี้เก็บคลิปไว้เปิดซ้ำไม่ได้'; return; }
        return Promise.all([videoCache.stats(), headCacheAdmin && headCacheAdmin.supported ? headCacheAdmin.stats() : Promise.resolve({bytes: 0, count: 0})]).then(function (results) {
          const stats = results[0], heads = results[1];
          status.textContent = stats.count + ' คลิป' + (heads.count ? ' + หัวคลิป ' + heads.count + ' ไฟล์' : '') + ' · ' + (formatSize(stats.bytes + heads.bytes) || '0 B') + ' / ' + select.value + ' GB';
        });
      }
      const startVideoPlayback = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.startVideoPlayback(...args) : undefined;
      const playbackRouteRecords = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.playbackRouteRecords(...args) : undefined;
      const rememberPlaybackRoute = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.rememberPlaybackRoute(...args) : undefined;
      const preferredPlaybackRoute = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.preferredPlaybackRoute(...args) : undefined;
      const recordActivePlaybackRoute = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.recordActivePlaybackRoute(...args) : undefined;
      const setVideoStatus = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.setVideoStatus(...args) : undefined;
      const handleDriveStreamError = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.handleDriveStreamError(...args) : undefined;
      const cancelVideoAttempt = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.cancelVideoAttempt(...args) : undefined;
      const resetMediaPlayback = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.resetMediaPlayback(...args) : undefined;
      const openVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.openVideo(...args) : undefined;



      // ===== เล่นวิดีโอแบบสตรีม — เริ่มดูทันที ไม่ต้องรอโหลดครบทั้งไฟล์ =====

      let videoResumePos = 0; // ตำแหน่งล่าสุดของวิดีโอปัจจุบัน



      // Signed-in playback uses a same-origin service worker to add the bearer header.

      // Signed-out playback retains public sources, then falls back to Drive preview.

      // Drive permissions, quotas and browser codec support still apply.

      let streamWorkerReady = null;
      let failedVideoAttempt = null;
      const MEDIA_STREAM_FAIL_MSG = 'เบราว์เซอร์เล่นสตรีมนี้ไม่สำเร็จ (อาจจากเครือข่ายหรือรูปแบบไฟล์) กดลองเล่นใหม่ เปิดในแท็บใหม่ ↗ เพื่อดาวน์โหลด หรือใช้พรีวิว Google';
      // Brave บล็อก fetch ข้ามโดเมนจาก service worker (ข้อจำกัด upstream ยังไม่แก้) —
      // จำไว้ในเซสชันเพื่อเปิดพรีวิวให้ทันทีในไฟล์ถัดไป แทนการโชว์การ์ด error ทุกครั้ง
      const streamBlocked = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.streamBlocked(...args) : undefined;
      const rememberStreamBlocked = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.rememberStreamBlocked(...args) : undefined;
      const clearStreamBlocked = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.clearStreamBlocked(...args) : undefined;
      const streamBlockVerdict = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.streamBlockVerdict(...args) : undefined;
      const shouldRememberStreamBlock = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.shouldRememberStreamBlock(...args) : undefined;
      const deviceCodecSupport = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.deviceCodecSupport(...args) : undefined;
      const describeCodecSupport = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.describeCodecSupport(...args) : undefined;
      const readMp4CodecInfo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.readMp4CodecInfo(...args) : undefined;
      const probeStreamEndpoint = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.probeStreamEndpoint(...args) : undefined;
      const calculatePreviewLayout = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.calculatePreviewLayout(...args) : undefined;
      const fitVideoPreview = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.fitVideoPreview(...args) : undefined;
      if (window.ResizeObserver) new window.ResizeObserver(fitVideoPreview).observe(vidFrame.parentElement);
      window.addEventListener('resize', fitVideoPreview, {passive: true});
      window.addEventListener('orientationchange', fitVideoPreview, {passive: true});
      vidFrame.addEventListener('load', fitVideoPreview);
      let previewAspect = null;
      const clampPreviewAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.clampPreviewAspect(...args) : undefined;
      const applyPreviewAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.applyPreviewAspect(...args) : undefined;
      const configurePreviewFullscreen = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.configurePreviewFullscreen(...args) : undefined;
      const lockHorizontalPlayerOrientation = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.lockHorizontalPlayerOrientation(...args) : undefined;
      const getPlayerAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.getPlayerAspect(...args) : undefined;
      const releasePlayerOrientation = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.releasePlayerOrientation(...args) : undefined;
      const applyVideoAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.applyVideoAspect(...args) : undefined;
      const applyNativeVideoAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.applyNativeVideoAspect(...args) : undefined;
      const togglePlayerFullscreen = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.togglePlayerFullscreen(...args) : undefined;
      const togglePreviewAspect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.togglePreviewAspect(...args) : undefined;
      const openInExternalPlayer = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.openInExternalPlayer(...args) : undefined;
      const copyVideoToMyDrive = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.copyVideoToMyDrive(...args) : undefined;
      const isVideoMinimized = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.isVideoMinimized(...args) : false;
      const minimizeVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.minimizeVideo(...args) : undefined;
      const restoreVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.restoreVideo(...args) : undefined;
      const toggleMinimizeVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.toggleMinimizeVideo(...args) : undefined;
      const isDownloadTurboEnabled = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.isDownloadTurboEnabled(...args) : true;
      const setDownloadTurboEnabled = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.setDownloadTurboEnabled(...args) : undefined;
      const toggleDownloadTurbo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.toggleDownloadTurbo(...args) : undefined;
      document.getElementById('vidFullscreen').addEventListener('click', togglePlayerFullscreen);
      const vidMinimizeBtn = document.getElementById('vidMinimize');
      if (vidMinimizeBtn) vidMinimizeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleMinimizeVideo();
      });
      const vidMinimizeBlobBtn = document.getElementById('vidMinimizeBlob');
      if (vidMinimizeBlobBtn) vidMinimizeBlobBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        minimizeVideo();
      });
      const vidTurboBlobBtn = document.getElementById('vidTurboBlob');
      if (vidTurboBlobBtn) vidTurboBlobBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDownloadTurbo();
      });
      const videoBoxEl = videoModal.querySelector('.video-box');
      if (videoBoxEl) videoBoxEl.addEventListener('click', function (e) {
        if (!videoModal.classList.contains('minimized')) return;
        if (e.target && e.target.closest && e.target.closest('#vidClose, #vidCancelBlob, #vidMinimize, #vidTurboBlob, .lb-close, button')) return;
        restoreVideo();
      });
      const vidAspectToggleBtn = document.getElementById('vidAspectToggle');
      if (vidAspectToggleBtn) vidAspectToggleBtn.addEventListener('click', togglePreviewAspect);
      const vidQuickPreviewBtn = document.getElementById('vidQuickPreview');
      if (vidQuickPreviewBtn) vidQuickPreviewBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) fallbackIframe(vidCurrentId);
      });
      const vidExternalPlayerBtn = document.getElementById('vidExternalPlayer');
      if (vidExternalPlayerBtn) vidExternalPlayerBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) openInExternalPlayer(vidCurrentId);
      });
      const vidSlowVlcBtn = document.getElementById('vidSlowVlc');
      if (vidSlowVlcBtn) vidSlowVlcBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) openInExternalPlayer(vidCurrentId);
      });
      const vidSlowPreviewBtn = document.getElementById('vidSlowPreview');
      if (vidSlowPreviewBtn) vidSlowPreviewBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) fallbackIframe(vidCurrentId);
      });
      const vidSlowBlobBtn = document.getElementById('vidSlowBlob');
      if (vidSlowBlobBtn) vidSlowBlobBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) requestVideoBlob(vidCurrentId);
      });
      const vidCopyDriveBtn = document.getElementById('vidCopyDrive');
      if (vidCopyDriveBtn) vidCopyDriveBtn.addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) copyVideoToMyDrive(vidCurrentId);
      });
      function handleFullscreenChange() {
        const box = videoModal.querySelector('.video-box');
        const active = (document.fullscreenElement === box) || (document.webkitFullscreenElement === box) || (box && box.classList.contains('pseudo-fullscreen'));
        if (!active) releasePlayerOrientation();
        const button = document.getElementById('vidFullscreen');
        if (button) {
          button.textContent = active ? 'ออกเต็มจอ' : 'เต็มจอ';
          button.setAttribute('aria-pressed', String(active));
        }
        applyVideoAspect();
        requestAnimationFrame(fitVideoPreview);
      }
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.getElementById('vidPreview').addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) fallbackIframe(vidCurrentId);
      });
      document.getElementById('vidRetry').addEventListener('click', function () {
        if (videoModal.classList.contains('show') && vidCurrentId) { clearRetryRoutes(); clearStreamBlocked(); openVideo(vidCurrentId, vidTitle.textContent); }
      });
      document.getElementById('vidReconnect').addEventListener('click', function () {
        const id=vidCurrentId, session=mediaSession, name=vidTitle.textContent;
        ensureToken(true).then(function(token){
          if(token && session===mediaSession && id===vidCurrentId && videoModal.classList.contains('show')) { clearRetryRoutes(); clearStreamBlocked(); openVideo(id,name); }
        });
      });
      document.getElementById('vidBlob').addEventListener('click', function () {
        requestVideoBlob(vidCurrentId);
      });
      document.getElementById('vidCancelBlob').addEventListener('click', function () {
        cancelVideoBlobTransfer(true);
      });
      if ('serviceWorker' in navigator) {
        const streamSwScript = new URL('drive-stream-sw.js', location.href).href;
        navigator.serviceWorker.addEventListener('message', function (event) {
          // ยอมรับรายงานจาก SW เวอร์ชันเก่าที่ค้างจัดการคำขอหลังอัปเดตด้วย —
          // เช็คว่ามาจากสคริปต์ของเรา ไม่ใช่เช็ค controller ตรง ๆ
          if (!event.source || event.source.scriptURL !== streamSwScript) return;
          if (event.data && event.data.type === 'drive-stream-error') {
            handleDriveStreamError(event.data);
            return;
          }
          if (!event.ports[0]) return;
          if (!event.data || event.data.type !== 'drive-stream-token') return;
          const allowed = event.data.id === vidCurrentId && videoModal.classList.contains('show') && Date.now() < tokenExpiry;
          // แนบ meta ของไฟล์ไปกับ token เพื่อให้ SW ตรวจความสดของ head cache ได้
          let streamMeta = null;
          if (allowed && vidCurrentId) {
            try { streamMeta = fileMetaOf(vidCurrentId); } catch (_) { streamMeta = null; }
          }
          event.ports[0].postMessage({
            token: allowed ? accessToken : null,
            scope: allowed ? videoCacheScope() : null,
            size: streamMeta && Number(streamMeta.size) > 0 ? Number(streamMeta.size) : 0,
            modifiedTime: streamMeta && streamMeta.modifiedTime ? String(streamMeta.modifiedTime) : '',
            heads: !!(allowed && videoCacheLimit() > 0 && videoCacheScope())
          });
        });
      }

      const prepareStreamWorker = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.prepareStreamWorker(...args) : undefined;

      const showStreamFailure = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.showStreamFailure(...args) : undefined;

      const tryStreamDirect = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.tryStreamDirect(...args) : undefined;

      const probePublicStreamError = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.probePublicStreamError(...args) : undefined;

      const tryPublicStream = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.tryPublicStream(...args) : undefined;



      const readVideoBlobResponse = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.readVideoBlobResponse(...args) : undefined;
      const readVideoBlobRanges = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.readVideoBlobRanges(...args) : undefined;
      const openVideoTempWriter = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.openVideoTempWriter(...args) : undefined;
      const renderVideoBlobProgress = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.renderVideoBlobProgress(...args) : undefined;
      const cancelVideoBlobTransfer = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.cancelVideoBlobTransfer(...args) : undefined;
      const requestVideoBlob = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.requestVideoBlob(...args) : undefined;
      const loadVideoAsBlob = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.loadVideoAsBlob(...args) : undefined;

      const tryVideoSrc = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.tryVideoSrc(...args) : undefined;



            // บันทึกตำแหน่งปัจจุบันเป็นระยะ (ทุก 3 วินาที) — กัน refresh/ปิดแล้วลืมที่

      function validatePersonalData(data) {
        if (!data || data.format !== "drive-viewer-personal" || data.version !== 1) throw new Error("รูปแบบไฟล์สำรองไม่รองรับ");
        const validId = id => typeof id === "string" && /^[\w-]{1,200}$/.test(id);
        const list = (key, check, project) => {
          if (!Array.isArray(data[key]) || data[key].length > 10000 || !data[key].every(check)) throw new Error("ข้อมูล " + key + " ไม่ถูกต้อง");
          return data[key].map(project);
        };
        const named = x => x && validId(x.id) && typeof x.name === "string" && x.name.length <= 2000;
        if (typeof data.hideCovers !== "boolean") throw new Error("ค่าปกไม่ถูกต้อง");
        return {
          format: "drive-viewer-personal", version: 1,
          favorites: list("favorites", named, x => ({ id: x.id, name: x.name })),
          watched: list("watched", validId, x => x),
          continueWatching: list("continueWatching", x => named(x) && Number.isFinite(x.position) && x.position > 2 && x.position < 1e9, x => ({ id: x.id, name: x.name, position: Math.floor(x.position), updated: Number.isFinite(x.updated) ? x.updated : 0 })).slice(0, 30),
          watchLater: list("watchLater", x => named(x) && ["image", "video"].includes(x.kind), x => ({ id: x.id, name: x.name, kind: x.kind })),
          covers: list("covers", x => x && validId(x.id) && validId(x.fileId), x => ({ id: x.id, fileId: x.fileId })),
          hideCovers: data.hideCovers
        };
      }

      function readPersonalData() {
        const read = (key, fallback) => {
          try { return JSON.parse(lsGet(key) || "null") ?? fallback; } catch (_) { return fallback; }
        };
        const result = { format: "drive-viewer-personal", version: 1, favorites: [], watched: [], continueWatching: [], watchLater: [], covers: [], hideCovers: read("gdv_hide_covers", false) === true };
        const keys = { favorites: "gdv_favorites", watched: "gdv_watched", continueWatching: "gdv_continue", watchLater: "gdv_watch_later", covers: "gdv_covers" };
        Object.entries(keys).forEach(([field, key]) => {
          const value = read(key, []);
          if (!Array.isArray(value)) return;
          result[field] = value.slice(0, 10000).filter(item => {
            try { validatePersonalData({ ...result, [field]: [item] }); return true; } catch (_) { return false; }
          });
        });
        return validatePersonalData(result);
      }

      function mergePersonalData(current, incoming) {
        const merged = { ...incoming };
        ["favorites", "continueWatching", "watchLater", "covers"].forEach(key => {
          merged[key] = [...new Map([...current[key], ...incoming[key]].map(item => [item.id, item])).values()];
        });
        merged.continueWatching.sort((a, b) => (b.updated || 0) - (a.updated || 0));
        merged.continueWatching = merged.continueWatching.slice(0, 30);
        merged.watched = [...new Set([...current.watched, ...incoming.watched])];
        return validatePersonalData(merged);
      }

      // ===== ซิงก์ข้อมูลส่วนตัวข้ามเครื่อง (Google Drive appDataFolder) =====
      // เก็บเป็นไฟล์ JSON ในพื้นที่ส่วนตัวของแอป (มองไม่เห็นใน Drive, ไม่นับโควตาที่ผู้ใช้เห็น)
      // ผสานแบบ union ตาม id — ดูต่อ: เลือกตำแหน่งที่ดูไกลกว่า, ปกทำในเครื่องใดยังอยู่กับเครื่องนั้น
      const PERSONAL_SYNC_NAME = "gdv-personal-sync.json";
      let personalSyncFileId = lsGet("gdv_sync_file_id") || null;
      let personalSyncPushTimer = null;
      let personalSyncLastPushed = lsGet("gdv_sync_last_push") || "";
      let personalSyncBusy = false;
      let personalSyncLastError = "";
      function personalSyncEnabled() { return !!accessToken; }
      function personalSyncSnapshot() {
        const data = readPersonalData();
        return { format: "gdv-personal-sync", version: 1, updatedAt: Date.now(), favorites: data.favorites, watched: data.watched, continueWatching: data.continueWatching, watchLater: data.watchLater, hideCovers: data.hideCovers };
      }
      function mergePersonalSyncSnapshot(remote) {
        const local = readPersonalData();
        const keepFurthest = new Map();
        local.continueWatching.concat(remote.continueWatching || []).forEach(item => {
          const prev = keepFurthest.get(item.id);
          if (!prev || (item.position || 0) > (prev.position || 0)) keepFurthest.set(item.id, item);
        });
        return mergePersonalData(local, {
          format: "drive-viewer-personal", version: 1,
          favorites: remote.favorites || [], watched: remote.watched || [],
          continueWatching: Array.from(keepFurthest.values()),
          watchLater: remote.watchLater || [], covers: [],
          hideCovers: !!remote.hideCovers || local.hideCovers
        });
      }
      async function personalSyncRemoteFileId() {
        if (personalSyncFileId) return personalSyncFileId;
        const url = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + encodeURIComponent("name='" + PERSONAL_SYNC_NAME + "' and trashed=false") + "&fields=files(id)&pageSize=5";
        const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
        if (!res.ok) throw new Error("syncListFailed");
        const data = await res.json();
        personalSyncFileId = (data.files && data.files[0] && data.files[0].id) || null;
        if (personalSyncFileId) lsSet("gdv_sync_file_id", personalSyncFileId);
        return personalSyncFileId;
      }
      async function pushPersonalSync(force) {
        if (!personalSyncEnabled() || personalSyncBusy) return;
        const snapshot = JSON.stringify(personalSyncSnapshot());
        if (!force && snapshot === personalSyncLastPushed) return;
        personalSyncBusy = true;
        try {
          let fileId = await personalSyncRemoteFileId();
          if (!fileId) {
            const create = await fetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder", {
              method: "POST", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
              body: JSON.stringify({ name: PERSONAL_SYNC_NAME, mimeType: "application/json", parents: ["appDataFolder"] })
            });
            if (!create.ok) throw new Error("syncCreateFailed");
            fileId = (await create.json()).id;
            personalSyncFileId = fileId; lsSet("gdv_sync_file_id", fileId);
          }
          const upload = await fetch("https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(fileId) + "?uploadType=media", {
            method: "PATCH", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: snapshot
          });
          if (!upload.ok) throw new Error("syncPushFailed");
          personalSyncLastPushed = snapshot; lsSet("gdv_sync_last_push", snapshot);
          lsSet("gdv_sync_last", String(Date.now())); personalSyncLastError = "";
        } catch (_) { personalSyncLastError = "push"; } finally { personalSyncBusy = false; renderPersonalSyncStatus(); }
      }
      function schedulePersonalSyncPush() {
        if (!personalSyncEnabled()) return;
        if (personalSyncPushTimer) clearTimeout(personalSyncPushTimer);
        personalSyncPushTimer = setTimeout(function () { personalSyncPushTimer = null; pushPersonalSync(false).catch(function () {}); }, 4000);
      }
      async function pullPersonalSync() {
        if (!personalSyncEnabled() || personalSyncBusy) return;
        personalSyncBusy = true;
        try {
          const fileId = await personalSyncRemoteFileId();
          if (!fileId) return;
          const res = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "?alt=media", { headers: { Authorization: "Bearer " + accessToken } });
          if (!res.ok) throw new Error("syncPullFailed");
          const remote = await res.json();
          if (!remote || remote.format !== "gdv-personal-sync") return;
          const before = JSON.stringify(readPersonalData());
          applyPersonalData(mergePersonalSyncSnapshot(remote));
          renderPersonalLibrary();
          if (JSON.stringify(readPersonalData()) !== before) schedulePersonalSyncPush();
          lsSet("gdv_sync_last", String(Date.now())); personalSyncLastError = "";
        } catch (_) { personalSyncLastError = "pull"; } finally { personalSyncBusy = false; renderPersonalSyncStatus(); }
      }
      function renderPersonalSyncStatus() {
        const el = typeof document !== 'undefined' && document.getElementById ? document.getElementById("gdvSyncStatus") : null;
        if (!el) return;
        if (!accessToken) { el.textContent = "ซิงก์ข้ามเครื่อง: ลงชื่อเข้าใช้ Google ก่อน"; return; }
        const last = Number(lsGet("gdv_sync_last") || 0);
        el.textContent = personalSyncLastError
          ? "ซิงก์ข้ามเครื่องไม่สำเร็จ — กดซิงก์อีกครั้งเพื่อลองใหม่"
          : last ? "ซิงก์ข้ามเครื่องล่าสุด: " + new Date(last).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
          : "ซิงก์ข้ามเครื่อง: พร้อมใช้ — กดซิงก์เพื่ออัปโหลดครั้งแรก";
      }
      let personalSyncPullAt = 0;
      function schedulePersonalSyncPull() {
        if (!personalSyncEnabled()) return;
        if (Date.now() - personalSyncPullAt < 30000) return;
        personalSyncPullAt = Date.now();
        setTimeout(function () { pullPersonalSync().catch(function () {}); }, 1500);
      }

      function applyPersonalData(input) {
        const data = validatePersonalData(input);
        const values = { gdv_favorites: data.favorites, gdv_watched: data.watched, gdv_continue: data.continueWatching, gdv_watch_later: data.watchLater, gdv_covers: data.covers, gdv_hide_covers: data.hideCovers };
        const previous = Object.keys(values).map(key => [key, localStorage.getItem(key)]);
        try {
          Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
        } catch (error) {
          previous.forEach(([key, value]) => { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {} });
          throw error;
        }
      }

      function updatePersonalData(change) {
        try { const data = readPersonalData(); change(data); applyPersonalData(data); schedulePersonalSyncPush(); return true; }
        catch (_) { alert("บันทึกไม่ได้ พื้นที่เก็บข้อมูลอาจเต็มหรือถูกปิดใช้งาน"); return false; }
      }

      function renderPersonalLibrary() {
        let section = document.getElementById("personalLibrary");
        const drawerMount = document.getElementById("myLibraryContent");
        if (!section) {
          section = document.createElement("section");
          section.id = "personalLibrary";
          section.className = "favorite-folders";
          if (drawerMount) drawerMount.appendChild(section);
          else document.getElementById("browserCard").before(section);
        } else if (drawerMount && section.parentElement !== drawerMount) {
          drawerMount.appendChild(section);
        }
        const settingsOpen = !!section.querySelector("details[open]");
        const data = readPersonalData();
        document.documentElement.classList.toggle("hide-folder-covers", data.hideCovers);
        section.innerHTML = '<h3>ดูภายหลัง</h3><p>เก็บรูปและวิดีโอไว้เปิดภายหลังในเบราว์เซอร์นี้</p><div class="later-items"></div><details><summary>สำรองข้อมูลและตั้งค่าปก</summary><div class="personal-tools"></div></details>';
        section.querySelector("details").open = settingsOpen;
        const items = section.querySelector(".later-items");
        if (!data.watchLater.length) {
          items.textContent = "กด + ดูภายหลัง บนรูปหรือวิดีโอเพื่อเพิ่มรายการ";
        } else {
          items.classList.add("resume-grid");
        }
        data.watchLater.forEach(item => {
          const row = document.createElement("div"); row.className = "favorite-folder resume-card";
          const open = document.createElement("button"); open.type = "button"; open.className = "resume-btn";
          const isVid = item.kind === "video";
          const icon = isVid ? "▶" : "🖼";
          const kindLabel = isVid ? "🎬 วิดีโอ" : "🖼 รูปภาพ";
          const safeName = (item.name || "").replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));

          const cachedThumb = (function () {
            if (typeof mediaThumbs !== "undefined" && mediaThumbs && mediaThumbs[item.id]) return mediaThumbs[item.id];
            try { return localStorage.getItem("gdv_thumb_" + item.id); } catch (_) { return null; }
          })();
          const thumbUrl = cachedThumb || ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(item.id) + "&sz=w320");
          const safeThumbUrl = (thumbUrl || "").replace(/"/g, '&quot;');
          const safeId = (item.id || "").replace(/['"\\]/g, "");

          open.innerHTML = `
            <div class="resume-thumb-box ${isVid ? 'is-video' : 'is-img'}${cachedThumb ? ' has-thumb' : ''}" aria-hidden="true">
              <img class="resume-thumb-img${cachedThumb ? ' loaded' : ''}" src="${safeThumbUrl}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.remove('has-thumb');if(window.tryLoadDriveThumbnail)window.tryLoadDriveThumbnail('${safeId}',this)" onload="this.classList.add('loaded');this.parentElement.classList.add('has-thumb')" />
              <span class="resume-play-glyph">${icon}</span>
            </div>
            <div class="resume-info">
              <span class="resume-title" title="${safeName}">${safeName}</span>
              <span class="resume-time-tag">${kindLabel}</span>
            </div>
          `;
          open.onclick = () => {
            if (window.closeMyLibraryDrawer) window.closeMyLibraryDrawer();
            handleFileClick(item.id, item.kind, item.name);
          };
          const remove = document.createElement("button"); remove.type = "button"; remove.className = "favorite-remove-btn"; remove.textContent = "×";
          remove.setAttribute("aria-label", "ลบ " + item.name + " จากดูภายหลัง");
          remove.onclick = (e) => {
            e.stopPropagation();
            if (updatePersonalData(state => { state.watchLater = state.watchLater.filter(x => x.id !== item.id); })) { renderPersonalLibrary(); attachPersonalButtons(); }
          };
          row.append(open, remove); items.appendChild(row);
        });
        if (window.updateMyLibraryBadge) window.updateMyLibraryBadge();
        const tools = section.querySelector(".personal-tools");
        const makeButton = (label, action) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn-ghost"; b.textContent = label; b.onclick = action; tools.appendChild(b); return b; };
        makeButton("ส่งออกข้อมูลส่วนตัว", () => {
          saveVideoPos();
          const blob = new Blob([JSON.stringify(readPersonalData(), null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob); const link = document.createElement("a");
          link.href = url; link.download = "drive-viewer-personal-" + new Date().toISOString().slice(0, 10) + ".json";
          document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
        });
        const file = document.createElement("input"); file.type = "file"; file.accept = ".json,application/json"; file.hidden = true; tools.appendChild(file);
        makeButton("นำเข้าข้อมูลส่วนตัว", () => file.click());
        const status = document.createElement("p"); status.setAttribute("role", "status"); tools.appendChild(status);
        let pending = null;
        const apply = makeButton("รวมข้อมูลจากไฟล์นี้", () => {
          if (!pending) return;
          try { applyPersonalData(mergePersonalData(readPersonalData(), pending)); location.reload(); }
          catch (_) { status.textContent = "นำเข้าไม่สำเร็จ ตรวจพื้นที่เก็บข้อมูลแล้วลองใหม่"; }
        });
        apply.hidden = true;
        let importRequest = 0;
        file.onchange = async () => {
          const request = ++importRequest;
          pending = null; apply.hidden = true;
          const selected = file.files[0]; if (!selected) return;
          try {
            if (selected.size > 2 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 2 MB");
            const parsed = validatePersonalData(JSON.parse(await selected.text()));
            if (request !== importRequest) return;
            pending = parsed;
            status.textContent = "พร้อมรวม: โปรด " + pending.favorites.length + " · ดูแล้ว " + pending.watched.length + " · ดูต่อ " + pending.continueWatching.length + " · ดูภายหลัง " + pending.watchLater.length + " · ปก " + pending.covers.length + " (ค่าจากไฟล์ใช้แทนรายการที่ซ้ำ)";
            apply.hidden = false;
          } catch (error) { if (request === importRequest) status.textContent = "อ่านไฟล์ไม่ได้: " + error.message; }
          file.value = "";
        };
        const label = document.createElement("label");
        const hidden = document.createElement("input"); hidden.type = "checkbox"; hidden.checked = data.hideCovers;
        hidden.onchange = () => {
          if (updatePersonalData(state => { state.hideCovers = hidden.checked; })) { refreshFolderCovers(); renderPersonalLibrary(); }
          else hidden.checked = !hidden.checked;
        };
        label.append(hidden, " ซ่อนปกโฟลเดอร์ทั้งหมด"); tools.appendChild(label);
        makeButton("ใช้ปกอัตโนมัติสำหรับโฟลเดอร์ที่เปิดอยู่", () => {
          if (!displayedFolderId) { status.textContent = "เปิดโฟลเดอร์ก่อนเปลี่ยนปก"; return; }
          if (updatePersonalData(state => { state.covers = state.covers.filter(x => x.id !== displayedFolderId); })) { refreshFolderCovers(); attachPersonalButtons(); status.textContent = "เปลี่ยนเป็นปกอัตโนมัติแล้ว"; }
        });
        const syncStatus = document.createElement("p"); syncStatus.id = "gdvSyncStatus"; syncStatus.setAttribute("role", "status"); tools.appendChild(syncStatus);
        makeButton("ซิงก์ข้ามเครื่องเดี๋ยวนี้", () => { pullPersonalSync().then(() => pushPersonalSync(true)).catch(function () {}); });
        renderPersonalSyncStatus();
        const help = document.createElement("p"); help.textContent = "เลือกปกได้จากปุ่ม ใช้เป็นปกโฟลเดอร์ บนรูปภายในโฟลเดอร์ · ไฟล์สำรองไม่รวม API key หรือข้อมูลเข้าสู่ระบบ"; tools.appendChild(help);
      }

      function attachPersonalButtons(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.attachPersonalButtons !== "function") { return undefined; }
        return api.attachPersonalButtons(...args);
      }

      function refreshFolderCovers() {
        document.documentElement.classList.toggle("hide-folder-covers", readPersonalData().hideCovers);
        folderCoverCache.clear();
        document.querySelectorAll("[data-folder-cover]").forEach(target => {
          target.dataset.coverVersion = String(Number(target.dataset.coverVersion || 0) + 1);
          target.querySelectorAll(".thumb-img, .folder-video-badge, .cover-status").forEach(el => el.remove());
          delete target.dataset.coverObserved;
        });
        observeFolderCovers(document);
      }

      const loadWatchedVideos = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.loadWatchedVideos(...args) : undefined;

      const toggleWatchedVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.toggleWatchedVideo(...args) : undefined;

      const attachWatchedButtons = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.attachWatchedButtons(...args) : undefined;

      const loadContinueWatching = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.loadContinueWatching(...args) : undefined;

      const saveVideoPos = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.saveVideoPos(...args) : undefined;

      const renderContinueWatching = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.renderContinueWatching(...args) : undefined;

            // เก็บกวาด gdv_vpos_* เก่าสุดออกให้เหลือไม่เกิน maxKeys (กัน localStorage บวม)

            function pruneVpos(maxKeys) {

              try {

                const keys = [];

                for (let i = 0; i < localStorage.length; i++) {

                  const k = localStorage.key(i);

                  if (k && k.indexOf("gdv_vpos_") === 0) keys.push(k);

                }

                for (let i = 0; i < keys.length - maxKeys; i++) {

                  lsRemove(keys[i]);

                }

              } catch (_) {}

            }

            window.addEventListener("pagehide", saveVideoPos);
            window._gdvVideoTimer = window._gdvVideoTimer || setInterval(saveVideoPos, 3000);

            // สถานะเครื่องเล่นจริง → อัปเดตข้อความบนหน้า (เล่นได้/กำลังบัฟเฟอร์)

            vidPlayer.addEventListener("loadedmetadata", function () {
              if (videoModal.classList.contains("show") && videoStatus === 'connecting') setVideoStatus('loading');
            });
            vidPlayer.addEventListener("playing", function () {
              if (videoModal.classList.contains("show")) { recordActivePlaybackRoute(); setVideoStatus('playing'); }
            });
            vidPlayer.addEventListener("waiting", function () {
              if (videoModal.classList.contains("show") && videoStatus !== 'error') setVideoStatus('buffering');
            });

            // เมื่อเล่นจบ (ended) → เล่นวิดีโอถัดไปในโฟลเดอร์อัตโนมัติ

            vidPlayer.addEventListener("ended", function () {

              // ล้างตำแหน่งที่ค้าง (เล่นจบแล้ว)

              lsRemove("gdv_vpos_" + vidCurrentId);

              const list = mediaList("video");

              if (list.length > 1) {

                const cur = list.findIndex(function (item) { return item.id === vidCurrentId; });
                if (cur < 0) return; // A resumed file may belong to another folder.

                const next = list[(cur + 1) % list.length];

                if (next && next.id !== vidCurrentId) {

                  vidLoadingText.textContent = "กำลังเล่นถัดไป…";

                  openVideo(next.id, next.name);

                }

              }

            });



      // Fallback: ใช้ iframe preview (อาจติดโควต้า แต่อย่างน้อยพอใช้)

      function fallbackIframe(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.fallbackIframe !== "function") { return undefined; }
        return api.fallbackIframe(...args);
      }



      const revokeCurrentVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.revokeCurrentVideo(...args) : undefined;

      function resetPdfViewer(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.resetPdfViewer !== "function") { return undefined; }
        return api.resetPdfViewer(...args);
      }

      function loadPdfLibrary(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.loadPdfLibrary !== "function") { return Promise.resolve(undefined); }
        return api.loadPdfLibrary(...args);
      }

      function updatePdfNavState(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.updatePdfNavState !== "function") { return undefined; }
        return api.updatePdfNavState(...args);
      }

      function stepPdfPage(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.stepPdfPage !== "function") { return undefined; }
        return api.stepPdfPage(...args);
      }

      function renderPdfPage(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.renderPdfPage !== "function") { return Promise.resolve(undefined); }
        return api.renderPdfPage(...args);
      }

      function openPdfBlob(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.openPdfBlob !== "function") { return Promise.resolve(undefined); }
        return api.openPdfBlob(...args);
      }

      function pdfLoadingState(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.pdfLoadingState !== "function") { return undefined; }
        return api.pdfLoadingState(...args);
      }

      function fitPdfScale(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.fitPdfScale !== "function") { return undefined; }
        return api.fitPdfScale(...args);
      }
      function zoomPdf(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.zoomPdf !== "function") { return undefined; }
        return api.zoomPdf(...args);
      }
      function togglePdfFitMode(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.togglePdfFitMode !== "function") { return undefined; }
        return api.togglePdfFitMode(...args);
      }
      function updatePdfFitButtonState(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.updatePdfFitButtonState !== "function") { return undefined; }
        return api.updatePdfFitButtonState(...args);
      }
      function handlePdfWheel(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.handlePdfWheel !== "function") { return false; }
        return api.handlePdfWheel(...args);
      }
      document.getElementById('pdfPrev').addEventListener('click', function () {
        stepPdfPage(-1, true);
      });
      document.getElementById('pdfNext').addEventListener('click', function () {
        stepPdfPage(1, true);
      });
      document.getElementById('pdfZoomIn').addEventListener('click', function () { zoomPdf(1.2); });
      document.getElementById('pdfZoomOut').addEventListener('click', function () { zoomPdf(1 / 1.2); });
      document.getElementById('pdfFit').addEventListener('click', function () { togglePdfFitMode(); });
      window.addEventListener('resize', function () { if (pdfDocument && pdfFitMode) renderPdfPage(); }, { passive: true });
      if (pdfStage) {
        pdfStage.addEventListener('wheel', function (e) {
          if (pdfInLightbox) handlePdfWheel(e);
        }, { passive: false });
      }

      function fallbackPdfToDrive(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.fallbackPdfToDrive !== "function") { return undefined; }
        return api.fallbackPdfToDrive(...args);
      }

      function openPdfDocument(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.openPdfDocument !== "function") { return undefined; }
        return api.openPdfDocument(...args);
      }

      function revokeCurrentDoc(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.revokeCurrentDoc !== "function") { return undefined; }
        return api.revokeCurrentDoc(...args);
      }

      const closeVideo = (...args) => window.GDVVideoApi && window.GDVVideoApi.video ? window.GDVVideoApi.video.closeVideo(...args) : undefined;

      vidClose.addEventListener("click", closeVideo);

      videoModal.addEventListener("click", function (e) { if (e.target === videoModal && !videoModal.classList.contains("minimized")) closeVideo(); });



      function openDocument(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.openDocument !== "function") { return undefined; }
        return api.openDocument(...args);
      }

      function fallbackDocIframe(...args) {
        const api = window.GDVLightboxApi && window.GDVLightboxApi.media;
        if (!api || typeof api.fallbackDocIframe !== "function") { return undefined; }
        return api.fallbackDocIframe(...args);
      }



      // ===== Esc key + ลูกศรเปลี่ยนรูป =====

      document.addEventListener("keydown", function (e) {
        if (lightbox.classList.contains("show")) {
          if (pdfInLightbox) {
            if (e.shiftKey && e.key === 'ArrowLeft') { navigateMedia('image', -1); return; }
            if (e.shiftKey && e.key === 'ArrowRight') { navigateMedia('image', 1); return; }
            if (e.key === 'ArrowLeft') { stepPdfPage(-1, true); return; }
            if (e.key === 'ArrowRight') { stepPdfPage(1, true); return; }
            if (e.key === 'PageUp') { stepPdfPage(-1, false); return; }
            if (e.key === 'PageDown') { stepPdfPage(1, false); return; }
            if (e.key === '+' || e.key === '=') { zoomPdf(1.2); return; }
            if (e.key === '-') { zoomPdf(1 / 1.2); return; }
            if (e.key === 'r' || e.key === 'R' || e.key === '0') { pdfFitMode = 'page'; resetImageView(); updatePdfFitButtonState(); renderPdfPage(); return; }
            if (e.key === 'w' || e.key === 'W') { togglePdfFitMode(); return; }
            if (e.key === 'ArrowDown') {
              if (pdfFitMode === 'page') { stepPdfPage(1, false); return; }
              if (pdfStage) {
                const atBottom = pdfStage.scrollTop + pdfStage.clientHeight >= pdfStage.scrollHeight - 8;
                if (atBottom) { stepPdfPage(1, false); return; }
                pdfStage.scrollTop += 80;
                return;
              }
            }
            if (e.key === 'ArrowUp') {
              if (pdfFitMode === 'page') { stepPdfPage(-1, false); return; }
              if (pdfStage) {
                const atTop = pdfStage.scrollTop <= 6;
                if (atTop) { stepPdfPage(-1, false); return; }
                pdfStage.scrollTop -= 80;
                return;
              }
            }
            if (e.key === ' ' || e.code === 'Space') {
              e.preventDefault();
              const dir = e.shiftKey ? -1 : 1;
              if (pdfFitMode === 'page') { stepPdfPage(dir, false); return; }
              if (pdfStage) {
                const pageDelta = Math.max(100, pdfStage.clientHeight * 0.8);
                if (dir > 0) {
                  const atBottom = pdfStage.scrollTop + pdfStage.clientHeight >= pdfStage.scrollHeight - 8;
                  if (atBottom) { stepPdfPage(1, false); return; }
                  pdfStage.scrollTop += pageDelta;
                } else {
                  const atTop = pdfStage.scrollTop <= 6;
                  if (atTop) { stepPdfPage(-1, false); return; }
                  pdfStage.scrollTop -= pageDelta;
                }
                return;
              }
            }
          }
          if (e.key === "ArrowLeft") { navigateMedia("image", -1); return; }
          if (e.key === "ArrowRight") { navigateMedia("image", 1); return; }
          if (e.key === "f" || e.key === "F") { toggleLightboxFullscreen(); return; }
          if (e.key === "r" || e.key === "R" || e.key === "0") { resetImageView(); return; }
        }
        if (videoModal.classList.contains("show")) {
          if (!vidCurrentId && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { navigateMedia("image", e.key === "ArrowLeft" ? -1 : 1); return; }
          if (e.shiftKey && e.key === "ArrowLeft") { window._gdvMediaNav.navigateVideo(-1); return; }
          if (e.shiftKey && e.key === "ArrowRight") { window._gdvMediaNav.navigateVideo(1); return; }
        }
        if (e.key !== "Escape") return;

        if (lightbox.classList.contains("show")) closeLightbox();

        if (videoModal.classList.contains("show")) {
          const box = videoModal.querySelector('.video-box');
          if (box && box.classList.contains('pseudo-fullscreen')) {
            box.classList.remove('pseudo-fullscreen');
            const button = document.getElementById('vidFullscreen');
            if (button) { button.textContent = 'เต็มจอ'; button.setAttribute('aria-pressed', 'false'); }
            applyVideoAspect();
            requestAnimationFrame(fitVideoPreview);
            return;
          }
          closeVideo();
        }

      });



      // ===== Mobile bottom bar: ย้อนกลับ / หน้าหลัก / ค้นหา =====

      if (mbBack) mbBack.addEventListener("click", function () { smartBack(); });

      if (mbHome) mbHome.addEventListener("click", goHome);

      if (mbSearch) mbSearch.addEventListener("click", function () {

        const s = document.getElementById("fileSearch");

        if (!s) { showToast("ยังไม่มีไฟล์ให้ค้นหา"); return; }

        s.focus();

        s.scrollIntoView({ behavior: "smooth", block: "center" });

      });



      // ===== Form submit =====

      viewerForm.addEventListener("submit", function (e) {

        e.preventDefault();

        showLinkError(false);

        const id = extractId(driveLink.value);

        if (!id) { showLinkError(true); driveLink.focus(); return; }

        if (!clientId && !apiKey) {

          showToast("กรุณาตั้ง Client ID หรือ API Key ก่อน");

          window.scrollTo({ top: 0, behavior: "smooth" });

          return;

        }

        navStack = [{ id: id, name: "Drive" }];

                saveRecentFolder(id);

                listFolder(id);

                pushHash(id); // URL ตามโฟลเดอร์ที่เปิด

                ensureFolderName(id);

              });

              driveLink.addEventListener("input", function () {

                if (linkError.classList.contains("show")) showLinkError(false);

              });



      // ===== ปุ่ม "วาง" — อ่านคลิปบอร์ดแล้วเปิดทันที =====

      const pasteBtn = document.getElementById("pasteBtn");

      if (pasteBtn) pasteBtn.addEventListener("click", function () {

        if (navigator.clipboard && navigator.clipboard.readText) {

          navigator.clipboard.readText().then(function (text) {

            const t = (text || "").trim();

            if (!t) { showToast("คลิปบอร์ดว่างเปล่า"); return; }

            driveLink.value = t;

            viewerForm.dispatchEvent(new Event("submit", { cancelable: true }));

          }).catch(function () {

            showToast("เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — กดค้างที่ช่องกรอกเพื่อวางเอง");

          });

        } else {

          showToast("เบราว์เซอร์ไม่รองรับ — กดค้างที่ช่องกรอกเพื่อวางเอง");

        }

      });



      // ===== Generic icons (แยกสี/รูปตามชนิดไฟล์จริง) =====

      function genericIconSvg(kind) {

        const doc = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';

        const icons = {

          folder:  { c: "#b45309", s: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' },

          video:   { c: "#6b7280", s: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>' },

          image:   { c: "#6b7280", s: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },

          pdf:     { c: "#dc2626", s: doc + '<line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>' },

          word:    { c: "#2563eb", s: doc + '<polyline points="7.5 12.5 9 17.5 10.5 13.5 12 17.5 13.5 12.5"/>' },

          excel:   { c: "#059669", s: doc + '<line x1="8" y1="12" x2="8" y2="18"/><line x1="14" y1="12" x2="14" y2="18"/><line x1="8" y1="15" x2="14" y2="15"/>' },

          ppt:     { c: "#ea580c", s: doc + '<rect x="8" y="12" width="8" height="6" rx="1"/><line x1="12" y1="9" x2="12" y2="12"/>' },

          audio:   { c: "#7c3aed", s: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },

          archive: { c: "#ca8a04", s: doc + '<path d="M12 11v3"/><circle cx="12" cy="17" r="0.5"/><line x1="10" y1="13" x2="14" y2="13"/>' },

          text:    { c: "#6b7280", s: doc + '<line x1="8" y1="9" x2="12" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>' },

          file:    { c: "#6b7280", s: doc }

        };

        const ic = icons[kind] || icons.file;

        return '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="' + ic.c +

          '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ic.s + '</svg>';

      }



      // ===== Recent Folders (เก็บ {id, name} — migrate จากรูปเดิมที่เป็น string id) =====

      function loadRecents() {

        return lsGetJSON("gdv_recent", []).map(function (r) {

          if (typeof r === "string") return { id: r, name: null };

          return { id: r && r.id, name: (r && r.name) || null };

        }).filter(function (r) { return r && r.id; });

      }

      function saveRecentFolder(id, name) {

        let recents = loadRecents();

        const prev = recents.find(function (r) { return r.id === id; });

        if (!name && prev && prev.name) name = prev.name; // รักษาชื่อเดิมถ้ารอบนี้ยังไม่รู้ชื่อ

        recents = recents.filter(function (r) { return r.id !== id; });

        recents.unshift({ id: id, name: name || null });

        if (recents.length > 8) recents.pop();

        lsSet("gdv_recent", JSON.stringify(recents));

        renderRecentFolders();

      }

      // ชื่อโฟลเดอร์ root จาก Drive เมื่อยังไม่รู้ (เปิดผ่านฟอร์ม/ลิงก์แชร์) —

      // ถ้าเคยรู้ชื่อแล้ว (อยู่ใน recents) ใช้เลยไม่ยิง API

      function ensureFolderName(id) {

        const known = loadRecents().find(function (r) { return r.id === id; });

        if (known && known.name) { applyFolderName(id, known.name); return; }

        const auth = authParams();

        if (auth.mode === "none") return;

        let url = "https://www.googleapis.com/drive/v3/files/" + id + "?fields=name";

        if (auth.mode === "key") url += "&key=" + apiKey;

        fetch(url, { headers: auth.headers || {} })

          .then(function (res) { return res.ok ? res.json() : null; })

          .then(function (data) { if (data && data.name) applyFolderName(id, data.name); })

          .catch(function () {});

      }

      function applyFolderName(id, name) {

        const top = navStack[navStack.length - 1];

        if (top && top.id === id && top.name === "Drive") {

          top.name = name;

          renderBreadcrumb();

          const h = document.querySelector(".files-header h2");

          if (h) h.textContent = name;

        }

        const recents = loadRecents();

        const r = recents.find(function (x) { return x.id === id; });

        if (r && !r.name) {

          r.name = name;

          lsSet("gdv_recent", JSON.stringify(recents));

          renderRecentFolders();

        }

      }

      function renderRecentFolders() {

        const wrap = document.getElementById("recentFoldersWrap");

        const list = document.getElementById("recentFoldersList");

        const recents = loadRecents();

        if (!recents.length) { wrap.style.display = "none"; return; }

        wrap.style.display = "block";

        let html = "";

        recents.forEach(function (r) {

          const label = r.name || ("โฟลเดอร์ (" + r.id.substring(0, 6) + "…)");

          html += '<button type="button" class="recent-item" data-id="' + escapeAttr(r.id) + '" title="' + escapeAttr(label) + '">' +

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +

                    '<span class="rc-name">' + escapeHtml(label) + '</span></button>';

        });

        list.innerHTML = html;

        list.querySelectorAll(".recent-item").forEach(function (btn) {

           btn.addEventListener("click", function () {

              const id = btn.dataset.id;

              const found = loadRecents().find(function (x) { return x.id === id; });

              driveLink.value = "https://drive.google.com/drive/folders/" + id;

              navStack = [{ id: id, name: (found && found.name) || "Drive" }];

              saveRecentFolder(id, found && found.name);

              listFolder(id);

              pushHash(id);

           });

        });

      }

      document.getElementById("clearRecentBtn").addEventListener("click", function () {

         lsRemove("gdv_recent");

         renderRecentFolders();

      });



      // ===== My Library Drawer Functions =====
      function updateMyLibraryBadge() {
        const cwCount = (function () {
          try { return JSON.parse(lsGet("gdv_continue") || "[]").length; } catch (_) { return 0; }
        })();
        const wlCount = (function () {
          try { return JSON.parse(lsGet("gdv_watch_later") || "[]").length; } catch (_) { return 0; }
        })();
        const favCount = (function () {
          try { return JSON.parse(lsGet("gdv_favorites") || "[]").length; } catch (_) { return 0; }
        })();
        const total = cwCount + wlCount + favCount;
        const badge = document.getElementById("myLibraryBadge");
        if (badge) {
          badge.textContent = String(total);
          badge.style.display = total > 0 ? "inline-flex" : "none";
        }
        const totalPill = document.getElementById("myLibraryTotalCount");
        if (totalPill) {
          totalPill.textContent = total + " รายการ";
        }
      }

      function openMyLibraryDrawer() {
        const backdrop = document.getElementById("myLibraryBackdrop");
        const drawer = document.getElementById("myLibraryDrawer");
        if (backdrop) backdrop.classList.add("show");
        if (drawer) {
          drawer.classList.add("show");
          drawer.setAttribute("aria-hidden", "false");
        }
        document.body.classList.add("drawer-open");
        updateMyLibraryBadge();
      }

      function closeMyLibraryDrawer() {
        const backdrop = document.getElementById("myLibraryBackdrop");
        const drawer = document.getElementById("myLibraryDrawer");
        if (backdrop) backdrop.classList.remove("show");
        if (drawer) {
          drawer.classList.remove("show");
          drawer.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("drawer-open");
      }

      function initMyLibraryDrawer() {
        const toggle = document.getElementById("myLibraryToggle");
        if (toggle) toggle.addEventListener("click", openMyLibraryDrawer);
        const mb = document.getElementById("mbLibrary");
        if (mb) mb.addEventListener("click", openMyLibraryDrawer);
        const closeBtn = document.getElementById("myLibraryClose");
        if (closeBtn) closeBtn.addEventListener("click", closeMyLibraryDrawer);
        const backdrop = document.getElementById("myLibraryBackdrop");
        if (backdrop) backdrop.addEventListener("click", closeMyLibraryDrawer);
        window.addEventListener("keydown", function (event) {
          if (event.key === "Escape") closeMyLibraryDrawer();
        });
        updateMyLibraryBadge();
      }

      function tryLoadDriveThumbnail(id, imgEl) {
        if (!id || !imgEl || imgEl.dataset.probing) return;
        imgEl.dataset.probing = "1";
        const auth = authParams();
        if (auth.mode === "none") return;
        let url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(id) + "?fields=thumbnailLink&supportsAllDrives=true";
        if (auth.mode === "key" && apiKey) url += "&key=" + encodeURIComponent(apiKey);
        const headers = auth.mode === "bearer" ? { Authorization: "Bearer " + accessToken } : {};
        fetch(url, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(meta => {
            if (meta && meta.thumbnailLink && imgEl.isConnected) {
              imgEl.src = meta.thumbnailLink;
              imgEl.style.display = "block";
              imgEl.classList.add("loaded");
              if (imgEl.parentElement) imgEl.parentElement.classList.add("has-thumb");
              if (typeof mediaThumbs !== "undefined" && mediaThumbs) mediaThumbs[id] = meta.thumbnailLink;
              try { localStorage.setItem("gdv_thumb_" + id, meta.thumbnailLink); } catch (_) {}
            }
          })
          .catch(() => {});
      }

      window.openMyLibraryDrawer = openMyLibraryDrawer;
      window.closeMyLibraryDrawer = closeMyLibraryDrawer;
      window.updateMyLibraryBadge = updateMyLibraryBadge;
      window.tryLoadDriveThumbnail = tryLoadDriveThumbnail;

      // ===== Init =====

      refreshClientIdStatus();

      refreshKeyStatus();

      renderRecentFolders();
      initMyLibraryDrawer();
      renderFavoriteFolders();
      if (window.GDVVideoApi && window.GDVVideoApi.video) renderContinueWatching();

      renderPersonalLibrary();
      updateMyLibraryBadge();
      driveLink.focus();











      // ===== Deep link / hash routing (#/f/<folderId>) =====

      // เปิดโฟลเดอร์จาก URL ได้ + กดปุ่มกลับเบราว์เซอร์ย้อนโฟลเดอร์ได้ (history)

      function currentHashId(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (api && typeof api.currentHashId === "function") return api.currentHashId(...args);
        const m = (location.hash || "").match(/^#\/f\/([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
      }

      function applyHash(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.applyHash !== "function") return undefined;
        return api.applyHash(...args);
      }

      window.addEventListener("popstate", function () {

        const id = currentHashId();

        if (id) applyHash(id); else goHome(true);

      });

      // ถ้ามี hash เริ่มต้น (เช่น กดแชร์ลิงก์/refresh) ให้เปิดเลย

      const initialHashId = currentHashId();

      if (initialHashId) {

        setTimeout(function () {

          // สร้าง entry "หน้าหลัก" คั่นไว้ก่อน เพื่อให้กด Back กลับมาหน้าหลักในแอป

          // แทนการออกจากเว็บทันที (กรณีเข้าลิงก์ hash ตรง ๆ ไม่มีประวัติในแอป)

          try {

            history.replaceState({ fid: null }, "", location.pathname + location.search);

            history.pushState({ fid: initialHashId }, "", "#/f/" + initialHashId);

          } catch (_) {}

          applyHash(initialHashId);

        }, 100);

      }



      // ย้อนกลับอย่างฉลาด: มีประวัติในแอป → ย้อนปกติ / ไม่มี → กลับหน้าหลักแทนการออกจากเว็บ

      function smartBack(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.smartBack !== "function") return undefined;
        return api.smartBack(...args);
      }



      // อัปเดต hash ตอนเปิดโฟลเดอร์ (ใช้ใน handleFileClick/breadcrumb/form) เพื่อ bookmark/ย้อนกลับ

      function pushHash(...args) {
        const api = window.GDVExplorerApi && window.GDVExplorerApi.explorer;
        if (!api || typeof api.pushHash !== "function") return undefined;
        return api.pushHash(...args);
      }

      window.GDVVideoApi = {
        // Live view of the main-app state owned by the index.html IIFE.
        // Getters/setters keep the video-player.js `with (appApi)` binding live.
        get accessToken() { return accessToken; },
        set accessToken(value) { accessToken = value; if (value && typeof schedulePersonalSyncPull === "function") schedulePersonalSyncPull(); },
        get apiKey() { return apiKey; },
        set apiKey(value) { apiKey = value; },
        get tokenExpiry() { return tokenExpiry; },
        set tokenExpiry(value) { tokenExpiry = value; },
        get mediaSession() { return mediaSession; },
        set mediaSession(value) { mediaSession = value; },
        get videoAttempt() { return videoAttempt; },
        set videoAttempt(value) { videoAttempt = value; },
        get videoAttemptTimer() { return videoAttemptTimer; },
        set videoAttemptTimer(value) { videoAttemptTimer = value; },
        get videoSlowTimer() { return videoSlowTimer; },
        set videoSlowTimer(value) { videoSlowTimer = value; },
        get vidCurrentId() { return vidCurrentId; },
        set vidCurrentId(value) { vidCurrentId = value; },
        get currentVideoUrl() { return currentVideoUrl; },
        set currentVideoUrl(value) { currentVideoUrl = value; },
        get videoStatus() { return videoStatus; },
        set videoStatus(value) { videoStatus = value; },
        get videoResumePos() { return videoResumePos; },
        set videoResumePos(value) { videoResumePos = value; },
        get streamWorkerReady() { return streamWorkerReady; },
        set streamWorkerReady(value) { streamWorkerReady = value; },
        get failedVideoAttempt() { return failedVideoAttempt; },
        set failedVideoAttempt(value) { failedVideoAttempt = value; },
        get previewAspect() { return previewAspect; },
        set previewAspect(value) { previewAspect = value; },
        get videoBlobTransfer() { return videoBlobTransfer; },
        set videoBlobTransfer(value) { videoBlobTransfer = value; },
        get mediaPreviousOverflow() { return mediaPreviousOverflow; },
        set mediaPreviousOverflow(value) { mediaPreviousOverflow = value; },
        get currentMediaIndex() { return currentMediaIndex; },
        set currentMediaIndex(value) { currentMediaIndex = value; },
        get currentMediaKind() { return currentMediaKind; },
        set currentMediaKind(value) { currentMediaKind = value; },
        get videoCache() { return videoCache; },
        get routeCooldown() { return routeCooldown; },
        get MEDIA_STREAM_FAIL_MSG() { return MEDIA_STREAM_FAIL_MSG; },
        get videoModal() { return videoModal; },
        get vidPlayer() { return vidPlayer; },
        get vidFrame() { return vidFrame; },
        get vidLoading() { return vidLoading; },
        get vidLoadingText() { return vidLoadingText; },
        get vidTitle() { return vidTitle; },
        get vidOpenTab() { return vidOpenTab; },
        get vidProgressBar() { return vidProgressBar; },
        get lightbox() { return lightbox; },
        get filesWrap() { return filesWrap; },
        lsGet,
        lsSet,
        lsRemove,
        fileMetaOf,
        formatSize,
        authParams,
        classifyApiError,
        closeLightbox,
        showToast,
        refreshVideoCacheUI,
        videoCacheScope,
        resetPdfViewer,
        revokeCurrentDoc,
        pruneVpos,
        fallbackIframe,
        ensureToken
      };

      window.GDVExplorerApi = {
        // The main IIFE owns the live state; drive-explorer.js owns the explorer functions.
        explorer: null,
        get accessToken() { return accessToken; },
        set accessToken(value) { accessToken = value; if (value && typeof schedulePersonalSyncPull === "function") schedulePersonalSyncPull(); },
        get apiKey() { return apiKey; },
        set apiKey(value) { apiKey = value; },
        get clientId() { return clientId; },
        set clientId(value) { clientId = value; },
        get tokenExpiry() { return tokenExpiry; },
        set tokenExpiry(value) { tokenExpiry = value; },
        get tokenClient() { return tokenClient; },
        set tokenClient(value) { tokenClient = value; },
        get tokenResolver() { return tokenResolver; },
        set tokenResolver(value) { tokenResolver = value; },
        get userProfile() { return userProfile; },
        set userProfile(value) { userProfile = value; },
        get authRestoreAttempted() { return authRestoreAttempted; },
        set authRestoreAttempted(value) { authRestoreAttempted = value; },
        get navStack() { return navStack; },
        set navStack(value) { navStack = value; },
        get driveLink() { return driveLink; },
        get displayedFolderId() { return displayedFolderId; },
        set displayedFolderId(value) { displayedFolderId = value; },
        get folderPositions() { return folderPositions; },
        get folderRequest() { return folderRequest; },
        set folderRequest(value) { folderRequest = value; },
        get folderAbort() { return folderAbort; },
        set folderAbort(value) { folderAbort = value; },
        get currentFolderId() { return currentFolderId; },
        set currentFolderId(value) { currentFolderId = value; },
        get allFiles() { return allFiles; },
        set allFiles(value) { allFiles = value; },
        get mediaThumbs() { return mediaThumbs; },
        set mediaThumbs(value) { mediaThumbs = value; },
        get folderCoverQueue() { return folderCoverQueue; },
        set folderCoverQueue(value) { folderCoverQueue = value; },
        get folderCoverActive() { return folderCoverActive; },
        set folderCoverActive(value) { folderCoverActive = value; },
        get pdfInLightbox() { return pdfInLightbox; },
        set pdfInLightbox(value) { pdfInLightbox = value; },
        get vidCurrentId() { return vidCurrentId; },
        set vidCurrentId(value) { vidCurrentId = value; },
        get clientIdInput() { return clientIdInput; },
        get clientIdDot() { return clientIdDot; },
        get clientIdStatus() { return clientIdStatus; },
        get clientIdText() { return clientIdText; },
        get apiKeyInput() { return apiKeyInput; },
        get keyDot() { return keyDot; },
        get keyStatus() { return keyStatus; },
        get keyStatusText() { return keyStatusText; },
        get settingsHint() { return settingsHint; },
        get authBtnText() { return authBtnText; },
        get userInfo() { return userInfo; },
        get breadcrumb() { return breadcrumb; },
        get filesWrap() { return filesWrap; },
        get mobileBar() { return mobileBar; },
        get mbSearch() { return mbSearch; },
        get folderCoverCache() { return folderCoverCache; },
        get folderCoverObserved() { return folderCoverObserved; },
        get folderCoverObserver() { return folderCoverObserver; },
        get google() { return window.google; },
        lsGet,
        lsSet,
        escapeHtml,
        escapeAttr,
        formatSize,
        formatDateTh,
        fileTypeOf,
        fileExt,
        fileIconKind,
        genericIconSvg,
        showToast,
        squirtFile,
        readPersonalData,
        attachPersonalButtons,
        attachWatchedButtons,
        openLightbox,
        openDocument,
        openVideo,
        stepPdfPage,
        mediaList,
        navigateMedia,
        ensureFolderName,
        renderNeedAuth: function () {
          filesWrap.innerHTML = '<div class="state-box"><h3>ต้องตั้งค่าการเชื่อมต่อก่อน</h3><p>กรุณาลงชื่อเข้าใช้ Google หรือกำหนด API Key ก่อนเปิดโฟลเดอร์</p></div>';
        }
      };

      // Lightbox/PDF shares the main app's live state and existing video helpers.
      window.GDVLightboxApi = Object.create(window.GDVVideoApi);
      Object.defineProperty(window.GDVLightboxApi, "media", { value: null, writable: true, configurable: true });
      Object.defineProperties(window.GDVLightboxApi, {
        allFiles: { get() { return allFiles; }, set(value) { allFiles = value; } },
        mediaThumbs: { get() { return mediaThumbs; }, set(value) { mediaThumbs = value; } },
        navStack: { get() { return navStack; }, set(value) { navStack = value; } },
        pdfInLightbox: { get() { return pdfInLightbox; }, set(value) { pdfInLightbox = value; } },
        pdfDocument: { get() { return pdfDocument; }, set(value) { pdfDocument = value; } },
        pdfRenderTask: { get() { return pdfRenderTask; }, set(value) { pdfRenderTask = value; } },
        pdfLibraryPromise: { get() { return pdfLibraryPromise; }, set(value) { pdfLibraryPromise = value; } },
        pdfPageNumber: { get() { return pdfPageNumber; }, set(value) { pdfPageNumber = value; } },
        pdfScale: { get() { return pdfScale; }, set(value) { pdfScale = value; } },
        pdfFitMode: { get() { return pdfFitMode; }, set(value) { pdfFitMode = value; } },
        lastPdfWheelTime: { get() { return lastPdfWheelTime; }, set(value) { lastPdfWheelTime = value; } },
        pdfScrollToBottomOnRender: { get() { return pdfScrollToBottomOnRender; }, set(value) { pdfScrollToBottomOnRender = value; } },
        pdfRenderVersion: { get() { return pdfRenderVersion; }, set(value) { pdfRenderVersion = value; } },
        currentDocUrl: { get() { return currentDocUrl; }, set(value) { currentDocUrl = value; } },
        imageView: { get() { return imageView; }, set(value) { imageView = value; } },
        imageControlsVisible: { get() { return imageControlsVisible; }, set(value) { imageControlsVisible = value; } },
        imgTapTimer: { get() { return imgTapTimer; }, set(value) { imgTapTimer = value; } },
        imgLastTapTime: { get() { return imgLastTapTime; }, set(value) { imgLastTapTime = value; } },
        lbImg: { get() { return lbImg; } },
        lbOrig: { get() { return lbOrig; } },
        lbPrev: { get() { return lbPrev; } },
        lbNext: { get() { return lbNext; } },
        pdfStage: { get() { return pdfStage; } },
        pdfCanvas: { get() { return pdfCanvas; } },
        pdfControls: { get() { return pdfControls; } },
        pdfPageCount: { get() { return pdfPageCount; } },
        pdfLoading: { get() { return pdfLoading; } },
        pdfLoadingText: { get() { return pdfLoadingText; } }
      });
      Object.assign(window.GDVLightboxApi, {
        getBlobCached, origCacheKey, cdnLargeUrl,
        readPersonalData, updatePersonalData, renderPersonalLibrary, refreshFolderCovers,
        setVideoStatus, cancelVideoAttempt, resetMediaPlayback, openVideo,
        fitVideoPreview, applyPreviewAspect, configurePreviewFullscreen,
        cancelVideoBlobTransfer, closeVideo
      });

      window.GDVCollectionApi = {
        get driveLink() { return driveLink; },
        get navStack() { return navStack; },
        set navStack(value) { navStack = value; },
        get accessToken() { return accessToken; },
        get apiKey() { return apiKey; },
        extractId,
        handleFileClick,
        pushHash,
        openFolderAndReveal,
        genericIconSvg,
        observeFolderCovers,
        ensureToken,
        authParams,
        lsGet,
        lsSet,
        showToast
      };

    })();
