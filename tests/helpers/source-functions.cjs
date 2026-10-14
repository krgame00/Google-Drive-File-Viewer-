// tests/helpers/source-functions.cjs
//
// A few legacy classic-script functions still depend on globals declared by
// the browser shell. Tests may isolate one such function in node:vm, but must
// pass the owning file's source explicitly. This helper never concatenates
// modules or loads index.html implicitly.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SOURCE_FILES = [
  'drive-explorer.js',
  'video-player.js',
  'collection-viewer.js',
  'collections-data.js',
  'media-lightbox.js',
  'app-core.js',
  'index.html',
  'styles.css',
];

function readSource(name) {
  if (!SOURCE_FILES.includes(name)) {
    throw new Error('Unknown app source file: ' + name);
  }
  const fullPath = path.join(ROOT, name);
  if (!fs.existsSync(fullPath)) {
    throw new Error('App source file not found: ' + name);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Extract a single function from the explicitly provided owning module.
 * This remains a compatibility seam for functions that are not standalone
 * CommonJS APIs yet; it intentionally has no implicit whole-app fallback.
 */
function sliceFunction(name, source) {
  if (typeof source !== 'string') {
    throw new TypeError('sliceFunction requires the source text of one owning file');
  }
  const start = source.indexOf('      function ' + name + '(');
  if (start < 0) {
    throw new Error('function ' + name + ' not found in the provided source file');
  }
  const end = source.indexOf('\n      }', start);
  if (end < 0) {
    throw new Error('function ' + name + ' has no closing brace in the provided source file');
  }
  return source.slice(start, end + 8);
}

function fileDeclaring(name) {
  for (const file of SOURCE_FILES) {
    const source = readSource(file);
    if (source.includes('      function ' + name + '(')) return file;
  }
  return null;
}

module.exports = {
  ROOT,
  SOURCE_FILES,
  readSource,
  sliceFunction,
  fileDeclaring,
};
