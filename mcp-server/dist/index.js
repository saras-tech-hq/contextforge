#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { fetchWebPage, htmlToExtractedPage, pageToToolResult } from "./extract.js";
function cleanFrom(args) {
    return {
        stripLinks: args.stripLinks,
        stripImages: args.stripImages,
        maxChars: args.maxChars,
    };
}
const cleanProperties = {
    stripLinks: {
        type: "boolean",
        description: "Replace [text](url) with text",
    },
    stripImages: {
        type: "boolean",
        description: "Drop markdown images",
    },
    maxChars: {
        type: "number",
        description: "Truncate markdown after N characters",
    },
};
const server = new Server({ name: "contextforge", version: "0.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "html_to_markdown",
            description: "Convert raw HTML into clean, token-efficient Markdown (Readability + Turndown). Local-only. Optional url improves relative links.",
            inputSchema: {
                type: "object",
                properties: {
                    html: { type: "string", description: "Raw HTML document or fragment" },
                    url: { type: "string", description: "Page URL for base/relative links" },
                    ...cleanProperties,
                },
                required: ["html"],
            },
        },
        {
            name: "fetch_web_page",
            description: "Fetch an http(s) URL, extract the main article with Readability, convert to token-efficient Markdown, and return estimated token counts. Runs locally.",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "http(s) URL to fetch" },
                    ...cleanProperties,
                },
                required: ["url"],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {});
    try {
        if (name === "html_to_markdown") {
            if (!args.html) {
                throw new Error("html is required");
            }
            const page = htmlToExtractedPage(args.html, cleanFrom(args), args.url);
            return pageToToolResult(page);
        }
        if (name === "fetch_web_page") {
            if (!args.url) {
                throw new Error("url is required");
            }
            const page = await fetchWebPage(args.url, cleanFrom(args));
            return pageToToolResult(page);
        }
        return {
            isError: true,
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: "text", text: message }],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
