// Conceptual: src/hooks/usePriceHistory.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/queryKeys"; 

// Define a simple structure for the history item
interface PriceHistoryEntry {
    id: string;
    item_id: string;
    old_price: number;
    new_price: number;
    change_date: string; // or Date
    source: string; // e.g., 'PO', 'Manual Adjustment'
}

const fetchPriceHistory = async (itemId: string): Promise<PriceHistoryEntry[]> => {
    // Assuming you have a table named 'price_history' that tracks item prices
    // Filter by item_id and order by date.
    const { data, error } = await supabase
        .from('price_history') 
        .select('*')
        .eq('item_id', itemId)
        .order('change_date', { ascending: false });

    if (error) throw error;
    
    // Convert 'old_price' and 'new_price' from string (if stored as such) or ensure they are numbers
    return data.map(row => ({
        ...row,
        old_price: Number(row.old_price),
        new_price: Number(row.new_price),
        // Format the date for display later
        change_date: new Date(row.change_date).toLocaleDateString(), 
    })) as PriceHistoryEntry[];
};

export const usePriceHistory = (itemId: string, enabled: boolean) => {
    return useQuery({
        queryKey: queryKeys.inventory.priceHistory(itemId),
        queryFn: () => fetchPriceHistory(itemId),
        enabled: enabled && !!itemId, // Only run the query if the dialog is open and we have an item ID
    });
};
