import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Link2, 
  Key, 
  Webhook, 
  RefreshCcw, 
  Trash2, 
  Copy,
  Check,
  X,
  Activity,
  Clock
} from "lucide-react";
import { 
  useIntegrations, 
  useWebhooks, 
  useApiKeys,
  useCreateIntegration,
  useCreateWebhook,
  useCreateApiKey,
  useDeleteApiKey,
  useDeleteWebhook,
  useUpdateIntegration
} from "@/hooks/useIntegrations";
import { toast } from "sonner";
import { format } from "date-fns";

const Integrations = () => {
  const [showNewIntegrationDialog, setShowNewIntegrationDialog] = useState(false);
  const [showNewWebhookDialog, setShowNewWebhookDialog] = useState(false);
  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false);

  const [newIntegration, setNewIntegration] = useState({
    integration_name: "",
    integration_type: "erp",
    sync_frequency_minutes: 60,
  });
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });
  const [newApiKey, setNewApiKey] = useState({
    name: "",
    permissions: [] as string[],
  });

  const { data: integrations = [], isLoading: integrationsLoading } = useIntegrations();
  const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks();
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useApiKeys();

  const createIntegration = useCreateIntegration();
  const createWebhook = useCreateWebhook();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const deleteWebhook = useDeleteWebhook();
  const updateIntegration = useUpdateIntegration();

  const handleCreateIntegration = async () => {
    try {
      await createIntegration.mutateAsync(newIntegration);
      setShowNewIntegrationDialog(false);
      setNewIntegration({ integration_name: "", integration_type: "erp", sync_frequency_minutes: 60 });
      toast.success("Integration created successfully");
    } catch (error) {
      toast.error("Failed to create integration");
    }
  };

  const handleCreateWebhook = async () => {
    try {
      await createWebhook.mutateAsync(newWebhook);
      setShowNewWebhookDialog(false);
      setNewWebhook({ name: "", url: "", events: [] });
      toast.success("Webhook created successfully");
    } catch (error) {
      toast.error("Failed to create webhook");
    }
  };

  const handleCreateApiKey = async () => {
    try {
      // Generate a simple hash for demo purposes (in production, use a proper key generator)
      const keyHash = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await createApiKey.mutateAsync({ ...newApiKey, key_hash: keyHash });
      setShowNewApiKeyDialog(false);
      setNewApiKey({ name: "", permissions: [] });
      toast.success("API key created successfully");
    } catch (error) {
      toast.error("Failed to create API key");
    }
  };

  const handleToggleIntegration = async (id: string, currentStatus: boolean) => {
    try {
      await updateIntegration.mutateAsync({ id, is_active: !currentStatus });
      toast.success(`Integration ${!currentStatus ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update integration");
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (isActive: boolean | null) => {
    return isActive ? (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const integrationTypes = [
    { value: "erp", label: "ERP System" },
    { value: "ecommerce", label: "E-Commerce" },
    { value: "accounting", label: "Accounting Software" },
    { value: "shipping", label: "Shipping Provider" },
    { value: "payment", label: "Payment Gateway" },
    { value: "custom", label: "Custom Integration" },
  ];

  const eventTypes = [
    "order.created",
    "order.updated",
    "inventory.low_stock",
    "purchase_order.created",
    "transfer.completed",
    "customer.created",
  ];

  const permissionTypes = [
    "read:inventory",
    "write:inventory",
    "read:orders",
    "write:orders",
    "read:customers",
    "write:customers",
    "read:reports",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations & API</h1>
          <p className="text-muted-foreground mt-1">Manage external integrations, webhooks, and API access</p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>External Integrations</CardTitle>
                <CardDescription>Connect to external systems and services</CardDescription>
              </div>
              <Dialog open={showNewIntegrationDialog} onOpenChange={setShowNewIntegrationDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Integration
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Integration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Integration Name</Label>
                      <Input
                        value={newIntegration.integration_name}
                        onChange={(e) =>
                          setNewIntegration({ ...newIntegration, integration_name: e.target.value })
                        }
                        placeholder="e.g., Shopify Store"
                      />
                    </div>
                    <div>
                      <Label>Integration Type</Label>
                      <Select
                        value={newIntegration.integration_type}
                        onValueChange={(value) =>
                          setNewIntegration({ ...newIntegration, integration_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {integrationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sync Frequency (minutes)</Label>
                      <Input
                        type="number"
                        value={newIntegration.sync_frequency_minutes}
                        onChange={(e) =>
                          setNewIntegration({
                            ...newIntegration,
                            sync_frequency_minutes: parseInt(e.target.value) || 60,
                          })
                        }
                      />
                    </div>
                    <Button onClick={handleCreateIntegration} disabled={createIntegration.isPending} className="w-full">
                      {createIntegration.isPending ? "Creating..." : "Create Integration"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {integrationsLoading ? (
                <p className="text-muted-foreground">Loading integrations...</p>
              ) : integrations.length === 0 ? (
                <div className="text-center py-8">
                  <Link2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">No integrations configured</p>
                  <p className="text-sm text-muted-foreground">Create an integration to connect external systems</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {integrations.map((integration) => (
                    <Card key={integration.id} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{integration.integration_name}</CardTitle>
                          <Switch
                            checked={integration.is_active || false}
                            onCheckedChange={() =>
                              handleToggleIntegration(integration.id, integration.is_active || false)
                            }
                          />
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="outline">{integration.integration_type}</Badge>
                          {getStatusBadge(integration.is_active)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Sync every {integration.sync_frequency_minutes} min
                        </div>
                        {integration.last_sync_at && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Activity className="w-4 h-4" />
                            Last sync: {format(new Date(integration.last_sync_at), "MMM d, HH:mm")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhook Endpoints</CardTitle>
                <CardDescription>Configure outgoing webhooks for real-time notifications</CardDescription>
              </div>
              <Dialog open={showNewWebhookDialog} onOpenChange={setShowNewWebhookDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Webhook Name</Label>
                      <Input
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                        placeholder="e.g., Order Notifications"
                      />
                    </div>
                    <div>
                      <Label>Endpoint URL</Label>
                      <Input
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                        placeholder="https://your-server.com/webhook"
                      />
                    </div>
                    <div>
                      <Label>Events</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {eventTypes.map((event) => (
                          <label key={event} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newWebhook.events.includes(event)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] });
                                } else {
                                  setNewWebhook({
                                    ...newWebhook,
                                    events: newWebhook.events.filter((ev) => ev !== event),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            {event}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateWebhook} disabled={createWebhook.isPending} className="w-full">
                      {createWebhook.isPending ? "Creating..." : "Create Webhook"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <p className="text-muted-foreground">Loading webhooks...</p>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">No webhooks configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{webhook.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(webhook.events || []).slice(0, 2).map((event: string) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {(webhook.events || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(webhook.is_active)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWebhook.mutate(webhook.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for programmatic access</CardDescription>
              </div>
              <Dialog open={showNewApiKeyDialog} onOpenChange={setShowNewApiKeyDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Key Name</Label>
                      <Input
                        value={newApiKey.name}
                        onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                        placeholder="e.g., Mobile App Key"
                      />
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {permissionTypes.map((permission) => (
                          <label key={permission} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newApiKey.permissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewApiKey({
                                    ...newApiKey,
                                    permissions: [...newApiKey.permissions, permission],
                                  });
                                } else {
                                  setNewApiKey({
                                    ...newApiKey,
                                    permissions: newApiKey.permissions.filter((p) => p !== permission),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            {permission}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateApiKey} disabled={createApiKey.isPending} className="w-full">
                      {createApiKey.isPending ? "Generating..." : "Generate Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <p className="text-muted-foreground">Loading API keys...</p>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">No API keys generated</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Hash</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {key.key_hash.substring(0, 16)}...
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1"
                            onClick={() => handleCopyToClipboard(key.key_hash)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(key.permissions || []).slice(0, 2).map((perm: string) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {(key.permissions || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{key.permissions!.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.last_used_at
                            ? format(new Date(key.last_used_at), "MMM d, HH:mm")
                            : "Never"}
                        </TableCell>
                        <TableCell>{getStatusBadge(key.is_active)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteApiKey.mutate(key.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integrations;
