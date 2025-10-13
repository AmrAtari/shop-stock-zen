import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Barcode, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScannedItem {
  sku: string;
  name?: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

interface POBarcodeScannerProps {
  onScan: (items: ScannedItem[]) => void;
  onLookupSku: (sku: string) => Promise<{ name: string; price: number } | null>;
}

export const POBarcodeScanner = ({ onScan, onLookupSku }: POBarcodeScannerProps) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input
    inputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = barcodeInput.trim();
    if (!sku) return;

    try {
      const itemData = await onLookupSku(sku);

      if (itemData) {
        // Check if item already scanned
        const existingIndex = scannedItems.findIndex((item) => item.sku === sku);

        if (existingIndex >= 0) {
          // Increment quantity
          const updated = [...scannedItems];
          updated[existingIndex].quantity += 1;
          setScannedItems(updated);
          toast.success(`Quantity updated for ${sku}`);
        } else {
          // Add new item
          setScannedItems([
            ...scannedItems,
            {
              sku,
              name: itemData.name,
              quantity: 1,
              price: itemData.price,
              timestamp: new Date(),
            },
          ]);
          toast.success(`Added ${sku}`);
        }
      } else {
        // Item not found, add with manual entry needed
        setScannedItems([
          ...scannedItems,
          {
            sku,
            quantity: 1,
            price: 0,
            timestamp: new Date(),
          },
        ]);
        toast.warning(`SKU ${sku} not found - enter details manually`);
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toast.error("Failed to lookup SKU");
    }

    setBarcodeInput("");
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...scannedItems];
    updated[index].quantity = quantity;
    setScannedItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...scannedItems];
    updated[index].price = price;
    setScannedItems(updated);
  };

  const handleRemove = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const handleAddItems = () => {
    onScan(scannedItems);
    setScannedItems([]);
    toast.success(`Added ${scannedItems.length} scanned items`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Scan barcode or enter SKU..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Add</Button>
      </form>

      {scannedItems.length > 0 && (
        <>
          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scannedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.name || <span className="text-muted-foreground">Unknown</span>}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">{scannedItems.length} items scanned</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setScannedItems([])}>
                Clear All
              </Button>
              <Button onClick={handleAddItems}>Add Scanned Items</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
