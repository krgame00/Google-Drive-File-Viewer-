# Bounded video streaming investigation

The user approved checking their reference Drive video through the existing public Worker, including open-ended requests with immediate cancellation. No OAuth credentials were sent. Each live body sample was limited to 4 KiB (the server can transmit additional buffered bytes before cancellation takes effect); the file was not downloaded in full.

## Evidence

Reference file size: 1,054,403,769 bytes.

| Path / request | Result |
| --- | --- |
| Google direct, `bytes=0-4095` | 206, MP4 signature, correct interval |
| Google direct, `bytes=-4096` | 206, correct final interval |
| Google direct, `bytes=527201884-527205979` | 206, correct middle interval |
| Existing deployed Worker, same bounded intervals | 206, matching intervals |
| Existing deployed Worker, `bytes=0-` | 403 JSON `downloadQuotaExceeded` |
| Existing deployed Worker, `bytes=527201884-` | 206; cancelled after a small sample |
| Local revised Worker forwarding `bytes=0-8388607` through existing Worker | 206, length 8,388,608, MP4 signature |
| Local revised Worker forwarding middle 8 MiB interval | 206, correct start/end |
| Local revised Worker requesting from 1,053,250,805 | 206, 1,152,964-byte final interval beginning with `moov` |

The original MP4 begins with `ftyp` followed by a large `mdat`; `moov` is near the end. A range-capable player can retrieve that metadata separately; a tiny successful prefix probe alone does not prove successful playback. These observations do not establish why Google treats the ranges differently, or that quotas can be bypassed globally.

## Change

Both the public Worker and signed-in service worker convert a single open-ended `bytes=start-` request to an interval of at most 8 MiB. Explicit ranges, suffix ranges, and requests without Range remain unchanged. Each response retains the upstream status, type, and real Content-Range. A capped request answered with a full-file 200, wrong offset, or invalid range is cancelled and rejected, not relabeled as a video chunk.

HTTP permits a self-descriptive 206 response to satisfy a subset of the requested interval: [RFC 9110 §15.3.7](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.7). Browser compatibility still requires validation.

## Validation and limits

- Browser test: a local, existing 10-second Sintel sample was served in 64 KiB partial responses. The Codex in-app browser requested successive intervals, reached readyState 4, played, sought to eight seconds, and reached the end without a media error.
- The signed-in service worker is covered with mocks; this run had no connected phone or live OAuth session.
- The real reference clip was sampled, not decoded in a live browser; this does not confirm its codec compatibility or sustained throughput.
- Google quotas remain applicable. No parallel whole-file download or media/token cache was introduced.
- The revised Cloudflare source has not been deployed. GitHub Pages changes and Cloudflare deployment are separate. Phone Chrome/Brave playback and seeking remain the final acceptance check after deployment.
