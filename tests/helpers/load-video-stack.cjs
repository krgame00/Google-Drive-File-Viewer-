// Helper to load the video player module stack in correct browser order.
// Supports multi-file modular video player as files are extracted across phases.
// When an optional extracted file does not exist yet (e.g. before its phase),
// it is safely skipped until created.

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

// Standard order matching index.html script tags:
// Helper modules load before the core video-player.js coordinator.
const DEFAULT_VIDEO_MODULES = [
  'video-runners.js',
  'video-codec.js',
  'video-seek-preview.js',
  'video-trace.js',
  'video-library.js',
  'video-preview-layout.js',
  'video-player.js'
];

function loadVideoStackApi(bridge = {}, moduleNames = DEFAULT_VIDEO_MODULES) {
  const previousWindow = global.window;
  const testWindow = bridge.window || {};

  testWindow.GDVVideoApi = new Proxy(bridge, {
    get(target, key) {
      if (key in target) return target[key];
      return globalThis[key];
    }
  });
  testWindow.GDVVideoHost = bridge;
  bridge.window = testWindow;

  try {
    global.window = testWindow;
    let mainExport = null;

    for (const file of moduleNames) {
      const fullPath = path.join(ROOT_DIR, file);
      if (!fs.existsSync(fullPath)) continue;

      const resolved = require.resolve(fullPath);
      delete require.cache[resolved];
      const mod = require(resolved);
      if (file === 'video-player.js') {
        mainExport = mod;
      }
    }

    return mainExport || testWindow.GDVVideo || bridge.video;
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

module.exports = {
  loadVideoStackApi,
  DEFAULT_VIDEO_MODULES
};
