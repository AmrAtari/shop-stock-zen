// src/pos/POSRefunds.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePOS } from "./POSContext";

const POSRefunds = () => {
  const { cashierId } = usePOS();
  const [q, setQ] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Record<string, boolean>>({});

  const { data: receipts = [] } = useQuery({
    queryKey: ["transactions-search", q],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .ilike("id", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const loadSales = async (txId: string) => {
    const { data } = await supabase.from("sales").select("*").eq("transaction_id", txId);
    setSelectedSaleIds({});
    setSelectedTransaction({ id: txId, sales: data || [] });
  };

  const toggleSaleSelect = (saleId: string) => {
    setSelectedSaleIds((s) => ({ ...s, [saleId]: !s[saleId] }));
  };

  const issueRefund = async (mode: "fixed" | "percent", value: number, reason?: string) => {
    if (!selectedTransaction) return toast.error("Select a transaction and items");
    const saleIds = Object.keys(selectedSaleIds).filter((id) => selectedSaleIds[id]);
    if (!saleIds.length) return toast.error("Select items to refund");

    try {
      for (const saleId of saleIds) {
        // fetch sale row
        const { data: saleRow } = await supabase.from("sales").select("*").eq("id", saleId).single();
        if (!saleRow) continue;

        // calculate refund amount
        let refundAmount = 0;
        if (mode === "fixed") {
          refundAmount = Math.min(value, saleRow.amount);
        } else {
          refundAmount = (saleRow.amount * value) / 100;
        }

        // insert refund record
        await supabase.from("refunds").insert({
          transaction_id: selectedTransaction.id,
          sale_id: saleRow.id,
          amount: refundAmount,
          reason: reason || "No reason",
          cashier_id: cashierId,
          created_at: new Date(),
        });

        // mark sale as refunded (or adjust)
        await supabase.from("sales").update({ is_refunded: true }).eq("id", saleRow.id);

        // return item to inventory
        await supabase
          .from("items")
          .update({ quantity: (saleRow.quantity || 0) + (saleRow.quantity || 0) })
          .eq("id", saleRow.item_id);
      }

      toast.success("Refund processed");
      setSelectedTransaction(null);
      setSelectedSaleIds({});
    } catch (err: any) {
      console.error(err);
      toast.error("Refund failed: " + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input placeholder="Search transaction id" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button onClick={() => {}}>Search</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Transactions</h4>
              <div className="space-y-2">
                {receipts.map((r: any) => (
                  <div key={r.id} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{r.id}</div>
                      <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <Button size="sm" onClick={() => loadSales(r.id)}>
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Sales / Items</h4>
              {!selectedTransaction ? (
                <div className="text-muted-foreground">Select a transaction to load its sales</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {(selectedTransaction.sales || []).map((s: any) => (
                      <div key={s.id} className="p-2 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.sku}</div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {s.quantity} — ${s.amount}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={!!selectedSaleIds[s.id]}
                            onChange={() => toggleSaleSelect(s.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={() => issueRefund("fixed", 0, "Full refund")}>Full Refund</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const v = parseFloat(prompt("Enter percent to refund", "100") || "100");
                        issueRefund("percent", v, "Partial percent refund");
                      }}
                    >
                      Percent Refund
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSRefunds;
