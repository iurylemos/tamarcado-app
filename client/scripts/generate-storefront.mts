import { deleteApp, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import type { CompanySummary } from '../src/interfaces/company.interface.ts';
import type { StorefrontRendererModule } from '../src/interfaces/storefront-render.interface.ts';
import { readPublicBusinessSnapshot } from './public-business-snapshot.ts';

type StorefrontGeneration = {
  outputDir: string;
  template: string;
  businesses: readonly CompanySummary[];
  renderer: StorefrontRendererModule;
};

function createBookingShell(template: string): string {
  return template
    .replace('<!--app-head-->', '')
    .replace('<!--app-html-->', '')
    .replace('<!--app-state-->', '');
}

export async function generateStorefront({
  outputDir,
  template,
  businesses,
  renderer,
}: StorefrontGeneration): Promise<void> {
  const generatedFiles: Array<{ relativePath: string; content: string }> = [];
  const seenSlugs = new Set<string>();

  const rootOutput = renderer.render({ url: '/' });
  if (rootOutput.statusCode !== 200) {
    throw new Error('The neutral storefront page could not be generated.');
  }
  generatedFiles.push({
    relativePath: 'index.html',
    content: renderer.renderDocument(template, rootOutput),
  });

  for (const business of businesses) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(business.slug)) {
      throw new Error('A published public business record has an invalid slug.');
    }
    if (seenSlugs.has(business.slug)) {
      throw new Error('Published public business records contain duplicate slugs.');
    }
    seenSlugs.add(business.slug);

    const route = `/empresa/${business.slug}`;
    const output = renderer.render({
      url: route,
      initialBusiness: business,
      initialCatalogStatus: 'ready',
    });
    if (output.statusCode !== 200) {
      throw new Error('A published business storefront page could not be generated.');
    }
    generatedFiles.push({
      relativePath: path.join('empresa', business.slug, 'index.html'),
      content: renderer.renderDocument(template, output),
    });
  }

  generatedFiles.push({
    relativePath: 'booking-shell.html',
    content: createBookingShell(template),
  });

  const stagingDir = await mkdtemp(path.join(outputDir, '.storefront-'));
  try {
    for (const file of generatedFiles) {
      const stagedPath = path.join(stagingDir, file.relativePath);
      await mkdir(path.dirname(stagedPath), { recursive: true });
      await writeFile(stagedPath, file.content, 'utf8');
    }

    for (const file of generatedFiles) {
      const stagedPath = path.join(stagingDir, file.relativePath);
      const destinationPath = path.join(outputDir, file.relativePath);
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await rename(stagedPath, destinationPath);
    }
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

async function buildStorefront(): Promise<void> {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(scriptsDir, '..');
  const rootDir = path.resolve(clientDir, '..');
  const environment = loadEnv('production', clientDir, '');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || environment.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || environment.VITE_FIREBASE_API_KEY;
  const authDomain =
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    environment.VITE_FIREBASE_AUTH_DOMAIN ||
    (projectId ? `${projectId}.firebaseapp.com` : undefined);
  const appId = process.env.VITE_FIREBASE_APP_ID || environment.VITE_FIREBASE_APP_ID;
  const emulatorAddress =
    process.env.FIRESTORE_EMULATOR_HOST || environment.FIRESTORE_EMULATOR_HOST;

  if (!projectId) {
    throw new Error('Set VITE_FIREBASE_PROJECT_ID before generating the public storefront.');
  }
  if (!apiKey && !emulatorAddress) {
    throw new Error(
      'Set VITE_FIREBASE_API_KEY or FIRESTORE_EMULATOR_HOST before generating the public storefront.',
    );
  }

  const app = initializeApp(
    {
      projectId,
      apiKey: apiKey || 'emulator',
      authDomain,
      appId: appId || 'storefront-build',
    },
    'storefront-build',
  );
  const db = getFirestore(app);

  try {
    if (emulatorAddress) {
      const emulator = new URL(`http://${emulatorAddress}`);
      if (!emulator.hostname || !emulator.port) {
        throw new Error('FIRESTORE_EMULATOR_HOST must include a host and port.');
      }
      connectFirestoreEmulator(db, emulator.hostname, Number(emulator.port));
    }

    const outputDir = path.join(clientDir, 'dist', 'client');
    const templatePath = path.join(outputDir, 'storefront-template.html');
    const rendererPath = path.join(clientDir, 'dist', 'server', 'entry-server.mjs');
    const [template, renderer] = await Promise.all([
      readFile(templatePath, 'utf8'),
      import(pathToFileURL(rendererPath).href) as Promise<StorefrontRendererModule>,
    ]);

    await generateStorefront({
      outputDir,
      template,
      businesses: await readPublicBusinessSnapshot(db),
      renderer,
    });
  } finally {
    await deleteApp(app);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  await buildStorefront();
}
