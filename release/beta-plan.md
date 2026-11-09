# Public beta (Phase 7)

**Do not recruit users or announce without authorization.**

## First run

Popup shows a one-time local onboarding card (storage key `onboardingDismissed`). No network.

## Feedback

GitHub Issues only. No in-product telemetry.

## Beta checklist

- Sideload on Chrome and Edge.
- Extract: Wikipedia article, MDN doc, JS-heavy app (may fall back to body HTML).
- chrome:// and PDF: expect failure status, empty output.
- Offline: extract of already-open page still works; license activate fails closed.
- MCP html_to_markdown on a saved HTML file via client.

## Metrics (no tracking)

Count GitHub clones, Issues, and sideload reports manually. Do not add analytics.

## Notes template

ContextForge 1.0.0-rc — local-first extract/copy. Pro not sold. Sideload only.
