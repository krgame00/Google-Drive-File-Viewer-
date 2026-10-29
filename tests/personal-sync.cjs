const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const coreJs=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');
const start=coreJs.indexOf('      function validatePersonalData(');
const end=coreJs.indexOf('      function updatePersonalData(');
assert(start>=0&&end>start,'personal data + sync block extracted');
function makeEnv(store){
  const ctx={lsGet:k=>(k in store?store[k]:null),lsSet:(k,v)=>{store[k]=String(v);}};
  vm.createContext(ctx);vm.runInContext(coreJs.slice(start,end),ctx);
  return ctx;
}
const localStore={
 gdv_favorites:JSON.stringify([{id:'fav1',name:'Fav'}]),
 gdv_continue:JSON.stringify([{id:'v1',name:'V1',position:100,updated:100}]),
 gdv_watch_later:JSON.stringify([{id:'w1',name:'W1',kind:'video'}]),
 gdv_watched:JSON.stringify(['v1']),
 gdv_covers:JSON.stringify([{id:'fold1',fileId:'c1'}]),
 gdv_hide_covers:'false'
};
const merged=makeEnv({...localStore}).mergePersonalSyncSnapshot({
 format:'gdv-personal-sync',version:1,updatedAt:Date.now(),
 favorites:[{id:'fav2',name:'Fav2'}],watched:['v2'],
 continueWatching:[{id:'v1',name:'V1',position:300,updated:200},{id:'v2',name:'V2',position:50,updated:300}],
 watchLater:[{id:'w2',name:'W2',kind:'image'}],hideCovers:true
});
assert.equal(merged.favorites.length,2,'favorites union by id');
assert.equal(merged.continueWatching.find(x=>x.id==='v1').position,300,'furthest watch position wins');
assert(merged.continueWatching.some(x=>x.id==='v2'),'remote continue entries merge in');
assert.equal(merged.watched.length,2,'watched union');
assert.equal(merged.watchLater.length,2,'watch later union by id');
assert.equal(merged.hideCovers,true,'hideCovers is OR-ed');
assert.equal(merged.covers.length,1,'local covers are preserved (not synced in v1)');

const merged2=makeEnv({...localStore}).mergePersonalSyncSnapshot({format:'gdv-personal-sync',version:1,updatedAt:1});
assert.equal(merged2.favorites.length,1,'empty remote keeps local favorites');
assert.equal(merged2.continueWatching[0].position,100,'empty remote keeps local progress');
assert.equal(merged2.hideCovers,false,'empty remote keeps local hideCovers');

const merged3=makeEnv({...localStore}).mergePersonalSyncSnapshot({format:'gdv-personal-sync',version:1,continueWatching:[{id:'v1',name:'V1',position:20,updated:999}]});
assert.equal(merged3.continueWatching.find(x=>x.id==='v1').position,100,'smaller remote position does not rewind progress');

const merged4=makeEnv({...localStore}).mergePersonalSyncSnapshot({});
assert.equal(merged4.continueWatching.length,1,'malformed remote is treated as empty');

// snapshot shape used for upload
const snapCtx=makeEnv({...localStore});
const snap=snapCtx.personalSyncSnapshot();
assert.equal(snap.format,'gdv-personal-sync');assert.equal(snap.version,1);
assert.equal(snap.watchLater.length,1);assert.equal(typeof snap.updatedAt,'number');
assert.equal(snap.covers,undefined,'covers are excluded from the sync payload');
console.log('PASS personal sync merge');
