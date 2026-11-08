import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'shared/tests/**/*.test.ts',
      'chrome-extension/tests/*.test.ts',
      'mcp-server/tests/**/*.test.ts'
    ],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});
