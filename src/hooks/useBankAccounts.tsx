import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  currency_id: string;
  opening_balance: number;
  current_balance: number;
  account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankReconciliation {
  id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  reconciled_balance: number;
  status: string;
  reconciled_by?: string;
  reconciled_at?: string;
  created_at: string;
  updated_at: string;
  bank_account?: BankAccount;
}

export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  journal_entry_id: string;
  transaction_date: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  is_reconciled: boolean;
  created_at: string;
}

export const useBankAccounts = () => {
  return useQuery({
    queryKey: queryKeys.banking.accounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("account_name");

      if (error) throw error;
      return data as BankAccount[];
    },
  });
};

export const useBankAccountDetail = (accountId: string) => {
  return useQuery({
    queryKey: queryKeys.banking.detail(accountId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (error) throw error;
      return data as BankAccount;
    },
    enabled: !!accountId,
  });
};

export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Partial<BankAccount>) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banking.all });
      toast.success("Bank account created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bank account: ${error.message}`);
    },
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BankAccount> }) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banking.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.banking.detail(variables.id) });
      toast.success("Bank account updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bank account: ${error.message}`);
    },
  });
};

export const useBankReconciliations = (bankAccountId?: string) => {
  return useQuery({
    queryKey: queryKeys.banking.reconciliations(bankAccountId),
    queryFn: async () => {
      let query = supabase
        .from("bank_reconciliation")
        .select(`
          *,
          bank_account:bank_accounts!bank_reconciliation_bank_account_id_fkey(
            id,
            account_name,
            bank_name
          )
        `)
        .order("statement_date", { ascending: false });

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BankReconciliation[];
    },
  });
};

export const useReconciliationDetail = (reconciliationId: string) => {
  return useQuery({
    queryKey: queryKeys.banking.reconciliationDetail(reconciliationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_reconciliation")
        .select(`
          *,
          bank_account:bank_accounts!bank_reconciliation_bank_account_id_fkey(*)
        `)
        .eq("id", reconciliationId)
        .single();

      if (error) throw error;
      return data as BankReconciliation;
    },
    enabled: !!reconciliationId,
  });
};

export const useCreateReconciliation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reconciliation: Partial<BankReconciliation>) => {
      const { data, error } = await supabase
        .from("bank_reconciliation")
        .insert(reconciliation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banking.reconciliations() });
      toast.success("Reconciliation created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create reconciliation: ${error.message}`);
    },
  });
};

export const useCompleteReconciliation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reconciliationId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bank_reconciliation")
        .update({
          status: "reconciled",
          reconciled_by: user.user.id,
          reconciled_at: new Date().toISOString(),
        })
        .eq("id", reconciliationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banking.reconciliations() });
      toast.success("Reconciliation completed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete reconciliation: ${error.message}`);
    },
  });
};

export const useReconciliationItems = (reconciliationId: string) => {
  return useQuery({
    queryKey: ["bank-reconciliation-items", reconciliationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_reconciliation_items")
        .select("*")
        .eq("reconciliation_id", reconciliationId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data as ReconciliationItem[];
    },
    enabled: !!reconciliationId,
  });
};

export const useToggleReconciliationItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isReconciled }: { itemId: string; isReconciled: boolean }) => {
      const { data, error } = await supabase
        .from("bank_reconciliation_items")
        .update({ is_reconciled: isReconciled })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-items"] });
    },
  });
};

export const useBankTransactions = (bankAccountId: string) => {
  return useQuery({
    queryKey: queryKeys.banking.transactions(bankAccountId),
    queryFn: async () => {
      // Get journal entries related to this bank account
      const { data: bankAccount } = await supabase
        .from("bank_accounts")
        .select("account_id")
        .eq("id", bankAccountId)
        .single();

      if (!bankAccount) throw new Error("Bank account not found");

      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          id,
          debit_amount,
          credit_amount,
          description,
          journal_entry:journal_entries!journal_entry_lines_journal_entry_id_fkey(
            id,
            entry_number,
            entry_date,
            description,
            status
          )
        `)
        .eq("account_id", bankAccount.account_id)
        .order("journal_entry.entry_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId,
  });
};
