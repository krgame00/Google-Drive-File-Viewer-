// video-codec.js — Video Codec Probe and MP4 Box Inspector for Google Drive File Viewer
// Contains:
//   - createVideoCodec factory
//   - deviceCodecSupport (browser codec support list: H.264, HEVC, AV1, VP9)
//   - describeCodecSupport (format codec support for user-facing error cards)
//   - audioCanPlay (canPlayType probe for AC-3 / E-AC-3)
//   - readMp4CodecInfo (MP4 box inspector: moov, trak, mdia, minf, stbl, stsd, avcC)

function createVideoCodec(app) {
  'use strict';
  app = app || {};

      function deviceCodecSupport() {
        // Browser-advertised support does not identify the codec of this file.
        try {
          const doc = (app && app.document) || (typeof document !== 'undefined' ? document : null);
          if (!doc || !doc.createElement) return null;
          const probe = doc.createElement('video');
          return [['H.264', 'video/mp4; codecs="avc1.42E01E"'], ['HEVC', 'video/mp4; codecs="hvc1.1.6.L93.B0"'], ['AV1', 'video/mp4; codecs="av01.0.05M.08"'], ['VP9', 'video/webm; codecs="vp9"']]
            .map(function (pair) { return { label: pair[0], ok: !!probe.canPlayType(pair[1]) }; });
        } catch (_) { return null; }
      }

      function describeCodecSupport(support) {
        if (!support || !support.length) return '';
        return ' เบราว์เซอร์ระบุว่ารองรับ: ' + support.map(function (s) { return s.label + (s.ok ? ' ✓' : ' ✗'); }).join(' ');
      }

      function audioCanPlay(format) {
        // canPlayType decides AC-3 support (Edge/Safari with OS codecs vs
        // plain Chrome); undecidable contexts default to supported so the
        // probe never false-positives.
        try {
          const doc = (app && app.document) || (typeof document !== 'undefined' ? document : null);
          if (!doc || !doc.createElement) return true;
          const probe = doc.createElement('video');
          return !!probe.canPlayType(format === 'ac-3' ? 'video/mp4; codecs="ac-3"' : 'video/mp4; codecs="ec-3"');
        } catch (_) { return true; }
      }

      function readMp4CodecInfo(bytes) {
        // Best-effort read of the first video sample entry in a bounded MP4
        // prefix. Returns null while the needed boxes are incomplete, else
        // {playable, label} for the first recognized codec entry.
        if (!bytes || bytes.length < 16) return null;
        const u32 = off => ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;
        const typeAt = off => String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        const containers = ['moov', 'trak', 'mdia', 'minf', 'stbl'];
        const stsdBoxes = [];
        function collect(start, end, depth) {
          let off = start;
          while (off + 8 <= end) {
            const size = u32(off);
            if (size < 8 || off + size > end) return;
            const type = typeAt(off);
            if (type === 'stsd') { stsdBoxes.push([off + 8, off + size]); }
            else if (depth > 0 && containers.indexOf(type) !== -1) { collect(off + 8, off + size, depth - 1); }
            off += size;
          }
        }
        collect(0, bytes.length, 6);
        // If a tail range starts inside mdat before moov, scan for the moov box header.
        if (!stsdBoxes.length) {
          for (let i = 0; i + 8 <= bytes.length; i++) {
            if (bytes[i + 4] === 109 && bytes[i + 5] === 111 && bytes[i + 6] === 111 && bytes[i + 7] === 118) {
              const size = u32(i);
              if (size >= 8 && i + size <= bytes.length) {
                collect(i + 8, i + size, 5);
                if (stsdBoxes.length) break;
              }
            }
          }
        }
        if (!stsdBoxes.length) return null;
        const profiles = {66: 'Baseline', 77: 'Main', 88: 'Extended', 100: 'High', 110: 'High 10 (Hi10P)', 122: 'High 4:2:2', 244: 'High 4:4:4'};
        let fallback = null;
        let videoVerdict = null;
        let audioLimit = null;
        for (const [stsdBody, stsdEnd] of stsdBoxes) {
          if (stsdBody + 16 > stsdEnd || !u32(stsdBody + 4)) return null;
          const entry = stsdBody + 8, entryEnd = entry + u32(entry);
          if (entryEnd > bytes.length) return null;
          const format = typeAt(entry);
          if ((format === 'ac-3' || format === 'ec-3') && !audioLimit) audioLimit = format;
          if (format === 'avc1' || format === 'avc3' || format === 'encv') {
            // 8-byte header + 6 reserved + 2 data refs + 70 visual fields = +86
            if (entryEnd < entry + 94) return null;
            let avcC = null;
            let off = entry + 86;
            while (off + 8 <= entryEnd) {
              const size = u32(off);
              if (size < 8 || off + size > entryEnd) break;
              if (typeAt(off) === 'avcC') { avcC = [off + 8, off + size]; break; }
              off += size;
            }
            if (!avcC || avcC[0] + 4 > avcC[1]) return null;
            const profile = bytes[avcC[0] + 1];
            if (!videoVerdict) videoVerdict = {playable: [66, 77, 88, 100].indexOf(profile) !== -1, label: 'H.264 โปรไฟล์ ' + (profiles[profile] || ('รหัส ' + profile))};
          }
          if (!fallback) fallback = {playable: true, label: format === 'hvc1' || format === 'hev1' ? 'HEVC' : format === 'vp09' ? 'VP9' : format === 'av01' ? 'AV1' : 'รูปแบบ ' + format};
        }
        // The video may decode fine while the audio track is AC-3: browsers
        // without OS-level AC-3 support break the clip mid-playback instead of
        // failing up front, so gate on canPlayType when the file carries it.
        const canPlayAudio = typeof audioCanPlay === 'function' ? audioCanPlay : function () { return true; };
        if (videoVerdict && videoVerdict.playable && audioLimit && !canPlayAudio(audioLimit)) {
          return {playable: false, label: 'เสียง ' + (audioLimit === 'ac-3' ? 'AC-3' : 'E-AC-3')};
        }
        if (videoVerdict) return videoVerdict;
        return fallback;
      }

  return {
    deviceCodecSupport,
    describeCodecSupport,
    audioCanPlay,
    readMp4CodecInfo
  };
}

const defaultCodec = createVideoCodec({});

const codecApi = {
  createVideoCodec,
  deviceCodecSupport: defaultCodec.deviceCodecSupport,
  describeCodecSupport: defaultCodec.describeCodecSupport,
  audioCanPlay: defaultCodec.audioCanPlay,
  readMp4CodecInfo: defaultCodec.readMp4CodecInfo
};

if (typeof window !== 'undefined') {
  window.GDVVideoCodec = codecApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = codecApi;
}
