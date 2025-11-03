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
import { toast } from "sonner"; // Make sure 'sonner' is installed
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";
import { Progress } from "@/components/ui/progress";

// --- Types ---
interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface AttributeToConfirm {
  column: string;
  value: string;
}

export interface ImportData {
  sku: string;
  name: string;
  pos_description?: string;
  item_number?: string;
  supplier: string;
  gender?: string;
  main_group: string;
  category: string;
  origin?: string;
  season?: string;
  size?: string;
  color?: string;
  color_id?: string;
  item_color_code?: string;
  color_id_code?: string;
  theme?: string;
  quantity?: number;
  price: number;
  cost: number;
  tax?: number;
}

// --- HEADER MAP ---
const HEADER_MAP: { [key: string]: keyof ImportData } = {
  SKU: "sku",
  Name: "name",
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

// --- ATTRIBUTE COLUMNS ---
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

// --- Zod Schema ---
const itemSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  pos_description: z.string().optional(),
  item_number: z.string().optional(),
  supplier: z.string().trim().min(1),
  gender: z.string().optional(),
  main_group: z.string().trim().min(1),
  category: z.string().trim().min(1),
  origin: z.string().optional(),
  season: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  color_id: z.string().optional(),
  item_color_code: z.string().optional(),
  color_id_code: z.string().optional(),
  theme: z.string().optional(),
  quantity: z.number().min(0).optional(),
  price: z.number().min(0),
  cost: z.number().min(0),
  tax: z.number().min(0).optional(),
});

// --- Utility: Transform row ---
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

// --- FileImport Component ---
const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"full" | "quantity_only">("full");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newAttributesToConfirm, setNewAttributesToConfirm] = useState<AttributeToConfirm[]>([]);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [dataToProcess, setDataToProcess] = useState<ImportData[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const parseFile = (file: File) =>
    new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (file.name.endsWith(".csv")) {
            Papa.parse(data as string, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results.data),
              error: (err) => reject(err),
            });
          } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            resolve(XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]));
          } else reject("Unsupported file type.");
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject("File read error");
      reader.readAsBinaryString(file);
    });

  const handleFileImport = async () => {
    if (!file) return toast.error("Please select a file");
    setIsLoading(true);
    try {
      const parsed = await parseFile(file);
      const transformed = parsed.map(transformDataRow);
      setDataToProcess(transformed as ImportData[]);
      setIsLoading(false);
      toast.success("File parsed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Parsing failed");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Inventory</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Label>Select File</Label>
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
          {file && <p>Selected: {file.name}</p>}
          <Button className="mt-2" onClick={handleFileImport} disabled={isLoading || !file}>
            <Upload className="w-4 h-4 mr-2" /> Start Import
          </Button>
        </div>

        {isLoading && <Progress value={progress} className="mt-2" />}
      </DialogContent>
    </Dialog>
  );
};

export default FileImport;
