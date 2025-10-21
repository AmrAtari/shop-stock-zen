import { useState, useRef, useEffect } from "react";
import { Scan, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category?: string;
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

    const product = products.find(
      (p) => p.sku.toLowerCase() === barcodeInput.toLowerCase()
    );

    if (product) {
      onProductSelect(product);
      setBarcodeInput("");
      inputRef.current?.focus();
    } else {
      // Product not found - keep the input for user to see
      inputRef.current?.select();
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setOpen(false);
    setBarcodeInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan barcode or enter SKU..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <Button type="submit" size="lg" className="px-6">
          Add
        </Button>
      </form>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full h-12" size="lg">
            <Search className="mr-2 h-5 w-5" />
            Search Products
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search products..." />
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.sku}`}
                    onSelect={() => handleProductSelect(product)}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between">
                        <span className="font-medium">{product.name}</span>
                        <span className="font-bold text-primary">
                          ${product.price.toFixed(2)}
                        </span>
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
