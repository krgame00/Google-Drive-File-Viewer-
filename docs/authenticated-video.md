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
The supplied Cloudflare script is unchanged and must not be given OAuth tokens.

Deploy `index.html` and `drive-stream-sw.js` together in the same directory.
GitHub Pages HTTPS is supported; opening index.html with file:// cannot use
service workers. Unsupported browsers or failed streams show an error card
with cause-matched actions: retry, reconnect the account, or explicitly open
the Google preview (the preview signs in with Google's own session, separate
from the account connected here). Entering the error state auto-expands the
help panel so those actions are visible. Streams otherwise never auto-switch
to the preview, with one exception: after a media-level failure of the account
stream the page sends a one-byte range probe through the service worker and
classifies the answer. Google permission/quota answers (401/403/404/429) are
per-file problems: they never set the memory and the card is refined to say
so. Everything else — a blocked or hanging endpoint (502, network error,
timeout) and an endpoint that serves data the player still rejects (200/206) —
is remembered in sessionStorage for the tab session, and later signed-in opens
go straight to the preview with a message explaining why; the retry and
reconnect buttons clear that memory and attempt the stream again. The probe
refines the generic failure message with its verdict only while that generic
message is still showing, so worker error reports never get overwritten by it.
Stream errors are bound to the file id and playback attempt, so a stale
failure cannot override a newer retry. Message listeners accept reports from
any same-script service worker version, covering in-flight requests handled
by a stale worker after an update. Google download permissions, quotas, token
expiration and browser codec support remain applicable.

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
