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
import { z } from "zod";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Validation schema for item data
const itemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  category: z.string().trim().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  brand: z.string().trim().max(100, "Brand must be less than 100 characters").optional().nullable(),
  size: z.string().trim().max(50, "Size must be less than 50 characters").optional().nullable(),
  color: z.string().trim().max(50, "Color must be less than 50 characters").optional().nullable(),
  gender: z.string().trim().max(50, "Gender must be less than 50 characters").optional().nullable(),
  season: z.string().trim().max(50, "Season must be less than 50 characters").optional().nullable(),
  unit: z.string().trim().min(1, "Unit is required").max(20, "Unit must be less than 20 characters"),
  quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative").max(1000000, "Quantity is too large").optional().nullable(),
  min_stock: z.number().int("Min stock must be a whole number").min(0, "Min stock cannot be negative").max(1000000, "Min stock is too large").optional().nullable(),
  location: z.string().trim().max(200, "Location must be less than 200 characters").optional().nullable(),
  supplier: z.string().trim().max(200, "Supplier must be less than 200 characters").optional().nullable(),
  cost_price: z.number().min(0, "Cost price cannot be negative").max(1000000000, "Cost price is too large").optional().nullable(),
  selling_price: z.number().min(0, "Selling price cannot be negative").max(1000000000, "Selling price is too large").optional().nullable(),
  wholesale_price: z.number().min(0, "Wholesale price cannot be negative").max(1000000000, "Wholesale price is too large").optional().nullable(),
});

// Validation schema for quantity update
const quantityUpdateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative").max(1000000, "Quantity is too large"),
});

const FileImport = ({ open, onOpenChange, onImportComplete }: FileImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"full" | "quantity">("full");
  const [isUploading, setIsUploading] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<{
    type: string;
    message: string;
    validationErrors: Array<{ row: number; sku: string; errors: any[] }>;
  } | null>(null);

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
        setImportErrors({
          type: "Empty File",
          message: "The selected file contains no data. Please check your file and try again.",
          validationErrors: []
        });
        setErrorDialogOpen(true);
        setIsUploading(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let duplicatesFound = 0;
      const validationErrors: any[] = [];

      if (importType === "full") {
        // Full import: create or detect duplicates
        let importLogId: string | null = null;
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const sku = row.SKU || row.sku;
          
          // Validate row data
          const validationResult = itemSchema.safeParse({
            sku,
            name: row.Name || row.name,
            category: row.Category || row.category,
            brand: row.Brand || row.brand || null,
            size: row.Size || row.size || null,
            color: row.Color || row.color || null,
            gender: row.Gender || row.gender || null,
            season: row.Season || row.season || null,
            unit: row.Unit || row.unit || "pcs",
            quantity: row.Quantity || row.quantity ? parseInt(row.Quantity || row.quantity) : null,
            min_stock: row["Min Stock"] || row.min_stock ? parseInt(row["Min Stock"] || row.min_stock) : null,
            location: row.Location || row.location || null,
            supplier: row.Supplier || row.supplier || null,
            cost_price: row["Cost Price"] || row.cost_price ? parseFloat(row["Cost Price"] || row.cost_price) : null,
            selling_price: row["Selling Price"] || row.selling_price ? parseFloat(row["Selling Price"] || row.selling_price) : null,
            wholesale_price: row["Wholesale Price"] || row.wholesale_price ? parseFloat(row["Wholesale Price"] || row.wholesale_price) : null,
          });

          if (!validationResult.success) {
            failCount++;
            const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
            validationErrors.push({ row: i + 1, sku, errors: validationResult.error.errors });
            continue;
          }

          const validatedData = validationResult.data;

          // Check if item exists
          const { data: existing } = await supabase
            .from("items")
            .select("*")
            .eq("sku", validatedData.sku)
            .maybeSingle();

          if (existing) {
            // Found duplicate - create import log if not exists
            if (!importLogId) {
              const { data: logData } = await supabase
                .from("import_logs")
                .insert({
                  file_name: file.name,
                  import_type: importType,
                  total_rows: data.length,
                  successful_rows: 0,
                  failed_rows: 0,
                  duplicates_found: 0,
                  status: "processing",
                })
                .select()
                .single();
              importLogId = logData?.id || null;
            }

            // Store duplicate for comparison
            duplicatesFound++;
            
            // Calculate differences
            const differences: Record<string, { old: any; new: any }> = {};
            const fieldsToCompare = ['name', 'category', 'brand', 'size', 'color', 'gender', 'season', 'unit', 'quantity', 'min_stock', 'location', 'supplier'];
            
            fieldsToCompare.forEach((field) => {
              if (existing[field] !== validatedData[field as keyof typeof validatedData]) {
                differences[field] = {
                  old: existing[field],
                  new: validatedData[field as keyof typeof validatedData],
                };
              }
            });

            // Save to duplicate_comparisons table
            await supabase.from("duplicate_comparisons").insert({
              import_log_id: importLogId,
              sku: validatedData.sku,
              existing_data: existing,
              new_data: row,
              differences,
            });
          } else {
            // Insert new item
            const { error } = await supabase.from("items").insert({
              sku: validatedData.sku,
              name: validatedData.name,
              category: validatedData.category,
              brand: validatedData.brand,
              size: validatedData.size,
              color: validatedData.color,
              gender: validatedData.gender,
              season: validatedData.season,
              quantity: validatedData.quantity ?? 0,
              min_stock: validatedData.min_stock ?? 10,
              unit: validatedData.unit,
              supplier: validatedData.supplier,
              location: validatedData.location,
            });

            if (error) {
              failCount++;
            } else {
              successCount++;
              
              // Handle price levels if provided
              if (validatedData.cost_price || validatedData.selling_price || validatedData.wholesale_price) {
                const { data: insertedItem } = await supabase
                  .from("items")
                  .select("id")
                  .eq("sku", validatedData.sku)
                  .single();

                if (insertedItem) {
                  await supabase.from("price_levels").insert({
                    item_id: insertedItem.id,
                    cost_price: validatedData.cost_price ?? 0,
                    selling_price: validatedData.selling_price ?? 0,
                    wholesale_price: validatedData.wholesale_price,
                    is_current: true,
                    effective_date: new Date().toISOString()
                  });
                }
              }
            }
          }
        }
      } else {
        // Quantity update: match by SKU and update quantity only
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const sku = row.SKU || row.sku;
          const quantityValue = row.Quantity || row.quantity;
          
          // Validate row data
          const validationResult = quantityUpdateSchema.safeParse({
            sku,
            quantity: quantityValue ? parseInt(quantityValue) : undefined,
          });

          if (!validationResult.success) {
            failCount++;
            const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
            validationErrors.push({ row: i + 1, sku, errors: validationResult.error.errors });
            continue;
          }

          const validatedData = validationResult.data;

          const { error } = await supabase
            .from("items")
            .update({ quantity: validatedData.quantity })
            .eq("sku", validatedData.sku);

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        }
      }

      // Update or create import log
      if (importType === "full" && duplicatesFound > 0) {
        // Update existing log
        await supabase
          .from("import_logs")
          .update({
            successful_rows: successCount,
            failed_rows: failCount,
            duplicates_found: duplicatesFound,
            status: "completed",
          })
          .eq("id", (await supabase.from("import_logs").select("id").order("created_at", { ascending: false }).limit(1).single()).data?.id);
      } else {
        // Create new log
        await supabase.from("import_logs").insert({
          file_name: file.name,
          import_type: importType,
          total_rows: data.length,
          successful_rows: successCount,
          failed_rows: failCount,
          duplicates_found: duplicatesFound,
          status: "completed",
        });
      }

      // Show error dialog if there were validation errors
      if (validationErrors.length > 0) {
        setImportErrors({
          type: "Validation Errors",
          message: `${failCount} row(s) failed validation. Please review the errors below and correct your data.`,
          validationErrors
        });
        setErrorDialogOpen(true);
      }

      toast.success(
        `Import completed: ${successCount} successful, ${failCount} failed${
          duplicatesFound > 0 ? `, ${duplicatesFound} duplicates found` : ""
        }`
      );

      if (duplicatesFound > 0) {
        toast.info("Duplicates found! Go to Duplicates page to review and resolve them", {
          duration: 5000,
        });
      }

      onImportComplete();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      setImportErrors({
        type: "Import Failed",
        message: error.message || "An unexpected error occurred during import. Please check your file format and try again.",
        validationErrors: []
      });
      setErrorDialogOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Inventory Data</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import or update your inventory. Works with files downloaded from Google Sheets.
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

          <div className="space-y-3">
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-sm">
              <p className="font-medium mb-2 text-primary">📊 Using Google Sheets?</p>
              <p className="text-muted-foreground">
                Download your sheet as Excel (.xlsx) or CSV: File → Download → Microsoft Excel or Comma Separated Values (.csv)
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">Expected columns:</p>
              {importType === "full" ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    <strong>Required:</strong> SKU, Name, Category
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <strong>Optional:</strong> Brand, Size, Color, Gender, Season, Quantity, Min Stock, Unit, Supplier, Location
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Note: Quantity defaults to 0 if not provided
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">SKU, Quantity</p>
              )}
            </div>
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

    {/* Error Dialog */}
    <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            {importErrors?.type}
          </DialogTitle>
          <DialogDescription>
            {importErrors?.message}
          </DialogDescription>
        </DialogHeader>

        {importErrors && importErrors.validationErrors.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Error Details:</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {importErrors.validationErrors.map((error, idx) => (
                <div key={idx} className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="font-medium text-sm mb-2">
                    Row {error.row} {error.sku && `(SKU: ${error.sku})`}
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {error.errors.map((err: any, errIdx: number) => (
                      <li key={errIdx} className="flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        <span>
                          <strong>{err.path.join('.')}</strong>: {err.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">💡 Tips to fix these errors:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Ensure all required fields (SKU, Name, Category) are filled</li>
            <li>• Check that numeric fields (Quantity, Price) contain valid numbers</li>
            <li>• Verify text fields don't exceed maximum character limits</li>
            <li>• Make sure there are no special characters in numeric fields</li>
            <li>• Save your file as Excel (.xlsx) or CSV before importing</li>
          </ul>
        </div>

        <DialogFooter>
          <Button onClick={() => setErrorDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default FileImport;
