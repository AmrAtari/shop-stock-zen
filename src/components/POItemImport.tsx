import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface ImportedItem {
  sku: string;
  itemName?: string;
  description?: string;
  quantity: number;
  costPrice: number;
  color?: string;
  size?: string;
  modelNumber?: string;
  unit?: string;
  status: "valid" | "warning" | "error";
  message?: string;
}

interface POItemImportProps {
  onImport: (items: ImportedItem[]) => void;
  existingSkus: string[];
}

export const POItemImport = ({ onImport, existingSkus }: POItemImportProps) => {
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMethod, setImportMethod] = useState<"file" | "sheets">("file");
  const { formatCurrency } = useSystemSettings();

  // Normalize column names for flexible matching
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[_\s-]+/g, '');
  };

  // Find value from row with flexible column name matching
  const findValue = (row: any, possibleNames: string[]): any => {
    const normalizedRow: Record<string, any> = {};
    
    // Create a normalized version of the row
    Object.keys(row).forEach(key => {
      normalizedRow[normalizeKey(key)] = row[key];
    });

    // Try to find a match
    for (const name of possibleNames) {
      const normalizedName = normalizeKey(name);
      if (normalizedRow[normalizedName] !== undefined) {
        return normalizedRow[normalizedName];
      }
    }
    return undefined;
  };

  const processImportData = (jsonData: any[]) => {
    const items: ImportedItem[] = jsonData.map((row: any) => {
        // Use flexible column matching
        const sku = String(findValue(row, ['SKU', 'sku', 'item_code', 'itemcode', 'code', 'item_sku']) || "").trim();
        const quantity = parseFloat(findValue(row, ['Quantity', 'quantity', 'qty', 'amount', 'count']) || 0);
        // Round cost price to 2 decimal places automatically
        const costPrice = Math.round(
          parseFloat(
            findValue(row, ['Cost Price', 'costPrice', 'cost_price', 'Unit Price', 'unitPrice', 'unit_price', 'price', 'cost']) || 0
          ) * 100
        ) / 100;

        let status: "valid" | "warning" | "error" = "valid";
        let message = "";

        if (!sku) {
          status = "error";
          message = "Missing SKU";
        } else if (!existingSkus.includes(sku)) {
          status = "warning";
          message = "SKU not found in inventory";
        }

        if (quantity <= 0) {
          status = "error";
          message = message ? `${message}; Invalid quantity` : "Invalid quantity";
        }

        if (costPrice < 0) {
          status = "error";
          message = message ? `${message}; Invalid price` : "Invalid price";
        }

        return {
          sku,
          itemName: String(findValue(row, ['Item Name', 'itemName', 'item_name', 'name', 'product_name', 'productName']) || ""),
          description: String(findValue(row, ['Description', 'description', 'desc', 'details']) || ""),
          quantity,
          costPrice,
          color: String(findValue(row, ['Color', 'color', 'colour']) || ""),
          size: String(findValue(row, ['Size', 'size']) || ""),
          modelNumber: String(findValue(row, ['Model Number', 'modelNumber', 'model_number', 'model', 'item_number', 'itemNumber']) || ""),
          unit: String(findValue(row, ['Unit', 'unit', 'uom', 'unit_of_measure']) || "pcs"),
          status,
        message,
      };
    });

    setImportedItems(items);
    toast.success(`Parsed ${items.length} items`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      processImportData(jsonData);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to parse file. Please check the format.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  const handleGoogleSheetsImport = (sheetData: any[]) => {
    processImportData(sheetData);
    setIsProcessing(false);
  };

  const handleConfirmImport = () => {
    const validItems = importedItems.filter((item) => item.status !== "error");
    onImport(validItems);
    setImportedItems([]);
    toast.success(`Imported ${validItems.length} items`);
  };

  const stats = {
    total: importedItems.length,
    valid: importedItems.filter((i) => i.status === "valid").length,
    warnings: importedItems.filter((i) => i.status === "warning").length,
    errors: importedItems.filter((i) => i.status === "error").length,
  };

  return (
    <div className="space-y-4">
      <Tabs value={importMethod} onValueChange={(value: any) => setImportMethod(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" disabled={isProcessing} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processing..." : "Upload Excel File"}
                </span>
              </Button>
            </label>
            <div className="text-sm text-muted-foreground">
              Expected columns: SKU, Quantity, Cost Price (optional: Item Name, Description, Color, Size, Model Number, Unit)
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sheets">
          <GoogleSheetsInput 
            onImport={handleGoogleSheetsImport}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </TabsContent>
      </Tabs>

      {importedItems.length > 0 && (
        <>
          <Alert>
            <AlertDescription>
              <div className="flex gap-4">
                <span>Total: {stats.total}</span>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Valid: {stats.valid}
                </span>
                {stats.warnings > 0 && (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Warnings: {stats.warnings}
                  </span>
                )}
                {stats.errors > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Errors: {stats.errors}
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedItems.map((item, index) => (
                  <TableRow key={index} className={item.status === "error" ? "bg-destructive/10" : ""}>
                    <TableCell>
                      {item.status === "valid" && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {item.status === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                      {item.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.itemName || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                    <TableCell>{item.color || "-"}</TableCell>
                    <TableCell>{item.size || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.message || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportedItems([])}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={stats.valid + stats.warnings === 0}>
              Import {stats.valid + stats.warnings} Valid Items
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
