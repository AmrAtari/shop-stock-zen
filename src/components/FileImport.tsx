import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Download, AlertCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";
import { Progress } from "@/components/ui/progress";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// --- ZOD VALIDATION SCHEMA (Matches the CSV headers) ---
const itemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU too long"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name too long"),
  "Pos Description": z.string().optional(),
  "Item Number": z.string().optional(),
  Supplier: z.string().trim().min(1, "Supplier is required").max(100, "Supplier too long"),
  Gender: z.string().trim().min(1, "Gender is required").max(50, "Gender too long"),
  "Main Group": z.string().trim().min(1, "Main Group is required").max(100, "Main Group too long"),
  Category: z.string().trim().min(1, "Category is required").max(100, "Category too long"),
  Origin: z.string().trim().min(1, "Origin is required").max(50, "Origin too long"),
  Season: z.string().trim().min(1, "Season is required").max(50, "Season too long"),
  Size: z.string().trim().min(1, "Size is required").max(50, "Size too long"),
  Color: z.string().trim().min(1, "Color is required").max(50, "Color is required"),
  "Color Id": z.string().optional(),
  "Item Color Code": z.string().optional(),
  Theme: z.string().optional(),
  // Note: The CSV headers are used here, even if the database columns are different
  Price: z.number({ invalid_type_error: "Price must be a number" }).min(0, "Price must be non-negative"),
  Cost: z.number({ invalid_type_error: "Cost must be a number" }).min(0, "Cost must be non-negative"),
  Tax: z.number({ invalid_type_error: "Tax must be a number" }).min(0, "Tax must be non-negative"),
});

// --- CRITICAL ATTRIBUTE CLEANING FUNCTION ---
const cleanAttributeName = (name: string): string => {
  if (!name) return "";
  // Trim all whitespace, convert to uppercase, and replace any sequence of
  // spaces/invisible chars with a single space.
  return name.trim().toUpperCase().replace(/\s+/g, " ");
};

// --- CORE ATTRIBUTE LOOKUP AND CREATION LOGIC (FIXED for consistency) ---
const ensureAndMapAttribute = async (
  tableName: string,
  attributeName: string,
): Promise<{ id: string | null; error: string | null }> => {
  const cleanedName = cleanAttributeName(attributeName);

  if (!cleanedName) {
    return { id: null, error: `Empty attribute name for table ${tableName}` };
  }

  try {
    // 1. SELECT: Try to find the attribute ID using the CLEANED name
    let { data: attributeData, error: selectError } = await supabase
      .from(tableName)
      .select("id")
      .eq("name", cleanedName) // CRITICAL: Use cleanedName here for reliable lookup
      .maybeSingle();

    if (selectError) throw selectError;

    if (attributeData) {
      // Attribute found, return ID
      return { id: attributeData.id, error: null };
    }

    // 2. INSERT: Attribute not found, attempt to insert the CLEANED name
    let { data: newAttributeData, error: insertError } = await supabase
      .from(tableName)
      .insert({ name: cleanedName }) // CRITICAL: Insert cleanedName here
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    // Insertion successful, return new ID
    return { id: newAttributeData.id, error: null };
  } catch (error: any) {
    console.error(`Error processing attribute ${tableName}(${cleanedName}):`, error.message);
    return {
      id: null,
      error: `Critical attribute missing: ${tableName}(${attributeName}) could not be found/created. Error: ${error.message.substring(
        0,
        100,
      )}...`,
    };
  }
};

const ensureAllAttributes = async (item: z.infer<typeof itemSchema>) => {
  const storeName = "Default"; // Assuming all imports default to a 'Default' store

  // Mapping of foreign key type to the value read from the file
  const attributeMap: { [key: string]: string } = {
    category: item.Category,
    supplier: item.Supplier,
    gender: item.Gender,
    main_group: item["Main Group"],
    origin: item.Origin,
    season: item.Season,
    color: item.Color,
    size: item.Size,
    store: storeName, // Hardcoded default store
  };

  const attributeIdMap: { [key: string]: string } = {};
  const failedAttributes: string[] = [];

  const promises = Object.entries(attributeMap).map(async ([type, name]) => {
    // The table name is derived from the type (e.g., 'category' -> 'categories')
    const tableName = type === "store" ? "stores" : `${type}s`;

    const { id, error } = await ensureAndMapAttribute(tableName, name);

    if (error || !id) {
      failedAttributes.push(`${type.toUpperCase()}(${name})`);
    } else {
      // Map the foreign key to the correct name for the final insert object
      // e.g., 'category_id', 'supplier_id'
      attributeIdMap[`${type}_id`] = id;
    }
  });

  await Promise.all(promises);

  return {
    attributeIds: attributeIdMap,
    error:
      failedAttributes.length > 0
        ? `Critical attribute missing: ${failedAttributes.join(", ")} could not be found/created. This is usually due to RLS blocking attribute insertion.`
        : null,
  };
};
// --- END OF CORE ATTRIBUTE LOGIC ---

const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<"full_stock" | "quantity_update">("full_stock");
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "finished">("idle");
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  const [duplicateErrors, setDuplicateErrors] = useState<any[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const readFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setImportStatus("idle");
    setProgress(0);
    setErrorDetails([]);
    setDuplicateErrors([]);
    toast.info(`File selected: ${uploadedFile.name}`);
  };

  const handleImport = async () => {
    if (!file) return toast.error("Please select a file first.");
    setImportStatus("processing");
    setProgress(0);
    setErrorDetails([]);
    setDuplicateErrors([]);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        const totalRows = rawJson.length;
        let currentErrors: any[] = [];
        let currentDuplicates: any[] = [];
        const itemsToInsert: Partial<Item>[] = [];

        // --- Start processing loop ---
        for (let i = 0; i < totalRows; i++) {
          const rawItem = rawJson[i];
          const rowNumber = i + 1;

          // 1. Zod Validation (Basic structure and types)
          const validatedItem = itemSchema.safeParse({
            ...rawItem,
            // Ensure numeric conversions for Zod validation
            Price: rawItem.Price ? parseFloat(rawItem.Price) : undefined,
            Cost: rawItem.Cost ? parseFloat(rawItem.Cost) : undefined,
            Tax: rawItem.Tax ? parseFloat(rawItem.Tax) : undefined,
            sku: String(rawItem.SKU || "").trim(), // Ensure SKU is trimmed string
          });

          if (!validatedItem.success) {
            currentErrors.push({
              row: rowNumber,
              sku: String(rawItem.SKU || "N/A"),
              errors: validatedItem.error.issues.map((issue) => `• ${issue.path.join(".")}: ${issue.message}`),
            });
            continue;
          }

          const item = validatedItem.data;

          // 2. Attribute Mapping (Ensures Category, Supplier, etc. exist)
          const { attributeIds, error: attributeError } = await ensureAllAttributes(item);

          if (attributeError) {
            currentErrors.push({
              row: rowNumber,
              sku: item.sku,
              errors: [`• database.foreign_key_precheck: ${attributeError}`],
            });
            continue;
          }

          // 3. Prepare Final Insert Object (FIX: Trying retail_price, unit_cost, tax)
          const finalInsert: Partial<Item> = {
            sku: item.sku,
            name: item.name,
            item_number: item["Item Number"],
            pos_description: item["Pos Description"],

            // --- CRITICAL FIX: Mapping CSV headers to revised snake_case columns ---
            retail_price: item.Price, // Maps CSV Price
            unit_cost: item.Cost, // Maps CSV Cost
            tax: item.Tax, // Maps CSV Tax
            // ---------------------------------------------------------------------------------

            color_id_code: item["Color Id"],
            item_color_code: item["Item Color Code"],
            theme: item.Theme,

            // Map the foreign key IDs
            ...attributeIds,
          };

          itemsToInsert.push(finalInsert);

          // Update progress
          if ((i + 1) % 10 === 0 || i === totalRows - 1) {
            setProgress(Math.round(((i + 1) / totalRows) * 100));
          }
        }
        // --- End processing loop ---

        // 4. Batch Insertion of Valid Items
        if (itemsToInsert.length > 0 && dataType === "full_stock") {
          const { error: insertError } = await supabase
            .from("inventory_items")
            .insert(itemsToInsert as any) // Cast as any to avoid complex TS issues for batch insert
            .select("sku");

          if (insertError) {
            // Handle unique constraint violation (duplicate SKU) or other batch errors
            console.error("Batch Insert Error:", insertError);
            currentErrors.push({
              row: "Batch",
              sku: "N/A",
              errors: [`• database.batch_insert_failed: ${insertError.message}`],
            });
          }
        }

        // 5. Final Report
        if (currentErrors.length > 0) {
          setErrorDetails(currentErrors);
          toast.error(`${currentErrors.length} row(s) failed validation or database insertion.`);
        } else if (currentDuplicates.length > 0) {
          setDuplicateErrors(currentDuplicates);
          setDuplicateDialogOpen(true);
          toast.warning(`Import complete with ${currentDuplicates.length} duplicates found.`);
        } else {
          toast.success(`Import successful! ${itemsToInsert.length} items processed.`);
          onOpenChange(false); // Close dialog on success
          invalidateInventoryData(queryClient);
        }

        setImportStatus("finished");
      } catch (e: any) {
        console.error("Import failed:", e);
        toast.error(`Import failed during file processing: ${e.message}`);
        setImportStatus("finished");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const exportErrorLog = () => {
    if (errorDetails.length === 0) return;
    const data = errorDetails.map((err) => ({
      Row: err.row,
      SKU: err.sku,
      Errors: err.errors.join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ErrorLog");
    XLSX.writeFile(wb, "import_error_log.xlsx");
  };

  const exportDuplicateLog = () => {
    // Logic for exporting duplicates (assuming currentDuplicates has the raw data)
    if (duplicateErrors.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(duplicateErrors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DuplicateLog");
    XLSX.writeFile(wb, "import_duplicate_log.xlsx");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Inventory Data</DialogTitle>
            <DialogDescription>Upload a `.csv` or `.xlsx` file to update or add inventory items.</DialogDescription>
          </DialogHeader>

          <Tabs value={dataType} onValueChange={(value) => setDataType(value as "full_stock" | "quantity_update")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full_stock">Full Item Creation/Update</TabsTrigger>
              <TabsTrigger value="quantity_update">Quantity Update Only</TabsTrigger>
            </TabsList>
          </Tabs>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-upload-input")?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-600 font-medium">Drag & drop your file here, or click to select</p>
            <p className="text-sm text-gray-500 mt-1">
              {file ? `File selected: ${file.name}` : "Accepted formats: CSV, XLSX"}
            </p>
            <input
              id="file-upload-input"
              type="file"
              accept=".csv,.xlsx"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  readFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {importStatus === "processing" && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing Rows...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Error Display Section */}
          {errorDetails.length > 0 && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{errorDetails.length} Validation/Database Errors</AlertTitle>
                <AlertDescription>
                  <p className="mt-2 text-sm">
                    The following rows failed validation or database insertion. Please review the errors below.
                  </p>
                  <div className="mt-4 max-h-60 overflow-y-auto bg-destructive/10 p-3 rounded-md">
                    {errorDetails.slice(0, 15).map((err, index) => (
                      <div key={index} className="text-xs mb-2 border-b border-destructive/20 pb-2">
                        <p className="font-semibold">
                          Row {err.row} (SKU: {err.sku})
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          {err.errors.map((msg: string, i: number) => (
                            <li key={i}>{msg.replace("• ", "")}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {errorDetails.length > 15 && (
                      <p className="text-center text-sm mt-2">...and {errorDetails.length - 15} more errors.</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFile(null);
                setImportStatus("idle");
                setErrorDetails([]);
                setDuplicateErrors([]);
              }}
            >
              Close
            </Button>
            {errorDetails.length > 0 && (
              <Button onClick={exportErrorLog} variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Export Error Log
              </Button>
            )}
            <Button onClick={handleImport} disabled={!file || importStatus === "processing"}>
              {importStatus === "processing" ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Start Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicate Items Found</DialogTitle>
            <DialogDescription>
              {duplicateErrors.length} items already exist in the database and were skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto mt-4 border rounded-lg">
            <div className="p-3">
              {duplicateErrors.slice(0, 15).map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="text-sm font-medium truncate">
                    {item.sku} - {item.name}
                  </span>
                  <div className="flex-shrink-0">
                    <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">Duplicate</span>
                  </div>
                </div>
              ))}
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
