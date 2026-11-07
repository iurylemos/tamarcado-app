// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorefrontRendererModule } from '../src/interfaces/storefront-render.interface';
import { generateStorefront } from './generate-storefront.mts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('generateStorefront', () => {
  it('writes neutral root, one page per published business, and an empty booking shell', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'tamarcado-storefront-'));
    temporaryDirectories.push(outputDir);
    const template =
      '<!doctype html><html><head><title>Neutral</title><!--app-head--></head><body><div id="root"><!--app-html--></div><!--app-state--><script src="/assets/client.js"></script></body></html>';
    const renderer: StorefrontRendererModule = {
      render: vi.fn(({ url, initialBusiness }) => ({
        appHtml: `<main>${initialBusiness?.name ?? 'Root guidance'} ${url}</main>`,
        headHtml: `<meta data-url="${url}" />`,
        title: initialBusiness?.name ?? 'Neutral storefront',
        stateJson: initialBusiness ? JSON.stringify({ initialBusiness }) : null,
        statusCode: 200,
      })),
      renderDocument: vi.fn((source, output) =>
        source
          .replace('<title>Neutral</title>', `<title>${output.title}</title>`)
          .replace('<!--app-head-->', output.headHtml)
          .replace('<!--app-html-->', output.appHtml)
          .replace(
            '<!--app-state-->',
            output.stateJson
              ? `<script id="__STOREFRONT_STATE__">${output.stateJson}</script>`
              : '',
          )),
    };

    await generateStorefront({
      outputDir,
      template,
      businesses: [
        { id: 'business-1', name: 'Studio Aurora', slug: 'studio-aurora', segment: 'beauty' },
        { id: 'business-2', name: 'Barbearia Lunar', slug: 'barbearia-lunar', segment: 'beauty' },
      ],
      renderer,
    });

    const rootHtml = await readFile(path.join(outputDir, 'index.html'), 'utf8');
    const studioHtml = await readFile(
      path.join(outputDir, 'empresa', 'studio-aurora', 'index.html'),
      'utf8',
    );
    const barbershopHtml = await readFile(
      path.join(outputDir, 'empresa', 'barbearia-lunar', 'index.html'),
      'utf8',
    );
    const bookingShell = await readFile(path.join(outputDir, 'booking-shell.html'), 'utf8');

    expect(rootHtml).toContain('Root guidance');
    expect(rootHtml).not.toContain('Studio Aurora');
    expect(studioHtml).toContain('Studio Aurora');
    expect(studioHtml).not.toContain('Barbearia Lunar');
    expect(barbershopHtml).toContain('Barbearia Lunar');
    expect(barbershopHtml).not.toContain('Studio Aurora');
    expect(bookingShell).toContain('<div id="root"></div>');
    expect(bookingShell).not.toContain('__STOREFRONT_STATE__');
    expect(bookingShell).not.toContain('Studio Aurora');
    expect(renderer.render).toHaveBeenCalledTimes(3);
    expect(renderer.renderDocument).toHaveBeenCalledTimes(3);
  });
});
