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
};
