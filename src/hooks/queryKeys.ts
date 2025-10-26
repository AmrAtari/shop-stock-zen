import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  dashboard: {
    metrics: ["dashboard-metrics"] as const,
    categoryDistribution: ["dashboard-category-distribution"] as const,
    lowStock: ["dashboard-low-stock"] as const,
  },

  inventory: {
    all: ["inventory"] as const,
    stockLevels: () => [...queryKeys.inventory.all, "stock-levels"] as const,
    movements: () => [...queryKeys.inventory.all, "movements"] as const,
    details: (id: string) => [...queryKeys.inventory.all, "detail", id] as const,
  },

  reports: {
    all: ["reports"] as const,
    inventoryOnHand: ["reports", "inventoryOnHand"] as const,
    categoryValue: ["reports", "categoryValue"] as const,
    lowStock: ["reports", "lowStock"] as const,
    inventoryAging: ["reports", "inventoryAging"] as const,
    stockMovement: ["reports", "stockMovement"] as const,
    abcAnalysis: ["reports", "abcAnalysis"] as const,
    recentAdjustments: ["reports", "recentAdjustments"] as const,
    stockMovementTransaction: ["reports", "stockMovementTransaction"] as const,
    stores: ["reports", "stores"] as const,
    categories: ["reports", "categories"] as const,
    brands: ["reports", "brands"] as const,
  },

  alerts: {
    all: ["alerts"] as const,
  },

  purchaseOrders: {
    all: ["purchase-orders"] as const,
    detail: (id: string) => ["purchase-orders", id] as const,
    items: (poId: string) => ["purchase-orders", poId, "items"] as const,
  },

  suppliers: {
    all: ["suppliers"] as const,
  },

  transfers: {
    all: ["transfers"] as const,
    detail: (id: string) => ["transfers", id] as const,
    list: (searchTerm: string, statusFilter: string) => ["transfers", searchTerm, statusFilter] as const,
  },

  stores: {
    all: ["stores"] as const,
  },

  physicalInventory: {
    all: ["physical-inventory-sessions"] as const,
    detail: (id: string) => ["physical-inventory-sessions", id] as const,
    counts: (sessionId: string) => ["physical-inventory-counts", sessionId] as const,
  },
};

// Helper function to invalidate all inventory-related queries
export const invalidateInventoryData = async (queryClient: QueryClient) => {
  await Promise.all([
    // Invalidate inventory queries
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    
    // Invalidate all report queries
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    
    // Invalidate all dashboard queries
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.categoryDistribution }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock }),
    
    // Invalidate store inventory
    queryClient.invalidateQueries({ queryKey: ["store-inventory"] }),
  ]);
};
