const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const re=new RegExp('\\n([ \\t]+)(?:async\\s+)?function\\s+'+name+'\\s*\\(');const m=re.exec(html);assert(m,'missing function: '+name);const indent=m[1],start=m.index+1,endRe=new RegExp('\\r?\\n'+indent+'\\}','g');endRe.lastIndex=start;const end=endRe.exec(html);assert(end,'missing end of function: '+name);return html.slice(start,end.index+end[0].length);}
function setup(){
  const els={};let timers=new Map(),seq=0;const timerMs=new Map();const navCalls=[];const uiEls=[];
  const el=id=>{ const node={id,style:{},textContent:'',hidden:false,clientWidth:800,clientHeight:600,className:'lb-ui',setAttribute(n,v){node.attrs=node.attrs||{};node.attrs[n]=v},src:'',dataset:{}}; node.classList={_log:[],add(c){node.classList._log.push('+ '+c)},remove(c){node.classList._log.push('- '+c)},toggle(c,f){node.classList._log.push((f?'+ ':'- ')+c);return !!f},contains(c){return (' '+node.className+' ').indexOf(' '+c+' ')!==-1}}; return els[id]||(els[id]=node); };
  const ctx={document:{getElementById:id=>el(id),querySelectorAll:sel=>{ if(sel==='.lightbox .lb-ui'){ if(!uiEls.length){uiEls.push(el('btnA'),el('btnB'));} } return uiEls; },activeElement:null},lbImg:el('lbImg'),pdfCanvas:el('pdfCanvas'),pdfInLightbox:false,console,Date:{now:()=>nowValue},setTimeout(cb,ms){timers.set(++seq,cb);timerMs.set(seq,ms);return seq},clearTimeout(id){timers.delete(id)},navigateMedia(kind,dir){navCalls.push([kind,dir])},imageView:{scale:1,x:0,y:0},imageControlsVisible:true,imgTapTimer:null,imgLastTapTime:0,imgLastTapX:0,imgLastTapY:0};
  let nowValue=1000;
  vm.createContext(ctx);
  for(const name of ['clampImageScale','clampImagePan','applyImageView','resetImageView','imageGestureMode','swipeNavigateFor','setImageControlsVisible','cancelImageTap','handleImageTap'])
    if(html.includes('function '+name+'(')) vm.runInContext(fn(name),ctx);
  return {ctx,els,timers,timerMs,navCalls,uiEls,now:v=>{nowValue=v},getNow:()=>nowValue};
}
let failures=0;function test(name,run){try{run();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}

test('scale ถูกจำกัดระหว่าง 1 ถึง 4',()=>{
  const {ctx}=setup();
  assert.equal(ctx.clampImageScale(1.5),1.5);
  assert.equal(ctx.clampImageScale(0.5),1,'ต่ำกว่า 1 → 1');
  assert.equal(ctx.clampImageScale(9),4,'สูงกว่า 4 → 4');
  assert.equal(ctx.clampImageScale(NaN),1,'NaN → 1');
});
test('การลากถูกจำกัดไม่ให้หลุดกรอบภาพ',()=>{
  const {ctx}=setup();
  let r=ctx.clampImagePan({scale:1,x:50,y:-50},800,600);
  assert.deepEqual([r.scale,r.x,r.y],[1,0,0],'scale 1 ลากไม่ได้เลย');
  r=ctx.clampImagePan({scale:2,x:999,y:-999},800,600);
  assert.deepEqual([r.x,r.y],[400,-300],'จำกัดที่ w*(s-1)/2 และ h*(s-1)/2');
  r=ctx.clampImagePan({scale:2,x:100,y:-100},800,600);
  assert.deepEqual([r.scale,r.x,r.y],[2,100,-100],'ค่าในกรอบไม่ถูกแตะ');
});
test('resetImageView คืนค่า 1/0/0 และล้าง transform',()=>{
  const {ctx,els}=setup();
  const r=ctx.resetImageView();
  assert.equal(r.scale,1);assert.equal(r.x,0);assert.equal(r.y,0);
  assert.match(els.lbImg.style.transform,/translate\(0px,0px\) scale\(1\)/);
  ctx.pdfInLightbox=true;
  ctx.resetImageView();
  assert.match(els.pdfCanvas.style.transform,/translate\(0px,0px\) scale\(1\)/);
});
test('pinch = สองนิ้ว, pan = ซูมอยู่, swipe = scale 1',()=>{
  const {ctx}=setup();
  assert.equal(ctx.imageGestureMode(2,1),'pinch');
  assert.equal(ctx.imageGestureMode(3,2.5),'pinch');
  assert.equal(ctx.imageGestureMode(1,1),'swipe');
  assert.equal(ctx.imageGestureMode(1,2.5),'pan');
});
test('ปัดแนวนอนเปลี่ยนภาพ ปัดชัน/สั้นไม่เปลี่ยน',()=>{
  const {ctx}=setup();
  assert.equal(ctx.swipeNavigateFor(-60,10),1,'ปัดซ้าย → ภาพถัดไป');
  assert.equal(ctx.swipeNavigateFor(60,10),-1,'ปัดขวา → ภาพก่อนหน้า');
  assert.equal(ctx.swipeNavigateFor(30,0),0,'สั้นกว่าเกณฑ์');
  assert.equal(ctx.swipeNavigateFor(60,100),0,'แนวตั้งมากกว่า');
});
test('reset เมื่อเปิด/ปิดภาพและ rotate (เรียก resetImageView ในจุดนั้น)',()=>{
  assert(html.includes('function openLightbox'),'openLightbox exists');
  assert(/openLightbox\(id[^)]*\)\s*\{[\s\S]*?resetImageView\(\)/.test(html),'openLightbox resets image view');
  assert(/function closeLightbox\(\)\s*\{[\s\S]*?resetImageView\(\)/.test(html),'closeLightbox resets image view');
  assert(/orientationchange|resize[\s\S]{0,120}resetImageView\(\)/.test(html),'rotation/resize resets image view');
});
test('touch-action จำกัดเฉพาะตัวดูภาพ ไม่ใช่ทั้งเว็บ',()=>{
  assert(/\.lightbox\s*\{[^}]*touch-action:\s*none/.test(html),'touch-action:none บน .lightbox');
  assert(!/body\s*\{[^}]*touch-action:\s*none/.test(html),'ไม่ล็อก touch-action ทั้ง body');
});
test('ปุ่มคืนขนาดมีให้ทั้งสัมผัสและคีย์บอร์ด',()=>{
  assert(html.includes('id="lbReset"'),'ปุ่ม lbReset มีในหน้า');
  assert(/key === "r" [\s\S]{0,80}resetImageView\(\)|key === "0"[\s\S]{0,80}resetImageView\(\)/.test(html),'คีย์บอร์ด r/0 คืนขนาด');
});
// ===== ช่วง 4: แตะซ่อน/แสดงปุ่มควบคุม =====
test('แตะเดี่ยวหน่วง 280ms แล้วสลับปุ่ม',()=>{
  const {ctx,timers,timerMs,uiEls}=setup();
  const r=ctx.handleImageTap(100,200,false);
  assert.equal(r,'single');
  assert.equal(timers.size,1,'ตั้งจับเวลาค้างไว้');
  assert.equal([...timerMs.values()][0],280,'หน่วง 280ms');
  [...timers.values()].forEach(cb=>cb());
  assert.ok(uiEls[0].classList._log.some(l=>l==='+ lb-ui-hidden'),'แตะแรกซ่อนปุ่ม');
  assert.ok(uiEls.every(el=>el.attrs&&el.attrs['aria-hidden']==='true'),'aria-hidden ตามสถานะ');
});
test('double tap ซูม ไม่สลับปุ่ม',()=>{
  const {ctx,timers,els,now}=setup();
  assert.equal(ctx.handleImageTap(100,200,false),'single');
  now(1150);
  assert.equal(ctx.handleImageTap(105,205,false),'zoom');
  assert.equal(timers.size,0,'timer ของ single tap ถูกยกเลิก — ปุ่มไม่สลับ');
  assert.match(els.lbImg.style.transform,/scale\(2\)/,'double tap ซูม 2 เท่า');
});
test('gesture ที่มีการเคลื่อนนิ้วไม่นับเป็นแตะ',()=>{
  const {ctx,timers}=setup();
  assert.equal(ctx.handleImageTap(100,200,true),'none');
  assert.equal(timers.size,0);
});
test('controls ที่โฟกัสคีย์บอร์ดอยู่จะไม่ถูกซ่อน',()=>{
  const {ctx,uiEls}=setup();
  ctx.setImageControlsVisible(true); // populate รายการปุ่มก่อน
  ctx.document.activeElement=uiEls[0];
  uiEls[0].classList._log.length=0;
  assert.equal(ctx.setImageControlsVisible(false),false,'ปฏิเสธการซ่อนเมื่อโฟกัสในปุ่ม');
  assert(!uiEls[0].attrs||uiEls[0].attrs['aria-hidden']!=='true');
  ctx.document.activeElement=null;
  assert.equal(ctx.setImageControlsVisible(false),true);
  assert.equal(uiEls[0].attrs['aria-hidden'],'true');
  assert.equal(ctx.setImageControlsVisible(true),true);
  assert.equal(uiEls[0].attrs['aria-hidden'],'false');
});
test('เปิด/ปิดภาพแสดงปุ่มและล้าง tap timer เดิม',()=>{
  assert(/function openLightbox[\s\S]{0,900}setImageControlsVisible\(true\)/.test(html),'openLightbox แสดงปุ่ม');
  assert(/function openLightbox[\s\S]{0,900}cancelImageTap\(\)/.test(html),'openLightbox ยกเลิก tap timer');
  assert(/function closeLightbox\(\)\s*\{[\s\S]{0,400}cancelImageTap\(\)/.test(html),'closeLightbox ยกเลิก tap timer');
});
test('CSS: ซ่อนแบบไม่รับ Tab + reduced-motion',()=>{
  const m=html.match(/\.lightbox\.img-controls-hidden[^{]*\{[^}]*\}/);
  assert(m,'มีกฎ .img-controls-hidden');
  assert(/visibility:\s*hidden/.test(m[0]),'ซ่อนด้วย visibility (หลุดจาก Tab order)');
  const flat=html.replace(/\s+/g,' ');
  assert(/@media \(prefers-reduced-motion: reduce\) \{ \.lb-ui \{ transition: none/.test(flat),'เคารพ prefers-reduced-motion');
});
test('PDF: ปุ่มข้างจอ (#lbPrev/#lbNext) ไม่ถูกซ่อนในโหมด PDF และกดข้ามไปหน้า/รูปถัดไปได้',()=>{
  assert(!/\.lightbox\[data-viewer="pdf"\][^{]*#lbPrev[^{]*\{[^}]*display:\s*none/.test(html),'ไม่ซ่อน #lbPrev ในโหมด PDF');
  assert(!/\.lightbox\[data-viewer="pdf"\][^{]*#lbNext[^{]*\{[^}]*display:\s*none/.test(html),'ไม่ซ่อน #lbNext ในโหมด PDF');
  assert(html.includes('function stepPdfPage('),'มีฟังก์ชัน stepPdfPage สำหรับเปลี่ยนหน้า/ข้ามรูป');
});
const pending=[];
function asyncTest(name,run){
  pending.push(Promise.resolve().then(run).then(()=>console.log('PASS',name)).catch(e=>{failures++;console.error('FAIL',name,e.message)}));
}
asyncTest('PDF: กดข้ามหน้ารัวๆ (rapid skip) รอ cancel render เดิมก่อนวาดใหม่ ไม่พังและไม่เด้งไป fallbackPdfToDrive',async()=>{
  const {ctx,els}=setup();
  let fallbacks=0,canvasInUse=false;
  const renderedPages=[];
  ctx.window={devicePixelRatio:1,getComputedStyle:()=>({paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'})};
  ctx.lightbox=els.lightbox=ctx.document.getElementById('lightbox');
  ctx.lightbox.classList.contains=c=>c==='show';
  ctx.vidTitle=ctx.document.getElementById('vidTitle');
  ctx.pdfStage=ctx.document.getElementById('pdfStage');
  ctx.pdfStage.hidden=false;ctx.pdfStage.clientWidth=800;ctx.pdfStage.clientHeight=600;
  ctx.pdfControls=ctx.document.getElementById('pdfControls');
  ctx.pdfPageCount=ctx.document.getElementById('pdfPageCount');
  ctx.lbPrev=ctx.document.getElementById('lbPrev');
  ctx.lbNext=ctx.document.getElementById('lbNext');
  ctx.pdfCanvas.getContext=()=>({fillStyle:'',fillRect(){}});
  ctx.pdfInLightbox=true;
  ctx.pdfPageNumber=1;
  ctx.pdfFitMode='page';
  ctx.pdfScale=1;
  ctx.pdfRenderVersion=0;
  ctx.pdfRenderTask=null;
  ctx.fallbackPdfToDrive=()=>{fallbacks++;};
  ctx.filesWrap={querySelectorAll:()=>[]};
  ctx.pdfDocument={
    numPages:5,
    async getPage(num){
      await Promise.resolve();
      return {
        getViewport:({scale})=>({width:600*scale,height:800*scale}),
        render(){
          if(canvasInUse) throw new Error('Cannot use the same canvas during multiple render() operations.');
          canvasInUse=true;
          let rejectRender,resolveRender;
          const promise=new Promise((res,rej)=>{resolveRender=res;rejectRender=rej;});
          return {
            promise,
            cancel(){
              Promise.resolve().then(()=>{
                canvasInUse=false;
                const err=new Error('Rendering cancelled');
                err.name='RenderingCancelledException';
                rejectRender(err);
              });
            },
            _finish(){
              canvasInUse=false;
              renderedPages.push(num);
              resolveRender();
            }
          };
        }
      };
    }
  };
  for(const name of ['mediaList','updatePdfNavState','stepPdfPage','renderPdfPage'])
    if(html.includes('function '+name+'(')) vm.runInContext(fn(name),ctx);
  assert.equal(typeof ctx.stepPdfPage,'function','ต้องมี stepPdfPage');
  // เริ่มเรนเดอร์หน้า 1 แล้วกดข้ามรัวๆ ไปหน้า 2 -> 3 -> 4 ก่อนที่หน้า 1 จะวาดเสร็จ
  const p1=ctx.renderPdfPage();
  await new Promise(r=>setImmediate(r));
  assert.ok(ctx.pdfRenderTask,'หน้า 1 กำลังเรนเดอร์อยู่');
  ctx.stepPdfPage(1,true); // -> หน้า 2
  ctx.stepPdfPage(1,true); // -> หน้า 3
  ctx.stepPdfPage(1,true); // -> หน้า 4
  assert.equal(ctx.pdfPageNumber,4,'เลขหน้าขยับไปหน้า 4 ทันที');
  assert.equal(ctx.pdfPageCount.textContent,'4 / 5','ตัวนับหน้าอัปเดตเป็น 4 / 5 ทันทีโดยไม่ต้องรอเรนเดอร์จบ');
  await new Promise(r=>setImmediate(r));
  if(ctx.pdfRenderTask && ctx.pdfRenderTask._finish) ctx.pdfRenderTask._finish();
  await p1;
  await new Promise(r=>setImmediate(r));
  assert.equal(fallbacks,0,'ห้ามเด้งไป fallbackPdfToDrive เมื่อกดข้ามหน้ารัวๆ');
  assert.deepEqual(renderedPages,[4],'เรนเดอร์จบที่หน้า 4 โดยไม่ชน canvas lock');
});
test('PDF: เมื่ออยู่หน้าสุดท้ายของ PDF หรือกดข้ามไฟล์ สามารถเลื่อนไปดูรูปถัดไปในโฟลเดอร์ได้',()=>{
  const {ctx,els}=setup();
  const opened=[];
  ctx.filesWrap={querySelectorAll:()=>[
    {offsetParent:{},dataset:{id:'pdf1',kind:'file',type:'pdf',name:'book.pdf'}},
    {offsetParent:{},dataset:{id:'img1',kind:'image',type:'image',name:'photo1.jpg'}},
    {offsetParent:{},dataset:{id:'img2',kind:'image',type:'image',name:'photo2.jpg'}}
  ]};
  ctx.currentMediaIndex=-1;
  ctx.currentMediaKind='pdf';
  ctx.lbImg.dataset.fid='pdf1';
  ctx.pdfInLightbox=true;
  ctx.pdfDocument={numPages:2};
  ctx.pdfPageNumber=2;
  ctx.pdfStage=ctx.document.getElementById('pdfStage');
  ctx.pdfPageCount=ctx.document.getElementById('pdfPageCount');
  ctx.lbPrev=ctx.document.getElementById('lbPrev');
  ctx.lbNext=ctx.document.getElementById('lbNext');
  ctx.openLightbox=id=>{opened.push(['image',id]);ctx.lbImg.dataset.fid=id;ctx.pdfInLightbox=false;};
  ctx.openPdfDocument=(id,name)=>{opened.push(['pdf',id,name]);ctx.lbImg.dataset.fid=id;ctx.pdfInLightbox=true;};
  ctx.renderPdfPage=()=>{};
  for(const name of ['mediaList','navigateMedia','updatePdfNavState','stepPdfPage'])
    if(html.includes('function '+name+'(')) vm.runInContext(fn(name),ctx);
  // อยู่หน้า 2/2 ของ pdf1 แล้วกดถัดไป -> ต้องข้ามไปเปิดรูปถัดไป (img1)
  assert.equal(ctx.stepPdfPage(1,true),true);
  assert.deepEqual(opened,[['image','img1']]);
  // กดย้อนกลับจาก img1 -> กลับไปเปิด pdf1
  ctx.navigateMedia('image',-1);
  assert.deepEqual(opened,[['image','img1'],['pdf','pdf1','book.pdf']]);
});
Promise.all(pending).then(()=>{
  console.log('image-viewer phase 3+4:',failures? 'FAILED':'PASS');
  process.exitCode=failures?1:0;
});

