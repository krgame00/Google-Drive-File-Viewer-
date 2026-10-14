const assert = require('node:assert/strict');
const path = require('node:path');

const playerModulePath = require.resolve(path.join(__dirname, '..', 'video-player.js'));

function installPlayer(bridge) {
  const previousWindow = global.window;
  try {
    global.window = { GDVVideoApi: bridge };
    delete require.cache[playerModulePath];
    return require(playerModulePath);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

const data = new Map();
const bridge = {
  lsGet: key => data.get(key),
  lsSet: (key, value) => data.set(key, String(value)),
  lsRemove: key => data.delete(key),
  pruneVpos() {},
  vidPlayer: { currentTime: 42, duration: 100, ended: false, style: { display: 'block' } },
  vidCurrentId: 'test-id',
  vidTitle: { textContent: 'Test video' }
};
const player = installPlayer(bridge);

player.saveVideoPos();
assert.equal(player.loadContinueWatching()[0].position, 42);
assert.equal(data.get('gdv_vpos_test-id'), '42');

bridge.vidPlayer.currentTime = 50;
player.saveVideoPos();
assert.equal(player.loadContinueWatching().length, 1);
assert.equal(player.loadContinueWatching()[0].position, 50);

bridge.vidPlayer.style.display = 'none';
bridge.vidPlayer.currentTime = 80;
player.saveVideoPos();
assert.equal(player.loadContinueWatching()[0].position, 50);

bridge.vidPlayer.style.display = 'block';
bridge.vidPlayer.ended = true;
player.saveVideoPos();
assert.equal(player.loadContinueWatching().length, 0);
assert.equal(data.has('gdv_vpos_test-id'), false);

data.set('gdv_continue', 'bad json');
assert.equal(player.loadContinueWatching().length, 0);
console.log('PASS resume time, deduplication, iframe exclusion, completion and corrupt storage');
