import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['test/vitest.setup.ts'],
    testTimeout: 20_000,
    exclude: ['**/node_modules/**', '**/lib/**', '**/dist/**', '**/*.js'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared/domain'),
    },
  },
});
