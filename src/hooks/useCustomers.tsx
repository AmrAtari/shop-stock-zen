import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  customer_code: string | null;
  company_name: string | null;
  tax_id: string | null;
  credit_limit: number;
  outstanding_balance: number;
  customer_type: string;
  status: string;
  notes: string | null;
  loyalty_points: number;
  created_at: string | null;
  created_by: string | null;
}

export interface CustomerContact {
  id: string;
  customer_id: number;
  contact_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  created_at: string;
}

export const useCustomers = (filters?: {
  search?: string;
  status?: string;
  customerType?: string;
}) => {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("name");

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%`
        );
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.customerType && filters.customerType !== "all") {
        query = query.eq("customer_type", filters.customerType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
};

export const useCustomer = (id: number | undefined) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
};

export const useCustomerContacts = (customerId: number | undefined) => {
  return useQuery({
    queryKey: ["customer-contacts", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("customer_contacts")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as CustomerContact[];
    },
    enabled: !!customerId,
  });
};

export const useCustomerGroups = () => {
  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CustomerGroup[];
    },
  });
};

export const useCustomerPurchaseHistory = (customerId: number | undefined) => {
  return useQuery({
    queryKey: ["customer-purchase-history", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items (*)
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: number }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(customer)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
      toast.success("Customer updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete customer: ${error.message}`);
    },
  });
};

export const useCreateCustomerContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Partial<CustomerContact>) => {
      const { data, error } = await supabase
        .from("customer_contacts")
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-contacts", variables.customer_id] });
      toast.success("Contact added successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to add contact: ${error.message}`);
    },
  });
};

export const useCreateCustomerGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: Partial<CustomerGroup>) => {
      const { data, error } = await supabase
        .from("customer_groups")
        .insert(group)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Customer group created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });
};
