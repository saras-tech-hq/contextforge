import TurndownService from "./lib/turndown.js";
import { articleHtmlToMarkdown } from "./lib/shared/htmlToMarkdown.js";
import { cleanMarkdown } from "./lib/shared/cleanMarkdown.js";
import { estimateTokens } from "./lib/shared/estimateTokens.js";
import { activateLicense, getLicenseState, isPro } from "./license.js";
import { saveLastExtract } from "./storage.js";

const extractBtn = document.getElementById("extract");
const copyBtn = document.getElementById("copy");
const downloadBtn = document.getElementById("download");
const packBtn = document.getElementById("pack");
const shareBtn = document.getElementById("share-product");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");
const PRODUCT_URL = "https://saras-tech-hq.github.io/contextforge/";

function friendlyExtractError(err, tabUrl) {
  const msg = String(err?.message || err);
  const url = String(tabUrl || "");
  if (/^(chrome|edge|about|devtools):/i.test(url) || /chromewebstore|microsoftedge\.microsoft\.com\/addons/i.test(url)) {
    return "This page cannot be read. Open a normal https:// article, then Extract.";
  }
  if (/Cannot access contents of the page|must request permission|Cannot access|The extensions gallery/i.test(msg)) {
    return "This page cannot be read. Open a normal https:// article, then Extract.";
  }
  if (/No active tab/i.test(msg)) {
    return "No active tab. Click a webpage, then open ContextForge again.";
  }
  return msg;
}

function setOutputButtons(enabled) {
  copyBtn.disabled = !enabled;
  if (downloadBtn) downloadBtn.disabled = !enabled;
}
// DOM elements
const proStatus = document.getElementById("pro-status");
const licenseInput = document.getElementById("license-key");
const activateBtn = document.getElementById("activate");

async function refreshProUi() {
  const pro = await isPro();
  const state = await getLicenseState();
  packBtn.disabled = !pro || !output.value;
  proStatus.textContent = pro
    ? `Pro active (${state.status || "active"})`
    : "Free tier — core extract is unlimited. Prompt packing is not for sale.";
}

function updateTokenLabel() {
  const n = estimateTokens(output.value);
  tokensEl.textContent = n ? `~${n} tokens` : "";
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", kind === "ok");
  statusEl.classList.toggle("error", kind === "error");
}

const extractDeps = { TurndownService, Readability: class {} };

output.addEventListener("input", async () => {
  updateTokenLabel();
  setOutputButtons(Boolean(output.value));
  packBtn.disabled = !(await isPro()) || !output.value;
});

extractBtn.addEventListener("click", async () => {
  setStatus("Extracting…");
  setOutputButtons(false);

  let tabUrl = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl = tab?.url || "";
    if (!tab?.id) throw new Error("No active tab");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/Readability.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractArticleInPage,
    });

    if (!result?.ok) throw new Error(result?.error || "Extraction failed");

    const page = articleHtmlToMarkdown(
      {
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
      },
      extractDeps,
      {},
      tab.url
    );

    output.value = page.markdown;
    updateTokenLabel();
    setStatus(page.title || "Done", "ok");
    setOutputButtons(Boolean(page.markdown));
    packBtn.disabled = !(await isPro()) || !page.markdown;

    const saved = await saveLastExtract(page);
    if (!saved.ok) {
      // Extraction already succeeded; a storage failure must not hide the result.
      console.warn("ContextForge: could not persist last extract:", saved.error);
    }
  } catch (err) {
    // Never leave a previous page's Markdown looking like the current result.
    output.value = "";
    updateTokenLabel();
    setOutputButtons(false);
    packBtn.disabled = true;
    setStatus(friendlyExtractError(err, tabUrl), "error");
  }
});

async function copyText(text, okLabel) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(okLabel, "ok");
  } catch {
    output.select();
    setStatus("Clipboard blocked — press Ctrl+C (or Cmd+C) to copy.", "error");
  }
}

copyBtn.addEventListener("click", async () => {
  await copyText(cleanMarkdown(output.value), "Copied");
});

downloadBtn?.addEventListener("click", () => {
  const md = cleanMarkdown(output.value);
  if (!md) return;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contextforge.md";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Saved contextforge.md", "ok");
});

shareBtn?.addEventListener("click", async () => {
  await copyText(PRODUCT_URL, "Product link copied");
});

packBtn.addEventListener("click", async () => {
  if (!(await isPro())) {
    setStatus("Pro required", "error");
    return;
  }
  const md = cleanMarkdown(output.value);
  const packed = `Use the following webpage extract as context. Stay within the source; do not invent facts.\n\n${md}`;
  output.value = packed;
  updateTokenLabel();
  await copyText(packed, "Packed prompt copied");
});

activateBtn.addEventListener("click", async () => {
  activateBtn.disabled = true;
  proStatus.textContent = "Checking license…";
  try {
    const state = await activateLicense(licenseInput.value);
    if (state.valid) {
      licenseInput.value = "";
      setStatus("Pro unlocked", "ok");
    } else {
      setStatus(state.error || "Invalid license", "error");
    }
  } catch (err) {
    setStatus(err.message || String(err), "error");
  } finally {
    activateBtn.disabled = false;
    await refreshProUi();
  }
});

refreshProUi();

const onboard = document.getElementById("onboarding");
const dismissOnboard = document.getElementById("dismiss-onboarding");
const ONBOARD_KEY = "onboardingDismissed";
chrome.storage.local.get(ONBOARD_KEY).then((stored) => {
  if (!stored[ONBOARD_KEY] && onboard) onboard.hidden = false;
});
dismissOnboard?.addEventListener("click", async () => {
  if (onboard) onboard.hidden = true;
  await chrome.storage.local.set({ [ONBOARD_KEY]: true });
});

/**
 * Isolated world after Readability.js is injected. Clones the document so
 * Readability can mutate safely, then returns article HTML (not Markdown).
 */
function extractArticleInPage() {
  try {
    const Readability = globalThis.Readability;
    if (typeof Readability !== "function") {
      return { ok: false, error: "Readability is not available in the page" };
    }
    const clone = document.cloneNode(true);
    const article = new Readability(clone).parse();
    const title = (article && article.title) || document.title || "";
    const content =
      (article && article.content) ||
      (document.body && document.body.innerHTML) ||
      "";
    const excerpt = (article && article.excerpt) || "";
    return { ok: true, title, content, excerpt };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
