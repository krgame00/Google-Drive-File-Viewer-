const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

test('GDVVideo target public surface has exactly the expected contracts and shapes', () => {
  const bridge = {
    vidPlayer: { style: {} },
    videoModal: { classList: { contains: () => false } }
  };
  const video = loadVideoPlayerApi(bridge);

  const expectedTopLevel = [
    'open',
    'close',
    'suspend',
    'retry',
    'reconnect',
    'escape',
    'openPreview',
    'openExternal',
    'copyToDrive',
    'requestBlob',
    'cancelBlob',
    'toggleFullscreen',
    'toggleAspect',
    'toggleMinimize',
    'toggleTurbo',
    'onNav',
    'enterPreview',
    'refreshLibrary',
    'syncFullscreen',
    'clearRetryRoutes'
  ];

  for (const name of expectedTopLevel) {
    assert.equal(typeof video[name], 'function', `target method ${name} must be a function`);
  }

  // Namespaced: watched
  assert.equal(typeof video.watched, 'object', 'watched namespace exists');
  assert.equal(typeof video.watched.list, 'function', 'watched.list is a function');
  assert.equal(typeof video.watched.toggle, 'function', 'watched.toggle is a function');
  assert.equal(typeof video.watched.attach, 'function', 'watched.attach is a function');

  // Namespaced: headCache
  assert.equal(typeof video.headCache, 'object', 'headCache namespace exists');
  assert.equal(typeof video.headCache.stats, 'function', 'headCache.stats is a function');
  assert.equal(typeof video.headCache.clear, 'function', 'headCache.clear is a function');
});
