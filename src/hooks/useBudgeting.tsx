import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface BudgetPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  status: string;
  created_at: string;
  created_by: string | null;
}

interface BudgetLine {
  id: string;
  budget_period_id: string;
  account_id: string;
  store_id: string | null;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  accounts?: { account_name: string; account_code: string };
  stores?: { name: string };
}

interface BudgetAdjustment {
  id: string;
  budget_line_id: string;
  adjustment_type: string;
  amount: number;
  reason: string | null;
  approved_by: string | null;
  created_at: string;
  created_by: string | null;
}

// Budget Periods Hooks
export const useBudgetPeriods = () => {
  return useQuery({
    queryKey: ["budget-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_periods")
        .select("*")
        .order("fiscal_year", { ascending: false })
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as BudgetPeriod[];
    },
  });
};

export const useCreateBudgetPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (period: Omit<BudgetPeriod, "id" | "created_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("budget_periods")
        .insert(period)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-periods"] });
      toast.success("Budget period created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create budget period");
    },
  });
};

export const useUpdateBudgetPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetPeriod> & { id: string }) => {
      const { data, error } = await supabase
        .from("budget_periods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-periods"] });
      toast.success("Budget period updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update budget period");
    },
  });
};

// Budget Lines Hooks
export const useBudgetLines = (periodId?: string) => {
  return useQuery({
    queryKey: ["budget-lines", periodId],
    queryFn: async () => {
      let query = supabase
        .from("budget_lines")
        .select(`
          *,
          accounts:account_id(account_name, account_code),
          stores:store_id(name)
        `)
        .order("created_at", { ascending: false });

      if (periodId) {
        query = query.eq("budget_period_id", periodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BudgetLine[];
    },
    enabled: !!periodId,
  });
};

export const useCreateBudgetLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (line: {
      budget_period_id: string;
      account_id: string;
      store_id?: string | null;
      budgeted_amount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("budget_lines")
        .insert(line)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines"] });
      toast.success("Budget line created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create budget line");
    },
  });
};

export const useUpdateBudgetLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetLine> & { id: string }) => {
      const { data, error } = await supabase
        .from("budget_lines")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines"] });
      toast.success("Budget line updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update budget line");
    },
  });
};

// Budget Adjustments Hooks
export const useBudgetAdjustments = (lineId?: string) => {
  return useQuery({
    queryKey: ["budget-adjustments", lineId],
    queryFn: async () => {
      let query = supabase
        .from("budget_adjustments")
        .select("*")
        .order("created_at", { ascending: false });

      if (lineId) {
        query = query.eq("budget_line_id", lineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BudgetAdjustment[];
    },
    enabled: !!lineId,
  });
};

export const useCreateBudgetAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustment: {
      budget_line_id: string;
      adjustment_type: string;
      amount: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("budget_adjustments")
        .insert(adjustment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["budget-lines"] });
      toast.success("Budget adjustment recorded");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record budget adjustment");
    },
  });
};

// Budget vs Actual Summary
export const useBudgetSummary = (periodId: string) => {
  return useQuery({
    queryKey: ["budget-summary", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_lines")
        .select("budgeted_amount, actual_amount, variance")
        .eq("budget_period_id", periodId);

      if (error) throw error;

      const summary = {
        totalBudgeted: data.reduce((sum, line) => sum + Number(line.budgeted_amount), 0),
        totalActual: data.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0),
        totalVariance: data.reduce((sum, line) => sum + Number(line.variance || 0), 0),
        lineCount: data.length,
        overBudgetCount: data.filter((line) => Number(line.variance) < 0).length,
        underBudgetCount: data.filter((line) => Number(line.variance) > 0).length,
      };

      return summary;
    },
    enabled: !!periodId,
  });
};
