// The "ดูแบบอื่น ⋯" menu (details#vidHelp) must dismiss when one of its
// action buttons is picked. A menu that stays open after selecting
// "โหลดทั้งไฟล์แทน" floats its panel over the download cancel button, so a
// real click on the cancel button lands on a menu item instead
// (audit 2026-11-08: elementsFromPoint hit BUTTON#vidExternalPlayer first).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

function loadCenter() {
  const docListeners = {};
  const vidHelp = { open: true, contains(t) { return !!t.__inMenu; } };
  const doc = {
    getElementById(id) { return id === 'vidHelp' ? vidHelp : { addEventListener() {}, style: {} }; },
    addEventListener(evt, fn) { (docListeners[evt] = docListeners[evt] || []).push(fn); },
    body: { style: {} },
  };
  loadVideoPlayerApi({ document: doc });
  return { docListeners, vidHelp };
}

function dispatchClick(docListeners, target) {
  for (const fn of docListeners.click || []) fn({ target });
}

test('selecting an action inside the menu dismisses it', () => {
  const { docListeners, vidHelp } = loadCenter();
  vidHelp.open = true;
  const buttonInMenu = { __inMenu: true, closest(sel) { return sel === 'button' ? { tagName: 'BUTTON' } : null; } };
  dispatchClick(docListeners, buttonInMenu);
  assert.equal(vidHelp.open, false, 'menu must close after an action button is clicked');
});

test('the summary toggle keeps its native open/close behavior', () => {
  const { docListeners, vidHelp } = loadCenter();
  vidHelp.open = true;
  const summary = { __inMenu: true, closest(sel) { return sel === 'summary' ? { tagName: 'SUMMARY' } : null; } };
  dispatchClick(docListeners, summary);
  assert.equal(vidHelp.open, true, 'summary clicks toggle natively and must not be force-closed');
});

test('a click outside the menu still closes it', () => {
  const { docListeners, vidHelp } = loadCenter();
  vidHelp.open = true;
  dispatchClick(docListeners, { __inMenu: false, closest() { return null; } });
  assert.equal(vidHelp.open, false, 'outside-click dismiss is the existing contract');
});
