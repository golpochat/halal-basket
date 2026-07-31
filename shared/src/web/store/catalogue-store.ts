import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CatalogueFilters } from '../types';
import { categoryPathIds } from '../catalogue/taxonomy';

export type ViewMode = 'grid' | 'list';
export type SortBy = 'newest' | 'price-asc' | 'price-desc' | 'name';

type CatalogueState = {
  search: string;
  /** Drill-down path of category node ids; empty = home */
  browsePath: string[];
  category: string;
  area: string;
  shopId: string;
  filters: CatalogueFilters;
  sidebarOpen: boolean;
  /** Desktop only: when true, category column is hidden */
  sidebarCollapsed: boolean;
  filtersOpen: boolean;
  viewMode: ViewMode;
  sortBy: SortBy;
  setSearch: (v: string) => void;
  setBrowsePath: (path: string[]) => void;
  pushBrowse: (id: string) => void;
  popBrowseTo: (index: number) => void;
  goHome: () => void;
  setCategory: (v: string) => void;
  setArea: (v: string) => void;
  setShopId: (v: string) => void;
  setFilters: (patch: Partial<CatalogueFilters>) => void;
  resetFilters: () => void;
  setSidebarOpen: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setFiltersOpen: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (v: SortBy) => void;
  recentlyViewed: string[];
  pushRecent: (productId: string) => void;
};

const defaultFilters: CatalogueFilters = {
  priceMin: null,
  priceMax: null,
  inStockOnly: false,
  deliveryType: 'any',
};

export const useCatalogueStore = create<CatalogueState>()(
  persist(
    (set, get) => ({
      search: '',
      browsePath: [],
      category: 'all',
      area: '',
      shopId: '',
      filters: defaultFilters,
      sidebarOpen: false,
      sidebarCollapsed: false,
      filtersOpen: false,
      viewMode: 'grid',
      sortBy: 'newest',
      recentlyViewed: [],
      setSearch: (search) => set({ search }),
      setBrowsePath: (browsePath) =>
        set({
          browsePath,
          category: browsePath[browsePath.length - 1] ?? 'all',
        }),
      pushBrowse: (id) => {
        const browsePath = [...get().browsePath, id];
        set({ browsePath, category: id });
      },
      popBrowseTo: (index) => {
        if (index < 0) {
          set({ browsePath: [], category: 'all' });
          return;
        }
        const browsePath = get().browsePath.slice(0, index + 1);
        set({
          browsePath,
          category: browsePath[browsePath.length - 1] ?? 'all',
        });
      },
      goHome: () => set({ browsePath: [], category: 'all', search: '' }),
      setCategory: (category) => {
        if (category === 'all') {
          set({ category: 'all', browsePath: [] });
        } else {
          const browsePath = categoryPathIds(category) ?? [category];
          set({ category, browsePath });
        }
      },
      setArea: (area) => set({ area }),
      setShopId: (shopId) =>
        set({ shopId, category: 'all', browsePath: [] }),
      setFilters: (patch) =>
        set({ filters: { ...get().filters, ...patch } }),
      resetFilters: () => set({ filters: defaultFilters }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => {
        if (
          typeof window !== 'undefined' &&
          window.matchMedia('(min-width: 1024px)').matches
        ) {
          set({ sidebarCollapsed: !get().sidebarCollapsed });
        } else {
          set({ sidebarOpen: !get().sidebarOpen });
        }
      },
      setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      pushRecent: (productId) => {
        const next = [
          productId,
          ...get().recentlyViewed.filter((id) => id !== productId),
        ].slice(0, 8);
        set({ recentlyViewed: next });
      },
    }),
    {
      name: 'hb_catalogue',
      partialize: (s) => ({
        area: s.area,
        shopId: s.shopId,
        recentlyViewed: s.recentlyViewed,
        filters: s.filters,
        viewMode: s.viewMode,
        sortBy: s.sortBy,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
