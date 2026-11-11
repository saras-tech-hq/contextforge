# GitHub Release draft (do not publish)

**Tag (proposal):** `v1.0.0-rc.1`  
**Title:** ContextForge 1.0.0-rc.1 — Free local extract

## Notes

Local-first Chrome/Edge MV3 extension and MCP server. Extract the current page to Markdown, copy it, keep the last result on device.

Pro prompt packing is **not for sale**. No telemetry.

### Install

1. Download `contextforge-v1.0.0.zip` (SHA-256 `75606931066415ab734d9d13cf0dd4d7ef42e88b6c23bb3b05747d17171a7885`).
2. Unzip.
3. Chrome `chrome://extensions` or Edge `edge://extensions` → Developer mode → Load unpacked.

Issues: https://github.com/saras-tech-hq/contextforge/issues

### Limitations

Toolbar extract in this RC is designed for user-invoked `activeTab`. Store listings are not submitted. Huge pages are truncated at 500k characters in storage.
