import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG || 'tamarcado';
const sentryProject = process.env.SENTRY_PROJECT_BACKOFFICE || 'backoffice';
const sentryRelease = process.env.SENTRY_RELEASE || 'tamarcado@0.0.1';
const canUploadSourceMaps = isProduction && Boolean(sentryAuthToken);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sentryVitePlugin({
      authToken: sentryAuthToken,
      org: sentryOrg,
      project: sentryProject,
      telemetry: false,
      disable: !canUploadSourceMaps,
      release: { name: sentryRelease },
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
        excludeReplayWorker: true,
        excludeTracing: true,
      },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  resolve: { alias: { '@shared': path.resolve(root, '../shared/domain') } },
  build: {
    sourcemap: canUploadSourceMaps ? 'hidden' : true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.tsx'],
    restoreMocks: true,
  },
});
