const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const result = spawnSync(process.execPath, ['tools/collection_data.js', 'check'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});

assert.equal(result.status, 0, result.stderr || result.stdout || 'collection data check should succeed');
assert.match(result.stdout, /สองฝั่งตรงกัน/);
console.log('PASS collection data sync tool reads the extracted data module');
