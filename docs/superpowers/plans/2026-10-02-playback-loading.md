# Playback loading improvements

Approved scope: remember a successful streaming route, skip confirmed route errors, show download speed/ETA, and require a choice before whole-file loading.

- [x] Store only route names and timestamps per file and signed-in/out mode. Expire after seven days and retain at most 50 entries. Record a route on actual native playback; never auto-select whole-file downloads.
- [x] Try the remembered available route first and retain fallbacks. Advance immediately on a confirmed service-worker permission/quota/session error; preflight the public API-key route with the existing bounded error probe.
- [x] Remove automatic whole-file fallback. Confirm large (256 MiB or more) and unknown-size manual downloads with size/network/memory information.
- [x] Show average received-byte speed and approximate remaining time when total size is known. Keep unknown totals honest and retain cancellation/session guards.
- [x] Test route order, stale playback, expiry, confirmation cancellation, and measured progress. Run existing lifecycle/download tests and all regression tests plus inline-script syntax checks.

This does not increase Google's bandwidth, bypass quotas, change video formats, or modify the untracked Worker implementation. Preserve other pending changes. Commit/push only when requested.

Validation: 74 Node test entries passed, inline JavaScript parsed successfully, and git diff --check passed. No live phone playback or bandwidth measurement was performed for these changes.
