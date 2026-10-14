const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Classification and API error recovery are in Drive Explorer; markup/CSS are separate.
const appJs=fs.readFileSync(path.join(__dirname,'..','drive-explorer.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');

const explorerModulePath=require.resolve(path.join(__dirname,'..','drive-explorer.js'));
function loadExplorer(bridge){
  const previousWindow=global.window;
  try{
    global.window={GDVExplorerApi:bridge};
    delete require.cache[explorerModulePath];
    return require(explorerModulePath);
  }finally{
    if(previousWindow===undefined) delete global.window;
    else global.window=previousWindow;
  }
}
// Exercise the exported module API rather than slicing the function from source.
const cls=loadExplorer({}).classifyApiError;

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
assert(appJs.includes('function switchGoogleAccount'),'switchGoogleAccount exists');
assert(appJs.includes('{prompt: "select_account"}'),'switch account uses select_account prompt');
assert(appJs.includes('failure.reason ='),'listFolder attaches API reason to thrown error');
assert(appJs.includes('id="errSignIn"'),'sign-in-and-retry button exists');
assert(appJs.includes('id="errSwitchAccount"'),'switch-account button exists');
assert(appJs.includes('ลงชื่อเข้าใช้และลองใหม่'),'sign-in button label present');
assert(css.includes('error-state.signedout')&&css.includes('error-state.quota'),'CSS covers new error categories');
assert(appJs.includes('function folderRecovery'),'folderRecovery helper is defined (was a ReferenceError since 8d3786e)');
assert(appJs.includes('id="emptyBackHome"'),'empty-folder recovery box has back-to-collection button');

console.log('PASS error card classifier, sign-in/switch buttons and reason plumbing');
