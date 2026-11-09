# Chrome Web Store readiness (Phase 5.3)

**Do not submit. Do not pay. Do not register.**

## Official requirements (operator must re-check at submit time)

- MV3 only.
- Privacy practices form.
- Single-purpose.
- Justify each permission.
- 128px icon (we ship 16/32/48/128).
- Screenshots of the **running** extension (1280×800 or 640×400 typical).
- Developer account: one-time **USD $5** registration — **BLOCKED (₹0 / no payment)**.

## Listing draft

**Title:** ContextForge  
**Short:** Turn any webpage into clean Markdown for AI tools. Local-first.  
**Category:** Productivity  
**Support:** https://github.com/saras-tech-hq/contextforge/issues  
**Privacy:** https://saras-tech-hq.github.io/contextforge/privacy.html  

**Detailed description:**

ContextForge extracts the main content of the page you are viewing and converts it to token-efficient Markdown. Copy it into ChatGPT, Claude, Gemini, Cursor, or any other tool.

Free forever for extract, copy, and local storage of the last result. No account. No telemetry.

Pro prompt packing is not available for purchase.

Developer install is documented on the website until this listing is approved.

## ZIP

Built by `tools/verify-zip.ps1` → `contextforge-v1.0.0.zip` (25 files). Copy a dated RC under `release/dist/` after the gate.

## Permission justifications (store form)

- activeTab: read the page the user clicked Extract on.
- scripting: run Readability on that page.
- storage: remember last extract.
- clipboardWrite: copy button.
- host permission: license validation when the user activates a key (feature not sold).

## Checklist

- [ ] Owner developer account + $5
- [ ] Screenshots from Chrome (not file:// mocks)
- [ ] Privacy questionnaire matches privacy.html
- [ ] ZIP SHA-256 recorded
- [ ] Explicit submit authorization
