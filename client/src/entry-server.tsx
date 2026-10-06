import { renderToString } from 'react-dom/server';
import type { CompanyCatalog } from './interfaces/company.interface.js';
import { createPublicContentMarkup } from './services/public-content-markup.js';

export function renderPublicContent(catalog: CompanyCatalog): string {
  return renderToString(
    <div dangerouslySetInnerHTML={{ __html: createPublicContentMarkup(catalog) }} />,
  );
}
