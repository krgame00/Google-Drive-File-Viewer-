const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n      }',start);return html.slice(start,end+8);}
function setup(mobile=true){
  const attrs=new Map([['allowfullscreen','']]);const calls=[];
  const box={requestFullscreen:async()=>{calls.push('enter')}};
  const ctx={window:{matchMedia:()=>({matches:mobile})},vidFrame:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)},
    videoModal:{classList:{contains:()=>true},querySelector:()=>box},document:{fullscreenElement:null,exitFullscreen:async()=>calls.push('exit')},showToast:message=>calls.push(message)};
  vm.createContext(ctx);for(const name of ['configurePreviewFullscreen','togglePlayerFullscreen'])vm.runInContext(fn(name),ctx);
  return {ctx,attrs,calls,box};
}
test('mobile preview blocks child fullscreen but desktop preserves it',()=>{
  for(const mobile of [true,false]){
    const {ctx,attrs}=setup(mobile);ctx.configurePreviewFullscreen();
    assert.equal(attrs.has('allowfullscreen'),!mobile);
    assert.equal(attrs.get('allow'),mobile?"autoplay; encrypted-media; fullscreen 'none'":'autoplay; encrypted-media; fullscreen');
  }
});
test('app fullscreen expands the wrapper and toggles out without replacing media',async()=>{
  const {ctx,calls,box}=setup();await ctx.togglePlayerFullscreen();assert.deepEqual(calls,['enter']);
  ctx.document.fullscreenElement=box;await ctx.togglePlayerFullscreen();assert.deepEqual(calls,['enter','exit']);
});
test('closed modal never requests fullscreen',async()=>{
  const {ctx,calls}=setup();ctx.videoModal.classList.contains=()=>false;await ctx.togglePlayerFullscreen();assert.deepEqual(calls,[]);
});
test('fullscreen rejection is handled and offers external playback',async()=>{
  const {ctx,calls,box}=setup();box.requestFullscreen=async()=>{throw new Error('denied')};
  await ctx.togglePlayerFullscreen();assert.equal(calls.length,1);assert.match(calls[0],/แท็บใหม่/);
});
test('preview viewport fits portrait, landscape and narrow screens without cropping',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(fn('calculatePreviewLayout'),ctx);
  for(const [width,height] of [[320,180],[390,730],[844,330],[960,540]]){
    const layout=ctx.calculatePreviewLayout(width,height);
    assert(layout.width>=800);
    assert(Math.abs(layout.width*layout.scale-width)<0.01);
    assert(Math.abs(layout.height*layout.scale-height)<0.01);
    assert(layout.scale>0 && layout.scale<=1);
  }
});
test('preview fitting applies only to video previews and ignores zero-sized layouts',()=>{
  const props=new Map();let preview=false,width=390,height=219;
  const ctx={vidFrame:{getAttribute:()=>preview?'true':null,parentElement:{getBoundingClientRect:()=>({width,height})},style:{setProperty:(k,v)=>props.set(k,v)}}};
  vm.createContext(ctx);for(const name of ['calculatePreviewLayout','fitVideoPreview'])vm.runInContext(fn(name),ctx);
  ctx.fitVideoPreview();assert.equal(props.size,0);
  preview=true;ctx.fitVideoPreview();assert.equal(props.get('--preview-width'),'800px');
  const oldScale=props.get('--preview-scale');width=844;height=330;ctx.fitVideoPreview();assert.equal(props.get('--preview-scale'),'1');
  assert.notEqual(oldScale,props.get('--preview-scale'));
  props.clear();width=0;ctx.fitVideoPreview();assert.equal(props.size,0);
});
