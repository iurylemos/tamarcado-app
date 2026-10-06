import { create } from 'zustand';
import type { BusinessSegment } from '@shared/interfaces/tenant.interface';
import type { CompanyTabs } from '../interfaces/company.interface';

interface CatalogFiltersState {
  segment: BusinessSegment | '';
  tab: CompanyTabs;
  search: string;
  setSegment: (segment: BusinessSegment | '') => void;
  setTab: (tab: CompanyTabs) => void;
  setSearch: (search: string) => void;
}

export const useCatalogFiltersStore = create<CatalogFiltersState>((set) => ({
  segment: '',
  tab: 'products',
  search: '',
  setSegment: (segment) => set({ segment }),
  setTab: (tab) => set({ tab }),
  setSearch: (search) => set({ search }),
}));
