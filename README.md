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
landing/            Static marketing site
workers/            Cloudflare Worker for Lemon Squeezy license checks
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Extension | Manifest V3, vanilla JS (small bundle) |
| Extraction | Mozilla Readability + Turndown.js |
| MCP | TypeScript + official MCP SDK (stdio) |
| Storage (free) | `chrome.storage.local` + IndexedDB |
| Auth / Pro | Lemon Squeezy + Cloudflare Worker (`workers/license-verify`) |

## Getting started

Requires Node.js 18+.

```bash
npm install
```

### Extension (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select `chrome-extension/`.

The popup extracts the current tab: Readability article HTML → Turndown Markdown → copy / save locally.

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
      "args": ["D:/Project Tool/mcp-server/dist/index.js"]
    }
  }
}
```

A copy of this block lives in `examples/mcp.json`. Adjust `args` if the repo is not at `D:/Project Tool`.

### Landing

Static files in `landing/`. Preview:

```bash
npx --yes serve landing
```

Replace the Lemon Squeezy checkout URL in `landing/index.html` before shipping.

### Pro licenses (Lemon Squeezy + Cloudflare Worker)

Core extract stays free and local. Pro (prompt packing) is gated by a key validated **on the Worker**, never with a store API secret in the extension.

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

## License

MIT. Core local extraction and storage remain free. Pro keys are sold separately.
