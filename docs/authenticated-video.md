# Authenticated video playback

The player uses `drive-stream-sw.js` for signed-in playback. The service worker
intercepts only the same-origin `__drive_stream?id=...` endpoint and asks the
requesting tab for its in-memory OAuth token via a private MessageChannel.
The tab responds only while that file's modal is open and the token is valid.
The worker sends Authorization and Range directly to the Google Drive media API.
Neither credentials nor media are cached. Tokens never appear in media URLs.
The account stream sets `crossorigin="anonymous"` on the video before assigning
its same-origin URL, allowing service-worker partial responses in CORS mode.
The URL object is passed to the source loader so it can append the playback
attempt ID used for matching error reports. Public playback removes this CORS
setting because external download sources may not provide CORS headers.
Closing or switching a video invalidates pending setup; signing out closes it.

This replaces the need to pass credentials through the Cloudflare Worker.
The public proxy is available to signed-out playback and as a signed-in fallback. Only the file ID is sent to the proxy; OAuth tokens are sent only to Google.
The public Cloudflare Worker must not be given OAuth tokens; deploy its bounded-range revision separately.

Deploy `index.html` and `drive-stream-sw.js` together in the same directory.
GitHub Pages HTTPS is supported; opening index.html with file:// cannot use
service workers. Unsupported browsers or failed streams show an error card
with cause-matched actions: retry, reconnect the account, or explicitly open
the Google preview (the preview signs in with Google's own session, separate
from the account connected here). Entering the error state auto-expands the
help panel so those actions are visible. After a media-level failure the player retries public sources including the Cloudflare Worker, with an API-key error preflight, then offers a manual whole-file download or Google preview. Whole-file loading is never started automatically. Files larger than 16 MiB load through concurrent range requests; the source list is the direct Google media endpoint first (4 × 8 MiB) and the public Cloudflare Worker second (6 × 4 MiB, so each request still fits the Worker's per-request timeout on slower mobile links — the Worker timeout itself is 60 s after redeploy). The Worker's usercontent route has a separate download quota, so quota-blocked files still load — only the file ID is ever sent to the Worker. A 403 quota response retries with a growing delay instead of failing immediately, since the quota fluctuates minute-to-minute. When the browser supports the File System Access API the chunks are written straight into a temporary origin-private file and playback streams from that disk-backed file, so no full-size in-memory blob is ever built and a multi-gigabyte file can no longer crash the tab (Aw, Snap). Browsers without that support assemble the Blob in memory as before. Google does not expose `Content-Range` to cross-origin page scripts, so page-side chunk requests are validated by exact body length instead — the final chunk's length then confirms the recorded file size — while responses that do carry the header keep the full interval and total checks. A recorded size that disagrees with the upstream total, an upstream that ignores Range, or repeated chunk or write failures move to the next source and finally to the previous single-connection download, and cancellation works unchanged. At most one temporary file is kept per origin; the next whole-file load truncates and reuses it. A bounded diagnostic prefix probe can refine the error card, but cannot prove successful decoding. Successful streaming route names are remembered per file and signed-in/out mode for seven days, with at most fifty records; credentials and media URLs are not saved in that preference.

Single open-ended media ranges are sent upstream as at most 16 MiB intervals. Explicit and suffix ranges are preserved. Responses keep actual Content-Range and status; a capped request answered with a full-file 200 or an inconsistent interval is cancelled and rejected. The service worker keeps one interval of read-ahead in flight so a playing clip does not stall between intervals — a seek aborts the stale prefetch, and a failed prefetch falls back to a fresh fetch. Once a source answers with a usable Content-Length, the following intervals are fetched as four parallel sub-intervals and streamed to the player in order; any parallel failure falls back to the single connection. The browser requests subsequent intervals as needed. See the 2026-10-02 range report for live observations and remaining device checks.

Stream errors are bound to the
file id and playback attempt, so a stale failure cannot override a newer
retry. Message listeners accept reports from any same-script service worker
version, covering in-flight requests handled by a stale worker after an
update. Google download permissions, quotas, token expiration and browser
codec support remain applicable.

On startup failure the UI includes numeric browser diagnostics (`M` for
MediaError.code, `N` for networkState, `R` for readyState), captured before
unloading the video. These codes classify the failure but do not prove a
specific codec or blocker. A failed upstream fetch reports `FETCH`, distinct
from an HTTP error returned by Google. Neither token, media URL nor raw error
message is included. Comparing the same permitted file in Chrome and Brave,
then temporarily changing Shields for this site only, helps isolate blocking
from browser playback differences; it does not establish the cause by itself.

Validation: `node --test tests/authenticated-stream.cjs` exercises streaming
headers, error types, missing authentication, isolated client lookup, HEAD,
and asynchronous player cancellation. Run the existing tests/*.cjs as well.
Live acceptance still requires the user's Google login on a deployed HTTPS
site: play a permitted MP4, seek, close, switch files, and sign out; repeat on
Brave Android. Mock tests do not establish actual device playback compatibility.

The adaptive-range revision retries only an open-ended interval rejected with a confirmed download quota response: 8 MiB, then 2 MiB, then 1 MiB, at the same byte offset. At most two size retries are allowed; explicit and suffix ranges, permission errors, and aborted requests do not enter this retry path. Persistent quota still returns an error. This revision needs a separate Cloudflare deployment.

Range validation accepts a valid 206 interval whose complete length is unknown (`*`), while retaining checks for the starting offset and requested cap. Range failures report an allowlisted category (status, header, start, end or total) and the upstream HTTP status so a mobile screenshot can distinguish the cause. They never include raw headers or account credentials. See the mobile-range investigation report for current evidence and limits.

Signed-in fallback now includes the public Cloudflare Worker: after the bearer stream fails at the media level, or when a remembered route says the Worker played this file before, public sources are tried with only the file ID — no token reaches Cloudflare, and whole-file loading still never starts automatically. The Worker route only plays files that are publicly readable, so a private-file failure continues through the remaining public sources to the bearer stream.
