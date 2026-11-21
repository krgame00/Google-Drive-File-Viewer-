const {test}=require('node:test'),assert=require('node:assert/strict');
const worker=import('../cloudflare-drive-worker.mjs');
// Each test uses its own file id: the worker remembers per-file parallel state
// in module scope, so a shared id would leak it across tests.
const request=id=>new Request('https://worker.test/?id='+id,{headers:{Range:'bytes=0-'}});
const form=(action='https://drive.usercontent.google.com/download',id='w1')=>'<form action="'+action+'"><input type="hidden" name="id" value="'+id+'"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="confirmation-id"></form>';
test('follows all Google confirmation fields and preserves partial video headers',async()=>{
 const {createDriveWorker}=await worker;const calls=[];
 const app=createDriveWorker(async(url,opts)=>{calls.push({url,opts});return calls.length===1?new Response(form('https://drive.usercontent.google.com/download','w1'),{headers:{'Content-Type':'text/html'}}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100','Cross-Origin-Resource-Policy':'same-site','Set-Cookie':'private'}})});
 const res=await app.fetch(request('w1'));assert.equal(res.status,206);assert.equal(res.headers.get('Content-Length'),'4','derive exact length from Content-Range when upstream omits it');assert.equal(await res.text(),'data');
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
test('chunks after a length-bearing answer stream eight parallel sub-intervals in order',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  const body=new Uint8Array(Number(m[2])-Number(m[1])+1);
  body.fill(Number(m[1])/1048576+1);
  return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999','Content-Length':String(body.length)}});
 });
 const warmup=await app.fetch(request('w15'));
 assert.equal(await warmup.text().then(t=>t.length),8388608,'the warmup chunk is serial and marks the file parallel-capable');
 assert.deepEqual(ranges,['bytes=0-8388607','bytes=8388608-9437183','bytes=9437184-10485759','bytes=10485760-11534335','bytes=11534336-12582911','bytes=12582912-13631487','bytes=13631488-14680063','bytes=14680064-15728639','bytes=15728640-16777215'],'the warmup prefetches the next chunk in parallel');
 const res=await app.fetch(new Request('https://worker.test/?id=w15',{headers:{Range:'bytes=8388608-'}}));
 assert.equal(res.status,206);
 assert.deepEqual(ranges.slice(1,9),['bytes=8388608-9437183','bytes=9437184-10485759','bytes=10485760-11534335','bytes=11534336-12582911','bytes=12582912-13631487','bytes=13631488-14680063','bytes=14680064-15728639','bytes=15728640-16777215']);
 assert.equal(res.headers.get('Content-Range'),'bytes 8388608-16777215/999999999');
 const text=await res.text();
 assert.equal(text.length,8388608);
 assert.equal(text.charCodeAt(0),9);assert.equal(text.charCodeAt(1048576),10);
 assert.equal(text.charCodeAt(2097152),11);assert.equal(text.charCodeAt(3145728),12);
 assert.equal(ranges.length,17,'the read-ahead prefetches the next chunk as eight parallel sub-intervals');
 assert.deepEqual(ranges.slice(9),['bytes=16777216-17825791','bytes=17825792-18874367','bytes=18874368-19922943','bytes=19922944-20971519','bytes=20971520-22020095','bytes=22020096-23068671','bytes=23068672-24117247','bytes=24117248-25165823']);
});
test('a truncated intermediate sub-interval falls back to a single bounded fetch instead of stitching a byte gap',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  if(ranges.length===1){const body=new Uint8Array(Number(m[2])-Number(m[1])+1);return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999999','Content-Length':String(body.length)}});}
  if(ranges.length===6) return new Response('abcd',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+(Number(m[1])+3)+'/999999999999','Content-Length':'4'}});
  if(ranges.length>=7&&ranges.length<=9) return new Response('abcd',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999999','Content-Length':'4'}});
  return new Response(range,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/999999999999'}});
 });
 await app.fetch(request('w16'));
 const res=await app.fetch(new Request('https://worker.test/?id=w16',{headers:{Range:'bytes=999999999-'}}));
 assert.equal(res.status,206);
 assert.equal(await res.text(),'bytes=999999999-1008388606','truncated intermediate sub-interval must not be stitched into a corrupted stream');
});

test('open-ended media requests stream past the first 8 MiB in one continuous 206 response',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];const total=8388608+100;
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);assert(m,'upstream request should be bounded');
  const start=Number(m[1]),end=Math.min(Number(m[2]),total-1),body=new Uint8Array(end-start+1);
  body.fill(start===0?1:2);
  return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+start+'-'+end+'/'+total,'Content-Length':String(body.length),'Accept-Ranges':'bytes'}});
 });
 const res=await app.fetch(new Request('https://worker.test/?id=w17&continuous=1',{headers:{Range:'bytes=0-'}}));
 assert.equal(res.status,206);
 assert.equal(res.headers.get('Content-Range'),'bytes 0-'+(total-1)+'/'+total);
 assert.equal(res.headers.get('Content-Length'),String(total));
 assert.equal(res.headers.get('Accept-Ranges'),'bytes');
 const body=new Uint8Array(await res.arrayBuffer());
 assert.equal(body.length,total,'body must continue past the initial 8 MiB boundary');
 assert.equal(body[0],1);assert.equal(body[8388608],2);
 assert.equal(ranges.length,9,'initial chunk plus eight parallel continuation ranges');
});

test('worker responses expose revision header via CORS without credentials',async()=>{
 const {createDriveWorker,WORKER_REVISION}=await worker;
 assert.match(WORKER_REVISION,/^2026-11/);
 const optRes=await createDriveWorker().fetch(new Request('https://worker.test/?id=w17',{method:'OPTIONS'}));
 assert.equal(optRes.status,204);
 assert.equal(optRes.headers.get('X-GDV-Worker-Rev'),WORKER_REVISION);
 assert.match(optRes.headers.get('Access-Control-Expose-Headers'),/X-GDV-Worker-Rev/);
 const getRes=await createDriveWorker(async()=>new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100'}})).fetch(request('w17'));
 assert.equal(getRes.status,206);
 assert.equal(getRes.headers.get('X-GDV-Worker-Rev'),WORKER_REVISION);
});

test('telemetry endpoint accepts POST error summary, logs, and GET serves recent reports in JSON and HTML',async()=>{
 const {createDriveWorker}=await worker;
 const app=createDriveWorker();
 const opt=await app.fetch(new Request('https://worker.test/telemetry',{method:'OPTIONS'}));
 assert.equal(opt.status,204);
 assert.equal(opt.headers.get('Access-Control-Allow-Origin'),'*');

 const payload={
  fileId:'testFile123',
  title:'Clip A',
  error:'downloadQuotaExceeded',
  detail:'M4/N3/R0',
  routes:[{route:'worker',outcome:'fail'}],
  env:'Chrome 157 Windows'
 };
 const postRes=await app.fetch(new Request('https://worker.test/telemetry',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload)
 }));
 assert.equal(postRes.status,200);
 const postJson=await postRes.json();
 assert.equal(postJson.ok,true);
 assert.equal(typeof postJson.stored,'number');

 const getRes=await app.fetch(new Request('https://worker.test/telemetry'));
 assert.equal(getRes.status,200);
 const getJson=await getRes.json();
 assert.equal(getJson.ok,true);
 assert.ok(getJson.reports.length>0);
 const last=getJson.reports[0];
 assert.equal(last.fileId,'testFile123');
 assert.equal(last.error,'downloadQuotaExceeded');
 assert.equal(last.detail,'M4/N3/R0');

 const htmlRes=await app.fetch(new Request('https://worker.test/telemetry?format=html'));
 assert.equal(htmlRes.status,200);
 assert.match(htmlRes.headers.get('Content-Type'),/text\/html/);
 const html=await htmlRes.text();
 assert.ok(html.includes('testFile123'));
 assert.ok(html.includes('downloadQuotaExceeded'));
});
test('tail open-ended request reaching known EOF aborts stale prefetch immediately and avoids parallel split past EOF',async()=>{
 const {createDriveWorker}=await worker;const ranges=[],signals=[];
 const app=createDriveWorker(async(url,opts)=>{
  const range=opts.headers.get('Range');ranges.push(range);signals.push(opts.signal);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  const start=Number(m[1]),end=Math.min(Number(m[2]),19999999);
  const body=new Uint8Array(Math.max(1,end-start+1));
  return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+start+'-'+end+'/20000000','Content-Length':String(body.length)}});
 });
 await app.fetch(request('w18'));
 assert.equal(ranges.length,9,'warmup request plus 8 parallel prefetch sub-intervals');
 const tailRes=await app.fetch(new Request('https://worker.test/?id=w18',{headers:{Range:'bytes=19500000-'}}));
 assert.equal(tailRes.status,206);
 assert.ok(signals.slice(1,9).every(s=>s.aborted),'stale prefetch aborted before tail fetch');
 assert.equal(ranges.length,10,'tail request reaching known EOF uses a single bounded fetch instead of 8 parallel sub-intervals past EOF');
 assert.equal(ranges[9],'bytes=19500000-27888607');
});

test('parallelFiles LRU retains parallel capability when switching between multiple video files',async()=>{
 const {createDriveWorker}=await worker;const ranges=[];
 const app=createDriveWorker(async(url,opts)=>{
  const id=new URL(url).searchParams.get('id');
  const range=opts.headers.get('Range');ranges.push(id+':'+range);
  const m=/^bytes=(\d+)-(\d+)$/.exec(range);
  const start=Number(m[1]),end=Number(m[2]);
  const body=new Uint8Array(4);
  return new Response(body,{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+start+'-'+end+'/90000000','Content-Length':'4'}});
 });
 await app.fetch(new Request('https://worker.test/?id=fileA',{headers:{Range:'bytes=0-'}}));
 await app.fetch(new Request('https://worker.test/?id=fileB',{headers:{Range:'bytes=0-'}}));
 ranges.length=0;
 const seekA=await app.fetch(new Request('https://worker.test/?id=fileA',{headers:{Range:'bytes=16777216-'}}));
 assert.equal(seekA.status,206);
 assert.ok(ranges.filter(r=>r.startsWith('fileA:')).length>=8,'fileA still streams in 8 parallel sub-intervals after fileB was opened');
});
test('confirmUrlCache reuses confirmed uuid URL on subsequent range requests without re-fetching HTML warning',async()=>{
 const {createDriveWorker}=await worker;const urls=[];
 const app=createDriveWorker(async(url,opts)=>{
  urls.push(String(url));
  if(!String(url).includes('uuid=')){
   return new Response(form('https://drive.usercontent.google.com/download','wConfirmCache'),{headers:{'Content-Type':'text/html'}});
  }
  const m=/^bytes=(\d+)-(\d+)$/.exec(opts.headers.get('Range'));
  return new Response('abcd',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes '+m[1]+'-'+m[2]+'/50000000'}});
 });
 const r1=await app.fetch(new Request('https://worker.test/?id=wConfirmCache',{headers:{Range:'bytes=0-3'}}));
 assert.equal(r1.status,206);
 assert.equal(urls.length,2,'first chunk took 2 requests (HTML form + confirmed uuid URL)');
 urls.length=0;
 const r2=await app.fetch(new Request('https://worker.test/?id=wConfirmCache',{headers:{Range:'bytes=4-7'}}));
 assert.equal(r2.status,206);
 assert.equal(urls.length,1,'second chunk took only 1 request using cached uuid URL directly');
 assert.match(urls[0],/uuid=confirmation-id/);
});


// pstack-cors-allowlist-tests
test('CORS allowlist accepts GitHub Pages and localhost origins and echoes Vary: Origin', async () => {
  const {createDriveWorker} = await worker;
  const app = createDriveWorker(async () => new Response('ok', {
    status: 206,
    headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-1/10'},
  }));
  for (const origin of ['https://krgame00.github.io', 'http://localhost:8080', 'http://127.0.0.1:5173']) {
    const opt = await app.fetch(new Request('https://worker.test/?id=corsOk1', {method: 'OPTIONS', headers: {Origin: origin}}));
    assert.equal(opt.status, 204);
    assert.equal(opt.headers.get('Access-Control-Allow-Origin'), origin);
    assert.match(opt.headers.get('Vary') || '', /Origin/i);
  }
});

test('CORS allowlist blocks unauthorized browser origins with 403 and no ACAO header', async () => {
  const {createDriveWorker} = await worker;
  let fetched = 0;
  const app = createDriveWorker(async () => { fetched++; return new Response('nope', {status: 200}); });
  const res = await app.fetch(new Request('https://worker.test/?id=corsBad1', {
    headers: {Origin: 'https://evil.example', Range: 'bytes=0-'},
  }));
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await res.json()).error, 'forbiddenOrigin');
  assert.equal(fetched, 0, 'blocked origin must never trigger an upstream fetch');
});

test('CORS allowlist respects custom env.ALLOWED_ORIGINS override', async () => {
  const {createDriveWorker} = await worker;
  const app = createDriveWorker(async () => new Response('ok', {
    status: 206,
    headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-1/10'},
  }));
  const res = await app.fetch(
    new Request('https://worker.test/?id=corsEnv1', {method: 'OPTIONS', headers: {Origin: 'https://custom.example'}}),
    {ALLOWED_ORIGINS: 'https://custom.example, https://krgame00.github.io'}
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://custom.example');
});

test('Edge Cache serves repeated bounded 206 chunks with X-GDV-Cache: HIT and zero upstream fetches', async () => {
  const {createDriveWorker} = await worker;
  const store = new Map();
  const pending = [];
  const mockCache = {
    async match(req) {
      const entry = store.get(req.url);
      if (!entry) return undefined;
      return new Response(entry.body, {status: entry.status, headers: entry.headers});
    },
    async put(req, res) {
      const body = await res.arrayBuffer();
      store.set(req.url, {status: res.status, headers: new Headers(res.headers), body});
    },
  };
  let upstreamCalls = 0;
  const app = createDriveWorker(async (url, opts) => {
    upstreamCalls++;
    const range = opts.headers.get('Range');
    const m = /^bytes=(\d+)-(\d+)$/.exec(range);
    return new Response('chunk-' + range, {
      status: 206,
      headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes ' + m[1] + '-' + m[2] + '/99999999'},
    });
  }, {cache: mockCache});
  const ctx = {waitUntil(p) { pending.push(p); }};
  const r1 = await app.fetch(new Request('https://worker.test/?id=edgeCache1', {headers: {Range: 'bytes=0-'}}), {}, ctx);
  assert.equal(r1.status, 206);
  assert.equal(r1.headers.get('X-GDV-Cache'), 'MISS');
  assert.equal(await r1.text(), 'chunk-bytes=0-8388607');
  await Promise.all(pending);
  const callsAfterFirst = upstreamCalls;
  const r2 = await app.fetch(new Request('https://worker.test/?id=edgeCache1', {headers: {Range: 'bytes=0-'}}), {}, ctx);
  assert.equal(r2.status, 206);
  assert.equal(r2.headers.get('X-GDV-Cache'), 'HIT');
  assert.equal(await r2.text(), 'chunk-bytes=0-8388607');
  assert.equal(upstreamCalls, callsAfterFirst, 'Edge Cache HIT must not trigger another upstream fetch');
});

test('size query hint activates 8-way parallel streaming immediately on cold-start Chunk 0', async () => {
  const {createDriveWorker} = await worker;
  const ranges = [];
  const app = createDriveWorker(async (url, opts) => {
    const range = opts.headers.get('Range');
    ranges.push(range);
    const m = /^bytes=(\d+)-(\d+)$/.exec(range);
    const len = Number(BigInt(m[2]) - BigInt(m[1]) + 1n);
    return new Response('x'.repeat(Math.min(len, 16)), {
      status: 206,
      headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes ' + m[1] + '-' + m[2] + '/50000000', 'Content-Length': String(Math.min(len, 16))},
    });
  });
  const res = await app.fetch(new Request('https://worker.test/?id=coldParallel1&size=50000000', {headers: {Range: 'bytes=0-'}}));
  assert.equal(res.status, 206);
  await res.text();
  const chunk0Subranges = ranges.filter(r => /^bytes=(0|1048576|2097152|3145728|4194304|5242880|6291456|7340032)-/.test(r));
  assert.equal(chunk0Subranges.length, 8, 'cold-start Chunk 0 with size hint should split into 8 parallel sub-intervals');
});

test('OAuth /auth/exchange seals refresh_token with AES-GCM, /auth/refresh decrypts it, and /auth/revoke revokes it', async () => {
  const {createDriveWorker} = await worker;
  const calls = [];
  const app = createDriveWorker(async (url, opts) => {
    calls.push({url, body: opts && opts.body});
    if (String(url).includes('/token')) {
      const params = new URLSearchParams(opts.body);
      if (params.get('grant_type') === 'authorization_code') {
        return new Response(JSON.stringify({access_token: 'acc_initial', expires_in: 3600, refresh_token: 'rt_secret_123'}), {
          status: 200, headers: {'Content-Type': 'application/json'},
        });
      }
      if (params.get('grant_type') === 'refresh_token' && params.get('refresh_token') === 'rt_secret_123') {
        return new Response(JSON.stringify({access_token: 'acc_refreshed', expires_in: 3600}), {
          status: 200, headers: {'Content-Type': 'application/json'},
        });
      }
    }
    if (String(url).includes('/revoke')) return new Response('', {status: 200});
    return new Response('bad', {status: 400});
  });
  const env = {GOOGLE_CLIENT_ID: 'cid-1', GOOGLE_CLIENT_SECRET: 'sec-1'};

  // 1. Exchange code -> sealed sessionToken (never leaks raw refresh_token)
  const exRes = await app.fetch(new Request('https://worker.test/auth/exchange', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code: 'auth-code-1', redirectUri: 'postmessage'}),
  }), env);
  assert.equal(exRes.status, 200);
  const exData = await exRes.json();
  assert.equal(exData.access_token, 'acc_initial');
  assert.match(exData.sessionToken, /^gdv1\./);
  assert.equal(JSON.stringify(exData).includes('rt_secret_123'), false, 'raw refresh_token must never leak to client');

  // 2. Refresh using sealed sessionToken
  const refRes = await app.fetch(new Request('https://worker.test/auth/refresh', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionToken: exData.sessionToken}),
  }), env);
  assert.equal(refRes.status, 200);
  assert.equal((await refRes.json()).access_token, 'acc_refreshed');

  // 3. Tampered sessionToken rejected with 401 and zero upstream calls
  const countBeforeTamper = calls.length;
  const badRes = await app.fetch(new Request('https://worker.test/auth/refresh', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionToken: exData.sessionToken + 'tamper'}),
  }), env);
  assert.equal(badRes.status, 401);
  assert.equal(calls.length, countBeforeTamper);

  // 4. Revoke decrypts & revokes with Google
  const revRes = await app.fetch(new Request('https://worker.test/auth/revoke', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionToken: exData.sessionToken}),
  }), env);
  assert.equal(revRes.status, 200);
  assert.ok(calls.some(c => String(c.url).includes('/revoke?token=rt_secret_123')));

  // 5. Unconfigured Worker returns 503 authNotConfigured
  const unconfRes = await app.fetch(new Request('https://worker.test/auth/refresh', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionToken: exData.sessionToken}),
  }), {});
  assert.equal(unconfRes.status, 503);
  assert.equal((await unconfRes.json()).error, 'authNotConfigured');
});
