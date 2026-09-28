const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(n){const a=html.indexOf('      function '+n+'(');assert(a>=0,n+' exists');return html.slice(a,html.indexOf('\n      }',a)+8)}
const ctx={lsGet:()=>'{bad json',lsSet(){},folderPositions:new Map(),displayedFolderId:'parent',window:{scrollY:420},document:{getElementById:()=>({querySelector:()=>null})}};vm.createContext(ctx);
for(const n of ['loadFavoriteFolders','saveFolderPosition'])vm.runInContext(fn(n),ctx);
assert.equal(ctx.loadFavoriteFolders().length,0);
ctx.lsGet=()=>JSON.stringify([{id:'ok',name:'Name'},{id:123},null]);assert.equal(ctx.loadFavoriteFolders().length,1);
ctx.saveFolderPosition();assert.equal(ctx.folderPositions.get('parent').y,420);
ctx.displayedFolderId=null;ctx.window.scrollY=0;ctx.saveFolderPosition();assert.equal(ctx.folderPositions.get('parent').y,420);
console.log('PASS favorite data validation and folder position preservation');
let queued=0,stopped=0;
ctx.document.createElement=()=>({});ctx.folderCoverQueue=[];ctx.drainFolderCovers=()=>queued++;
vm.runInContext(fn('showFolderCoverStatus'),ctx);
const target={isConnected:true,querySelector:()=>null,appendChild(el){this.status=el}};
ctx.showFolderCoverStatus(target,false);assert.equal(target.status.textContent,'ไม่มีภาพตัวอย่าง');
ctx.showFolderCoverStatus(target,true);target.status.remove=()=>{};target.status.onclick({stopPropagation(){stopped++}});
assert.equal(queued,1);assert.equal(stopped,1);assert.equal(ctx.folderCoverQueue[0],target);
console.log('PASS cover status distinguishes empty/error and retry stops folder navigation');
async function navigationChecks(){
 const begin=html.indexOf('      async function listFolder(');
 const code=html.slice(begin,html.indexOf('\n      }',begin)+8);
 const frames=[],scrolls=[];let resolveOld;
 const oldResponse=new Promise(r=>resolveOld=r);
 const search={value:'',dispatchEvent(){}};
 const context={folderRequest:0,folderAbort:null,displayedFolderId:null,folderPositions:new Map([['return',{y:640,query:'photo'}]]),saveFolderPosition(){},renderBreadcrumb(){},authParams:()=>({mode:'key'}),apiKey:'test',renderLoading(){},renderFiles(){},renderApiError(){throw Error('unexpected error')},AbortController,setTimeout,clearTimeout,Event,requestAnimationFrame(cb){frames.push(cb)},document:{getElementById(id){return id==='fileSearch'?search:{scrollIntoView(){scrolls.push('new')}}}},window:{scrollTo(p){scrolls.push(p.top)}},fetch:async url=>url.includes(encodeURIComponent("'old' in parents"))?oldResponse:{ok:true,json:async()=>({files:[]})}};
 vm.createContext(context);vm.runInContext(code,context);
 await context.listFolder('return');frames.shift()();assert.equal(search.value,'photo');assert.equal(scrolls.pop(),640);
 const pending=context.listFolder('old');await context.listFolder('new');resolveOld({ok:true,json:async()=>({files:[]})});await pending;
 frames.forEach(cb=>cb());assert.equal(context.displayedFolderId,'new');assert.deepEqual(scrolls,['new']);
 console.log('PASS restored scroll/search and stale navigation cannot move current page');
}
navigationChecks().catch(e=>{console.error(e);process.exitCode=1});
