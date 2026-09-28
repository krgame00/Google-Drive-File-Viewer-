const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('      async function findFolderCover(');
assert(start>=0,'folder cover lookup must exist');
const end=html.indexOf('\n      }',start);
let calls=0, pages=[{files:[],nextPageToken:'next'},{files:[{mimeType:'video/mp4',thumbnailLink:'https://example.test/thumb'}]}];
const ctx={readPersonalData:()=>({covers:[],hideCovers:false}),authParams:()=>({mode:'key'}),apiKey:'test',AbortSignal,fetch:async()=>{calls++;return {ok:true,json:async()=>pages.shift()}}};
vm.createContext(ctx);vm.runInContext(html.slice(start,end+8),ctx);
(async()=>{
 const cover=await ctx.findFolderCover('folder');assert.equal(cover.url,'https://example.test/thumb');assert.equal(cover.video,true);assert.equal(calls,2);console.log('PASS paginated video cover');
 pages=[{files:[]}];assert.equal(await ctx.findFolderCover('empty'),null);console.log('PASS empty folder fallback');
 ctx.fetch=async()=>({ok:false});await assert.rejects(()=>ctx.findFolderCover('denied'));console.log('PASS inaccessible folder rejected');
 ctx.authParams=()=>({mode:'none'});assert.equal(await ctx.findFolderCover('no-auth'),null);console.log('PASS no authorization fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
// Exercise lazy queue lifecycle without requesting real Drive files.
function source(name){const begin=html.indexOf('      function '+name+'(');assert(begin>=0);return html.slice(begin,html.indexOf('\n      }',begin)+8)}
async function queueChecks(){
 let requests=0,resolveCover;
 const coverPromise=new Promise(r=>resolveCover=r);
 const targets=Array.from({length:5},()=>({isConnected:true,dataset:{folderCover:'same'},children:[],appendChild(el){this.children.push(el)}}));
 const images=[];
 const queueCtx={readPersonalData:()=>({covers:[],hideCovers:false}),folderCoverActive:0,folderCoverQueue:[...targets],folderCoverCache:new Map(),accessToken:null,apiKey:'test',Date,findFolderCover(){requests++;return coverPromise},document:{createElement(){const img={};images.push(img);return img}}};
 vm.createContext(queueCtx);vm.runInContext(source('drainFolderCovers'),queueCtx);
 queueCtx.drainFolderCovers();assert.equal(queueCtx.folderCoverActive,3);assert.equal(requests,1);
 targets[0].isConnected=false;
 resolveCover({url:'https://example.test/cover',video:true});
 await new Promise(r=>setImmediate(r));
 assert.equal(queueCtx.folderCoverActive,0);assert.equal(requests,1);assert.equal(images.length,4);
 targets[1].isConnected=false;images[0].onload();assert.equal(targets[1].children.length,0);
 images[1].onload();assert.equal(targets[2].children.length,2);assert.equal(targets[2].children[1].textContent,'▶');
 console.log('PASS bounded queue, shared cache, detached cards and video badge');
}
queueChecks().catch(e=>{console.error(e);process.exitCode=1});
async function customCoverChecks(){
 let requested='';const custom={readPersonalData:()=>({covers:[{id:'folder',fileId:'chosen-image'}]}),authParams:()=>({mode:'key'}),apiKey:'test',AbortSignal,fetch:async url=>{requested=url;return {ok:true,json:async()=>({thumbnailLink:'https://example.test/chosen'})}}};vm.createContext(custom);vm.runInContext(html.slice(start,end+8),custom);assert.equal((await custom.findFolderCover('folder')).url,'https://example.test/chosen');assert(requested.includes('/files/chosen-image?'));
 const hidden={folderCoverActive:0,folderCoverQueue:[{isConnected:true,dataset:{folderCover:'folder'}}],readPersonalData:()=>({hideCovers:true})};vm.createContext(hidden);vm.runInContext(source('drainFolderCovers'),hidden);hidden.drainFolderCovers();assert.equal(hidden.folderCoverActive,0);assert.equal(hidden.folderCoverQueue.length,0);console.log('PASS custom image cover and hidden covers skip loading');
}
customCoverChecks().catch(e=>{console.error(e);process.exitCode=1});
