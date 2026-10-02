const {test}=require('node:test'),assert=require('node:assert/strict');
const worker=import('../cloudflare-drive-worker.mjs');
const request=()=>new Request('https://worker.test/?id=file1',{headers:{Range:'bytes=0-'}});
const form=(action='https://drive.usercontent.google.com/download',id='file1')=>'<form action="'+action+'"><input type="hidden" name="id" value="'+id+'"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="confirmation-id"></form>';
test('follows all Google confirmation fields and preserves partial video headers',async()=>{
 const {createDriveWorker}=await worker;const calls=[];
 const app=createDriveWorker(async(url,opts)=>{calls.push({url,opts});return calls.length===1?new Response(form(),{headers:{'Content-Type':'text/html'}}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100','Cross-Origin-Resource-Policy':'same-site','Set-Cookie':'private'}})});
 const res=await app.fetch(request());assert.equal(res.status,206);assert.equal(await res.text(),'data');
 assert.equal(new URL(calls[1].url).searchParams.get('uuid'),'confirmation-id');assert.equal(calls[1].opts.headers.get('Range'),'bytes=0-8388607');
 assert.equal(res.headers.get('Cross-Origin-Resource-Policy'),'cross-origin');assert.equal(res.headers.get('Content-Range'),'bytes 0-3/100');assert.equal(res.headers.get('Set-Cookie'),null);assert.equal(res.headers.get('Accept-Ranges'),null);
});
test('open-ended start and seek requests are bounded while explicit and suffix ranges are unchanged',async()=>{
 const {createDriveWorker}=await worker;
 for(const [input,expected] of [['bytes=0-','bytes=0-8388607'],['bytes=12345678-','bytes=12345678-20734285'],['bytes=0-63','bytes=0-63'],['bytes=-4096','bytes=-4096']]){
  const start=input==='bytes=12345678-'?12345678:0,contentRange='bytes '+start+'-'+(start+3)+'/99999999';
  let actual;const app=createDriveWorker(async(url,opts)=>{actual=opts.headers.get('Range');return new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':contentRange,'Content-Length':'4'}})});
  const res=await app.fetch(new Request('https://worker.test/?id=file1',{headers:{Range:input}}));assert.equal(actual,expected);assert.equal(res.headers.get('Content-Range'),contentRange);assert.equal(await res.text(),'data');
 }
});
test('chunking never changes quota errors into video or advertises a fake full response',async()=>{
 const {createDriveWorker}=await worker;let actual;
 const res=await createDriveWorker(async(url,opts)=>{actual=opts.headers.get('Range');return new Response('downloadQuotaExceeded',{status:403,headers:{'Content-Type':'text/plain'}})}).fetch(request());
 assert.equal(actual,'bytes=0-1048575');assert.equal(res.status,403);assert.equal(res.headers.get('Content-Range'),null);assert.match(res.headers.get('Content-Type'),/json/);
});
test('quota on open ranges tries 8, 2 and 1 MiB at the same offset and stops after success',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{ranges.push(opts.headers.get('Range'));return ranges.length<3?new Response('downloadQuotaExceeded',{status:403}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 100-103/99999999'}})});
 const res=await app.fetch(new Request('https://worker.test/?id=file1',{headers:{Range:'bytes=100-'}}));assert.equal(res.status,206);assert.deepEqual(ranges,['bytes=100-8388707','bytes=100-2097251','bytes=100-1048675']);
});
test('persistent quota stops at three requests and explicit intervals never trigger size retries',async()=>{
 const {createDriveWorker}=await worker;
 for(const [range,count] of [['bytes=0-',3],['bytes=0-63',1],['bytes=-64',1]]){let calls=0;
  const res=await createDriveWorker(async()=>{calls++;return new Response('downloadQuotaExceeded',{status:403})}).fetch(new Request('https://worker.test/?id=file1',{headers:{Range:range}}));assert.equal(res.status,403);assert.equal(calls,count);
 }
});
test('cancellation prevents a smaller-range retry after a quota response',async()=>{
 const {createDriveWorker}=await worker;const controller=new AbortController();let calls=0;
 const res=await createDriveWorker(async()=>{calls++;controller.abort();return new Response('downloadQuotaExceeded',{status:403})}).fetch(new Request('https://worker.test/?id=file1',{headers:{Range:'bytes=0-'},signal:controller.signal}));
 assert.equal(calls,1);assert.equal(res.status,403);
});
test('ignored and mismatched bounded ranges are cancelled rather than played as a full download',async()=>{
 const {createDriveWorker}=await worker;
 for(const [status,contentRange] of [[200,null],[206,'bytes 5-8/100'],[206,'bytes 0-9999999/10000000'],[206,'bytes 3-0/100']]){
  let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true}});
  const headers={'Content-Type':'video/mp4'};if(contentRange)headers['Content-Range']=contentRange;
  const res=await createDriveWorker(async()=>new Response(body,{status,headers})).fetch(request());
  assert.equal(res.status,502);assert.equal((await res.json()).error,'upstreamIgnoredRange');assert(cancelled);
 }
});
test('range conversion keeps large offsets exact and leaves downloads without Range alone',async()=>{
 const {boundedMediaRange}=await worker;assert.equal(boundedMediaRange('bytes=9007199254740993-'),'bytes=9007199254740993-9007199263129600');
 assert.equal(boundedMediaRange(null),null);assert.equal(boundedMediaRange('bytes=0-1,4-5'),'bytes=0-1,4-5');
});

test('public streaming preserves a valid partial interval with unknown total',async()=>{
 const {createDriveWorker}=await worker;
 const res=await createDriveWorker(async()=>new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/*'}})).fetch(request());
 assert.equal(res.status,206);assert.equal(res.headers.get('Content-Range'),'bytes 0-3/*');assert.equal(await res.text(),'data');
});
test('HTML quota and unknown HTML never become MP4 responses',async()=>{
 const {createDriveWorker}=await worker;
 for(const [html,status] of [['Too many users have downloaded this file',403],['<html>Sign in</html>',502]]){
  const res=await createDriveWorker(async()=>new Response(html,{headers:{'Content-Type':'text/html'}})).fetch(request());assert.equal(res.status,status);assert.match(res.headers.get('Content-Type'),/json/);
 }
});
test('confirmation cannot change the file or send fetches to arbitrary hosts',async()=>{
 const {createDriveWorker}=await worker;
 for(const warning of [form('https://attacker.test/download'),form(undefined,'other-file')]){let calls=0;const res=await createDriveWorker(async()=>{calls++;return new Response(warning,{headers:{'Content-Type':'text/html'}})}).fetch(request());assert.equal(res.status,502);assert.equal(calls,1)}
});
test('HEAD cancels the body and preserves upstream media type',async()=>{
 const {createDriveWorker}=await worker;let cancelled=false;
 const res=await createDriveWorker(async()=>new Response(new ReadableStream({cancel(){cancelled=true}}),{headers:{'Content-Type':'video/quicktime'}})).fetch(new Request('https://worker.test/?id=file1',{method:'HEAD'}));
 assert(cancelled);assert.equal(await res.text(),'');assert.equal(res.headers.get('Content-Type'),'video/quicktime');
});
