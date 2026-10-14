const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function setup(mobile=true){
  const attrs=new Map([['allowfullscreen','']]),calls=[],props=new Map();
  const box={requestFullscreen:async()=>{calls.push('enter');}};
  const ratio={style:{},getBoundingClientRect:()=>({width:390,height:219})};
  const bridge={
    window:{matchMedia:()=>({matches:mobile}),screen:{orientation:{lock:async value=>calls.push(value),unlock:()=>calls.push('unlock')}}},
    document:{fullscreenElement:null,exitFullscreen:async()=>calls.push('exit')},
    vidFrame:{parentElement:ratio,setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),getAttribute:key=>attrs.has(key)?attrs.get(key):null,style:{setProperty:(key,value)=>props.set(key,value)}},
    vidPlayer:{videoWidth:0,videoHeight:0,style:{display:'block'}},
    previewAspect:null,
    videoModal:{classList:{contains:()=>true},querySelector:()=>box},
    showToast:message=>calls.push(message)
  };
  const api=loadVideoPlayerApi(bridge);
  return {bridge,api,attrs,calls,box,props,ratio};
}

test('mobile preview blocks child fullscreen but desktop preserves it',()=>{
  for(const mobile of [true,false]){
    const {api,attrs}=setup(mobile);api.configurePreviewFullscreen();
    assert.equal(attrs.has('allowfullscreen'),!mobile);
    assert.equal(attrs.get('allow'),mobile?"autoplay; encrypted-media; fullscreen 'none'":'autoplay; encrypted-media; fullscreen');
  }
});

test('app fullscreen expands the wrapper and toggles out without replacing media',async()=>{
  const {bridge,api,calls,box}=setup();await api.togglePlayerFullscreen();assert.deepEqual(calls,['enter']);
  bridge.document.fullscreenElement=box;await api.togglePlayerFullscreen();assert.deepEqual(calls,['enter','exit']);
});

test('closed modal never requests fullscreen',async()=>{
  const {bridge,api,calls}=setup();bridge.videoModal.classList.contains=()=>false;
  await api.togglePlayerFullscreen();assert.deepEqual(calls,[]);
});

test('fullscreen rejection is handled and offers external playback',async()=>{
  const {api,calls,box}=setup();box.requestFullscreen=async()=>{throw new Error('denied');};
  await api.togglePlayerFullscreen();assert.equal(calls.length,1);assert.match(calls[0],/แท็บใหม่/);
});

test('preview viewport fits portrait, landscape and narrow screens without cropping',()=>{
  const {api}=setup();
  for(const [width,height] of [[320,180],[390,730],[844,330],[960,540]]){
    const layout=api.calculatePreviewLayout(width,height);
    assert(layout.width>0);
    assert(Math.abs(layout.width*layout.scale-width)<0.01);
    assert(Math.abs(layout.height*layout.scale-height)<0.01);
    assert(layout.scale>0&&layout.scale<=1);
  }
});

test('preview fitting applies only to video previews and ignores zero-sized layouts',()=>{
  const {bridge,api,props,ratio}=setup();
  api.fitVideoPreview();assert.equal(props.size,0);
  bridge.vidFrame.getAttribute=key=>key==='data-video-preview'?'true':null;
  api.fitVideoPreview();assert.equal(props.get('--preview-width'),'480px');
  const oldScale=props.get('--preview-scale');
  ratio.getBoundingClientRect=()=>({width:844,height:330});api.fitVideoPreview();assert.equal(props.get('--preview-scale'),'1');
  assert.notEqual(oldScale,props.get('--preview-scale'));
  props.clear();ratio.getBoundingClientRect=()=>({width:0,height:330});api.fitVideoPreview();assert.equal(props.size,0);
});

test('horizontal preview keeps controls larger on phones while portrait fitting is preserved',()=>{
  const {api}=setup();
  const wide=api.calculatePreviewLayout(390,390*9/16);assert.equal(wide.width,480);assert(wide.scale>=0.8);
  const ultrawide=api.calculatePreviewLayout(390,177,2.2);assert.equal(ultrawide.width,480);assert(ultrawide.scale>=0.8);
  const tall=api.calculatePreviewLayout(390,730);assert.equal(tall.width,800);assert.equal(tall.height*tall.scale,730);
  assert.equal(api.calculatePreviewLayout(700,240,9/16).width,800);
});

test('leaving fullscreen while the orientation request is pending releases the lock',async()=>{
  let resolveLock,unlocks=0;const box={};
  const bridge={previewAspect:{value:16/9},vidPlayer:{},vidFrame:{getAttribute:()=> 'true'},window:{screen:{orientation:{lock:()=>new Promise(resolve=>{resolveLock=resolve;}),unlock:()=>unlocks++}}},videoModal:{querySelector:()=>box},document:{fullscreenElement:box}};
  const api=loadVideoPlayerApi(bridge);const pending=api.lockHorizontalPlayerOrientation(box);
  bridge.document.fullscreenElement=null;resolveLock();await pending;
  assert.equal(unlocks,1);assert.equal(box.playerOrientationLocked,undefined);
});

test('horizontal fullscreen requests landscape, portrait fullscreen leaves orientation unchanged',async()=>{
  for(const aspect of [16/9,9/16]){
    const calls=[],box={},orientation={lock:async value=>calls.push(value),unlock:()=>calls.push('unlock')};
    const bridge={previewAspect:{value:aspect},vidPlayer:{videoWidth:0,videoHeight:0},vidFrame:{getAttribute:()=> 'true'},window:{screen:{orientation}},videoModal:{querySelector:()=>box},document:{fullscreenElement:box}};
    const api=loadVideoPlayerApi(bridge);await api.lockHorizontalPlayerOrientation(box);
    assert.deepEqual(calls,aspect>1?['landscape']:[]);
  }
});

test('unsupported orientation lock does not fail fullscreen playback',async()=>{
  const box={},bridge={previewAspect:{value:16/9},vidPlayer:{},vidFrame:{getAttribute:()=> 'true'},window:{screen:{orientation:{lock:async()=>{throw new Error('unsupported');}}}},videoModal:{querySelector:()=>box},document:{fullscreenElement:box}};
  const api=loadVideoPlayerApi(bridge);await api.lockHorizontalPlayerOrientation(box);assert.equal(box.playerOrientationLocked,undefined);
});
