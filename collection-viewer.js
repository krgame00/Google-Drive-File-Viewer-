// collection-viewer.js — Collection Viewer IIFE
// Depends on: collections-data.js (COLL_CHECKED_AT, XBEP_COLLECTION)
// Depends on: window.GDVCollectionApi (the explicit boundary to the main app)
(function(){

  const appApi = window.GDVCollectionApi;
  if (!appApi) throw new Error("Collection viewer requires GDVCollectionApi");

  const grid = document.getElementById("collGrid");

  const chipsWrap = document.getElementById("collChips");

  const searchEl = document.getElementById("collSearch");

  const clearBtn = document.getElementById("collSearchClear");

  const toggleBtn = document.getElementById("collToggle");

  const emptyEl = document.getElementById("collEmpty");

  const countEl = document.getElementById("collCount");

  if(!grid) return;
  if(typeof XBEP_COLLECTION === "undefined"){
    var dataScript = document.createElement("script");
    dataScript.src = "collections-data.js";
    dataScript.onload = function(){
      var viewerScript = document.createElement("script");
      viewerScript.src = "collection-viewer.js";
      document.body.appendChild(viewerScript);
    };
    document.body.appendChild(dataScript);
    return;
  }

  // group dates for chips

  const dates = Array.from(new Set(XBEP_COLLECTION.map(function(c){return c.date||"ไม่ระบุ"}))).filter(Boolean);

  // sort dates newest first by d.m.yy

  function dateKey(d){ var m=(d||"").match(/(\d+)\.(\d+)\.(\d+)/); if(!m) return 0; return parseInt(m[3])*10000+parseInt(m[2])*100+parseInt(m[1]); }

  dates.sort(function(a,b){ return dateKey(b)-dateKey(a); });

  const allChip = {label:"ทั้งหมด", value:"all"};

  const chipList = [allChip].concat(dates.map(function(d){ return {label:d, value:d}; }));

  let activeDate = localStorage.getItem("gdv_coll_date") || "all";

  if(chipList.findIndex(function(c){return c.value===activeDate})<0) activeDate="all";

  let q = "";
  let sortMode = localStorage.getItem("gdv_coll_sort") || "newest";
  if(!["newest","oldest","name"].includes(sortMode)) sortMode="newest";
  const sortEl=document.getElementById("collSort");
  sortEl.value=sortMode;
  sortEl.addEventListener("change",function(){sortMode=sortEl.value;localStorage.setItem("gdv_coll_sort",sortMode);collPage=1;localStorage.setItem("gdv_coll_page","1");render();});
  let showDead = localStorage.getItem("gdv_coll_showDead")==="1";
  let showNoDate = localStorage.getItem("gdv_coll_showNoDate")!=="0"; // default show
  let showSoloSquirt = localStorage.getItem("gdv_coll_solo_squirt")==="1";
  // ===== Tag: น้ำพุ่ง (squirting) — local + Drive appData sync, last-write-wins =====
  var TAG_LS = "gdv_tags_v1", TAG_FILE_LS = "gdv_tags_fileid", TAG_NAME = "gdv-tags.json";
  function tagLoad(){ try { return JSON.parse(localStorage.getItem(TAG_LS)||"{}")||{}; } catch(_){ return {}; } }
  function tagSave(){ try { localStorage.setItem(TAG_LS, JSON.stringify(tagOverrides)); } catch(_){} }
  var tagOverrides = tagLoad();
  function effSq(c){ var o=tagOverrides[c.id]||(c.prev_id&&tagOverrides[c.prev_id]); if(o) return !!o.s; return !!c.squirting; }
  var tagPushTimer=null, tagFileId=localStorage.getItem(TAG_FILE_LS)||null, tagLastToken=null, tagBusy=false;
  function tagStatus(t){ var el=document.getElementById("collTagSyncStatus"); if(el) el.textContent=t; }
  function tagMerge(remote){
    var changed=false;
    Object.keys(remote||{}).forEach(function(id){
      var r=remote[id], l=tagOverrides[id];
      if(!l || (r.t||0)>(l.t||0)){ tagOverrides[id]=r; changed=true; }
    });
    if(changed){ tagSave(); render(); }
    return changed;
  }
  async function tagApiList(token){
    var r=await fetch("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent("'appDataFolder' in parents and name='"+TAG_NAME+"' and trashed=false")+"&spaces=appDataFolder&fields=files(id,modifiedTime)",{headers:{Authorization:"Bearer "+token}});
    if(!r.ok) throw new Error("list "+r.status);
    return r.json();
  }
  async function tagPull(){
    if(tagBusy) return;
    try{
      if(!appApi.accessToken) return;
      tagBusy=true; tagStatus("กำลังซิงก์…");
      var token=appApi.accessToken, j=await tagApiList(token);
      if(j.files&&j.files.length){
        tagFileId=j.files[0].id; localStorage.setItem(TAG_FILE_LS,tagFileId);
        var d=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(tagFileId)+"?alt=media",{headers:{Authorization:"Bearer "+token}});
        if(d.ok){ var body=await d.json(); var ch=tagMerge(body.tags); tagStatus("ซิงก์แล้ว"+(ch?" (มีอัปเดต)":"")); tagPushMerged(token); }
        else tagStatus("ดึงไม่สำเร็จ");
      } else tagStatus("ยังไม่มีแท็กบน Drive");
    }catch(_){ tagStatus("ซิงก์ไม่สำเร็จ"); } finally { tagBusy=false; }
  }
  async function tagPushMerged(token){
    try{
      var payload=JSON.stringify({version:1,tags:tagOverrides});
      if(!tagFileId){
        var c=await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({name:TAG_NAME,parents:["appDataFolder"],mimeType:"application/json"})});
        if(!c.ok) return false; tagFileId=(await c.json()).id; localStorage.setItem(TAG_FILE_LS,tagFileId);
      }
      var u=await fetch("https://www.googleapis.com/upload/drive/v3/files/"+encodeURIComponent(tagFileId)+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:payload}); return !!(u&&u.ok);
    }catch(_){ return false; }
  }
  function tagSchedulePush(){
    if(!appApi.accessToken){ tagStatus("เก็บในเครื่อง (ยังไม่ sign-in)"); return; }
    clearTimeout(tagPushTimer);
    tagPushTimer=setTimeout(function(){ tagStatus("กำลังบันทึก…"); tagPushMerged(appApi.accessToken).then(function(ok){ tagStatus(ok?"บันทึกแล้ว ✓":"บันทึกไม่สำเร็จ"); }); },1500);
  }
  function toggleTag(id){
    var item=XBEP_COLLECTION.find(function(x){return x.id===id});
    if(!item) return;
    var nv=!effSq(item);
    tagOverrides[id]={s:nv?1:0,t:Date.now()};
    tagSave(); render(); tagSchedulePush();
    appApi.showToast(nv?"ติดแท็ก 💦 น้ำพุ่งแล้ว":"ถอดแท็ก 💦 แล้ว");
  }
  function attachTagButtons(){
    grid.querySelectorAll("[data-tag]").forEach(function(btn){
      btn.addEventListener("click",function(ev){ ev.stopPropagation(); toggleTag(btn.getAttribute("data-tag")); });
    });
    var syncBtn=document.getElementById("collTagSync");
    if(syncBtn&&!syncBtn.dataset.wired){
      syncBtn.dataset.wired="1";
      syncBtn.addEventListener("click",function(){
        appApi.ensureToken().then(function(t){ if(t){ tagPull(); } else appApi.showToast("ลงชื่อเข้าใช้ไม่สำเร็จ"); });
      });
    }
  }
  setInterval(function(){
    try{
      if(appApi.accessToken){
        if(appApi.accessToken!==tagLastToken){ tagLastToken=appApi.accessToken; tagPull(); }
      } else tagLastToken=null;
    }catch(_){}
  },3000);
  try{window.addEventListener("gdv-auth",function(){ tagPull(); });}catch(_){}
  try{if(appApi.accessToken) tagPull();}catch(_){}
  let collPage = parseInt(localStorage.getItem("gdv_coll_page")||"1",10) || 1;
  let collPageMode = localStorage.getItem("gdv_coll_pagemode")!=="0";
  function collectionLayout(width, mobile) {
    const columns = Math.max(1, Math.floor((width + 10) / 230));
    return {pageSize: mobile ? 4 : columns * 2, buttons: width < 340 ? 1 : width < 480 ? 3 : 5};
  }
  let collLayout = collectionLayout(grid.clientWidth || 320, window.matchMedia('(max-width: 680px)').matches);
  let COLL_PAGE_SIZE = collLayout.pageSize;
  let collResizeTimer;
  function resizeCollectionPages() {
    clearTimeout(collResizeTimer);
    collResizeTimer = setTimeout(function () {
      if (!grid.clientWidth) return;
      const next = collectionLayout(grid.clientWidth, window.matchMedia('(max-width: 680px)').matches);
      if (next.pageSize === COLL_PAGE_SIZE && next.buttons === collLayout.buttons) return;
      const firstItem = (collPage - 1) * COLL_PAGE_SIZE;
      COLL_PAGE_SIZE = next.pageSize;
      collLayout = next;
      collPage = Math.floor(firstItem / COLL_PAGE_SIZE) + 1;
      localStorage.setItem('gdv_coll_page', String(collPage));
      render();
    }, 120);
  }
  if (window.ResizeObserver) new ResizeObserver(resizeCollectionPages).observe(grid);
  window.addEventListener('resize', resizeCollectionPages);

  let collapsed = localStorage.getItem("gdv_coll_collapsed")==="1";



  function applyCollapsed(){

    grid.style.display = collapsed ? "none" : "";

    if(chipsWrap) chipsWrap.style.display = collapsed ? "none" : "";
    var toolbarEl=document.getElementById("collToolbar");if(toolbarEl) toolbarEl.style.display = collapsed ? "none" : "";
    var pagination=document.getElementById("collPagi");if(pagination && collapsed) pagination.style.display="none";
    if(toggleBtn) toggleBtn.setAttribute("aria-expanded",String(!collapsed));

    if(emptyEl) emptyEl.style.display = "none";

    if(toggleBtn) toggleBtn.textContent = collapsed ? "แสดง" : "ซ่อน";

  }

  applyCollapsed();

  if(toggleBtn) toggleBtn.addEventListener("click", function(){

    collapsed=!collapsed; localStorage.setItem("gdv_coll_collapsed", collapsed?"1":"0"); applyCollapsed(); if(!collapsed){ renderChips(); render(); }

  });



  var chipsExpanded = localStorage.getItem("gdv_coll_chips_exp")==="1";
  function renderChips(){
    if(!chipsWrap || collapsed) return;
    chipsWrap.innerHTML="";
    chipsWrap.className = "filter-chips" + (chipsExpanded ? "" : " collapsed");
    chipList.forEach(function(c){
      var btn=document.createElement("button");
      btn.type="button"; btn.className="filter-chip"+(activeDate===c.value?" active":"");
      btn.dataset.date=c.value;
      var cnt = c.value==="all" ? XBEP_COLLECTION.length : XBEP_COLLECTION.filter(function(x){return (x.date||"ไม่ระบุ")===c.value}).length;
      btn.innerHTML = '<span>'+c.label+'</span> <span style="opacity:.6">'+cnt+'</span>';
      btn.addEventListener("click", function(){ activeDate=c.value; localStorage.setItem("gdv_coll_date", activeDate); renderChips(); render(); });
      chipsWrap.appendChild(btn);
    });
    if(chipList.length > 12){
      var more=document.createElement("button");
      more.type="button"; more.className="filter-chip";
      more.style.borderStyle="dashed";
      more.textContent = chipsExpanded ? "ซ่อน ▲" : "…อีก "+(chipList.length-12)+" วัน ▾";
      more.addEventListener("click", function(){ chipsExpanded=!chipsExpanded; localStorage.setItem("gdv_coll_chips_exp", chipsExpanded?"1":"0"); renderChips(); });
      chipsWrap.appendChild(more);
    }
  }

  // Status banner — dead + no-date summary
  (function(){
    var el=document.getElementById("collMissing");
    if(!el) return;
    var dead=XBEP_COLLECTION.filter(function(c){var da=!c.dead, ma=!!c.mega_url && !c.mega_dead; return !(da||ma);}).length;
    var nodate=XBEP_COLLECTION.filter(function(c){var da=!c.dead, ma=!!c.mega_url && !c.mega_dead; if(!(da||ma)) return false; return (!c.drive_name || c.drive_name==="มืด" || c.drive_name==="โฟลเดอร์ไม่มีชื่อ" || !/\d{1,2}\.\d{1,2}\.\d{2}/.test(c.drive_name||""));}).length;
    var alive=XBEP_COLLECTION.length-dead;
    var dismissed = localStorage.getItem("gdv_coll_banner_dismiss")==="1";
    if(dismissed){ el.style.display="none"; return; }
    var totalCount = XBEP_COLLECTION.length;
    var driveOk = XBEP_COLLECTION.filter(c=>c.dead===false).length;
    var driveDead = XBEP_COLLECTION.filter(c=>c.dead===true).length;
    var driveUnknown = XBEP_COLLECTION.filter(c=>c.dead!==true && c.dead!==false).length;
    el.innerHTML = '<span class="coll-stat-chip">📦 ทั้งหมด <b>' + totalCount + '</b></span>' +
                   '<span class="coll-stat-chip is-avail">🟢 Drive พร้อม <b>' + driveOk + '</b></span>' +
                   (driveDead ? '<span class="coll-stat-chip is-dead">🔴 ย้าย/เสีย <b>' + driveDead + '</b></span>' : '') +
                   (driveUnknown ? '<span class="coll-stat-chip is-unknown">⚪ ยังไม่ตรวจ <b>' + driveUnknown + '</b></span>' : '');
    el.style.display="flex";
    el.style.background="transparent";
    el.style.border="none";
    el.style.padding="4px 0";
  })();



  function statusBadge(provider,dead){
    var state=dead===true ? 'unavailable' : dead===false ? 'available' : 'unknown';
    var dot=dead===true ? '🔴 ' : dead===false ? '🟢 ' : '⚪ ';
    var label=dead===true ? 'เสีย' : dead===false ? 'พร้อม' : 'ยังไม่ตรวจ';
    return '<span class="source-status '+state+'">'+dot+provider+' '+label+'</span>';
  }
  function collMatches(c){
    var driveAlive = !c.dead;
    var megaAlive = !!c.mega_url && !c.mega_dead;
    var anyAlive = driveAlive || megaAlive || !!c.od_url || !!c.mf_url;
    if(!anyAlive && !showDead) return false;
    var isNoDate = !c.dead && (!c.drive_name || c.drive_name==="มืด" || c.drive_name==="โฟลเดอร์ไม่มีชื่อ" || !/\d{1,2}\.\d{1,2}\.\d{2}/.test(c.drive_name||""));
    if(isNoDate && !showNoDate) return false;
    if((typeof showSoloSquirt !== "undefined" && showSoloSquirt) && !effSq(c)) return false;
    var byDate = activeDate==="all" || (c.date||"ไม่ระบุ")===activeDate;
    if(!byDate) return false;
    if(!q) return true;
    var hay=(c.title+" "+(c.drive_name||"")+" "+c.desc+" "+c.date+" "+c.id+" "+(c.mega_url||"")).normalize("NFC").toLowerCase();
    return hay.indexOf(q)!==-1;
  }
  function openCollectionItem(item){
    if(typeof recordRandomVisit==="function" && item && item.id) recordRandomVisit(item.id);
    // ใช้ flow เดิมของ viewer
    appApi.driveLink.value = item.url;
    var extId = appApi.extractId(item.url);
    if(extId && item.kind==="file"){
      var mime=item.drive_mime||"";
      var name=item.drive_name||item.title||"";
      if(mime.startsWith("image/")) appApi.handleFileClick(extId,"image",name);
      else if(mime.startsWith("video/")) appApi.handleFileClick(extId,"video",name);
      else if(mime.toLowerCase()==="application/pdf"||/\.pdf$/i.test(name)) appApi.handleFileClick(extId,"doc",name,mime);
      else window.open("https://drive.google.com/file/d/"+encodeURIComponent(extId)+"/view","_blank","noopener");
      return;
    }
    if(extId){
      // รีเซ็ต navStack เป็นระดับบนสุด (ไม่ซ้อนทับเหมือนโฟลเดอร์ย่อยเมื่อกดเปิดจากคลังหรือปุ่มสุ่ม)
      appApi.navStack = [{id: extId, name: (item.date? item.date+" - ":"")+item.title.replace("📌","").trim()}];
      appApi.pushHash(extId);
      appApi.openFolderAndReveal(extId);
    }
  }
  function randomPick(pool, avoidId){
    if(!pool || !pool.length) return null;
    if(pool.length>1 && avoidId!=null){
      var avoidList = Array.isArray(avoidId) ? avoidId : (avoidId instanceof Set ? Array.from(avoidId) : [avoidId]);
      var avoidSet = new Set(avoidList.filter(function(x){ return x!=null; }));
      if(avoidSet.size){
        var notAvoid = pool.filter(function(c){ return !avoidSet.has(c.id); });
        if(notAvoid.length) pool = notAvoid;
        else if(avoidList[0]!=null){
          var notPrimary = pool.filter(function(c){ return c.id!==avoidList[0]; });
          if(notPrimary.length) pool = notPrimary;
        }
      }
    }
    var rand = (typeof crypto!=="undefined" && crypto.getRandomValues) ? (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) : Math.random();
    return pool[Math.floor(rand*pool.length)];
  }
  function render(){

    if(collapsed) return;

    var filtered = XBEP_COLLECTION.filter(collMatches);

    filtered.sort(function(a,b){if(sortMode==="name") return (a.drive_name||a.title||"").localeCompare(b.drive_name||b.title||"","th",{numeric:true});var ad=dateKey(a.date),bd=dateKey(b.date);if(!ad || !bd) return ad ? -1 : bd ? 1 : 0;return sortMode==="oldest" ? ad-bd : bd-ad;});
    grid.innerHTML="";

    if(countEl) countEl.textContent = "แสดง "+filtered.length+" จาก "+XBEP_COLLECTION.length+" รายการ";

    if(!filtered.length){ if(emptyEl) emptyEl.style.display=""; var emptyPagi=document.getElementById("collPagi"); if(emptyPagi) emptyPagi.innerHTML=""; return; } else { if(emptyEl) emptyEl.style.display="none"; }

    // Keep complete rows for the current collection width.
    var sizeLabel = document.getElementById('collPageSizeLabel');
    if (sizeLabel) sizeLabel.textContent = 'แบ่งหน้า (' + COLL_PAGE_SIZE + ' รายการ)';
    var totalPages = collPageMode ? Math.max(1, Math.ceil(filtered.length / COLL_PAGE_SIZE)) : 1;
    if(collPage > totalPages) collPage = totalPages;
    if(collPage < 1) collPage = 1;
    var paged = collPageMode ? filtered.slice((collPage-1)*COLL_PAGE_SIZE, collPage*COLL_PAGE_SIZE) : filtered;
    // update paginator
    (function(){
      var el=document.getElementById("collPagi");
      if(!el) return;
      if(!collPageMode || filtered.length <= COLL_PAGE_SIZE){ el.style.display="none"; el.innerHTML=""; return; }
      el.style.display="flex";
      var h='';
      h+='<button type="button" id="cpPrev" '+(collPage<=1?'disabled':'')+'>‹ ก่อน</button>';
      var visiblePages = collLayout.buttons;
      var start=Math.max(1, collPage-Math.floor(visiblePages/2)), end=Math.min(totalPages, start+visiblePages-1);
      if(end-start<visiblePages-1) start=Math.max(1, end-visiblePages+1);
      for(var p=start;p<=end;p++){
        h+='<button type="button" aria-label="หน้า '+p+'" '+(p===collPage?'aria-current="page" ':'')+'class="'+(p===collPage?'active':'')+'" data-p="'+p+'">'+p+'</button>';
      }
      h+='<button type="button" id="cpNext" '+(collPage>=totalPages?'disabled':'')+'>ถัดไป ›</button>';
      h+='<span class="coll-pagi-info">หน้า '+collPage+'/'+totalPages+' • '+filtered.length+' รายการ</span>';
      el.innerHTML=h;
      var prev=document.getElementById("cpPrev"), nxt=document.getElementById("cpNext");
      if(prev) prev.addEventListener("click", function(){ if(collPage>1){ collPage--; localStorage.setItem("gdv_coll_page", String(collPage)); render(); document.getElementById("collectionsCard").scrollIntoView({behavior:"smooth", block:"start"}); }});
      if(nxt) nxt.addEventListener("click", function(){ if(collPage<totalPages){ collPage++; localStorage.setItem("gdv_coll_page", String(collPage)); render(); document.getElementById("collectionsCard").scrollIntoView({behavior:"smooth", block:"start"}); }});
      el.querySelectorAll("[data-p]").forEach(function(btn){
        btn.addEventListener("click", function(){ var p=parseInt(btn.getAttribute("data-p"),10); if(p!==collPage){ collPage=p; localStorage.setItem("gdv_coll_page", String(collPage)); render(); document.getElementById("collectionsCard").scrollIntoView({behavior:"smooth", block:"start"});} });
      });
    })();
    // render only paged
    paged.forEach(function(c, idx){
      var driveAlive = !c.dead;
      var megaAlive = !!c.mega_url && !c.mega_dead;
      var isDead = !driveAlive && !megaAlive && !c.od_url && !c.mf_url;
      var isNoDate = !isDead && driveAlive && (!c.drive_name || c.drive_name==="มืด" || c.drive_name==="โฟลเดอร์ไม่มีชื่อ" || !/\d{1,2}\.\d{1,2}\.\d{2}/.test(c.drive_name||""));
      var card=document.createElement("div");
      card.className="coll-card"+(isDead?" dead":"")+(isNoDate?" no-date":"");
      card.style.animationDelay=(Math.min(idx*0.02, .35))+"s";
      var kindCls = c.kind==="file" ? "file" : "folder";
      var kindTxt = c.kind==="file" ? "FILE" : "FOLDER";
      var driveNameTxt = c.drive_name ? c.drive_name : (isDead ? "(ใช้ไม่ได้ตามผลตรวจที่บันทึกไว้)" : "");
      var deadBadge = '';
      var noDateBadge = isNoDate ? ' <span class="coll-badge nodate">ชื่อไม่มีวันที่</span>' : '';
      var approxBadge = c.approx ? ' <span class="coll-badge approx">ประมาณ</span>' : '';
      var soloBadge = effSq(c) ? ' <span class="coll-badge squirt">💦 น้ำพุ่ง</span>' : '';

      var dotCls = c.dead===true ? 'dead' : c.dead===false ? 'ok' : 'muted';
      var dateCls = isNoDate || isDead ? 'coll-date' : 'coll-date evt';
      var hasMega = !!c.mega_url && !c.mega_dead;
      var megaBadge = hasMega ? ' <span class="mega-badge">MEGA</span>' : '';
      var hasOD = !!c.od_url;
      var odBadge = hasOD ? ' <span class="od-badge">OD</span>' : '';
      var hasMF = !!c.mf_url;
      var mfBadge = hasMF ? ' <span class="mf-badge">MF</span>' : '';
      var driveAliveLocal = !c.dead;
      var megaAliveLocal = !!c.mega_url && !c.mega_dead;
      var driveBtn = driveAliveLocal ? '<a class="btn-ghost" href="'+c.url+'" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;flex:1">Drive ↗</a>' : '';
      var megaBtn = megaAliveLocal ? '<a class="btn-ghost btn-mega" href="'+c.mega_url+'" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;flex:1">MEGA ↗</a>' : '';
      var odBtn = hasOD ? '<a class="btn-ghost btn-od" href="'+c.od_url+'" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;flex:1">OneDrive ↗</a>' : '';
      var tagOn = effSq(c);
      var tagBtn = '<button type="button" class="btn-ghost btn-sm" data-tag="'+c.id+'" title="ติด/ถอดแท็กน้ำพุ่ง" style="'+(tagOn?"border-color:var(--badge-squirt-border);color:var(--badge-squirt-text);background:var(--badge-squirt-bg);":"opacity:.55;")+'">💦</button>';
      var mfBtn = hasMF ? '<a class="btn-ghost btn-mf" href="'+c.mf_url+'" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;flex:1">MediaFire ↗</a>' : '';
      card.innerHTML =
        '<div class="coll-head"><span class="'+dateCls+'">'+(c.date||"-")+'</span><span class="coll-kind '+kindCls+'">'+kindTxt+'</span><span class="coll-dot '+dotCls+'"></span>'+deadBadge+noDateBadge+approxBadge+soloBadge+megaBadge+odBadge+mfBadge+'<span style="margin-left:auto;color:var(--muted-soft);font-size:10px">#'+(XBEP_COLLECTION.indexOf(c)+1)+'</span></div>'+
        '<div class="coll-title" title="'+String(c.desc).replace(/"/g,'&quot;')+'">'+c.title+'</div>'+
        (driveNameTxt && driveNameTxt!=="มืด" ? '<div class="coll-id">'+String(driveNameTxt).replace(/</g,"&lt;")+'</div>' : '')+
        '<div class="coll-status">' + statusBadge('Drive', c.dead) + (c.mega_url ? statusBadge('MEGA', c.mega_dead) : '') + '<span class="coll-check-time" title="ตรวจสถานะเมื่อ '+COLL_CHECKED_AT+'">🕒 '+COLL_CHECKED_AT+'</span></div>' +
        '<div class="coll-actions">'+
          '<button type="button" class="btn-primary" data-open="'+c.id+'"'+(isDead?' disabled title="ไม่มีลิงก์ที่ใช้งานได้"':(!driveAliveLocal?' disabled title="Drive ใช้ไม่ได้ — เลือกลิงก์สำรอง"':''))+' style="flex:1">เปิด</button>'+
          tagBtn+
          driveBtn+
          megaBtn+
          odBtn+
          mfBtn+
          ((driveBtn || megaBtn || odBtn || mfBtn) ? '<details class="coll-more"><summary>ลิงก์อื่น</summary><div class="coll-more-links">'+driveBtn+megaBtn+odBtn+mfBtn+'</div></details>' : '')+
        '</div>';
      if (driveAliveLocal && c.kind !== "file") {
        const folderId = appApi.extractId(c.url);
        if (folderId) {
          const cover = document.createElement("div");
          cover.className = "file-thumb collection-cover";
          cover.dataset.folderCover = folderId;
          cover.innerHTML = appApi.genericIconSvg("folder");
          card.prepend(cover);
        }
      }
      const checkLink=document.createElement('button');
      checkLink.type='button'; checkLink.className='btn-ghost btn-sm'; checkLink.textContent='ตรวจ Drive ซ้ำ';
      const checkResult=document.createElement('span'); checkResult.setAttribute('role','status'); checkResult.style.cssText='font-size:11px;overflow-wrap:anywhere';
      checkLink.addEventListener('click',async function(){
        const id=appApi.extractId(c.url), auth=appApi.authParams();
        if(!id || auth.mode==='none') {checkResult.textContent='ยังไม่ทราบ · ต้องตั้ง API Key หรือล็อกอิน';return;}
        checkLink.disabled=true; checkResult.textContent='กำลังตรวจ…';
        const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
        try {
          const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id&supportsAllDrives=true'+(auth.mode==='key'?'&key='+encodeURIComponent(appApi.apiKey):''),{headers:auth.headers||{},signal:controller.signal,cache:'no-store'});
          checkResult.textContent=(response.ok?'เข้าถึงได้ด้วยสิทธิ์ปัจจุบัน':response.status===404?'ไม่พบหรือไม่มีสิทธิ์เข้าถึง':'ยังไม่ทราบ · HTTP '+response.status)+' · '+new Date().toLocaleTimeString('th-TH');
        } catch(_){checkResult.textContent='ยังไม่ทราบ · เชื่อมต่อไม่สำเร็จ';}
        finally {clearTimeout(timer);checkLink.disabled=false;}
      });
      card.appendChild(checkLink);card.appendChild(checkResult);
      grid.appendChild(card);
    });

    attachTagButtons();
    appApi.observeFolderCovers(grid);
    grid.querySelectorAll("[data-open]").forEach(function(btn){

      btn.addEventListener("click", function(){

        var id=btn.getAttribute("data-open");

        var item=XBEP_COLLECTION.find(function(x){return x.id===id});

        if(item) openCollectionItem(item);

      });

    });

  }



  if(searchEl){

    searchEl.addEventListener("input", function(){

      q = searchEl.value.trim().normalize("NFC").toLowerCase(); collPage=1; localStorage.setItem("gdv_coll_page","1");

      if(clearBtn) clearBtn.style.display = q ? "block":"none";

      render();

    });

  }

  if(clearBtn) clearBtn.addEventListener("click", function(){ searchEl.value=""; q=""; clearBtn.style.display="none"; render(); searchEl.focus(); });

  
  var showDeadEl=document.getElementById("collShowDead");
  var showNoDateEl=document.getElementById("collShowNoDate");
  if(showDeadEl){ showDeadEl.checked=showDead; showDeadEl.addEventListener("change", function(){ showDead=showDeadEl.checked; localStorage.setItem("gdv_coll_showDead", showDead?"1":"0"); collPage=1; localStorage.setItem("gdv_coll_page","1"); render(); }); }
  if(showNoDateEl){ showNoDateEl.checked=showNoDate; showNoDateEl.addEventListener("change", function(){ showNoDate=showNoDateEl.checked; localStorage.setItem("gdv_coll_showNoDate", showNoDate?"1":"0"); collPage=1; localStorage.setItem("gdv_coll_page","1"); render(); }); }
  var showSoloSquirtEl=document.getElementById("collSoloSquirt");
  if(showSoloSquirtEl){ showSoloSquirtEl.checked=showSoloSquirt; showSoloSquirtEl.addEventListener("change", function(){ showSoloSquirt=showSoloSquirtEl.checked; localStorage.setItem("gdv_coll_solo_squirt", showSoloSquirt?"1":"0"); collPage=1; localStorage.setItem("gdv_coll_page","1"); render(); }); }

  var modeEl=document.getElementById("collPageMode");
  if(modeEl){ modeEl.checked=collPageMode; modeEl.addEventListener("change", function(){ collPageMode=modeEl.checked; localStorage.setItem("gdv_coll_pagemode", collPageMode?"1":"0"); collPage=1; localStorage.setItem("gdv_coll_page","1"); render(); }); }
  var expandBtn=document.getElementById("collExpandAll");

  if(expandBtn) expandBtn.addEventListener("click", function(){

    if(collapsed){ collapsed=false; localStorage.setItem("gdv_coll_collapsed","0"); applyCollapsed(); }

    showDead=false; showNoDate=true; showSoloSquirt=false;
    if(showDeadEl) showDeadEl.checked=false;
    if(showNoDateEl) showNoDateEl.checked=true;
    if(showSoloSquirtEl) showSoloSquirtEl.checked=false;
    localStorage.setItem("gdv_coll_showDead","0");localStorage.setItem("gdv_coll_showNoDate","1");localStorage.setItem("gdv_coll_solo_squirt","0");
    activeDate="all"; q=""; collPage=1; localStorage.setItem("gdv_coll_page","1"); if(searchEl) searchEl.value=""; if(clearBtn) clearBtn.style.display="none";

    localStorage.setItem("gdv_coll_date","all"); 

  // Missing days banner

  // Summary is calculated from the current collection above.



  renderChips(); render();

    document.getElementById("collectionsCard").scrollIntoView({behavior:"smooth", block:"start"});

  });

  var mobileViewBtn=document.getElementById("collMobileView");
  function applyMobileView(list) {
    grid.classList.toggle("mobile-list", list);
    if(mobileViewBtn) {
      mobileViewBtn.textContent=list ? "มุมมองการ์ด" : "มุมมองรายการ";
      mobileViewBtn.setAttribute("aria-pressed", String(list));
    }
  }
  applyMobileView(appApi.lsGet('gdv_coll_view') === 'list');
  if(mobileViewBtn) mobileViewBtn.addEventListener("click", function(){
    var list=!grid.classList.contains("mobile-list");
    applyMobileView(list);
    appApi.lsSet('gdv_coll_view', list ? 'list' : 'cards');
  });
  var randomBtn=document.getElementById("collRandom");
  var RANDOM_SEEN_LS="gdv_coll_random_seen", RANDOM_RECENT_LS="gdv_coll_random_recent", RANDOM_LAST_LS="gdv_coll_random_last";
  var lastRandomId=appApi.lsGet(RANDOM_LAST_LS)||null;
  var lastBackedOutId=null;
  var randomSeen=new Set((function(){ try{ var a=JSON.parse(appApi.lsGet(RANDOM_SEEN_LS)||"[]"); return Array.isArray(a)?a:[]; }catch(_){ return []; } })());
  var randomRecentIds=(function(){ try{ var a=JSON.parse(appApi.lsGet(RANDOM_RECENT_LS)||"[]"); return Array.isArray(a)?a:[]; }catch(_){ return []; } })();
  var randomHistory=[];
  var randomBack=document.getElementById('collRandomBack');
  function saveRandomState(){
    appApi.lsSet(RANDOM_LAST_LS, lastRandomId||"");
    appApi.lsSet(RANDOM_SEEN_LS, JSON.stringify(Array.from(randomSeen).slice(-400)));
    appApi.lsSet(RANDOM_RECENT_LS, JSON.stringify(randomRecentIds.slice(0,50)));
  }
  function recordRandomVisit(id){
    if(!id) return;
    lastRandomId=id;
    randomSeen.add(id);
    randomRecentIds=[id].concat(randomRecentIds.filter(function(x){return x!==id;})).slice(0,50);
    saveRandomState();
  }
  function currentOpenFolderId(){
    if(Array.isArray(appApi.navStack) && appApi.navStack.length && appApi.navStack[0] && appApi.navStack[0].id) return appApi.navStack[0].id;
    var m=(location.hash||"").match(/^#\/f\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function openRandomItem(pick) {
    if(pick.dead) {
      recordRandomVisit(pick.id);
      var alt=(pick.mega_url&&!pick.mega_dead) ? pick.mega_url : (pick.od_url||pick.mf_url);
      if(alt) window.open(alt,'_blank','noopener');
    } else openCollectionItem(pick);
  }
  if(randomBack) randomBack.addEventListener('click', function(){
    if(randomHistory.length<2) return;
    var popped=randomHistory.pop();
    if(popped && popped.id) lastBackedOutId=popped.id;
    var previous=randomHistory[randomHistory.length-1];
    lastRandomId=previous.id;
    saveRandomState();
    randomBack.disabled=randomHistory.length<2;
    openRandomItem(previous);
  });
  if(randomBtn) randomBtn.addEventListener("click", function(){
    var curOpenId=currentOpenFolderId();
    if(curOpenId) randomSeen.add(curOpenId);
    function buildCandidates(){
      var pool = XBEP_COLLECTION.filter(collMatches);
      var openable = pool.filter(function(c){ return !c.dead; });
      var fallback = pool.filter(function(c){ return c.dead && ((c.mega_url&&!c.mega_dead)||!!c.od_url||!!c.mf_url); });
      return openable.length ? openable : fallback;
    }
    var candidates = buildCandidates();
    var unseen = candidates.filter(function(c){ return !randomSeen.has(c.id) && c.id!==curOpenId; });
    // หากผู้ใช้เผลอค้างชิปเลือกวันที่เฉพาะวันไว้ แล้วสุ่มในวันนั้นครบแล้ว ให้ปลดเป็น "ทั้งหมด" อัตโนมัติเพื่อไม่ให้วนซ้ำแค่วันเดิม
    if(!unseen.length && activeDate!=="all"){
      activeDate="all";
      localStorage.setItem("gdv_coll_date","all");
      renderChips(); render();
      candidates = buildCandidates();
      unseen = candidates.filter(function(c){ return !randomSeen.has(c.id) && c.id!==curOpenId; });
      appApi.showToast("สุ่มครบวันเดิมแล้ว — สลับเป็นสุ่มจากทุกวันในคลัง");
    }
    var keepRecentCount = Math.min(Math.max(1, Math.floor(candidates.length / 2)), 20);
    var avoidIds = [curOpenId, lastRandomId, lastBackedOutId].concat(randomRecentIds.slice(0, keepRecentCount)).filter(Boolean);
    if(!unseen.length){
      candidates.forEach(function(c){ randomSeen.delete(c.id); });
      // กันรายการที่เพิ่งเปิดล่าสุดครึ่งวงไม่ให้ถูกสุ่มซ้ำทันทีตอนขึ้นรอบใหม่
      var keepSet = new Set(avoidIds);
      var fresh = candidates.filter(function(c){ return !keepSet.has(c.id); });
      if(fresh.length){
        keepSet.forEach(function(id){ randomSeen.add(id); });
        unseen = fresh;
      } else {
        unseen = candidates;
      }
    }
    var pick = randomPick(unseen, avoidIds);
    if(!pick) return;
    lastBackedOutId = null;
    recordRandomVisit(pick.id);
    randomHistory.push(pick);
    if(randomHistory.length>100) randomHistory.shift();
    if(randomBack) randomBack.disabled=randomHistory.length<2;
    openRandomItem(pick);
  });



  

  // Missing days banner

  // Summary is calculated from the current collection above.



  renderChips(); render();

})();
