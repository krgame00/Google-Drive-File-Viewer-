// tests/helpers/load-app-source.cjs
//
// The app is being split out of the single index.html into small modules that
// run directly in the browser (no build step). Many tests work by slicing a
// named function out of the source text and evaluating it in node:vm:
//
//     const html = fs.readFileSync('index.html', 'utf8');
//     const start = html.indexOf('      function ' + name + '(');
//     const end   = html.indexOf('\n      }', start);
//
// That keeps working no matter which file the function moved into, as long as
// every source file is joined into one string first. This helper is that join.
//
// Every module is exported separately too, so tests can prefer a specific file
// and can assert that a function really did move out of index.html.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

// index.html first: the HTML shell is the primary source, and keeping it first
// means assertions about markup still see the shell before anything else.
const SOURCE_FILES = [
  'index.html',
  'styles.css',
  'collections-data.js',
  'collection-viewer.js',
  'media-lightbox.js',
  'video-player.js',
  'drive-explorer.js',
];

function readPart(name) {
  const full = path.join(ROOT, name);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

/** Raw contents of every app source that exists on disk. */
function parts() {
  const out = {};
  for (const name of SOURCE_FILES) {
    const text = readPart(name);
    if (text) out[name] = text;
  }
  return out;
}

/** The same list a test may want to know about (including missing files). */
function knownFiles() {
  return SOURCE_FILES.slice();
}

/**
 * Every app source joined into one string, in SOURCE_FILES order.
 * This is the drop-in replacement for fs.readFileSync('index.html', 'utf8')
 * in slicing tests.
 */
function loadAppSource() {
  return Object.values(parts()).join('\n');
}

/** Joined JavaScript only — no HTML markup, no CSS. */
function loadAppJs() {
  return Object.entries(parts())
    .filter(([name]) => !name.endsWith('.html') && !name.endsWith('.css'))
    .map(([, text]) => text)
    .join('\n');
}

/** Joined HTML markup only. */
function loadHtml() {
  return Object.entries(parts())
    .filter(([name]) => name.endsWith('.html'))
    .map(([, text]) => text)
    .join('\n');
}

/** Joined CSS only. */
function loadCss() {
  return Object.entries(parts())
    .filter(([name]) => name.endsWith('.css'))
    .map(([, text]) => text)
    .join('\n');
}

/**
 * Slice one `function name(...) { ... }` declaration out of the app source.
 * Mirrors the existing convention: top-level app functions sit at exactly six
 * spaces of indent inside the index.html IIFE, and end at the matching
 * `\n      }`.
 */
function sliceFunction(name, source) {
  const text = source === undefined ? loadAppSource() : source;
  const start = text.indexOf('      function ' + name + '(');
  if (start < 0) {
    throw new Error("function " + name + " not found in app source");
  }
  const end = text.indexOf('\n      }', start);
  if (end < 0) {
    throw new Error("function " + name + " has no closing \\n      } in app source");
  }
  return text.slice(start, end + 8);
}

/** Which file declares `function name(`? Useful to prove a module split. */
function fileDeclaring(name) {
  for (const [file, text] of Object.entries(parts())) {
    if (text.includes('      function ' + name + '(')) return file;
  }
  return null;
}

module.exports = {
  ROOT,
  SOURCE_FILES,
  knownFiles,
  parts,
  loadAppSource,
  loadAppJs,
  loadHtml,
  loadCss,
  sliceFunction,
  fileDeclaring,
};