const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
// Auth functions live in drive-explorer.js; sign-out event wiring lives in app-core.js.
const driveSource=fs.readFileSync(path.join(__dirname,'..','drive-explorer.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');
function fn(name){const start=driveSource.indexOf('      function '+name+'(');assert(start>=0,name);return driveSource.slice(start,driveSource.indexOf('\n      }',start)+8)}
const store=new Map(),sessionStore=new Map(),requests=[];let config;
const ctx={clientId:'client',accessToken:null,tokenExpiry:0,userProfile:null,tokenClient:null,tokenResolver:null,authRestoreAttempted:false,authGestureHooked:false,Date,URLSearchParams,
AUTH_SCOPE:driveSource.match(/const AUTH_SCOPE = "([^"]+)"/)[1],
document:{addEventListener(t,f){ctx.__gesture=f;}},
location:{origin:'https://x.github.io',pathname:'/app/',hash:'',replace(url){ctx.__redirect=url;}},
history:{replaceState(...a){ctx.__replaceState=a;}},
sessionStorage:{getItem:k=>sessionStore.has(k)?sessionStore.get(k):null,setItem:(k,v)=>sessionStore.set(k,String(v)),removeItem:k=>sessionStore.delete(k)},
lsGet:k=>store.get(k),lsSet:(k,v)=>store.set(k,v),lsRemove:k=>store.delete(k),waitForGis:cb=>cb(),fetchUserProfile(){},refreshAuthUI(){},
google:{accounts:{oauth2:{initTokenClient(c){config=c;return {requestAccessToken:o=>requests.push(o)}}}}}};
vm.createContext(ctx);for(const name of ['authSessionFlag','authSessionSetFlag','authSessionClearFlag','buildSilentAuthUrl','consumeAuthFragment','finishTokenRequest','initTokenClient','ensureToken'])vm.runInContext(fn(name),ctx);
// One vm initTokenClient() call simulates one page load: memory-only auth state resets,
// while the URL and the sessionStorage attempt flags survive like they do in a browser.
function freshLoad(){ctx.accessToken=null;ctx.tokenExpiry=0;ctx.userProfile=null;ctx.tokenResolver=null;ctx.authRestoreAttempted=false;ctx.authGestureHooked=false;ctx.__redirect=undefined;ctx.__replaceState=undefined;ctx.__gesture=undefined;}
(async()=>{
ctx.initTokenClient();assert.equal(requests.length,0,'first visit does not prompt');assert.equal(ctx.__redirect,undefined,'first visit does not redirect');
// Remembered boot must reconnect with ZERO clicks: a full-page prompt=none redirect that no
// browser can gesture-block — never the load-time popup Chromium refuses to open.
store.set('gdv_auth_remember','client');ctx.initTokenClient();
assert.equal(requests.length,0,'boot restore must not open a GIS popup');
const bootUrl=ctx.__redirect;
assert.equal(typeof bootUrl,'string','remembered boot performs a full-page silent redirect');
assert.ok(bootUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'),'redirect targets the Google auth endpoint');
assert.ok(bootUrl.includes('response_type=token&prompt=none'),'silent implicit-flow params');
assert.ok(bootUrl.includes('include_granted_scopes=true'),'include_granted_scopes=true');
assert.ok(bootUrl.includes('client_id='+encodeURIComponent(ctx.clientId)),'client_id is encoded in the redirect URL');
assert.ok(bootUrl.includes('scope='+encodeURIComponent(ctx.AUTH_SCOPE)),'scope matches the shared AUTH_SCOPE const');
assert.ok(bootUrl.includes('redirect_uri='+encodeURIComponent('https://x.github.io/app/')),'redirect_uri is the app page itself');
assert.equal((driveSource.match(/googleapis\.com\/auth\/drive\.readonly/g)||[]).length,1,'the scope literal lives only in the AUTH_SCOPE const');
const savedNonce=sessionStore.get('gdv_silent_state');
assert.ok(/^[0-9a-f]{24}$/.test(savedNonce),'a 24-hex state nonce is minted (Math.random fallback: ctx ships without crypto)');
assert.ok(bootUrl.includes('state='+savedNonce),'the stored nonce rides in the redirect URL');
assert.equal(sessionStore.get('gdv_silent_hash'),'','the pre-redirect app hash is saved for restoration');
config.error_callback({type:'popup_failed_to_open'});assert.equal(ctx.accessToken,null);
// Popup at page load is gesture-blocked in every browser — the reconnect must
// retry from the FIRST user interaction (one-time gesture hook, never a loop).
assert.equal(typeof ctx.__gesture,'function','a one-time gesture reconnect hook is registered');
ctx.__gesture();assert.equal(requests.length,1);assert.equal(requests[0].prompt,'','gesture reconnect is silent-if-granted');
ctx.initTokenClient();assert.equal(requests.length,1,'re-init must not register a second gesture hook');assert.equal(ctx.__redirect,bootUrl,'re-init must not fire a second silent redirect');assert.equal(sessionStore.get('gdv_silent_state'),savedNonce,'the attempt nonce is minted once per attempt');
const pending=ctx.ensureToken();assert.equal(requests.at(-1).prompt,'');config.callback({access_token:'temporary',expires_in:3600});assert.equal(await pending,'temporary');assert.equal(store.get('gdv_auth_remember'),'client');assert(![...store.values()].includes('temporary'));
const before= requests.length;
const renewed=ctx.ensureToken(true);
assert.equal(requests.length,before+1,'401 retry must request a fresh token even before local expiry');
assert.equal(ctx.accessToken,null,'rejected token must not remain usable');
config.callback({access_token:'renewed',expires_in:3600});assert.equal(await renewed,'renewed');
ctx.tokenExpiry=0;const denied=ctx.ensureToken();config.callback({error:'access_denied'});assert.equal(await denied,null);assert.equal(ctx.accessToken,null);assert.equal(ctx.tokenResolver,null);

// Fragment intake: Google answered the silent redirect. The token applies from the URL
// fragment alone — no popup, no second redirect — and the #/ deep link that was open when
// the redirect started is restored in the same history cleanup.
freshLoad();
ctx.location.hash='#/f/abc';
ctx.initTokenClient();
const fragNonce=sessionStore.get('gdv_silent_state');
assert.notEqual(fragNonce,savedNonce,'each attempt mints a fresh state nonce');
assert.equal(typeof ctx.__redirect,'string','a fresh load re-arms the silent redirect');
const rearmUrl=ctx.__redirect,rFrag=requests.length;
ctx.location.hash='#access_token=tok123&expires_in=3600&state='+fragNonce;
ctx.initTokenClient();
assert.equal(ctx.accessToken,'tok123','fragment token applied without any click');
assert(![...store.values()].includes('tok123'),'token stays memory-only through the fragment path');
assert.equal(store.get('gdv_auth_remember'),'client','remember flag set on a granted silent flow');
assert.equal(ctx.__redirect,rearmUrl,'no second redirect after a granted fragment');
assert.equal(requests.length,rFrag,'fragment intake never opens a popup');
assert.equal(sessionStore.has('gdv_silent_state'),false,'state flag consumed');
assert.equal(sessionStore.has('gdv_silent_hash'),false,'hash flag consumed');
assert.equal(ctx.__replaceState[2],'/app/#/f/abc','OAuth fragment cleaned and the saved #/ deep link restored in one replaceState');

// Error intake: Google refused the silent reconnect (login_required). The answer is consumed,
// nothing is granted, and this load must NOT redirect again — the attempt flag read before
// consumeAuthFragment is what breaks what would otherwise be an infinite redirect loop.
freshLoad();
ctx.location.hash='';
ctx.initTokenClient();
const errNonce=sessionStore.get('gdv_silent_state');
freshLoad();
ctx.location.hash='#error=login_required&state='+errNonce;
const rErr=requests.length;
ctx.initTokenClient();
assert.equal(ctx.accessToken,null,'error fragment grants nothing');
assert.equal(sessionStore.has('gdv_silent_state'),false,'error intake consumes the state flag');
assert.equal(sessionStore.has('gdv_silent_hash'),false,'error intake consumes the hash flag');
assert.equal(ctx.__redirect,undefined,'failed silent attempt must not re-redirect on this load (loop guard)');
assert.equal(requests.length,rErr,'and no popup on the error path');
assert.equal(ctx.__replaceState[2],'/app/','error fragment cleaned');
assert.equal(typeof ctx.__gesture,'function','gesture reconnect hook still registered after an error intake');
// Lost response: the redirect started but Google's answer never landed in the URL. The pending
// attempt flag blocks a second redirect on this load (loop guard), the first click reconnects
// via the popup hook, and that success clears the stale flags so later loads go silent again.
freshLoad();
ctx.location.hash='';
ctx.initTokenClient();
const lostNonce=sessionStore.get('gdv_silent_state');
assert.ok(lostNonce,'attempt flags saved before the lost response');
freshLoad();
const rLost=requests.length;
ctx.initTokenClient();
assert.equal(ctx.__redirect,undefined,'pending silent attempt blocks a new redirect on this load');
assert.equal(requests.length,rLost,'and no popup either');
assert.equal(ctx.authRestoreAttempted,true,'page marked attempted so the reconnect button stays');
assert.equal(sessionStore.get('gdv_silent_state'),lostNonce,'the guard leaves the pending flags alone');
ctx.__gesture();
config.callback({access_token:'recovered',expires_in:3600});
assert.equal(ctx.accessToken,'recovered','first click reconnects via the silent-if-granted popup');
assert.equal(sessionStore.has('gdv_silent_state'),false,'a successful reconnect clears the stale pending state flag');
assert.equal(sessionStore.has('gdv_silent_hash'),false,'a successful reconnect clears the stale pending hash flag');
assert(![...store.values()].includes('recovered'),'recovered token stays memory-only');
freshLoad();
ctx.location.hash='';
ctx.initTokenClient();
assert.equal(typeof ctx.__redirect,'string','silent redirect re-armed after a successful recovery');
assert.notEqual(sessionStore.get('gdv_silent_state'),lostNonce,'the new attempt mints a fresh nonce');
// Stale/foreign OAuth fragment with no saved nonce: cleaned, grants nothing, stays put on a
// load that already attempted the silent reconnect.
freshLoad();
ctx.authRestoreAttempted=true;
sessionStore.delete('gdv_silent_state');sessionStore.delete('gdv_silent_hash');
ctx.location.hash='#access_token=x';
const rStale=requests.length,urlStale=ctx.__redirect;
ctx.initTokenClient();
assert.equal(ctx.accessToken,null,'stale fragment grants nothing');
assert.equal(ctx.__replaceState[2],'/app/','stale fragment cleaned');
assert.equal(ctx.__redirect,urlStale,'stale fragment must not trigger a redirect');
assert.equal(requests.length,rStale,'and no popup');

// Nonce minting covers both sources: crypto.getRandomValues when present, Math.random otherwise.
ctx.crypto={getRandomValues(arr){for(let i=0;i<arr.length;i++)arr[i]=(i*7+3)&255;}};
const cryptoUrl=ctx.buildSilentAuthUrl();
assert.ok(cryptoUrl.includes('state=030a11181f262d343b424950'),'crypto.getRandomValues mints the state nonce');
delete ctx.crypto;
const fallbackUrl=ctx.buildSilentAuthUrl();
assert.ok(/state=[0-9a-f]{24}/.test(fallbackUrl),'Math.random fallback still mints a 24-hex nonce');

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

console.log('PASS silent redirect boot, fragment intake, loop guard, popup fallback, reuse consent, memory-only token and error cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
