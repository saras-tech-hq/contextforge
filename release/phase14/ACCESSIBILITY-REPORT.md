# Phase 14 — accessibility

| Check | Evidence |
| --- | --- |
| Skip link on website | `docs/index.html` `.skip` |
| Popup extract control | `<button id="extract">` |
| Output label | `.sr-only` for `#output` |
| Status | `role="status"` |
| Focus | `:focus-visible` cyan outline |
| Contrast | Dark navy vs `#e8eefc` / cyan / gold — **not instrumented with a contrast meter** |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in popup.css and docs/styles.css |
| Keyboard | Buttons/inputs native; onboarding dismiss is a button |

Screen-reader pass: **NOT TESTED** (no NVDA/VoiceOver run).
