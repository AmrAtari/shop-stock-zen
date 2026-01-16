// src/pos/ClosingCash.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePOS } from "./POSContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Store } from "lucide-react";

type StoreOption = {
  id: string;
  name: string;
  location: string | null;
};

const ClosingCash = () => {
  const { sessionId, cashierId, closeSession, openSession, isSessionOpen } = usePOS();
  const [endCash, setEndCash] = useState(0);
  
  // Session dialog state
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionCashierInput, setSessionCashierInput] = useState("");
  const [sessionStartCash, setSessionStartCash] = useState("0");
  const [sessionSelectedStoreId, setSessionSelectedStoreId] = useState("");
  const [sessionStores, setSessionStores] = useState<StoreOption[]>([]);
  const [loadingSessionStores, setLoadingSessionStores] = useState(false);

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

  // Fetch stores when session dialog opens
  useEffect(() => {
    if (showSessionDialog) {
      setLoadingSessionStores(true);
      supabase
        .from("stores")
        .select("id, name, location")
        .order("name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to load stores:", error);
            toast.error("Failed to load stores");
            setSessionStores([]);
          } else {
            setSessionStores(data || []);
          }
          setLoadingSessionStores(false);
        });
    }
  }, [showSessionDialog]);

  const handleSessionDialogSubmit = async () => {
    if (!sessionCashierInput.trim()) {
      return toast.error("Please enter your Cashier ID or name.");
    }
    if (!sessionSelectedStoreId) {
      return toast.error("Please select a store.");
    }
    const startCash = parseFloat(sessionStartCash || "0");
    if (isNaN(startCash) || startCash < 0) {
      return toast.error("Starting cash must be a valid non-negative number.");
    }
    
    try {
      await openSession(sessionCashierInput.trim(), startCash, sessionSelectedStoreId);
      setShowSessionDialog(false);
      setSessionCashierInput("");
      setSessionStartCash("0");
      setSessionSelectedStoreId("");
    } catch (error) {
      // Error is already handled in POSContext
    }
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
              <Button onClick={() => setShowSessionDialog(true)}>Open Session</Button>
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

      {/* Open Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start New POS Session</DialogTitle>
            <DialogDescription>
              Select your store and enter your details to begin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Store Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="store" className="text-right font-medium">
                Store <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={sessionSelectedStoreId} 
                onValueChange={setSessionSelectedStoreId} 
                disabled={loadingSessionStores}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={loadingSessionStores ? "Loading stores..." : "Select your store"} />
                </SelectTrigger>
                <SelectContent>
                  {sessionStores.length === 0 && !loadingSessionStores ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No stores available
                    </div>
                  ) : (
                    sessionStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span>{store.name}</span>
                          {store.location && (
                            <span className="text-muted-foreground text-xs">
                              ({store.location})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Cashier ID */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cashier" className="text-right font-medium">
                Cashier ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cashier"
                value={sessionCashierInput}
                onChange={(e) => setSessionCashierInput(e.target.value)}
                className="col-span-3"
                placeholder="Enter your name or ID"
              />
            </div>

            {/* Starting Cash */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startCash" className="text-right font-medium">
                Start Cash
              </Label>
              <Input
                id="startCash"
                type="number"
                value={sessionStartCash}
                onChange={(e) => setSessionStartCash(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSessionDialogSubmit} 
              disabled={loadingSessionStores || !sessionSelectedStoreId}
              className="w-full sm:w-auto"
            >
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClosingCash;
