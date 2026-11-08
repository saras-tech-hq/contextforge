import { describe, expect, test } from "vitest";
import { cleanMarkdown } from "../src/cleanMarkdown.js";

const TRUNCATION_SUFFIX = "\n\n[truncated]";

describe("cleanMarkdown", () => {
  test("returns empty string for null/undefined input", () => {
    expect(cleanMarkdown(null)).toBe("");
    expect(cleanMarkdown(undefined)).toBe("");
  });

  test("removes extra newlines", () => {
    const input = "line1\n\n\n\nline2\n\nline3";
    expect(cleanMarkdown(input)).toBe("line1\n\nline2\n\nline3");
  });

  test("strips images when stripImages option is true", () => {
    const input = "![alt text](image.png)\nsome text";
    expect(cleanMarkdown(input, { stripImages: true })).toBe("some text");
  });

  test("strips link text keeping URL text when stripLinks option is true", () => {
    const input = "[link text](http://example.com)\nsome text";
    expect(cleanMarkdown(input, { stripLinks: true })).toBe("link text\nsome text");
  });

  test("truncates at maxChars when option provided", () => {
    const longText = "A".repeat(500);
    const maxChars = 100;
    const result = cleanMarkdown(longText, { maxChars });
    expect(result.endsWith(TRUNCATION_SUFFIX)).toBe(true);
    const body = result.slice(0, result.length - TRUNCATION_SUFFIX.length);
    expect(body.length).toBeLessThanOrEqual(maxChars);
    expect(body).toBe("A".repeat(maxChars));
    expect(result.length).toBe(maxChars + TRUNCATION_SUFFIX.length);
  });

  test("trims leading/trailing whitespace", () => {
    const input = "  \n  hello  \n  \n ";
    expect(cleanMarkdown(input)).toBe("hello");
  });

  test("handles single newline correctly", () => {
    expect(cleanMarkdown("hello")).toBe("hello");
  });
});
