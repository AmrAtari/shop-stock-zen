import { useState, useCallback } from "react";
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
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";
import { Progress } from "@/components/ui/progress";
import { Item, DuplicateComparison } from "@/types/database";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// --- Header Mapping ---
const HEADER_MAP: { [key: string]: keyof ImportData | undefined } = {
  SKU: "sku",
  Name: "name",
  "Pos Description": "pos_description",
  "POS Description": "pos_description",
  "Item Number": "item_number",
  Supplier: "supplier",
  Gender: "gender",
  "Main Group": "main_group",
  Category: "category",
  Origin: "origin",
  Season: "season",
  Size: "size",
  Color: "color",
  "Color Id": "color_id",
  ColorID: "color_id",
  "Item Color Code": "item_color_code",
  "Color Id Code": "color_id_code",
  ColorIDCode: "color_id_code",
  Theme: "theme",
  Quantity: "quantity",
  Price: "price",
  Cost: "cost",
  Tax: "tax",
};

// --- Zod validation schema ---
const itemSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  pos_description: z.string().trim().optional(),
  item_number: z.string().trim().optional(),
  supplier: z.string().trim().min(1),
  gender: z.string().trim().optional(),
  main_group: z.string().trim().min(1),
  category: z.string().trim().min(1),
  origin: z.string().trim().optional(),
  season: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  color_id: z.string().trim().optional(),
  item_color_code: z.string().trim().optional(),
  color_id_code: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  quantity: z.number().min(0).optional(),
  price: z.number().min(0),
  cost: z.number().min(0),
  tax: z.number().min(0).optional(),
});

type ImportData = z.infer<typeof itemSchema>;

// Attribute columns mapping
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

// --- Helper: Transform row ---
const transformDataRow = (row: any): Partial<ImportData> => {
  const newRow: Partial<ImportData> = {};
  for (const key in row) {
    const targetKey = HEADER_MAP[key.trim()];
    if (targetKey) {
      let value = row[key];
      if (["quantity", "price", "cost", "tax"].includes(targetKey)) {
        const num = parseFloat(String(value).trim());
        (newRow as any)[targetKey] = isNaN(num) ? 0 : num;
      } else {
        (newRow as any)[targetKey] = value === null || value === undefined ? "" : String(value);
      }
    }
  }
  return newRow;
};

// --- FileImport Component ---
export const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("full");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
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
              transformHeader: (h) => h.trim(),
              complete: (results) => {
                json = results.data.filter((d) => Object.values(d).some((v) => v !== null && v !== ""));
                resolve(json);
              },
              error: (err) => reject(err.message),
            });
          } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            resolve(json);
          } else reject("Unsupported file type. Use CSV/XLSX.");
        } catch (err: any) {
          reject(err.message || "Failed to parse file.");
        }
      };
      reader.onerror = () => reject("File read error.");
      reader.readAsBinaryString(file);
    });
  };

  const checkAttributeExistence = useCallback(async (table: string, column: string, value: string) => {
    if (!value) return true;
    const normalized = value.trim();
    const { count, error } = await supabase
      .from(table)
      .select(column, { count: "exact", head: true })
      .ilike(column, normalized);
    if (error) return false;
    return (count || 0) > 0;
  }, []);

  const createAttribute = useCallback(
    async (table: string, column: string, value: string) => {
      const normalized = value.trim();
      const exists = await checkAttributeExistence(table, column, normalized);
      if (exists) {
        const { data, error } = await supabase.from(table).select("id").ilike(column, normalized).limit(1).single();
        if (error) throw new Error(error.message);
        return data?.id ?? null;
      }
      const { data, error } = await supabase
        .from(table)
        .insert({ [column]: normalized })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data?.id ?? null;
    },
    [checkAttributeExistence],
  );

  // ---------- Remaining logic: handleDataProcessingFlow, processImportData, handleConfirmNewAttributes ----------
  // This part will include:
  // - Duplicate checking
  // - Validation
  // - Attribute pre-check
  // - Batched insert/update
  // - Progress updates
  // - Google Sheets import
  // - Dialogs for duplicates & new attributes

  // For brevity, I can continue and give the **complete component with all improvements** next
};

const handleConfirmNewAttributes = async () => {
  if (newAttributesToConfirm.length === 0) return;

  try {
    setIsLoading(true);
    for (const attr of newAttributesToConfirm) {
      const mapping = ATTRIBUTE_COLUMNS.find((c) => c.header === attr.column);
      if (!mapping) continue;
      await createAttribute(mapping.table, mapping.column, attr.value);
    }
    setIsConfirmationDialogOpen(false);
    processImportData(dataToProcess); // continue import after confirmation
  } catch (err: any) {
    toast.error(`Error creating attributes: ${err.message}`);
    setIsLoading(false);
  }
};

// --- Duplicate check helper ---
const detectDuplicates = async (rows: ImportData[]) => {
  const duplicates: DuplicateComparison[] = [];
  for (const row of rows) {
    const { data } = await supabase.from("store_inventory").select("id, sku, name").eq("sku", row.sku).single();

    if (data) duplicates.push({ existing: data, newRow: row });
  }
  return duplicates;
};

// --- Process import data ---
const processImportData = async (rows: ImportData[]) => {
  if (rows.length === 0) return;

  setIsLoading(true);
  setProgress(0);
  const total = rows.length;
  let success = 0;
  let failed = 0;
  let duplicates = 0;

  const newAttrs: AttributeToConfirm[] = [];

  // Step 1: Validate & attribute check
  const validatedRows: ImportData[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = itemSchema.safeParse(row);
    if (!parsed.success) {
      failed++;
      setErrorDetails((prev) => [...prev, `Row ${i + 1} failed validation.`]);
      continue;
    }

    // Check if any attribute value is new
    for (const attrCol of ATTRIBUTE_COLUMNS) {
      const value = (row as any)[attrCol.column];
      if (value) {
        const exists = await checkAttributeExistence(attrCol.table, attrCol.column, value);
        if (!exists) newAttrs.push({ column: attrCol.header, value });
      }
    }
    validatedRows.push(parsed.data);
    setProgress(Math.floor(((i + 1) / total) * 50));
  }

  if (newAttrs.length > 0) {
    setNewAttributesToConfirm(newAttrs);
    setDataToProcess(validatedRows);
    setIsConfirmationDialogOpen(true);
    setIsLoading(false);
    return; // wait for confirmation
  }

  // Step 2: Duplicate check
  const dups = await detectDuplicates(validatedRows);
  duplicates = dups.length;

  // Step 3: Insert/Update rows
  for (let i = 0; i < validatedRows.length; i++) {
    const row = validatedRows[i];
    try {
      const duplicate = dups.find((d) => d.newRow.sku === row.sku);
      if (duplicate) {
        // Update quantity if importType === "quantity"
        if (importType === "quantity") {
          await supabase
            .from("store_inventory")
            .update({ quantity: duplicate.existing.quantity + (row.quantity || 0) })
            .eq("id", duplicate.existing.id);
        } else {
          await supabase.from("store_inventory").update(row).eq("id", duplicate.existing.id);
        }
      } else {
        await supabase.from("store_inventory").insert(row);
      }
      success++;
    } catch (err) {
      failed++;
      setErrorDetails((prev) => [...prev, `Row ${i + 1} failed: ${(err as any).message}`]);
    }
    setProgress(50 + Math.floor(((i + 1) / total) * 50));
  }

  setImportResults({ total: total, success, failed, duplicates });
  setIsLoading(false);
  queryClient.invalidateQueries([queryKeys.INVENTORY]);
  onImportComplete();
};

// --- Handle file import ---
const handleImport = async () => {
  if (!file) return toast.error("Select a file first.");
  try {
    setIsLoading(true);
    const parsedRows = await parseFile(file);
    processImportData(parsedRows as ImportData[]);
  } catch (err: any) {
    toast.error(`File parsing failed: ${err}`);
    setIsLoading(false);
  }
};
