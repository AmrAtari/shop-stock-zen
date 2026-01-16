// src/pos/POSContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// UUID validation helper
const isValidUUID = (str: string | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Define the CartItem structure for the holds
export interface CartItem {
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

// Customer type for POS
export interface POSCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  customer_type: string;
  credit_limit: number;
  outstanding_balance: number;
}

// Loyalty settings
export interface LoyaltySettings {
  pointsPerDollar: number;
  pointValueInCents: number;
  minRedeemPoints: number;
}

interface POSContextValue {
  sessionId: string | null;
  cashierId: string | null;
  storeId: string | null;
  openSession: (cashierId: string, startCash: number, storeId: string) => Promise<void>;
  closeSession: (endCash: number, notes?: string) => Promise<void>;
  isSessionOpen: boolean;
  holds: Record<string, CartItem[]>; // id => cart
  saveHold: (holdId: string, cart: CartItem[]) => void;
  resumeHold: (holdId: string) => CartItem[] | null;
  removeHold: (holdId: string) => void;
  // Customer & Loyalty
  selectedCustomer: POSCustomer | null;
  setSelectedCustomer: (customer: POSCustomer | null) => void;
  loyaltySettings: LoyaltySettings;
}

const POSContext = createContext<POSContextValue | undefined>(undefined);

// Default loyalty settings
const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPerDollar: 1, // 1 point per $1 spent
  pointValueInCents: 1, // 1 point = 1 cent discount
  minRedeemPoints: 100, // Minimum 100 points to redeem
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [loyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  
  // Holds state is initialized by loading from localStorage
  const [holds, setHolds] = useState<Record<string, CartItem[]>>(() => {
    const savedHolds = localStorage.getItem("pos-holds");
    return savedHolds ? JSON.parse(savedHolds) : {};
  });

  // --- Session Management (Keep previous implementation) ---

  useEffect(() => {
    // Load and validate last open session from localStorage
    const s = localStorage.getItem("pos-session-id");
    const c = localStorage.getItem("pos-cashier-id");
    const st = localStorage.getItem("pos-store-id");
    
    // Validate store_id is a proper UUID - if not, clear the invalid data
    if (st && !isValidUUID(st)) {
      console.warn("Invalid store_id in localStorage, clearing session data:", st);
      localStorage.removeItem("pos-session-id");
      localStorage.removeItem("pos-cashier-id");
      localStorage.removeItem("pos-store-id");
      return;
    }
    
    if (s && c && st) {
      setSessionId(s);
      setCashierId(c);
      setStoreId(st);
      setIsSessionOpen(true);
    }
  }, []);

  const openSession = async (cashierId: string, startCash: number, storeId: string) => {
    try {
      // Validate storeId is a proper UUID
      if (!isValidUUID(storeId)) {
        throw new Error(`Invalid store ID format: "${storeId}". Please select a valid store.`);
      }

      // 1. Check for existing open session for this cashier
      const { data: existingSessions, error: fetchError } = await supabase
        .from("cash_sessions")
        .select("id, store_id")
        .eq("cashier_id", cashierId)
        .is("close_at", null);

      if (fetchError) throw fetchError;

      if (existingSessions && existingSessions.length > 0) {
        // Resume existing session
        const existingSession = existingSessions[0];
        setSessionId(existingSession.id);
        setCashierId(cashierId);
        setStoreId(existingSession.store_id || storeId);
        setIsSessionOpen(true);
        localStorage.setItem("pos-session-id", existingSession.id);
        localStorage.setItem("pos-cashier-id", cashierId);
        localStorage.setItem("pos-store-id", existingSession.store_id || storeId);
        toast.success(`Resumed existing session: ${existingSession.id}`);
        return;
      }

      // 2. Open new session with store_id
      const { data: newSession, error } = await supabase
        .from("cash_sessions")
        .insert({
          cashier_id: cashierId,
          start_cash: startCash,
          open_at: new Date().toISOString(),
          store_id: storeId,
        })
        .select("id")
        .single();

      if (error) throw error;

      const newSessionId = newSession.id;
      setSessionId(newSessionId);
      setCashierId(cashierId);
      setStoreId(storeId);
      setIsSessionOpen(true);
      localStorage.setItem("pos-session-id", newSessionId);
      localStorage.setItem("pos-cashier-id", cashierId);
      localStorage.setItem("pos-store-id", storeId);
      toast.success(`Session opened: ${newSessionId.substring(0, 8)}...`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to open session: " + err.message);
      throw err;
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
      setStoreId(null);
      setIsSessionOpen(false);
      localStorage.removeItem("pos-session-id");
      localStorage.removeItem("pos-cashier-id");
      localStorage.removeItem("pos-store-id");
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
        storeId,
        openSession,
        closeSession,
        isSessionOpen,
        holds,
        saveHold,
        resumeHold,
        removeHold,
        selectedCustomer,
        setSelectedCustomer,
        loyaltySettings,
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
