// src/hooks/useProductVariantsForPO.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Define a minimal placeholder for queryKeys if not provided
const queryKeys = {
    productVariants: {
        withLastPoCost: ["product-variants", "last-po-cost"] as const,
    }
};

// MUST be exported for use in POItemSelector.tsx
export type VariantWithCost = {
  variant_id: string; 
  sku: string;
  name: string;
  category: string; 
  current_stock: number; 
  //last_po_cost: number | null; 
  cost_price: number; 
};

/**
 * Hook to fetch all product variants, joining product details, and finding the
 * unit_cost from the most recent purchase order item for historical reference.
 */
export const useProductVariantsForPO = () => {
  return useQuery<VariantWithCost[]>({
    queryKey: queryKeys.productVariants.withLastPoCost, 
    queryFn: async () => {
      // 1. Fetch all product variants and their parent product (for category)
      const { data: rawVariants, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          id, 
          sku, 
          name, 
          stock_on_hand, 
          cost_price, 
          products (category)
        `)
        .order('sku');
      
      if (variantError) throw variantError;
      
      // 2. Fetch the single most recent PO item cost for each variant
      const variantsWithCostPromises = (rawVariants || []).map(async (variant: any) => {
          
          const { data: latestItem } = await supabase
              .from('purchase_order_items')
              .select('unit_cost, purchase_orders!inner(order_date)') 
              .eq('variant_id', variant.id)
              .order('purchase_orders.order_date', { ascending: false }) 
              .limit(1)
              .maybeSingle();

          return {
              variant_id: variant.id,
              sku: variant.sku,
              name: variant.name,
              category: variant.products.category,
              current_stock: variant.stock_on_hand,
              cost_price: variant.cost_price,
             // last_po_cost: latestItem ? latestItem.unit_cost : null,
          } as VariantWithCost;
      });

      return await Promise.all(variantsWithCostPromises);
    },
  });
};