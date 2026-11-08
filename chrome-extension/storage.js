/**
 * Bounded persistence for the last extract.
 *
 * `chrome.storage.local` has a fixed quota (about 10 MB by default on MV3).
 * A large page plus an unbounded Markdown body can exceed it and make the
 * whole extraction flow fail, so every write is capped and failures are
 * reported instead of thrown.
 */

export const STORAGE_KEY = "lastExtract";
export const MAX_STORED_MARKDOWN_CHARS = 500_000;
export const MAX_STORED_TITLE_CHARS = 300;
export const MAX_STORED_URL_CHARS = 2_048;

/**
 * Build the record that is safe to persist. Pure, so it can be unit tested.
 *
 * @param {object} page Result from articleHtmlToMarkdown (or equivalent).
 * @param {Date} [now] Injectable clock for deterministic tests.
 */
export function buildLastExtractRecord(page, now = new Date()) {
  const source = page || {};
  const markdown = String(source.markdown ?? "");
  const truncated = markdown.length > MAX_STORED_MARKDOWN_CHARS;

  return {
    title: String(source.title ?? "").slice(0, MAX_STORED_TITLE_CHARS),
    url: String(source.url ?? "").slice(0, MAX_STORED_URL_CHARS),
    markdown: truncated ? markdown.slice(0, MAX_STORED_MARKDOWN_CHARS) : markdown,
    tokenEstimate: Number.isFinite(source.tokenEstimate) ? source.tokenEstimate : 0,
    extractedAt: String(source.extractedAt || now.toISOString()),
    truncated,
  };
}

/**
 * Persist the last extract without letting storage errors break extraction.
 * Resolves to `{ ok, record, error? }` and never rejects.
 */
export async function saveLastExtract(page, storage) {
  const record = buildLastExtractRecord(page);
  const area = storage || (globalThis.chrome && chrome.storage && chrome.storage.local);
  if (!area || typeof area.set !== "function") {
    return { ok: false, record, error: "Storage unavailable" };
  }
  try {
    await area.set({ [STORAGE_KEY]: record });
    return { ok: true, record };
  } catch (error) {
    return {
      ok: false,
      record,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
