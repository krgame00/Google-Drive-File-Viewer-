const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function setup(fetchImpl){
 const timers=[];
 const api=loadVideoPlayerApi({
  location:{href:'https://example.test/app/'},
  fetch:fetchImpl,
  setTimeout:callback=>{timers.push(callback);return timers.length;},
  clearTimeout(){}
 });
 return {api,timers};
}
function box(type,body){const out=new Uint8Array(8+body.length);new DataView(out.buffer).setUint32(0,8+body.length);for(let i=0;i<4;i++)out[4+i]=type.charCodeAt(i);out.set(body,8);return out;}
function merge(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function tinyMp4(profile){
 const avcC=[1,profile,192,64,255,225,0,2,103,64,0];
 const avc1=box('avc1',merge([new Uint8Array(78),box('avcC',avcC)]));
 const stsd=box('stsd',merge([new Uint8Array([0,0,0,0,0,0,0,1]),avc1]));
 const stbl=box('stbl',stsd),minf=box('minf',stbl),mdia=box('mdia',minf),trak=box('trak',mdia),moov=box('moov',trak);
 const ftyp=box('ftyp',new TextEncoder().encode('isom'));
 return merge([ftyp,moov]);
}

test('probe reads the codec profile out of moov and cancels the rest',async()=>{
 let reads=0,cancelled=0,signal;
 const media=tinyMp4(110);
 const {api}=setup(async(url,opts)=>{signal=opts.signal;return {status:200,body:{getReader(){return {read:async()=>{reads++;return {value:media,done:false};},cancel:async()=>cancelled++,releaseLock(){}};}}};});
 const verdict=await api.probeStreamEndpoint('file','probe');
 assert.equal(verdict,'codec:H.264 โปรไฟล์ High 10 (Hi10P)');
 assert.equal(reads,1);assert.equal(cancelled,1);assert.equal(signal.aborted,true);
});

test('a decodable H.264 profile resolves as works from the same scan',async()=>{
 const media=tinyMp4(66);
 const {api}=setup(async()=>({status:200,body:{getReader(){return {read:async()=>({value:media,done:false}),cancel:async()=>{},releaseLock(){}};}}}));
 assert.equal(await api.probeStreamEndpoint('file','probe'),'works');
});

test('an mp4 whose moov stays outside the bounded prefix keeps the works verdict',async()=>{
 let reads=0;
 const {api}=setup(async()=>({status:200,body:{getReader(){return {read:async()=>{reads++;return {value:new Uint8Array([0,0,0,32,102,116,121,112,105,115,111,109]),done:reads>=2};},cancel:async()=>{},releaseLock(){}};}}}));
 assert.equal(await api.probeStreamEndpoint('file','probe'),'works');assert.equal(reads,2);
});

test('probe timeout aborts its request instead of continuing a large download',async()=>{
 let signal;const {api,timers}=setup((url,opts)=>{signal=opts.signal;return new Promise(()=>{});});
 const pending=api.probeStreamEndpoint('file','probe');timers[0]();
 assert.equal(await pending,'browser');assert.equal(signal.aborted,true);
});

test('a body read failure is unknown, never successful media',async()=>{
 const {api}=setup(async()=>({status:206,body:{getReader(){return {read:async()=>{throw Error('lost connection');},cancel:async()=>{},releaseLock(){}};}}}));
 assert.equal(await api.probeStreamEndpoint('file','probe'),'unknown');
});

test('an mp4 with moov at EOF probes the tail range and identifies its codec',async()=>{
 const ranges=[];
 const head=merge([box('ftyp',new TextEncoder().encode('isom')),box('mdat',new Uint8Array(64))]);
 const tail=tinyMp4(66).slice(12);
 const response=(bytes,contentRange)=>({status:206,headers:new Headers({'Content-Range':contentRange}),body:{getReader(){let sent=false;return {read:async()=>{if(sent)return {done:true};sent=true;return {value:bytes,done:false};},cancel:async()=>{},releaseLock(){}};}}});
 const {api}=setup(async(url,opts)=>{
  const range=opts.headers.Range;ranges.push(range);
  if(range==='bytes=0-1048575')return response(head,'bytes 0-1048575/5242880');
  return response(tail,'bytes 4194304-5242879/5242880');
 });
 assert.equal(await api.probeStreamEndpoint('file','probe'),'works');
 assert.deepEqual(ranges,['bytes=0-1048575','bytes=4194304-5242879']);
});

test('an mp4 whose moov is at the end of the file fetches the tail range and reads the codec profile',async()=>{
 const ranges=[];
 const ftyp=box('ftyp',new TextEncoder().encode('isom'));
 const mdatPrefix=new Uint8Array(64);
 const headChunk=merge([ftyp,mdatPrefix]);
 const tailMoov=merge([new Uint8Array(24),tinyMp4(110).slice(12)]);
 const {api}=setup(async(url,opts)=>{
  const range=opts.headers.Range;
  ranges.push(range);
  if(range==='bytes=0-1048575'){
   let sent=false;
   return {
    status:206,
    headers:new Headers({'Content-Range':'bytes 0-1048575/5242880'}),
    body:{getReader(){return {read:async()=>{if(sent)return {done:true};sent=true;return {value:headChunk,done:false};},cancel:async()=>{},releaseLock(){}};}}
   };
  }
  let tailSent=false;
  return {
   status:206,
   headers:new Headers({'Content-Range':'bytes 4194304-5242879/5242880'}),
   body:{getReader(){return {read:async()=>{if(tailSent)return {done:true};tailSent=true;return {value:tailMoov,done:false};},cancel:async()=>{},releaseLock(){}};}}
  };
 });
 const verdict=await api.probeStreamEndpoint('file-tail','probe');
 assert.equal(verdict,'codec:H.264 โปรไฟล์ High 10 (Hi10P)');
 assert.deepEqual(ranges,['bytes=0-1048575','bytes=4194304-5242879']);
});
