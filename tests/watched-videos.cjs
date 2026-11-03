const assert = require('node:assert/strict');
const path = require('node:path');

const playerModulePath = require.resolve(path.join(__dirname, '..', 'video-player.js'));
const data = new Map();
let button;

const bridge = {
  lsGet: key => data.get(key),
  lsSet: (key, value) => data.set(key, String(value)),
  document: {
    createElement() {
      return {
        setAttribute(key, value) { this[key] = value; },
        addEventListener(event, handler) { if (event === 'click') this.click = handler; }
      };
    }
  },
  filesWrap: {
    querySelectorAll() {
      return [{
        dataset: { id: 'new-video', name: 'Video' },
        querySelector() {
          return { appendChild(element) { button = element; } };
        }
      }];
    }
  }
};

const previousWindow = global.window;
let player;
try {
  global.window = { GDVVideoApi: bridge };
  global.document = bridge.document;
  delete require.cache[playerModulePath];
  player = require(playerModulePath);
} finally {
  delete global.document;
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
}

assert.equal(player.loadWatchedVideos().length, 0);
assert.equal(player.toggleWatchedVideo('video-1'), true);
assert.equal(player.loadWatchedVideos()[0], 'video-1');
assert.equal(player.toggleWatchedVideo('video-1'), false);
assert.equal(player.loadWatchedVideos().length, 0);
data.set('gdv_watched', 'bad');
assert.equal(player.loadWatchedVideos().length, 0);
data.set('gdv_watched', JSON.stringify(['ok', null, 3, '<bad>', 'ok']));
assert.equal(player.loadWatchedVideos().length, 1);
console.log('PASS watched persistence, reversible toggle and invalid storage');

global.document = bridge.document;
player.attachWatchedButtons();
assert.equal(button['aria-pressed'], 'false');
let stopped = false;
button.click({ stopPropagation() { stopped = true; } });
assert.equal(stopped, true);
assert.equal(button['aria-pressed'], 'true');
delete global.document;
assert(player.loadWatchedVideos().includes('new-video'));
console.log('PASS watched button updates accessibly without opening player');
