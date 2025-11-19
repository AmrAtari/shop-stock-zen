import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

// We define the shape of the item we need here locally.
// This matches the 'TransferableItem' passed from the parent page.
export interface TransferSelectorItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  unit?: string | null;
}

interface TransferItemSelectorProps {
  items: TransferSelectorItem[];
  onSelect: (items: Array<{ item: TransferSelectorItem; quantity: number }>) => void;
}

export const TransferItemSelector = ({ items, onSelect }: TransferItemSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Updated state type to use the lighter interface
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: TransferSelectorItem; quantity: number }>>(
    new Map(),
  );

  const filteredItems = items.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggle = (item: TransferSelectorItem) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.set(item.id, { item, quantity: 1 });
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const existing = newSelected.get(itemId);
    if (existing && quantity > 0) {
      newSelected.set(itemId, { ...existing, quantity });
      setSelectedItems(newSelected);
    }
  };

  const handleAddItems = () => {
    onSelect(Array.from(selectedItems.values()));
    setSelectedItems(new Map());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => handleToggle(item)} />
                </TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category || "Uncategorized"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  {selectedItems.has(item.id) ? (
                    <Input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={selectedItems.get(item.id)?.quantity || 1}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
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
