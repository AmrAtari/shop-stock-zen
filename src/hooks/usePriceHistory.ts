// src/hooks/usePriceHistory.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Define the required structure for the price history entries
interface PriceHistoryEntry {
    id: string;
    item_id: string;
    old_price: number;
    new_price: number;
    change_date: string; 
    source: string | null;
}

// Placeholder for query keys (Assuming your queryKeys.ts looks similar)
// If your queryKeys.ts file is available, please use the actual import.
const queryKeys = {
    inventory: {
        priceHistory: (itemId: string) => ["inventory", "price-history", itemId],
    }
}


const fetchPriceHistory = async (itemId: string): Promise<PriceHistoryEntry[]> => {
    // FIX 1: Use 'as any' on the Supabase query to bypass the incorrect generated types 
    // that were causing the deep instantiation and overload mismatch errors.
    const { data, error } = await (supabase.from('price_history' as any) as any)
        // Select specific columns to reduce type complexity and ensure needed data is fetched
        .select('id, item_id, old_price, new_price, change_date, source') 
        .eq('item_id', itemId)
        .order('change_date', { ascending: false });

    if (error) {
         console.error("Supabase Error fetching price history:", error);
         throw error;
    }
    
    // FIX 2: Explicitly map the received data (using 'any' for the row type) 
    // to match the PriceHistoryEntry interface, resolving the 'property does not exist' errors.
    const historyData = (data || []).map((row: any) => ({
        id: row.id,
        item_id: row.item_id,
        old_price: Number(row.old_price) || 0,
        new_price: Number(row.new_price) || 0,
        change_date: row.change_date,
        source: row.source || null,
    }));
    
    return historyData as PriceHistoryEntry[];
};

export const usePriceHistory = (itemId: string, enabled: boolean) => {
    // FIX 3: Explicitly define the return types for useQuery (PriceHistoryEntry[], Error) 
    // to prevent TypeScript from attempting overly complex and failing type inference (TS2589).
    return useQuery<PriceHistoryEntry[], Error>({ 
        queryKey: queryKeys.inventory.priceHistory(itemId),
        queryFn: () => fetchPriceHistory(itemId),
        enabled: enabled && !!itemId, 
    });
};
