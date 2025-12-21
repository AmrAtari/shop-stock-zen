import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface IntegrationConfig {
  id: string;
  integration_name: string;
  integration_type: string;
  config: Record<string, any>;
  is_active: boolean;
  last_sync_at: string | null;
  sync_frequency_minutes: number;
  created_at: string;
  updated_at: string;
}

interface IntegrationSyncLog {
  id: string;
  integration_id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  details: Record<string, any> | null;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret_key: string | null;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  retry_count: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  delivered_at: string | null;
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  rate_limit: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// Integration Config Hooks
export const useIntegrations = () => {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_configs")
        .select("*")
        .order("integration_name");

      if (error) throw error;
      return data as IntegrationConfig[];
    },
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: {
      integration_name: string;
      integration_type: string;
      config?: Record<string, any>;
      sync_frequency_minutes?: number;
    }) => {
      const { data, error } = await supabase
        .from("integration_configs")
        .insert(integration)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create integration");
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IntegrationConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("integration_configs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update integration");
    },
  });
};

export const useToggleIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("integration_configs")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`Integration ${data.is_active ? "activated" : "deactivated"}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle integration");
    },
  });
};

// Sync Log Hooks
export const useIntegrationSyncLogs = (integrationId?: string) => {
  return useQuery({
    queryKey: ["integration-sync-logs", integrationId],
    queryFn: async () => {
      let query = supabase
        .from("integration_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);

      if (integrationId) {
        query = query.eq("integration_id", integrationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IntegrationSyncLog[];
    },
  });
};

export const useCreateSyncLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      integration_id: string;
      sync_type: string;
      status: string;
      records_processed?: number;
      records_failed?: number;
      error_message?: string;
      details?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("integration_sync_logs")
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-sync-logs"] });
    },
  });
};

// Webhook Hooks
export const useWebhooks = () => {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as WebhookEndpoint[];
    },
  });
};

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (webhook: {
      name: string;
      url: string;
      events: string[];
      secret_key?: string;
      headers?: Record<string, string>;
      retry_count?: number;
    }) => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .insert(webhook)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create webhook");
    },
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebhookEndpoint> & { id: string }) => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update webhook");
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete webhook");
    },
  });
};

// Webhook Deliveries
export const useWebhookDeliveries = (webhookId?: string) => {
  return useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: async () => {
      let query = supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (webhookId) {
        query = query.eq("webhook_id", webhookId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookDelivery[];
    },
  });
};

// API Keys Hooks
export const useApiKeys = () => {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: {
      name: string;
      key_hash: string;
      permissions?: string[];
      rate_limit?: number;
      expires_at?: string;
    }) => {
      const { data, error } = await supabase
        .from("api_keys")
        .insert(apiKey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create API key");
    },
  });
};

export const useToggleApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("api_keys")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(`API key ${data.is_active ? "activated" : "deactivated"}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle API key");
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });
};
