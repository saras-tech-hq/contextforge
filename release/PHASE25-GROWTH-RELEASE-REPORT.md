# Phase 25 — Growth release candidate

**STOP. Not pushed. Not released.**

| Field | Value |
| --- | --- |
| Parent / current `origin/main` | `a299c3cbbd167b67a833403f903b9875a1f2a336` |
| Previous local HEAD | `b69ff6eb335326160875fa5ac922402ec70dc4ec` |
| Proposed version | **1.0.1** |
| Proposed tag | `v1.0.1-beta.1` (must not exist yet) |
| ZIP | `contextforge-v1.0.1.zip` |
| Size | 64054 bytes |
| SHA-256 | `69888653719c021f74cf013a177e21e727ff94f7c8baeae44d875cdc7ad11311` |
| Files in ZIP | 25, matches source |
| Old ZIP | `contextforge-v1.0.0.zip` **unchanged** `073810dec8554800075db985f9a95202e0f4ba6477da349fae22896a1c691497` |

## User-facing delta vs published 1.0.0-beta.1

| Area | Change |
| --- | --- |
| Manifest | `1.0.1`; description no longer “any webpage / token-efficient” |
| Popup | Save .md; Copy product link; friendlier restricted-page errors; Pro collapsed |
| Site/README | Download CTA → `v1.0.1-beta.1` ZIP; demo/FAQ |
| Permissions | Still `activeTab`, `scripting`, `storage`, `clipboardWrite`. **No host_permissions.** |
| Pro / billing | Still disabled |

## Tests (exit 0)

| Command | Result |
| --- | --- |
| `npm run build` | 0 |
| `npm test` | 39 passed |
| `npm run test:e2e` | 9 passed (incl. `#download` enable + version 1.0.1) |
| `npm run verify:build` | 0 (root/extension/manifest 1.0.1) |
| `npm audit` | 0 vulnerabilities |
| `node tools/security-audit.mjs` | 0 credential hits |
| `tools/verify-zip.ps1` | 0 — wrote **v1.0.1** only |

## Browser / extract

| Check | Result |
| --- | --- |
| Playwright Chromium e2e Copy | PASS (fixture) |
| Wikipedia extract + Copy/Save enabled | PASS **with test overlay** `https://en.wikipedia.org/*` (not in production ZIP) |
| Chrome 157 toolbar extract | **NOT TESTED** (0 extension SW in headless) |
| Edge 157 toolbar extract | **NOT TESTED** (extensions page opened; no toolbar click) |

## Website (local, unpublished)

CTA and install links point at  
`https://github.com/saras-tech-hq/contextforge/releases/download/v1.0.1-beta.1/contextforge-v1.0.1.zip`  
Those URLs **404 until** the GitHub Release exists. Desktop/mobile screenshots: `artifacts/launch-certification/after-*.png`.

## Growth

- Show HN draft: `release/growth/drafts/show-hn.md` — **do not post** until site+ZIP are live.
- HN Show HN rules: https://news.ycombinator.com/showhn.html (owner re-read on post day).
- Repo description/topics: `release/growth/GITHUB-REPO-META.md`
- Confirmed users: manual `release/growth/USER-LOG.md` only. No telemetry.

## Publication sequence (when authorized)

1. Ordinary `git push origin HEAD:refs/heads/main` from this clone.
2. **Immediately** create prerelease tag `v1.0.1-beta.1` on that commit and upload `contextforge-v1.0.1.zip` + `.sha256`. Do **not** replace `v1.0.0-beta.1`.
3. Wait for Pages on the new SHA.
4. Confirm the Download button returns the 1.0.1 ZIP and checksum matches.
5. Then, at most **one** Show HN post.

If step 2 lags step 3, the live Download button 404s.

## Approvals required

- Push of this RC commit
- GitHub Release `v1.0.1-beta.1`
- Pages (follows push)
- Show HN / other posts
- Stores / npm / Pro / paid

## Decision

**GO** for owner-authorized push + **new** prerelease. **NO-GO** until that authorization.
