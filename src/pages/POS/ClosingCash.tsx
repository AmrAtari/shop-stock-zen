// src/pos/ClosingCash.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePOS } from "./POSContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ClosingCash = () => {
  const { sessionId, cashierId, closeSession, openSession, isSessionOpen } = usePOS();
  const [startCash, setStartCash] = useState(0);
  const [endCash, setEndCash] = useState(0);

  const { data: sessionSales } = useQuery({
    queryKey: ["session-sales", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data } = await supabase.from("transactions").select("total, payment_method").eq("session_id", sessionId);
      return data || [];
    },
  });

  const expectedCash = (sessionSales || []).reduce(
    (s: number, t: any) => s + (t.payment_method === "cash" ? t.total : 0),
    0,
  );

  const handleOpen = async () => {
    const cashier = prompt("cashier id:");
    if (!cashier) return toast.error("Cashier required");
    const start = parseFloat(prompt("Start cash amount", "0") || "0");
    await openSession(cashier, start);
  };

  const handleClose = async () => {
    if (!sessionId) return toast.error("No session open");
    await closeSession(endCash, `Close by ${cashierId}`);
    toast.success(`Closed. Expected cash: ${expectedCash}, Counted: ${endCash}`);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Closing Cash</CardTitle>
        </CardHeader>
        <CardContent>
          {!isSessionOpen ? (
            <>
              <div className="mb-3">No session open</div>
              <Button onClick={handleOpen}>Open Session</Button>
            </>
          ) : (
            <>
              <div className="mb-3">Session: {sessionId}</div>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <label className="text-sm">Expected Cash (from sales)</label>
                  <div className="font-bold">${expectedCash.toFixed(2)}</div>
                </div>

                <div>
                  <label className="text-sm">Counted Cash</label>
                  <Input
                    type="number"
                    value={endCash}
                    onChange={(e) => setEndCash(parseFloat(e.target.value || "0"))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleClose}>Close Session</Button>
                <Button variant="outline" onClick={() => window.print()}>
                  Print Summary
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClosingCash;
