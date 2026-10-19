import { readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

type VerifySentryArtifactsOptions = {
  app: string;
  outDir: string;
  authToken?: string;
};

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const filePath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(filePath) : Promise.resolve([filePath]);
    }),
  );

  return files.flat();
}

export function verifySentryArtifactsPlugin({
  app,
  outDir,
  authToken,
}: VerifySentryArtifactsOptions): Plugin {
  return {
    name: `verify-${app}-sentry-artifacts`,
    apply: 'build',
    enforce: 'post',
    async closeBundle(): Promise<void> {
      const outputDirectory = path.resolve(outDir);

      const files = await collectFiles(outputDirectory);
      const publicMaps = files.filter((filePath) => filePath.endsWith('.map'));

      await Promise.all(publicMaps.map((filePath) => unlink(filePath)));

      const remainingFiles = await collectFiles(outputDirectory);
      const remainingMaps = remainingFiles.filter((filePath) => filePath.endsWith('.map'));

      if (remainingMaps.length > 0) {
        throw new Error(`Public source maps remain in the ${app} Hosting build.`);
      }

      if (!authToken) return;

      const tokenBytes = Buffer.from(authToken);

      for (const filePath of remainingFiles) {
        const contents = await readFile(filePath);

        if (contents.includes(tokenBytes)) {
          throw new Error(`The ${app} Hosting build contains the Sentry upload credential.`);
        }
      }
    },
  };
}
