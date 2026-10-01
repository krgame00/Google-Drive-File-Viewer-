const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);return html.slice(start,html.indexOf('\n      }',start)+8);}
function setup(){
  const calls=[],box={},ratio={style:{}},attrs=new Map();
  const player={videoWidth:1920,videoHeight:1080,style:{display:'block'}};
  const ctx={vidPlayer:player,previewAspect:null,vidFrame:{parentElement:ratio,getAttribute:k=>attrs.get(k)},
    videoModal:{querySelector:()=>box,classList:{contains:()=>true}},document:{fullscreenElement:null},
    window:{screen:{orientation:{lock:value=>{calls.push(value);return Promise.resolve()},unlock:()=>calls.push('unlock')}}},fitVideoPreview:()=>{},Promise};
  vm.createContext(ctx);
  for(const name of ['getPlayerAspect','releasePlayerOrientation','lockHorizontalPlayerOrientation','applyVideoAspect','applyNativeVideoAspect'])vm.runInContext(fn(name),ctx);
  return {ctx,calls,box,ratio,attrs,player};
}
test('native portrait and ultrawide clips use their actual dimensions',()=>{
  const {ctx,player,ratio}=setup();
  for(const [w,h] of [[1080,1920],[1920,1080],[2560,1080]]){
    player.videoWidth=w;player.videoHeight=h;ctx.applyNativeVideoAspect();assert.equal(Number(ratio.style.aspectRatio),w/h);
  }
});
test('invalid native metadata and hidden native playback cannot overwrite preview aspect',()=>{
  const {ctx,player,ratio,attrs}=setup();player.videoWidth=0;ctx.applyNativeVideoAspect();assert.equal(ratio.style.aspectRatio,undefined);
  attrs.set('data-video-preview','true');ctx.previewAspect={value:9/16};player.videoWidth=1920;ctx.applyNativeVideoAspect();ctx.applyVideoAspect();assert.equal(Number(ratio.style.aspectRatio),9/16);
});
test('switching from horizontal to portrait in fullscreen releases orientation without leaving fullscreen',async()=>{
  const {ctx,box,calls,player,ratio}=setup();ctx.document.fullscreenElement=box;
  ctx.applyNativeVideoAspect();await Promise.resolve();await Promise.resolve();
  assert.equal(box.playerOrientationLocked,true);assert.deepEqual(calls,['landscape']);
  player.videoWidth=1080;player.videoHeight=1920;ctx.applyNativeVideoAspect();
  assert.deepEqual(calls,['landscape','unlock']);assert.equal(ctx.document.fullscreenElement,box);assert.equal(ratio.style.aspectRatio,'');
  ctx.document.fullscreenElement=null;ctx.applyVideoAspect();assert.equal(Number(ratio.style.aspectRatio),9/16);
});
test('an old pending landscape lock is released after switching to portrait',async()=>{
  const {ctx,box,calls,player}=setup();let finish;
  ctx.window.screen.orientation.lock=()=>new Promise(resolve=>finish=resolve);ctx.document.fullscreenElement=box;
  ctx.applyNativeVideoAspect();player.videoWidth=1080;player.videoHeight=1920;ctx.applyNativeVideoAspect();finish();
  await Promise.resolve();await Promise.resolve();assert.equal(box.playerOrientationLocked,false);assert(calls.includes('unlock'));
});
test('a stale landscape request cannot unlock the next horizontal clip',async()=>{
  const {ctx,box,calls}=setup();const pending=[];ctx.window.screen.orientation.lock=()=>new Promise(resolve=>pending.push(resolve));ctx.document.fullscreenElement=box;
  ctx.applyNativeVideoAspect();ctx.releasePlayerOrientation();ctx.applyNativeVideoAspect();
  pending[1]();await Promise.resolve();await Promise.resolve();const before=calls.length;
  pending[0]();await Promise.resolve();await Promise.resolve();assert.equal(box.playerOrientationLocked,true);assert.equal(calls.length,before);
});
test('preview metadata from an earlier opening of the same file cannot overwrite the new player',async()=>{
  const {ctx,ratio,attrs}=setup();const pending=[];
  ctx.mediaSession=1;ctx.vidCurrentId='fileA';
  ctx.authParams=()=>({mode:'bearer'});ctx.accessToken='test';
  ctx.fetch=()=>new Promise(resolve=>pending.push(resolve));attrs.set('data-video-preview','true');
  for(const name of ['clampPreviewAspect','applyPreviewAspect'])vm.runInContext(fn(name),ctx);
  ctx.applyPreviewAspect('fileA');ctx.mediaSession=2;ctx.applyPreviewAspect('fileA');
  pending[1]({ok:true,json:async()=>({videoMediaMetadata:{width:1080,height:1920}})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(Number(ratio.style.aspectRatio),9/16);
  pending[0]({ok:true,json:async()=>({videoMediaMetadata:{width:1920,height:1080}})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(Number(ratio.style.aspectRatio),9/16);
});
