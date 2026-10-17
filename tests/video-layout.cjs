const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function setup(){
  const calls=[],box={},ratioAttrs=new Map(),attrs=new Map(),store={};
  const ratio={
    style:{},
    getBoundingClientRect:()=>({width:390,height:220}),
    setAttribute:(k,v)=>ratioAttrs.set(k,v),
    removeAttribute:k=>ratioAttrs.delete(k),
    getAttribute:k=>ratioAttrs.get(k)
  };
  const aspectBtn={textContent:'สลับแนว ↕↔'};
  const player={videoWidth:1920,videoHeight:1080,style:{display:'block'},pause(){},removeAttribute(){},load(){}};
  const toasts=[],opened=[];
  const bridge={
    vidPlayer:player,
    previewAspect:null,
    mediaSession:0,
    mediaPreviousOverflow:'',
    videoBlobTransfer:null,
    videoAttempt:0,
    videoAttemptTimer:null,
    videoSlowTimer:null,
    videoStatus:'closed',
    saveVideoPos:()=>{},
    resetPdfViewer:()=>{},
    vidLoading:{classList:{remove(){},add(){}}},
    vidOpenTab:{},
    currentVideoUrl:null,
    revokeCurrentDoc:()=>{},
    revokeCurrentVideo:()=>{},
    renderContinueWatching:()=>{},
    loadContinueWatching:()=>[],
    vidProgressBar:{style:{}},
    filesWrap:{before(){}},
    vidCurrentId:'fileA',
    accessToken:'test-token',
    apiKey:'test-key',
    tokenExpiry:Date.now()+60000,
    mediaThumbs:{},
    vidTitle:{textContent:'คลิปทดสอบ.mp4'},
    lsGet:k=>(k in store?store[k]:null),
    lsSet:(k,v)=>{store[k]=String(v);},
    showToast:msg=>toasts.push(msg),
    openVideo:(id,name)=>opened.push({id,name}),
    fileMetaOf:()=>null,
    vidFrame:{parentElement:ratio,getAttribute:key=>attrs.get(key),removeAttribute:k=>attrs.delete(k),style:{setProperty(){}}},
    videoModal:{querySelector:()=>box,classList:{contains:()=>true},setAttribute(){}},
    setVideoStatus:()=>{},
    document:{
      fullscreenElement:null,
      getElementById:id=>id==='vidAspectToggle'?aspectBtn:null,
      createElement:()=>({click(){calls.push('vlc-click');},appendChild(){}})
    },
    window:{screen:{orientation:{lock:value=>{calls.push(value);return Promise.resolve();},unlock:()=>calls.push('unlock')}}},
    fetch:async()=>({ok:true,json:async()=>({})}),
    authParams:()=>({mode:'bearer'})
  };
  const api=loadVideoPlayerApi(bridge);
  return {api,bridge,calls,box,ratio,ratioAttrs,attrs,player,aspectBtn,store,toasts,opened};
}

test('native portrait and ultrawide clips use their actual dimensions',()=>{
  const {api,player,ratio,ratioAttrs}=setup();
  for(const [w,h,orient] of [[1080,1920,'portrait'],[1920,1080,'landscape'],[2560,1080,'landscape']]){
    player.videoWidth=w;player.videoHeight=h;api.applyNativeVideoAspect();
    assert.equal(Number(ratio.style.aspectRatio),w/h);
    assert.equal(ratioAttrs.get('data-orientation'),orient);
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

test('applyPreviewAspect uses cached fileMetaOf dimensions immediately without network fetch',()=>{
  const {api,bridge,ratio,ratioAttrs,attrs,aspectBtn}=setup();
  let fetched=0;
  bridge.fetch=async()=>{fetched++;return {ok:true,json:async()=>({})};};
  bridge.fileMetaOf=id=>id==='fileA'?{videoMediaMetadata:{width:1080,height:1920}}:null;
  attrs.set('data-video-preview','true');
  api.applyPreviewAspect('fileA');
  assert.equal(fetched,0);
  assert.equal(Number(ratio.style.aspectRatio),9/16);
  assert.equal(ratioAttrs.get('data-orientation'),'portrait');
  assert.equal(aspectBtn.textContent,'แนวตั้ง ↕');
});

test('applyPreviewAspect falls back to thumbnail dimensions when signed out or metadata is missing',()=>{
  const {api,bridge,ratio,ratioAttrs,attrs}=setup();
  let loadedSrc=null;
  bridge.authParams=()=>({mode:'none'});
  bridge.mediaThumbs={fileA:'https://thumb.test/fileA.jpg'};
  bridge.Image=function(){
    const img={naturalWidth:720,naturalHeight:1280};
    Object.defineProperty(img,'src',{set(v){loadedSrc=v;if(img.onload)img.onload();}});
    return img;
  };
  attrs.set('data-video-preview','true');
  api.applyPreviewAspect('fileA');
  assert.equal(loadedSrc,'https://thumb.test/fileA.jpg');
  assert.equal(Number(ratio.style.aspectRatio),9/16);
  assert.equal(ratioAttrs.get('data-orientation'),'portrait');
});

test('togglePreviewAspect flips between portrait 9:16 and landscape 16:9 and persists aspect across sessions',()=>{
  const {api,bridge,ratio,ratioAttrs,attrs,aspectBtn}=setup();
  attrs.set('data-video-preview','true');
  bridge.previewAspect={id:'fileA',value:9/16};
  api.applyVideoAspect();
  assert.equal(ratioAttrs.get('data-orientation'),'portrait');
  assert.equal(aspectBtn.textContent,'แนวตั้ง ↕');
  const next1=api.togglePreviewAspect();
  assert.equal(next1,16/9);
  assert.equal(Number(ratio.style.aspectRatio),16/9);
  assert.equal(ratioAttrs.get('data-orientation'),'landscape');
  assert.equal(aspectBtn.textContent,'แนวนอน ↔');
  const next2=api.togglePreviewAspect();
  assert.equal(next2,9/16);
  assert.equal(Number(ratio.style.aspectRatio),9/16);
  assert.equal(ratioAttrs.get('data-orientation'),'portrait');
  assert.equal(aspectBtn.textContent,'แนวตั้ง ↕');
  assert.equal(api.loadCachedVideoAspect('fileA'),9/16);
});

test('openInExternalPlayer builds vlc:// stream URL for Cloudflare Worker and triggers link',()=>{
  const {api,calls,toasts}=setup();
  const url=api.openInExternalPlayer('fileVLC');
  assert.equal(url,'vlc://https://google-drive-file-viewer.missnlpp9.workers.dev/?id=fileVLC&continuous=1');
  assert(calls.includes('vlc-click'));
  assert.equal(toasts.length,1);
});

test('copyVideoToMyDrive copies file via Drive API and opens the new copy when quota blocked',async()=>{
  const {api,bridge,toasts,opened}=setup();
  let calledUrl=null,calledMethod=null;
  bridge.fetch=async(url,opts)=>{
    calledUrl=url;calledMethod=opts.method;
    return {ok:true,json:async()=>({id:'copiedFile123',name:'สำเนาคลิป.mp4'})};
  };
  const res=await api.copyVideoToMyDrive('fileOrig');
  assert.match(calledUrl,/files\/fileOrig\/copy\?supportsAllDrives=true/);
  assert.equal(calledMethod,'POST');
  assert.equal(res.id,'copiedFile123');
  assert.deepEqual(opened,[{id:'copiedFile123',name:'สำเนาคลิป.mp4'}]);
  assert(toasts.some(t=>t.includes('ทำสำเนาเข้า Drive สำเร็จ')));
});

test('minimizeVideo and restoreVideo toggle minimized state, update button text and adjust body overflow',()=>{
  const {api,bridge,box}=setup();
  const modalClasses=new Set(['show']);
  bridge.videoModal.classList={
    contains:cls=>modalClasses.has(cls),
    add:cls=>modalClasses.add(cls),
    remove:cls=>modalClasses.delete(cls)
  };
  const minBtn={textContent:'− ย่อมุมจอ',setAttribute(k,v){this[k]=v;}};
  const origGet=bridge.document.getElementById;
  bridge.document.getElementById=id=>id==='vidMinimize'?minBtn:origGet(id);
  bridge.document.body={style:{overflow:'hidden'}};

  assert.equal(api.isVideoMinimized(),false);
  const minResult=api.minimizeVideo();
  assert.equal(minResult,true);
  assert.equal(api.isVideoMinimized(),true);
  assert(modalClasses.has('minimized'));
  assert.equal(minBtn.textContent,'⤢ ขยายเต็ม');
  assert.equal(bridge.document.body.style.overflow,'');

  const restResult=api.restoreVideo();
  assert.equal(restResult,true);
  assert.equal(api.isVideoMinimized(),false);
  assert(!modalClasses.has('minimized'));
  assert.equal(minBtn.textContent,'− ย่อมุมจอ');
  assert.equal(bridge.document.body.style.overflow,'hidden');

  api.toggleMinimizeVideo();
  assert.equal(api.isVideoMinimized(),true);
  api.toggleMinimizeVideo();
  assert.equal(api.isVideoMinimized(),false);
});

test('closeVideo and openVideo cleanly reset minimized state',()=>{
  const {api,bridge}=setup();
  const modalClasses=new Set(['show','minimized']);
  bridge.videoModal.classList={
    contains:cls=>modalClasses.has(cls),
    add:cls=>modalClasses.add(cls),
    remove:cls=>modalClasses.delete(cls)
  };
  const minBtn={textContent:'⤢ ขยายเต็ม',setAttribute(k,v){this[k]=v;}};
  const origGet=bridge.document.getElementById;
  bridge.document.getElementById=id=>id==='vidMinimize'?minBtn:origGet(id);
  bridge.document.body={style:{overflow:''}};
  bridge.lightbox={classList:{contains:()=>false}};

  api.closeVideo();
  assert.equal(api.isVideoMinimized(),false);
  assert(!modalClasses.has('minimized'));
  assert(!modalClasses.has('show'));
  assert.equal(minBtn.textContent,'− ย่อมุมจอ');

  modalClasses.add('show');
  modalClasses.add('minimized');
  minBtn.textContent='⤢ ขยายเต็ม';
  api.openVideo('fileNext','วิดีโอถัดไป.mp4');
  assert.equal(api.isVideoMinimized(),false);
  assert(!modalClasses.has('minimized'));
  assert.equal(minBtn.textContent,'− ย่อมุมจอ');
});

