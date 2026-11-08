# ContextForge license worker (Lemon Squeezy)

Cloudflare Worker that validates Pro keys so the Lemon Squeezy API secret never ships in the extension.

## 1. Lemon Squeezy

1. Create a store and a **Pro** product with **license keys** enabled.
2. Copy a store **API key** (Settings → API).
3. Copy the checkout / buy URL into `landing/index.html` (replace `REPLACE_ME`).

## 2. Deploy

```bash
cd workers/license-verify
npx wrangler login
npx wrangler secret put LEMON_SQUEEZY_API_KEY
# optional: chrome-extension://<your-extension-id>
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler deploy
```

Note the Worker URL, e.g. `https://contextforge-license.<account>.workers.dev`.

## 3. Point the extension at it

Edit `chrome-extension/config.js`:

```js
export const LICENSE_API_URL = "https://contextforge-license.<account>.workers.dev";
```

Add the same origin to `manifest.json` → `host_permissions`.

Reload the unpacked extension. Paste a license in the popup → **Activate Pro**.

## Endpoint

`POST /validate`

```json
{ "licenseKey": "…", "instanceName": "ContextForge" }
```

```json
{ "ok": true, "valid": true, "status": "active", "instanceId": "…", "error": null }
```
