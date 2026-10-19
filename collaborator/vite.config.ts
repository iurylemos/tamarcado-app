import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig, type ViteUserConfig as UserConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { verifySentryArtifactsPlugin } from '../shared/plugins/verify-sentry-artifacts.plugin.ts';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, root, '');

  const isProduction = mode === 'production';

  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN ?? env.SENTRY_AUTH_TOKEN;

  const sentryDsn = process.env.VITE_SENTRY_DSN ?? env.VITE_SENTRY_DSN;

  const sentryEnvironment =
    process.env.VITE_SENTRY_ENVIRONMENT ?? env.VITE_SENTRY_ENVIRONMENT ?? 'development';
  const sentryEnabled = isProduction && Boolean(sentryDsn) && sentryEnvironment !== 'development';

  if (sentryEnabled && !sentryAuthToken) {
    throw new Error('SENTRY_AUTH_TOKEN is required for monitored production builds.');
  }

  const sentryRelease =
    process.env.SENTRY_RELEASE ||
    env.SENTRY_RELEASE ||
    (process.env.GITHUB_SHA ? `tamarcado@${process.env.GITHUB_SHA}` : 'tamarcado@0.1.0');

  const org = process.env.SENTRY_ORG || env.SENTRY_ORG || 'tamarcado';
  const project =
    process.env.SENTRY_PROJECT_COLLABORATOR || env.SENTRY_PROJECT_COLLABORATOR || 'collaborator';

  return {
    plugins: [
      react(),
      tailwindcss(),
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org,
        project,
        telemetry: false,
        disable: !sentryEnabled,
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
      verifySentryArtifactsPlugin({
        app: 'collaborator',
        outDir: path.join(root, 'dist'),
        authToken: sentryAuthToken,
      }),
    ],
    define: { 'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease) },
    resolve: { alias: { '@shared': path.resolve(root, '../shared/domain') } },
    build: { sourcemap: sentryEnabled ? 'hidden' : false },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.tsx'],
      restoreMocks: true,
    },
  };
});
