// src/hooks/useProductVariantsForPO.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys"; // Assuming you have queryKeys

// Define the shape of the data returned to the component
export type VariantWithCost = {
  variant_id: string; // UUID
  sku: string;
  name: string;
  category: string; // Retrieved from the joined product table
  current_stock: number; // Assuming stock is tracked on the variant
  last_po_cost: number | null; // Historical cost (can be null)
  cost_price: number; // Default system cost
};

/**
 * Hook to fetch all product variants, joining product details, and finding the
 * unit_cost from the most recent purchase order item for historical reference.
 */
export const useProductVariantsForPO = () => {
  return useQuery<VariantWithCost[]>({
    queryKey: queryKeys.productVariants.withLastPoCost, // Assuming a suitable key
    queryFn: async () => {
      // 1. Fetch all product variants and their parent product (for category)
      // This is the main list of items available for purchase
      const { data: rawVariants, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          id, 
          sku, 
          name, 
          stock_on_hand, 
          cost_price, 
          products (category) // Join to 'products' table to get the category
        `)
        .order('sku');
      
      if (variantError) {
          console.error("Error fetching product variants:", variantError);
          throw variantError;
      }
      
      // 2. Map over variants and fetch the single most recent PO item cost for each
      const variantsWithCostPromises = (rawVariants || []).map(async (variant: any) => {
          
          const { data: latestItem } = await supabase
              .from('purchase_order_items')
              .select('unit_cost, purchase_orders!inner(order_date)') // Join to PO to sort by date
              .eq('variant_id', variant.id)
              // Order by the PO's order_date descending to get the most recent one
              .order('purchase_orders.order_date', { ascending: false }) 
              .limit(1)
              .maybeSingle();

          // Combine all data into the final shape
          return {
              variant_id: variant.id,
              sku: variant.sku,
              name: variant.name,
              category: variant.products.category,
              current_stock: variant.stock_on_hand,
              cost_price: variant.cost_price,
              last_po_cost: latestItem ? latestItem.unit_cost : null,
          } as VariantWithCost;
      });

      return await Promise.all(variantsWithCostPromises);
    },
  });
};
