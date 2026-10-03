import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@shared\/(.*)$/,
        replacement: path.resolve(root, 'shared/domain/$1'),
      },
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        root: path.resolve(root, 'client'),
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: [path.resolve(root, 'client/src/test/setup.ts')],
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        root: path.resolve(root, 'collaborator'),
        test: {
          name: 'collaborator',
          environment: 'jsdom',
          setupFiles: [path.resolve(root, 'collaborator/src/test/setup.ts')],
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        root: path.resolve(root, 'backoffice'),
        test: {
          name: 'backoffice',
          environment: 'jsdom',
          setupFiles: [path.resolve(root, 'backoffice/src/test/setup.ts')],
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        root: path.resolve(root, 'functions'),
        test: {
          name: 'functions',
          environment: 'node',
          setupFiles: [path.resolve(root, 'functions/test/vitest.setup.ts')],
          include: ['src/**/*.spec.ts'],
          exclude: ['**/node_modules/**', '**/lib/**', '**/dist/**', '**/*.js'],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
