import type { PlatformPath } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { findStylesheetLink, inlineStylesheet } from './stylesheet.plugin.ts';

export function storefrontTemplatePlugin(path: PlatformPath): Plugin {
  let outDir = '';

  return {
    name: 'storefront-template',
    apply: 'build',
    configResolved(resolved: ResolvedConfig): void {
      outDir = path.resolve(resolved.root, resolved.build.outDir);
    },
    async writeBundle(): Promise<void> {
      const templatePath = path.join(outDir, 'index.html');
      const html = await readFile(templatePath, 'utf8');
      const { href } = findStylesheetLink(html);
      const stylesheetUrl = new URL(href, 'https://storefront.invalid');

      if (stylesheetUrl.origin !== 'https://storefront.invalid') {
        throw new Error('The initial storefront stylesheet must be a local build asset.');
      }

      const assetPath = decodeURIComponent(stylesheetUrl.pathname).replace(/^\/+/, '');
      const stylesheetPath = path.resolve(outDir, assetPath);
      const relativeStylesheetPath = path.relative(outDir, stylesheetPath);

      if (relativeStylesheetPath.startsWith('..') || path.isAbsolute(relativeStylesheetPath)) {
        throw new Error(
          'The initial storefront stylesheet must be inside the client build output.',
        );
      }

      const stylesheet = await readFile(stylesheetPath, 'utf8');
      await writeFile(templatePath, inlineStylesheet(html, stylesheet), 'utf8');
      await rename(templatePath, path.join(outDir, 'storefront-template.html'));
    },
  };
}
