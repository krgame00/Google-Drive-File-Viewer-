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
ctx.tokenExpiry=0;const denied=ctx.ensureToken();config.callback({error:'access_denied'});assert.equal(await denied,null);assert.equal(ctx.accessToken,null);assert.equal(ctx.tokenResolver,null);
console.log('PASS restore once, popup fallback, reuse consent, memory-only token and error cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
