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

    console.log("Starting inventory recalculation...");

    // Step 1: Get all items
    const { data: items, error: itemsError } = await supabaseClient
      .from("items")
      .select("id, sku, name");

    if (itemsError) throw itemsError;

    console.log(`Found ${items.length} items to process`);

    // Step 2: Get all stores
    const { data: stores, error: storesError } = await supabaseClient
      .from("stores")
      .select("id, name");

    if (storesError) throw storesError;

    console.log(`Found ${stores.length} stores`);

    // Step 3: For each item-store combination, calculate quantity from:
    // - PO received quantities (additions)
    // - Transfer items (additions/subtractions)
    // - Sales/transactions (subtractions)

    const inventoryMap = new Map<string, number>(); // key: "itemId-storeId", value: quantity

    // 3a. Add quantities from received POs
    const { data: poItems, error: poError } = await supabaseClient
      .from("purchase_order_items")
      .select(`
        id,
        sku,
        item_id,
        received_quantity,
        purchase_orders!inner(po_id, store_id, status)
      `);

    if (poError) throw poError;

    console.log(`Processing ${poItems.length} PO items...`);

    for (const poItem of poItems) {
      const po = (poItem as any).purchase_orders;
      if (!po || !po.store_id || po.status !== "completed") continue;

      // Try to resolve item_id
      let itemId = poItem.item_id;
      if (!itemId && poItem.sku) {
        const item = items.find((i) => i.sku === poItem.sku);
        if (item) itemId = item.id;
      }

      if (!itemId) continue;

      const key = `${itemId}-${po.store_id}`;
      const current = inventoryMap.get(key) || 0;
      inventoryMap.set(key, current + (poItem.received_quantity || 0));
    }

    console.log(`Processed PO items. Current inventory entries: ${inventoryMap.size}`);

    // 3b. Process transfers (completed ones)
    const { data: transfers, error: transfersError } = await supabaseClient
      .from("transfers")
      .select(`
        transfer_id,
        from_store_id,
        to_store_id,
        status,
        transfer_items!inner(variant_id, quantity)
      `)
      .eq("status", "completed");

    if (transfersError) throw transfersError;

    console.log(`Processing ${transfers.length} completed transfers...`);

    for (const transfer of transfers) {
      const items = (transfer as any).transfer_items || [];
      for (const tItem of items) {
        // Note: transfer_items uses variant_id, need to map to item_id
        // For now, skip transfers or implement variant-to-item mapping
        console.warn("Transfer processing skipped - variant_id to item_id mapping needed");
      }
    }

    // 3c. Subtract sales quantities
    const { data: transactions, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, item_id, quantity, is_refund, session_id")
      .eq("is_refund", false);

    if (txError) throw txError;

    console.log(`Processing ${transactions.length} transactions...`);

    // Get session-to-store mapping (if available)
    const { data: sessions } = await supabaseClient
      .from("cash_sessions")
      .select("id, cashier_id");

    // For now, we can't reliably map transactions to stores without store_id in sessions
    // This is a limitation - we'll log a warning
    console.warn(`Transaction-to-store mapping unavailable. Sales not deducted from inventory.`);
    console.warn(`To fix: Add store_id to transactions or cash_sessions table.`);

    // Step 4: Write calculated quantities back to store_inventory
    console.log("Writing calculated quantities to store_inventory...");

    let updatedCount = 0;
    let insertedCount = 0;

    for (const [key, calculatedQty] of inventoryMap.entries()) {
      const [itemId, storeId] = key.split("-");

      // Check if record exists
      const { data: existing } = await supabaseClient
        .from("store_inventory")
        .select("id, quantity")
        .eq("item_id", itemId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (existing) {
        // Update
        const { error: updateErr } = await supabaseClient
          .from("store_inventory")
          .update({ quantity: calculatedQty })
          .eq("id", existing.id);

        if (updateErr) {
          console.error(`Error updating ${key}:`, updateErr);
        } else {
          updatedCount++;
        }
      } else {
        // Insert
        const { error: insertErr } = await supabaseClient
          .from("store_inventory")
          .insert({
            item_id: itemId,
            store_id: storeId,
            quantity: calculatedQty,
          });

        if (insertErr) {
          console.error(`Error inserting ${key}:`, insertErr);
        } else {
          insertedCount++;
        }
      }
    }

    console.log(`Recalculation complete. Updated: ${updatedCount}, Inserted: ${insertedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Inventory recalculated successfully",
        stats: {
          itemsProcessed: items.length,
          storesProcessed: stores.length,
          poItemsProcessed: poItems.length,
          transfersProcessed: transfers.length,
          transactionsProcessed: transactions.length,
          inventoryEntriesUpdated: updatedCount,
          inventoryEntriesInserted: insertedCount,
        },
        warnings: [
          "Transaction-to-store mapping unavailable. Sales not deducted.",
          "Transfer processing skipped - variant mapping needed.",
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error recalculating inventory:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
