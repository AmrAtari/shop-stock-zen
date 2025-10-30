import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Download, AlertCircle, RefreshCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateInventoryData } from "@/hooks/queryKeys";
import { Progress } from "@/components/ui/progress";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Define the attribute tables that are checked for existence
const ATTRIBUTE_COLUMNS = [
  { fileHeader: "Category", dbTable: "categories", dbColumn: "category_id" },
  { fileHeader: "Supplier", dbTable: "suppliers", dbColumn: "supplier_id" },
  { fileHeader: "Gender", dbTable: "genders", dbColumn: "gender_id" },
  { fileHeader: "Main Group", dbTable: "main_groups", dbColumn: "main_group_id" },
  { fileHeader: "Origin", dbTable: "origins", dbColumn: "origin_id" },
  { fileHeader: "Season", dbTable: "seasons", dbColumn: "season_id" },
  { fileHeader: "Color", dbTable: "colors", dbColumn: "color_id" },
  { fileHeader: "Size", dbTable: "sizes", dbColumn: "size_id" },
  // NOTE: Store is handled separately as it's hardcoded to 'Default'
];

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

// --- CORE ATTRIBUTE CHECK FUNCTION (Modified to only check existence) ---
const checkAttributeExistence = async (tableName: string, attributeNames: string[]): Promise<string[]> => {
  if (attributeNames.length === 0) return [];
  const cleanedNames = attributeNames.map(cleanAttributeName).filter((n) => n.length > 0);

  if (cleanedNames.length === 0) return [];

  // Query database to find attributes that already exist
  const { data, error } = await supabase.from(tableName).select("name").in("name", cleanedNames);

  if (error) {
    console.error(`Error checking attributes in ${tableName}:`, error);
    // On error, assume all are new to prevent accidental skipping if RLS is strict
    return cleanedNames;
  }

  const existingNames = new Set(data?.map((row) => cleanAttributeName(row.name)) || []);

  // Return the list of cleaned names that DO NOT exist
  return cleanedNames.filter((name) => !existingNames.has(name));
};

// --- CORE ATTRIBUTE CREATION FUNCTION (Used after user confirmation) ---
const createAttribute = async (tableName: string, name: string): Promise<string | null> => {
  const cleanedName = cleanAttributeName(name);
  if (!cleanedName) return null;

  try {
    // 1. Try to insert
    let { data, error: insertError } = await supabase
      .from(tableName)
      .insert({ name: cleanedName })
      .select("id")
      .single();

    if (insertError) {
      // 2. If insert fails (likely unique constraint violation due to race condition), select
      // NOTE: This handles cases where two parallel processes try to insert the same value.
      if (insertError.code === "23505") {
        // PostgreSQL unique violation code
        const { data: selectData, error: selectError } = await supabase
          .from(tableName)
          .select("id")
          .eq("name", cleanedName)
          .maybeSingle();

        if (selectError || !selectData)
          throw selectError || new Error("Failed to retrieve existing attribute after insert failure.");
        return selectData.id;
      }
      throw insertError;
    }

    return data.id;
  } catch (error: any) {
    console.error(`Error processing attribute ${tableName}(${cleanedName}):`, error.message);
    return null;
  }
};

// --- CORE ATTRIBUTE LOOKUP AND MAPPING LOGIC (USED IN PHASE 2) ---
// This function now ASSUMES all attributes already exist or have been created.
const ensureAndMapAttribute = async (
  tableName: string,
  attributeName: string,
): Promise<{ id: string | null; error: string | null }> => {
  const cleanedName = cleanAttributeName(attributeName);
  if (!cleanedName) {
    return { id: null, error: `Empty attribute name for table ${tableName}` };
  }

  try {
    // Attempt to find the ID (it must exist now)
    let { data: attributeData, error: selectError } = await supabase
      .from(tableName)
      .select("id")
      .eq("name", cleanedName)
      .maybeSingle();

    if (selectError) throw selectError;

    if (attributeData) {
      return { id: attributeData.id, error: null };
    }

    // Fallback: If not found, something is wrong with the pre-check/creation phase.
    return { id: null, error: `Critical attribute missing after pre-check/creation: ${tableName}(${attributeName})` };
  } catch (error: any) {
    console.error(`Error processing attribute ${tableName}(${cleanedName}):`, error.message);
    return {
      id: null,
      error: `Database lookup failed for: ${tableName}(${attributeName}). Error: ${error.message.substring(0, 100)}...`,
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

  // We are now calling the helper that is guaranteed to find the ID (since it was pre-checked/created)
  const promises = Object.entries(attributeMap).map(async ([type, name]) => {
    const tableName = type === "store" ? "stores" : `${type}s`;
    const dbKey = type === "store" ? "store_id" : `${type}_id`;

    const { id, error } = await ensureAndMapAttribute(tableName, name);

    if (error || !id) {
      failedAttributes.push(`${type.toUpperCase()}(${name})`);
    } else {
      attributeIdMap[dbKey] = id;
    }
  });

  await Promise.all(promises);

  return {
    attributeIds: attributeIdMap,
    error: failedAttributes.length > 0 ? `Failed to map IDs for: ${failedAttributes.join(", ")}.` : null,
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

  // NEW STATE FOR ATTRIBUTE CONFIRMATION
  const [rawJsonData, setRawJsonData] = useState<any[]>([]);
  const [newAttributesToConfirm, setNewAttributesToConfirm] = useState<Record<string, string[]>>({});
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const readFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setImportStatus("idle");
    setProgress(0);
    setErrorDetails([]);
    setDuplicateErrors([]);
    setNewAttributesToConfirm({});
    setRawJsonData([]);
    toast.info(`File selected: ${uploadedFile.name}`);
  };

  // --- PHASE 1: PRE-CHECK AND CONFIRMATION ---
  const handleImport = async () => {
    if (!file) return toast.error("Please select a file first.");
    setImportStatus("processing");
    setProgress(1); // Start progress bar

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);
        setRawJsonData(rawJson); // Store raw data for phase 2

        const uniqueAttributes: Record<string, Set<string>> = {};

        // 1. Collect all unique attribute values from the file
        rawJson.forEach((rawItem) => {
          ATTRIBUTE_COLUMNS.forEach(({ fileHeader, dbTable }) => {
            const value = String(rawItem[fileHeader] || "").trim();
            if (value) {
              if (!uniqueAttributes[dbTable]) {
                uniqueAttributes[dbTable] = new Set();
              }
              uniqueAttributes[dbTable].add(value);
            }
          });
        });

        setProgress(25); // Mid-way progress

        // 2. Check which unique attributes are NOT in the database
        const attributesToCreate: Record<string, string[]> = {};
        const checkPromises = Object.entries(uniqueAttributes).map(async ([dbTable, valuesSet]) => {
          const newValues = await checkAttributeExistence(dbTable, Array.from(valuesSet));
          if (newValues.length > 0) {
            attributesToCreate[dbTable] = newValues;
          }
        });

        await Promise.all(checkPromises);
        setProgress(50); // Almost done with pre-check

        // 3. Handle result
        if (Object.keys(attributesToCreate).length > 0) {
          setNewAttributesToConfirm(attributesToCreate);
          setIsConfirmationDialogOpen(true);
          setImportStatus("idle"); // Stop the import flow to wait for confirmation
          setProgress(0);
          toast.warning("New attributes detected. Please confirm creation.");
        } else {
          // If no new attributes, proceed directly to Phase 2
          handleConfirmedImport(rawJson);
        }
      } catch (e: any) {
        console.error("Import pre-check failed:", e);
        toast.error(`File reading failed: ${e.message}`);
        setImportStatus("finished");
        setProgress(0);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // --- PHASE 2: ATTRIBUTE CREATION AND BATCH INSERTION (Called after confirmation or if no new attributes) ---
  const handleConfirmedImport = async (jsonToProcess: any[] | null = null) => {
    const rawJson = jsonToProcess || rawJsonData;
    if (rawJson.length === 0) return toast.error("No data to import.");

    setIsConfirmationDialogOpen(false); // Close confirmation dialog
    setImportStatus("processing");
    setProgress(5);

    try {
      // 1. Create ALL confirmed new attributes first (Phase 2, Step 1)
      const creationPromises = Object.entries(newAttributesToConfirm).flatMap(([dbTable, newValues]) =>
        newValues.map((value) => createAttribute(dbTable, value)),
      );

      const creationResults = await Promise.all(creationPromises);
      const failedCreations = creationResults.filter((r) => r === null).length;

      if (failedCreations > 0) {
        // This is a rare, severe error if the user confirmed but creation still failed
        setImportStatus("finished");
        return toast.error("CRITICAL: Failed to create some confirmed attributes. Please check RLS policies.");
      }

      // Reset confirmation state as they are now created/checked
      setNewAttributesToConfirm({});
      setProgress(10); // Initial progress after attribute creation

      // 2. Main Validation and Insertion Loop (Phase 2, Step 2)
      const totalRows = rawJson.length;
      let currentErrors: any[] = [];
      const itemsToInsert: Partial<Item>[] = [];

      for (let i = 0; i < totalRows; i++) {
        const rawItem = rawJson[i];
        const rowNumber = i + 1;

        // a. Zod Validation
        const validatedItem = itemSchema.safeParse({
          ...rawItem,
          Price: rawItem.Price ? parseFloat(rawItem.Price) : undefined,
          Cost: rawItem.Cost ? parseFloat(rawItem.Cost) : undefined,
          Tax: rawItem.Tax ? parseFloat(rawItem.Tax) : undefined,
          sku: String(rawItem.SKU || "").trim(),
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

        // b. Attribute Mapping (guaranteed to find IDs now)
        const { attributeIds, error: attributeError } = await ensureAllAttributes(item);

        if (attributeError) {
          currentErrors.push({
            row: rowNumber,
            sku: item.sku,
            errors: [`• database.foreign_key_precheck: ${attributeError}`],
          });
          continue;
        }

        // c. Prepare Final Insert Object (Using the corrected price/cost/tax keys)
        const finalInsert: Partial<Item> = {
          sku: item.sku,
          name: item.name,
          item_number: item["Item Number"],
          pos_description: item["Pos Description"],
          retail_price: item.Price, // Maps CSV Price
          unit_cost: item.Cost, // Maps CSV Cost
          tax: item.Tax, // Maps CSV Tax
          color_id_code: item["Color Id"],
          item_color_code: item["Item Color Code"],
          theme: item.Theme,
          ...attributeIds,
        };

        itemsToInsert.push(finalInsert);

        if ((i + 1) % 10 === 0 || i === totalRows - 1) {
          setProgress(10 + Math.round(((i + 1) / totalRows) * 90)); // Progress from 10% to 100%
        }
      }

      // 3. Batch Insertion
      if (itemsToInsert.length > 0 && dataType === "full_stock") {
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert(itemsToInsert as any)
          .select("sku");

        if (insertError) {
          console.error("Batch Insert Error:", insertError);
          currentErrors.push({
            row: "Batch",
            sku: "N/A",
            errors: [`• database.batch_insert_failed: ${insertError.message}`],
          });
        }
      }

      // 4. Final Report
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
      toast.error(`Import failed during processing: ${e.message}`);
      setImportStatus("finished");
    }
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
            <Button
              onClick={handleImport}
              disabled={!file || importStatus === "processing" || isConfirmationDialogOpen}
            >
              {importStatus === "processing" ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Start Import Check
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- NEW ATTRIBUTE CONFIRMATION DIALOG --- */}
      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" /> Confirm New Attributes
            </DialogTitle>
            <DialogDescription>
              Your file contains new attribute values that don't exist in the database. Please review the list below. Do
              you want to add them and continue the inventory import?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto mt-4 border rounded-lg p-4 bg-muted/50">
            {Object.entries(newAttributesToConfirm).map(([dbTable, newValues]) => (
              <div key={dbTable} className="mb-4">
                <h4 className="font-semibold capitalize text-sm mb-1">
                  {dbTable.replace(/s$/, "").replace(/_/g, " ")}s ({newValues.length} new):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {newValues.map((value, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmationDialogOpen(false);
                setNewAttributesToConfirm({});
                setImportStatus("idle");
                toast.info("Import aborted by user. New attributes were not created.");
              }}
            >
              Cancel Import
            </Button>
            <Button onClick={() => handleConfirmedImport(null)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Yes, Add & Continue Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EXISTING DUPLICATE DIALOG --- */}
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
