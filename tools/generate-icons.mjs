import { chromium } from "@playwright/test";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const iconDir = path.join(root, "chrome-extension", "icons");
const svg = readFileSync(path.join(iconDir, "icon.svg"), "utf8");
const sizes = [16, 32, 48, 128];

const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const size of sizes) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><head><style>
        html,body{margin:0;padding:0;background:transparent}
        svg{display:block;width:${size}px;height:${size}px}
      </style></head><body>${svg}</body></html>`
    );
    const out = path.join(iconDir, `icon${size}.png`);
    await page.screenshot({
      path: out,
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    console.log(`${path.relative(root, out)} ${statSync(out).size} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
}
