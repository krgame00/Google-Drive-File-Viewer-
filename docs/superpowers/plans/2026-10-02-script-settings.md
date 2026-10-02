# Script settings implementation plan

**Goal:** Resolve project files relative to each script and centralize machine-specific maintenance settings.

**Approved design:** Keep existing destinations and job behavior. A tracked JSON example supplies defaults; an ignored local JSON file overrides selected settings. PowerShell helpers resolve paths and check tools before jobs; Python resolves project files and link-source inputs without executing jobs during tests.

- [x] Test relocation, overrides, missing tools and invalid configuration offline.
- [x] Add shared settings and migrate all maintenance scripts.
- [x] Document settings and run syntax, regression and data checks.

Validation: 84 existing Node test entries passed and collection data matches (325 items). PowerShell settings tests cover relocation, partial overrides, missing commands, unknown settings, invalid remotes, local remote preflight, and mocked copy source/destination expansion. The Python relocation/settings test passed; ten Python scripts and all PowerShell scripts parse successfully. All eight grouped Python scripts resolve a relocated project root. Original credentials, download URLs and fixed transfer file IDs are unchanged. Remote operations and complete maintenance jobs were not run.

No downloads, remote transfers, shutdown commands, commits or pushes run during verification.
