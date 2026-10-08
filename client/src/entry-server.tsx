import { renderToString } from 'react-dom/server';
import type { CompanyCatalog } from './interfaces/company.interface.js';
import CompanyCatalogTemplate from './components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.js';

export function renderPublicContent(catalog: CompanyCatalog): string {
  return renderToString(<CompanyCatalogTemplate catalog={catalog} status="ready" />);
}
