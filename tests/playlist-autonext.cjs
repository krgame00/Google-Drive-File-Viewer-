const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const playerJs=fs.readFileSync(path.join(__dirname,'..','video-player.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=playerJs.indexOf('function nextVideoInList(');
assert(start>=0,'nextVideoInList helper exists');
const end=playerJs.indexOf('\n  }',start);
const ctx={};vm.createContext(ctx);vm.runInContext(playerJs.slice(start,end+4),ctx);
const next=ctx.nextVideoInList;
const list=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}];
assert.equal(next(list,'a').id,'b','returns the following item in display order');
assert.equal(next(list,'c').id,'a','wraps around to the first item at the end');
assert.equal(next(list,'b').name,'C','middle items advance in order');
assert.equal(next([{id:'only',name:'O'}],'only'),null,'single-item list has no next');
assert.equal(next(list,'missing'),null,'unknown current id returns null');
assert.equal(next([],'a'),null,'empty list returns null');
assert.equal(next(list,null),null,'missing current id returns null');

// Wiring: the modal offers the next episode when a video ends, cancellable
assert(html.includes('id="vidNextUp"'),'nextup strip exists in the video modal');
assert(html.includes('id="vidNextUpName"')&&html.includes('id="vidNextUpCount"'),'nextup name and countdown elements exist');
assert(html.includes('id="vidNextUpPlay"')&&html.includes('id="vidNextUpCancel"'),'nextup play/cancel buttons exist');
assert(playerJs.indexOf("vidPlayer.addEventListener('ended'")>=0,'player listens for ended to offer the next episode');
assert(playerJs.indexOf("vidPlayer.addEventListener('play'")>=0,'user interaction (play) cancels the countdown');
assert(playerJs.indexOf('videoBlobTransfer')>=0,'progressive preview path keeps ownership of ended');
assert(playerJs.indexOf("getElementById('vidNextUpPlay')")>=0,'play-now button wired');
assert(playerJs.indexOf("getElementById('vidNextUpCancel')")>=0,'cancel button wired');
console.log('PASS playlist auto-next');
