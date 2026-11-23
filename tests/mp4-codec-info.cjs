// Characterization tests for readMp4CodecInfo
// Tests synthetic MP4 box fixtures covering:
// 1. avc1 (H.264) with various profiles (Baseline 66, Main 77, High 100, Hi10P 110, High 4:2:2 122, High 4:4:4 244)
// 2. hvc1 / hev1 (HEVC)
// 3. vp09 (VP9)
// 4. av01 (AV1)
// 5. mp4a and audio tracks
// 6. AC-3 audio gate fallback
// 7. Tail-range scanning (moov preceded by mdat bytes)
// 8. Corrupted / truncated / invalid bytes

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadVideoPlayerApi } = require('./helpers/load-video-player-api.cjs');

function box(type, payload = Buffer.alloc(0)) {
  const b = Buffer.alloc(8 + payload.length);
  b.writeUInt32BE(8 + payload.length, 0);
  b.write(type, 4, 4, 'ascii');
  if (Buffer.isBuffer(payload)) {
    payload.copy(b, 8);
  } else if (payload instanceof Uint8Array) {
    b.set(payload, 8);
  }
  return b;
}

function makeStsd(entries) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0); // version/flags
  header.writeUInt32BE(entries.length, 4); // count
  return box('stsd', Buffer.concat([header, ...entries]));
}

function makeAvc1(profile) {
  const avcC = box('avcC', Buffer.from([1, profile, 0, 0]));
  // 8-byte entry header + 6 reserved + 2 data refs + 70 visual fields = +86
  // Since box() prepends 8 bytes header for avc1, we need 78 bytes padding before avcC
  const padding = Buffer.alloc(78);
  const payload = Buffer.concat([padding, avcC]);
  return box('avc1', payload);
}

function wrapMoov(stsd) {
  return box('moov', box('trak', box('mdia', box('minf', box('stbl', stsd)))));
}

function getApi(audioSupport = { 'ac-3': false, 'ec-3': false }) {
  const el = () => ({
    addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    style: {},
    setAttribute() {},
    getAttribute() {}
  });
  const doc = {
    getElementById: el,
    body: { style: {} },
    createElement: (tag) => ({
      canPlayType: (mime) => {
        if (mime.includes('ac-3') && audioSupport['ac-3']) return 'maybe';
        if (mime.includes('ec-3') && audioSupport['ec-3']) return 'maybe';
        return '';
      }
    })
  };
  return loadVideoPlayerApi({ document: doc });
}

test('readMp4CodecInfo returns null for null, empty, or short buffers (< 16 bytes)', () => {
  const { readMp4CodecInfo } = getApi();
  assert.equal(readMp4CodecInfo(null), null);
  assert.equal(readMp4CodecInfo(undefined), null);
  assert.equal(readMp4CodecInfo(Buffer.alloc(0)), null);
  assert.equal(readMp4CodecInfo(Buffer.alloc(15)), null);
});

test('readMp4CodecInfo returns null when no stsd box is found', () => {
  const { readMp4CodecInfo } = getApi();
  const ftyp = box('ftyp', Buffer.from('isom'));
  const mdat = box('mdat', Buffer.alloc(100));
  assert.equal(readMp4CodecInfo(Buffer.concat([ftyp, mdat])), null);
});

test('readMp4CodecInfo identifies playable H.264 profiles (Baseline 66, Main 77, High 100)', () => {
  const { readMp4CodecInfo } = getApi();
  const baseline = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(66)])));
  assert.deepEqual(baseline, { playable: true, label: 'H.264 โปรไฟล์ Baseline' });

  const main = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(77)])));
  assert.deepEqual(main, { playable: true, label: 'H.264 โปรไฟล์ Main' });

  const high = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(100)])));
  assert.deepEqual(high, { playable: true, label: 'H.264 โปรไฟล์ High' });
});

test('readMp4CodecInfo marks unplayable H.264 profiles (Hi10P 110, High 4:2:2 122, High 4:4:4 244)', () => {
  const { readMp4CodecInfo } = getApi();
  const hi10p = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(110)])));
  assert.deepEqual(hi10p, { playable: false, label: 'H.264 โปรไฟล์ High 10 (Hi10P)' });

  const hi422 = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(122)])));
  assert.deepEqual(hi422, { playable: false, label: 'H.264 โปรไฟล์ High 4:2:2' });

  const hi444 = readMp4CodecInfo(wrapMoov(makeStsd([makeAvc1(244)])));
  assert.deepEqual(hi444, { playable: false, label: 'H.264 โปรไฟล์ High 4:4:4' });
});

test('readMp4CodecInfo identifies fallback formats (hvc1, hev1, vp09, av01, mp4a)', () => {
  const { readMp4CodecInfo } = getApi();
  const hvc1 = readMp4CodecInfo(wrapMoov(makeStsd([box('hvc1', Buffer.alloc(20))])));
  assert.deepEqual(hvc1, { playable: true, label: 'HEVC' });

  const hev1 = readMp4CodecInfo(wrapMoov(makeStsd([box('hev1', Buffer.alloc(20))])));
  assert.deepEqual(hev1, { playable: true, label: 'HEVC' });

  const vp9 = readMp4CodecInfo(wrapMoov(makeStsd([box('vp09', Buffer.alloc(20))])));
  assert.deepEqual(vp9, { playable: true, label: 'VP9' });

  const av1 = readMp4CodecInfo(wrapMoov(makeStsd([box('av01', Buffer.alloc(20))])));
  assert.deepEqual(av1, { playable: true, label: 'AV1' });

  const mp4a = readMp4CodecInfo(wrapMoov(makeStsd([box('mp4a', Buffer.alloc(20))])));
  assert.deepEqual(mp4a, { playable: true, label: 'รูปแบบ mp4a' });
});

test('readMp4CodecInfo gates on AC-3 audio support when video is otherwise playable', () => {
  const videoTrak = box('trak', box('mdia', box('minf', box('stbl', makeStsd([makeAvc1(100)])))));
  const audioTrak = box('trak', box('mdia', box('minf', box('stbl', makeStsd([box('ac-3', Buffer.alloc(20))])))));
  const dualMoov = box('moov', Buffer.concat([videoTrak, audioTrak]));

  // Browser without AC-3
  const apiNoAc3 = getApi({ 'ac-3': false, 'ec-3': false });
  const verdictNoAc3 = apiNoAc3.readMp4CodecInfo(dualMoov);
  assert.deepEqual(verdictNoAc3, { playable: false, label: 'เสียง AC-3' });

  // Browser with AC-3
  const apiWithAc3 = getApi({ 'ac-3': true, 'ec-3': false });
  const verdictWithAc3 = apiWithAc3.readMp4CodecInfo(dualMoov);
  assert.deepEqual(verdictWithAc3, { playable: true, label: 'H.264 โปรไฟล์ High' });
});

test('readMp4CodecInfo scans for moov in tail range when preceded by mdat bytes', () => {
  const { readMp4CodecInfo } = getApi();
  const mdatJunk = Buffer.from('chunk-of-raw-video-bytes-from-tail-range-offset-prior-to-moov');
  const moov = wrapMoov(makeStsd([makeAvc1(100)]));
  const tailBuffer = Buffer.concat([mdatJunk, moov]);
  const verdict = readMp4CodecInfo(tailBuffer);
  assert.deepEqual(verdict, { playable: true, label: 'H.264 โปรไฟล์ High' });
});

test('readMp4CodecInfo handles truncated or corrupted boxes gracefully', () => {
  const { readMp4CodecInfo } = getApi();
  const moov = wrapMoov(makeStsd([makeAvc1(100)]));

  // Truncated at various arbitrary lengths
  assert.equal(readMp4CodecInfo(moov.subarray(0, 30)), null);
  assert.equal(readMp4CodecInfo(moov.subarray(0, 60)), null);
  assert.equal(readMp4CodecInfo(moov.subarray(0, moov.length - 10)), null);

  // Corrupted box size claiming to be larger than container
  const corrupted = Buffer.from(moov);
  corrupted.writeUInt32BE(0xFFFFFFFF, 0); // huge size
  assert.equal(readMp4CodecInfo(corrupted), null);
});
