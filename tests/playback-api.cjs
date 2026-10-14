const {test}=require('node:test');
const assert=require('node:assert/strict');

// Exercise the exported module API; only browser/player dependencies are faked.
global.window={GDVVideoApi:{}};
const videoApi=require('../video-player.js');

function setup(){
  const events=[],statuses=[];
  const timers=new Map();let nextTimer=1;
  const deps={
    mediaSession:1,videoAttempt:1,vidCurrentId:'file1',accessToken:null,
    videoAttemptTimer:null,videoSlowTimer:null,failedVideoAttempt:null,
    videoResumePos:0,videoStatus:'loading',
    videoModal:{classList:{contains:()=>true}},
    vidPlayer:{
      style:{display:'block'},paused:true,ended:false,currentTime:0,
      networkState:1,readyState:0,error:null,
      removeAttribute(){},play(){this.paused=false;events.push('play');return Promise.resolve();}
    },
    cancelVideoBlobTransfer(){events.push('cancel-transfer');},
    cancelVideoAttempt(){events.push('cancel-attempt');},
    applyVideoAspect(){events.push('reset-aspect');},
    applyNativeVideoAspect(){events.push('native-aspect');},
    setVideoStatus(state,message){statuses.push({state,message});deps.videoStatus=state;},
    saveVideoPos(){events.push('save-position');},
    setTimeout(callback,ms){const id=nextTimer++;timers.set(id,{callback,ms});return id;},
    clearTimeout(id){timers.delete(id);}
  };
  deps.tryVideoSrc=videoApi.createVideoSourceRunner(deps);
  return {deps,events,statuses,timers};
}

test('native canplay completes the current attempt and starts playback',()=>{
  const {deps,events,statuses}=setup();
  const failed=[];
  deps.tryVideoSrc('https://example.test/video.mp4',(...args)=>failed.push(args),12000);
  deps.vidPlayer.oncanplay();
  assert.equal(deps.videoStatus,'playing');
  assert.equal(deps.vidPlayer.paused,false);
  assert(events.includes('native-aspect'));
  assert(events.includes('play'));
  assert.equal(failed.length,0);
  assert(statuses.some(s=>s.state==='playing'));
});

test('late canplay and media errors after close are ignored',()=>{
  const {deps,events}=setup();const failed=[];
  deps.tryVideoSrc('https://example.test/old.mp4',(...args)=>failed.push(args));
  const canplay=deps.vidPlayer.oncanplay;
  const onerror=deps.vidPlayer.onerror;
  deps.mediaSession++;
  canplay();onerror();
  assert.equal(failed.length,0);
  assert(!events.includes('play'));
});

test('late events from a previous file attempt are ignored after switching files',()=>{
  const {deps,events}=setup();const failed=[];
  deps.tryVideoSrc('https://example.test/old.mp4',(...args)=>failed.push(args));
  const canplay=deps.vidPlayer.oncanplay;
  deps.vidCurrentId='file2';deps.videoAttempt++;
  canplay();
  assert.equal(failed.length,0);
  assert(!events.includes('play'));
});

test('media failure invokes fallback once for the active attempt',()=>{
  const {deps}=setup();const failed=[];
  deps.tryVideoSrc('https://example.test/video.mp4',(...args)=>failed.push(args));
  deps.vidPlayer.error={code:3};deps.vidPlayer.networkState=3;deps.vidPlayer.readyState=0;
  deps.vidPlayer.onerror();
  assert.equal(failed.length,1);
  assert.equal(failed[0][0],'media');
  assert.match(failed[0][1],/M3\/N3\/R0/);
});

test('timeout from a stale attempt cannot trigger fallback after switching files',()=>{
  const {deps,timers}=setup();const failed=[];
  deps.tryVideoSrc('https://example.test/old.mp4',(...args)=>failed.push(args),12000);
  const timeout=[...timers.values()].find(t=>t.ms===12000);
  assert(timeout);
  deps.vidCurrentId='file2';deps.videoAttempt++;
  timeout.callback();
  assert.equal(failed.length,0);
});
