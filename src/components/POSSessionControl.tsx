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
import { LogOut, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StoreOption {
  id: string;
  name: string;
  location: string | null;
}

export const POSSessionControl = () => {
  const { isSessionOpen, cashierId, sessionId, storeId, openSession } = usePOS();
  const [open, setOpen] = useState(false);
  const [cashierInput, setCashierInput] = useState("");
  const [startCashInput, setStartCashInput] = useState("0");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [currentStoreName, setCurrentStoreName] = useState<string | null>(null);

  // Clear any corrupted localStorage on mount
  useEffect(() => {
    const storedStoreId = localStorage.getItem("pos-store-id");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (storedStoreId && !uuidRegex.test(storedStoreId)) {
      console.warn("Clearing invalid store_id from localStorage:", storedStoreId);
      localStorage.removeItem("pos-session-id");
      localStorage.removeItem("pos-cashier-id");
      localStorage.removeItem("pos-store-id");
    }
  }, []);

  // Fetch current store name if session is open
  useEffect(() => {
    if (isSessionOpen && storeId) {
      supabase
        .from("stores")
        .select("name")
        .eq("id", storeId)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentStoreName(data.name);
          }
        });
    }
  }, [isSessionOpen, storeId]);

  // Fetch stores when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingStores(true);
      supabase
        .from("stores")
        .select("id, name, location")
        .order("name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to load stores:", error);
            toast.error("Failed to load stores");
            setStores([]);
          } else {
            setStores(data || []);
          }
          setLoadingStores(false);
        });
    }
  }, [open]);

  const handleOpenSession = async () => {
    const startCash = parseFloat(startCashInput);
    
    if (!cashierInput.trim()) {
      return toast.error("Please enter your Cashier ID or name.");
    }
    
    if (!selectedStoreId) {
      return toast.error("Please select a store from the dropdown.");
    }
    
    if (isNaN(startCash) || startCash < 0) {
      return toast.error("Starting cash must be a valid non-negative number.");
    }

    try {
      await openSession(cashierInput.trim(), startCash, selectedStoreId);
      setOpen(false);
      setCashierInput("");
      setStartCashInput("0");
      setSelectedStoreId("");
    } catch (error) {
      // Error is already handled in POSContext
    }
  };

  if (isSessionOpen) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <Store className="h-4 w-4" />
          <span>{currentStoreName || "Store"}</span>
          <span className="text-muted-foreground">|</span>
          <span>Cashier: {cashierId}</span>
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
          <DialogTitle>Start New POS Session</DialogTitle>
          <DialogDescription>
            Select your store and enter your details to begin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Store Selection - First and Required */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="storeId" className="text-right font-medium">
              Store <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedStoreId} 
              onValueChange={setSelectedStoreId} 
              disabled={loadingStores}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={loadingStores ? "Loading stores..." : "Select your store"} />
              </SelectTrigger>
              <SelectContent>
                {stores.length === 0 && !loadingStores ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No stores available
                  </div>
                ) : (
                  stores.map((store) => (
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
            <Label htmlFor="cashierId" className="text-right font-medium">
              Cashier ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cashierId"
              value={cashierInput}
              onChange={(e) => setCashierInput(e.target.value)}
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
              value={startCashInput}
              onChange={(e) => setStartCashInput(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleOpenSession} 
            disabled={loadingStores || !selectedStoreId}
            className="w-full sm:w-auto"
          >
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};