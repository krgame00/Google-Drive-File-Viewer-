const {test}=require('node:test'),assert=require('node:assert/strict');
const worker=import('../cloudflare-drive-worker.mjs');
// Each test uses its own file id: the worker remembers per-file parallel state
// in module scope, so a shared id would leak it across tests.
const request=id=>new Request('https://worker.test/?id='+id,{headers:{Range:'bytes=0-'}});
const form=(action='https://drive.usercontent.google.com/download',id='w1')=>'<form action="'+action+'"><input type="hidden" name="id" value="'+id+'"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="confirmation-id"></form>';
test('follows all Google confirmation fields and preserves partial video headers',async()=>{
 const {createDriveWorker}=await worker;const calls=[];
 const app=createDriveWorker(async(url,opts)=>{calls.push({url,opts});return calls.length===1?new Response(form('https://drive.usercontent.google.com/download','w1'),{headers:{'Content-Type':'text/html'}}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100','Cross-Origin-Resource-Policy':'same-site','Set-Cookie':'private'}})});
 const res=await app.fetch(request('w1'));assert.equal(res.status,206);assert.equal(await res.text(),'data');
 assert.equal(new URL(calls[1].url).searchParams.get('uuid'),'confirmation-id');assert.equal(calls[1].opts.headers.get('Range'),'bytes=0-8388607');
 assert.equal(res.headers.get('Cross-Origin-Resource-Policy'),'cross-origin');assert.equal(res.headers.get('Content-Range'),'bytes 0-3/100');assert.equal(res.headers.get('Set-Cookie'),null);assert.equal(res.headers.get('Accept-Ranges'),null);
});
test('open-ended start and seek requests are bounded while explicit and suffix ranges are unchanged',async()=>{
 const {createDriveWorker}=await worker;
 for(const [id,input,expected] of [['w2a','bytes=0-','bytes=0-8388607'],['w2b','bytes=12345678-','bytes=12345678-20734285'],['w2c','bytes=0-63','bytes=0-63'],['w2d','bytes=-4096','bytes=-4096']]){
  const start=input==='bytes=12345678-'?12345678:0,contentRange='bytes '+start+'-'+(start+3)+'/99999999';
  let actual;const app=createDriveWorker(async(url,opts)=>{if(actual===undefined)actual=opts.headers.get('Range');return new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':contentRange,'Content-Length':'4'}})});
  const res=await app.fetch(new Request('https://worker.test/?id='+id,{headers:{Range:input}}));assert.equal(actual,expected);assert.equal(res.headers.get('Content-Range'),contentRange);assert.equal(await res.text(),'data');
 }
});
test('chunking never changes quota errors into video or advertises a fake full response',async()=>{
 const {createDriveWorker}=await worker;let actual;
 const res=await createDriveWorker(async(url,opts)=>{actual=opts.headers.get('Range');return new Response('downloadQuotaExceeded',{status:403,headers:{'Content-Type':'text/plain'}})}).fetch(request('w3'));
 assert.equal(actual,'bytes=0-1048575');assert.equal(res.status,403);assert.equal(res.headers.get('Content-Range'),null);assert.match(res.headers.get('Content-Type'),/json/);
});
test('quota on open ranges tries 8, 2 and 1 MiB at the same offset and stops after success',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{ranges.push(opts.headers.get('Range'));return ranges.length<3?new Response('downloadQuotaExceeded',{status:403}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 100-103/99999999'}})});
 const res=await app.fetch(new Request('https://worker.test/?id=w4',{headers:{Range:'bytes=100-'}}));assert.equal(res.status,206);assert.deepEqual(ranges,['bytes=100-8388707','bytes=100-2097251','bytes=100-1048675','bytes=1048676-9437283']);
});
test('persistent quota stops at three requests and explicit intervals never trigger size retries',async()=>{
 const {createDriveWorker}=await worker;
 for(const [id,range,count] of [['w5a','bytes=0-',3],['w5b','bytes=0-63',1],['w5c','bytes=-64',1]]){let calls=0;
  const res=await createDriveWorker(async()=>{calls++;return new Response('downloadQuotaExceeded',{status:403})}).fetch(new Request('https://worker.test/?id='+id,{headers:{Range:range}}));assert.equal(res.status,403);assert.equal(calls,count);
 }
});
test('cancellation prevents a smaller-range retry after a quota response',async()=>{
 const {createDriveWorker}=await worker;const controller=new AbortController();let calls=0;
 const res=await createDriveWorker(async()=>{calls++;controller.abort();return new Response('downloadQuotaExceeded',{status:403})}).fetch(new Request('https://worker.test/?id=w6',{headers:{Range:'bytes=0-'},signal:controller.signal}));
 assert.equal(calls,1);assert.equal(res.status,403);
});
test('ignored and mismatched bounded ranges are cancelled rather than played as a full download',async()=>{
 const {createDriveWorker}=await worker;
 for(const [status,contentRange] of [[200,null],[206,'bytes 5-8/100'],[206,'bytes 0-9999999/10000000'],[206,'bytes 3-0/100']]){
  let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true}});
  const headers={'Content-Type':'video/mp4'};if(contentRange)headers['Content-Range']=contentRange;
  const res=await createDriveWorker(async()=>new Response(body,{status,headers})).fetch(request('w7'));
  assert.equal(res.status,502);assert.equal((await res.json()).error,'upstreamIgnoredRange');assert(cancelled);
 }
});
test('range conversion keeps large offsets exact and leaves downloads without Range alone',async()=>{
 const {boundedMediaRange}=await worker;assert.equal(boundedMediaRange('bytes=9007199254740993-'),'bytes=9007199254740993-9007199263129600');
 assert.equal(boundedMediaRange(null),null);assert.equal(boundedMediaRange('bytes=0-1,4-5'),'bytes=0-1,4-5');
});

test('public streaming preserves a valid partial interval with unknown total',async()=>{
 const {createDriveWorker}=await worker;
 const res=await createDriveWorker(async()=>new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/*'}})).fetch(request('w8'));
 assert.equal(res.status,206);assert.equal(res.headers.get('Content-Range'),'bytes 0-3/*');assert.equal(await res.text(),'data');
});
test('HTML quota and unknown HTML never become MP4 responses',async()=>{
 const {createDriveWorker}=await worker;
 for(const [html,status] of [['Too many users have downloaded this file',403],['<html>Sign in</html>',502]]){
  const res=await createDriveWorker(async()=>new Response(html,{headers:{'Content-Type':'text/html'}})).fetch(request('w9'));assert.equal(res.status,status);assert.match(res.headers.get('Content-Type'),/json/);
 }
});
test('confirmation cannot change the file or send fetches to arbitrary hosts',async()=>{
 const {createDriveWorker}=await worker;
 for(const warning of [form('https://attacker.test/download'),form(undefined,'other-file')]){let calls=0;const res=await createDriveWorker(async()=>{calls++;return new Response(warning,{headers:{'Content-Type':'text/html'}})}).fetch(request('w10'));assert.equal(res.status,502);assert.equal(calls,1)}
});
test('HEAD cancels the body and preserves upstream media type',async()=>{
 const {createDriveWorker}=await worker;let cancelled=false;
 const res=await createDriveWorker(async()=>new Response(new ReadableStream({cancel(){cancelled=true}}),{headers:{'Content-Type':'video/quicktime'}})).fetch(new Request('https://worker.test/?id=w11',{method:'HEAD'}));
 assert(cancelled);assert.equal(await res.text(),'');assert.equal(res.headers.get('Content-Type'),'video/quicktime');
});
test('the read-ahead chunk is served without a second upstream fetch',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  return new Response(range,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999'}});
 });
 const first=await app.fetch(request('w12'));
 assert.equal(await first.text(),'bytes=0-8388607');
 assert.deepEqual(ranges,['bytes=0-8388607','bytes=8388608-16777215']);
 const second=await app.fetch(new Request('https://worker.test/?id=w12',{headers:{Range:'bytes=8388608-'}}));
 assert.equal(await second.text(),'bytes=8388608-16777215');
 assert.deepEqual(ranges,['bytes=0-8388607','bytes=8388608-16777215','bytes=16777216-25165823'],'the served chunk came from the prefetch, not a new fetch');
});
test('a seek away from the read-ahead aborts the stale prefetch',async()=>{
 const {createDriveWorker}=await worker;const signals=[];
 const app=createDriveWorker(async(url,opts)=>{
  signals.push(opts.signal);
  const m=/^bytes=(\d+)-(\d+)$/.exec(opts.headers.get('Range'));
  return new Response(opts.headers.get('Range'),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999999'}});
 });
 await app.fetch(request('w13'));
 assert.equal(signals.length,2);assert.equal(signals[1].aborted,false);
 await app.fetch(new Request('https://worker.test/?id=w13',{headers:{Range:'bytes=999999999-'}}));
 assert.equal(signals[1].aborted,true,'the stale read-ahead was aborted');
 assert.equal(signals.length,4,'the seek fetched its own range and started a new read-ahead');
});
test('a failed read-ahead falls back to a fresh upstream fetch',async()=>{
 const {createDriveWorker}=await worker;let n=0;
 const app=createDriveWorker(async(url,opts)=>{
  n++;
  if(n===2) return Promise.reject(new Error('prefetch dropped'));
  const m=/^bytes=(\d+)-(\d+)$/.exec(opts.headers.get('Range'));
  return new Response(opts.headers.get('Range'),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999'}});
 });
 const first=await app.fetch(request('w14'));
 assert.equal(await first.text(),'bytes=0-8388607');
 const second=await app.fetch(new Request('https://worker.test/?id=w14',{headers:{Range:'bytes=8388608-'}}));
 assert.equal(second.status,206);assert.equal(await second.text(),'bytes=8388608-16777215');
 assert.equal(n,4,'the dropped prefetch triggered one replacement fetch plus the next read-ahead');
});
test('chunks after a length-bearing answer stream four parallel sub-intervals in order',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  const body=new Uint8Array(Number(m[2])-Number(m[1])+1);
  body.fill(Number(m[1])/2097152+1);
  return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999','Content-Length':String(body.length)}});
 });
 const warmup=await app.fetch(request('w15'));
 assert.equal(await warmup.text().then(t=>t.length),8388608,'the warmup chunk is serial and marks the file parallel-capable');
 assert.deepEqual(ranges,['bytes=0-8388607','bytes=8388608-10485759','bytes=10485760-12582911','bytes=12582912-14680063','bytes=14680064-16777215'],'the warmup prefetches the next chunk in parallel');
 const res=await app.fetch(new Request('https://worker.test/?id=w15',{headers:{Range:'bytes=8388608-'}}));
 assert.equal(res.status,206);
 assert.deepEqual(ranges.slice(1,5),['bytes=8388608-10485759','bytes=10485760-12582911','bytes=12582912-14680063','bytes=14680064-16777215']);
 assert.equal(res.headers.get('Content-Range'),'bytes 8388608-16777215/999999999');
 const text=await res.text();
 assert.equal(text.length,8388608);
 assert.equal(text.charCodeAt(0),5);assert.equal(text.charCodeAt(2097152),6);
 assert.equal(text.charCodeAt(4194304),7);assert.equal(text.charCodeAt(6291456),8);
 assert.equal(ranges.length,9,'the read-ahead prefetches the next chunk as four parallel sub-intervals');
 assert.deepEqual(ranges.slice(5),['bytes=16777216-18874367','bytes=18874368-20971519','bytes=20971520-23068671','bytes=23068672-25165823']);
});
