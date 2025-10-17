import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScannedItem {
  sku: string;
  name: string;
  systemQuantity: number;
  countedQuantity: number;
  timestamp: string;
}

interface PhysicalInventoryScannerProps {
  onScan: (items: ScannedItem[]) => void;
  onLookupSku: (sku: string) => Promise<{ id: string; sku: string; name: string; systemQuantity: number } | null>;
}

const PhysicalInventoryScanner = ({ onScan, onLookupSku }: PhysicalInventoryScannerProps) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const itemDetails = await onLookupSku(barcodeInput.trim());
      
      if (!itemDetails) {
        toast.error(`SKU "${barcodeInput}" not found in inventory`);
        setBarcodeInput("");
        return;
      }

      const existingIndex = scannedItems.findIndex(item => item.sku === itemDetails.sku);
      
      if (existingIndex >= 0) {
        const updated = [...scannedItems];
        updated[existingIndex].countedQuantity += 1;
        setScannedItems(updated);
        toast.success(`Updated ${itemDetails.name} - Quantity: ${updated[existingIndex].countedQuantity}`);
      } else {
        const newItem: ScannedItem = {
          sku: itemDetails.sku,
          name: itemDetails.name,
          systemQuantity: itemDetails.systemQuantity,
          countedQuantity: 1,
          timestamp: new Date().toISOString(),
        };
        setScannedItems([...scannedItems, newItem]);
        toast.success(`Added ${itemDetails.name}`);
      }

      setBarcodeInput("");
      inputRef.current?.focus();
    } catch (error) {
      toast.error("Error looking up SKU");
    }
  };

  const handleQuantityChange = (sku: string, newQuantity: string) => {
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 0) return;

    setScannedItems(
      scannedItems.map(item =>
        item.sku === sku ? { ...item, countedQuantity: qty } : item
      )
    );
  };

  const handleRemove = (sku: string) => {
    setScannedItems(scannedItems.filter(item => item.sku !== sku));
    toast.success("Item removed");
  };

  const handleAddItems = () => {
    if (scannedItems.length === 0) {
      toast.error("No items to add");
      return;
    }
    onScan(scannedItems);
    setScannedItems([]);
    toast.success(`Added ${scannedItems.length} items to physical count`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Scan barcode or enter SKU..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit">Add</Button>
      </form>

      {scannedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Scanned {scannedItems.length} item(s)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScannedItems([]);
                  toast.success("Cleared all items");
                }}
              >
                Clear All
              </Button>
              <Button size="sm" onClick={handleAddItems}>
                Add Scanned Items
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>System Qty</TableHead>
                  <TableHead className="w-32">Counted Qty</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scannedItems.map((item) => {
                  const variance = item.countedQuantity - item.systemQuantity;
                  return (
                    <TableRow key={item.sku}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.systemQuantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.countedQuantity}
                          onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={variance === 0 ? "text-muted-foreground" : variance > 0 ? "text-green-600" : "text-red-600"}>
                          {variance > 0 ? "+" : ""}{variance}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(item.sku)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalInventoryScanner;
