# Phase 13 — extraction quality

**Method (honest):** Playwright Chromium navigated to each public URL, then the **shared** Readability + Turndown pipeline (`documentToMarkdown`) ran on the rendered HTML. This is the MCP/shared converter, **not** a toolbar click of the MV3 popup.

Evidence: `artifacts/launch-certification/ten-site.json`, truncated samples `artifacts/launch-certification/01-*.md` … `10-*.md`.

| Result | Count |
| --- | --- |
| PASS | 9 |
| PASS WITH LIMITATIONS | 1 (`https://overreacted.io/` index, 155 chars) |
| FAIL | 0 |
| BLOCKED | 0 |

Largest page: Node.js `fs.html` ~418k characters / ~20s navigation+parse. Storage cap is 500k chars — this page would persist truncated if stored from the extension.

Wikipedia extracts include some thumbnail URLs and “From Wikipedia” chrome — usable, not perfectly clean.

JS-heavy React docs still produced a real Quick Start extract after `domcontentloaded` + 1.5s wait.
