// Load the extracted Drive Explorer module API with an explicit browser-state bridge.
// A fresh require instance prevents state from leaking between tests.
const path = require('node:path');

const MODULE_PATH = require.resolve(path.join(__dirname, '..', '..', 'drive-explorer.js'));

function loadDriveExplorerApi(bridge = {}) {
  const previousWindow = global.window;
  const testWindow = bridge.window || {};
  testWindow.GDVExplorerApi = bridge;
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

module.exports = { loadDriveExplorerApi };
