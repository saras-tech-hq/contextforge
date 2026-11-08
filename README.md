# ContextForge

Local-first Chrome/Edge (Manifest V3) extension **and** MCP server that turns any webpage into clean, token-efficient Markdown context for AI tools (ChatGPT, Claude, Gemini, Cursor, and others).

## Principles

- **Local-first by default** — data stays on device unless you opt into cloud.
- **Dual interface** — polished browser extension + MCP server for agents.
- **Extraction quality + token efficiency** — not feature bloat.
- **Free forever** for core local features.
- **Model-agnostic and UI-agnostic**.

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
| Auth / Pro | Lemon Squeezy + Cloudflare Worker (`workers/license-verify`) |

## Getting started

Requires Node.js 22.12+.

```bash
npm install
npm run build
```

### Extension (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select `chrome-extension/`.

The popup extracts the current tab: Readability article HTML → Turndown Markdown → copy / save locally. Only the most recent extract is persisted, capped at 500,000 characters so a large page cannot exhaust the storage quota.

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

### Pro licenses (Lemon Squeezy + Cloudflare Worker)

Core extract stays free and local. Pro (prompt packing) is gated by a key validated **on the Worker**, never with a store API secret in the extension. Pro checkout is not open yet; this section documents the opt-in deployment path.

1. Enable license keys on a Lemon Squeezy product; create an API key.
2. Deploy:

```bash
cd workers/license-verify
npx wrangler login
npx wrangler secret put LEMON_SQUEEZY_API_KEY
npx wrangler deploy
```

3. Set `LICENSE_API_URL` in `chrome-extension/config.js` and the same origin in `manifest.json` `host_permissions`.
4. Full notes: `workers/license-verify/README.md`.

## Verification

```bash
npm test            # 36 unit and integration tests
npm run test:e2e    # 9 Playwright browser tests
npm run verify:build
powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-zip.ps1
```

## License

MIT — see [LICENSE](LICENSE). Core local extraction and storage remain free. Pro keys are separate and are not currently on sale.
