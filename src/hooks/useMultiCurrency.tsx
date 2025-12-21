import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface ExchangeRate {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  effective_date: string;
  source: string;
  created_at: string;
  from_currency?: { name: string };
  to_currency?: { name: string };
}

interface Currency {
  id: string;
  name: string;
  created_at: string;
}

// Currency Hooks
export const useCurrencies = () => {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currency_")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Currency[];
    },
  });
};

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currency: { name: string }) => {
      const { data, error } = await supabase
        .from("currency_")
        .insert(currency)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Currency created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create currency");
    },
  });
};

// Exchange Rate Hooks
export const useExchangeRates = (fromCurrencyId?: string, toCurrencyId?: string) => {
  return useQuery({
    queryKey: ["exchange-rates", fromCurrencyId, toCurrencyId],
    queryFn: async () => {
      let query = supabase
        .from("exchange_rates")
        .select(`
          *,
          from_currency:from_currency_id(name),
          to_currency:to_currency_id(name)
        `)
        .order("effective_date", { ascending: false });

      if (fromCurrencyId) {
        query = query.eq("from_currency_id", fromCurrencyId);
      }
      if (toCurrencyId) {
        query = query.eq("to_currency_id", toCurrencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExchangeRate[];
    },
  });
};

export const useCurrentExchangeRate = (fromCurrencyId: string, toCurrencyId: string) => {
  return useQuery({
    queryKey: ["current-exchange-rate", fromCurrencyId, toCurrencyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("from_currency_id", fromCurrencyId)
        .eq("to_currency_id", toCurrencyId)
        .lte("effective_date", today)
        .order("effective_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as ExchangeRate | null;
    },
    enabled: !!fromCurrencyId && !!toCurrencyId,
  });
};

export const useCreateExchangeRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: {
      from_currency_id: string;
      to_currency_id: string;
      rate: number;
      effective_date: string;
      source?: string;
    }) => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-exchange-rate"] });
      toast.success("Exchange rate created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create exchange rate");
    },
  });
};

export const useUpdateExchangeRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExchangeRate> & { id: string }) => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-exchange-rate"] });
      toast.success("Exchange rate updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update exchange rate");
    },
  });
};

export const useDeleteExchangeRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("exchange_rates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast.success("Exchange rate deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete exchange rate");
    },
  });
};

// Currency Conversion Helper
export const convertCurrency = (
  amount: number,
  rate: number | null | undefined
): number | null => {
  if (rate == null || rate === 0) return null;
  return amount * rate;
};
