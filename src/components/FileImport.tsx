// File: src/components/FileImport.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { z } from "zod";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export interface ImportData {
  sku: string;
  name: string;
  supplier: string;
  main_group: string;
  category: string;
  price: number;
  cost: number;
  quantity?: number;
}

const itemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  supplier: z.string().min(1),
  main_group: z.string().min(1),
  category: z.string().min(1),
  price: z.number().min(0),
  cost: z.number().min(0),
  quantity: z.number().min(0).optional(),
});

const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const parseFile = (file: File) =>
    new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) return reject("Empty file");
        try {
          if (file.name.endsWith(".csv")) {
            Papa.parse(data as string, { header: true, complete: (res) => resolve(res.data) });
          } else {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(sheet));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsBinaryString(file);
    });

  const handleImport = async () => {
    if (!file) return toast.error("Select a file");
    setIsLoading(true);
    try {
      const rows = await parseFile(file);
      const validRows = [];
      for (const r of rows) {
        const parsed = itemSchema.safeParse(r);
        if (parsed.success) validRows.push(parsed.data);
      }

      // --- Check duplicates in Supabase ---
      const skus = validRows.map((r) => r.sku);
      const { data: existing } = await supabase.from("store_inventory").select("sku").in("sku", skus);

      const newRows = validRows.filter((r) => !existing?.some((e) => e.sku === r.sku));

      // --- Insert new rows ---
      if (newRows.length > 0) {
        const { error } = await supabase.from("store_inventory").insert(newRows);
        if (error) throw error;
      }

      toast.success(`${newRows.length} items imported successfully!`);
      onImportComplete();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Inventory</DialogTitle>
        </DialogHeader>
        <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
        <Button className="mt-2" onClick={handleImport} disabled={isLoading || !file}>
          {isLoading ? "Importing..." : "Start Import"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default FileImport;
