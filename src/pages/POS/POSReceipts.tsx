// src/pages/POS/POSReceipts.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const POSReceipts = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // Query unique transactions (grouped by transaction_id)
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["pos-receipts", q],
    queryFn: async () => {
      // Get unique transaction summaries
      const { data, error } = await supabase
        .from("transactions")
        .select("transaction_id, created_at, payment_method, customer_id, amount")
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (error) throw error;
      
      // Group by transaction_id and calculate totals
      const grouped = (data || []).reduce((acc: Record<string, any>, tx) => {
        if (!acc[tx.transaction_id]) {
          acc[tx.transaction_id] = {
            transaction_id: tx.transaction_id,
            created_at: tx.created_at,
            payment_method: tx.payment_method,
            customer_id: tx.customer_id,
            total: 0,
          };
        }
        acc[tx.transaction_id].total += tx.amount || 0;
        return acc;
      }, {});
      
      let results = Object.values(grouped);
      
      // Filter by search query
      if (q) {
        results = results.filter((r: any) => 
          r.transaction_id?.toLowerCase().includes(q.toLowerCase())
        );
      }
      
      return results;
    },
  });

  const openReceipt = (tx: any) => {
    navigate(`/pos/transactions/${tx.transaction_id}`);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID or cashier..." />
            <Button
              onClick={() => {
                /* no-op, query auto */
              }}
            >
              Search
            </Button>
          </div>

          {isLoading ? (
            <div>Loading...</div>
          ) : receipts.length === 0 ? (
            <div className="text-muted-foreground">No receipts found</div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r: any) => (
                <div 
                  key={r.transaction_id} 
                  className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => openReceipt(r)}
                >
                  <div>
                    <div className="font-medium font-mono text-sm">{r.transaction_id}</div>
                    <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">${r.total?.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{r.payment_method}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openReceipt(r); }}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// CRITICAL FIX: This line MUST be present for the 'default' import to work
export default POSReceipts;
