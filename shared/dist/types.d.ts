export type CleanOptions = {
    stripLinks?: boolean;
    stripImages?: boolean;
    maxChars?: number;
};
export type ExtractedPage = {
    url?: string;
    title: string;
    markdown: string;
    tokenEstimate: number;
    extractedAt: string;
    excerpt?: string;
};
export type ArticleHtml = {
    title: string;
    content: string;
    excerpt?: string;
};
/** Constructors injected so the same pipeline runs in Node (jsdom) and the browser. */
export type ExtractDeps = {
    Readability: new (document: Document, options?: Record<string, unknown>) => {
        parse(): {
            title?: string | null;
            content?: string | null;
            excerpt?: string | null;
        } | null;
    };
    TurndownService: new (options?: Record<string, unknown>) => {
        turndown(html: string): string;
    };
};
