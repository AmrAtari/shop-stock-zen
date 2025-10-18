export const queryKeys = {
  dashboard: {
    metrics: ['dashboard-metrics'] as const,
    categoryDistribution: ['dashboard-category-distribution'] as const,
    lowStock: ['dashboard-low-stock'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
  },
  reports: {
    all: ['reports'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
  },
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    detail: (id: string) => ['purchase-orders', id] as const,
    items: (poId: string) => ['purchase-orders', poId, 'items'] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
  },
  transfers: {
    all: ['transfers'] as const,
    detail: (id: string) => ['transfers', id] as const,
    list: (searchTerm: string, statusFilter: string) => ['transfers', searchTerm, statusFilter] as const,
  },
  stores: {
    all: ['stores'] as const,
  },
  physicalInventory: {
    all: ['physical-inventory-sessions'] as const,
    detail: (id: string) => ['physical-inventory-sessions', id] as const,
    counts: (sessionId: string) => ['physical-inventory-counts', sessionId] as const,
  },
};
