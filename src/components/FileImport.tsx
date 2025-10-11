import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const FileImport = ({ open, onOpenChange, onImportComplete }: FileImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"full" | "quantity">("full");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv"
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload a valid Excel (.xls, .xlsx) or CSV file");
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data),
        error: reject,
      });
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import");
      return;
    }

    setIsUploading(true);

    try {
      let data: any[];
      
      if (file.type === "text/csv") {
        data = await parseCSVFile(file);
      } else {
        data = await parseExcelFile(file);
      }

      if (data.length === 0) {
        toast.error("No data found in file");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let duplicatesFound = 0;
      const duplicates = [];

      if (importType === "full") {
        // Full import: create or detect duplicates
        for (const row of data) {
          const sku = row.SKU || row.sku;
          if (!sku) {
            failCount++;
            continue;
          }

          // Check if item exists
          const { data: existing } = await supabase
            .from("items")
            .select("*")
            .eq("sku", sku)
            .single();

          if (existing) {
            // Found duplicate - store for comparison
            duplicatesFound++;
            duplicates.push({
              sku,
              existing,
              newData: row,
            });
          } else {
            // Insert new item
            const { error } = await supabase.from("items").insert({
              sku,
              name: row.Name || row.name,
              category: row.Category || row.category,
              brand: row.Brand || row.brand,
              size: row.Size || row.size,
              color: row.Color || row.color,
              gender: row.Gender || row.gender,
              season: row.Season || row.season,
              quantity: parseInt(row.Quantity || row.quantity || "0"),
              min_stock: parseInt(row["Min Stock"] || row.min_stock || "10"),
              unit: row.Unit || row.unit || "pcs",
              supplier: row.Supplier || row.supplier,
              location: row.Location || row.location,
            });

            if (error) {
              failCount++;
            } else {
              successCount++;
            }
          }
        }
      } else {
        // Quantity update: match by SKU and update quantity only
        for (const row of data) {
          const sku = row.SKU || row.sku;
          const quantity = parseInt(row.Quantity || row.quantity || "0");

          if (!sku) {
            failCount++;
            continue;
          }

          const { error } = await supabase
            .from("items")
            .update({ quantity })
            .eq("sku", sku);

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        }
      }

      // Log import
      const { error: logError } = await supabase.from("import_logs").insert({
        file_name: file.name,
        import_type: importType,
        total_rows: data.length,
        successful_rows: successCount,
        failed_rows: failCount,
        duplicates_found: duplicatesFound,
        status: "completed",
      });

      toast.success(
        `Import completed: ${successCount} successful, ${failCount} failed${
          duplicatesFound > 0 ? `, ${duplicatesFound} duplicates found` : ""
        }`
      );

      if (duplicatesFound > 0) {
        toast.info("Check the Duplicates section to review conflicting items");
      }

      onImportComplete();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      toast.error("Import failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Inventory Data</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import or update your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Import Type</Label>
            <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Data Import</SelectItem>
                <SelectItem value="quantity">Quantity Update Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {importType === "full"
                ? "Import complete item data. Duplicates will be flagged for review."
                : "Update quantities for existing items by matching SKU."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>File</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-2">Expected columns:</p>
            {importType === "full" ? (
              <p className="text-muted-foreground">
                SKU, Name, Category, Brand, Size, Color, Gender, Season, Quantity, Min Stock, Unit, Supplier, Location
              </p>
            ) : (
              <p className="text-muted-foreground">SKU, Quantity</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileImport;
