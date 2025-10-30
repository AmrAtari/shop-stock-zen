import { useState, useMemo, useCallback } from "react";
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
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Item, DuplicateComparison } from "@/types/database";
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

// Validation schema for item data
const itemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50),
  name: z.string().trim().min(1, "Name is required"),
  pos_description: z.string().trim().optional(),
  item_number: z.string().trim().optional(),
  supplier: z.string().trim().min(1, "Supplier is required"),
  gender: z.string().trim().optional(),
  main_group: z.string().trim().min(1, "Main Group is required"),
  category: z.string().trim().min(1, "Category is required"),
  origin: z.string().trim().optional(),
  season: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  color_id: z.string().trim().optional(),
  item_color_code: z.string().trim().optional(),
  color_id_code: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  price: z.number().min(0, "Price must be non-negative"),
  cost: z.number().min(0, "Cost must be non-negative"),
  tax: z.number().min(0, "Tax rate must be non-negative"),
});

type ImportData = z.infer<typeof itemSchema>;

// Defines which file headers map to which database tables for attribute creation
const ATTRIBUTE_COLUMNS = [
  { header: "Supplier", table: "suppliers", column: "name" },
  { header: "Gender", table: "genders", column: "name" },
  { header: "Main Group", table: "main_groups", column: "name" },
  { header: "Category", table: "categories", column: "name" },
  { header: "Origin", table: "origins", column: "name" },
  { header: "Season", table: "seasons", column: "name" },
  { header: "Size", table: "sizes", column: "name" },
  { header: "Color", table: "colors", column: "name" },
  { header: "Theme", table: "themes", column: "name" },
] as const;

type AttributeToConfirm = {
  column: (typeof ATTRIBUTE_COLUMNS)[number]["header"];
  value: string;
};

const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>("full"); // 'full' or 'quantity_only'
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    failed: number;
    duplicates: number;
  } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [duplicateErrors, setDuplicateErrors] = useState<DuplicateComparison[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // New state for two-phase import confirmation
  const [newAttributesToConfirm, setNewAttributesToConfirm] = useState<AttributeToConfirm[]>([]);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [dataToProcess, setDataToProcess] = useState<ImportData[]>([]);

  const resetState = () => {
    setFile(null);
    setIsLoading(false);
    setProgress(0);
    setImportResults(null);
    setErrorDetails([]);
    setDuplicateErrors([]);
    setNewAttributesToConfirm([]);
    setIsConfirmationDialogOpen(false);
    setDataToProcess([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let json: any[] = [];

          if (file.name.endsWith(".csv")) {
            Papa.parse(data as string, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                // PapaParse sometimes returns empty objects, filter them out
                json = results.data.filter((d) => Object.values(d).some((v) => v !== null && v !== ""));
                resolve(json);
              },
              error: (error) => {
                reject(error.message);
              },
            });
          } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            resolve(json);
          } else {
            reject("Unsupported file type. Please use CSV, XLSX, or XLS.");
          }
        } catch (error: any) {
          reject(error.message || "Failed to parse file.");
        }
      };

      reader.onerror = () => reject("Error reading file.");
      reader.readAsBinaryString(file);
    });
  };

  const checkAttributeExistence = useCallback(
    async (table: string, column: string, value: string): Promise<boolean> => {
      if (!value || value === "") return true; // Skip check for empty values
      // Normalization: Trim whitespace and convert to uppercase for case-insensitive matching
      const normalizedValue = value.trim().toUpperCase();

      const { count, error } = await supabase
        .from(table)
        .select(column, { count: "exact", head: true })
        .ilike(column, normalizedValue); // Use ilike for case-insensitive match (database permitting)

      if (error) {
        console.error(`Error checking attribute existence in ${table}:`, error);
        return false; // Treat as existing if there's a database error to avoid creating duplicates on error
      }

      return (count || 0) > 0;
    },
    [],
  );

  const createAttribute = useCallback(
    async (table: string, column: string, value: string): Promise<string | null> => {
      const normalizedValue = value.trim().toUpperCase();

      // Check again to prevent race condition if another user/import just created it
      const exists = await checkAttributeExistence(table, column, normalizedValue);
      if (exists) {
        // Fetch the ID if it was just created
        const { data, error } = await supabase.from(table).select("id").ilike(column, normalizedValue).maybeSingle();
        return data ? data.id : null;
      }

      const { data, error } = await supabase
        .from(table)
        .insert({ [column]: normalizedValue })
        .select("id")
        .single();

      if (error) {
        console.error(`Error creating attribute in ${table}:`, error);
        return null;
      }
      return data.id;
    },
    [checkAttributeExistence],
  );

  const preCheckAttributes = useCallback(
    async (parsedData: any[]) => {
      const requiredAttributes: AttributeToConfirm[] = [];
      const uniqueAttributes = new Map<string, Set<string>>();

      // 1. Collect all unique attribute values that need checking
      for (const item of parsedData) {
        for (const attr of ATTRIBUTE_COLUMNS) {
          const fileHeader = attr.header;
          const dbTable = attr.table;
          const value = item[fileHeader];

          if (value) {
            const normalizedValue = String(value).trim().toUpperCase();
            const key = `${dbTable}:${normalizedValue}`;

            if (!uniqueAttributes.has(key)) {
              uniqueAttributes.set(key, new Set([normalizedValue]));
            }
          }
        }
      }

      // 2. Check existence for unique values
      for (const [key, values] of uniqueAttributes.entries()) {
        const [table, normalizedValue] = key.split(":");
        const attrConfig = ATTRIBUTE_COLUMNS.find((a) => a.table === table);

        if (attrConfig) {
          const exists = await checkAttributeExistence(table, attrConfig.column, normalizedValue);

          if (!exists) {
            // If it doesn't exist, queue it for confirmation
            requiredAttributes.push({ column: attrConfig.header, value: normalizedValue });
          }
        }
        setProgress((prev) => Math.min(prev + 1, 99));
      }

      return requiredAttributes;
    },
    [checkAttributeExistence],
  );

  const processImportData = useCallback(
    async (data: ImportData[]) => {
      setIsLoading(true);
      setProgress(0);
      setErrorDetails([]);
      setDuplicateErrors([]);

      let successfulRows = 0;
      let failedRows = 0;
      let duplicateRows = 0;

      const skuMap = new Map<string, string>(); // To store existing SKUs and their IDs
      const attributeCache = new Map<string, string>(); // To cache created attribute IDs

      // 1. Fetch all existing SKUs to quickly check for duplicates
      const { data: existingItems, error: fetchError } = await supabase
        .from("items")
        .select("id, sku")
        .in(
          "sku",
          data.map((d) => d.sku),
        );

      if (fetchError) {
        toast.error("Failed to fetch existing items: " + fetchError.message);
        setIsLoading(false);
        return;
      }

      existingItems?.forEach((item) => skuMap.set(item.sku, item.id));

      // 2. Process Data Batch
      const itemsToInsert: Partial<Item>[] = [];
      const itemsToUpdate: { id: string; update: Partial<Item> }[] = [];

      for (let i = 0; i < data.length; i++) {
        const validatedData = data[i];
        const existingId = skuMap.get(validatedData.sku);
        const rowNum = i + 1;
        const progressValue = Math.floor((i / data.length) * 100);
        setProgress(progressValue);

        try {
          if (existingId && importType === "full") {
            // Full import, but item exists -> treat as duplicate/update
            duplicateRows++;
            const newRow: DuplicateComparison = {
              id: crypto.randomUUID(), // Temp ID
              import_log_id: "temp",
              sku: validatedData.sku,
              existing_data: existingItems?.find((item) => item.sku === validatedData.sku),
              new_data: validatedData,
              differences: "Data conflicts. Use update or resolve manually.",
              resolution: null,
              resolved_at: null,
              created_at: new Date().toISOString(),
            };
            setDuplicateErrors((prev) => [...prev, newRow]);
            failedRows++;
            continue;
          }

          if (existingId && importType === "quantity_only") {
            itemsToUpdate.push({
              id: existingId,
              update: {
                quantity: validatedData.quantity,
                updated_at: new Date().toISOString(),
              },
            });
            successfulRows++;
            continue;
          }

          if (existingId && importType === "new_only") {
            duplicateRows++;
            failedRows++;
            continue;
          }

          // --- FULL INSERT LOGIC ---
          if (!existingId && importType !== "quantity_only") {
            const itemToInsert: Partial<Item> = {
              sku: validatedData.sku,
              name: validatedData.name,
              pos_description: validatedData.pos_description || null,
              item_number: validatedData.item_number || null,
              // Use the standard field names from the Item type
              price: validatedData.price,
              cost: validatedData.cost,
              tax: validatedData.tax,
              quantity: validatedData.quantity,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };

            // Resolve Attributes (Gender, Supplier, Category, etc.)
            for (const attr of ATTRIBUTE_COLUMNS) {
              const fileHeader = attr.header;
              const dbTable = attr.table;
              const dbColumn = attr.column;
              const value = validatedData[dbColumn as keyof ImportData] as string; // Access value by DB column name

              if (value) {
                const normalizedValue = value.trim().toUpperCase();
                const cacheKey = `${dbTable}:${normalizedValue}`;

                let id = attributeCache.get(cacheKey);

                // If ID not in cache, create it (we already confirmed new ones are allowed)
                if (!id) {
                  const resultId = await createAttribute(dbTable, dbColumn, normalizedValue);
                  if (resultId) {
                    id = resultId;
                    attributeCache.set(cacheKey, resultId);
                  } else {
                    throw new Error(`Failed to create attribute: ${dbTable} - ${normalizedValue}`);
                  }
                }

                // Map the attribute ID back to the item
                // Note: The item table uses item_number, supplier, category, brand, etc.
                // This is a mapping assumption based on common inventory schemas.
                // Assuming your Item table fields match the attribute headers (e.g., item.supplier for supplier table name)
                if (dbTable === "suppliers") itemToInsert.supplier = id;
                else if (dbTable === "categories") itemToInsert.category = id;
                else if (dbTable === "origins") itemToInsert.origin = id;
                else if (dbTable === "main_groups") itemToInsert.main_group = id;
                else if (dbTable === "genders") itemToInsert.gender = id;
                else if (dbTable === "seasons") itemToInsert.season = id;
                else if (dbTable === "sizes") itemToInsert.size = id;
                else if (dbTable === "colors") itemToInsert.color = id;
                else if (dbTable === "themes") itemToInsert.theme = id;
                // Add other mappings as needed...
              }
            }

            itemsToInsert.push(itemToInsert);
            successfulRows++;
          }
        } catch (e: any) {
          failedRows++;
          setErrorDetails((prev) => [...prev, `Row ${rowNum} (SKU: ${validatedData.sku}): ${e.message}`]);
        }
      }

      // 3. Perform Batched Insertion
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("items").insert(itemsToInsert);

        if (insertError) {
          toast.error("Batch Insertion Failed. Some items might have been inserted.");
          console.error("Batch Insert Error:", insertError);
          failedRows += itemsToInsert.length;
          successfulRows -= itemsToInsert.length;
        }
      }

      // 4. Perform Batched Update (Quantity Only)
      if (itemsToUpdate.length > 0) {
        const updatePromises = itemsToUpdate.map(async ({ id, update }) => {
          return supabase.from("items").update(update).eq("id", id);
        });

        const updateResults = await Promise.allSettled(updatePromises);
        updateResults.forEach((result) => {
          if (result.status === "rejected" || (result.status === "fulfilled" && result.value.error)) {
            failedRows++;
            successfulRows--;
            // Log specific update error if needed
          }
        });
      }

      // 5. Finalize
      setProgress(100);
      setIsLoading(false);
      setImportResults({
        total: data.length,
        success: successfulRows,
        failed: failedRows,
        duplicates: duplicateRows,
      });
      onImportComplete();
      invalidateInventoryData(queryClient);

      if (errorDetails.length > 0 || duplicateErrors.length > 0) {
        toast.warning(`Import completed with ${errorDetails.length + duplicateErrors.length} errors/duplicates.`);
      } else {
        toast.success("Inventory imported successfully!");
      }
    },
    [importType, onImportComplete, queryClient, createAttribute],
  );

  const handleDataProcessingFlow = async (parsedData: any[]) => {
    resetState();
    setIsLoading(true);

    try {
      if (parsedData.length === 0) {
        throw new Error("File is empty or could not be parsed.");
      }

      // 1. Validation
      const validatedData: ImportData[] = [];
      const validationErrors: string[] = [];

      parsedData.forEach((row, index) => {
        const rowNum = index + 1;
        const result = itemSchema.safeParse(row);

        if (result.success) {
          validatedData.push(result.data);
        } else {
          validationErrors.push(
            `Row ${rowNum}: ${result.error.issues.map((i) => i.path.join(".") + ": " + i.message).join(", ")}`,
          );
        }
      });

      if (validationErrors.length > 0) {
        setErrorDetails(validationErrors);
        throw new Error(`Data failed validation: ${validationErrors.length} rows have errors.`);
      }

      // 2. Pre-Check for New Attributes
      const newAttributes = await preCheckAttributes(parsedData);

      if (newAttributes.length > 0) {
        setNewAttributesToConfirm(newAttributes);
        setDataToProcess(validatedData);
        setIsConfirmationDialogOpen(true);
        setIsLoading(false); // Pause loading for user confirmation
        return;
      }

      // 3. If no new attributes, proceed directly to insertion
      await processImportData(validatedData);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred during data processing.");
      setIsLoading(false);
    }
  };

  const handleFileImport = async () => {
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }
    try {
      const parsed = await parseFile(file);
      await handleDataProcessingFlow(parsed);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred during file parsing.");
      setIsLoading(false);
    }
  };

  /**
   * New function to handle data imported directly from Google Sheets
   * @param parsedData Array of objects fetched from the Google Sheet
   */
  const handleGoogleSheetsImport = async (parsedData: any[]) => {
    await handleDataProcessingFlow(parsedData);
  };

  const handleConfirmNewAttributes = async (accept: boolean) => {
    setIsConfirmationDialogOpen(false);
    if (accept) {
      // Create new attributes first
      setIsLoading(true);
      const tempCache = new Map<string, string>();
      let attributeCreationError = false;

      for (const attr of newAttributesToConfirm) {
        const attrConfig = ATTRIBUTE_COLUMNS.find((a) => a.header === attr.column);
        if (attrConfig) {
          const id = await createAttribute(attrConfig.table, attrConfig.column, attr.value);
          if (!id) {
            attributeCreationError = true;
            setErrorDetails((prev) => [...prev, `Failed to create required attribute: ${attr.column} - ${attr.value}`]);
          } else {
            tempCache.set(`${attrConfig.table}:${attr.value}`, id);
          }
        }
      }

      if (attributeCreationError) {
        toast.error("Stopped import due to critical attribute creation failures.");
        setIsLoading(false);
        return;
      }

      // Proceed with import using dataToProcess
      await processImportData(dataToProcess);
    } else {
      toast.info("Import canceled by user.");
      resetState();
    }
  };

  const exportDuplicateLog = () => {
    if (duplicateErrors.length === 0) {
      toast.error("No duplicate data to export.");
      return;
    }

    const data = duplicateErrors.map((e) => ({
      SKU: e.sku,
      Resolution: e.resolution || "Pending Manual Review",
      "Existing Data (JSON)": JSON.stringify(e.existing_data),
      "New Data (JSON)": JSON.stringify(e.new_data),
      Differences: e.differences,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duplicate Log");
    XLSX.writeFile(workbook, `import_duplicate_log_${new Date().toISOString()}.xlsx`);
  };

  const isUploadDisabled = isLoading || !file;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Inventory Data</DialogTitle>
            <DialogDescription>
              Import items from a CSV or Excel file. Data must match the required columns (SKU, Name, Price, Cost,
              Quantity, etc.).
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importType} onValueChange={setImportType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full">Full Item Import</TabsTrigger>
              <TabsTrigger value="quantity_only">Quantity Update Only</TabsTrigger>
            </TabsList>
            <TabsContent value="full">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Full Import Rules</AlertTitle>
                <AlertDescription>
                  This mode creates new items. Existing SKUs are treated as duplicates and will be flagged for review
                  (no data is overwritten).
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="quantity_only">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Quantity Update Rules</AlertTitle>
                <AlertDescription>
                  This mode only updates the **Quantity** of existing items based on **SKU**. New items are ignored.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <div className="grid w-full items-center gap-1.5 mt-4">
            <Label htmlFor="inventory-file">Select File (CSV/XLSX)</Label>
            <Input id="inventory-file" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
          </div>

          {/* FIX: Passing required props to resolve TS2739 error */}
          <GoogleSheetsInput
            onImport={handleGoogleSheetsImport}
            isProcessing={isLoading}
            setIsProcessing={setIsLoading}
          />

          {file && (
            <div className="text-sm text-muted-foreground mt-2">
              Selected: <span className="font-medium text-primary">{file.name}</span>
              <span className="ml-4">
                <Button variant="link" size="sm" onClick={() => setFile(null)} className="h-4 p-0 text-red-500">
                  (Clear)
                </Button>
              </span>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Processing File...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {importResults && (
            <div className="mt-4 p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">Import Summary</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Total Rows</span>
                  <span className="font-medium">{importResults.total}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Success</span>
                  <span className="font-medium text-green-600">{importResults.success}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Failed</span>
                  <span className="font-medium text-red-600">{importResults.failed}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Duplicates</span>
                  <span className="font-medium text-amber-600">{importResults.duplicates}</span>
                </div>
              </div>
            </div>
          )}

          {errorDetails.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Validation & Insertion Errors ({errorDetails.length})</AlertTitle>
              <AlertDescription className="max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside space-y-1">
                  {errorDetails.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {errorDetails.length > 5 && <li>... and {errorDetails.length - 5} more errors.</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Close
            </Button>
            <Button onClick={handleFileImport} disabled={isUploadDisabled}>
              <Upload className="w-4 h-4 mr-2" />
              {isLoading ? "Importing..." : "Start Import"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDuplicateDialogOpen(true)}
              disabled={duplicateErrors.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Review Duplicates ({duplicateErrors.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ATTRIBUTE CONFIRMATION DIALOG --- */}
      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm New Attributes</DialogTitle>
            <DialogDescription>
              The import file contains new values for attributes that don't exist in your database. Do you want to
              create them now?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto p-4 border rounded-lg space-y-2">
            {newAttributesToConfirm.map((attr, index) => (
              <div key={index} className="flex justify-between items-center text-sm border-b pb-1">
                <span className="font-semibold text-primary">{attr.column}:</span>
                <span className="font-mono text-xs bg-muted p-1 rounded-sm">{attr.value}</span>
              </div>
            ))}
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Creating these attributes will make them available globally for all future items. Ensure they are
              correctly spelled.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmNewAttributes(false)}>
              Cancel Import
            </Button>
            <Button onClick={() => handleConfirmNewAttributes(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Create & Continue Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DUPLICATE REVIEW DIALOG --- */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Duplicate Items Found ({duplicateErrors.length})</DialogTitle>
            <DialogDescription>
              These SKUs already exist in the database. Review the differences below or export the full log for manual
              resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-4">
            <div className="border rounded-lg">
              <div className="p-4 space-y-3">
                {duplicateErrors.slice(0, 15).map((item) => (
                  <div key={item.sku} className="p-2 border rounded-md bg-white">
                    <p className="font-semibold text-sm">SKU: {item.sku}</p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">Duplicate</span>
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
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Export the error log to see all duplicate items and their differences</li>
              <li>Review if the existing data needs to be updated manually</li>
              <li>Remove duplicate rows from your import file and try again</li>
              <li>Use the "Quantity Update Only" import type if you only need to update quantities</li>
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
