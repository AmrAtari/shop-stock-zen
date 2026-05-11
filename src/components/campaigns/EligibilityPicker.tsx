import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useCampaignEligibility, useLookupOptions, useSaveCampaignEligibility } from "@/hooks/useCampaignRules";
import { X } from "lucide-react";

export default function EligibilityPicker({ campaignId, readOnly }: { campaignId: string; readOnly?: boolean }) {
  const { data: existing } = useCampaignEligibility(campaignId);
  const { items, categories, brands } = useLookupOptions();
  const save = useSaveCampaignEligibility();

  const [productIds, setProductIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [pq, setPq] = useState(""); const [cq, setCq] = useState(""); const [bq, setBq] = useState("");

  useEffect(() => {
    if (!existing) return;
    setProductIds(existing.filter((x) => x.product_id).map((x) => x.product_id!));
    setCategoryIds(existing.filter((x) => x.category_id).map((x) => x.category_id!));
    setBrandIds(existing.filter((x) => x.brand_id).map((x) => x.brand_id!));
  }, [existing]);

  const toggle = (arr: string[], setter: (v: string[]) => void, id: string) =>
    setter(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const filterList = <T extends { id: string; name: string; sku?: string }>(list: T[] = [], q: string) => {
    if (!q) return list.slice(0, 200);
    const ql = q.toLowerCase();
    return list.filter((x) => x.name?.toLowerCase().includes(ql) || (x as any).sku?.toLowerCase().includes(ql)).slice(0, 200);
  };

  const fItems = useMemo(() => filterList(items.data ?? [], pq), [items.data, pq]);
  const fCats = useMemo(() => filterList(categories.data ?? [], cq), [categories.data, cq]);
  const fBrands = useMemo(() => filterList(brands.data ?? [], bq), [brands.data, bq]);

  const onSave = () => save.mutate({ campaignId, productIds, categoryIds, brandIds });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select which products, categories, or brands this campaign applies to. Leave empty to apply to all.
        </p>
        {!readOnly && <Button size="sm" onClick={onSave} disabled={save.isPending}>Save Eligibility</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Picker title="Products" count={productIds.length} q={pq} setQ={setPq}
          list={fItems} selected={productIds}
          onToggle={(id) => !readOnly && toggle(productIds, setProductIds, id)}
          renderLabel={(it: any) => `${it.name}${it.sku ? ` · ${it.sku}` : ""}`}
          readOnly={readOnly} onClear={() => !readOnly && setProductIds([])} />
        <Picker title="Categories" count={categoryIds.length} q={cq} setQ={setCq}
          list={fCats} selected={categoryIds}
          onToggle={(id) => !readOnly && toggle(categoryIds, setCategoryIds, id)}
          renderLabel={(it: any) => it.name} readOnly={readOnly} onClear={() => !readOnly && setCategoryIds([])} />
        <Picker title="Brands" count={brandIds.length} q={bq} setQ={setBq}
          list={fBrands} selected={brandIds}
          onToggle={(id) => !readOnly && toggle(brandIds, setBrandIds, id)}
          renderLabel={(it: any) => it.name} readOnly={readOnly} onClear={() => !readOnly && setBrandIds([])} />
      </div>
    </div>
  );
}

function Picker({ title, count, q, setQ, list, selected, onToggle, renderLabel, readOnly, onClear }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{count} selected</Badge>
            {!readOnly && count > 0 && (
              <Button variant="ghost" size="icon" onClick={onClear} title="Clear">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        <ScrollArea className="h-[280px] rounded-md border p-2">
          <div className="space-y-1">
            {list.length === 0 && <p className="text-xs text-muted-foreground p-2">No results</p>}
            {list.map((it: any) => (
              <label key={it.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={selected.includes(it.id)} onCheckedChange={() => onToggle(it.id)} disabled={readOnly} />
                <span className="text-sm">{renderLabel(it)}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}