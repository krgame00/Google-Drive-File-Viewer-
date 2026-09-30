# Authenticated video playback

The player uses `drive-stream-sw.js` for signed-in playback. The service worker
intercepts only the same-origin `__drive_stream?id=...` endpoint and asks the
requesting tab for its in-memory OAuth token via a private MessageChannel.
The tab responds only while that file's modal is open and the token is valid.
The worker sends Authorization and Range directly to the Google Drive media API.
Neither credentials nor media are cached. Tokens never appear in media URLs.
Closing or switching a video invalidates pending setup; signing out closes it.

This replaces the need to pass credentials through the Cloudflare Worker.
The existing public proxy remains available only to signed-out playback.
The supplied Cloudflare script is unchanged and must not be given OAuth tokens.

Deploy `index.html` and `drive-stream-sw.js` together in the same directory.
GitHub Pages HTTPS is supported; opening index.html with file:// cannot use
service workers. Unsupported browsers or failed streams show an error card
with cause-matched actions: retry, reconnect the account, or explicitly open
the Google preview (the preview signs in with Google's own session, separate
from the account connected here). Streams never auto-switch to the preview.
Stream errors are bound to the file id and playback attempt, so a stale
failure cannot override a newer retry. Google download permissions,
quotas, token expiration and browser codec support remain applicable.

Validation: `node --test tests/authenticated-stream.cjs` exercises streaming
headers, error types, missing authentication, isolated client lookup, HEAD,
and asynchronous player cancellation. Run the existing tests/*.cjs as well.
Live acceptance still requires the user's Google login on a deployed HTTPS
site: play a permitted MP4, seek, close, switch files, and sign out; repeat on
Brave Android. Mock tests do not establish actual device playback compatibility.
