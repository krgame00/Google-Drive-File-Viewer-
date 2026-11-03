# FINAL DESIGN — Video streaming subsystem re-ownership (synthesized)

Base: **Candidate B — Host–Center** (`.architect-tmp/candidate-2/design.md`), cross-judge verdict 30 vs 28 over Candidate A (`.architect-tmp/candidate-1/design.md`), orchestrator scoring in agreement. Four grafts folded in from A; two red-flag fixes applied. Full problem analysis, caller-evidence tables, and alternatives live in the two candidate docs — this file records the synthesized contract and what changed during grafting.

## Synthesis decision

Base B won on the two criteria where grounding's evidence is most concrete: single-owner state (complete ownership ledger; `suspend()` names a transition A's `close()`-collapse provably breaks — `openDocument` keeps `videoModal` open and writes `vidCurrentId = null` at media-lightbox.js:703, verified) and interface depth (24 names, each mapped to a grep-verified caller; A undercounted media-lightbox's surface and missed `suspend`/`enterPreview`). The candidates converged on every structural decision — delete the `with` bridge for explicit contexts, one shared protocol module via `importScripts`, BUG 1 killed by ownership, ONE auto-advance policy (countdown-with-prefetch), strict mode, behavior tests over greps — which is why grafting is small.

**Grafts from A (folded in):**
1. `browserStore.list()` prefix-guard: only orphan-sweep URLs under its own `__video_cache/` prefix (video-cache.js) — defense-in-depth so `createVideoCache` aimed at a foreign cache can never sweep it, even by future misuse.
2. SW `readHead` improvements: ghost self-heal (payload missing → delete its meta too) + at-touch (`record.at` refreshed on hit → LRU by use, not write time).
3. `drive-stream-prefetch-result` typed in the protocol module (the SW already emits it at drive-stream-sw.js:411/449).
4. Public-surface snapshot test (`tests/public-surface.cjs`) — additions to the 24-name API fail CI.

**Red-flag fixes:** the response header allowlist stays **SW-internal** (moved out of the protocol module — invariant 7 is SW-internal policy and the page never consumes it). B's `escape()` already subsumes the pseudo-fullscreen-exit-first priority (the Esc sketch bug A had). `importScripts` update behavior (imported scripts are re-fetched by the SW update algorithm) is recorded as an implementation note, not a risk.

## The shape (contract summary)

- `window.GDVVideoHost` (app-core publishes, ~13 members): auth/env deps the center consumes — token/tokenExpiry/authMode/ensureToken/cacheScope/cacheLimit/fileMeta/ls/toast/closeLightbox/playlist.
- `window.GDVVideo` = `createVideoCenter(host)` (video-player.js factory; 24 names): open/close/suspend/retry/reconnect/escape/openPreview/openExternal/copyToDrive/requestBlob/cancelBlob/toggleFullscreen/toggleAspect/toggleMinimize/toggleTurbo/onNav/enterPreview/refreshLibrary + watched{list,toggle,attach} + headCache{stats,clear}. Single writer of all playback state; wiring runs inside the factory (missing element id → throws at init); derived fullscreen state via one `syncFullscreen()`.
- `stream-protocol.js` (NEW; page classic-script + SW `importScripts` + CJS for tests): HEAD_CACHE_NAME, PROBE_ATTEMPT, isFileId, headCacheKey/headCacheUrl (THE one derivation), normalizeTokenReply, error-report parse/build, parsePrefetchGrant, prefetch-grant + prefetch-result + head-stats/clear message shapes. Wire shapes exist nowhere else.
- `drive-stream-sw.js`: transport unchanged; consumes protocol; **sole writer AND sole GC** of `gdv-video-heads-v1`; gains head-stats/head-clear message handlers (page never enumerates the cache — BUG 1's shape is unrepresentable).
- Auto-advance: one policy, countdown-with-prefetch, owned by the center; app-core's immediate-advance `ended` listener deleted; behavior tests execute the wiring.
- Deleted: `with (appApi)` bridge + accessor bag, ~60 shims, `window._gdvMediaNav`, the dead video-player.js:2041–2139 section, `GDVVideoApi`/`GDVLightboxApi` video-prototype chain. media-lightbox gets an explicit `video` reference + `suspend()`/`enterPreview()`. drive-explorer keeps its own bridge (out of blast radius) and calls `GDVVideo.open`.
- Migration: 6 slices, each suite-green — S1 protocol + BUG 1 fix (first: live data loss) → S2a factory conversion + dead-section deletion → S2b state relocation → S3 wiring re-homing + bridge deletion → S4 one auto-advance policy → S5 consolidation + surface snapshot + docs.

## Tradeoffs accepted

- Two window globals (Host + GDVVideo) as the explicit boundary, in exchange for zero import machinery under the no-bundler constraint.
- "No SW → heads unsupported (zeros)" in the settings card in exchange for the page never enumerating a foreign cache; old-SW window self-heals on next deploy.
- Completing the Brave block memory (vestige consulted by tryDirect) — small behavior change, flagged for the human.
- `videoCacheScope()` null-while-profile-pending kept as-is (cache-identity stability).
- app-core stays large; only its video section is excised (blast-radius bound).

## Alternatives considered (kept from candidates)

Keep-but-confine `with` under enforcement tests (class stays one paste away); full ESM (un-slicable, silent breakage at scale); destructured context snapshots (recreates hand-sync); A's single GDVApp across all modules (more total, but converts non-video subsystems and undercounts lightbox callers); mega-module merge (ownership by amputation); immediate-advance (deletes the shipped prefetch feature; riskier policy).

## Open questions and risks

- Brave memory completion and worker-rev-check (dormant default) need human sign-off before S5.
- `suspend()` interplay with openDocument/openPdfDocument needs a manual pass during S3 (frame-revocation order).
- Old-SW stats window shows zeros until the SW updates (accepted).
- app-core excision is manual surgery on a 2601-line file — slice order + suite-green at each boundary is the mitigation.

## Next implementation step

Slice 1: write `stream-protocol.js`, switch the SW to `importScripts` + head-stats/clear handlers + readHead self-heal/at-touch, move the page's head stats/clear onto SW messages (delete `headCacheAdmin`), add the `__video_cache/` prefix guard to `browserStore.list()`, and pin it with `tests/head-cache-protocol.cjs` — the BUG 1 trap test that fails on today's code.
