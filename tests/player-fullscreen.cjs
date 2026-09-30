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
