import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function SystemDefaultsSection({ generalSettings, dynamicCurrencies, dynamicUnits, handleSettingsChange, handleSaveGeneralSettings, isSavingSettings, isAdmin }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Defaults</CardTitle>
        <CardDescription>Global system settings (ERP defaults)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Financial Settings */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="currency">Default Currency</label>
            <Select value={generalSettings.currency} onValueChange={value => handleSettingsChange("currency", value)} disabled={isSavingSettings || !isAdmin}>
              <SelectTrigger id="currency"><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent>{dynamicCurrencies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="tax-rate">Default Sales Tax (%)</label>
            <Input type="number" step="0.1" id="tax-rate" value={generalSettings.defaultTaxRate} onChange={e => handleSettingsChange("defaultTaxRate", e.target.value)} disabled={isSavingSettings || !isAdmin} />
          </div>
        </div>
        {/* Inventory Units */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="default-unit">Default Unit</label>
            <Select value={generalSettings.defaultUnit} onValueChange={v => handleSettingsChange("defaultUnit", v)} disabled={isSavingSettings || !isAdmin}>
              <SelectTrigger id="default-unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>{dynamicUnits.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="low-stock-threshold">Low Stock Alert</label>
            <Input type="number" id="low-stock-threshold" value={generalSettings.lowStockThreshold} onChange={e => handleSettingsChange("lowStockThreshold", parseInt(e.target.value) || 0)} disabled={isSavingSettings || !isAdmin} />
          </div>
        </div>
        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <Button onClick={handleSaveGeneralSettings} disabled={isSavingSettings || !isAdmin}>
            {isSavingSettings ? "Saving..." : "Save System Defaults"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

