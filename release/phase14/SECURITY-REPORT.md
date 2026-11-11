# Phase 14 — security

| Area | Finding | Sev |
| --- | --- | --- |
| Manifest | MV3; no remote scripts; no host_permissions | Info |
| Injection | `chrome.scripting` only on user-invoked tab | Info |
| XSS | Output is textarea text, not `innerHTML` | Info |
| Network | Free extract/copy do not fetch. Activate may attempt placeholder URL and fail closed | Info |
| ZIP | 25 files, no `.env`, no `.wrangler` | Info |
| `npm audit` | 0 vulnerabilities | Info |
| `security-audit.mjs` | 0 credential hits | Info |
| Debug | `console.warn` on storage failure only | Low |

No critical/high issues found in code review this phase.
