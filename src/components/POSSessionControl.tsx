// src/components/POSSessionControl.tsx

import { useState, useEffect } from "react";
import { usePOS } from "@/pages/POS/POSContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
}

export const POSSessionControl = () => {
  const { isSessionOpen, cashierId, sessionId, openSession } = usePOS();
  const [open, setOpen] = useState(false);
  const [cashierInput, setCashierInput] = useState("");
  const [startCashInput, setStartCashInput] = useState("0");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Fetch stores when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingStores(true);
      supabase
        .from("stores")
        .select("id, name")
        .order("name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to load stores:", error);
            toast.error("Failed to load stores");
          } else {
            setStores(data || []);
            // Auto-select first store if available
            if (data && data.length > 0 && !selectedStoreId) {
              setSelectedStoreId(data[0].id);
            }
          }
          setLoadingStores(false);
        });
    }
  }, [open]);

  const handleOpenSession = async () => {
    const startCash = parseFloat(startCashInput);
    if (!cashierInput) {
      return toast.error("Cashier ID is required.");
    }
    if (!selectedStoreId) {
      return toast.error("Please select a store.");
    }
    if (isNaN(startCash) || startCash < 0) {
      return toast.error("Starting cash must be a valid non-negative number.");
    }

    try {
      await openSession(cashierInput, startCash, selectedStoreId);
      setOpen(false);
      setCashierInput("");
      setStartCashInput("0");
    } catch (error) {
      // Error handling is in POSContext
    }
  };

  if (isSessionOpen) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-green-600">
          Session: <span className="font-bold">{sessionId?.substring(0, 8)}...</span> (Cashier: {cashierId})
        </div>
        <Button
          variant="destructive"
          size="sm"
          title="Go to Closing Cash page to end session"
          onClick={() => window.location.assign("/pos/closing")}
        >
          <LogOut className="h-4 w-4 mr-1" /> Close Session
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Open Session</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Session</DialogTitle>
          <DialogDescription>Enter your cashier ID and select a store to begin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cashierId" className="text-right">
              Cashier ID
            </Label>
            <Input
              id="cashierId"
              value={cashierInput}
              onChange={(e) => setCashierInput(e.target.value)}
              className="col-span-3"
              placeholder="e.g., cashier_01"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startCash" className="text-right">
              Start Cash ($)
            </Label>
            <Input
              id="startCash"
              type="number"
              value={startCashInput}
              onChange={(e) => setStartCashInput(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="storeId" className="text-right">
              Store
            </Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId} disabled={loadingStores}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={loadingStores ? "Loading stores..." : "Select a store"} />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleOpenSession} disabled={loadingStores}>
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
