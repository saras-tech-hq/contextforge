# Reliability and performance (Phase 8)

## Coverage

- Vitest: shared Markdown, tokens, storage bounds, license fail-closed, MCP stdio, malformed HTML, non-http fetch reject.
- Playwright: 9 Chromium extension tests including clipboard, Pro gate, restricted-tab failure, leak checks.

## Limits

- Stored markdown ≤ 500,000 characters.
- MCP fetch ≤ 5MB / 20s.

## Not measured here

Peak RSS on 5MB HTML (manual). Tokenizer-accurate token counts (explicitly approximate).

## Regression checklist

`npm ci` → `build` → `test` → `test:e2e` → `verify:build` → `verify-zip.ps1` → `npm audit`.
