// src/components/POSBarcodeInput.tsx
import { useState, useRef, useEffect } from "react";
import { Scan, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category?: string;
  // Ensure these are defined as strings (the readable names)
  size?: string;
  color?: string;
}

interface POSBarcodeInputProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

export const POSBarcodeInput = ({ products, onProductSelect }: POSBarcodeInputProps) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcodeInput.trim()) return;

    const product = products.find((p) => p.sku.toLowerCase() === barcodeInput.toLowerCase());

    if (product) {
      onProductSelect(product);
      setBarcodeInput("");
    } else {
      // Fallback to manual search if not found
      setOpen(true);
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setOpen(false);
    setBarcodeInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex gap-2">
      <form onSubmit={handleBarcodeSubmit} className="flex flex-1 gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Scan or enter SKU"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" size="icon">
          <Scan className="h-4 w-4" />
        </Button>
      </form>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            {/* Display the current barcode input in the search bar */}
            <CommandInput placeholder="Search products..." value={barcodeInput} onValueChange={setBarcodeInput} />
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {products
                  .filter(
                    (product) =>
                      // Filter logic to include the current search input
                      !barcodeInput ||
                      product.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
                      product.sku.toLowerCase().includes(barcodeInput.toLowerCase()),
                  )
                  .map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.sku}`} // Value used for internal Command filtering
                      onSelect={() => handleProductSelect(product)}
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between">
                          <span className="font-medium">{product.name}</span>
                          <span className="font-bold text-primary">${product.price.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>SKU: {product.sku}</span>
                          {product.size && <span>• Size: {product.size}</span>}
                          {product.color && <span>• Color: {product.color}</span>}
                          <span>• Stock: {product.quantity}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
