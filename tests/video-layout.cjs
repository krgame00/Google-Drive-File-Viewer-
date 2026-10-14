const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function setup(){
  const calls=[],box={},ratio={style:{},getBoundingClientRect:()=>({width:390,height:220})},attrs=new Map();
  const player={videoWidth:1920,videoHeight:1080,style:{display:'block'}};
  const bridge={
    vidPlayer:player,
    previewAspect:null,
    mediaSession:0,
    vidCurrentId:'fileA',
    accessToken:'test-token',
    vidFrame:{parentElement:ratio,getAttribute:key=>attrs.get(key),style:{setProperty(){}}},
    videoModal:{querySelector:()=>box,classList:{contains:()=>true}},
    document:{fullscreenElement:null},
    window:{screen:{orientation:{lock:value=>{calls.push(value);return Promise.resolve();},unlock:()=>calls.push('unlock')}}},
    fetch:async()=>({ok:true,json:async()=>({})}),
    authParams:()=>({mode:'bearer'})
  };
  const api=loadVideoPlayerApi(bridge);
  return {api,bridge,calls,box,ratio,attrs,player};
}

test('native portrait and ultrawide clips use their actual dimensions',()=>{
  const {api,player,ratio}=setup();
  for(const [w,h] of [[1080,1920],[1920,1080],[2560,1080]]){
    player.videoWidth=w;player.videoHeight=h;api.applyNativeVideoAspect();
    assert.equal(Number(ratio.style.aspectRatio),w/h);
  }
});

test('invalid native metadata and hidden native playback cannot overwrite preview aspect',()=>{
  const {api,bridge,player,ratio,attrs}=setup();player.videoWidth=0;api.applyNativeVideoAspect();
  assert.equal(ratio.style.aspectRatio,undefined);
  attrs.set('data-video-preview','true');bridge.previewAspect={id:'fileA',value:9/16};
  player.videoWidth=1920;api.applyNativeVideoAspect();api.applyVideoAspect();
  assert.equal(Number(ratio.style.aspectRatio),9/16);
});

test('switching from horizontal to portrait in fullscreen releases orientation without leaving fullscreen',async()=>{
  const {api,bridge,box,calls,player,ratio}=setup();bridge.document.fullscreenElement=box;
  api.applyNativeVideoAspect();await Promise.resolve();await Promise.resolve();
  assert.equal(box.playerOrientationLocked,true);assert.deepEqual(calls,['landscape']);
  player.videoWidth=1080;player.videoHeight=1920;api.applyNativeVideoAspect();
  assert.deepEqual(calls,['landscape','unlock']);assert.equal(bridge.document.fullscreenElement,box);assert.equal(ratio.style.aspectRatio,'');
  bridge.document.fullscreenElement=null;api.applyVideoAspect();assert.equal(Number(ratio.style.aspectRatio),9/16);
});

test('an old pending landscape lock is released after switching to portrait',async()=>{
  const {api,bridge,box,calls,player}=setup();let finish;
  bridge.window.screen.orientation.lock=()=>new Promise(resolve=>{finish=resolve;});bridge.document.fullscreenElement=box;
  api.applyNativeVideoAspect();player.videoWidth=1080;player.videoHeight=1920;api.applyNativeVideoAspect();finish();
  await Promise.resolve();await Promise.resolve();assert.equal(box.playerOrientationLocked,false);assert(calls.includes('unlock'));
});

test('a stale landscape request cannot unlock the next horizontal clip',async()=>{
  const {api,bridge,box,calls}=setup();const pending=[];
  bridge.window.screen.orientation.lock=()=>new Promise(resolve=>{pending.push(resolve);});bridge.document.fullscreenElement=box;
  api.applyNativeVideoAspect();api.releasePlayerOrientation();api.applyNativeVideoAspect();
  pending[1]();await Promise.resolve();await Promise.resolve();const before=calls.length;
  pending[0]();await Promise.resolve();await Promise.resolve();assert.equal(box.playerOrientationLocked,true);assert.equal(calls.length,before);
});

test('preview metadata from an earlier opening of the same file cannot overwrite the new player',async()=>{
  const {api,bridge,ratio,attrs}=setup();const pending=[];
  bridge.mediaSession=1;bridge.vidCurrentId='fileA';bridge.authParams=()=>({mode:'bearer'});
  bridge.accessToken='test';bridge.fetch=()=>new Promise(resolve=>{pending.push(resolve);});attrs.set('data-video-preview','true');
  api.applyPreviewAspect('fileA');bridge.mediaSession=2;api.applyPreviewAspect('fileA');
  pending[1]({ok:true,json:async()=>({videoMediaMetadata:{width:1080,height:1920}})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(Number(ratio.style.aspectRatio),9/16);
  pending[0]({ok:true,json:async()=>({videoMediaMetadata:{width:1920,height:1080}})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(Number(ratio.style.aspectRatio),9/16);
});
