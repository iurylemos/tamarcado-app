import { renderToString } from 'react-dom/server';
import StorefrontApp, { createPageElement } from './app/StorefrontApp';
import { resolvePageData } from './app/page-data';
import type { StorefrontInitialData } from './interfaces/storefront-render.interface';
import { escapeHtml, renderPageMetaTags, resolvePageMeta } from './app/page-meta';
import { matchRoute } from './app/routes';
import { createQueryClient } from './config/query-client.config';
import type {
  StorefrontRenderInput,
  StorefrontRenderOutput,
} from './interfaces/storefront-render.interface';
import BookingPage from './pages/BookingPage';
import CatalogRoutePage from './pages/CatalogRoutePage';
import ErrorPage from './pages/ErrorPage';
import HomePage from './pages/HomePage';
import type { PageComponents } from './interfaces/page.interface';

export const storefrontStateElementId = '__STOREFRONT_STATE__';

const pageComponents: PageComponents = {
  home: HomePage,
  catalog: CatalogRoutePage,
  booking: BookingPage,
  notFound: ErrorPage,
};

function serializeState(state: StorefrontInitialData): string {
  return JSON.stringify(state)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function render({ url, ...initial }: StorefrontRenderInput): StorefrontRenderOutput {
  const { pathname } = new URL(url, 'http://localhost');
  const page = resolvePageData(matchRoute(pathname), initial);
  const meta = resolvePageMeta(page);
  const hasInitialData =
    initial.initialBusiness !== undefined || initial.initialCatalogStatus !== undefined;

  // The client is created per request so tenant data never leaks between renders.
  const queryClient = createQueryClient();

  try {
    const appHtml = renderToString(
      <StorefrontApp
        pathname={pathname}
        queryClient={queryClient}
        page={createPageElement(page, pageComponents)}
      />,
    );

    return {
      appHtml,
      headHtml: renderPageMetaTags(meta),
      title: meta.title,
      stateJson: hasInitialData ? serializeState(initial) : null,
      statusCode: page.name === 'not-found' ? 404 : 200,
    };
  } finally {
    queryClient.clear();
  }
}

export function renderDocument(template: string, output: StorefrontRenderOutput): string {
  const stateScript = output.stateJson
    ? `<script id="${storefrontStateElementId}" type="application/json">${output.stateJson}</script>`
    : '';

  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(output.title)}</title>`)
    .replace('<!--app-head-->', () => output.headHtml)
    .replace('<!--app-html-->', () => output.appHtml)
    .replace('<!--app-state-->', () => stateScript);
}
