import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { GoogleSheetsInput } from "./GoogleSheetsInput";

interface ImportedItem {
  sku: string;
  countedQuantity: number;
}

interface PhysicalInventoryImportProps {
  onImport: (items: ImportedItem[]) => void;
  onLookupSku: (sku: string) => Promise<{ id: string; sku: string; name: string; systemQuantity: number } | null>;
}

const PhysicalInventoryImport = ({ onImport, onLookupSku }: PhysicalInventoryImportProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const importedItems: ImportedItem[] = [];
      const errors: string[] = [];

      for (const row of jsonData) {
        const sku = row.SKU || row.sku || row.Sku;
        const countedQuantity = row.Counted_Quantity || row.counted_quantity || row.Quantity || row.quantity || row.QTY || row.qty;

        if (!sku) {
          errors.push("Row missing SKU");
          continue;
        }

        if (countedQuantity === undefined || countedQuantity === null) {
          errors.push(`Row with SKU ${sku} missing quantity`);
          continue;
        }

        const qty = parseInt(countedQuantity);
        if (isNaN(qty) || qty < 0) {
          errors.push(`Invalid quantity for SKU ${sku}`);
          continue;
        }

        // Check if SKU exists
        const itemDetails = await onLookupSku(sku);
        if (!itemDetails) {
          errors.push(`SKU ${sku} not found in inventory`);
          continue;
        }

        importedItems.push({ sku, countedQuantity: qty });
      }

      if (errors.length > 0) {
        toast.error(`Import completed with ${errors.length} error(s). Check console for details.`);
        console.error("Import errors:", errors);
      }

      if (importedItems.length > 0) {
        onImport(importedItems);
        toast.success(`Imported ${importedItems.length} item(s)`);
      } else {
        toast.error("No valid items found in file");
      }

      e.target.value = "";
    } catch (error: any) {
      toast.error(error.message || "Error importing file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSheetsImport = async (data: any[]) => {
    setIsProcessing(true);

    try {
      const importedItems: ImportedItem[] = [];
      const errors: string[] = [];

      for (const row of data) {
        const sku = row.SKU || row.sku || row.Sku;
        const countedQuantity = row.Counted_Quantity || row.counted_quantity || row.Quantity || row.quantity || row.QTY || row.qty;

        if (!sku) {
          errors.push("Row missing SKU");
          continue;
        }

        if (countedQuantity === undefined || countedQuantity === null) {
          errors.push(`Row with SKU ${sku} missing quantity`);
          continue;
        }

        const qty = parseInt(countedQuantity);
        if (isNaN(qty) || qty < 0) {
          errors.push(`Invalid quantity for SKU ${sku}`);
          continue;
        }

        // Check if SKU exists
        const itemDetails = await onLookupSku(sku);
        if (!itemDetails) {
          errors.push(`SKU ${sku} not found in inventory`);
          continue;
        }

        importedItems.push({ sku, countedQuantity: qty });
      }

      if (errors.length > 0) {
        toast.error(`Import completed with ${errors.length} error(s). Check console for details.`);
        console.error("Import errors:", errors);
      }

      if (importedItems.length > 0) {
        onImport(importedItems);
        toast.success(`Imported ${importedItems.length} item(s)`);
      } else {
        toast.error("No valid items found");
      }
    } catch (error: any) {
      toast.error(error.message || "Error importing data");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">File Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Required columns: <code className="bg-muted px-1 py-0.5 rounded">SKU</code> and <code className="bg-muted px-1 py-0.5 rounded">Counted_Quantity</code> (or Quantity, QTY)</li>
              <li>SKU must exist in your inventory</li>
              <li>Counted quantity must be a positive integer</li>
              <li>Empty rows will be skipped</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="excel">
            <Upload className="w-4 h-4 mr-2" />
            Excel/CSV
          </TabsTrigger>
          <TabsTrigger value="google">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload an Excel (.xlsx) or CSV file with physical count data
            </p>
            <Button asChild disabled={isProcessing}>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                  disabled={isProcessing}
                />
                {isProcessing ? "Processing..." : "Choose File"}
              </label>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <GoogleSheetsInput
            onImport={handleGoogleSheetsImport}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhysicalInventoryImport;
