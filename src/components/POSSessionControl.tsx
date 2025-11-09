// src/components/POSSessionControl.tsx

import { useState } from "react";
// 🎯 DEFINITIVE CORRECTED PATH using the project alias assuming @/ -> src/
// This bypasses the relative path confusion entirely.
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
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const POSSessionControl = () => {
  const { isSessionOpen, cashierId, sessionId, openSession } = usePOS();
  const [open, setOpen] = useState(false);
  const [cashierInput, setCashierInput] = useState("");
  const [startCashInput, setStartCashInput] = useState("0");

  const handleOpenSession = async () => {
    const startCash = parseFloat(startCashInput);
    if (!cashierInput) {
      return toast.error("Cashier ID is required.");
    }
    if (isNaN(startCash) || startCash < 0) {
      return toast.error("Starting cash must be a valid non-negative number.");
    }

    try {
      await openSession(cashierInput, startCash);
      setOpen(false); // Close modal on success
      setCashierInput("");
      setStartCashInput("0");
    } catch (error) {
      // Error handling is assumed to be handled within usePOS/POSContext
    }
  };

  if (isSessionOpen) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-green-600">
          Session: <span className="font-bold">{sessionId?.substring(0, 4)}...</span> (Cashier: {cashierId})
        </div>
        {/* Directs user to the ClosingCash page to perform closing procedure */}
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
          <DialogDescription>Enter your cashier ID and the starting cash amount to begin.</DialogDescription>
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
        </div>
        <DialogFooter>
          <Button onClick={handleOpenSession}>Start Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
