import React, { useState, FC } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// --- Types ---
interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportData {
  sku: string;
  name: string;
  quantity: number;
  [key: string]: any;
}

interface DuplicateComparison {
  existing: ImportData;
  newRow: ImportData;
}

interface AttributeToConfirm {
  column: string;
  value: string;
}

// --- Component ---
const FileImport: FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  // --- States ---
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    failed: number;
    duplicates: number;
  }>({ total: 0, success: 0, failed: 0, duplicates: 0 });
  const [newAttributesToConfirm, setNewAttributesToConfirm] = useState<AttributeToConfirm[]>([]);
  const [dataToProcess, setDataToProcess] = useState<ImportData[]>([]);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const ATTRIBUTE_COLUMNS = [
    { header: "Category", table: "categories", column: "name" },
    { header: "Supplier", table: "suppliers", column: "name" },
  ];

  const importType: "quantity" | "full" = "full"; // set default type

  // --- Helpers ---
  const parseFile = async (file: File): Promise<ImportData[]> => {
    // mock parser, replace with XLSX or CSV parsing
    return [
      { sku: "SKU001", name: "Product 1", quantity: 10 },
      { sku: "SKU002", name: "Product 2", quantity: 5 },
    ];
  };

  const checkAttributeExistence = async (table: string, column: string, value: string) => {
    const { data } = await supabase.from(table).select(column).eq(column, value).single();
    return !!data;
  };

  const createAttribute = async (table: string, column: string, value: string) => {
    await supabase.from(table).insert({ [column]: value });
  };

  const detectDuplicates = async (rows: ImportData[]): Promise<DuplicateComparison[]> => {
    const duplicates: DuplicateComparison[] = [];
    for (const row of rows) {
      const { data } = await supabase.from("store_inventory").select("*").eq("sku", row.sku).single();
      if (data) duplicates.push({ existing: data, newRow: row });
    }
    return duplicates;
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
      processImportData(dataToProcess);
    } catch (err: any) {
      toast.error(`Error creating attributes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processImportData = async (rows: ImportData[]) => {
    setIsLoading(true);
    setProgress(0);

    const total = rows.length;
    let success = 0;
    let failed = 0;
    let duplicatesCount = 0;

    const dups = await detectDuplicates(rows);
    duplicatesCount = dups.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const duplicate = dups.find((d) => d.newRow.sku === row.sku);
        if (duplicate) {
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
      setProgress(Math.floor(((i + 1) / total) * 100));
    }

    setImportResults({ total, success, failed, duplicates: duplicatesCount });
    setIsLoading(false);
    onImportComplete();
  };

  const handleImport = async () => {
    if (!file) return toast.error("Select a file first.");
    try {
      setIsLoading(true);
      const parsedRows = await parseFile(file);
      processImportData(parsedRows);
    } catch (err: any) {
      toast.error(`File parsing failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button onClick={handleImport} disabled={isLoading}>
        {isLoading ? `Processing ${progress}%` : "Import"}
      </Button>

      {isConfirmationDialogOpen && (
        <div>
          <h3>Confirm new attributes</h3>
          <ul>
            {newAttributesToConfirm.map((attr, idx) => (
              <li key={idx}>
                {attr.column}: {attr.value}
              </li>
            ))}
          </ul>
          <Button onClick={handleConfirmNewAttributes}>Confirm</Button>
        </div>
      )}

      <div>
        <p>Progress: {progress}%</p>
        <p>Errors: {errorDetails.join(", ")}</p>
        <p>
          Results - Total: {importResults.total}, Success: {importResults.success}, Failed: {importResults.failed},
          Duplicates: {importResults.duplicates}
        </p>
      </div>
    </div>
  );
};

export default FileImport;
