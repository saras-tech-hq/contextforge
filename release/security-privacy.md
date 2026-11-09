# Security and privacy (Phase 5.2)

Evidence from source at this tree, not marketing claims.

## Permissions (justified)

| Permission | Why |
| --- | --- |
| `activeTab` | Extract only the tab the user invoked. |
| `scripting` | Inject Readability into that tab. |
| `storage` | Last extract + license + onboarding flag. |
| `clipboardWrite` | Copy Markdown on user click. |
| Host `contextforge-license.example.workers.dev` | Opt-in license POST only. Placeholder; no live Worker. |

No `<all_urls>`, no `tabs`, no history, no cookies.

## Data flows

- Extract: tab DOM → isolated world → popup → optional `chrome.storage.local`.
- Copy: clipboard on click.
- License: POST `{ licenseKey, instanceName }` only when Activate is clicked. Page content is not in that body (`license.js`).
- MCP `fetch_web_page`: local Node fetch of user-supplied http(s) URL.

## Findings

- Fail-closed license on invalid length, HTTP failure, or thrown fetch.
- Popup clears output on extract failure.
- Scripts are local; Google Fonts only on the **website**, not the extension.
- No analytics pixels in extension or docs.
- XSS: extraction returns text/Markdown in a textarea, not `innerHTML`.

## Store privacy disclosure (draft)

“ContextForge extracts the current page locally. The last extract is stored on the device. No telemetry. A license key is sent to a license server only if you press Activate. Pro licensing is not currently offered.”

## Unresolved (owner)

- Legal review of privacy.html vs store questionnaires.
- Whether to drop host_permissions until a real Worker exists.
- Chrome Web Store $5 registration fee (US).
