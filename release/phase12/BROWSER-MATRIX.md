# Phase 12 — browser matrix

Discovery date: 2026-11-11 (local).

| Browser | Executable | Version | Architecture | GUI available | Extension SW in Playwright headless |
| --- | --- | --- | --- | --- | --- |
| Google Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe` | 157.0.8103.40 | 64-bit (Program Files) | Yes | 0 service workers — **toolbar extract NOT TESTED** |
| Microsoft Edge | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | 157.0.4341.42 | 32-bit Program Files (x86) | Yes | 1 service worker observed; **toolbar extract NOT TESTED** |
| Playwright Chromium | bundled | Playwright 1.65 | n/a | automated | Yes (e2e 9 passed) |

Registry: `HKLM\...\App Paths\chrome.exe` and `msedge.exe` match the paths above.

Screenshots: `artifacts/launch-certification/chrome-extensions.png`, `edge-extensions.png` (chrome://extensions and edge://extensions opened). These are **browser UI pages**, not proof of unpacked install success (Chrome headless reported 0 extension workers).
