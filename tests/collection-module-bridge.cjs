const assert = require('node:assert/strict');
const fs = require('node:fs');
const {loadAppSource,sliceFunction}=require('./helpers/load-app-source.cjs');

const html=loadAppSource();
const viewer = fs.readFileSync('collection-viewer.js', 'utf8');
const exportAt = html.indexOf('window.GDVCollectionApi = {');
assert(exportAt >= 0, 'main app exposes the collection viewer bridge');

const exportBlock = html.slice(exportAt, html.indexOf('};', exportAt) + 2);
for (const name of ['driveLink', 'navStack', 'extractId', 'handleFileClick', 'pushHash', 'openFolderAndReveal', 'ensureToken', 'authParams', 'lsGet', 'lsSet', 'showToast', 'accessToken', 'apiKey', 'genericIconSvg', 'observeFolderCovers']) {
  assert(exportBlock.includes(name), `bridge exposes ${name}`);
}

assert.match(viewer, /const appApi\s*=\s*window\.GDVCollectionApi/);
console.log('PASS collection viewer uses explicit main-app bridge');
