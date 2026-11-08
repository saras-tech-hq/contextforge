import { describe, expect, test } from "vitest";
import {
  MAX_STORED_MARKDOWN_CHARS,
  MAX_STORED_TITLE_CHARS,
  MAX_STORED_URL_CHARS,
  STORAGE_KEY,
  buildLastExtractRecord,
  saveLastExtract,
} from "../storage.js";

const fixedNow = new Date("2026-01-02T03:04:05.000Z");

describe("bounded last-extract storage", () => {
  test("keeps short extracts intact", () => {
    const record = buildLastExtractRecord(
      {
        title: "Example",
        url: "https://example.com/page",
        markdown: "# Example\n\nBody",
        tokenEstimate: 7,
        extractedAt: "2026-01-01T00:00:00.000Z",
      },
      fixedNow
    );

    expect(record.markdown).toBe("# Example\n\nBody");
    expect(record.title).toBe("Example");
    expect(record.url).toBe("https://example.com/page");
    expect(record.tokenEstimate).toBe(7);
    expect(record.extractedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(record.truncated).toBe(false);
  });

  test("caps markdown at the storage limit and flags truncation", () => {
    const markdown = "x".repeat(MAX_STORED_MARKDOWN_CHARS + 1_000);
    const record = buildLastExtractRecord({ markdown }, fixedNow);

    expect(record.markdown).toHaveLength(MAX_STORED_MARKDOWN_CHARS);
    expect(record.truncated).toBe(true);
  });

  test("caps title and URL to prevent oversized metadata", () => {
    const record = buildLastExtractRecord(
      {
        title: "t".repeat(MAX_STORED_TITLE_CHARS + 50),
        url: `https://example.com/${"u".repeat(MAX_STORED_URL_CHARS)}`,
      },
      fixedNow
    );

    expect(record.title).toHaveLength(MAX_STORED_TITLE_CHARS);
    expect(record.url).toHaveLength(MAX_STORED_URL_CHARS);
  });

  test("falls back to the supplied clock and zero tokens for missing fields", () => {
    const record = buildLastExtractRecord({}, fixedNow);

    expect(record.title).toBe("");
    expect(record.url).toBe("");
    expect(record.markdown).toBe("");
    expect(record.tokenEstimate).toBe(0);
    expect(record.extractedAt).toBe(fixedNow.toISOString());
    expect(record.truncated).toBe(false);
  });

  test("writes under the lastExtract key", async () => {
    const writes = [];
    const storage = {
      set: async (value) => {
        writes.push(value);
      },
    };

    const result = await saveLastExtract({ markdown: "hello" }, storage);

    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0][STORAGE_KEY].markdown).toBe("hello");
  });

  test("reports quota failures instead of throwing", async () => {
    const storage = {
      set: async () => {
        throw new Error("QUOTA_BYTES quota exceeded");
      },
    };

    const result = await saveLastExtract({ markdown: "hello" }, storage);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("quota");
    expect(result.record.markdown).toBe("hello");
  });

  test("does not throw when storage is unavailable", async () => {
    const result = await saveLastExtract({ markdown: "hello" }, null);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Storage unavailable");
  });
});
