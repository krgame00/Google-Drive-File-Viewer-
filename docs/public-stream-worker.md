# Public video Worker repair

Mobile Chrome debugging found two failures in the existing public Worker:

- Media requests failed with `corp-not-same-site`. The Worker copied Google's
  `Cross-Origin-Resource-Policy: same-site` onto its own cross-site response.
- An open-ended `Range: bytes=0-` request returned Google's virus scan warning
  page, but the Worker relabeled that HTML as `video/mp4`. A short range could
  return real MP4 bytes, so a successful short probe did not prove playback.

Use `cloudflare-drive-worker.mjs` as the replacement Worker source. It follows
the download confirmation form, including its hidden `uuid` field; restricts
confirmation URLs to Google's download endpoints and the original file ID;
sets its own CORS/CORP headers; and preserves the real media type, range status
and range headers. It returns JSON errors for HTML, quota errors and failed
confirmations instead of disguising them as video.

Deployment is separate from GitHub Pages:

1. Open the existing `google-drive-file-viewer` Worker in Cloudflare.
2. Replace its source with `cloudflare-drive-worker.mjs` and deploy.
3. Retry direct playback in Chrome on the connected phone, then test Brave.

This repair has unit coverage in `tests/public-worker.cjs`. The current bounded-range revision has
not yet been deployed to Cloudflare. It cannot remove Google's
download or playback limits. No account credentials are sent to this Worker.

The 2026-10-02 revision caps single open-ended media requests at 8 MiB, while preserving explicit/suffix intervals and actual Content-Range. It refuses full-file or mismatched responses to those capped requests. This addresses the observed difference between a quota-rejected `bytes=0-` and successful bounded intervals for the reference clip; it does not disable Google quotas. The same revision keeps one read-ahead chunk in flight for the next media request, so consecutive requests start without a fresh confirmation flow — a seek aborts the stale prefetch, and a failed prefetch falls back to a fresh fetch with its own 60 s guard. See [the range investigation](test-report-2026-10-02-stream-ranges.md) for evidence and validation limits.

The adaptive-range revision retries only an open-ended interval rejected with a confirmed download quota response: 8 MiB, then 2 MiB, then 1 MiB, at the same byte offset. At most two size retries are allowed; explicit and suffix ranges, permission errors, and aborted requests do not enter this retry path. Persistent quota still returns an error. This revision needs a separate Cloudflare deployment.
