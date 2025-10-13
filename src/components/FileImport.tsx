import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
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
  pos_description: z.string().trim().min(1, "Pos Description is required").max(300, "Pos Description must be less than 300 characters"),
  item_number: z.string().trim().min(1, "Item Number is required").max(50, "Item Number must be less than 50 characters"),
  supplier: z.string().trim().min(1, "Supplier is required").max(200, "Supplier must be less than 200 characters"),
  department: z.string().trim().min(1, "Department is required").max(100, "Department must be less than 100 characters"),
  main_group: z.string().trim().min(1, "Main Group is required").max(100, "Main Group must be less than 100 characters"),
  category: z.string().trim().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  origin: z.string().trim().min(1, "Origin is required").max(100, "Origin must be less than 100 characters"),
  season: z.string().trim().min(1, "Season is required").max(50, "Season must be less than 50 characters"),
  size: z.string().trim().min(1, "Size is required").max(50, "Size must be less than 50 characters"),
  color: z.string().trim().min(1, "Color is required").max(50, "Color must be less than 50 characters"),
  color_id: z.string().trim().min(1, "Color Id is required").max(50, "Color Id must be less than 50 characters"),
  item_color_code: z.string().trim().min(1, "Item Color Code is required").max(50, "Item Color Code must be less than 50 characters"),
  theme: z.string().trim().max(100, "Theme must be less than 100 characters").optional().nullable(),
  cost_price: z.number().min(0, "Cost cannot be negative").max(1000000000, "Cost is too large"),
  selling_price: z.number().min(0, "Price cannot be negative").max(1000000000, "Price is too large"),
  tax: z.number().min(0, "Tax cannot be negative").max(100, "Tax must be less than 100"),
  unit: z.string().trim().min(1, "Unit is required").max(20, "Unit must be less than 20 characters"),
  quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative").max(1000000, "Quantity is too large").optional().nullable(),
  min_stock: z.number().int("Min stock must be a whole number").min(0, "Min stock cannot be negative").max(1000000, "Min stock is too large").optional().nullable(),
  location: z.string().trim().max(200, "Location must be less than 200 characters").optional().nullable(),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional().nullable(),
  gender: z.string().trim().max(50, "Gender must be less than 50 characters").optional().nullable(),
  brand: z.string().trim().max(100, "Brand must be less than 100 characters").optional().nullable(),
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
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateErrors, setDuplicateErrors] = useState<Array<{ sku: string; name: string; differences: any }>>([]);
  const [importErrors, setImportErrors] = useState<{
    type: string;
    message: string;
    validationErrors: Array<{ row: number; sku: string; errors: any[] }>;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      const isValidByExt = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");

      if (!isValidByExt) {
        setImportErrors({
          type: "Invalid File Type",
          message: "Please upload an Excel (.xls, .xlsx) or CSV (.csv) file.",
          validationErrors: []
        });
        setErrorDialogOpen(true);
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

    // Helper to auto-create attribute if it doesn't exist
    const ensureAttributeExists = async (table: string, name: string): Promise<void> => {
      if (!name || name.trim() === "") return;
      
      const trimmedName = name.trim();
      const { data: existing } = await (supabase as any)
        .from(table)
        .select("id")
        .eq("name", trimmedName)
        .maybeSingle();
      
      if (!existing) {
        await (supabase as any).from(table).insert({ name: trimmedName });
      }
    };

    // Helpers to make header matching robust (trim spaces, tabs, case, punctuation)
    const normalizeKey = (k: string): string =>
      k?.toString().toLowerCase().replace(/\s+/g, "").replace(/[_-]/g, "").replace(/[^a-z0-9]/g, "");

    const getVal = (row: any, ...keys: string[]): any => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
      }
      const normMap: Record<string, any> = Object.fromEntries(
        Object.keys(row || {}).map((k) => [normalizeKey(k), (row as any)[k]])
      );
      for (const key of keys) {
        const v = normMap[normalizeKey(key)];
        if (v !== undefined && v !== null && v !== "") return v;
      }
      return undefined;
    };

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
      const duplicatesList: Array<{ sku: string; name: string; differences: any }> = [];

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
            pos_description: row["Pos Description"] || row.pos_description,
            item_number: row["Item Number"] || row.item_number,
            supplier: row.Supplier || row.supplier,
            department: row.Department || row.department,
            main_group: row["Main Group"] || row.main_group,
            category: row.Category || row.category,
            origin: row.Origin || row.origin,
            season: row.Season || row.season,
            size: row.Size || row.size,
            color: row.Color || row.color,
            color_id: row["Color Id"] || row.color_id,
            item_color_code: row["Item Color Code"] || row.item_color_code,
            theme: row.Theme || row.theme || null,
            cost_price: row.Cost || row.cost ? parseFloat(row.Cost || row.cost) : 0,
            selling_price: row.Price || row.price ? parseFloat(row.Price || row.price) : 0,
            tax: row.Tax || row.tax ? parseFloat(row.Tax || row.tax) : 0,
            unit: row.Unit || row.unit || "pcs",
            quantity: row.Quantity || row.quantity ? parseInt(row.Quantity || row.quantity) : null,
            min_stock: row["Min Stock"] || row.min_stock ? parseInt(row["Min Stock"] || row.min_stock) : null,
            location: row.Location || row.location || null,
            description: row.Desc || row.description || null,
            gender: row.Gender || row.gender || null,
            brand: row.Brand || row.brand || null,
            wholesale_price: row["Wholesale Price"] || row.wholesale_price ? parseFloat(row["Wholesale Price"] || row.wholesale_price) : null,
          });

          if (!validationResult.success) {
            failCount++;
            const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
            validationErrors.push({ row: i + 1, sku, errors: validationResult.error.errors });
            continue;
          }

          const validatedData = validationResult.data;

          // Auto-create missing attributes
          await Promise.all([
            ensureAttributeExists("brands", validatedData.brand || ""),
            ensureAttributeExists("categories", validatedData.category),
            ensureAttributeExists("suppliers", validatedData.supplier),
            ensureAttributeExists("departments", validatedData.department),
            ensureAttributeExists("main_groups", validatedData.main_group),
            ensureAttributeExists("origins", validatedData.origin),
            ensureAttributeExists("seasons", validatedData.season),
            ensureAttributeExists("sizes", validatedData.size),
            ensureAttributeExists("colors", validatedData.color),
            ensureAttributeExists("genders", validatedData.gender || ""),
            ensureAttributeExists("themes", validatedData.theme || ""),
            ensureAttributeExists("locations", validatedData.location || ""),
            ensureAttributeExists("units", validatedData.unit),
          ]);

          // Check if item exists
          const { data: existing } = await supabase
            .from("items")
            .select("*")
            .eq("sku", validatedData.sku)
            .maybeSingle();

          if (existing) {
            // Found duplicate - collect for error dialog
            duplicatesFound++;
            
            // Calculate differences
            const differences: Record<string, { old: any; new: any }> = {};
            const fieldsToCompare = ['name', 'pos_description', 'item_number', 'description', 'department', 'main_group', 'category', 'origin', 'season', 'size', 'color', 'color_id', 'item_color_code', 'theme', 'brand', 'gender', 'unit', 'quantity', 'min_stock', 'location', 'supplier', 'tax'];
            
            fieldsToCompare.forEach((field) => {
              if (existing[field] !== validatedData[field as keyof typeof validatedData]) {
                differences[field] = {
                  old: existing[field],
                  new: validatedData[field as keyof typeof validatedData],
                };
              }
            });

            duplicatesList.push({
              sku: validatedData.sku,
              name: validatedData.name,
              differences: Object.keys(differences).length > 0 ? differences : null,
            });
          } else {
            // Insert new item
            const { error } = await supabase.from("items").insert({
              sku: validatedData.sku,
              name: validatedData.name,
              pos_description: validatedData.pos_description,
              item_number: validatedData.item_number,
              description: validatedData.description,
              supplier: validatedData.supplier,
              department: validatedData.department,
              main_group: validatedData.main_group,
              category: validatedData.category,
              origin: validatedData.origin,
              season: validatedData.season,
              size: validatedData.size,
              color: validatedData.color,
              color_id: validatedData.color_id,
              item_color_code: validatedData.item_color_code,
              theme: validatedData.theme,
              brand: validatedData.brand,
              gender: validatedData.gender,
              tax: validatedData.tax,
              quantity: validatedData.quantity ?? 0,
              min_stock: validatedData.min_stock ?? 10,
              unit: validatedData.unit,
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

      // Create import log
      await supabase.from("import_logs").insert({
        file_name: file.name,
        import_type: importType,
        total_rows: data.length,
        successful_rows: successCount,
        failed_rows: failCount,
        duplicates_found: duplicatesFound,
        status: "completed",
      });

      // Show error dialog if there were validation errors
      if (validationErrors.length > 0) {
        setImportErrors({
          type: "Validation Errors",
          message: `${failCount} row(s) failed validation. Please review the errors below and correct your data.`,
          validationErrors
        });
        setErrorDialogOpen(true);
      }

      // Show duplicate dialog if duplicates were found
      if (duplicatesFound > 0) {
        setDuplicateErrors(duplicatesList);
        setDuplicateDialogOpen(true);
      }

      toast.success(
        `Import completed: ${successCount} successful${failCount > 0 ? `, ${failCount} failed` : ""}${
          duplicatesFound > 0 ? `, ${duplicatesFound} duplicates skipped` : ""
        }`
      );

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

  const exportDuplicateLog = () => {
    const errorData = duplicateErrors.map((dup) => ({
      SKU: dup.sku,
      Name: dup.name,
      Status: "Duplicate - Already exists in system",
      Differences: dup.differences
        ? Object.keys(dup.differences).map(k => `${k}: ${dup.differences[k].old} → ${dup.differences[k].new}`).join("; ")
        : "No differences (exact duplicate)",
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Duplicate Items");
    XLSX.writeFile(wb, `duplicate-items-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Duplicate log exported successfully");
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
                  <p className="text-muted-foreground text-xs">
                    <strong>Required:</strong> Name, Pos Description, Item Number, SKU, Supplier, Department, Main Group, Category, Origin, Season, Size, Color, Color Id, Item Color Code, Price, Cost, Tax
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <strong>Optional:</strong> Theme, Desc, Brand, Gender, Quantity, Min Stock, Unit, Location
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

    {/* Duplicate Items Dialog */}
    <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Duplicate Items Found
          </DialogTitle>
          <DialogDescription>
            {duplicateErrors.length} item{duplicateErrors.length > 1 ? "s" : ""} already exist in the system
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Partially Completed</AlertTitle>
          <AlertDescription>
            Some items were skipped because they already exist in the system (matching SKU). These items were not updated to prevent accidental data changes. You can export the error log to see which items were affected and review their differences.
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            <div className="divide-y">
              {duplicateErrors.slice(0, 15).map((dup, index) => (
                <div key={index} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{dup.sku}</p>
                      <p className="text-sm text-muted-foreground">{dup.name}</p>
                      {dup.differences && (
                        <p className="text-xs text-destructive mt-1">
                          {Object.keys(dup.differences).length} field{Object.keys(dup.differences).length > 1 ? "s" : ""} differ
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      Duplicate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {duplicateErrors.length > 15 && (
            <div className="bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
              And {duplicateErrors.length - 15} more duplicate{duplicateErrors.length - 15 > 1 ? "s" : ""}...
            </div>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">💡 What to do next:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Export the error log to see all duplicate items and their differences</li>
            <li>• Review if the existing data needs to be updated manually</li>
            <li>• Remove duplicate rows from your import file and try again</li>
            <li>• Use the "Quantity Update Only" import type if you only need to update quantities</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
            Close
          </Button>
          <Button onClick={exportDuplicateLog}>
            <Download className="w-4 h-4 mr-2" />
            Export Error Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default FileImport;
