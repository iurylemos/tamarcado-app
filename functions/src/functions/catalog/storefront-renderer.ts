import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  StorefrontRendererModule,
  StorefrontRenderInput,
} from '../../../../client/src/interfaces/storefront-render.interface';

export type StorefrontRenderer = {
  renderHtml: (input: StorefrontRenderInput) => { html: string; statusCode: number };
};

// Compiled to lib/functions/src/functions/catalog; the client build is copied to functions/dist.
const distDirectory = path.resolve(__dirname, '../../../../../dist');

let renderer: Promise<StorefrontRenderer> | undefined;

async function createRenderer(): Promise<StorefrontRenderer> {
  const [template, serverModule] = await Promise.all([
    readFile(path.join(distDirectory, 'client/storefront-template.html'), 'utf8'),
    import(
      pathToFileURL(path.join(distDirectory, 'server/entry-server.mjs')).href
    ) as Promise<StorefrontRendererModule>,
  ]);

  return {
    renderHtml(input) {
      const output = serverModule.render(input);
      return { html: serverModule.renderDocument(template, output), statusCode: output.statusCode };
    },
  };
}

export function loadStorefrontRenderer(): Promise<StorefrontRenderer> {
  renderer ??= createRenderer().catch((error: unknown) => {
    renderer = undefined;
    throw error;
  });

  return renderer;
}
