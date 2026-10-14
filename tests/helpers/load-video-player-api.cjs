// Load the real extracted video-player module with an explicit test bridge.
//
// Each test gets a fresh module instance so its bridge state is isolated. The
// temporary global window is only needed while the classic-script IIFE starts;
// callable dependencies should be placed on the bridge object.
const path = require('node:path');

const MODULE_PATH = require.resolve(path.join(__dirname, '..', '..', 'video-player.js'));

function loadVideoPlayerApi(bridge = {}) {
  const previousWindow = global.window;
  const testWindow = bridge.window || {};
  testWindow.GDVVideoApi = bridge;
  bridge.window = testWindow;
  try {
    global.window = testWindow;
    delete require.cache[MODULE_PATH];
    return require(MODULE_PATH);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

module.exports = { loadVideoPlayerApi };
