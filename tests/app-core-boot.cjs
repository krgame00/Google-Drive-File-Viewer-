// Boot smoke: execute app-core's real IIFE against DOM stubs and require every
// window.GDV*Api to be published. The 2026-11-04 pruneVpos outage shipped green
// because no test ran the IIFE — this closes that blind spot for good.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');

function makeEl(id){
  const el={id,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},getAttribute(){return null},removeAttribute(){},addEventListener(){},removeEventListener(){},appendChild(){},append(){},prepend(){},after(){},before(){},replaceWith(){},remove(){},insertAdjacentHTML(){},insertAdjacentElement(){},contains(){return false},hasChildNodes(){return false},cloneNode(){return makeEl(this.id)},querySelector(sel){return makeEl(String(sel))},querySelectorAll(){return []},dataset:{},hidden:false,textContent:'',innerHTML:'',value:'',focus(){},blur(){},closest(){return null},open:false,getBoundingClientRect(){return {width:0,height:0,top:0,left:0}}};
  return el;
}

function buildCtx(){
  const els={};
  const timers=new Set();
  const ctx={
    console,URL,URLSearchParams,Blob,AbortController,Promise,Date,Math,JSON,Number,String,Boolean,Object,Array,Error,TypeError,
    isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
    setTimeout(cb){const t=setTimeout(cb,0);return t;},clearTimeout(t){clearTimeout(t);},setInterval(cb){timers.add(cb);return 0;},clearInterval(){},
    localStorage:{getItem(){return null},setItem(){},removeItem(){},clear(){},key(){return null},get length(){return 0}},
    sessionStorage:{getItem(){return null},setItem(){},removeItem(){},clear(){},key(){return null},get length(){return 0}},
    navigator:{serviceWorker:{addEventListener(){},getRegistrations:async()=>[],get controller(){return null}},onLine:true,clipboard:{writeText:async()=>{}}},
    location:{href:'https://example.test/index.html',origin:'https://example.test',pathname:'/index.html',search:'',hash:'',protocol:'https:',host:'example.test',hostname:'example.test',assign(){},replace(){}},
    history:{pushState(){},replaceState(){},back(){}},
    document:{
      title:'',body:{style:{},classList:{add(){},remove(){},contains(){return false}},appendChild(){},setAttribute(){},removeAttribute(){}},documentElement:{style:{},setAttribute(){},getAttribute(){return null},classList:{add(){},remove(){},toggle(){},contains(){return false}}},
      getElementById(id){return els[id]||(els[id]=makeEl(id));},
      querySelector(){return null},querySelectorAll(){return []},
      createElement(tag){return makeEl(tag);},
      addEventListener(){},removeEventListener(){},
      exitFullscreen(){return Promise.resolve()},fullscreenElement:null,
      createEvent(){return {initEvent(){}}}
    },
    window:null,
    addEventListener(){},removeEventListener(){},
    matchMedia(){return {matches:false,addEventListener(){},removeEventListener(){}}},
    fetch(){return Promise.resolve({ok:false,status:0,headers:{get(){return null}},json:async()=>({})})},
    requestAnimationFrame(cb){cb(Date.now());return 0;},cancelAnimationFrame(){},
    getSelection(){return {removeAllRanges(){},addRange(){}}},
    CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
    google:{accounts:{oauth2:{initTokenClient(){return {requestAccessToken(){}}}},id:{initialize(){},renderButton(){}}}},
    gapi:{},
    setTimeout,clearTimeout,setInterval,clearInterval,
    alert(){},confirm(){return false},prompt(){return null},
    open(){return null},
    self:globalThis
  };
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  return {ctx,els,timers};
}

test('app-core IIFE boots against DOM stubs and publishes every API',()=>{
  const {ctx}=buildCtx();
  vm.runInContext(src,ctx,{filename:'app-core.js'});
  for(const g of ['GDVVideoApi','GDVExplorerApi','GDVLightboxApi','GDVCollectionApi']){
    assert.equal(typeof ctx.window[g],'object','window.'+g+' published after the IIFE');
  }
  // app-core boots FIRST: the feature slots stay unfilled until their modules load
  assert.equal(ctx.window.GDVVideoApi.video,undefined,'video slot waits for video-player');
  assert.equal(ctx.window.GDVExplorerApi.explorer,null,'explorer slot declared null until drive-explorer publishes');
  assert.equal(ctx.window.GDVLightboxApi.media,null,'media slot declared null until media-lightbox publishes');
  for(const fn of ['lsGet','lsSet','lsRemove','fileMetaOf','formatSize','authParams','classifyApiError','showToast','videoCacheScope','refreshVideoCacheUI','pruneVpos','ensureToken']){
    assert.equal(typeof ctx.window.GDVVideoApi[fn],'function','bag helper '+fn+' is callable');
  }
});
