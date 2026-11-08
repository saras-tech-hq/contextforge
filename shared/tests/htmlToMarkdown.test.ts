import { describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import {
  articleHtmlToMarkdown,
  documentToMarkdown,
} from "../src/htmlToMarkdown.js";
import type { ExtractDeps } from "../src/types.js";

const deps: ExtractDeps = {
  Readability: Readability as unknown as ExtractDeps["Readability"],
  TurndownService: TurndownService as unknown as ExtractDeps["TurndownService"],
};

function docFromHtml(html: string): Document {
  return new JSDOM(html).window.document;
}

describe("htmlToMarkdown", () => {
  describe("documentToMarkdown", () => {
    test("extracts title and content from a simple document", () => {
      const doc = docFromHtml(
        `<!doctype html><html><head><title>Test Title</title></head><body>
          <article><h1>Test Title</h1><p>Test content here.</p></article>
        </body></html>`
      );
      const result = documentToMarkdown(doc, deps);
      expect(result.title).toBe("Test Title");
      expect(result.markdown).toContain("Test content");
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    test("falls back to document title when article has no title", () => {
      const doc = docFromHtml(
        `<!doctype html><html><head><title>Fallback Title</title></head><body>
          <p>Just content, no heading.</p>
        </body></html>`
      );
      const result = documentToMarkdown(doc, deps);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.toLowerCase()).toContain("just content");
    });
  });

  describe("articleHtmlToMarkdown", () => {
    test("converts article HTML to Markdown with heading", () => {
      const result = articleHtmlToMarkdown(
        {
          title: "Test Article",
          content: "<p>Test content</p>",
          excerpt: "Test excerpt",
        },
        deps
      );
      expect(result.title).toBe("Test Article");
      expect(result.markdown).toContain("# Test Article");
      expect(result.markdown).toContain("Test content");
      expect(result.excerpt).toBe("Test excerpt");
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    test("handles empty content", () => {
      const result = articleHtmlToMarkdown(
        { title: "Test", content: "", excerpt: "" },
        deps
      );
      expect(result.title).toBe("Test");
      expect(result.markdown).toBe("# Test");
      expect(result.markdown).not.toMatch(/<p>/);
    });
  });
});
