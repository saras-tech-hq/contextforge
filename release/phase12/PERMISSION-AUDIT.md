# Phase 12 — permission audit

## Production Manifest V3 (`chrome-extension/manifest.json`)

| Permission | Required for Free extract | Notes |
| --- | --- | --- |
| `activeTab` | Yes | Granted when the user invokes the action (toolbar / `Alt+Shift+F`). |
| `scripting` | Yes | Inject Readability into that tab only. |
| `storage` | Yes | Last extract, onboarding flag, license state. |
| `clipboardWrite` | Yes | Copy button. |
| `host_permissions` | **Removed** | Placeholder Worker is unused while Pro is disabled. |

`commands._execute_action` suggested key `Alt+Shift+F` opens the action (user gesture).

## License fetch

`LICENSE_API_URL` remains a placeholder. Without host permissions, `activateLicense` cannot complete a network call and **fails closed**. E2E covers that path.

## What was not granted

No `<all_urls>`, `tabs`, `history`, `cookies`, `debugger`, `webRequest`.

## Test overlay (not shipped)

Playwright extract tests copy the extension to a temp dir and add `http://127.0.0.1/*` so `chrome.scripting` can run without a toolbar click. Production ZIP does **not** include that overlay.
