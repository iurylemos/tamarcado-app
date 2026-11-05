import { rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { ViteUserConfig as UserConfig } from 'vitest/config';
import { verifySentryArtifactsPlugin } from '../shared/plugins/verify-sentry-artifacts.plugin.ts';

const root = path.dirname(fileURLToPath(import.meta.url));

// Firebase Hosting serves static files before rewrites, so the HTML shell must not be named index.html.
function storefrontTemplatePlugin(): Plugin {
  let outDir = '';

  return {
    name: 'storefront-template',
    apply: 'build',
    configResolved(resolved) {
      outDir = path.resolve(resolved.root, resolved.build.outDir);
    },
    async writeBundle() {
      await rename(path.join(outDir, 'index.html'), path.join(outDir, 'storefront-template.html'));
    },
  };
}

export default defineConfig(({ mode, isSsrBuild }): UserConfig => {
  const env = loadEnv(mode, root, '');

  const isProduction = mode === 'production';

  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN ?? env.SENTRY_AUTH_TOKEN;

  const sentryDsn = process.env.VITE_SENTRY_DSN ?? env.VITE_SENTRY_DSN;

  const sentryEnvironment =
    process.env.VITE_SENTRY_ENVIRONMENT ?? env.VITE_SENTRY_ENVIRONMENT ?? 'development';

  const sentryEnabled = isProduction && Boolean(sentryDsn) && sentryEnvironment !== 'development';
  const skipSentryUpload = process.env.TAMARCADO_SKIP_SENTRY_UPLOAD === 'true';

  if (sentryEnabled && !sentryAuthToken && !skipSentryUpload) {
    throw new Error('SENTRY_AUTH_TOKEN is required for monitored production builds.');
  }

  const sentryRelease =
    process.env.SENTRY_RELEASE ||
    env.SENTRY_RELEASE ||
    (process.env.GITHUB_SHA ? `tamarcado@${process.env.GITHUB_SHA}` : 'tamarcado@0.1.0');

  const org = process.env.SENTRY_ORG || env.SENTRY_ORG || 'tamarcado';

  const project = process.env.SENTRY_PROJECT_CLIENT || env.SENTRY_PROJECT_CLIENT || 'client';

  const config: UserConfig = {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSsrBuild
        ? []
        : [
            storefrontTemplatePlugin(),
            VitePWA({
              registerType: 'autoUpdate',
              injectRegister: false,
              includeAssets: ['pwa-icon.svg'],
              manifest: false,
              workbox: {
                globPatterns: ['**/*.{js,css,svg}'],
                navigateFallback: null,
                runtimeCaching: [],
              },
              devOptions: { enabled: false },
            }),
            sentryVitePlugin({
              authToken: sentryAuthToken,
              org,
              project,
              telemetry: false,
              disable: !sentryEnabled || skipSentryUpload,
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
          ]),
      verifySentryArtifactsPlugin({
        app: 'client',
        outDir: path.join(root, 'dist'),
        authToken: sentryAuthToken,
      }),
    ],
    define: { 'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease) },
    resolve: {
      alias: {
        '@shared': path.resolve(root, '../shared/domain'),
      },
    },
    build: isSsrBuild
      ? {
          outDir: 'dist/server',
          copyPublicDir: false,
          rollupOptions: {
            output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' },
          },
        }
      : { outDir: 'dist/client', sourcemap: sentryEnabled ? 'hidden' : false },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/**/*.test.tsx'],
      restoreMocks: true,
    },
  };
  return config;
});
