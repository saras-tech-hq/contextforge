/**
 * Rough token estimate for prompt budgeting (~4 characters per token).
 * Fast, local, model-agnostic — not a tokenizer.
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0
  return Math.ceil(text.length / 4)
}