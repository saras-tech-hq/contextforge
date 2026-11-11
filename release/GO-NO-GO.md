# Consolidated GO / NO-GO

| Channel | Decision | Why |
| --- | --- | --- |
| Sideload Free (Chrome/Edge unpacked) | **CONDITIONAL GO** | Gates green; owner must toolbar-extract on Chrome 157 / Edge 157. |
| GitHub Pages docs update | **BLOCKED** | Needs push approval (local docs may be ahead of `9aece96` site). |
| Chrome Web Store | **NO-GO** | $5 account, screenshots, submit auth. |
| Edge Add-ons | **NO-GO** | Partner Center verification. |
| npm MCP | **NO-GO** | private package; no publish auth. |
| Pro / billing | **NO-GO** | Intentionally disabled. |
| Force-push / history | **NO-GO** | Never. |

## Owner approvals needed next

1. Visual/functional sign-off of onboarding + install copy.
2. Ordinary `git push` of this local commit (not from `D:\Project Tool`).
3. Whether to pay CWS $5.
4. Store screenshot capture on a real Chrome profile.
5. MCP npm yes/no.
6. GitHub Release of the RC ZIP.
