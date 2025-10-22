// src/pages/Dashboard.tsx
// Add this import at the top
import { InventoryItem } from "@/types/reports";

// Then update the problematic line (around line 244)
// Replace this line:
// const storeId = item.store_id;

// With this:
const storeId = (item as InventoryItem).store_id;
// OR if you're sure about the property:
const storeId = (item as any).store_id;
