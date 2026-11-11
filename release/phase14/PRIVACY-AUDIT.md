# Phase 14 — privacy

| Data | Location | Leaves device? |
| --- | --- | --- |
| Page DOM | In-tab isolated world during extract | No (unless user copies) |
| Markdown | Popup memory + optional `chrome.storage.local` last extract | No |
| Onboarding flag | `chrome.storage.local` | No |
| License key | Only if Activate; POST `{licenseKey, instanceName}` | **Would**, but host permission absent so request fails |
| Telemetry | None | No |
| Website | Google Fonts CSS from fonts.googleapis.com | Yes, **docs only**, not the extension |

privacy.html matches: local-first extract; license POST only on Activate; no telemetry.

User can clear extension storage in chrome://extensions → Details → Storage.
