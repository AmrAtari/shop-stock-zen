// src/components/TransferItemImport.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";

// ... (Interface definitions remain the same) ...
export interface ImportedItem {
  sku: string;
  itemName?: string;
  quantity: number;
  status: "valid" | "warning" | "error";
  message?: string;
}

interface TransferItemImportProps {
  onImport: (items: ImportedItem[]) => void;
  existingSkus: string[];
}

const TransferItemImport = ({ onImport, existingSkus }: TransferItemImportProps) => {
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMethod, setImportMethod] = useState<"file" | "sheets">("file");

  // ... (processImportData, handleFileUpload, handleCommit, stats calculation functions remain the same) ...
  const processImportData = (jsonData: any[]) => {
    // ... (logic) ...
    const items: ImportedItem[] = jsonData.map((row: any) => {
      // ... (logic) ...
      return {
        // ... (data) ...
      };
    });

    setImportedItems(items);
    setIsProcessing(false);
    toast.info(`Processed ${items.length} rows.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (logic) ...
    // Note: The logic for XLSX parsing goes here.
    // ...
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Clear file input
  };

  const handleSheetsData = (jsonData: any[]) => {
    // setIsProcessing(true); // Removed as GoogleSheetsInput handles this internally
    processImportData(jsonData);
  };

  const handleCommit = () => {
    const validItems = importedItems.filter((item) => item.status !== "error");
    onImport(validItems);
    setImportedItems([]);
    toast.success(`${validItems.length} items successfully added for transfer.`);
  };

  const stats = importedItems.reduce(
    (acc, item) => {
      if (item.status === "valid") acc.valid++;
      if (item.status === "warning") acc.warnings++;
      if (item.status === "error") acc.errors++;
      return acc;
    },
    { valid: 0, warnings: 0, errors: 0 },
  );

  return (
    <div className="space-y-4">
      <Tabs value={importMethod} onValueChange={(value) => setImportMethod(value as "file" | "sheets")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload File (CSV/XLSX)</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="mt-4">
          <Button asChild className="w-full" disabled={isProcessing}>
            <label>
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Select File"}
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </Button>
        </TabsContent>
        <TabsContent value="sheets" className="mt-4">
          <GoogleSheetsInput
            onImport={handleSheetsData}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </TabsContent>
      </Tabs>

      {importedItems.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <Button onClick={handleCommit} disabled={stats.valid === 0 || isProcessing}>
              Commit {stats.valid} Valid Items
            </Button>
            <Button variant="outline" onClick={() => setImportedItems([])}>
              Clear Import
            </Button>
          </div>

          <Alert>{/* ... (Alert Description for stats remains the same) ... */}</Alert>

          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
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
                    <TableCell>{item.message || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferItemImport;
