# Monetization architecture (Phase 9) — DISABLED

Do not activate.

## Free vs Pro (as implemented)

| Free | Pro (code exists, not sold) |
| --- | --- |
| Extract, edit, copy, last-extract storage, MCP | Pack prompt after `isPro()` |

## License model

Extension POSTs key to Worker `/validate`. Worker would call Lemon Squeezy. Secrets stay on Worker. 30-day local TTL then stale → not Pro.

## Costs (₹0 now)

Lemon Squeezy fees, Cloudflare Worker, domain — all unused.

## Abuse

Rate-limit would live on Worker. Extension fail-closed if Worker missing.

**Keep checkout, Worker deploy, and API keys off until a separate paid phase.**
