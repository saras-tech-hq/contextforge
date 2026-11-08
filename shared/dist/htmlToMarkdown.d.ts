import type { ArticleHtml, CleanOptions, ExtractDeps, ExtractedPage } from "./types.js";
/**
 * Run Mozilla Readability on a Document, then Turndown + cleanMarkdown.
 */
export declare function documentToMarkdown(document: Document, deps: ExtractDeps, options?: CleanOptions, url?: string): ExtractedPage;
/**
 * Convert Readability article HTML to cleaned Markdown.
 */
export declare function articleHtmlToMarkdown(article: ArticleHtml, deps: ExtractDeps, options?: CleanOptions, url?: string): ExtractedPage;
