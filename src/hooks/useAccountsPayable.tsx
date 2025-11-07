import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";

export interface VendorBill {
  id: string;
  bill_number: string;
  supplier_id: string;
  purchase_order_id?: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  currency_id: string;
  exchange_rate: number;
  status: string;
  payment_terms?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
  };
}

export interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  amount: number;
  currency_id: string;
  exchange_rate: number;
  reference_number?: string;
  bank_account_id?: string;
  supplier_id?: string;
  customer_id?: number;
  description: string;
  journal_entry_id?: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface AgingBucket {
  supplier_id: string;
  supplier_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export const useAccountsPayable = (status?: string) => {
  return useQuery({
    queryKey: queryKeys.accountsPayable.bills(status),
    queryFn: async () => {
      let query = supabase
        .from("accounts_payable")
        .select(`
          *,
          supplier:suppliers!accounts_payable_supplier_id_fkey(
            id,
            name,
            contact_person,
            email,
            phone
          )
        `)
        .order("bill_date", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VendorBill[];
    },
  });
};

export const useBillDetail = (billId: string) => {
  return useQuery({
    queryKey: queryKeys.accountsPayable.detail(billId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select(`
          *,
          supplier:suppliers!accounts_payable_supplier_id_fkey(
            id,
            name,
            contact_person,
            email,
            phone,
            address
          )
        `)
        .eq("id", billId)
        .single();

      if (error) throw error;
      return data as VendorBill;
    },
    enabled: !!billId,
  });
};

export const useCreateBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: Partial<VendorBill>) => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .insert(bill)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsPayable.all });
      toast.success("Bill created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bill: ${error.message}`);
    },
  });
};

export const useUpdateBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorBill> }) => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsPayable.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsPayable.detail(variables.id) });
      toast.success("Bill updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bill: ${error.message}`);
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      payment_date: string;
      payment_method: string;
      amount: number;
      currency_id: string;
      reference_number?: string;
      supplier_id: string;
      description: string;
      bill_id: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          payment_date: payment.payment_date,
          payment_type: "vendor_payment",
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency_id: payment.currency_id,
          exchange_rate: 1.0,
          reference_number: payment.reference_number,
          supplier_id: payment.supplier_id,
          description: payment.description,
          status: "cleared",
          created_by: user.user.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create payment allocation
      const { error: allocationError } = await supabase
        .from("payment_allocations")
        .insert({
          payment_id: paymentData.id,
          ap_id: payment.bill_id,
          allocated_amount: payment.amount,
        });

      if (allocationError) throw allocationError;

      // Update bill paid amount and status
      const { data: bill } = await supabase
        .from("accounts_payable")
        .select("total_amount, paid_amount")
        .eq("id", payment.bill_id)
        .single();

      if (bill) {
        const newPaidAmount = (bill.paid_amount || 0) + payment.amount;
        const newBalance = bill.total_amount - newPaidAmount;
        const newStatus =
          newBalance <= 0 ? "paid" : newBalance < bill.total_amount ? "partial" : "approved";

        await supabase
          .from("accounts_payable")
          .update({
            paid_amount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
          })
          .eq("id", payment.bill_id);
      }

      return paymentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsPayable.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsPayable.payments() });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
};

export const useVendorAging = () => {
  return useQuery({
    queryKey: queryKeys.accountsPayable.aging,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select(`
          id,
          supplier_id,
          bill_date,
          due_date,
          balance,
          status,
          supplier:suppliers!accounts_payable_supplier_id_fkey(
            id,
            name
          )
        `)
        .neq("status", "paid")
        .neq("status", "cancelled");

      if (error) throw error;

      // Calculate aging buckets
      const today = new Date();
      const agingMap = new Map<string, AgingBucket>();

      data.forEach((bill: any) => {
        if (!bill.supplier) return;

        const dueDate = new Date(bill.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = parseFloat(bill.balance) || 0;

        if (!agingMap.has(bill.supplier_id)) {
          agingMap.set(bill.supplier_id, {
            supplier_id: bill.supplier_id,
            supplier_name: bill.supplier.name,
            current: 0,
            days_30: 0,
            days_60: 0,
            days_90: 0,
            over_90: 0,
            total: 0,
          });
        }

        const bucket = agingMap.get(bill.supplier_id)!;

        if (daysOverdue < 0) {
          bucket.current += balance;
        } else if (daysOverdue <= 30) {
          bucket.days_30 += balance;
        } else if (daysOverdue <= 60) {
          bucket.days_60 += balance;
        } else if (daysOverdue <= 90) {
          bucket.days_90 += balance;
        } else {
          bucket.over_90 += balance;
        }

        bucket.total += balance;
      });

      return Array.from(agingMap.values());
    },
  });
};

export const useBillPayments = (billId?: string) => {
  return useQuery({
    queryKey: queryKeys.accountsPayable.payments(billId),
    queryFn: async () => {
      let query = supabase
        .from("payment_allocations")
        .select(`
          id,
          allocated_amount,
          created_at,
          payment:payments!payment_allocations_payment_id_fkey(
            id,
            payment_number,
            payment_date,
            payment_method,
            amount,
            reference_number,
            status
          )
        `);

      if (billId) {
        query = query.eq("ap_id", billId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!billId,
  });
};
