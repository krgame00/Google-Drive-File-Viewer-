// Boot-order guard for app-core: every shorthand name in the window.GDV*Api
// object literals must resolve to something app-core defines (or a browser
// global). A dangling shorthand throws a ReferenceError while the literal is
// constructed, which kills the whole app-core IIFE and leaves every API
// published after it undefined (the 2026-11-04 pruneVpos production outage).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');
const BAGS=['window.GDVVideoApi = {','window.GDVExplorerApi = {','window.GDVCollectionApi = {'];
const GLOBALS=new Set(['document','location','fetch','setTimeout','clearTimeout','navigator','window','Date','Image','URL','Blob','Promise','Math','Number','String','Object','Array','JSON','Boolean','Symbol','Error','TypeError','AbortController','encodeURIComponent','decodeURIComponent','parseInt','parseFloat','isNaN','undefined','console','requestAnimationFrame','cancelAnimationFrame','localStorage','sessionStorage']);

function bagShorthands(text,bagAnchor){
  const start=text.indexOf(bagAnchor);
  assert(start>=0,'bag exists: '+bagAnchor);
  const ob=text.indexOf('{',start);
  let depth=0,close=-1;
  for(let i=ob;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'){depth--;if(depth===0){close=i;break;}}}
  assert(close>0,'literal balanced: '+bagAnchor);
  const inner=text.slice(ob+1,close);
  return [...inner.matchAll(/^\s+([A-Za-z_$][\w$]*),\s*$/gm)].map(m=>m[1]);
}

test('no bag shorthand dangles outside app-core scope or browser globals',()=>{
  for(const bag of BAGS){
    const names=bagShorthands(src,bag);
    assert(names.length>0,'shorthands found in '+bag);
    for(const name of names){
      if(GLOBALS.has(name)) continue;
      const defined=new RegExp('(function\\s+'+name+'\\s*\\(|(?:const|let|var)\\s+'+name+'\\b)').test(src);
      assert(defined,bag+' shorthand "'+name+'" is not defined in app-core (dangling bag reference)');
    }
  }
});

test('every GDV*Api the page consumes is published by app-core',()=>{
  // The 2026-11-04 outage: app-core died mid-IIFE, so later publications
  // (GDVExplorerApi/GDVLightboxApi/GDVCollectionApi) never ran while earlier
  // ones did. Publication order must place every consumer-required global.
  for(const global of ['GDVVideoApi','GDVExplorerApi','GDVLightboxApi','GDVCollectionApi']){
    assert(src.includes('window.'+global+' ='),'app-core publishes window.'+global);
  }
  // consumers must not reference a global app-core no longer publishes
  for(const [file,needed] of [['media-lightbox.js',['GDVLightboxApi']],['collection-viewer.js',['GDVCollectionApi']],['drive-explorer.js',['GDVExplorerApi']]]){
    const consumer=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    for(const g of needed){
      if(consumer.includes('window.'+g)) assert(src.includes('window.'+g+' ='),file+' requires window.'+g+' which app-core must publish');
    }
  }
});
