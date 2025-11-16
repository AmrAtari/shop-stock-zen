// src/components/TransferItemImport.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput"; // NOTE: Now correctly imported

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

  const processImportData = (jsonData: any[]) => {
    const items: ImportedItem[] = jsonData.map((row: any) => {
      const sku = String(row.SKU || row.sku || "").trim();
      const quantity = parseFloat(row.Quantity || row.quantity || 0);

      let status: ImportedItem["status"] = "valid";
      let message = "";

      if (!sku) {
        status = "error";
        message = "SKU is missing.";
      } else if (isNaN(quantity) || quantity <= 0) {
        status = "error";
        message = "Quantity must be a positive number.";
      } else if (!existingSkus.includes(sku)) {
        status = "warning";
        message = "SKU not found in inventory. Item name will be blank.";
      }

      return {
        sku,
        itemName: String(row["Item Name"] || row.itemName || ""),
        quantity,
        status,
        message,
      };
    });

    setImportedItems(items);
    setIsProcessing(false);
    toast.info(`Processed ${items.length} rows.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Simple column mapping based on the first row
        const headers = json[0] as string[];
        const dataRows = json.slice(1);

        const keyMap: { [key: string]: string } = {};
        headers.forEach((h: string) => {
          if (h.toLowerCase().includes("sku")) keyMap["sku"] = h;
          if (h.toLowerCase().includes("name")) keyMap["itemName"] = h;
          if (h.toLowerCase().includes("quantity")) keyMap["quantity"] = h;
        });

        const jsonData = dataRows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        processImportData(jsonData);
      } catch (error) {
        toast.error("Error reading file. Ensure it's a valid Excel or CSV format.");
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Clear file input
  };

  const handleSheetsData = (jsonData: any[]) => {
    // setIsProcessing(true); // Handled by GoogleSheetsInput internally
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
          {/* 🛠️ FIX APPLIED HERE: Passed the correct props based on GoogleSheetsInput.tsx */}
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

          <Alert>
            <AlertDescription className="flex justify-between items-center">
              <span className="font-medium">Import Results:</span>
              <div className="flex gap-4">
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
                    {/* Syntax error fix applied here */}
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
