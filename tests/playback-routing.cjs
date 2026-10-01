const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0);return html.slice(start,html.indexOf('\n      }',start)+8)}
function setup(){const sources=[],failures=[],previews=[];const ctx={apiKey:'public-test-key',vidPlayer:{style:{},removeAttribute(){}},revokeCurrentVideo(){},authParams:()=>({mode:'key'}),tryVideoSrc:(url,fail)=>sources.push({url,fail}),showStreamFailure:m=>failures.push(m),fallbackIframe:id=>previews.push(id)};vm.createContext(ctx);vm.runInContext(fn('tryPublicStream'),ctx);return {ctx,sources,failures,previews}}
test('failed public sources show an error instead of automatically switching players',()=>{
 const {ctx,sources,failures,previews}=setup();ctx.tryPublicStream('file1');
 for(let i=0;i<3;i++)sources[i].fail();assert.equal(failures.length,1);assert.equal(previews.length,0);
});
test('account backup only contacts Google and invokes its caller after exhaustion',()=>{
 const {ctx,sources,previews}=setup();let failed=0;ctx.tryPublicStream('file1',()=>failed++,true);
 assert.match(sources[0].url,/^https:\/\/drive\.usercontent\.google\.com\//);
 sources[0].fail();assert.match(sources[1].url,/^https:\/\/www\.googleapis\.com\//);
 sources[1].fail();assert.equal(failed,1);assert.equal(previews.length,0);
 assert(sources.every(x=>!x.url.includes('workers.dev')));
});
