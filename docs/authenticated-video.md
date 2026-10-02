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
The existing public proxy remains available only to signed-out playback.
The public Cloudflare Worker must not be given OAuth tokens; deploy its bounded-range revision separately.

Deploy `index.html` and `drive-stream-sw.js` together in the same directory.
GitHub Pages HTTPS is supported; opening index.html with file:// cannot use
service workers. Unsupported browsers or failed streams show an error card
with cause-matched actions: retry, reconnect the account, or explicitly open
the Google preview (the preview signs in with Google's own session, separate
from the account connected here). Entering the error state auto-expands the
help panel so those actions are visible. After a media-level failure the player retries Google's public sources, with an API-key error preflight, then offers a manual whole-file download or Google preview. Whole-file loading is never started automatically. A bounded diagnostic prefix probe can refine the error card, but cannot prove successful decoding. Successful streaming route names are remembered per file and signed-in/out mode for seven days, with at most fifty records; credentials and media URLs are not saved in that preference.

Single open-ended media ranges are sent upstream as at most 8 MiB intervals. Explicit and suffix ranges are preserved. Responses keep actual Content-Range and status; a capped request answered with a full-file 200 or an inconsistent interval is cancelled and rejected. The browser requests subsequent intervals as needed. See the 2026-10-02 range report for live observations and remaining device checks.

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
