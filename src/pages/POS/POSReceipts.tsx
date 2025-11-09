// src/pos/POSReceipts.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const POSReceipts = () => {
  const [q, setQ] = useState("");
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts", q],
    queryFn: async () => {
      // NOTE: This builder uses 'id' instead of 'transaction_id' in the original snippet,
      // assuming your 'transactions' table uses 'id' as the primary key or unique identifier for search.
      const builder = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
      if (q) builder.ilike("id", `%${q}%`);
      const { data, error } = await builder;
      if (error) throw error;
      return data || [];
    },
  });

  const openReceipt = (tx: any) => {
    // navigate to receipt page / or open modal
    window.location.assign(`/pos/receipt/${tx.id}`);
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
                // Clicking search button is not needed since query is auto-updated on 'q' change
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
                <div key={r.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{r.id}</div>
                    <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="font-semibold">${r.total}</div>
                    <Button variant="outline" size="sm" onClick={() => openReceipt(r)}>
                      Open
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

// 🛑 THIS IS THE CRITICAL LINE THAT MUST BE CORRECT 🛑
export default POSReceipts;
