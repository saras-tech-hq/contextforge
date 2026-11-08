import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import {
  cleanMarkdown,
  documentToMarkdown,
  type CleanOptions,
  type ExtractDeps,
  type ExtractedPage,
} from "@contextforge/shared";

const deps: ExtractDeps = {
  Readability: Readability as unknown as ExtractDeps["Readability"],
  TurndownService: TurndownService as unknown as ExtractDeps["TurndownService"],
};

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_MS = 20_000;
const UA = "ContextForge/0.1 (local MCP; +https://localhost)";

export function assertHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http: and https: URLs are allowed");
  }
  return parsed;
}

export function htmlToExtractedPage(
  html: string,
  options: CleanOptions = {},
  url?: string
): ExtractedPage {
  const base = url || "https://local.invalid/";
  if (url) assertHttpUrl(url);
  const dom = new JSDOM(html, { url: base });
  const page = documentToMarkdown(dom.window.document, deps, options, url);
  return {
    ...page,
    markdown: cleanMarkdown(page.markdown, options),
  };
}

export async function fetchWebPage(
  url: string,
  options: CleanOptions = {}
): Promise<ExtractedPage> {
  const parsed = assertHttpUrl(url);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_MS);
  try {
    const res = await fetch(parsed, {
      signal: ac.signal,
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "User-Agent": UA },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_BYTES) {
      throw new Error("Response too large");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      throw new Error("Response too large");
    }
    const html = buf.toString("utf8");
    return htmlToExtractedPage(html, options, res.url || parsed.href);
  } finally {
    clearTimeout(timer);
  }
}

export function pageToToolResult(page: ExtractedPage) {
  const meta = {
    title: page.title,
    url: page.url ?? null,
    tokenEstimate: page.tokenEstimate,
    excerpt: page.excerpt ?? null,
    extractedAt: page.extractedAt,
  };
  return {
    content: [
      { type: "text" as const, text: page.markdown },
      { type: "text" as const, text: JSON.stringify(meta, null, 2) },
    ],
  };
}
