const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);return html.slice(start,html.indexOf('\n      }',start)+8);}
function setup(){
  const els={},el=id=>els[id]||(els[id]={hidden:true,disabled:false,style:{},textContent:'',setAttribute(){},removeAttribute(){},load(){},pause(){}});
  const played=[],ctx={Blob,AbortController,videoBlobTransfer:null,mediaSession:1,vidCurrentId:'fileA',accessToken:'test',apiKey:'',previewAspect:null,
    document:{getElementById:el},videoModal:{classList:{contains:()=>true}},vidPlayer:el('vidPlayer'),vidFrame:el('vidFrame'),
    authParams:()=>({mode:'bearer'}),cancelVideoAttempt(){},applyVideoAspect(){},revokeCurrentVideo(){},
    URL:{createObjectURL:()=> 'blob:video'},tryVideoSrc:url=>played.push(url),setVideoStatus:(state,message)=>{el('vidLoadingText').textContent=message||''},
    showStreamFailure:message=>{el('vidErrorStatus').textContent=message},describeCodecSupport:()=>'',deviceCodecSupport:()=>null};
  vm.createContext(ctx);for(const name of ['formatSize','readVideoBlobResponse','renderVideoBlobProgress','cancelVideoBlobTransfer','loadVideoAsBlob'])vm.runInContext(fn(name),ctx);
  return {ctx,els,el,played};
}
function response(chunks,total){let i=0;return {ok:true,headers:{get:k=>k==='content-length'?(total?String(total):null):'video/mp4'},body:{getReader:()=>({read:async()=>i<chunks.length?{value:new Uint8Array(chunks[i++]),done:false}:{done:true},cancel:async()=>{},releaseLock(){}})}};}
test('streamed download reports actual bytes and preserves the video payload',async()=>{
  const {ctx}=setup(),progress=[];const blob=await ctx.readVideoBlobResponse(response([[1,2],[3,4]],4),new AbortController().signal,(n,total)=>progress.push([n,total]));
  assert.equal(blob.size,4);assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[1,2,3,4]);assert.deepEqual(progress.at(-1),[4,4]);
});
test('missing size shows received bytes without inventing a percentage',()=>{
  const {ctx,el}=setup();ctx.renderVideoBlobProgress(1048576,0);assert.match(el('vidLoadingText').textContent,/1(?:\.0)? MB/);assert(!el('vidLoadingText').textContent.includes('%'));
  ctx.renderVideoBlobProgress(1048576,2097152);assert.match(el('vidLoadingText').textContent,/50%/);assert.equal(el('vidProgressBar').style.width,'50%');
});
test('cancelling interrupts a pending body read and never returns a partial video',async()=>{
  const {ctx}=setup();const controller=new AbortController();let cancel=0,finish;
  const res=response([],4);res.body.getReader=()=>({read:()=>new Promise(resolve=>finish=resolve),cancel:async()=>{cancel++;finish({done:true})},releaseLock(){}});
  const read=ctx.readVideoBlobResponse(res,controller.signal,()=>{});controller.abort();await assert.rejects(read,{name:'AbortError'});assert.equal(cancel,1);
});
test('successful download enables retry and unloads a Google preview before native playback',async()=>{
  const {ctx,el,played}=setup();ctx.vidFrame.style.display='block';ctx.fetch=async()=>response([[1,2,3]],3);
  await ctx.loadVideoAsBlob('fileA');assert.deepEqual(played,['blob:video']);assert.equal(ctx.vidFrame.style.display,'none');assert.equal(ctx.vidPlayer.style.display,'block');
  assert.equal(el('vidBlob').disabled,false);assert.equal(el('vidCancelBlob').hidden,true);
});
test('cancelled transfer cannot play or run automatic fallback after resolving late',async()=>{
  const {ctx,el,played}=setup();let finish,giveups=0;ctx.fetch=()=>new Promise(resolve=>finish=resolve);
  const load=ctx.loadVideoAsBlob('fileA',()=>giveups++);const transfer=ctx.videoBlobTransfer;ctx.cancelVideoBlobTransfer(true);
  assert.equal(transfer.controller.signal.aborted,true);finish(response([[1,2]],2));await load;
  assert.deepEqual(played,[]);assert.equal(giveups,0);assert.equal(el('vidBlob').disabled,false);
});
test('late failure from an old transfer cannot overwrite or enable controls for a new transfer',async()=>{
  const {ctx,el}=setup();const pending=[];ctx.fetch=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
  const old=ctx.loadVideoAsBlob('fileA');ctx.mediaSession++;const current=ctx.loadVideoAsBlob('fileA');
  pending[0].reject(new Error('old failure'));await old;assert.equal(el('vidBlob').disabled,true);assert.equal(el('vidErrorStatus').textContent,'');
  pending[1].resolve(response([[1]],1));await current;assert.equal(el('vidBlob').disabled,false);
});
