import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCampaignRules, useSaveCampaignRules, type CampaignRule } from "@/hooks/useCampaignRules";

const FIELDS = [
  { v: "cart_total", l: "Cart Total" },
  { v: "item_quantity", l: "Item Quantity" },
  { v: "customer_type", l: "Customer Type" },
  { v: "customer_group", l: "Customer Group" },
  { v: "store_id", l: "Store" },
  { v: "payment_method", l: "Payment Method" },
  { v: "day_of_week", l: "Day of Week" },
  { v: "item_category", l: "Item Category" },
  { v: "item_brand", l: "Item Brand" },
];
const OPS = ["=", "!=", ">", ">=", "<", "<=", "in", "not_in", "contains"];
const ACTIONS = [
  { v: "percentage_off", l: "Percentage Off" },
  { v: "fixed_off", l: "Fixed Amount Off" },
  { v: "free_item", l: "Free Item (item_id)" },
  { v: "override_unit_price", l: "Override Unit Price" },
  { v: "set_max_discount", l: "Set Max Discount" },
];

type Row = Partial<CampaignRule> & { _key: string };

export default function RuleBuilder({ campaignId, readOnly }: { campaignId: string; readOnly?: boolean }) {
  const { data, isLoading } = useCampaignRules(campaignId);
  const save = useSaveCampaignRules();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (data) setRows(data.map((r) => ({ ...r, _key: r.id })));
  }, [data]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        _key: crypto.randomUUID(),
        condition_group: 1,
        field_name: "cart_total",
        operator: ">=",
        field_value: 0,
        logical_operator: "AND",
        action_type: "percentage_off",
        action_value: 0,
      },
    ]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x._key === key ? { ...x, ...patch } : x)));

  const remove = (key: string) => setRows((r) => r.filter((x) => x._key !== key));

  const onSave = () => save.mutate({ campaignId, rules: rows });

  if (isLoading) return <div className="text-muted-foreground">Loading rules…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define conditions that trigger this campaign. Rules in the same group use the chosen logical operator.
        </p>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
            <Button size="sm" onClick={onSave} disabled={save.isPending}>Save Rules</Button>
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          No rules yet. {!readOnly && "Click 'Add Rule' to create your first condition."}
        </CardContent></Card>
      )}

      {rows.map((r, idx) => (
        <Card key={r._key}>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">Group</Label>
              <Input disabled={readOnly} type="number" value={r.condition_group ?? 1}
                onChange={(e) => update(r._key, { condition_group: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Field</Label>
              <Select disabled={readOnly} value={r.field_name}
                onValueChange={(v) => update(r._key, { field_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELDS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">Op</Label>
              <Select disabled={readOnly} value={r.operator}
                onValueChange={(v) => update(r._key, { operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OPS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Value</Label>
              <Input disabled={readOnly} value={typeof r.field_value === "object" ? JSON.stringify(r.field_value) : (r.field_value ?? "")}
                onChange={(e) => {
                  const v = e.target.value;
                  let parsed: any = v;
                  if (!isNaN(Number(v)) && v.trim() !== "") parsed = Number(v);
                  else if (v.startsWith("[") || v.startsWith("{")) {
                    try { parsed = JSON.parse(v); } catch { parsed = v; }
                  }
                  update(r._key, { field_value: parsed });
                }} />
            </div>
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">Logic</Label>
              <Select disabled={readOnly} value={r.logical_operator ?? "AND"}
                onValueChange={(v) => update(r._key, { logical_operator: v as "AND" | "OR" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Action</Label>
              <Select disabled={readOnly} value={r.action_type}
                onValueChange={(v) => update(r._key, { action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Action Value</Label>
              <Input disabled={readOnly} value={typeof r.action_value === "object" ? JSON.stringify(r.action_value) : (r.action_value ?? "")}
                onChange={(e) => {
                  const v = e.target.value;
                  let parsed: any = v;
                  if (!isNaN(Number(v)) && v.trim() !== "") parsed = Number(v);
                  update(r._key, { action_value: parsed });
                }} />
            </div>
            <div className="md:col-span-1 flex justify-end">
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => remove(r._key)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="md:col-span-12 text-xs text-muted-foreground">
              #{idx + 1} — when <code>{r.field_name}</code> {r.operator} <code>{JSON.stringify(r.field_value)}</code> → <code>{r.action_type}</code> = <code>{JSON.stringify(r.action_value)}</code>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}