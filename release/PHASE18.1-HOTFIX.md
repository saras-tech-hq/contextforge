# Phase 18.1 — public installation hotfix

**GO / NO-GO:** **GO** to publish this docs-only commit (ordinary `git push origin HEAD:refs/heads/main`). **STOP — not pushed.**

Parent: `5f12f9fec056d86e51f93919d5ec6b13fce8fcd2` (also current `origin/main`).

## What changed

| File | Change |
| --- | --- |
| `docs/index.html` | Primary CTA **Download Free Beta** → `v1.0.0-beta.1` ZIP. Install steps: download, extract, `chrome://extensions` / `edge://extensions`, Developer mode, Load unpacked on folder with `manifest.json`, open HTTPS page. Not-a-store warning. Clone/`npm ci` moved to **For developers**. |
| `docs/styles.css` | Step list and link styles. |
| `release/MASTER-LAUNCH-REPORT.md` | Local note. |
| `release/PHASE18.1-HOTFIX.md` | This file. |

## What did not change

- GitHub Release assets (ZIP not rebuilt)
- ZIP SHA-256 `073810dec8554800075db985f9a95202e0f4ba6477da349fae22896a1c691497` (63308 bytes)
- Extension, MCP, billing, stores

## Tests (exit 0)

`build` · `npm test` 39 · `test:e2e` 9 · `verify:build` · `npm audit` 0 vulns · `security-audit.mjs` 0 hits.

`verify-zip.ps1` **not** run (it recreates the ZIP).

## Screenshots

`artifacts/launch-certification/before-desktop.png`, `before-mobile.png`, `after-desktop.png`, `after-mobile.png`, `after-desktop-focus.png` (skip link on Tab).

## Publication (owner)

```
git push origin HEAD:refs/heads/main
```

Do not force-push. Do not `gh release` upload. Pages will pick up `docs/`.
