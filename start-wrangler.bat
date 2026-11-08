@echo off
cd /d "%~dp0workers\license-verify"
npx wrangler dev --port 8787
