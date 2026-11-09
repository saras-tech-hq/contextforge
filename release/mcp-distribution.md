# MCP distribution (Phase 6)

**Do not publish to npm.**

Package: `@contextforge/mcp-server` v1.0.0, `private: true`, bin `contextforge-mcp` → `dist/index.js`.

Transport: stdio, official SDK.

## Install (local)

```bat
npm ci
npm run build:mcp
```

Client config: `examples/mcp.json` with an **absolute** path to `mcp-server/dist/index.js`.

## Limits (code)

- URL protocol http/https only (`assertHttpUrl`).
- Fetch timeout 20s, body cap 5MB.

## Client tests

Automated: Vitest MCP client over stdio (`mcp-server/tests/integration.test.ts`).

Manual Cursor/Claude Desktop: **BLOCKED** unless those apps are installed on this machine.

## Registry

Publishing `@contextforge/mcp-server` is owner-gated. Keep `private: true` until then.
