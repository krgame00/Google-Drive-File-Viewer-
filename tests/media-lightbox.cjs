const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The unit seams below are evaluated one-at-a-time, but their source now comes
// from the owning browser module only (never a concatenation of app files).
const modulePath = require.resolve('../media-lightbox.js');
const source = fs.readFileSync(modulePath, 'utf8');

// Verify the real module is also directly require()-able in Node, while it
// remains a classic <script> in the browser. The bridge receives the same API.
function requireMediaModule() {
  const bridge = {};
  const priorWindow = global.window;
  try {
    global.window = { GDVLightboxApi: bridge };
    delete require.cache[modulePath];
    const api = require(modulePath);
    assert.equal(api, bridge.media, 'CommonJS export is the browser bridge API');
    return api;
  } finally {
    if (priorWindow === undefined) delete global.window;
    else global.window = priorWindow;
  }
}
const requiredApi = requireMediaModule();
const exportedNames = [
  'mediaList','navigateMedia','openLightbox','loadOriginalImage','prefetchNextImage','fallbackImage',
  'toggleLightboxFullscreen','closeLightbox','updateLbCount','clampImageScale','clampImagePan','applyImageView',
  'resetImageView','imageGestureMode','swipeNavigateFor','setImageControlsVisible','cancelImageTap','handleImageTap',
  'attachPersonalButtons','fallbackIframe','resetPdfViewer','loadPdfLibrary','updatePdfNavState','stepPdfPage',
  'renderPdfPage','openPdfBlob','pdfLoadingState','fitPdfScale','zoomPdf','fallbackPdfToDrive','openPdfDocument',
  'revokeCurrentDoc','openDocument','fallbackDocIframe'
];
assert.equal(exportedNames.length, 34, 'all 34 public module functions are listed');
for (const name of exportedNames) assert.equal(typeof requiredApi[name], 'function', 'required API exports ' + name);

function fn(name) {
  const declaration = new RegExp('(^|\\n)([ \\t]+)(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = declaration.exec(source);
  assert(match, 'missing function: ' + name);
  const start = match.index + match[1].length;
  const close = new RegExp('\\r?\\n' + match[2] + '\\}', 'g');
  close.lastIndex = start;
  const end = close.exec(source);
  assert(end, 'missing closing brace: ' + name);
  return source.slice(start, end.index + end[0].length);
}
function el(id) {
  const names = new Set();
  return {
    id, style: {}, dataset: {}, attrs: {}, hidden: false, disabled: false,
    textContent: '', src: '', href: '', width: 0, height: 0,
    clientWidth: 800, clientHeight: 600,
    classList: {
      add: n => names.add(n), remove: n => names.delete(n),
      contains: n => names.has(n),
      toggle(n, force) { const on = force === undefined ? !names.has(n) : !!force; on ? names.add(n) : names.delete(n); return on; }
    },
    setAttribute(n, v) { this.attrs[n] = String(v); },
    getAttribute(n) { return this.attrs[n] ?? null; },
    removeAttribute(n) { delete this.attrs[n]; },
    addEventListener() {}, pause() {}, load() {}
  };
}
function setup(extra = {}) {
  const els = new Map(), revoked = [], created = [];
  const get = id => { if (!els.has(id)) els.set(id, el(id)); return els.get(id); };
  const ctx = {
    Promise, Date, Math, Number, String, Object, Array, Set, Map, Error,
    console: { warn() {}, error() {} },
    document: {
      body: { style: { overflow: '' } }, fullscreenElement: null,
      getElementById: get, createElement: tag => el(tag),
      querySelectorAll: () => [], addEventListener() {}
    },
    window: {
      devicePixelRatio: 1,
      getComputedStyle: () => ({paddingLeft:'0px',paddingRight:'0px',paddingTop:'0px',paddingBottom:'0px'})
    },
    URL: {
      createObjectURL(blob) { const url = 'blob:mock-' + (created.length + 1); created.push({blob,url}); return url; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    setTimeout, clearTimeout, ...extra
  };
  vm.createContext(ctx);
  return {ctx, get, els, revoked, created};
}
function install(ctx, name, replaceImport = false) {
  let body = fn(name);
  if (replaceImport) body = body.replace(
    "import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs')",
    "__mockImport('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs')"
  );
  vm.runInContext(body, ctx, {filename:'index.html:' + name});
}
function flush() { return new Promise(resolve => setImmediate(resolve)); }
let passed = 0, failed = 0;
const pending = [];
function test(name, run) {
  try {
    const result = run();
    if (result && typeof result.then === 'function') {
      pending.push(result.then(() => { passed++; console.log('PASS', name); })
        .catch(e => { failed++; console.error('FAIL', name, e.stack || e); }));
    } else { passed++; console.log('PASS', name); }
  } catch (e) { failed++; console.error('FAIL', name, e.stack || e); }
}

test('updateLbCount updates counter/title and handles empty and filtered lists', () => {
  const {ctx,get} = setup();
  ctx.lbImg = get('lbImg'); ctx.lbImg.dataset.fid = 'b';
  ctx.mediaList = () => [{id:'a',name:'A.png'},{id:'b',name:'B.png'}];
  install(ctx,'updateLbCount'); ctx.updateLbCount();
  assert.equal(get('lbCount').textContent,'2 / 2');
  assert.equal(get('lbTitle').textContent,'B.png');
  ctx.mediaList = () => [];
  ctx.updateLbCount(); assert.equal(get('lbCount').textContent,'');
  ctx.mediaList = () => [{id:'x',name:'X.png'}];
  ctx.allFiles = [{id:'b',name:'Fallback.png'}]; ctx.updateLbCount();
  assert.equal(get('lbCount').textContent,'- / 1');
  assert.equal(get('lbTitle').textContent,'Fallback.png');
});

test('loadOriginalImage falls back without auth and ignores a stale result', async () => {
  const {ctx,get,revoked} = setup();
  ctx.lbImg=get('lbImg');ctx.lbImg.dataset.fid='image-a';ctx.lbOrig=get('lbOrig');
  const fallbacks=[];ctx.fallbackImage=id=>fallbacks.push(id);ctx.authParams=()=>({mode:'none'});
  install(ctx,'loadOriginalImage');ctx.loadOriginalImage('image-a');
  assert.deepEqual(fallbacks,['image-a']);assert.equal(ctx.lbOrig.disabled,true);
  ctx.authParams=()=>({mode:'key'});ctx.apiKey='key';
  ctx.origCacheKey=id=>'cache:'+id;
  let resolveBlob;
  ctx.getBlobCached=(key,url,headers)=>{assert.match(url,/image-a\?alt=media&key=key/);assert.equal(Object.keys(headers).length,0);return new Promise(r=>resolveBlob=r);};
  ctx.lbImg._blobUrl='blob:old';ctx.loadOriginalImage('image-a');
  ctx.lbImg.dataset.fid='image-b';resolveBlob({});await flush();
  assert.equal(ctx.lbImg.src,'');assert.deepEqual(revoked,[]);
});

test('loadOriginalImage replaces/revokes the old blob when the requested image is still active', async () => {
  const {ctx,get,revoked,created}=setup();
  ctx.lbImg=get('lbImg');ctx.lbImg.dataset.fid='current';ctx.lbImg._blobUrl='blob:old';ctx.lbOrig=get('lbOrig');ctx.accessToken='token';
  ctx.authParams=()=>({mode:'bearer',headers:{Authorization:'Bearer token'}});
  ctx.origCacheKey=id=>'cache:'+id;
  ctx.getBlobCached=async (key,url,headers)=>{assert.match(url,/files\/current\?alt=media$/);assert.equal(headers.Authorization,'Bearer token');return {data:1};};
  install(ctx,'loadOriginalImage');ctx.loadOriginalImage('current');await flush();
  assert.deepEqual(revoked,['blob:old']);assert.equal(ctx.lbImg.src,created[0].url);
  assert.equal(ctx.lbOrig.classList.contains('show'),false);
});

test('prefetchNextImage queues the next thumbnail but does nothing for a single image', () => {
  const warmed=[];const {ctx,get}=setup({Image:function(){warmed.push(this);}});
  ctx.lbImg=get('lbImg');ctx.lbImg.dataset.fid='a';ctx.mediaList=()=>[{id:'a'},{id:'b'}];
  ctx.mediaThumbs={b:'https://img.test/pic=s256'};ctx.cdnLargeUrl=x=>x.replace('=s256','=s1600');
  install(ctx,'prefetchNextImage');ctx.prefetchNextImage();
  assert.equal(warmed[0].src,'https://img.test/pic=s1600');
  ctx.mediaList=()=>[{id:'a'}];ctx.prefetchNextImage();assert.equal(warmed.length,1);
});

test('fallbackImage uses optional API key and provides an error handler', () => {
  const {ctx,get}=setup();ctx.lbImg=get('lbImg');ctx.apiKey='k';let toast='';
  ctx.showToast=m=>toast=m;install(ctx,'fallbackImage');ctx.fallbackImage('id-1');
  assert.equal(ctx.lbImg.src,'https://drive.google.com/uc?export=view&id=id-1&key=k');
  ctx.lbImg.onerror();assert.equal(toast,'โหลดรูปไม่ได้');
  ctx.apiKey='';ctx.fallbackImage('id-2');
  assert.equal(ctx.lbImg.src,'https://drive.google.com/uc?export=view&id=id-2');
});

test('loadPdfLibrary caches concurrent imports, configures worker, and permits retry after failure', async () => {
  assert(source.includes("import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs')"));
  const pdfjs={GlobalWorkerOptions:{}};let imports=0,fail=false;
  const {ctx}=setup({__mockImport(url){imports++;assert.match(url,/pdf\.mjs$/);if(fail){fail=false;return Promise.reject(new Error('mock import failed'));}return Promise.resolve(pdfjs);}});
  ctx.pdfLibraryPromise=null;
  install(ctx,'loadPdfLibrary',true);
  const first=ctx.loadPdfLibrary();assert.equal(ctx.loadPdfLibrary(),first);
  assert.equal(await first,pdfjs);assert.equal(imports,1);
  assert.equal(pdfjs.GlobalWorkerOptions.workerSrc,'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs');
  ctx.pdfLibraryPromise=null;fail=true;
  await assert.rejects(ctx.loadPdfLibrary(),/mock import failed/);
  assert.equal(ctx.pdfLibraryPromise,null);
  assert.equal(await ctx.loadPdfLibrary(),pdfjs);assert.equal(imports,3);
});

test('openPdfBlob loads a document, changes viewer state, and renders page one', async () => {
  const {ctx,get}=setup();const calls=[];const doc={numPages:4,destroy(){}};
  Object.assign(ctx,{pdfInLightbox:false,mediaSession:7,pdfPageNumber:8,pdfFitMode:null,pdfDocument:null,
    lightbox:get('lightbox'),lbImg:get('lbImg'),pdfStage:get('pdfStage'),pdfControls:get('pdfControls'),
    pdfLoadingState:(...a)=>calls.push(['loading',...a]),loadPdfLibrary:async()=>({getDocument:s=>{calls.push(['getDocument',s]);return {promise:Promise.resolve(doc)};}}),
    updatePdfNavState:()=>calls.push(['nav']),renderPdfPage:async()=>calls.push(['render'])});
  ctx.lightbox.classList.add('show');
  install(ctx,'openPdfBlob');
  await ctx.openPdfBlob({arrayBuffer:async()=>{calls.push(['arrayBuffer']);return 'bytes';}},'pdf-id',7);
  assert.equal(ctx.pdfInLightbox,true);assert.equal(ctx.lightbox.dataset.viewer,'pdf');
  assert.equal(ctx.lbImg.style.display,'none');assert.equal(ctx.pdfStage.hidden,false);assert.equal(ctx.pdfControls.hidden,false);
  assert.equal(ctx.pdfPageNumber,1);assert.equal(ctx.pdfFitMode,'page');assert.equal(ctx.pdfDocument,doc);
  assert.deepEqual(calls.map(c=>c[0]),['loading','arrayBuffer','getDocument','nav','loading','render']);
  assert.equal(JSON.stringify(calls[2][1]),'{"data":"bytes"}');
});

test('openPdfBlob falls back when PDF.js fails and ignores a stale session', async () => {
  const {ctx,get}=setup();let fallbacks=0;
  Object.assign(ctx,{mediaSession:4,lightbox:get('lightbox'),lbImg:get('lbImg'),pdfStage:get('pdfStage'),pdfControls:get('pdfControls'),
    pdfLoadingState(){},fallbackPdfToDrive(){fallbacks++;},vidTitle:get('vidTitle'),loadPdfLibrary:async()=>{throw new Error('unavailable');}});
  ctx.lightbox.classList.add('show');install(ctx,'openPdfBlob');
  await ctx.openPdfBlob(null,'bad-pdf',4);assert.equal(fallbacks,1);
  fallbacks=0;ctx.loadPdfLibrary=async()=>({getDocument(){throw new Error('should not run');}});
  await ctx.openPdfBlob(null,'stale-pdf',3);assert.equal(fallbacks,0);
});

test('pdfLoadingState sets message/default and correctly toggles the loading layer', () => {
  const {ctx,get}=setup();ctx.pdfLoading=get('pdfLoading');ctx.pdfLoadingText=get('pdfLoadingText');
  install(ctx,'pdfLoadingState');ctx.pdfLoadingState(true,'Preparing');
  assert.equal(ctx.pdfLoading.hidden,false);assert.equal(ctx.pdfLoadingText.textContent,'Preparing');
  ctx.pdfLoadingState(true);assert.equal(ctx.pdfLoadingText.textContent,'กำลังโหลด PDF…');
  ctx.pdfLoadingState(false);assert.equal(ctx.pdfLoading.hidden,true);
});

test('fitPdfScale accounts for stage padding and fits to the tighter dimension', () => {
  const {ctx,get}=setup();ctx.pdfStage=get('pdfStage');ctx.pdfStage.clientWidth=820;ctx.pdfStage.clientHeight=620;
  ctx.window.getComputedStyle=()=>({paddingLeft:'10px',paddingRight:'10px',paddingTop:'20px',paddingBottom:'20px'});
  install(ctx,'fitPdfScale');
  assert.equal(ctx.fitPdfScale({getViewport:({scale})=>{assert.equal(scale,1);return {width:1000,height:500};}}),0.8);
});

test('zoomPdf exits fit mode, resets image pan, and clamps zoom range', async () => {
  const {ctx}=setup();const calls=[];
  Object.assign(ctx,{pdfPageNumber:1,pdfFitMode:'page',pdfScale:1,pdfDocument:{getPage:async()=>({})},
    fitPdfScale:()=>2,resetImageView:()=>calls.push('reset'),renderPdfPage:()=>calls.push(['render',ctx.pdfScale])});
  install(ctx,'zoomPdf');ctx.zoomPdf(1.2);await flush();
  assert.equal(ctx.pdfScale,2.4);assert.equal(ctx.pdfFitMode,null);assert.deepEqual(calls,['reset',['render',2.4]]);
  ctx.pdfFitMode='page';ctx.zoomPdf(100);await flush();assert.equal(ctx.pdfScale,4);
  ctx.pdfFitMode=null;ctx.pdfScale=1;ctx.zoomPdf(0.01);await flush();assert.equal(ctx.pdfScale,0.25);
  const before=calls.length;ctx.pdfDocument=null;ctx.zoomPdf(2);assert.equal(calls.length,before);
});

test('toggleLightboxFullscreen supports standard enter/exit and WebKit fallback', async () => {
  const {ctx,get}=setup();const calls=[];ctx.lightbox=get('lightbox');
  ctx.lightbox.requestFullscreen=()=>{calls.push('enter');return Promise.resolve();};
  ctx.document.exitFullscreen=()=>{calls.push('exit');return Promise.resolve();};
  install(ctx,'toggleLightboxFullscreen');ctx.toggleLightboxFullscreen();await flush();
  assert.deepEqual(calls,['enter']);
  ctx.document.fullscreenElement=ctx.lightbox;ctx.toggleLightboxFullscreen();await flush();
  assert.deepEqual(calls,['enter','exit']);
  delete ctx.lightbox.requestFullscreen;ctx.lightbox.webkitRequestFullscreen=()=>calls.push('webkit');
  ctx.document.fullscreenElement=null;ctx.toggleLightboxFullscreen();assert.deepEqual(calls,['enter','exit','webkit']);
});

test('openDocument routes PDFs to the PDF viewer and honours forced Drive preview', () => {
  const {ctx,get}=setup();const calls=[];
  Object.assign(ctx,{lightbox:get('lightbox'),videoModal:get('videoModal'),vidFrame:get('vidFrame'),vidPlayer:get('vidPlayer'),
    vidLoading:get('vidLoading'),vidLoadingText:get('vidLoadingText'),vidProgressBar:get('vidProgressBar'),vidTitle:get('vidTitle'),
    vidOpenTab:get('vidOpenTab'),lbImg:get('lbImg'),mediaSession:1,mediaPreviousOverflow:'',currentMediaIndex:-1,currentMediaKind:'image',vidCurrentId:'old',
    openPdfDocument:(...a)=>calls.push(['pdf',...a]),closeLightbox(){},closeVideo(){},resetMediaPlayback(){},revokeCurrentDoc(){},
    authParams:()=>({mode:'none'}),fallbackDocIframe:id=>{calls.push(['fallback',id]);ctx.vidFrame.src='https://drive.google.com/file/'+id+'/preview';}});
  install(ctx,'openDocument');ctx.openDocument('pdf-id','manual.PDF','application/octet-stream');
  assert.deepEqual(calls.shift(),['pdf','pdf-id','manual.PDF','application/octet-stream']);
  ctx.openDocument('pdf-id','manual.PDF','application/pdf',true);
  assert.deepEqual(calls,[['fallback','pdf-id']]);assert.equal(ctx.videoModal.classList.contains('show'),true);
  assert.equal(ctx.videoModal.attrs['aria-hidden'],'false');
  assert.equal(ctx.vidFrame.src,'https://drive.google.com/file/pdf-id/preview');
});

test('fallbackDocIframe clears loading and PDF state, revokes current doc, and opens Drive preview', () => {
  const {ctx,get}=setup();let resets=0,revokes=0;
  Object.assign(ctx,{vidLoading:get('vidLoading'),vidFrame:get('vidFrame'),resetPdfViewer:()=>resets++,revokeCurrentDoc:()=>revokes++});
  ctx.vidLoading.classList.add('show');install(ctx,'fallbackDocIframe');ctx.fallbackDocIframe('doc-id');
  assert.equal(ctx.vidLoading.classList.contains('show'),false);assert.equal(ctx.vidFrame.style.display,'block');
  assert.equal(ctx.vidFrame.src,'https://drive.google.com/file/d/doc-id/preview');
  assert.equal(resets,1);assert.equal(revokes,1);
});

(async () => {
  await Promise.all(pending);
  console.log('Lightbox/PDF tests: ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
})();
