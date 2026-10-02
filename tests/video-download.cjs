const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);return html.slice(start,html.indexOf('\n      }',start)+8);}
function setup(){
  const els={},el=id=>els[id]||(els[id]={hidden:true,disabled:false,style:{},textContent:'',setAttribute(){},removeAttribute(){},load(){},pause(){}});
  const played=[],ctx={Blob,AbortController,videoBlobTransfer:null,mediaSession:1,vidCurrentId:'fileA',accessToken:'test',apiKey:'',previewAspect:null,fileMetaOf:()=>({size:0}),
    document:{getElementById:el},videoModal:{classList:{contains:()=>true}},vidPlayer:el('vidPlayer'),vidFrame:el('vidFrame'),
    authParams:()=>({mode:'bearer'}),cancelVideoAttempt(){},applyVideoAspect(){},revokeCurrentVideo(){},
    URL:{createObjectURL:()=> 'blob:video'},tryVideoSrc:url=>played.push(url),setVideoStatus:(state,message)=>{el('vidLoadingText').textContent=message||''},
    showStreamFailure:message=>{el('vidErrorStatus').textContent=message},describeCodecSupport:()=>'',deviceCodecSupport:()=>null};
  vm.createContext(ctx);for(const name of ['formatSize','readVideoBlobResponse','readVideoBlobRanges','openVideoTempWriter','renderVideoBlobProgress','cancelVideoBlobTransfer','loadVideoAsBlob'])vm.runInContext(fn(name),ctx);
  return {ctx,els,el,played};
}
function response(chunks,total){let i=0;return {ok:true,headers:{get:k=>k==='content-length'?(total?String(total):null):'video/mp4'},body:{getReader:()=>({read:async()=>i<chunks.length?{value:new Uint8Array(chunks[i++]),done:false}:{done:true},cancel:async()=>{},releaseLock(){}})}};}
function rangeResponse(start,end,total,noCR){let i=0;const len=end-start+1;return {ok:true,status:206,headers:{get:k=>{k=String(k).toLowerCase();return k==='content-range'?(noCR?null:'bytes '+start+'-'+end+'/'+total):k==='content-type'?'video/mp4':k==='content-length'?String(len):null}},body:{cancel:async()=>{},getReader:()=>({read:async()=>{if(i>=len)return{done:true};const n=Math.min(65536,len-i),arr=new Uint8Array(n);for(let j=0;j<n;j++)arr[j]=(start+i+j)%256;i+=n;return{value:arr,done:false}},cancel:async()=>{},releaseLock(){}})}};}
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
test('parallel whole-file loading fetches ordered 8 MiB ranges and reassembles exact bytes',async()=>{
  const {ctx}=setup();const size=20*1048576+123,ranges=[],progress=[];
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);assert.equal(opts.headers.Authorization,undefined,'no credentials beyond the given headers');ranges.push(opts.headers.Range);return rangeResponse(Number(m[1]),Number(m[2]),size)};
  const blob=await ctx.readVideoBlobRanges('u',{},size,new AbortController().signal,(n,t)=>progress.push([n,t]));
  assert.equal(blob.size,size);assert.deepEqual(ranges.slice().sort(),['bytes=0-8388607','bytes=16777216-'+(size-1),'bytes=8388608-16777215']);
  for(const o of [0,1,8388607,8388608,size-1]){const b=new Uint8Array(await blob.slice(o,o+1).arrayBuffer());assert.equal(b[0],o%256,'byte '+o+' matches its absolute offset');}
  assert.deepEqual(progress.at(-1),[size,size]);
});
test('parallel loading never exceeds four concurrent range requests',async()=>{
  const {ctx}=setup();const size=40*1048576;let active=0,max=0;
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);active++;max=Math.max(max,active);await Promise.resolve();try{return rangeResponse(Number(m[1]),Number(m[2]),size)}finally{active--}};
  const blob=await ctx.readVideoBlobRanges('u',{},size,new AbortController().signal,()=>{});
  assert.equal(blob.size,size);assert.equal(max,4);
});
test('upstream ignoring ranges falls back to a single-connection download',async()=>{
  const {ctx,played}=setup();ctx.fileMetaOf=()=>({size:20*8388608});let giveups=0;const ranges=[];
  ctx.fetch=async(url,opts)=>{ranges.push(opts.headers&&opts.headers.Range||null);return response([[1,2,3]],3)};
  await ctx.loadVideoAsBlob('fileA',()=>giveups++);
  assert.deepEqual(played,['blob:video']);assert.equal(giveups,0);assert.ok(ranges.includes(null),'a request without Range happened');
});
test('metadata size disagreeing with the upstream total falls back to single connection',async()=>{
  const {ctx,played}=setup();ctx.fileMetaOf=()=>({size:20*8388608});let giveups=0;const ranges=[];
  ctx.fetch=async(url,opts)=>{const m=opts.headers&&opts.headers.Range&&opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);if(!m){ranges.push(null);return response([[1,2,3]],3)}return rangeResponse(Number(m[1]),Number(m[2]),20*8388608+7)};
  await ctx.loadVideoAsBlob('fileA',()=>giveups++);
  assert.deepEqual(played,['blob:video']);assert.equal(giveups,0);assert.ok(ranges.includes(null));
});
test('a transient chunk failure retries its own range without restarting the file',async()=>{
  const {ctx}=setup();const size=20*1048576+123,seen={};
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);seen[m[1]]=(seen[m[1]]||0)+1;if(m[1]==='8388608'&&seen[m[1]]===1)throw new Error('network blip');return rangeResponse(Number(m[1]),Number(m[2]),size)};
  const blob=await ctx.readVideoBlobRanges('u',{},size,new AbortController().signal,()=>{});
  assert.equal(blob.size,size);assert.equal(seen['8388608'],2);assert.equal(seen['0'],1);
});
test('cross-origin chunks without a readable Content-Range validate by exact body length',async()=>{
  const {ctx}=setup();const size=20*1048576+123,ranges=[],progress=[];
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);ranges.push(opts.headers.Range);return rangeResponse(Number(m[1]),Number(m[2]),size,true)};
  const blob=await ctx.readVideoBlobRanges('u',{},size,new AbortController().signal,(n,t)=>progress.push([n,t]));
  assert.equal(blob.size,size);assert.deepEqual(ranges.slice().sort(),['bytes=0-8388607','bytes=16777216-'+(size-1),'bytes=8388608-16777215']);
  for(const o of [0,8388608,size-1]){const b=new Uint8Array(await blob.slice(o,o+1).arrayBuffer());assert.equal(b[0],o%256,'byte '+o+' matches its absolute offset');}
  assert.deepEqual(progress.at(-1),[size,size]);
});
test('a wrong-length cross-origin chunk rejects permanently without retries',async()=>{
  const {ctx}=setup();const size=20*1048576+123;let calls=0;
  ctx.fetch=async(url,opts)=>{calls++;const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);if(m[1]==='8388608')return rangeResponse(Number(m[1]),Number(m[1])+99,size,true);return rangeResponse(Number(m[1]),Number(m[2]),size,true)};
  await assert.rejects(ctx.readVideoBlobRanges('u',{},size,new AbortController().signal,()=>{}),/chunk length mismatch/);
  assert.equal(calls,3,'three chunks, the bad one never retried');
});
test('cancelling a parallel transfer plays nothing and never falls back',async()=>{
  const {ctx,el,played}=setup();ctx.fileMetaOf=()=>({size:20*8388608});let giveups=0,finish;
  ctx.fetch=()=>new Promise(resolve=>finish=resolve);
  const load=ctx.loadVideoAsBlob('fileA',()=>giveups++);await new Promise(r=>setImmediate(r));ctx.cancelVideoBlobTransfer(true);
  finish(rangeResponse(0,8388607,20*8388608));await load;
  assert.deepEqual(played,[]);assert.equal(giveups,0);assert.equal(el('vidBlob').disabled,false);
});
test('large files write chunks into an OPFS temp file and play from the disk-backed file',async()=>{
  const {ctx,played}=setup();const size=20*1048576+123;ctx.fileMetaOf=()=>({size});
  const writes=[],ops=[],writable={write:async e=>writes.push(e),close:async()=>ops.push('close'),abort:async()=>ops.push('abort')};
  const file={size};
  ctx.navigator={storage:{getDirectory:async()=>({getFileHandle:async()=>({createWritable:async()=>writable,getFile:async()=>file})})}};
  ctx.URL={createObjectURL:b=>{ops.push(b===file?'url:file':'url:other');return 'blob:video'},revokeObjectURL(){}};
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);return rangeResponse(Number(m[1]),Number(m[2]),size)};
  await ctx.loadVideoAsBlob('fileA');
  assert.deepEqual(played,['blob:video']);
  assert.deepEqual(writes.map(w=>w.position).slice().sort((a,b)=>a-b),[0,8388608,16777216]);
  assert.deepEqual(writes.map(w=>w.type),['write','write','write']);
  assert.ok(ops.includes('close'),'temp file committed once');assert.ok(ops.includes('url:file'),'player receives the OPFS file itself');assert.equal(ops.includes('abort'),false);
});
test('a failing OPFS write falls back to the single-connection download',async()=>{
  const {ctx,played}=setup();const size=20*1048576+123;ctx.fileMetaOf=()=>({size});const ranges=[],ops=[];
  const writable={write:async()=>{throw new Error('quota exceeded')},close:async()=>ops.push('close'),abort:async()=>ops.push('abort')};
  ctx.navigator={storage:{getDirectory:async()=>({getFileHandle:async()=>({createWritable:async()=>writable,getFile:async()=>({size})})})}};
  ctx.fetch=async(url,opts)=>{ranges.push(opts.headers&&opts.headers.Range||null);return response([[1,2,3]],3)};
  let giveups=0;await ctx.loadVideoAsBlob('fileA',()=>giveups++);
  assert.deepEqual(played,['blob:video']);assert.equal(giveups,0);assert.ok(ranges.includes(null),'fell back to a request without Range');
  assert.ok(ops.includes('abort'),'abandoned writable is aborted');assert.equal(ops.includes('close'),false);
});
test('whole-file loading retries through the public worker when the direct source is quota-blocked',async()=>{
  const {ctx,played}=setup();ctx.fileMetaOf=()=>({size:20*1048576});const urls=[];
  ctx.fetch=async(url,opts)=>{urls.push(String(url));if(String(url).includes('googleapis'))return {ok:false,status:403,headers:{get:()=>null},body:{cancel:async()=>{}}};const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);return rangeResponse(Number(m[1]),Number(m[2]),20*1048576)};
  let giveups=0;await ctx.loadVideoAsBlob('fileA',()=>giveups++);
  assert.deepEqual(played,['blob:video']);assert.equal(giveups,0);
  assert.ok(urls.some(u=>u.includes('googleapis')),'direct source tried first');
  assert.ok(urls.some(u=>u.includes('workers.dev')),('worker source tried after direct'));
  assert.ok(urls.filter(u=>u.includes('workers.dev')).every(u=>!u.includes('key=')),'no key leaks to the worker');
});
test('worker fallback failure still reports the whole-file error card',async()=>{
  const {ctx,el,played}=setup();ctx.fileMetaOf=()=>({size:20*1048576});
  ctx.fetch=async()=>({ok:false,status:403,headers:{get:()=>null},body:{cancel:async()=>{}}});
  let giveups=0;await ctx.loadVideoAsBlob('fileA',()=>giveups++);
  assert.deepEqual(played,[]);assert.equal(giveups,1);assert.match(el('vidLoadingText').textContent,/โหลดทั้งไฟล์ไม่สำเร็จ/);
});
test('browsers without OPFS keep assembling the video in memory',async()=>{
  const {ctx,played}=setup();const size=20*1048576+123;ctx.fileMetaOf=()=>({size});
  ctx.fetch=async(url,opts)=>{const m=opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);return rangeResponse(Number(m[1]),Number(m[2]),size)};
  await ctx.loadVideoAsBlob('fileA');
  assert.deepEqual(played,['blob:video']);
});
