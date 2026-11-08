import type { CleanOptions } from "./types.js";
/**
 * Token-efficient Markdown cleanup. No network.
 */
export declare function cleanMarkdown(markdown: string | null | undefined, options?: CleanOptions): string;
