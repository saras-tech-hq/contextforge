# ContextForge production readiness audit

Baseline: sanitized `9aece96` plus local follow-on work in `D:\contextforge-phase34\rewrite-work`.
GitHub: https://github.com/saras-tech-hq/contextforge
Site: https://saras-tech-hq.github.io/contextforge/

## Architecture

| Surface | Implementation |
| --- | --- |
| Extension | MV3 popup + service worker. Permissions: `activeTab`, `scripting`, `storage`, `clipboardWrite`. Host: placeholder license origin only. |
| Extraction | Inject Readability into the active tab, convert HTML in the popup with Turndown. |
| Storage | Last extract only, 500k char cap. License state local. |
| MCP | stdio SDK, `html_to_markdown`, `fetch_web_page` (http/https, 20s, 5MB). |
| Pro | Disabled. `activateLicense` fails closed. No checkout. |

## Clean install

```bat
cd /d D:\contextforge-phase34\rewrite-work
npm ci
npm run build
npm test
npm run test:e2e
npm run verify:build
powershell -NoProfile -ExecutionPolicy Bypass -File tools\verify-zip.ps1
```

Load unpacked: `chrome-extension/`.

## Defect register (prioritized)

| ID | Severity | Status |
| --- | --- | --- |
| D1 | Med | Placeholder `host_permissions` for non-existent Worker — store reviewers will ask. |
| D2 | Med | Chrome/Edge store not submitted. Developer accounts/fees BLOCKED. |
| D3 | Low | Token estimate is ~4 chars/token, not tokenizer-accurate. |
| D4 | Low | Restricted URLs (chrome://, Web Store) fail extract — expected. |
| D5 | Low | GitHub Pages may lag local docs until an approved push. |
| D6 | Info | Personal Git author identity remains on sanitized commits (accepted). |

No critical functional blockers for **developer sideload** of the Free tier.
