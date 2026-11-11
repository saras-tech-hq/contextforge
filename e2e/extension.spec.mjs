import { test, expect, chromium } from "@playwright/test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import http from "node:http";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_SRC = path.resolve(here, "..", "chrome-extension");
const PAGE_MARKER = "CF-E2E-PRIVATE-CONTENT-9f3a7c";
const GOOD_KEY = "E2E-TEST-LICENSE-0001";

const ARTICLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>E2E Article Title</title>
    <meta name="author" content="ContextForge QA" />
  </head>
  <body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <article>
      <h1>E2E Article Title</h1>
      <p>${PAGE_MARKER} — this paragraph proves the real Readability extraction path ran in Chromium.</p>
      <h2>Second section</h2>
      <p>Another paragraph with <strong>bold</strong>, <em>italic</em>, and a <a href="https://example.com/ref">reference link</a>. It contains enough prose for Readability to treat this article as the main document content instead of navigation chrome.</p>
      <ul><li>First item</li><li>Second item</li></ul>
      <pre><code>const answer = 42;
console.log(answer);</code></pre>
      <blockquote><p>Quoted sentence for Markdown conversion.</p></blockquote>
    </article>
    <footer>Footer noise that Readability should discard.</footer>
  </body>
</html>`;

test.describe.configure({ mode: "serial" });

let context;
let userDataDir;
let extDir;
let extensionId;
let articlePage;
let popup;
let articleOrigin = "";
let fixtureServer;
const allRequests = [];
const consoleMessages = [];
let clipboardReadAllowed = false;

function unpackedExtensionId(dir) {
  const hex = createHash("sha256").update(path.resolve(dir)).digest("hex").slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}

function stageTestExtension() {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "contextforge-ext-"));
  fs.cpSync(EXT_SRC, dest, { recursive: true });
  const manifestPath = path.join(dest, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.host_permissions = ["http://127.0.0.1/*"];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return dest;
}

async function resolveExtensionId(ctx) {
  let workers = ctx.serviceWorkers();
  if (workers.length === 0) {
    try {
      workers = [await ctx.waitForEvent("serviceworker", { timeout: 20_000 })];
    } catch {
      /* fall through */
    }
  }
  if (workers.length > 0) {
    return new URL(workers[0].url()).host;
  }
  return unpackedExtensionId(extDir);
}

async function waitForStatusSettled() {
  await popup.waitForFunction(
    () => {
      const text = document.getElementById("status")?.textContent || "";
      return text.length > 0 && text !== "Extracting…";
    },
    undefined,
    { timeout: 30_000 }
  );
}

async function extractActiveArticle() {
  await articlePage.bringToFront();
  await popup.evaluate(() => document.getElementById("extract").click());
  await waitForStatusSettled();
}

async function seedProLicense() {
  await popup.evaluate(async (key) => {
    await chrome.storage.local.set({
      proLicense: {
        valid: true,
        licenseKey: key,
        status: "active",
        instanceId: "e2e-instance-1",
        checkedAt: new Date().toISOString(),
        error: null,
      },
    });
  }, GOOD_KEY);
  await popup.reload();
  await expect(popup.locator("#pro-status")).toContainText("Pro active");
}

test("production manifest has no host_permissions", async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT_SRC, "manifest.json"), "utf8"));
  expect(manifest.host_permissions || []).toEqual([]);
  expect(manifest.permissions).toEqual(
    expect.arrayContaining(["activeTab", "scripting", "storage", "clipboardWrite"])
  );
});

test.beforeAll(async () => {
  fixtureServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(ARTICLE_HTML);
  });
  await new Promise((resolve) => fixtureServer.listen(0, "127.0.0.1", resolve));
  const { port } = fixtureServer.address();
  articleOrigin = `http://127.0.0.1:${port}`;

  extDir = stageTestExtension();
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "contextforge-e2e-"));

  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  context.on("request", (request) => {
    if (/^https?:/i.test(request.url())) {
      allRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
      });
    }
  });

  extensionId = await resolveExtensionId(context);

  articlePage = await context.newPage();
  articlePage.on("console", (message) =>
    consoleMessages.push(`[article] ${message.type()}: ${message.text()}`)
  );
  await articlePage.goto(`${articleOrigin}/article`);
  await expect(articlePage).toHaveTitle("E2E Article Title");

  popup = await context.newPage();
  popup.on("console", (message) =>
    consoleMessages.push(`[popup] ${message.type()}: ${message.text()}`)
  );
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup).toHaveTitle("ContextForge");
  await expect(popup.locator("#pro-status")).toContainText("Free tier");
  await articlePage.bringToFront();

  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: `chrome-extension://${extensionId}`,
    });
    clipboardReadAllowed = true;
  } catch (firstError) {
    try {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      clipboardReadAllowed = true;
    } catch {
      clipboardReadAllowed = false;
    }
  }
});

test.afterAll(async () => {
  await context?.close();
  if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
  if (extDir) fs.rmSync(extDir, { recursive: true, force: true });
  await new Promise((resolve) => fixtureServer?.close(resolve));
});

test("extension package loads and exposes the MV3 popup", async () => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(await popup.evaluate(() => chrome.runtime.getManifest().manifest_version)).toBe(3);
  const manifest = await popup.evaluate(() => chrome.runtime.getManifest());
  expect(manifest.permissions).toEqual(
    expect.arrayContaining(["activeTab", "scripting", "storage", "clipboardWrite"])
  );
  expect(manifest.version).toBe("1.0.0");
  expect(Object.keys(manifest.icons || {}).sort()).toEqual(["128", "16", "32", "48"]);
});

test("extracts the live Chromium page into Markdown and persists it", async () => {
  await extractActiveArticle();

  const output = await popup.evaluate(() => document.getElementById("output").value);
  expect(output).toContain("# E2E Article Title");
  expect(output).toContain(PAGE_MARKER);
  expect(output).toContain("Second section");
  expect(output).toMatch(/^- +First item$/m);
  expect(output).toContain("```");

  const tokens = await popup.textContent("#tokens");
  expect(tokens).toMatch(/~\d+ tokens/);

  const stored = await popup.evaluate(
    async () => (await chrome.storage.local.get("lastExtract")).lastExtract
  );
  expect(stored.markdown).toBe(output);
  expect(stored.url).toBe(`${articleOrigin}/article`);
  expect(stored.tokenEstimate).toBeGreaterThan(0);
  expect(stored.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("free tier gates prompt packing", async () => {
  expect(await popup.isDisabled("#pack")).toBe(true);
  const before = await popup.evaluate(() => document.getElementById("output").value);
  await popup.evaluate(() => document.getElementById("pack").click());
  const after = await popup.evaluate(() => document.getElementById("output").value);
  expect(after).toBe(before);
  expect(after.startsWith("Use the following webpage extract")).toBe(false);
});

test("copies the Markdown to the clipboard", async () => {
  const output = await popup.evaluate(() => document.getElementById("output").value);
  await popup.bringToFront();
  await popup.click("#copy");
  await expect(popup.locator("#status")).toHaveText("Copied");
  await popup.screenshot({ path: "artifacts/e2e-popup-extracted.png", fullPage: true });
  if (clipboardReadAllowed) {
    const clipboard = await popup.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.replace(/\r\n/g, "\n")).toBe(output.trim());
  }
});

test("Activate without a live license host fails closed", async () => {
  await popup.evaluate((key) => {
    document.getElementById("license-key").value = key;
  }, GOOD_KEY);
  await popup.evaluate(() => document.getElementById("activate").click());
  await expect(popup.locator("#pro-status")).toContainText("Free tier");
  expect(await popup.isDisabled("#pack")).toBe(true);
  const stored = await popup.evaluate(
    async () => (await chrome.storage.local.get("proLicense")).proLicense
  );
  expect(stored?.valid).toBeFalsy();
});

test("seeded Pro packs the extract as a prompt and writes it to the clipboard", async () => {
  await seedProLicense();
  await extractActiveArticle();
  expect(await popup.isDisabled("#pack")).toBe(false);
  await popup.bringToFront();
  await popup.click("#pack");
  await expect(popup.locator("#status")).toHaveText("Packed prompt copied");
  const packed = await popup.evaluate(() => document.getElementById("output").value);
  expect(packed.startsWith("Use the following webpage extract as context.")).toBe(true);
  expect(packed).toContain(PAGE_MARKER);
  if (clipboardReadAllowed) {
    const clipboard = await popup.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.replace(/\r\n/g, "\n")).toBe(packed);
  }
});

test("shows a real failure state when the active tab cannot be scripted", async () => {
  await articlePage.goto("about:blank");
  await extractActiveArticle();
  const status = await popup.textContent("#status");
  expect(status).not.toBe("Extracting…");
  expect(status).toMatch(/cannot|permission|access|denied|script|active tab|No active tab/i);
  expect(await popup.evaluate(() => document.getElementById("output").value)).toBe("");
  expect(await popup.isDisabled("#copy")).toBe(true);
});

test("no private page content leaks into network or logs", async () => {
  for (const request of allRequests) {
    expect(request.url).not.toContain(PAGE_MARKER);
    expect(String(request.postData || "")).not.toContain(PAGE_MARKER);
  }
  const joinedLogs = consoleMessages.join("\n");
  expect(joinedLogs).not.toContain(PAGE_MARKER);
  expect(joinedLogs).not.toContain(GOOD_KEY);
});
