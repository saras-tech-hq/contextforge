/**
 * Rough token estimate for prompt budgeting (~4 characters per token).
 * Fast, local, model-agnostic — not a tokenizer.
 */
export declare function estimateTokens(text: string | null | undefined): number;
