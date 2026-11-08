import type { CleanOptions } from "./types.js";

/**
 * Token-efficient Markdown cleanup. No network.
 */
export function cleanMarkdown(
  markdown: string | null | undefined,
  options: CleanOptions = {}
): string {
  if (!markdown) return "";

  let out = markdown.replace(/\r\n/g, "\n");

  out = out.replace(/\n{3,}/g, "\n\n");

  if (options.stripImages) {
    out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  }

  if (options.stripLinks) {
    out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  }

  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();

  if (options.maxChars && out.length > options.maxChars) {
    out = out.slice(0, options.maxChars).trimEnd() + "\n\n[truncated]";
  }

  return out;
}
