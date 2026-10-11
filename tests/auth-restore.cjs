const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);return html.slice(start,html.indexOf('\n      }',start)+8)}
const store=new Map(),requests=[];let config;
const ctx={clientId:'client',accessToken:null,tokenExpiry:0,userProfile:null,tokenClient:null,tokenResolver:null,authRestoreAttempted:false,Date,
lsGet:k=>store.get(k),lsSet:(k,v)=>store.set(k,v),lsRemove:k=>store.delete(k),waitForGis:cb=>cb(),fetchUserProfile(){},refreshAuthUI(){},
google:{accounts:{oauth2:{initTokenClient(c){config=c;return {requestAccessToken:o=>requests.push(o)}}}}}};
vm.createContext(ctx);for(const name of ['finishTokenRequest','initTokenClient','ensureToken'])vm.runInContext(fn(name),ctx);
(async()=>{
ctx.initTokenClient();assert.equal(requests.length,0,'first visit does not prompt');
store.set('gdv_auth_remember','client');ctx.initTokenClient();assert.equal(requests.length,1);assert.equal(requests[0].prompt,'none');
config.error_callback({type:'popup_failed_to_open'});assert.equal(ctx.accessToken,null);
ctx.initTokenClient();assert.equal(requests.length,1,'no automatic retry loop');
const pending=ctx.ensureToken();assert.equal(requests.at(-1).prompt,'');config.callback({access_token:'temporary',expires_in:3600});assert.equal(await pending,'temporary');assert.equal(store.get('gdv_auth_remember'),'client');assert(![...store.values()].includes('temporary'));
const before= requests.length;
const renewed=ctx.ensureToken(true);
assert.equal(requests.length,before+1,'401 retry must request a fresh token even before local expiry');
assert.equal(ctx.accessToken,null,'rejected token must not remain usable');
config.callback({access_token:'renewed',expires_in:3600});assert.equal(await renewed,'renewed');
ctx.tokenExpiry=0;const denied=ctx.ensureToken();config.callback({error:'access_denied'});assert.equal(await denied,null);assert.equal(ctx.accessToken,null);assert.equal(ctx.tokenResolver,null);

// Bug 6a: เมื่อกดออกจากระบบ (Sign out) ต้องปิด Lightbox (ถ้าเปิดรูป/PDF ส่วนตัวค้างอยู่) และล้าง MEDIA_CACHE (gdv-media-v1) ด้วย
const signOutStart = html.indexOf('      authBtn.addEventListener("click"');
const signOutEnd = html.indexOf('      // ===== Extract ID =====', signOutStart);
assert(signOutStart >= 0 && signOutEnd > signOutStart, 'authBtn click listener exists');
let authClickHandler = null, lightboxClosed = 0, videoClosed = 0;
const deletedCaches = [];
const signOutCtx = {
  MEDIA_CACHE: 'gdv-media-v1',
  authBtn: { addEventListener(ev, fn) { if (ev === 'click') authClickHandler = fn; } },
  accessToken: 'private-token',
  tokenExpiry: Date.now() + 3600000,
  userProfile: { email: 'user@example.com' },
  window: { google: { accounts: { oauth2: { revoke() {} } } } },
  google: { accounts: { oauth2: { revoke() {} } } },
  videoCache: { clear() { return Promise.resolve(); } },
  refreshVideoCacheUI() {},
  caches: { delete(name) { deletedCaches.push(name); return Promise.resolve(true); } },
  lsRemove(k) { store.delete(k); },
  videoModal: { classList: { contains: c => c === 'show' } },
  lightbox: { classList: { contains: c => c === 'show' } },
  closeVideo() { videoClosed++; },
  closeLightbox() { lightboxClosed++; },
  refreshAuthUI() {},
  showToast() {}
};
vm.createContext(signOutCtx);
vm.runInContext(html.slice(signOutStart, signOutEnd), signOutCtx);
authClickHandler();
assert.equal(signOutCtx.accessToken, null, 'accessToken cleared on sign out');
assert.equal(videoClosed, 1, 'videoModal closed on sign out');
assert.equal(lightboxClosed, 1, 'lightbox closed on sign out so private image/PDF is not left on screen');
assert.deepEqual(deletedCaches, ['gdv-media-v1'], 'MEDIA_CACHE deleted on sign out so private cached blobs do not persist');

console.log('PASS restore once, popup fallback, reuse consent, memory-only token and error cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});

