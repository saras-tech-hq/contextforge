import TurndownService from "./lib/turndown.js";
import { articleHtmlToMarkdown } from "./lib/shared/htmlToMarkdown.js";
import { cleanMarkdown } from "./lib/shared/cleanMarkdown.js";
import { estimateTokens } from "./lib/shared/estimateTokens.js";
import { activateLicense, getLicenseState, isPro } from "./license.js";

const extractBtn = document.getElementById("extract");
const copyBtn = document.getElementById("copy");
const packBtn = document.getElementById("pack");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");
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
    : "Free tier — core extract is unlimited. Pro unlocks prompt packing.";
}

function updateTokenLabel() {
  const n = estimateTokens(output.value);
  tokensEl.textContent = n ? `~${n} tokens` : "";
}

const extractDeps = { TurndownService, Readability: class {} };

output.addEventListener("input", async () => {
  updateTokenLabel();
  copyBtn.disabled = !output.value;
  packBtn.disabled = !(await isPro()) || !output.value;
});

extractBtn.addEventListener("click", async () => {
  statusEl.textContent = "Extracting…";
  copyBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
    statusEl.textContent = page.title || "Done";
    copyBtn.disabled = !page.markdown;
    packBtn.disabled = !(await isPro()) || !page.markdown;

    await chrome.storage.local.set({ lastExtract: page });
  } catch (err) {
    statusEl.textContent = err.message || String(err);
  }
});

copyBtn.addEventListener("click", async () => {
  const md = cleanMarkdown(output.value);
  await navigator.clipboard.writeText(md);
  statusEl.textContent = "Copied";
});

packBtn.addEventListener("click", async () => {
  if (!(await isPro())) {
    statusEl.textContent = "Pro required";
    return;
  }
  const md = cleanMarkdown(output.value);
  const packed = `Use the following webpage extract as context. Stay within the source; do not invent facts.\n\n${md}`;
  output.value = packed;
  updateTokenLabel();
  await navigator.clipboard.writeText(packed);
  statusEl.textContent = "Packed prompt copied";
});

activateBtn.addEventListener("click", async () => {
  activateBtn.disabled = true;
  proStatus.textContent = "Checking license…";
  try {
    const state = await activateLicense(licenseInput.value);
    if (state.valid) {
      licenseInput.value = "";
      statusEl.textContent = "Pro unlocked";
    } else {
      statusEl.textContent = state.error || "Invalid license";
    }
  } catch (err) {
    statusEl.textContent = err.message || String(err);
  } finally {
    activateBtn.disabled = false;
    await refreshProUi();
  }
});

refreshProUi();

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
