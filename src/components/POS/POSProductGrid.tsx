import { useState, useMemo } from "react";
import { Search, Grid, List, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
}

interface POSProductGridProps {
  products: POSProduct[];
  onProductSelect: (product: POSProduct) => void;
  isLoading?: boolean;
}

export function POSProductGrid({ products, onProductSelect, isLoading }: POSProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { formatCurrency } = useSystemSettings();

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || "Uncategorized"));
    return ["all", ...Array.from(cats)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || (product.category || "Uncategorized") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and View Controls */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 2 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="inline-flex h-9">
              {categories.slice(0, 8).map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat === "all" ? "All Products" : cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ScrollArea>
      )}

      {/* Products Display */}
      <ScrollArea className="h-[400px]">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onSelect={onProductSelect}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  onSelect,
  formatCurrency,
}: {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
  formatCurrency: (amount: number) => string;
}) {
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity > 0 && product.quantity <= 5;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isOutOfStock && "opacity-60 cursor-not-allowed"
      )}
      onClick={() => !isOutOfStock && onSelect(product)}
    >
      <CardContent className="p-3">
        <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center relative overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground/40" />
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
            </div>
          )}
          {isLowStock && !isOutOfStock && (
            <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {product.quantity}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <h4 className="font-medium text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground">{product.sku}</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
            {!isOutOfStock && !isLowStock && (
              <span className="text-xs text-muted-foreground">{product.quantity} in stock</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Product List Item Component
function ProductListItem({
  product,
  onSelect,
  formatCurrency,
}: {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
  formatCurrency: (amount: number) => string;
}) {
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity > 0 && product.quantity <= 5;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/50",
        isOutOfStock && "opacity-60 cursor-not-allowed"
      )}
      onClick={() => !isOutOfStock && onSelect(product)}
    >
      <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center shrink-0">
        {product.image ? (
          <img src={product.image} alt={product.name} className="object-cover w-full h-full rounded-md" />
        ) : (
          <Package className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{product.name}</h4>
        <p className="text-sm text-muted-foreground">{product.sku}</p>
      </div>
      <div className="text-right">
        <div className="font-bold text-primary">{formatCurrency(product.price)}</div>
        {isOutOfStock ? (
          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
        ) : isLowStock ? (
          <Badge variant="secondary" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {product.quantity} left
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{product.quantity} in stock</span>
        )}
      </div>
    </div>
  );
}
