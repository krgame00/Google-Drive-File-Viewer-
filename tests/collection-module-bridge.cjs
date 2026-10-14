const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Bridge belongs to app-core.js; viewer code is read from its own module file.
const html=fs.readFileSync(path.join(__dirname,'..','app-core.js'),'utf8');
const viewer = fs.readFileSync(path.join(__dirname,'..','collection-viewer.js'), 'utf8');
const exportAt = html.indexOf('window.GDVCollectionApi = {');
assert(exportAt >= 0, 'main app exposes the collection viewer bridge');

const exportBlock = html.slice(exportAt, html.indexOf('};', exportAt) + 2);
for (const name of ['driveLink', 'navStack', 'extractId', 'handleFileClick', 'pushHash', 'openFolderAndReveal', 'ensureToken', 'authParams', 'lsGet', 'lsSet', 'showToast', 'accessToken', 'apiKey', 'genericIconSvg', 'observeFolderCovers']) {
  assert(exportBlock.includes(name), `bridge exposes ${name}`);
}

assert.match(viewer, /const appApi\s*=\s*window\.GDVCollectionApi/);
console.log('PASS collection viewer uses explicit main-app bridge');
