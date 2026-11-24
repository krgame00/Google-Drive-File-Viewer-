// video-library.js — Watched videos, continue-watching history, and shelf rendering for Google Drive File Viewer
// Contains:
//   - createVideoLibrary factory
//   - cachedVideoThumb
//   - loadWatchedVideos
//   - toggleWatchedVideo
//   - attachWatchedButtons
//   - loadContinueWatching
//   - saveVideoPos
//   - renderContinueWatching
//   - renderCwHero
//   - renderCwShelf

function createVideoLibraryImpl(app, deps) {
  'use strict';
  app = app || {};
  deps = deps || {};

  function getVidCurrentId() {
    if (typeof deps.getVidCurrentId === 'function') return deps.getVidCurrentId();
    if (typeof deps.vidCurrentId === 'function') return deps.vidCurrentId();
    if (deps.vidCurrentId !== undefined) return deps.vidCurrentId;
    if (typeof app.vidCurrentId === 'function') return app.vidCurrentId();
    return app && app.vidCurrentId !== undefined ? app.vidCurrentId : null;
  }

  function getOpenVideo() {
    if (typeof deps.openVideo === 'function') return deps.openVideo;
    if (typeof app.openVideo === 'function') return app.openVideo;
    return function () {};
  }

  function getPrepareStreamWorker() {
    if (typeof deps.prepareStreamWorker === 'function') return deps.prepareStreamWorker;
    if (typeof app.prepareStreamWorker === 'function') return app.prepareStreamWorker;
    return null;
  }

  function getWarmVideoStream() {
    if (typeof deps.warmVideoStream === 'function') return deps.warmVideoStream;
    if (typeof app.warmVideoStream === 'function') return app.warmVideoStream;
    return null;
  }

  function getDocument() {
    return app.document || (typeof document !== 'undefined' ? document : null);
  }

  function getWindow() {
    return app.window || (typeof window !== 'undefined' ? window : null);
  }

  function lsGet(key) {
    if (typeof app.lsGet === 'function') return app.lsGet(key);
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch (_) {}
    return null;
  }

  function lsSet(key, value) {
    if (typeof app.lsSet === 'function') return app.lsSet(key, value);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value));
    } catch (_) {}
  }

  function lsRemove(key) {
    if (typeof app.lsRemove === 'function') return app.lsRemove(key);
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (_) {}
  }

  function cachedVideoThumb(id) {
    if (typeof app.mediaThumbs !== 'undefined' && app.mediaThumbs && app.mediaThumbs[id]) return app.mediaThumbs[id];
    try {
      const stored = lsGet('gdv_thumb_' + id);
      if (stored) return stored;
    } catch (_) {}
    const meta = typeof app.fileMetaOf === 'function' ? app.fileMetaOf(id) : null;
    return meta && meta.thumbnailLink ? meta.thumbnailLink : null;
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

  function attachWatchedButtons() {
    if (typeof app.accessToken !== 'undefined' && app.accessToken) {
      const prep = getPrepareStreamWorker();
      if (typeof prep === 'function') {
        try { prep(); } catch (_) {}
      }
    }
    const watched = new Set(loadWatchedVideos());
    let warmCount = 0;
    const maxWarm = 4;
    const warmFn = getWarmVideoStream();
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && warmCount < maxWarm && entry.target && entry.target.dataset && entry.target.dataset.id) {
          warmCount++;
          if (typeof warmFn === 'function') warmFn(entry.target.dataset.id);
          try { observer.unobserve(entry.target); } catch (_) {}
        }
      });
    }, { rootMargin: '100px' }) : null;

    const doc = getDocument();
    const fw = app.filesWrap || (doc && doc.getElementById ? doc.getElementById('filesWrap') : null);
    if (!fw || typeof fw.querySelectorAll !== 'function') return;

    fw.querySelectorAll('.file-card[data-kind="video"]').forEach(card => {
      if (card && typeof card.addEventListener === 'function' && card.dataset && card.dataset.id) {
        const warm = function () {
          if (typeof warmFn === 'function') warmFn(card.dataset.id);
        };
        card.addEventListener('touchstart', warm, { passive: true, once: true });
        card.addEventListener('pointerenter', warm, { passive: true, once: true });
        if (observer && warmCount < maxWarm) {
          try { observer.observe(card); } catch (_) {}
        }
      }
      const button = doc.createElement("button");
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
      const metaContent = card.querySelector(".file-meta-content");
      if (metaContent && typeof metaContent.appendChild === 'function') {
        metaContent.appendChild(button);
      }
    });
  }

  function loadContinueWatching() {
    try {
      const items = JSON.parse(lsGet("gdv_continue") || "[]");
      return Array.isArray(items) ? items.filter(x => x && typeof x.id === "string" && /^[\w-]+$/.test(x.id) && typeof x.name === "string" && Number.isFinite(x.position) && x.position > 2).slice(0, 30) : [];
    } catch (_) { return []; }
  }

  function saveVideoPos() {
    const vidCurrentId = getVidCurrentId();
    if (!vidCurrentId || !app.vidPlayer || (app.vidPlayer.style && app.vidPlayer.style.display === "none")) return;
    const time = app.vidPlayer.currentTime;
    if (!Number.isFinite(time)) return;
    // บันทึกภาพเฟรมปัจจุบันของวิดีโอเป็นภาพปกสำรอง (ถ้ายังไม่มีในแคช)
    try {
      const doc = getDocument();
      if (doc && app.vidPlayer.videoWidth > 0 && typeof localStorage !== "undefined" && !localStorage.getItem("gdv_thumb_" + vidCurrentId)) {
        const canvas = doc.createElement("canvas");
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
      lsRemove("gdv_vpos_" + vidCurrentId);
    } else {
      if (time <= 2) return;
      const position = Math.floor(time);
      lsSet("gdv_vpos_" + vidCurrentId, position);
      const title = (app.vidTitle && app.vidTitle.textContent) || "วิดีโอ";
      const now = (app.Date && typeof app.Date.now === 'function') ? app.Date.now() : (typeof Date !== 'undefined' ? Date.now() : 0);
      items.unshift({ id: vidCurrentId, name: title, position, updated: now });
    }
    lsSet("gdv_continue", JSON.stringify(items.slice(0, 30)));
    if (typeof app.pruneVpos === 'function') app.pruneVpos(100);
  }

  function renderContinueWatching() {
    const doc = getDocument();
    if (!doc) return;
    let section = doc.getElementById("continueWatching");
    const drawerMount = doc.getElementById("myLibraryContent");
    if (!section) {
      section = doc.createElement("section");
      section.id = "continueWatching";
      section.className = "favorite-folders";
      if (drawerMount) drawerMount.appendChild(section);
      else {
        const card = doc.getElementById("browserCard");
        if (card && typeof card.before === 'function') card.before(section);
      }
    } else if (drawerMount && section.parentElement !== drawerMount) {
      drawerMount.appendChild(section);
    }
    section.innerHTML = '<h3>ดูต่อจากครั้งล่าสุด</h3><p>บันทึกในเบราว์เซอร์นี้ สูงสุด 30 รายการ · จำเวลาได้เฉพาะเครื่องเล่นโดยตรง ไม่รวมพรีวิว Google Drive</p>';
    const items = loadContinueWatching();
    renderCwHero(items);
    renderCwShelf(items);
    const win = getWindow();
    if (!items.length) {
      const empty = doc.createElement("p");
      empty.textContent = "วิดีโอที่ดูค้างไว้จะปรากฏที่นี่";
      section.appendChild(empty);
      if (win && win.updateMyLibraryBadge) win.updateMyLibraryBadge();
      return;
    }
    const grid = doc.createElement("div");
    grid.className = "resume-grid";
    items.forEach(item => {
      const row = doc.createElement("div");
      row.className = "favorite-folder resume-card";
      const button = doc.createElement("button");
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
        if (win && win.closeMyLibraryDrawer) win.closeMyLibraryDrawer();
        lsSet("gdv_vpos_" + item.id, item.position);
        const openFn = getOpenVideo();
        openFn(item.id, item.name);
      };
      const remove = doc.createElement("button");
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
    if (win && win.updateMyLibraryBadge) win.updateMyLibraryBadge();
  }

  // Hero "ดูต่อจากครั้งล่าสุด" บนหน้าหลัก (#cwHero) — การ์ดใหญ่ของรายการแรก
  function renderCwHero(items) {
    const doc = getDocument();
    if (!doc) return;
    const hero = doc.getElementById("cwHero");
    if (!hero) return;
    const first = items[0];
    if (!first) { hero.hidden = true; hero.innerHTML = ""; return; }
    const minutes = Math.floor(first.position / 60);
    const seconds = String(first.position % 60).padStart(2, "0");
    const progressPercent = Math.min(96, Math.max(8, Math.round((first.position / (first.duration || (first.position + 120))) * 100)));
    const safeName = (first.name || "").replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
    const cachedThumb = (function () {
      if (typeof app.mediaThumbs !== "undefined" && app.mediaThumbs && app.mediaThumbs[first.id]) return app.mediaThumbs[first.id];
      try { return localStorage.getItem("gdv_thumb_" + first.id); } catch (_) { return null; }
    })();
    const thumbUrl = cachedThumb || ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(first.id) + "&sz=w640");
    const safeThumbUrl = (thumbUrl || "").replace(/"/g, '&quot;');
    const safeId = (first.id || "").replace(/['"\\]/g, "");

    hero.innerHTML = "";
    const thumbBox = doc.createElement("div");
    thumbBox.className = "cw-hero-thumb" + (cachedThumb ? " has-thumb" : "");
    thumbBox.setAttribute("aria-hidden", "true");
    thumbBox.innerHTML = `
      <img class="cw-hero-img${cachedThumb ? ' loaded' : ''}" src="${safeThumbUrl}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.remove('has-thumb');if(window.tryLoadDriveThumbnail)window.tryLoadDriveThumbnail('${safeId}',this)" onload="this.classList.add('loaded');this.parentElement.classList.add('has-thumb')" />
      <div class="cw-hero-progress"><div class="cw-hero-progress-bar" style="width:${progressPercent}%"></div></div>
    `;
    const info = doc.createElement("div");
    info.className = "cw-hero-info";
    const label = doc.createElement("span");
    label.className = "cw-hero-label";
    label.textContent = "ดูต่อจากครั้งล่าสุด";
    const titleEl = doc.createElement("span");
    titleEl.className = "cw-hero-title";
    titleEl.textContent = first.name || "วิดีโอ";
    titleEl.title = safeName;
    const meta = doc.createElement("span");
    meta.className = "cw-hero-meta";
    meta.textContent = "ดูต่อที่ " + minutes + ":" + seconds + " · ความคืบหน้า " + progressPercent + "%";
    const actions = doc.createElement("div");
    actions.className = "cw-hero-actions";
    const playBtn = doc.createElement("button");
    playBtn.type = "button";
    playBtn.className = "btn-primary cw-hero-play";
    playBtn.textContent = "▶ เล่นต่อ";
    const win = getWindow();
    playBtn.onclick = () => {
      if (win && win.closeMyLibraryDrawer) win.closeMyLibraryDrawer();
      lsSet("gdv_vpos_" + first.id, first.position);
      const openFn = getOpenVideo();
      openFn(first.id, first.name);
    };
    const folderBtn = doc.createElement("button");
    folderBtn.type = "button";
    folderBtn.className = "btn-ghost cw-hero-folder";
    folderBtn.textContent = "เปิดโฟลเดอร์";
    folderBtn.title = "เปิดโฟลเดอร์แม่ของคลิปนี้ในแอป (มีคลัง) — ถ้าไม่มีจะเปิดหน้าไฟล์บน Google Drive แทน";
    folderBtn.onclick = () => {
      const collApi = win && win.GDVCollectionApi;
      if (collApi && typeof collApi.openItemById === "function" && collApi.openItemById(first.id)) {
        return;
      }
      try {
        if (win && typeof win.open === 'function') win.open("https://drive.google.com/file/d/" + first.id + "/view", "_blank", "noopener");
      } catch (_) {}
    };
    actions.append(playBtn, folderBtn);
    info.append(label, titleEl, meta, actions);
    hero.append(thumbBox, info);
    hero.hidden = false;
  }

  // ชั้น "ดูต่อของฉัน" (#cwShelf) บนหน้าหลัก — โชว์ทุกรายการเมื่อมีตั้งแต่สองใบ
  function renderCwShelf(items) {
    const doc = getDocument();
    if (!doc) return;
    const shelf = doc.getElementById("cwShelf");
    if (!shelf) return;
    if (!items || items.length < 2) { shelf.hidden = true; shelf.innerHTML = ""; return; }
    shelf.innerHTML = "";
    const shelfLabel = doc.createElement("span");
    shelfLabel.className = "cw-shelf-label";
    shelfLabel.textContent = "ดูต่อของฉัน";
    shelf.append(shelfLabel);
    const shelfRow = doc.createElement("div");
    shelfRow.className = "cw-shelf-row";
    const win = getWindow();
    items.forEach(function (item) {
      const minutes = Math.floor(item.position / 60);
      const seconds = String(item.position % 60).padStart(2, "0");
      const progressPercent = Math.min(96, Math.max(8, Math.round((item.position / (item.duration || (item.position + 120))) * 100)));
      const safeName = (item.name || "วิดีโอ").replace(/[<>&"]/g, function (s) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[s]; });
      const cachedThumb = (function () {
        if (typeof app.mediaThumbs !== "undefined" && app.mediaThumbs && app.mediaThumbs[item.id]) return app.mediaThumbs[item.id];
        try { return localStorage.getItem("gdv_thumb_" + item.id); } catch (_) { return null; }
      })();
      const thumbUrl = (cachedThumb || "https://drive.google.com/thumbnail?id=" + encodeURIComponent(item.id) + "&sz=w480").replace(/"/g, "&quot;");
      const card = doc.createElement("button");
      card.type = "button";
      card.className = "cw-shelf-card";
      card.title = safeName;
      card.innerHTML =
        '<img class="cw-shelf-img' + (cachedThumb ? " loaded" : "") + '" src="' + thumbUrl + '" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'" onload="this.classList.add(\'loaded\')" />' +
        '<span class="cw-shelf-progress"><i style="width:' + progressPercent + '%"></i></span>' +
        '<span class="cw-shelf-name">' + safeName + '</span>' +
        '<span class="cw-shelf-meta">ดูต่อที่ ' + minutes + ":" + seconds + " · " + progressPercent + "%</span>";
      card.onclick = function () {
        if (win && win.closeMyLibraryDrawer) win.closeMyLibraryDrawer();
        lsSet("gdv_vpos_" + item.id, item.position);
        const openFn = getOpenVideo();
        openFn(item.id, item.name);
      };
      shelfRow.append(card);
    });
    shelf.append(shelfRow);
    shelf.hidden = false;
  }

  return {
    cachedVideoThumb,
    loadWatchedVideos,
    toggleWatchedVideo,
    attachWatchedButtons,
    loadContinueWatching,
    saveVideoPos,
    renderContinueWatching,
    renderCwHero,
    renderCwShelf
  };
}

const defaultLibrary = createVideoLibraryImpl({});

const libraryApi = {
  createVideoLibrary: createVideoLibraryImpl,
  cachedVideoThumb: defaultLibrary.cachedVideoThumb,
  loadWatchedVideos: defaultLibrary.loadWatchedVideos,
  toggleWatchedVideo: defaultLibrary.toggleWatchedVideo,
  attachWatchedButtons: defaultLibrary.attachWatchedButtons,
  loadContinueWatching: defaultLibrary.loadContinueWatching,
  saveVideoPos: defaultLibrary.saveVideoPos,
  renderContinueWatching: defaultLibrary.renderContinueWatching,
  renderCwHero: defaultLibrary.renderCwHero,
  renderCwShelf: defaultLibrary.renderCwShelf
};

if (typeof window !== 'undefined') {
  window.GDVVideoLibrary = libraryApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = libraryApi;
}
