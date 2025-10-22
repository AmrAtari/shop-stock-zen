// src/pos/POSContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface POSContextValue {
  sessionId: string | null;
  cashierId: string | null;
  openSession: (cashierId: string, startCash: number) => Promise<void>;
  closeSession: (endCash: number, notes?: string) => Promise<void>;
  isSessionOpen: boolean;
  holds: Record<string, any[]>; // id => cart
  saveHold: (holdId: string, cart: any[]) => void;
  resumeHold: (holdId: string) => any[] | null;
  removeHold: (holdId: string) => void;
}

const POSContext = createContext<POSContextValue | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [holds, setHolds] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Optionally load last open session from localStorage
    const s = localStorage.getItem("pos-session-id");
    const c = localStorage.getItem("pos-cashier-id");
    if (s && c) {
      setSessionId(s);
      setCashierId(c);
      setIsSessionOpen(true);
    }
    const storedHolds = localStorage.getItem("pos-holds");
    if (storedHolds) setHolds(JSON.parse(storedHolds));
  }, []);

  const persistHolds = (newHolds: Record<string, any[]>) => {
    setHolds(newHolds);
    localStorage.setItem("pos-holds", JSON.stringify(newHolds));
  };

  const saveHold = (holdId: string, cart: any[]) => {
    const copy = { ...holds, [holdId]: cart };
    persistHolds(copy);
    toast.success("Cart held");
  };

  const resumeHold = (holdId: string) => {
    const cart = holds[holdId] ?? null;
    return cart;
  };

  const removeHold = (holdId: string) => {
    const copy = { ...holds };
    delete copy[holdId];
    persistHolds(copy);
  };

  const openSession = async (cashier: string, startCash: number) => {
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .insert([{ cashier_id: cashier, start_cash: startCash, open_at: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      setCashierId(cashier);
      setIsSessionOpen(true);
      localStorage.setItem("pos-session-id", data.id);
      localStorage.setItem("pos-cashier-id", cashier);
      toast.success("Session opened");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to open session");
    }
  };

  const closeSession = async (endCash: number, notes?: string) => {
    if (!sessionId) {
      toast.error("No session open");
      return;
    }

    try {
      // compute expected cash from sales for this session
      const { data: cashSumRes, error: sumErr } = await supabase.rpc("pos_session_expected_cash", {
        session_id_param: sessionId,
      }); // optional RPC if you have one

      // fallback: you can compute expected by querying sales table for this session
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
  if (!ctx) throw new Error("usePOS must be used inside POSProvider");
  return ctx;
};
