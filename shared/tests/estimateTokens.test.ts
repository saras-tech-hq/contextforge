import { describe, expect, test } from "vitest";
import { estimateTokens } from "../src/estimateTokens.js";

describe("estimateTokens", () => {
  test("returns 0 for empty/whitespace-only input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("   ")).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test("estimates ~4 characters per token", () => {
    expect(estimateTokens("Hello world")).toBe(3);
    expect(estimateTokens("")).toBe(0);
  });

  test("estimates correctly for various lengths", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("abcdefghi")).toBe(3);
  });

  test("counts individual characters including spaces", () => {
    expect(estimateTokens("a b c d")).toBe(2);
    expect(estimateTokens("test")).toBe(1);
  });
});
