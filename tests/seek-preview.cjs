const assert = require('node:assert/strict');
const path = require('node:path');

const playerModulePath = require.resolve(path.join(__dirname, '..', 'video-player.js'));

function installPlayer(bridge) {
  const previousWindow = global.window;
  try {
    global.window = { GDVVideoApi: bridge };
    delete require.cache[playerModulePath];
    return require(playerModulePath);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

function makeEl(id, extra) {
  const el = Object.assign({
    id: id || '', className: '', textContent: '', hidden: false,
    style: {}, listeners: {}, children: [],
    setAttribute(name, value) { this['attr_' + name] = value; },
    getAttribute(name) { return this['attr_' + name] !== undefined ? this['attr_' + name] : null; },
    removeAttribute(name) { delete this['attr_' + name]; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    dispatch(type, ev) { (this.listeners[type] || []).forEach(fn => fn(ev)); }
  }, extra || {});
  return el;
}

// classList stub พร้อมบันทึก remove — ใช้ตรวจว่า hover บนแถบเรียก showVideoChrome จริง
function classListStub(initial) {
  return {
    _s: new Set(initial || []),
    _removed: [],
    contains(c) { return this._s.has(c); },
    add(c) { this._s.add(c); },
    remove(c) { this._s.delete(c); this._removed.push(c); }
  };
}

function buildSeekBridge(opts) {
  opts = opts || {};
  let clock = opts.clock !== undefined ? opts.clock : 1000000;
  let playerDurationValue = opts.duration !== undefined ? opts.duration : 100;
  let playerTime = 0;
  const vidSeekTimes = [];
  const previewVideos = [];
  const windowTimers = [];

  const played = makeEl('', { className: 'vid-seek-played' });
  const marker = makeEl('', { className: 'vid-seek-marker' });
  const track = makeEl('', { className: 'vid-seek-track', children: [played, marker] });
  const strip = makeEl('vidSeekStrip', {
    hidden: true,
    children: [track],
    getBoundingClientRect: () => ({ left: 0, width: 100 })
  });
  const canvasCtx = { draws: [], drawImage(...args) { this.draws.push(args); } };
  const canvas = makeEl('vidSeekCanvas', { width: 384, height: 216, getContext: () => canvasCtx });
  const timeEl = makeEl('vidSeekTime', { textContent: '0:00' });
  const pop = makeEl('vidSeekPop', { offsetWidth: 196, children: [canvas, timeEl] });
  const pill = makeEl('vidSeekPill', { hidden: true, textContent: '0:00' });

  const vidPlayer = makeEl('vidPlayer', {
    src: 'blob:test-src', style: { display: 'block' }, classList: classListStub(),
    pause() {}, load() {},
    removeAttribute(name) { if (name === 'src') this.src = ''; else delete this['attr_' + name]; }
  });
  Object.defineProperty(vidPlayer, 'duration', { get: () => playerDurationValue });
  Object.defineProperty(vidPlayer, 'currentTime', {
    get: () => playerTime,
    set(v) { vidSeekTimes.push(v); playerTime = v; }
  });

  const vidFrame = makeEl('vidFrame', { src: 'about:blank', style: { display: 'none' } });
  const videoModal = makeEl('videoModal', { classList: classListStub(), querySelector: () => null });
  const els = {
    vidSeekStrip: strip, vidSeekPop: pop, vidSeekCanvas: canvas, vidSeekTime: timeEl, vidSeekPill: pill,
    vidLoading: makeEl('vidLoading', { classList: classListStub() }),
    vidErrorStatus: makeEl('vidErrorStatus', { hidden: true })
  };

  const store = new Map();
  const bridge = {
    lsGet: k => store.get(k),
    lsSet: (k, v) => store.set(k, String(v)),
    lsRemove: k => store.delete(k),
    pruneVpos() {},
    Date: { now: () => clock },
    setTimeout() { const id = windowTimers.length + 1; windowTimers.push(id); return id; },
    clearTimeout() {},
    window: {
      setTimeout(fn, ms) { const id = windowTimers.length + 1; windowTimers.push({ id, fn, ms }); return id; },
      clearTimeout(id) { const i = windowTimers.findIndex(t => t && t.id === id); if (i >= 0) windowTimers.splice(i, 1); }
    },
    document: {
      getElementById: id => els[id] || null,
      createElement(tag) {
        if (tag !== 'video') return makeEl(tag);
        const v = makeEl('video', {
          muted: false, playsInline: false, preload: '', src: '', loads: 0,
          load() { this.loads++; },
          removeAttribute(name) { if (name === 'src') this.src = ''; else delete this['attr_' + name]; }
        });
        Object.defineProperty(v, 'currentTime', {
          get: () => v._t || 0,
          set(val) { v._assignments = (v._assignments || 0) + 1; v._t = val; }
        });
        previewVideos.push(v);
        return v;
      }
    },
    vidPlayer, vidFrame, videoModal,
    vidLoading: els.vidLoading,
    vidTitle: { textContent: '' },
    vidOpenTab: { href: '' },
    vidProgressBar: { style: {} },
    lightbox: { classList: { contains: () => false } },
    resetPdfViewer() {},
    revokeCurrentDoc() {}
  };
  return {
    bridge, strip, pop, pill, timeEl, marker, played, canvasCtx,
    vidPlayer, vidFrame, videoModal, previewVideos, vidSeekTimes, windowTimers,
    els, store,
    setDuration(v) { playerDurationValue = v; },
    tick(n) { clock += n; }
  };
}

// ===== hover: ค่า 1.7 ถูก clamp เป็น 1, เลเบลเวลาอัปเดตทันทีแม้เฟรมถูก throttle =====
{
  const t = buildSeekBridge();
  const player = installPlayer(t.bridge);
  t.videoModal.classList.add('show');
  t.vidPlayer.dispatch('durationchange', {});
  assert.equal(t.strip.hidden, false, 'strip shows for a modal with a real src and duration');

  t.strip.dispatch('pointermove', { pointerType: 'mouse', clientX: 170 });
  assert.equal(t.marker.style.left, '100%', 'fraction 1.7 clamps the marker to the right edge');
  assert.equal(t.timeEl.textContent, '1:40', 'time label reads mm:ss of frac*duration (100s -> 1:40)');
  assert.equal(t.strip.hidden, false, 'strip stays visible while hovering');
  assert.equal(t.pop.hidden, false, 'preview card shows on hover');
  assert.ok(parseFloat(t.pop.style.left) >= 100, 'card left is clamped inside the strip, got ' + t.pop.style.left);
  assert.ok(t.videoModal.classList._removed.includes('chrome-hidden'), 'hovering the strip calls showVideoChrome');
  assert.equal(t.previewVideos.length, 1, 'one hidden preview video is created on the first hover frame');
  assert.equal(t.previewVideos[0].src, 'blob:test-src', 'preview video reuses the player URL');
  assert.equal(t.previewVideos[0].muted, true, 'preview video is muted');
  assert.equal(t.previewVideos[0].preload, 'metadata', 'preview video preloads metadata only');
  assert.equal(t.previewVideos[0]._assignments, 1, 'first hover dispatches one preview seek');

  // สอง move ห่างกัน 1ms → เลเบลอัปเดตทั้งคู่ แต่ currentTime ถูกตั้งแค่ครั้งเดียว
  const assignmentsAfterFirst = t.previewVideos[0]._assignments;
  t.tick(1);
  t.strip.dispatch('pointermove', { pointerType: 'mouse', clientX: 50 });
  assert.equal(t.timeEl.textContent, '0:50', 'time label updates synchronously on the throttled move');
  assert.equal(t.marker.style.left, '50%', 'marker follows the throttled move');
  assert.equal(t.previewVideos[0]._assignments, assignmentsAfterFirst, 'throttled move does not assign preview currentTime');

  // พ้นช่วง 300ms + seek เดิมจบ (seeked) → move ถัดไปยิง seek ใหม่และวาดเฟรมลง canvas
  t.tick(1300);
  t.previewVideos[0].dispatch('seeked', {});
  t.strip.dispatch('pointermove', { pointerType: 'mouse', clientX: 20 });
  assert.equal(t.previewVideos[0]._assignments, assignmentsAfterFirst + 1, 'next move after the throttle window seeks again');
  assert.equal(t.previewVideos[0]._t, 20, 'preview seeks to frac*duration (0.2 * 100s)');
  assert.ok(t.canvasCtx.draws.length >= 1, 'seeked draws the frame onto the 384x216 canvas');
  assert.deepEqual(t.canvasCtx.draws[0].slice(1), [0, 0, 384, 216], 'drawImage targets the full canvas size');

  // leave → ซ่อนการ์ดอย่างเดียว แถบยังอยู่ / คลิก → เลื่อน vidPlayer จริง
  t.strip.dispatch('pointerleave', {});
  assert.equal(t.pop.hidden, true, 'pointerleave hides the preview card');
  assert.equal(t.pill.hidden, true, 'pointerleave hides the touch pill');
  assert.equal(t.strip.hidden, false, 'pointerleave keeps the strip visible');
  t.strip.dispatch('pointerdown', { pointerType: 'mouse', clientX: 50 });
  assert.ok(t.vidSeekTimes.includes(50), 'pointerdown (click) seeks vidPlayer.currentTime to frac*duration');
  assert.equal(t.pop.hidden, false, 'clicking keeps the preview card up for scrubbing');
  console.log('PASS hover clamp, instant label, 300ms throttle, leave hides card and click seeks');
}

// ===== iframe mode หรือ duration 0/NaN → แถบยังซ่อน =====
{
  const t = buildSeekBridge();
  const player = installPlayer(t.bridge);
  const fire = () => t.vidPlayer.dispatch('durationchange', {});
  t.videoModal.classList.add('show');
  fire();
  assert.equal(t.strip.hidden, false, 'strip shows before iframe mode');

  t.vidFrame.style.display = 'block';
  fire();
  assert.equal(t.strip.hidden, true, 'iframe preview mode keeps the strip hidden');
  t.vidFrame.style.display = 'none';
  fire();
  assert.equal(t.strip.hidden, false, 'leaving iframe mode shows the strip again');

  t.setDuration(0);
  fire();
  assert.equal(t.strip.hidden, true, 'zero duration keeps the strip hidden');
  t.setDuration(NaN);
  fire();
  assert.equal(t.strip.hidden, true, 'NaN duration keeps the strip hidden');
  t.setDuration(100);
  fire();
  assert.equal(t.strip.hidden, false, 'a real duration shows the strip again');

  t.videoModal.classList._s.delete('show');
  fire();
  assert.equal(t.strip.hidden, true, 'closing the modal hides the strip');
  console.log('PASS strip stays hidden in iframe mode, with zero/NaN duration and when the modal is closed');
}

// ===== ปิด/เปิดคลิปใหม่ (resetMediaPlayback) → ล้าง src พรีวิวและซ่อนทุกอย่าง =====
{
  const t = buildSeekBridge();
  const player = installPlayer(t.bridge);
  t.videoModal.classList.add('show');
  t.vidPlayer.dispatch('durationchange', {});
  t.strip.dispatch('pointermove', { pointerType: 'mouse', clientX: 50 });
  assert.equal(t.previewVideos.length, 1, 'hover created the preview video before cleanup');
  assert.equal(t.previewVideos[0].src, 'blob:test-src', 'preview video holds the player URL before cleanup');

  player.resetMediaPlayback();
  assert.equal(t.strip.hidden, true, 'closing hides the strip');
  assert.equal(t.pop.hidden, true, 'closing hides the preview card');
  assert.equal(t.pill.hidden, true, 'closing hides the touch pill');
  assert.equal(t.previewVideos[0].src, '', 'closing removes the preview video src');
  assert.ok(t.previewVideos[0].loads >= 1, 'closing calls load() to stop pending preview fetches');
  console.log('PASS close cleanup removes the preview src and hides strip, card and pill');
}

// ===== touch: ไม่มี preview seek เลย อัปเดตเม็ดเวลา แล้วเลื่อนจริงตอนปล่อยนิ้ว =====
{
  const t = buildSeekBridge();
  const player = installPlayer(t.bridge);
  t.videoModal.classList.add('show');
  t.vidPlayer.dispatch('durationchange', {});

  t.strip.dispatch('pointerdown', { pointerType: 'touch', clientX: 50 });
  assert.equal(t.pill.hidden, false, 'touch down shows the time pill');
  assert.equal(t.pill.textContent, '0:50', 'touch down labels frac*duration');
  assert.equal(t.previewVideos.length, 0, 'touch never creates the preview video');
  assert.equal(t.vidSeekTimes.length, 0, 'touch down does not seek yet');

  t.strip.dispatch('pointermove', { pointerType: 'touch', clientX: 80 });
  assert.equal(t.pill.textContent, '1:20', 'touch move updates the pill time');
  assert.equal(t.previewVideos.length, 0, 'touch move still creates no preview video');
  assert.equal(t.vidSeekTimes.length, 0, 'touch move does not seek');

  t.strip.dispatch('pointerup', { pointerType: 'touch', clientX: 80 });
  assert.deepEqual(t.vidSeekTimes, [80], 'touch pointerup seeks vidPlayer once to the final frac*duration');
  assert.equal(t.pill.hidden, true, 'touch pointerup hides the pill');
  assert.equal(t.previewVideos.length, 0, 'the whole touch gesture never touches the preview video');
  console.log('PASS touch scrubs with the pill only and seeks once on pointerup');
}
