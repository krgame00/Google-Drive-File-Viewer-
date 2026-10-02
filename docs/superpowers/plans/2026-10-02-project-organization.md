# Project organization implementation plan

**Goal:** Make the Drive viewer workspace easier to navigate without changing frontend URLs or media behavior.

**Approved approach:** Add a root guide and group maintenance scripts by purpose. Keep the daily automation entry point, runtime files, reports, local projects, sketches, and media in their existing locations. Do not delete or publish local files.

- [x] Group scripts under checks, data, download, transfer, and monitor.
- [x] Update the daily entry point and cross-script calls; resolve collection data from the repository root in the name checker.
- [x] Add root, scripts, and reports guides with commands, inputs/outputs, and migration notes.
- [x] Validate Python and PowerShell syntax without executing maintenance operations; run frontend tests and collection synchronization check.

Validation: 84 Node test entries passed; collection data matches (325 items). Parsed nine Python scripts and 16 PowerShell scripts without executing maintenance jobs. Verified checker inputs and daily targets offline, and intercepted all four monthly rclone calls while running the launcher from a different working directory. README links resolve. No media transfer, remote check, deletion, commit, or push was performed.

External scheduled commands that directly reference moved scripts must adopt the documented new paths. The daily entry point remains unchanged. Existing machine-specific storage paths remain unchanged.
