# Phase 18 — Free GitHub public beta

**Verdict: PARTIALLY LAUNCHED**

Authorized commit `5f12f9fec056d86e51f93919d5ec6b13fce8fcd2` is on `origin/main`, Pages rebuilt, and prerelease `v1.0.0-beta.1` is public. The website still tells developers to clone and `npm ci` instead of downloading the ZIP.

This report file is local-only (not in the published commit).

## Git push

| Field | Value |
| --- | --- |
| Command | `git push origin HEAD:refs/heads/main` (ordinary, not force) |
| Result | `9aece96..5f12f9f  HEAD -> main` |
| Remote `main` after | `5f12f9fec056d86e51f93919d5ec6b13fce8fcd2` |
| Tag | `v1.0.0-beta.1` → same commit |

## GitHub Pages

| Field | Value |
| --- | --- |
| Workflow | pages-build-deployment |
| ID | `42965684500` |
| SHA | `5f12f9fec056d86e51f93919d5ec6b13fce8fcd2` |
| Outcome | **success** (35s) |
| URL | https://github.com/saras-tech-hq/contextforge/actions/runs/42965684500 |
| Site | https://saras-tech-hq.github.io/contextforge/ |
| Privacy | https://saras-tech-hq.github.io/contextforge/privacy.html |

Fetched HTML contains ContextForge title, Load unpacked, GitHub Issues, no checkout/Lemon Squeezy. CSS `--bg: #070b14` (dark). `brand-logo.png` is a PNG (84505 bytes). Install section still: clone repo, `npm ci`, `npm run build`, load `chrome-extension/`.

## GitHub Release

| Field | Value |
| --- | --- |
| URL | https://github.com/saras-tech-hq/contextforge/releases/tag/v1.0.0-beta.1 |
| Tag | `v1.0.0-beta.1` |
| Prerelease | true |
| Title as published | `ContextForge-v1.0.0-Free-Public-Beta` (CLI quoting on Windows; intended title had spaces) |
| Assets | `contextforge-v1.0.0.zip`, `contextforge-v1.0.0.zip.sha256` |
| Notes | Sideload Load unpacked for Chrome and Edge; Pro not for sale |

## ZIP integrity

| Field | Value |
| --- | --- |
| Size | 63308 bytes |
| SHA-256 (published) | `073810dec8554800075db985f9a95202e0f4ba6477da349fae22896a1c691497` |
| Download SHA match | **true** |
| `manifest.json` at ZIP root | **yes** |
| `host_permissions` | absent |
| Recorded pre-rebuild hash | `75606931066415ab734d9d13cf0dd4d7ef42e88b6c23bb3b05747d17171a7885` |

`tools/verify-zip.ps1` recreates the archive (`Compress-Archive`), so the **container** hash changed while **file contents** still matched source (`ZIP_MATCHES_SOURCE=true`). The published checksum is the post-rebuild hash.

## Quality gates (this session, all exit 0)

| Command | Exit | Detail |
| --- | --- | --- |
| `npm run build` | 0 | |
| `npm test` | 0 | 39 passed |
| `npm run test:e2e` | 0 | 9 passed |
| `npm run verify:build` | 0 | |
| `npm audit` | 0 | 0 vulnerabilities |
| `node tools/security-audit.mjs` | 0 | 0 credential hits |
| `tools/verify-zip.ps1` | 0 | 25 files |

## Remaining defects

| ID | Issue |
| --- | --- |
| D7 | Chrome/Edge **toolbar** extract still not independently observed |
| D11 | Public website install copy is clone+build, not ZIP sideload |
| D12 | Release title hyphenated due to Windows `gh` quoting |
| D8 | Ten-site matrix used shared converter, not popup inject |

## Out of scope (not done)

Chrome Web Store: **not submitted**  
Edge Add-ons: **not submitted**  
npm MCP: **not published**  
Pro/billing: **disabled** (no host permissions; Activate fail-closed)

## Next commercial/product milestone

1. Update website install copy to the GitHub Release ZIP (requires a **new** authorized commit).  
2. Owner toolbar smoke on Chrome 157 / Edge 157.  
3. Optional CWS $5 + screenshots. **Do not** submit until (1)+(2).
