# Phase 14 — performance

Environment: Windows 10, Playwright Chromium, 2026-11-11.

| Metric | Observation |
| --- | --- |
| ZIP | 63308 bytes |
| Ten-site latency | 3.2s–24.4s (navigation + parse; Node fs.html slowest) |
| Typical Wikipedia | ~5–20s including network |
| E2E extract fixture | ~287ms |
| Memory/CPU of Chrome process | **NOT MEASURED** (no ETW/perf counters captured) |
| Popup CSS 3D | CSS only; `prefers-reduced-motion` disables transforms |

No fabricated CPU/RSS numbers.
