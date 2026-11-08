import { cleanMarkdown } from "./cleanMarkdown.js";
import { estimateTokens } from "./estimateTokens.js";
const TURNDOWN_OPTS = {
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
};
/**
 * Run Mozilla Readability on a Document, then Turndown + cleanMarkdown.
 */
export function documentToMarkdown(document, deps, options = {}, url) {
    const clone = document.cloneNode(true);
    const article = new deps.Readability(clone).parse();
    const title = (article?.title && article.title.trim()) || document.title || "";
    const contentHtml = article?.content || document.body?.innerHTML || "";
    return articleHtmlToMarkdown({ title, content: contentHtml, excerpt: article?.excerpt || undefined }, deps, options, url);
}
/**
 * Convert Readability article HTML to cleaned Markdown.
 */
export function articleHtmlToMarkdown(article, deps, options = {}, url) {
    const turndown = new deps.TurndownService(TURNDOWN_OPTS);
    const body = turndown.turndown(article.content || "");
    const heading = article.title ? `# ${article.title}\n\n` : "";
    const markdown = cleanMarkdown(heading + body, options);
    return {
        url,
        title: article.title || "",
        markdown,
        tokenEstimate: estimateTokens(markdown),
        extractedAt: new Date().toISOString(),
        excerpt: article.excerpt,
    };
}
