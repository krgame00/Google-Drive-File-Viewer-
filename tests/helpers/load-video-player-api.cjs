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
  // Bridge-first with globalThis fall-through: mirrors the old with(appApi)
  // semantics, where a name the bridge did not provide resolved as a global.
  testWindow.GDVVideoApi = new Proxy(bridge, {
    get(target, key) { if (key in target) return target[key]; return globalThis[key]; }
  });
  testWindow.GDVVideoHost = bridge;
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
