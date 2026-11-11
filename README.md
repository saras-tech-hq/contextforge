# ContextForge

Local-first Chrome/Edge (Manifest V3) extension **and** MCP server. It extracts the **main content** of the page you are reading into Markdown you can paste into ChatGPT, Claude, Gemini, Cursor, or a notes app.

**Positioning:** AI research and development workflows — not an Obsidian vault clipper, not a cloud summarizer. Page content is not sent to ContextForge servers.

**Public beta (non-developers):** download the ZIP and Load unpacked. Steps: [website](https://saras-tech-hq.github.io/contextforge/) · [release](https://github.com/saras-tech-hq/contextforge/releases/tag/v1.0.0-beta.1). This is **not** a Chrome Web Store or Edge Add-ons install.

## Principles

- **Local-first** — extract and copy stay on the device.
- **Dual interface** — browser extension + MCP server for agents.
- **Main-content extraction** — Readability + Turndown, not a kitchen-sink clipper.
- **Free** for extract, copy, and local last-result storage.
- **Honest limits** — `chrome://` pages, some PDFs, and some JS apps fail or yield short Markdown.

## Monorepo layout

```
chrome-extension/   Manifest V3 extension (Readability + Turndown)
mcp-server/         TypeScript MCP server (stdio first, official SDK)
shared/             Shared types and Markdown cleaning logic
docs/               Static marketing site (GitHub Pages)
workers/            Cloudflare Worker for Lemon Squeezy license checks
e2e/                Playwright browser tests
tools/              Build, packaging, and audit helpers
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Extension | Manifest V3, vanilla JS (small bundle) |
| Extraction | Mozilla Readability + Turndown.js |
| MCP | TypeScript + official MCP SDK (stdio) |
| Storage (free) | `chrome.storage.local`, bounded to the last extract |
| Auth / Pro | Not for sale. Worker path exists but is disabled in the Free manifest (no `host_permissions`). |

## Getting started (users)

1. Download [`contextforge-v1.0.0.zip`](https://github.com/saras-tech-hq/contextforge/releases/download/v1.0.0-beta.1/contextforge-v1.0.0.zip).
2. Extract it so you can see `manifest.json`.
3. Chrome: `chrome://extensions` · Edge: `edge://extensions` → Developer mode → **Load unpacked** → that folder.
4. Open an **https://** article → toolbar icon (or Alt+Shift+F) → Extract → Copy.

## Getting started (developers)

Requires Node.js 22.12+.

```bash
npm ci
npm run build
```

### Extension (from source)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select `chrome-extension/`.

The popup extracts the current tab: Readability article HTML → Turndown Markdown → copy / save `.md` locally. Only the most recent extract is persisted, capped at 500,000 characters so a large page cannot exhaust the storage quota.

### MCP server (stdio)

```bash
npm run build:shared
npm run build:mcp
```

Tools:

- `html_to_markdown` — `{ html, url?, stripLinks?, stripImages?, maxChars? }`
- `fetch_web_page` — `{ url, stripLinks?, stripImages?, maxChars? }` (http/https only)

Each tool returns the Markdown plus a JSON metadata block (`title`, `url`, `tokenEstimate`, `excerpt`, `extractedAt`).

Register locally (Cursor: `.cursor/mcp.json`; Claude Desktop: `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "contextforge": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/mcp-server/dist/index.js"]
    }
  }
}
```

A copy of this block lives in `examples/mcp.json`. Adjust `args` to your checkout path. The checked-in editor configs (`.cursor/mcp.json`, `opencode.json`, `examples/mcp.json`) use paths relative to the repo root; substitute an absolute path if your client requires one.

### Site

Static files in `docs/`. Preview:

```bash
npx --yes serve docs
```

### Pro licenses (disabled)

Core extract stays free and local. Prompt packing is gated in code but **not sold**. Do not add `host_permissions` until Pro is intentionally enabled. Notes: `workers/license-verify/README.md`.

Production-readiness notes (local, not a store submission): [`release/GO-NO-GO.md`](release/GO-NO-GO.md).

## Verification

```bash
npm test            # 39 unit and integration tests
npm run test:e2e    # 9 Playwright browser tests
npm run verify:build
powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-zip.ps1
```

## License

MIT — see [LICENSE](LICENSE). Core local extraction and storage remain free. Pro keys are not currently on sale.
