// src/components/POItemSelector.tsx

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Loader2 } from "lucide-react"; // Make sure Loader2 is imported
import { Item } from "@/types/database"; // Assuming Item type comes from here

// Exporting the item details type for clarity in the parent file
export type SelectedPOItem = {
  item: Item;
  quantity: number;
  price: number;
};

// REVERTED Props
interface POItemSelectorProps {
  items: Item[];
  isLoading: boolean; // Added isLoading prop to allow parent to manage fetch state
  onSelect: (items: SelectedPOItem[]) => void;
}

export const POItemSelector = ({ items, isLoading, onSelect }: POItemSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  // State to hold the items currently selected in the table
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedPOItem>>(new Map());

  const filteredItems = items.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggle = (item: Item) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      // Use item.cost_price as the default price
      newSelected.set(item.id, { item, quantity: 1, price: item.cost_price || 0 });
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const existing = newSelected.get(itemId);
    if (existing) {
      newSelected.set(itemId, { ...existing, quantity: Math.max(1, quantity) });
    }
    setSelectedItems(newSelected);
  };

  const handlePriceChange = (itemId: string, price: number) => {
    const newSelected = new Map(selectedItems);
    const existing = newSelected.get(itemId);
    if (existing) {
      newSelected.set(itemId, { ...existing, price: Math.max(0, price) });
    }
    setSelectedItems(newSelected);
  };

  const handleAddItems = () => {
    const itemsArray = Array.from(selectedItems.values());
    onSelect(itemsArray);
    setSelectedItems(new Map()); // Clear selection after adding
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by SKU or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[50px]">Add</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[120px]">Unit Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {searchTerm ? `No items match "${searchTerm}".` : "No products available to select."}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const selectedItemDetails = selectedItems.get(item.id);

                return (
                  <TableRow key={item.id} className={isSelected ? "bg-blue-50/50" : ""}>
                    <TableCell>
                      <Checkbox checked={isSelected} onCheckedChange={() => handleToggle(item)} />
                    </TableCell>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.stock_on_hand}</TableCell>
                    <TableCell>
                      {isSelected ? (
                        <Input
                          type="number"
                          min="1"
                          value={selectedItemDetails?.quantity || 1}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isSelected ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selectedItemDetails?.price || item.cost_price || 0}
                          onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedItems.size > 0 && (
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedItems.size} items selected</span>
          <Button onClick={handleAddItems}>Add Selected Items</Button>
        </div>
      )}
    </div>
  );
};
