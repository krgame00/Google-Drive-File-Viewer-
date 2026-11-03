const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const playerJs=fs.readFileSync(path.join(__dirname,'..','video-player.js'),'utf8');
const appCoreJs=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

// Poster: the player shows the cached thumbnail while connecting, then drops it
assert(playerJs.includes('app.vidPlayer.poster = openThumb'),'openVideo sets the poster from the cached thumbnail');
assert(/app\.vidPlayer\.removeAttribute\('poster'\);\r?\n        app\.vidPlayer\.load\(\)/.test(playerJs),'resetMediaPlayback clears the poster');
assert(/(?<![\w$.])vidPlayer\.removeAttribute\('poster'\);\r?\n          (?<![\w$.])vidPlayer\.style\.display = 'block'/.test(playerJs),'progressive slice swaps do not flash the poster');
assert(playerJs.indexOf("removeAttribute('poster')")>=0,'poster cleanup exists');

// Prefetch: the next episode head is fetched through the service worker
assert(playerJs.includes("type: 'drive-stream-prefetch'"),'prefetch message is sent to the service worker');
assert(playerJs.includes('navigator.connection.saveData'),'prefetch respects the Data Saver setting');
assert(playerJs.includes('videoCacheLimit() <= 0'),'prefetch is off when the cache budget is 0');
assert(playerJs.includes('videoCacheScope()'),'prefetch is account-scoped');
assert(playerJs.includes('prefetchedHeads.has(target.id)'),'prefetch is deduplicated per session');
assert(playerJs.includes('showNextUp(next)') && /showNextUp\(next\)\s*\{[\s\S]*?prefetchHeadFor\(next\)/.test(playerJs),'showing Next-Up prefetches that episode');
assert(/addEventListener\('play', function \(\) \{[\s\S]*?prefetchNextUp\(\)/.test(playerJs),'starting playback prefetches the next episode');
assert(playerJs.includes('nextVideoInList(list, app.vidCurrentId)'),'prefetch target follows the playlist order');
assert(/\r?\n    prefetchHeadFor,\r?\n/.test(playerJs)&&/\r?\n    prefetchNextUp,\r?\n/.test(playerJs)&&/\r?\n    cachedVideoThumb,\r?\n/.test(playerJs),'prefetch helpers are exported on the video API');

// Token reply carries the head-cache metadata; the clear button covers both caches
assert(appCoreJs.includes('heads: !!(allowed && videoCacheLimit() > 0 && videoCacheScope())'),'token reply gates the head cache on the budget setting');
assert(appCoreJs.includes("scope: allowed ? videoCacheScope() : null"),'token reply carries the cache scope');
assert(appCoreJs.includes('modifiedTime: streamMeta && streamMeta.modifiedTime'),'token reply carries modifiedTime for staleness checks');
assert(appCoreJs.includes('window.GDVStreamProtocol.headStatsRequest') && appCoreJs.includes('headStoreCall'),'head-cache stats go over the SW protocol messages');
assert(appCoreJs.includes('Promise.all([videoCache.clear(), headCacheClear()])'),'the clear button clears heads via the protocol owner');
assert(!appCoreJs.includes('headCacheAdmin'),'the page holds no direct handle on the SW head cache (BUG 1 class)');
assert(appCoreJs.includes('heads.supported && heads.count'),'cache stats include the head cache only when the SW answers');

// Preconnect: the bearer streaming origin is warmed before the first fetch
assert(html.includes('<link rel="preconnect" href="https://www.googleapis.com" crossorigin />'),'googleapis preconnect exists');
console.log('PASS video head prefetch + poster wiring');
