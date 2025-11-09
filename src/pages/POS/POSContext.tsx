// src/pos/POSContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define the CartItem structure for the holds
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
  size?: string;
  color?: string;
  cartQuantity: number;
  itemDiscountType?: "fixed" | "percent";
  itemDiscountValue?: number;
}

interface POSContextValue {
  sessionId: string | null;
  cashierId: string | null;
  openSession: (cashierId: string, startCash: number) => Promise<void>;
  closeSession: (endCash: number, notes?: string) => Promise<void>;
  isSessionOpen: boolean;
  holds: Record<string, CartItem[]>; // id => cart
  saveHold: (holdId: string, cart: CartItem[]) => void;
  resumeHold: (holdId: string) => CartItem[] | null;
  removeHold: (holdId: string) => void;
}

const POSContext = createContext<POSContextValue | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  // Holds state is initialized by loading from localStorage
  const [holds, setHolds] = useState<Record<string, CartItem[]>>(() => {
    const savedHolds = localStorage.getItem("pos-holds");
    return savedHolds ? JSON.parse(savedHolds) : {};
  });

  // --- Session Management (Keep previous implementation) ---

  useEffect(() => {
    // Optionally load last open session from localStorage
    const s = localStorage.getItem("pos-session-id");
    const c = localStorage.getItem("pos-cashier-id");
    if (s && c) {
      setSessionId(s);
      setCashierId(c);
      setIsSessionOpen(true);
    }
  }, []);

  const openSession = async (cashierId: string, startCash: number) => {
    try {
      // 1. Check for existing open session for this cashier
      const { data: existingSessions, error: fetchError } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("cashier_id", cashierId)
        .is("close_at", null);

      if (fetchError) throw fetchError;

      if (existingSessions && existingSessions.length > 0) {
        // Resume existing session
        const existingSessionId = existingSessions[0].id;
        setSessionId(existingSessionId);
        setCashierId(cashierId);
        setIsSessionOpen(true);
        localStorage.setItem("pos-session-id", existingSessionId);
        localStorage.setItem("pos-cashier-id", cashierId);
        toast.success(`Resumed existing session: ${existingSessionId}`);
        return;
      }

      // 2. Open new session
      const newSessionId = `SESS-${Date.now()}`;
      const { error } = await supabase.from("cash_sessions").insert({
        id: newSessionId,
        cashier_id: cashierId,
        start_cash: startCash,
        open_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSessionId(newSessionId);
      setCashierId(cashierId);
      setIsSessionOpen(true);
      localStorage.setItem("pos-session-id", newSessionId);
      localStorage.setItem("pos-cashier-id", cashierId);
      toast.success(`Session opened: ${newSessionId}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to open session: " + err.message);
    }
  };

  const closeSession = async (endCash: number, notes?: string) => {
    if (!sessionId) {
      toast.error("No session open");
      return;
    }

    try {
      // For now we'll update the session row with end_cash and close_at
      const { error } = await supabase
        .from("cash_sessions")
        .update({ end_cash: endCash, close_at: new Date().toISOString(), notes })
        .eq("id", sessionId);

      if (error) throw error;
      toast.success("Session closed");
      setSessionId(null);
      setCashierId(null);
      setIsSessionOpen(false);
      localStorage.removeItem("pos-session-id");
      localStorage.removeItem("pos-cashier-id");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to close session");
    }
  };

  // --- Hold Logic (New) ---

  const saveHold = (holdId: string, cart: CartItem[]) => {
    setHolds((prevHolds) => {
      const newHolds = { ...prevHolds, [holdId]: cart };
      localStorage.setItem("pos-holds", JSON.stringify(newHolds));
      return newHolds;
    });
  };

  const resumeHold = (holdId: string): CartItem[] | null => {
    const cart = holds[holdId];
    if (cart) {
      removeHold(holdId); // Remove from holds list
      return cart;
    }
    return null;
  };

  const removeHold = (holdId: string) => {
    setHolds((prevHolds) => {
      const newHolds = { ...prevHolds };
      delete newHolds[holdId];
      localStorage.setItem("pos-holds", JSON.stringify(newHolds));
      return newHolds;
    });
  };

  return (
    <POSContext.Provider
      value={{
        sessionId,
        cashierId,
        openSession,
        closeSession,
        isSessionOpen,
        holds,
        saveHold,
        resumeHold,
        removeHold,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const ctx = useContext(POSContext);
  if (ctx === undefined) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return ctx;
};
