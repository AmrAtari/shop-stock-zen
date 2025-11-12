import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemSettings {
  id: string;
  currency: string;
  default_tax_rate: number;
  default_unit: string;
  low_stock_threshold: number;
  enable_audit_log: boolean;
  require_2fa: boolean;
  updated_at?: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          currency: "USD",
          default_tax_rate: 5.0,
          default_unit: "pcs",
          low_stock_threshold: 5,
          enable_audit_log: true,
          require_2fa: false,
        };

        const { data: newSettings, error: insertError } = await supabase
          .from("system_settings")
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      }
    } catch (error: any) {
      console.error("Failed to load system settings:", error);
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from("system_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast.success("System settings updated successfully");
    } catch (error: any) {
      console.error("Failed to update system settings:", error);
      toast.error("Failed to update system settings");
      throw error;
    }
  };

  const formatCurrency = (amount: number): string => {
    if (!settings) return `$${amount.toFixed(2)}`;

    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CNY: "¥",
      SAR: "ر.س",
      AED: "د.إ",
      EGP: "ج.م",
      KWD: "د.ك",
    };

    const symbol = currencySymbols[settings.currency] || settings.currency + " ";
    return `${symbol}${amount.toFixed(2)}`;
  };

  useEffect(() => {
    refreshSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('system-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings'
        },
        () => {
          refreshSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateSettings,
        formatCurrency,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
};
