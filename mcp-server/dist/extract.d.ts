import { type CleanOptions, type ExtractedPage } from "@contextforge/shared";
export declare function assertHttpUrl(raw: string): URL;
export declare function htmlToExtractedPage(html: string, options?: CleanOptions, url?: string): ExtractedPage;
export declare function fetchWebPage(url: string, options?: CleanOptions): Promise<ExtractedPage>;
export declare function pageToToolResult(page: ExtractedPage): {
    content: {
        type: "text";
        text: string;
    }[];
};
