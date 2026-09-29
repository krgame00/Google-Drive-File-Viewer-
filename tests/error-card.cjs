const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');

// ดึง classifyApiError (pure function) มารันใน vm
const start=html.indexOf('      function classifyApiError(');
assert(start>=0,'classifyApiError exists');
const end=html.indexOf('\n      }',start);
const ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(start,end+8),ctx);
const cls=ctx.classifyApiError;

// โควตา/429 → quota (ไม่สนว่าล็อกอินไหม)
assert.equal(cls(429,'',true),'quota','429 maps to quota');
for(const r of ['userRateLimitExceeded','rateLimitExceeded','dailyLimitExceeded','quotaExceeded','sharingRateLimitExceeded']){
  assert.equal(cls(403,r,true),'quota','403 '+r+' maps to quota');
  assert.equal(cls(403,r,false),'quota','403 '+r+' signed-out still quota');
}
for(const signedIn of [true,false]) {
  assert.equal(cls(403,'backendError',signedIn),'server');
  assert.equal(cls(500,'',signedIn),'server');
  assert.equal(cls(503,'',signedIn),'server');
}
// ไม่มีสิทธิ์จริง → permission เมื่อล็อกอิน, signedout เมื่อไม่ล็อกอิน
assert.equal(cls(403,'insufficientFilePermissions',true),'permission');
assert.equal(cls(403,'appNotAuthorizedToFile',true),'permission');
assert.equal(cls(403,'',true),'permission','403 unknown reason signed-in treated as permission');
assert.equal(cls(403,'',false),'signedout','403 signed-out maps to signedout');
// 401 → session/signedout, 404, network
assert.equal(cls(401,'',true),'session');
assert.equal(cls(401,'',false),'signedout');
assert.equal(cls(404,'',true),'notfound');
assert.equal(cls(500,'',true),'server');
assert.equal(cls(null,'',false),'network');

// โครงสร้างใหม่ในหน้า
assert(html.includes('function switchGoogleAccount'),'switchGoogleAccount exists');
assert(html.includes('{prompt: "select_account"}'),'switch account uses select_account prompt');
assert(html.includes('failure.reason ='),'listFolder attaches API reason to thrown error');
assert(html.includes('id="errSignIn"'),'sign-in-and-retry button exists');
assert(html.includes('id="errSwitchAccount"'),'switch-account button exists');
assert(html.includes('ลงชื่อเข้าใช้และลองใหม่'),'sign-in button label present');
assert(html.includes('error-state.signedout')&&html.includes('error-state.quota'),'CSS covers new error categories');
assert(html.includes('function folderRecovery'),'folderRecovery helper is defined (was a ReferenceError since 8d3786e)');
assert(html.includes('id="emptyBackHome"'),'empty-folder recovery box has back-to-collection button');

console.log('PASS error card classifier, sign-in/switch buttons and reason plumbing');
