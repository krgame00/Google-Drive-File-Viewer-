# Test report — 2026-09-29

Target: commit a0f9d1a; local automated tests and the deployed GitHub Pages UI.

## Passed

- All eight tests/*.cjs scripts passed; inline JavaScript parsed successfully.
- Authenticated streaming: eight mocked tests cover bearer headers, Range,
  missing credentials, HTML/error rejection, HEAD, playback fallback and stale
  asynchronous setup cancellation. This does not verify real Google playback.
- Existing tests cover covers, queue bounds, personal-data validation/rollback,
  watched state, resume history, modal cleanup, favorites and navigation state.
- Live UI: collection search (matches and empty results), oldest/newest sorting,
  next-page navigation, pagination enabled/disabled, collapse/reopen collection.
- Responsive DOM measurements at 320, 390, 768, 1280 and 1440px showed no
  document horizontal overflow. Mobile displays four cards; 768px displays
  four; 1280/1440px displays eight. Narrow pagination reduces number buttons.
  Width changes retain the previously visible first item within the new page.
- Live folder sample loaded six subfolders and five files; folder filter showed
  six cards, filename search showed one matching image. List/grid switching,
  opening a subfolder, parent navigation and return to library worked.
- Favorites and watch-later were added and removed; watched marker toggled
  aria-pressed and was restored. No media was played during these checks.
- Invalid input produced the visible invalid-link alert.
- No console errors were captured in the test tab during these interactions.

## Not verified end to end

- Google OAuth login and actual authenticated playback/seeking: test tab was
  signed out. Service-worker tests currently simulate the Google response.
- Actual Brave Android/iOS device playback: mobile checks emulate viewport
  dimensions in the desktop browser only.
- Image/video preview rendering, playback resume and codec compatibility.
- ZIP/file downloads and backup import/export via actual browser downloads or
  file chooser in this run; data logic is covered by automated tests.
- External MEGA/OneDrive destinations and every link in the 325-entry library.
- Full accessibility, performance/load and security audits.

No application code changed during this audit. Temporary test entries were
removed, viewport override reset, and the agent-created tab closed. The two
user-owned tabs were left open. Passing this scope is not a claim that all
features and all files work on every device.
