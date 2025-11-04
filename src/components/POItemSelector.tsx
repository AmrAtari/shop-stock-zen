// src/components/POItemSelector.tsx

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

import { useProductVariantsForPO, VariantWithCost } from "@/hooks/useProductVariantsForPO"; 

// Local utility function
const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`; 

// 👈 FIX 1: Exported the type for use in PurchaseOrderNew.tsx
export type POItemSelection = {
  variant_id: string;
  sku: string;
  name: string;
  unit_cost: number; 
  quantity: number;
};

// 👈 FIX 2: Exported the interface with the required props
export interface POItemSelectorProps {
    currentItems: POItemSelection[];
    onUpdateItems: (items: POItemSelection[]) => void;
}

export const POItemSelector: React.FC<POItemSelectorProps> = ({ currentItems, onUpdateItems }) => {
  const { data: variants, isLoading } = useProductVariantsForPO();
  const [searchTerm, setSearchTerm] = useState('');

  // Convert array to map for efficient lookups/updates
  const selectedItemsMap = currentItems.reduce((acc, item) => {
    acc[item.variant_id] = item;
    return acc;
  }, {} as Record<string, POItemSelection>);

  const handleInputChange = (variant: VariantWithCost, field: 'quantity' | 'unit_cost', value: string) => {
    const numericValue = parseFloat(value);
    
    const currentItem = selectedItemsMap[variant.variant_id] || {
      variant_id: variant.variant_id,
      sku: variant.sku,
      name: variant.name,
      unit_cost: variant.cost_price, 
      quantity: 0,
    };

    let updatedItem = { ...currentItem };

    if (field === 'quantity') {
      updatedItem.quantity = Math.max(0, numericValue || 0);
    } else if (field === 'unit_cost') {
      updatedItem.unit_cost = Math.max(0, numericValue || 0);
    }
    
    const newSelectedItemsMap = { ...selectedItemsMap };

    if (updatedItem.quantity > 0) {
        newSelectedItemsMap[variant.variant_id] = updatedItem;
    } else {
        delete newSelectedItemsMap[variant.variant_id];
    }

    onUpdateItems(Object.values(newSelectedItemsMap)); 
  };


  const filteredVariants = variants?.filter(variant => 
    variant.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
        <Input 
            placeholder="Search by SKU or name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
        />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Select</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Stock</TableHead>
            
            <TableHead className="w-[100px]">Quantity</TableHead>
            <TableHead className="text-right w-[120px]">Last PO Cost</TableHead>
            <TableHead className="text-right w-[120px]">New Unit Cost</TableHead>
            
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredVariants.map((variant) => {
            const currentItem = selectedItemsMap[variant.variant_id];
            const referenceCost = variant.last_po_cost ?? variant.cost_price;

            return (
              <TableRow key={variant.variant_id} className={currentItem ? 'bg-blue-50/50' : ''}>
                
                <TableCell>
                    <Checkbox checked={!!currentItem} disabled />
                </TableCell>

                <TableCell className="font-medium">{variant.sku}</TableCell>
                <TableCell>{variant.name}</TableCell>
                <TableCell>{variant.category}</TableCell>
                <TableCell>{variant.current_stock}</TableCell>
                
                {/* Quantity Input */}
                <TableCell>
                  <Input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    className="w-[80px]" 
                    value={currentItem?.quantity || ''}
                    onChange={(e) => handleInputChange(variant, 'quantity', e.target.value)}
                  />
                </TableCell>

                {/* Last PO Cost (Reference/Read-Only) */}
                <TableCell className="text-right text-sm text-muted-foreground">
                  {variant.last_po_cost ? formatCurrency(variant.last_po_cost) : formatCurrency(variant.cost_price)}
                </TableCell>
                
                {/* New Unit Cost (User Input) */}
                <TableCell className="text-right">
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder={formatCurrency(referenceCost)} 
                    className="w-[100px] text-right" 
                    value={currentItem?.unit_cost || ''}
                    onChange={(e) => handleInputChange(variant, 'unit_cost', e.target.value)}
                  />
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};