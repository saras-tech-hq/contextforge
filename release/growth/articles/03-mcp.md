# Draft: Webpage-to-Markdown over MCP without a SaaS

**Status:** unpublished draft

Cursor and Claude Desktop can run a local stdio MCP server. ContextForge’s server exposes `html_to_markdown` and `fetch_web_page` (http/https only, 20s, 5 MB). `file:` URLs are rejected.

This is for agents that already have HTML or a URL, not a replacement for the toolbar popup.

See `examples/mcp.json` in the repo.
