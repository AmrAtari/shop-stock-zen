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

    // Fetch all inventory movements
    const [transfersResult, adjustmentsResult] = await Promise.all([
      // Get all completed transfers with their items
      supabaseClient
        .from("transfers")
        .select(`
          id,
          from_store_id,
          to_store_id,
          status,
          transfer_items!inner(
            item_id,
            quantity
          )
        `)
        .eq("status", "completed"), // Use your actual completed status
      
      // Get all stock adjustments
      supabaseClient
        .from("stock_adjustments")
        .select("item_id, adjustment")
    ]);

    if (transfersResult.error) throw transfersResult.error;
    if (adjustmentsResult.error) throw adjustmentsResult.error;

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

    // Process adjustments
    adjustmentsResult.data.forEach(adjustment => {
      // Adjustments might be global (no specific location)
      const key = `${adjustment.item_id}-global`;
      const current = stockMap.get(key) || 0;
      stockMap.set(key, current + adjustment.adjustment);
    });

    // Convert map to array format
    const stockLevels = Array.from(stockMap.entries()).map(([key, stock]) => {
      const [item_id, location_id] = key.split('-');
      return {
        item_id,
        location_id: location_id === 'global' ? null : location_id,
        current_stock: stock
      };
    }).filter(item => item.current_stock !== 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: stockLevels 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
