import React, { useState, useCallback } from "react";
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

type ImportType = "full" | "quantity_only";

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

// --- Zod schema ---
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

// --- Attribute mapping ---
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

// --- Transform row ---
const transformDataRow = (row: any): Partial<ImportData> => {
  const newRow: Partial<ImportData> = {};
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const targetKey = HEADER_MAP[key.trim()];
      let value = row[key];
      if (targetKey) {
        if (["quantity", "price", "cost", "tax"].includes(targetKey)) {
          const numValue = parseFloat(String(value).trim());
          (newRow as any)[targetKey] = isNaN(numValue) || String(value).trim() === "" ? 0 : numValue;
        } else {
          (newRow as any)[targetKey] = value === null || value === undefined ? "" : String(value);
        }
      }
    }
  }
  return newRow;
};

const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("full");
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

  // --- File parsing ---
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
              transformHeader: (header) => header.trim(),
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
          } else {
            reject("Unsupported file type. Use CSV or Excel.");
          }
        } catch (err: any) {
          reject(err.message || "Failed to parse file.");
        }
      };
      reader.onerror = () => reject("Error reading file.");
      reader.readAsBinaryString(file);
    });
  };

  // --- Attribute helpers ---
  const checkAttributeExistence = useCallback(
    async (table: string, column: string, value: string): Promise<boolean> => {
      if (!value) return true;
      const normalizedValue = value.trim();
      const { count, error } = await supabase.from(table).select(column, { count: "exact", head: true }).ilike(column, normalizedValue);
      if (error) {
        console.error(`Error checking ${table}:`, error);
        return false;
      }
      return (count || 0) > 0;
    },
    []
  );

  const createAttribute = useCallback(
    async (table: string, column: string, value: string): Promise<string | null> => {
      const normalizedValue = value.trim();
      const exists = await checkAttributeExistence(table, column, normalizedValue);
      if (exists) {
        const { data, error } = await supabase.from(table).select("id").ilike(column, normalizedValue).limit(1).single();
        if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
        return data?.id || null;
      }
      const { data, error } = await supabase.from(table).insert({ [column]: normalizedValue }).select("id").single();
      if (error) throw new Error(`Supabase error creating ${table}: ${error.message}`);
      return data?.id || null;
    },
    [checkAttributeExistence]
  );

  // --- Handle import ---
  const handleFileImport = async () => {
    if (!file) return toast.error("Select a file first.");
    try {
      setIsLoading(true);
      const parsed = await parseFile(file);
      const transformed = parsed.map(transformDataRow);
      setDataToProcess(transformed);

      // Check missing attributes
      const missingAttributes: AttributeToConfirm[] = [];
      for (const row of transformed) {
        for (const attr of ATTRIBUTE_COLUMNS) {
          const value = row[HEADER_MAP[attr.header] as keyof ImportData];
          if (value && typeof value === "string") {
            const exists = await checkAttributeExistence(attr.table, attr.column, value);
            if (!exists) missingAttributes.push({ column: attr.header, value }));
          }
        }
      }

      if (missingAttributes.length > 0) {
        setNewAttributesToConfirm(missingAttributes);
        setIsConfirmationDialogOpen(true);
        return;
      }

      await processData(transformed);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Import failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const processData = async (data: ImportData[]) => {
    try {
      const total = data.length;
      let success = 0;
      let failed = 0;
      let duplicates: DuplicateComparison[] = [];

      for (let i = 0; i < data.length; i++) {
        setProgress(Math.round((i / total) * 100));
        const row = data[i];

        // Duplicate check
        const { data: existing, error } = await supabase
          .from<Item>("store_inventory")
          .select("*")
          .eq("sku", row.sku)
          .single();
        if (existing) {
          duplicates.push({ newRow: row, existing });
          continue;
        }

        const { error: insertError } = await supabase.from("store_inventory").insert(row);
        if (insertError) {
          failed++;
        } else {
          success++;
        }
      }

      setProgress(100);
      setImportResults({ total, success, failed, duplicates: duplicates.length });
      if (duplicates.length > 0) setDuplicateDialogOpen(true);
      toast.success("Import completed!");
      invalidateInventoryData(queryClient);
      onImportComplete();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error processing data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Inventory</DialogTitle>
          <DialogDescription>Upload Excel or CSV file to import inventory items.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="google">Google Sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <div className="flex flex-col gap-4">
              <Input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
              <Select onValueChange={(value: ImportType) => setImportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select import type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Import</SelectItem>
                  <SelectItem value="quantity_only">Quantity Only</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleFileImport} disabled={isLoading}>
                {isLoading ? "Importing..." : "Start Import"}
              </Button>
              {isLoading && <Progress value={progress} />}
            </div>
          </TabsContent>

          <TabsContent value="google">
            <GoogleSheetsInput
              importType={importType}
              onImportComplete={onImportComplete}
              setIsLoading={setIsLoading}
              setProgress={setProgress}
              setErrorDetails={setErrorDetails}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FileImport;
