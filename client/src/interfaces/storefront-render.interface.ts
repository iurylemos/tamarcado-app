import type { PublicCatalogStatus } from './catalog.interface.js';
import type { CompanySummary, PublicProductSummary } from './company.interface.js';

export type StorefrontInitialData = {
  initialBusiness?: CompanySummary | null;
  initialProduct?: PublicProductSummary | null;
  initialCatalogStatus?: PublicCatalogStatus;
};

export type StorefrontRenderInput = StorefrontInitialData & { url: string };

export type StorefrontRenderOutput = {
  appHtml: string;
  headHtml: string;
  title: string;
  stateJson: string | null;
  statusCode: number;
};

export type StorefrontRendererModule = {
  render: (input: StorefrontRenderInput) => StorefrontRenderOutput;
  renderDocument: (template: string, output: StorefrontRenderOutput) => string;
};
