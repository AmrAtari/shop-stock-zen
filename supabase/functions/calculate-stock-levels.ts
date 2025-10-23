import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting stock level calculation...");

    // Fetch all inventory movements in parallel for better performance
    const [transfersResult, adjustmentsResult, itemsResult, storesResult] = await Promise.all([
      // Get all completed transfers with their items
      supabaseClient
        .from("transfers")
        .select(`
          id,
          transfer_number,
          from_store_id,
          to_store_id,
          status,
          created_at,
          transfer_items!inner(
            item_id,
            quantity,
            item_name,
            sku
          )
        `)
        .eq("status", "completed"), // Use your actual completed status
      
      // Get all stock adjustments
      supabaseClient
        .from("stock_adjustments")
        .select("item_id, adjustment, created_at"),
      
      // Get all items for enrichment
      supabaseClient
        .from("items")
        .select("id, name, sku"),
      
      // Get all stores for enrichment
      supabaseClient
        .from("stores")
        .select("id, name")
    ]);

    if (transfersResult.error) {
      console.error("Transfers error:", transfersResult.error);
      throw transfersResult.error;
    }
    if (adjustmentsResult.error) {
      console.error("Adjustments error:", adjustmentsResult.error);
      throw adjustmentsResult.error;
    }
    if (itemsResult.error) throw itemsResult.error;
    if (storesResult.error) throw storesResult.error;

    console.log(`Processing ${transfersResult.data.length} transfers, ${adjustmentsResult.data.length} adjustments`);

    // Create lookup maps for items and stores
    const itemsMap = new Map(itemsResult.data.map(item => [item.id, item]));
    const storesMap = new Map(storesResult.data.map(store => [store.id, store]));

    // Calculate stock levels in JavaScript
    const stockMap = new Map();

    // Process transfers
    transfersResult.data.forEach(transfer => {
      transfer.transfer_items.forEach((item: any) => {
        // Outbound stock (leaving from_store)
        if (transfer.from_store_id) {
          const key = `${item.item_id}-${transfer.from_store_id}`;
          const current = stockMap.get(key) || 0;
          stockMap.set(key, current - item.quantity);
        }

        // Inbound stock (arriving at to_store)
        if (transfer.to_store_id) {
          const key = `${item.item_id}-${transfer.to_store_id}`;
          const current = stockMap.get(key) || 0;
          stockMap.set(key, current + item.quantity);
        }
      });
    });

    // Process adjustments (global - no specific location)
    adjustmentsResult.data.forEach(adjustment => {
      // Create a global stock entry for adjustments
      const key = `${adjustment.item_id}-global`;
      const current = stockMap.get(key) || 0;
      stockMap.set(key, current + adjustment.adjustment);
    });

    // Convert map to enriched stock levels
    const stockLevels = Array.from(stockMap.entries())
      .map(([key, stock]) => {
        const [item_id, location_id] = key.split('-');
        const item = itemsMap.get(item_id);
        const store = location_id !== 'global' ? storesMap.get(location_id) : null;

        return {
          item_id,
          location_id: location_id === 'global' ? null : location_id,
          current_stock: stock,
          item_name: item?.name || 'Unknown Item',
          location_name: store?.name || (location_id === 'global' ? 'All Locations' : 'Unknown Location'),
          sku: item?.sku || 'Unknown SKU'
        };
      })
      .filter(item => item.current_stock !== 0); // Only return items with actual stock

    console.log(`Calculated stock levels for ${stockLevels.length} item-location combinations`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: stockLevels,
        summary: {
          total_combinations: stockLevels.length,
          transfers_processed: transfersResult.data.length,
          adjustments_processed: adjustmentsResult.data.length
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in calculate-stock-levels:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Failed to calculate inventory stock levels"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
