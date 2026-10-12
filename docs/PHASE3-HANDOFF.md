# Phase 3 modularization — handoff (paused 2026-10-12 ~21:10)

## Current verified state

| File | Lines | Status |
|---|---|---|
| `index.html` | 4,140 | shell + styles.css link + Collection/Video bridges. Explorer funcs still inline. |
| `styles.css` | 1,764 | DONE (Phase 1) |
| `collections-data.js` | 8 | DONE (Phase 2) |
| `collection-viewer.js` | 590 | DONE (Phase 3, bridge `GDVCollectionApi`) |
| `video-player.js` | 1,209 | DONE (Phase 3, bridge `GDVVideoApi`, 53 refs) |
| `drive-explorer.js` | 1,614 | ORPHAN — complete but never referenced. Safe to delete or finish wiring. |
| `media-lightbox.js` | — | MISSING — extraction was reverted |
| `tests/helpers/load-app-source.cjs` | — | DONE (Phase 4): concatenates all app sources so tests can slice functions from any module |
| `scripts/checks/_appsources.py` | — | DONE: shared helper so Python daily scripts find keys/collections in any module |

`node --test tests/*.cjs` → **134 pass / 0 fail**.
No dangling `media-lightbox.js` reference in index.html. Page loads as-is.

## What broke and why

`git checkout -- index.html` was run to undo a half-applied extraction. It reverted
index.html to the last commit (7,417 lines), destroying the video-player + drive-explorer
wiring that lived only in the working tree. A scratch backup (4,140 lines) was copied back
but predated the drive-explorer wiring, so the `GDVExplorerApi` bridge and its alias lines
were lost. `drive-explorer.js` itself survived because it was a separate untracked file.

## Rules for resuming

1. **Never `git checkout` a file with uncommitted work.** Commit first, or copy to scratch,
   or make the edit script idempotent and re-runnable.
2. **Extraction scripts must be all-or-nothing.** Build the new module + patched index.html in
   memory, validate both, then write. The failing run left index.html with the block deleted and
   the module never written.
3. **Export-list asserts are alphabetical here.** `appApi.lightbox = { a, b, c }` is sorted, so
   "insert after X" anchors must be the real first name or the assert silently fails.
4. **State ownership:** a function's `let`/`const` declarations must live on the same side of the
   bridge as the code that reads and writes them. `mediaList`/`navigateMedia` were nested at 14-space
   indent inside `renderFiles` and shared `currentMediaIndex`/`currentMediaKind` with `openLightbox`.
   Same value, two owners → must move together (or move the declarations onto the bridge).
5. **Tests are not the page.** 134/134 stayed green while the explorer was unwired, because
   `loadAppSource()` concatenates sources. Verify with `grep -c 'script src='` and by loading the page.

## Remaining work (Phase 3 → Phase 4 finish)

- [ ] Decide: delete `drive-explorer.js`, or add `GDVExplorerApi` bridge + 34 aliases + script tag.
      Deleting is the boring/safe path; the module is already written if wiring is wanted.
- [ ] Extract media-lightbox: `openLightbox`, `closeLightbox`, `toggleLightboxFullscreen`,
      `updateLbCount`, `loadOriginalImage`, `prefetchNextImage`, `fallbackImage`, `clampImageScale`,
      `clampImagePan`, `applyImageView`, `resetImageView`, `imageGestureMode`, `swipeNavigateFor`,
      `setImageControlsVisible`, `cancelImageTap`, `handleImageTap`, `openPdfDocument`, `renderPdfPage`,
      `stepPdfPage`, `updatePdfNavState`, `openPdfBlob`, `pdfLoadingState`, `fitPdfScale`, `zoomPdf`,
      `fallbackPdfToDrive`, `resetPdfViewer`, `loadPdfLibrary`, `revokeCurrentDoc`, `openDocument`,
      `fallbackDocIframe`, `fallbackIframe`, `genericIconSvg`, plus nested `mediaList`/`navigateMedia`.
      Extract by hand or with a rewritten all-or-nothing script — do not re-run the old one.
- [ ] Phase 4: switch tests from slicing to `require()` per module, then delete `loadAppSource`.

Reusable scripts (unrun since the failure): `cache/scratch/extract_media.py`, `cache/scratch/move_nav.py`.
Both need the fixes in rules 1-3 before use.
