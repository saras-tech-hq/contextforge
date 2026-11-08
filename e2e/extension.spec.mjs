import { test, expect, chromium } from "@playwright/test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(here, "..", "chrome-extension");
const LICENSE_ORIGIN = "https://contextforge-license.example.workers.dev";
const LICENSE_HOST = new URL(LICENSE_ORIGIN).host;
const PAGE_MARKER = "CF-E2E-PRIVATE-CONTENT-9f3a7c";
const GOOD_KEY = "E2E-TEST-LICENSE-0001";
const BAD_KEY = "E2E-EXPIRED-LICENSE-0002";

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
let extensionId;
let articlePage;
let popup;
let mockLicense = {
  ok: true,
  valid: true,
  status: "active",
  instanceId: "e2e-instance-1",
  error: null,
};
const validateRequests = [];
const allRequests = [];
const consoleMessages = [];
let clipboardReadAllowed = false;

function unpackedExtensionId(dir) {
  const hex = createHash("sha256").update(path.resolve(dir)).digest("hex").slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}

async function resolveExtensionId(ctx) {
  let workers = ctx.serviceWorkers();
  if (workers.length === 0) {
    try {
      workers = [await ctx.waitForEvent("serviceworker", { timeout: 20_000 })];
    } catch {
      /* fall through to derived id */
    }
  }
  if (workers.length > 0) {
    return new URL(workers[0].url()).host;
  }
  return unpackedExtensionId(EXT_DIR);
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

test.beforeAll(async () => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "contextforge-e2e-"));

  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      // Fail closed if Playwright routing ever misses: never reach the live worker.
      `--host-resolver-rules=MAP ${LICENSE_HOST} 127.0.0.1`,
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

  // Intercept both the fixture page and the license endpoint. No live calls.
  await context.route(`${LICENSE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/validate") {
      validateRequests.push({
        method: request.method(),
        headers: request.headers(),
        body: request.postData(),
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockLicense),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: ARTICLE_HTML,
    });
  });

  extensionId = await resolveExtensionId(context);
  test.info().annotations.push({ type: "extension-id", description: extensionId });

  articlePage = await context.newPage();
  articlePage.on("console", (message) =>
    consoleMessages.push(`[article] ${message.type()}: ${message.text()}`)
  );
  await articlePage.goto(`${LICENSE_ORIGIN}/article`);
  await expect(articlePage).toHaveTitle("E2E Article Title");

  popup = await context.newPage();
  popup.on("console", (message) =>
    consoleMessages.push(`[popup] ${message.type()}: ${message.text()}`)
  );
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup).toHaveTitle("ContextForge");
  await expect(popup.locator("#pro-status")).toContainText("Free tier");

  // Keep the article tab active so chrome.tabs.query({active:true}) resolves to it.
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
      test
        .info()
        .annotations.push({
          type: "clipboard-read-unavailable",
          description: String(firstError),
        });
    }
  }
});

test.afterAll(async () => {
  await context?.close();
  if (userDataDir) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
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
  expect(manifest.action?.default_icon?.["16"]).toBe("icons/icon16.png");
});

test("extracts the live Chromium page into Markdown and persists it", async () => {
  await articlePage.bringToFront();
  await popup.evaluate(() => document.getElementById("extract").click());
  await waitForStatusSettled();

  const output = await popup.evaluate(() => document.getElementById("output").value);
  expect(output).toContain("# E2E Article Title");
  expect(output).toContain(PAGE_MARKER);
  expect(output).toContain("Second section");
  expect(output).toMatch(/^- +First item$/m);
  expect(output).toContain("```");
  expect(output).not.toContain("<p>");
  expect(output).not.toContain("Footer noise");

  expect(await popup.textContent("#status")).toBe("E2E Article Title");
  expect(await popup.textContent("#tokens")).toMatch(/^~\d+ tokens$/);
  expect(await popup.isDisabled("#copy")).toBe(false);

  const stored = await popup.evaluate(
    async () => (await chrome.storage.local.get("lastExtract")).lastExtract
  );
  expect(stored.markdown).toBe(output);
  expect(stored.url).toBe(`${LICENSE_ORIGIN}/article`);
  expect(stored.tokenEstimate).toBeGreaterThan(0);
  expect(stored.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("free tier gates prompt packing", async () => {
  expect(await popup.isDisabled("#pack")).toBe(true);
  expect(await popup.getAttribute("#pack", "title")).toBe("Pro: wrap as an AI prompt");

  const before = await popup.evaluate(() => document.getElementById("output").value);
  await popup.evaluate(() => document.getElementById("pack").click());
  const after = await popup.evaluate(() => document.getElementById("output").value);

  expect(after).toBe(before);
  expect(after.startsWith("Use the following webpage extract")).toBe(false);
  expect(await popup.textContent("#status")).not.toBe("Packed prompt copied");
});

test("copies the Markdown to the clipboard", async () => {
  const output = await popup.evaluate(() => document.getElementById("output").value);
  await popup.bringToFront();
  await popup.click("#copy");
  await expect(popup.locator("#status")).toHaveText("Copied");
  await popup.screenshot({ path: "artifacts/e2e-popup-extracted.png", fullPage: true });

  if (clipboardReadAllowed) {
    const clipboard = await popup.evaluate(() => navigator.clipboard.readText());
    // Windows normalizes clipboard line endings to CRLF; the Markdown model uses LF.
    expect(clipboard.replace(/\r\n/g, "\n")).toBe(output.trim());
  } else {
    // The write promise resolved (no thrown error) and status is "Copied".
    expect(await popup.evaluate(() => document.getElementById("status").textContent)).toBe(
      "Copied"
    );
  }
});

test("activates a mocked license, gates pack, and persists across reload", async () => {
  mockLicense = {
    ok: true,
    valid: true,
    status: "active",
    instanceId: "e2e-instance-1",
    error: null,
  };

  await popup.evaluate((key) => {
    document.getElementById("license-key").value = key;
  }, GOOD_KEY);
  await popup.evaluate(() => document.getElementById("activate").click());
  await expect(popup.locator("#pro-status")).toContainText("Pro active");
  expect(await popup.evaluate(() => document.getElementById("license-key").value)).toBe("");

  const stored = await popup.evaluate(
    async () => (await chrome.storage.local.get("proLicense")).proLicense
  );
  expect(stored.valid).toBe(true);
  expect(stored.status).toBe("active");
  expect(stored.licenseKey).toBe(GOOD_KEY);

  const request = validateRequests.at(-1);
  expect(request, "license validation request must be intercepted").toBeTruthy();
  expect(request.method).toBe("POST");
  expect(JSON.parse(request.body)).toEqual({
    licenseKey: GOOD_KEY,
    instanceName: "ContextForge",
  });
  expect(request.body).not.toContain(PAGE_MARKER);

  // Reload: the popup must read the persisted license back from chrome.storage.
  await popup.reload();
  await expect(popup.locator("#pro-status")).toContainText("Pro active");
  const afterReload = await popup.evaluate(
    async () => (await chrome.storage.local.get("proLicense")).proLicense
  );
  expect(afterReload.valid).toBe(true);
  expect(afterReload.instanceId).toBe("e2e-instance-1");
});

test("Pro packs the extract as a prompt and writes it to the clipboard", async () => {
  await articlePage.bringToFront();
  await popup.evaluate(() => document.getElementById("extract").click());
  await waitForStatusSettled();

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

test("rejected license returns the popup to the free tier", async () => {
  mockLicense = {
    ok: true,
    valid: false,
    status: "inactive",
    instanceId: null,
    error: "License inactive",
  };

  await popup.evaluate((key) => {
    document.getElementById("license-key").value = key;
  }, BAD_KEY);
  await popup.evaluate(() => document.getElementById("activate").click());
  await expect(popup.locator("#pro-status")).toContainText("Free tier");
  await expect(popup.locator("#status")).toHaveText("License inactive");
  expect(await popup.isDisabled("#pack")).toBe(true);

  const stored = await popup.evaluate(
    async () => (await chrome.storage.local.get("proLicense")).proLicense
  );
  expect(stored.valid).toBe(false);
  expect(stored.licenseKey).toBe("");
});

test("shows a real failure state when the active tab cannot be scripted", async () => {
  await articlePage.goto("about:blank");
  await articlePage.bringToFront();
  await popup.evaluate(() => document.getElementById("extract").click());
  await waitForStatusSettled();

  const status = await popup.textContent("#status");
  expect(status).not.toBe("Extracting…");
  expect(status).toMatch(/cannot|permission|access|denied|script|active tab/i);

  expect(await popup.evaluate(() => document.getElementById("output").value)).toBe("");
  expect(await popup.textContent("#tokens")).toBe("");
  expect(await popup.isDisabled("#copy")).toBe(true);
  expect(await popup.isDisabled("#pack")).toBe(true);
});

test("no private page content or license key leaks into network, logs, or DOM", async () => {
  const httpRequests = allRequests.filter((request) => /^https?:/i.test(request.url));
  const hosts = [...new Set(httpRequests.map((request) => new URL(request.url).host))];
  expect(hosts).toEqual([LICENSE_HOST]);

  for (const request of httpRequests) {
    expect(request.url).not.toContain(PAGE_MARKER);
  }

  expect(validateRequests.length).toBeGreaterThanOrEqual(2);
  for (const request of validateRequests) {
    const payload = JSON.parse(request.body);
    expect(Object.keys(payload).sort()).toEqual(["instanceName", "licenseKey"]);
    expect(request.body).not.toContain(PAGE_MARKER);
    expect(request.body).not.toContain("Readability extraction path");
  }

  const joinedLogs = consoleMessages.join("\n");
  expect(joinedLogs).not.toContain(PAGE_MARKER);
  expect(joinedLogs).not.toContain(GOOD_KEY);
  expect(joinedLogs).not.toContain(BAD_KEY);

  const storage = await popup.evaluate(async () => await chrome.storage.local.get(null));
  expect(Object.keys(storage).sort()).toEqual(["lastExtract", "proLicense"]);
  expect(JSON.stringify(storage.proLicense)).not.toContain(PAGE_MARKER);
  expect(storage.proLicense.licenseKey).toBe("");
  expect(storage.lastExtract.markdown).toContain(PAGE_MARKER);
  expect(storage.lastExtract.markdown).not.toContain(GOOD_KEY);

  const domText = await popup.evaluate(() => document.body.innerText);
  expect(domText).not.toContain(GOOD_KEY);
  expect(domText).not.toContain(BAD_KEY);

  const output = await popup.evaluate(() => document.getElementById("output").value);
  expect(output).not.toContain(GOOD_KEY);
  expect(output).not.toContain(BAD_KEY);
});
