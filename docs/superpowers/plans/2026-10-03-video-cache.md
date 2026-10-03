# Repeat video playback

Approved scope: keep completed downloads locally, default 2 GiB, selectable off/1/2/5 GiB; evict least recently opened clips and offer clear. No automatic whole-file download. Try successful streaming routes first and skip recent route failures for five minutes.

Use a separate video-cache.js module backed by Cache Storage. Store only completed Blob/File payloads with file ID, account scope, size, modification timestamp and last-used time. Validate available Drive metadata on reads. Never store OAuth tokens or signed media URLs. Account scope requires a loaded Google profile; clear cache on explicit logout. Storage failure must not break playback. File-system temp downloads remain unchanged.

- [x] Add failing tests for bounded cache, invalidation, quota errors, clear races and route cooldown.
- [x] Implement storage module, serialized mutations and cross-tab Web Locks where available.
- [x] Integrate completed downloads, cache-first open, settings and manual retry reset.
- [x] Verify existing tests, new tests, JavaScript syntax and responsive settings structure. Record limitations: cache eviction by browser, no first-download guarantee and no Google quota bypass.
