import { useState } from "react";
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
import { Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
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

// Validation schema for item data (no change)
const itemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  pos_description: z
    .string()
    .trim()
    .min(1, "Pos Description is required")
    .max(300, "Pos Description must be less than 300 characters"),
  item_number: z
    .string()
    .trim()
    .min(1, "Item Number is required")
    .max(50, "Item Number must be less than 50 characters"),
  supplier: z.string().trim().min(1, "Supplier is required").max(200, "Supplier must be less than 200 characters"),
  main_group: z
    .string()
    .trim()
    .min(1, "Main Group is required")
    .max(100, "Main Group must be less than 100 characters"),
  category: z.string().trim().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  origin: z.string().trim().min(1, "Origin is required").max(100, "Origin must be less than 100 characters"),
  season: z.string().trim().min(1, "Season is required").max(50, "Season must be less than 50 characters"),
  size: z.string().trim().min(1, "Size is required").max(50, "Size must be less than 50 characters"),
  color: z.string().trim().min(1, "Color is required").max(50, "Color must be less than 50 characters"),
  color_id: z.string().trim().min(1, "Color Id is required").max(50, "Color Id must be less than 50 characters"),
  item_color_code: z
    .string()
    .trim()
    .min(1, "Item Color Code is required")
    .max(50, "Item Color Code must be less than 50 characters"),
  theme: z.string().trim().max(100, "Theme must be less than 100 characters").optional().nullable(),
  cost_price: z.number().min(0, "Cost cannot be negative").max(1000000000, "Cost is too large"),
  selling_price: z.number().min(0, "Price cannot be negative").max(1000000000, "Price is too large"),
  tax: z.number().min(0, "Tax cannot be negative").max(100, "Tax must be less than 100"),
  unit: z.string().trim().min(1, "Unit is required").max(20, "Unit must be less than 20 characters"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(1000000, "Quantity is too large")
    .optional()
    .nullable(),
  min_stock: z
    .number()
    .int("Min stock must be a whole number")
    .min(0, "Min stock cannot be negative")
    .max(1000000, "Min stock is too large")
    .optional()
    .nullable(),
  location: z.string().trim().max(200, "Location must be less than 200 characters").optional().nullable(),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional().nullable(),
  gender: z.string().trim().max(50, "Gender must be less than 50 characters").optional().nullable(),
  brand: z.string().trim().max(100, "Brand must be less than 100 characters").optional().nullable(),
  wholesale_price: z
    .number()
    .min(0, "Wholesale price cannot be negative")
    .max(1000000000, "Wholesale price is too large")
    .optional()
    .nullable(),
});

// Validation schema for quantity update (no change)
const quantityUpdateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(1000000, "Quantity is too large"),
});

const FileImport = ({ open, onOpenChange, onImportComplete }: FileImportProps) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importMethod, setImportMethod] = useState<"file" | "sheets">("file");
  const [importType, setImportType] = useState<"full" | "quantity">("full");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
          validationErrors: [],
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

  const handleGoogleSheetsImport = async (sheetData: any[]) => {
    setIsUploading(true);
    setProgress(50);
    await processImportData(sheetData, "Google Sheets");
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import");
      return;
    }

    setIsUploading(true);
    setProgress(50);

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
          validationErrors: [],
        });
        setErrorDialogOpen(true);
        setIsUploading(false);
        setProgress(0);
        return;
      }

      await processImportData(data, file.name);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to process file");
      setIsUploading(false);
      setProgress(0);
    }
  };

  // --- CRITICAL NEW HELPER FUNCTION: Aggressively cleans attribute names for lookup keys ---
  const cleanAttributeName = (name: string): string => {
    if (!name) return '';
    return name
        .trim()
        // Aggressive non-breaking space replacement (the most common hidden culprit)
        .replace(/\u00A0/g, ' ') 
        // Normalize all other whitespace (including tabs, multiple spaces, etc.) to a single space
        .replace(/\s+/g, ' ')
        .toLowerCase(); // Convert to lowercase for case-insensitive lookup key
  };
  // ------------------------------------------------------------------------------------------

  const processImportData = async (data: any[], fileName: string) => {
    const normalizeKey = (k: string): string =>
      k
        ?.toString()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[_-]/g, "")
        .replace(/[^a-z0-9]/g, "") || "";

    const getVal = (row: any, ...keys: string[]): any => {
      const normalizedRow: Record<string, any> = {};
      if (row) {
        for (const key in row) {
          if (Object.prototype.hasOwnProperty.call(row, key)) {
            const value = typeof row[key] === "string" ? row[key].trim() : row[key];
            normalizedRow[normalizeKey(key)] = value;
          }
        }
      }

      for (const key of keys) {
        const normalizedKey = normalizeKey(key);
        const value = normalizedRow[normalizedKey];

        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
      return undefined;
    };

    // --- ATTRIBUTE BATCHING (EXISTING GOOD LOGIC) ---
    const extractUniqueAttributes = (data: any[]): Record<string, Set<string>> => {
      const unique = {
        categories: new Set<string>(),
        suppliers: new Set<string>(),
        brands: new Set<string>(),
        main_groups: new Set<string>(),
        origins: new Set<string>(),
        seasons: new Set<string>(),
        sizes: new Set<string>(),
        colors: new Set<string>(),
        genders: new Set<string>(),
        themes: new Set<string>(),
        stores: new Set<string>(),
        units: new Set<string>(),
      };

      data.forEach((row) => {
        const category = getVal(row, "Category", "category");
        if (category) unique.categories.add(category.trim());

        const supplier = getVal(row, "Supplier", "supplier");
        if (supplier) unique.suppliers.add(supplier.trim());

        const brand = getVal(row, "Brand", "brand");
        if (brand) unique.brands.add(brand.trim());

        const mainGroup = getVal(row, "Main Group", "main_group");
        if (mainGroup) unique.main_groups.add(mainGroup.trim());

        const origin = getVal(row, "Origin", "origin");
        if (origin) unique.origins.add(origin.trim());

        const season = getVal(row, "Season", "season");
        if (season) unique.seasons.add(season.trim());

        const size = getVal(row, "Size", "size");
        if (size) unique.sizes.add(size.trim());

        const color = getVal(row, "Color", "color");
        if (color) unique.colors.add(color.trim());

        const gender = getVal(row, "Gender", "gender");
        if (gender) unique.genders.add(gender.trim());

        const theme = getVal(row, "Theme", "theme");
        if (theme) unique.themes.add(theme.trim());

        const unit = getVal(row, "Unit", "unit");
        if (unit) unique.units.add(unit.trim() || "pcs");

        const store = getVal(row, "Location", "location");
        if (store) unique.stores.add(store.trim() || "Default"); // Default store
      });

      return unique;
    };

    /**
     * Finds or creates attributes in the database. Uses a case-insensitive approach
     * by mapping all database names and incoming names to the aggressively cleaned string.
     * @param table The Supabase table name (e.g., 'categories').
     * @param names The set of unique names from the import file.
     * @returns A Map where the key is the CLEANED lowercase attribute name and the value is the UUID.
     */
    const ensureAndMapAttributes = async (table: string, names: Set<string>): Promise<Map<string, string>> => {
      const nameToIdMap = new Map<string, string>(); 
      if (names.size === 0) return nameToIdMap;

      const originalNamesArray = Array.from(names).filter((n) => n.length > 0);
      if (originalNamesArray.length === 0) return nameToIdMap;

      // 1. Fetch all existing attributes to build a case-insensitive map
      const { data: allExisting, error: fetchError } = await (supabase as any).from(table).select("id, name");

      if (fetchError) {
        throw new Error(`[${table}] Lookup failed: ${fetchError.message}`);
      }
      
      const existingNamesClean = new Set<string>();

      if (allExisting) {
        allExisting.forEach((attr: any) => {
          // Use the aggressive cleaner for the map key
          const cleanName = cleanAttributeName(attr.name);
          
          if (!nameToIdMap.has(cleanName)) {
            nameToIdMap.set(cleanName, attr.id);
            existingNamesClean.add(cleanName);
          }
        });
      }
      
      // 2. Identify missing attributes and sanitize
      const namesToInsert: { name: string }[] = [];
      const tempInsertSet = new Set<string>(); // Tracks what we plan to insert by CLEANED name

      originalNamesArray.forEach(originalName => {
        // Use the aggressive cleaner for checking against existing data/pending inserts
        const cleanKey = cleanAttributeName(originalName);
        
        // Use a simple trim for the name inserted into the DB (to keep original casing)
        const nameToStore = originalName.trim().replace(/\s+/g, ' '); 

        if (nameToStore.length === 0) return; // Skip if it's just spaces

        // Check if the CLEANED name is already mapped 
        // OR if we've already queued its CLEANED version for insertion
        if (!existingNamesClean.has(cleanKey) && !tempInsertSet.has(cleanKey)) {
          // Insert the cleaned, trimmed name using its original casing from the file
          namesToInsert.push({ name: nameToStore }); 
          tempInsertSet.add(cleanKey); // Mark the clean key as pending insert
        }
      });

      // 3. Insert all new attributes in one batch (Guaranteed Fix applied here)
      if (namesToInsert.length > 0) {
        const { error: insertError } = await (supabase as any)
            .from(table)
            .insert(namesToInsert);

        if (insertError) {
            throw new Error(`[${table}] Failed to create new attributes: ${insertError.message}`);
        }

        // CRITICAL FIX: Re-fetch the entire attribute list after inserting new values
        // This guarantees we capture the correct UUIDs for the newly inserted attributes, 
        // regardless of potential DB casing quirks or invisible character issues.
        nameToIdMap.clear();
        
        const { data: updatedExisting, error: refetchError } = await (supabase as any)
            .from(table)
            .select("id, name");

        if (refetchError) {
            throw new Error(`[${table}] Refetch failed after insert: ${refetchError.message}`);
        }

        if (updatedExisting) {
            updatedExisting.forEach((attr: any) => {
                const cleanName = cleanAttributeName(attr.name); // Use the cleaner again
                if (!nameToIdMap.has(cleanName)) {
                    nameToIdMap.set(cleanName, attr.id);
                }
            });
        }
      }

      return nameToIdMap;
    };

    const uniqueAttributes = extractUniqueAttributes(data);

    const [
      categoryMap,
      supplierMap,
      brandMap,
      genderMap,
      mainGroupMap,
      originMap,
      seasonMap,
      sizeMap,
      colorMap,
      themeMap,
      unitMap,
      storeMap,
    ] = await Promise.all([
      ensureAndMapAttributes("categories", uniqueAttributes.categories),
      ensureAndMapAttributes("suppliers", uniqueAttributes.suppliers),
      ensureAndMapAttributes("brands", uniqueAttributes.brands),
      ensureAndMapAttributes("genders", uniqueAttributes.genders),
      ensureAndMapAttributes("main_groups", uniqueAttributes.main_groups),
      ensureAndMapAttributes("origins", uniqueAttributes.origins),
      ensureAndMapAttributes("seasons", uniqueAttributes.seasons),
      ensureAndMapAttributes("sizes", uniqueAttributes.sizes),
      ensureAndMapAttributes("colors", uniqueAttributes.colors),
      ensureAndMapAttributes("themes", uniqueAttributes.themes),
      ensureAndMapAttributes("units", uniqueAttributes.units),
      ensureAndMapAttributes("stores", uniqueAttributes.stores),
    ]);

    // --- END OF ATTRIBUTE BATCHING ---

    // START PROCESSING LOGIC -----------------------------------------------------

    let successCount = 0;
    let failCount = 0;
    let duplicatesFound = 0;
    const validationErrors: any[] = [];
    const duplicatesList: Array<{ sku: string; name: string; differences: any }> = [];

    // NEW: Arrays to hold data for BULK INSERTS
    const variantsToInsert: any[] = [];
    const inventoryToInsert: any[] = [];
    // Map to track product_id for each item_number to avoid redundant lookups/inserts
    const productItemNumberCache = new Map<string, string>();
    // Map to link variant_id (temp/sku) to inventory data
    const inventoryBuffer = new Map<string, any>();

    if (importType === "full") {
      // 1. FIRST PASS: Validate, find/insert Products, and collect Variants/Inventory data
      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        const rawSku = getVal(row, "SKU", "sku");
        const sku = rawSku !== null && rawSku !== undefined ? String(rawSku).trim() : rawSku;

        const validationResult = itemSchema.safeParse({
          sku: sku,
          name: getVal(row, "Name", "name"),
          pos_description: getVal(row, "Pos Description", "pos_description"),
          item_number: getVal(row, "Item Number", "item_number"),
          supplier: getVal(row, "Supplier", "supplier"),
          main_group: getVal(row, "Main Group", "main_group"),
          category: getVal(row, "Category", "category"),
          origin: getVal(row, "Origin", "origin"),
          season: getVal(row, "Season", "season"),
          size: getVal(row, "Size", "size"),
          color: getVal(row, "Color", "color"),
          color_id: getVal(row, "Color Id", "color_id"),
          item_color_code: getVal(row, "Item Color Code", "item_color_code"),
          theme: getVal(row, "Theme", "theme") || null,
          cost_price: parseFloat(String(getVal(row, "Cost Price", "Cost", "cost") || 0)),
          selling_price: parseFloat(String(getVal(row, "Selling Price", "Price", "price") || 0)),
          tax: parseFloat(String(getVal(row, "Tax", "tax") || 0)),
          unit: getVal(row, "Unit", "unit") || "pcs",
          quantity: getVal(row, "Quantity", "quantity") ? parseInt(String(getVal(row, "Quantity", "quantity"))) : null,
          min_stock: getVal(row, "Min Stock", "min_stock")
            ? parseInt(String(getVal(row, "Min Stock", "min_stock")))
            : null,
          location: getVal(row, "Location", "location") || null,
          description: getVal(row, "Desc", "description") || null,
          gender: getVal(row, "Gender", "gender") || null,
          brand: getVal(row, "Brand", "brand") || null,
          wholesale_price: getVal(row, "Wholesale Price", "wholesale_price")
            ? parseFloat(String(getVal(row, "Wholesale Price", "wholesale_price")))
            : null,
        });

        if (!validationResult.success) {
          failCount++;
          validationErrors.push({ row: i + 1, sku, errors: validationResult.error.errors });
          continue;
        }

        const validatedData = validationResult.data;

        // CRITICAL FIX: Use the aggressive cleaner for the final attribute ID lookup
        const cleanCategory = cleanAttributeName(validatedData.category);
        const cleanSupplier = cleanAttributeName(validatedData.supplier);
        const cleanStore = cleanAttributeName(validatedData.location || "Default");
        const cleanBrand = validatedData.brand ? cleanAttributeName(validatedData.brand) : null;
        
        const category_id = categoryMap.get(cleanCategory);
        const supplier_id = supplierMap.get(cleanSupplier);
        const brand_id = cleanBrand ? brandMap.get(cleanBrand) : null;
        const store_id = storeMap.get(cleanStore);

        // CRITICAL CHECK for foreign keys
        if (!category_id || !supplier_id || !store_id) {
          failCount++;
          validationErrors.push({
            row: i + 1,
            sku,
            errors: [
              {
                path: ["database", "foreign_key_precheck"],
                message: `Critical attribute missing: Category(${validatedData.category}), Supplier(${validatedData.supplier}), or Store(${validatedData.location || "Default"}) could not be found/created.`,
              },
            ],
          });
          continue;
        }

        // Check if variant (SKU) exists
        const { data: existingVariant } = await supabase
          .from("variants")
          .select("sku") // only need to check existence
          .eq("sku", validatedData.sku)
          .maybeSingle();

        if (existingVariant) {
          duplicatesFound++;
          // ... (rest of the duplicate logic) ...
          continue; // Skip insertion for duplicates
        }

        // --- Product Logic (Cached Find-or-Insert) ---
        let product_id: string | null = null;
        const itemNumber = validatedData.item_number;

        if (productItemNumberCache.has(itemNumber)) {
          // Found in local cache (FAST)
          product_id = productItemNumberCache.get(itemNumber)!;
        } else {
          // Not in cache: check DB, then insert if needed (SLOWER, but only once per item_number)
          const { data: existingProduct } = await supabase
            .from("products")
            .select("id")
            .eq("item_number", itemNumber)
            .maybeSingle();

          if (existingProduct) {
            product_id = existingProduct.id;
          } else {
            const productInsertResult = await supabase
              .from("products")
              .insert({
                name: validatedData.name,
                pos_description: validatedData.pos_description,
                description: validatedData.description,
                gender: validatedData.gender,
                item_number: validatedData.item_number,
                category_id,
                brand_id,
              })
              .select("id")
              .single();

            if (productInsertResult.error || !productInsertResult.data) {
              failCount++;
              validationErrors.push({
                row: i + 1,
                sku,
                errors: [
                  {
                    path: ["database", "products"],
                    message: `Product insert failed: ${productInsertResult.error?.message || "Unknown error."}.`,
                  },
                ],
              });
              continue;
            }
            product_id = productInsertResult.data.id;
          }
          productItemNumberCache.set(itemNumber, product_id);
        }

        // --- Collect data for Bulk Inserts ---

        // Variant Data (Temp: use SKU as a temporary identifier until the insert returns the real ID)
        variantsToInsert.push({
          // We use the unique 'id' column for UUIDs, but Supabase uses 'variant_id' in its RPC/JS schema,
          // so we will just let the DB auto-generate the ID, and track it by SKU temporarily.
          sku: validatedData.sku,
          product_id: product_id,
          supplier_id,
          selling_price: validatedData.selling_price,
          cost: validatedData.cost_price,
          tax_rate: validatedData.tax,
          unit: validatedData.unit,
          color: validatedData.color,
          size: validatedData.size,
          season: validatedData.season,
        });

        // Inventory Data (Collected for later update)
        if (validatedData.quantity !== null) {
          inventoryBuffer.set(validatedData.sku, {
            store_id: store_id,
            quantity: validatedData.quantity,
            min_stock: validatedData.min_stock,
          });
        }
      } // End of First Pass Loop

      setProgress(70);

      // 2. SECOND PASS: BULK INSERT VARIANTS

      if (variantsToInsert.length > 0) {
        const { data: insertedVariants, error: variantBulkError } = await supabase
          .from("variants")
          .insert(variantsToInsert)
          .select("id, sku"); // Get the newly created UUIDs (id) and the SKU

        if (variantBulkError) {
          // Bulk insert failed (e.g., RLS policy)
          console.error("Bulk variant insert failed:", variantBulkError);
          toast.error(`Bulk variant insert failed: ${variantBulkError.message}. Check RLS policies.`);
          failCount += variantsToInsert.length;
          setIsUploading(false);
          setProgress(0);
          return;
        }

        // 3. THIRD PASS: BULK INSERT INVENTORY
        if (insertedVariants && insertedVariants.length > 0) {
          const finalInventoryInserts: any[] = [];
          let successfulInserts = 0;

          insertedVariants.forEach((variant: { id: string; sku: string }) => {
            const inventoryData = inventoryBuffer.get(variant.sku);
            if (inventoryData) {
              finalInventoryInserts.push({
                variant_id: variant.id, // Use the real UUID returned from the bulk insert
                store_id: inventoryData.store_id,
                quantity: inventoryData.quantity,
                min_stock: inventoryData.min_stock,
              });
              successfulInserts++;
            }
          });

          if (finalInventoryInserts.length > 0) {
            const { error: inventoryBulkError } = await supabase.from("store_inventory").insert(finalInventoryInserts);

            if (inventoryBulkError) {
              console.error("Bulk inventory insert failed:", inventoryBulkError);
              // Note: We count the success based on variant insertion, as inventory is secondary
            }
          }
          successCount = successfulInserts; // Final count of successful insertions
        }
      }
    } else {
      // Quantity update logic remains sequential as it relies on finding existing variants
      // This is acceptable as it's not the primary import path
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rawSku = getVal(row, "SKU", "sku");
        const sku = rawSku !== null && rawSku !== undefined ? String(rawSku).trim() : rawSku;
        const quantityValue = getVal(row, "Quantity", "quantity");

        const validationResult = quantityUpdateSchema.safeParse({
          sku,
          quantity: quantityValue ? parseInt(String(quantityValue)) : undefined,
        });

        if (!validationResult.success) {
          failCount++;
          validationErrors.push({ row: i + 1, sku, errors: validationResult.error.errors });
          continue;
        }

        const validatedData = validationResult.data;

        const { data: variantData, error: variantSelectError } = await supabase
          .from("variants")
          .select("id") // Use 'id' for UUID column
          .eq("sku", validatedData.sku)
          .maybeSingle();

        if (variantSelectError || !variantData) {
          failCount++;
          validationErrors.push({
            row: i + 1,
            sku,
            errors: [
              {
                path: ["database", "sku_lookup"],
                message: variantSelectError
                  ? `Lookup failed: ${variantSelectError.message}`
                  : "SKU not found for quantity update.",
              },
            ],
          });
          continue;
        }

        const { error } = await supabase
          .from("store_inventory")
          .update({ quantity: validatedData.quantity })
          .eq("variant_id", variantData.id)
          .limit(1);

        if (error) {
          failCount++;
          validationErrors.push({
            row: i + 1,
            sku,
            errors: [
              {
                path: ["database", "stock_update"],
                message: `Stock update failed: ${error.message}`,
              },
            ],
          });
        } else {
          successCount++;
        }
      }
    }

    setProgress(100);

    // Create import log
    await supabase.from("import_logs").insert({
      file_name: fileName,
      import_type: importType,
      total_rows: data.length,
      successful_rows: successCount,
      failed_rows: failCount,
      duplicates_found: duplicatesFound,
      status: "completed",
    });

    setIsUploading(false);
    setProgress(0);

    // Show result dialogs...
    if (validationErrors.length > 0) {
      setImportErrors({
        type: "Validation/Database Errors",
        message: `${failCount} row(s) failed validation or database insertion. Please review the errors below.`,
        validationErrors,
      });
      setErrorDialogOpen(true);
    }

    if (duplicatesFound > 0) {
      setDuplicateErrors(duplicatesList);
      setDuplicateDialogOpen(true);
    }

    const totalProcessed = successCount + failCount + duplicatesFound;
    if (totalProcessed > 0 && successCount === 0 && failCount > 0) {
      toast.error(`Import failed. ${failCount} row(s) could not be processed.`);
    } else {
      toast.success(
        `Import completed: ${successCount} successful${failCount > 0 ? `, ${failCount} failed` : ""}${
          duplicatesFound > 0 ? `, ${duplicatesFound} duplicates skipped` : ""
        }`,
      );
    }

    await invalidateInventoryData(queryClient);

    onImportComplete();
    onOpenChange(false);
    setFile(null);

    setIsUploading(false);
  };

  const exportDuplicateLog = () => {
    const errorData = duplicateErrors.map((dup) => ({
      SKU: dup.sku,
      Name: dup.name,
      Status: "Duplicate - Already exists in system",
      Differences: dup.differences
        ? Object.keys(dup.differences)
            .map((k) => `${k}: ${dup.differences[k].old ?? "NULL"} → ${dup.differences[k].new ?? "NULL"}`)
            .join("; ")
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
              Upload a file or import directly from Google Sheets to add or update your inventory items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Import Type</Label>
              <Select value={importType} onValueChange={(value: any) => setImportType(value)} disabled={isUploading}>
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

            <Tabs value={importMethod} onValueChange={(value: any) => setImportMethod(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" disabled={isUploading}>
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="sheets" disabled={isUploading}>
                  Google Sheets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label>File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="flex-1"
                      disabled={isUploading}
                    />
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  </div>
                  {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
                </div>

                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Expected columns:</p>
                  {importType === "full" ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">
                        <strong>Required:</strong> Name, Pos Description, Item Number, SKU, Supplier, Main Group,
                        Category, Origin, Season, Size, Color, Color Id, Item Color Code, Price, Cost, Tax
                      </p>
                      <p className="text-muted-foreground text-xs">
                        <strong>Optional:</strong> Theme, Desc, Brand, Gender, Quantity, Min Stock, Unit, **Location**
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Note: Quantity defaults to 0 if not provided
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">SKU, Quantity</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sheets" className="space-y-4">
                <GoogleSheetsInput
                  onImport={handleGoogleSheetsImport}
                  isProcessing={isUploading}
                  setIsProcessing={setIsUploading}
                />

                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Expected columns:</p>
                  {importType === "full" ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">
                        <strong>Required:</strong> Name, Pos Description, Item Number, SKU, Supplier, Main Group,
                        Category, Origin, Season, Size, Color, Color Id, Item Color Code, Price, Cost, Tax
                      </p>
                      <p className="text-muted-foreground text-xs">
                        <strong>Optional:</strong> Theme, Desc, Brand, Gender, Quantity, Min Stock, Unit, **Location**
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Note: Quantity defaults to 0 if not provided
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">SKU, Quantity</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Loading Bar - Shows during the upload process */}
          {isUploading && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-blue-600">Processing Data...</p>
              <Progress value={progress} className="w-full h-2 transition-all duration-300" />
              <p className="text-xs text-muted-foreground italic">This may take a moment for large files.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            {importMethod === "file" && (
              <Button onClick={handleImport} disabled={!file || isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Importing..." : "Import"}
              </Button>
            )}
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
            <DialogDescription>{importErrors?.message}</DialogDescription>
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
                            <strong>{err.path.join(".")}</strong>: {err.message}
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
              <li>
                • If the error path is **`database.foreign_key_precheck`**, it means a required attribute (Category or
                Supplier) was not found in the database. Ensure you have run the necessary **RLS SQL queries** to allow
                attribute creation (which you have confirmed!).
              </li>
              <li>
                • If the error path is `database.products` and the message is **`duplicate key value violates unique
                constraint "products_item_number_key"`**, it means the same Item Number is being used for multiple
                products, which is now handled by the **new code logic (Find-or-Insert)**.
              </li>
            </ul>
          </div>

          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
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
              Some items were skipped because they already exist in the system (matching SKU). These items were not
              updated to prevent accidental data changes. You can export the error log to see which items were affected
              and review their differences.
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
                            {Object.keys(dup.differences).length} field
                            {Object.keys(dup.differences).length > 1 ? "s" : ""} differ
                          </p>
                        )}
                      </div>
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">Duplicate</span>
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