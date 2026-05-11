import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaign, useUpsertCampaign, type Campaign } from "@/hooks/useCampaigns";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import RuleBuilder from "@/components/campaigns/RuleBuilder";
import EligibilityPicker from "@/components/campaigns/EligibilityPicker";

const empty: Partial<Campaign> = {
  name: "", code: "", description: "", type: "general", status: "draft", priority: 0,
  discount_method: "percentage", discount_value: 0, can_combine: false,
  requires_approval: false, auto_apply: true, applies_to_scope: "all",
};

export default function CampaignForm({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useCampaign(id);
  const upsert = useUpsertCampaign();
  const [form, setForm] = useState<Partial<Campaign>>(empty);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const set = (k: keyof Campaign, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    const payload: any = { ...form };
    ["max_discount_amount","max_discount_percentage","minimum_quotation_value","minimum_quantity","usage_limit","usage_per_client","campaign_budget"].forEach((k)=>{
      if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
    });
    const res = await upsert.mutateAsync({ id, ...payload });
    if (res?.id) navigate(`/campaigns/${res.id}`);
    else navigate("/campaigns");
  };

  if (id && isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{readOnly ? "Campaign Details" : id ? "Edit Campaign" : "New Campaign"}</h1>
            <p className="text-sm text-muted-foreground">{form.name || "Configure your campaign"}</p>
          </div>
        </div>
        {!readOnly && (
          <Button onClick={submit} disabled={upsert.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        )}
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="discount">Discount</TabsTrigger>
          <TabsTrigger value="limits">Limits & Budget</TabsTrigger>
          <TabsTrigger value="rules" disabled={!id}>Rules</TabsTrigger>
          <TabsTrigger value="eligibility" disabled={!id}>Eligibility</TabsTrigger>
          <TabsTrigger value="erp">ERP Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card><CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Campaign Name *">
                <Input disabled={readOnly} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Campaign Code *">
                <Input disabled={readOnly} value={form.code ?? ""} onChange={(e) => set("code", e.target.value.toUpperCase())} />
              </Field>
              <Field label="Type">
                <Select disabled={readOnly} value={form.type} onValueChange={(v) => set("type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general","seasonal","client_specific","project_based","category","brand","quantity_based","bundle","clearance","special_approval"].map((t) =>
                      <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select disabled={readOnly} value={form.status} onValueChange={(v) => set("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft","scheduled","active","paused","expired","cancelled"].map((s) =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Input disabled={readOnly} type="number" value={form.priority ?? 0}
                  onChange={(e) => set("priority", Number(e.target.value))} />
              </Field>
              <Field label="Applies To">
                <Select disabled={readOnly} value={form.applies_to_scope ?? "all"} onValueChange={(v) => set("applies_to_scope", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="selected">Selected Products / Categories</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start Date">
                <Input disabled={readOnly} type="datetime-local" value={form.start_date ? form.start_date.slice(0,16) : ""}
                  onChange={(e) => set("start_date", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </Field>
              <Field label="End Date">
                <Input disabled={readOnly} type="datetime-local" value={form.end_date ? form.end_date.slice(0,16) : ""}
                  onChange={(e) => set("end_date", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </Field>
              <Field label="Description" full>
                <Textarea disabled={readOnly} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Internal Notes" full>
                <Textarea disabled={readOnly} value={form.internal_notes ?? ""} onChange={(e) => set("internal_notes", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discount">
          <Card><CardHeader><CardTitle>Discount Configuration</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Discount Method">
                <Select disabled={readOnly} value={form.discount_method} onValueChange={(v) => set("discount_method", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="category">Category Discount</SelectItem>
                    <SelectItem value="brand">Brand Discount</SelectItem>
                    <SelectItem value="attribute">Attribute Based</SelectItem>
                    <SelectItem value="quantity_tier">Quantity Tiered</SelectItem>
                    <SelectItem value="value_tier">Value Tiered</SelectItem>
                    <SelectItem value="bundle">Bundle / Buy X Get Y</SelectItem>
                    <SelectItem value="client_specific">Client Specific</SelectItem>
                    <SelectItem value="manual_approval">Manual Approval</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Discount Value">
                <Input disabled={readOnly} type="number" value={form.discount_value ?? 0}
                  onChange={(e) => set("discount_value", Number(e.target.value))} />
              </Field>
              <ToggleField label="Auto Apply" checked={!!form.auto_apply} disabled={readOnly} onChange={(v)=>set("auto_apply", v)} />
              <ToggleField label="Can Combine With Others" checked={!!form.can_combine} disabled={readOnly} onChange={(v)=>set("can_combine", v)} />
              <ToggleField label="Requires Manager Approval" checked={!!form.requires_approval} disabled={readOnly} onChange={(v)=>set("requires_approval", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card><CardHeader><CardTitle>Limits & Budget</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumField label="Max Discount Amount" v={form.max_discount_amount} k="max_discount_amount" set={set} disabled={readOnly} />
              <NumField label="Max Discount %" v={form.max_discount_percentage} k="max_discount_percentage" set={set} disabled={readOnly} />
              <NumField label="Min Transaction Value" v={form.minimum_quotation_value} k="minimum_quotation_value" set={set} disabled={readOnly} />
              <NumField label="Min Quantity" v={form.minimum_quantity} k="minimum_quantity" set={set} disabled={readOnly} />
              <NumField label="Usage Limit (Total)" v={form.usage_limit} k="usage_limit" set={set} disabled={readOnly} />
              <NumField label="Usage Limit Per Client" v={form.usage_per_client} k="usage_per_client" set={set} disabled={readOnly} />
              <NumField label="Campaign Budget" v={form.campaign_budget} k="campaign_budget" set={set} disabled={readOnly} />
              <Field label="Consumed Budget">
                <Input disabled value={form.consumed_budget ?? 0} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="erp">
          <Card><CardHeader><CardTitle>ERP Controls</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Discount Account Code">
                <Input disabled={readOnly} value={form.discount_account_code ?? ""} onChange={(e)=>set("discount_account_code", e.target.value)} />
              </Field>
              <Field label="Cost Center">
                <Input disabled={readOnly} value={form.cost_center ?? ""} onChange={(e)=>set("cost_center", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader><CardTitle>Rule Builder</CardTitle></CardHeader>
            <CardContent>
              {id ? <RuleBuilder campaignId={id} readOnly={readOnly} /> :
                <p className="text-sm text-muted-foreground">Save the campaign first to add rules.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility">
          <Card>
            <CardHeader><CardTitle>Product / Category / Brand Eligibility</CardTitle></CardHeader>
            <CardContent>
              {id ? <EligibilityPicker campaignId={id} readOnly={readOnly} /> :
                <p className="text-sm text-muted-foreground">Save the campaign first to set eligibility.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function NumField({ label, v, k, set, disabled }: any) {
  return (
    <Field label={label}>
      <Input disabled={disabled} type="number" value={v ?? ""} onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))} />
    </Field>
  );
}
function ToggleField({ label, checked, onChange, disabled }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
