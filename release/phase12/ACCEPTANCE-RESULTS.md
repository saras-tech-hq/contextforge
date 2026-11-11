# Phase 12 — acceptance results

| Check | Result |
| --- | --- |
| Chrome/Edge binaries found | Yes (see BROWSER-MATRIX) |
| Genuine toolbar-click extract | **NOT TESTED** — Playwright cannot invoke the real action popup as a page |
| Unpacked install in branded Chrome GUI | **NOT TESTED** (headless Chrome: 0 extension service workers) |
| Playwright Chromium extract (localhost overlay) | PASS — 9 e2e tests |
| Onboarding in Chromium (Phase 11) | PASS — fresh profile |
| host_permissions removed | PASS — production manifest `[]` |
| Activate fail-closed | PASS — e2e |

Owner must click the toolbar on a real HTTPS tab in Chrome and Edge before calling branded-browser acceptance complete.
