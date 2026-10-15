import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import type { ViteUserConfig as UserConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;
  const canUploadSourceMaps = isProduction && Boolean(sentryAuthToken);
  const sentryOrg = env.SENTRY_ORG || process.env.SENTRY_ORG || 'ta-marcado';
  const sentryProject = env.SENTRY_PROJECT || process.env.SENTRY_PROJECT || 'javascript-react';
  const sentryRelease = env.SENTRY_RELEASE || process.env.SENTRY_RELEASE || 'tamarcado@0.0.1';

  const config: UserConfig = {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon.svg'],
        manifest: false,
        workbox: {
          navigateFallback: '/index.html',
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
        telemetry: false,
        disable: !canUploadSourceMaps,
        release: { name: sentryRelease },
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
          excludeReplayIframe: true,
          excludeReplayShadowDom: true,
          excludeReplayWorker: true,
          excludeTracing: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@shared': path.resolve(root, '../shared/domain'),
      },
    },
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: (asset: { name?: string }) =>
            asset.name?.endsWith('.css') ? 'assets/app.css' : 'assets/[name][extname]',
        },
      },
      sourcemap: canUploadSourceMaps ? 'hidden' : false,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
      restoreMocks: true,
    },
  };
  return config;
});
