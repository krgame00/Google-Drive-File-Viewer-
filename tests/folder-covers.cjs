const path = require('node:path');
const assert = require('node:assert/strict');

const explorerModulePath = require.resolve(path.join(__dirname, '..', 'drive-explorer.js'));

function installExplorer(bridge) {
  const previousWindow = global.window;
  try {
    global.window = { GDVExplorerApi: bridge };
    delete require.cache[explorerModulePath];
    const api = require(explorerModulePath);
    for (const [name, fn] of Object.entries(api)) {
      if (!(name in bridge)) bridge[name] = fn;
    }
    return api;
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

async function basicCoverChecks() {
  let calls = 0;
  let pages = [
    { files: [], nextPageToken: 'next' },
    { files: [{ mimeType: 'video/mp4', thumbnailLink: 'https://example.test/thumb' }] }
  ];
  const bridge = {
    readPersonalData: () => ({ covers: [], hideCovers: false }),
    accessToken: null,
    apiKey: 'test',
    AbortSignal,
    fetch: async () => {
      calls++;
      return { ok: true, json: async () => pages.shift() };
    }
  };
  const explorer = installExplorer(bridge);
  assert.equal(typeof explorer.findFolderCover, 'function');
  assert.equal(typeof explorer.drainFolderCovers, 'function');

  const cover = await explorer.findFolderCover('folder');
  assert.equal(cover.url, 'https://example.test/thumb');
  assert.equal(cover.video, true);
  assert.equal(calls, 2);
  console.log('PASS paginated video cover');

  pages = [{ files: [] }];
  assert.equal(await explorer.findFolderCover('empty'), null);
  console.log('PASS empty folder fallback');

  bridge.fetch = async () => ({ ok: false });
  await assert.rejects(() => explorer.findFolderCover('denied'));
  console.log('PASS inaccessible folder rejected');

  bridge.apiKey = '';
  assert.equal(await explorer.findFolderCover('no-auth'), null);
  console.log('PASS no authorization fallback');
}

async function queueChecks() {
  let requests = 0;
  let resolveResponse;
  const responsePromise = new Promise(resolve => { resolveResponse = resolve; });
  const targets = Array.from({ length: 5 }, () => ({
    isConnected: true,
    dataset: { folderCover: 'same' },
    children: [],
    appendChild(element) { this.children.push(element); }
  }));
  const images = [];
  const bridge = {
    readPersonalData: () => ({ covers: [], hideCovers: false }),
    folderCoverActive: 0,
    folderCoverQueue: [...targets],
    folderCoverCache: new Map(),
    accessToken: null,
    apiKey: 'test',
    AbortSignal,
    Date,
    fetch() { requests++; return responsePromise; },
    document: {
      createElement() {
        const image = {};
        images.push(image);
        return image;
      }
    }
  };
  const explorer = installExplorer(bridge);
  explorer.drainFolderCovers();
  assert.equal(bridge.folderCoverActive, 3);
  assert.equal(requests, 1);

  targets[0].isConnected = false;
  resolveResponse({
    ok: true,
    json: async () => ({ files: [{ thumbnailLink: 'https://example.test/cover', mimeType: 'video/mp4' }] })
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bridge.folderCoverActive, 0);
  assert.equal(requests, 1);
  assert.equal(images.length, 4);
  targets[1].isConnected = false;
  images[0].onload();
  assert.equal(targets[1].children.length, 0);
  images[1].onload();
  assert.equal(targets[2].children.length, 2);
  assert.equal(targets[2].children[1].textContent, '▶');
  console.log('PASS bounded queue, shared cache, detached cards and video badge');
}

async function customCoverChecks() {
  let requested = '';
  const custom = {
    readPersonalData: () => ({ covers: [{ id: 'folder', fileId: 'chosen-image' }] }),
    accessToken: null,
    apiKey: 'test',
    AbortSignal,
    fetch: async url => {
      requested = url;
      return { ok: true, json: async () => ({ thumbnailLink: 'https://example.test/chosen' }) };
    }
  };
  const customExplorer = installExplorer(custom);
  assert.equal((await customExplorer.findFolderCover('folder')).url, 'https://example.test/chosen');
  assert(requested.includes('/files/chosen-image?'));

  const hidden = {
    folderCoverActive: 0,
    folderCoverQueue: [{ isConnected: true, dataset: { folderCover: 'folder' } }],
    readPersonalData: () => ({ hideCovers: true })
  };
  const hiddenExplorer = installExplorer(hidden);
  hiddenExplorer.drainFolderCovers();
  assert.equal(hidden.folderCoverActive, 0);
  assert.equal(hidden.folderCoverQueue.length, 0);
  console.log('PASS custom image cover and hidden covers skip loading');
}

(async () => {
  await basicCoverChecks();
  await queueChecks();
  await customCoverChecks();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
