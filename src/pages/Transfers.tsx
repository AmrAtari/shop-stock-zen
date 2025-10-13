import { useState, useEffect, useMemo, useCallback } from "react";
// Added Scan icon to imports
import { Plus, Eye, Upload, X, Save, Box, CornerDownRight, Scan } from "lucide-react";

// --- MOCK DATA, TYPES, AND UTILITIES (for standalone file) ---

// Mock Types
const initialTransfer: Transfer = {
  id: crypto.randomUUID(),
  transfer_number: "TRF-001",
  from_store_id: "WH-Main",
  to_store_id: "Store-A",
  status: "pending",
  total_items: 5,
  created_at: new Date().toISOString(),
};

type Transfer = {
  id: string;
  transfer_number: string;
  from_store_id: string;
  to_store_id: string;
  status: "pending" | "approved" | "in_transit" | "received" | "rejected";
  total_items: number;
  created_at: string;
};

type Location = {
  id: string;
  name: string;
};

// Mock Database and Stores
const mockLocations: Location[] = [
  { id: "WH-Main", name: "Main Warehouse (WH-Main)" },
  { id: "Store-A", name: "Retail Store A" },
  { id: "Store-B", name: "Retail Store B" },
  { id: "RMA", name: "Returns Area (RMA)" },
];

const mockTransfers: Transfer[] = [
  { ...initialTransfer },
  {
    id: crypto.randomUUID(),
    transfer_number: "TRF-002",
    from_store_id: "Store-A",
    to_store_id: "WH-Main",
    status: "received",
    total_items: 12,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    transfer_number: "TRF-003",
    from_store_id: "Store-B",
    to_store_id: "Store-A",
    status: "in_transit",
    total_items: 2,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    transfer_number: "TRF-004",
    from_store_id: "WH-Main",
    to_store_id: "Store-B",
    status: "rejected",
    total_items: 25,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

// Mock Hooks and Components (Simplified Shadcn/UI style)
const toast = {
  error: (msg: string) => console.error("TOAST ERROR:", msg),
  success: (msg: string) => console.log("TOAST SUCCESS:", msg),
};
const useUserRole = () => ({ permissions: { canCreateTransfers: true } });
const usePagination = ({
  totalItems,
  itemsPerPage,
  initialPage,
}: {
  totalItems: number;
  itemsPerPage: number;
  initialPage: number;
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < totalPages,
  };
};
// Generic UI components implemented with Tailwind
const Button = ({ children, onClick, variant = "default", className = "", disabled = false, type = "button" }: any) => {
  let baseStyle = "px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2";
  if (variant === "default") baseStyle += " bg-blue-600 text-white hover:bg-blue-700 shadow-md";
  if (variant === "outline") baseStyle += " border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  if (variant === "destructive") baseStyle += " bg-red-600 text-white hover:bg-red-700";
  if (variant === "ghost") baseStyle += " bg-transparent text-gray-600 hover:bg-gray-100";
  if (variant === "success") baseStyle += " bg-green-600 text-white hover:bg-green-700";
  if (disabled) baseStyle += " opacity-50 cursor-not-allowed";
  return (
    <button type={type} className={`${baseStyle} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white shadow-xl rounded-xl border border-gray-100 ${className}`}>{children}</div>
);
const CardHeader = ({ children }: any) => <div className="p-6 border-b border-gray-100">{children}</div>;
const CardTitle = ({ children }: any) => <h2 className="text-xl font-bold text-gray-800">{children}</h2>;
const CardContent = ({ children }: any) => <div className="p-6">{children}</div>;
const Badge = ({ children, variant = "default" }: any) => {
  let style = "px-3 py-1 text-xs font-medium rounded-full";
  if (variant === "success") style += " bg-green-100 text-green-700";
  if (variant === "default") style += " bg-blue-100 text-blue-700";
  if (variant === "warning") style += " bg-yellow-100 text-yellow-700";
  if (variant === "destructive") style += " bg-red-100 text-red-700";
  return <span className={style}>{children}</span>;
};
const Table = ({ children }: any) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
  </div>
);
const TableHeader = ({ children }: any) => <thead className="bg-gray-50">{children}</thead>;
const TableHead = ({ children }: any) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);
const TableBody = ({ children }: any) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
const TableRow = ({ children, ...props }: any) => <tr {...props}>{children}</tr>;
const TableCell = ({ children, className = "" }: any) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`}>{children}</td>
);
const Input = (props: any) => (
  <input
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
    {...props}
  />
);
const Select = (props: any) => (
  <select
    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
    {...props}
  />
);
const Textarea = (props: any) => (
  <textarea
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
    rows={3}
    {...props}
  />
);
const Label = ({ children, htmlFor }: any) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
    {children}
  </label>
);

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  canGoPrev,
  canGoNext,
  totalItems,
  startIndex,
  endIndex,
}: any) => (
  <div className="flex items-center justify-between mt-4">
    <div className="text-sm text-gray-600">
      Showing {startIndex + 1} to {endIndex} of {totalItems} results
    </div>
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrev}>
        Previous
      </Button>
      <div className="text-sm font-medium text-gray-700">
        Page {currentPage} of {totalPages}
      </div>
      <Button variant="outline" onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext}>
        Next
      </Button>
    </div>
  </div>
);
// --- END MOCK UTILITIES ---

// --- NEW MODAL COMPONENT ---

type ItemLine = {
  itemId: string;
  sku: string;
  quantity: number;
  unitCost: number;
  batchId: string;
};

type NewTransfer = {
  transferDate: string;
  sourceLocationId: string;
  destinationLocationId: string;
  reason: string;
  items: ItemLine[];
};

const initialNewTransferState: NewTransfer = {
  transferDate: new Date().toISOString().substring(0, 10), // Today's date
  sourceLocationId: mockLocations[0].id,
  destinationLocationId: mockLocations[1].id,
  reason: "",
  items: [{ itemId: crypto.randomUUID(), sku: "SKU-100", quantity: 1, unitCost: 15.0, batchId: "B-A123" }],
};

const CreateTransferModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewTransfer) => void;
}) => {
  const [formData, setFormData] = useState<NewTransfer>(initialNewTransferState);
  const [isSaving, setIsSaving] = useState(false);
  // State to manage how items are added
  const [itemEntryMethod, setItemEntryMethod] = useState<"manual" | "barcode" | "excel">("manual");

  // State for a new item being added manually/via scan
  const [newItem, setNewItem] = useState({ sku: "", quantity: 1, unitCost: 0, batchId: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewItem((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const addItemLine = () => {
    if (!newItem.sku || newItem.quantity <= 0) {
      toast.error("SKU and Quantity must be valid to add an item.");
      return;
    }

    // Check if item already exists to update quantity (crucial for barcode scanning)
    const existingIndex = formData.items.findIndex((item) => item.sku === newItem.sku);

    let newItems;
    if (existingIndex > -1 && itemEntryMethod === "barcode") {
      // If barcode mode, increment quantity
      newItems = formData.items.map((item, index) =>
        index === existingIndex ? { ...item, quantity: item.quantity + newItem.quantity } : item,
      );
      toast.success(`Quantity updated for ${newItem.sku}.`);
    } else if (existingIndex > -1 && itemEntryMethod === "manual") {
      toast.error(`Item ${newItem.sku} already exists. Please edit the line item below.`);
      return;
    } else {
      // Add new item (for manual mode or new item in barcode mode)
      newItems = [
        ...formData.items,
        {
          itemId: crypto.randomUUID(),
          ...newItem,
          quantity: newItem.quantity,
          unitCost: newItem.unitCost,
        },
      ];
      toast.success(`${newItem.sku} added.`);
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
    // Reset only SKU for quick successive scans/entries
    setNewItem((prev) => ({
      ...prev,
      sku: "",
      quantity: itemEntryMethod === "barcode" ? 1 : initialNewTransferState.items[0].quantity,
    }));
  };

  const handleItemUpdate = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [name]: name === "quantity" || name === "unitCost" ? parseFloat(value) || 0 : value,
    };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  // Placeholder for Excel Import logic
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would parse the file (CSV/XLSX) here.
      // For now, we simulate importing 3 items and replacing the current list.
      toast.success(`Simulating import of file: ${file.name}. Items added.`);

      const importedItems: ItemLine[] = [
        { itemId: crypto.randomUUID(), sku: "EXC-1", quantity: 10, unitCost: 5.5, batchId: "F-1" },
        { itemId: crypto.randomUUID(), sku: "EXC-2", quantity: 20, unitCost: 2.1, batchId: "F-2" },
        { itemId: crypto.randomUUID(), sku: "EXC-3", quantity: 5, unitCost: 100.0, batchId: "F-3" },
      ];

      setFormData((prev) => ({ ...prev, items: importedItems }));
      // Clear file input to allow re-selection
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.sourceLocationId === formData.destinationLocationId) {
      toast.error("Source and Destination locations must be different.");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Transfer must contain at least one item.");
      return;
    }

    setIsSaving(true);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    onCreate(formData);
    setFormData(initialNewTransferState);
    setIsSaving(false);
    onClose();
    toast.success("Transfer Voucher created successfully!");
  };

  if (!isOpen) return null;

  return (
    // Modal Overlay
    <div
      className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal Content */}
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Create New Inventory Transfer Voucher</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="p-2">
              <X className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Record the internal movement of stock between locations.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
              <div>
                <Label htmlFor="transferDate">Voucher Date</Label>
                <Input
                  type="date"
                  id="transferDate"
                  name="transferDate"
                  value={formData.transferDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="reason">Transfer Reason</Label>
                <Input
                  type="text"
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g., Replenish Store A inventory"
                  required
                />
              </div>
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label htmlFor="sourceLocationId">Source Location (From)</Label>
                <Select
                  id="sourceLocationId"
                  name="sourceLocationId"
                  value={formData.sourceLocationId}
                  onChange={handleChange}
                  required
                >
                  {mockLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="destinationLocationId">Destination Location (To)</Label>
                <Select
                  id="destinationLocationId"
                  name="destinationLocationId"
                  value={formData.destinationLocationId}
                  onChange={handleChange}
                  required
                >
                  {mockLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
              </div>
              {formData.sourceLocationId === formData.destinationLocationId && (
                <p className="text-red-600 md:col-span-2 font-medium">
                  Warning: Source and Destination must be different.
                </p>
              )}
            </div>

            {/* Line Item Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-800">
                <Box className="w-5 h-5" /> Stock Items Entry Method
              </h3>

              {/* Entry Method Selector */}
              <div className="flex gap-2 mb-4 p-2 border-b border-gray-200">
                <Button
                  type="button"
                  variant={itemEntryMethod === "manual" ? "default" : "outline"}
                  onClick={() => setItemEntryMethod("manual")}
                  className="text-sm"
                >
                  <Plus className="w-4 h-4" /> Manual Entry
                </Button>
                <Button
                  type="button"
                  variant={itemEntryMethod === "barcode" ? "default" : "outline"}
                  onClick={() => setItemEntryMethod("barcode")}
                  className="text-sm"
                >
                  <Scan className="w-4 h-4" /> Barcode Scan
                </Button>
                <Button
                  type="button"
                  variant={itemEntryMethod === "excel" ? "default" : "outline"}
                  onClick={() => setItemEntryMethod("excel")}
                  className="text-sm"
                >
                  <Upload className="w-4 h-4" /> Import from Excel
                </Button>
              </div>

              {/* --- Conditional Item Entry Forms --- */}

              {/* Manual Entry Form */}
              {itemEntryMethod === "manual" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-10 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="col-span-3">
                      <Label htmlFor="newSku">SKU / Item</Label>
                      <Input
                        name="sku"
                        value={newItem.sku}
                        onChange={handleNewItemChange}
                        placeholder="SKU-XXX"
                        id="newSku"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="newBatchId">Batch/Lot #</Label>
                      <Input
                        name="batchId"
                        value={newItem.batchId}
                        onChange={handleNewItemChange}
                        placeholder="B-XXXX"
                        id="newBatchId"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="newQuantity">Quantity</Label>
                      <Input
                        type="number"
                        name="quantity"
                        value={newItem.quantity}
                        onChange={handleNewItemChange}
                        min="1"
                        className="text-right"
                        id="newQuantity"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="newUnitCost">Unit Cost ($)</Label>
                      <Input
                        type="number"
                        name="unitCost"
                        value={newItem.unitCost}
                        onChange={handleNewItemChange}
                        min="0"
                        step="0.01"
                        className="text-right"
                        id="newUnitCost"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button type="button" onClick={addItemLine} className="w-full h-[42px]">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Barcode Scan Form */}
              {itemEntryMethod === "barcode" && (
                <div className="p-4 border border-blue-300 rounded-lg space-y-4 bg-blue-50">
                  <p className="text-blue-700 font-medium flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    Scan items here. Quantity increments automatically for duplicates.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      name="sku"
                      value={newItem.sku}
                      onChange={handleNewItemChange}
                      placeholder="Scan or type Barcode/SKU and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItemLine();
                        }
                      }}
                      autoFocus // Focus on this field for quick scanning
                    />
                    <Button type="button" onClick={addItemLine} className="min-w-[100px]">
                      Add/Scan
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Note: Uses quantity 1 for each scan. Adjust other details in the list below.
                  </p>
                </div>
              )}

              {/* Excel Import Form */}
              {itemEntryMethod === "excel" && (
                <div className="p-4 border border-green-300 rounded-lg space-y-4 bg-green-50">
                  <p className="text-green-700 font-medium flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload File to Populate Items
                  </p>
                  <Label htmlFor="fileImport">Select CSV or Excel Transfer File</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      id="fileImport"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileImport}
                    />
                    <Button
                      type="button"
                      variant="success"
                      className="min-w-[100px]"
                      onClick={() => document.getElementById("fileImport")?.click()}
                    >
                      Import
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    The file should contain columns for SKU, Quantity, Unit Cost, and Batch ID. Uploading will replace
                    existing items.
                  </p>
                </div>
              )}

              {/* --- Items List (Visible for all methods) --- */}

              <h4 className="text-lg font-semibold mt-6 mb-3 border-t pt-4">
                Current Transfer Items ({formData.items.length})
              </h4>

              {formData.items.length === 0 ? (
                <p className="text-gray-500 italic p-4 border rounded-lg">
                  No items added to the transfer yet. Please use one of the entry methods above.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%]">SKU / Item</TableHead>
                      <TableHead className="w-[15%]">Batch #</TableHead>
                      <TableHead className="w-[15%] text-right">Quantity</TableHead>
                      <TableHead className="w-[15%] text-right">Unit Cost ($)</TableHead>
                      <TableHead className="w-[15%] text-right">Total ($)</TableHead>
                      <TableHead className="w-[20%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <Input
                            name="sku"
                            value={item.sku}
                            onChange={(e) => handleItemUpdate(index, e)}
                            placeholder="SKU-XXX"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="batchId"
                            value={item.batchId}
                            onChange={(e) => handleItemUpdate(index, e)}
                            placeholder="B-XXXX"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            name="quantity"
                            value={item.quantity}
                            onChange={(e) => handleItemUpdate(index, e)}
                            min="1"
                            className="text-right"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            name="unitCost"
                            value={item.unitCost}
                            onChange={(e) => handleItemUpdate(index, e)}
                            min="0"
                            step="0.01"
                            className="text-right"
                            required
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-800">
                          ${(item.quantity * item.unitCost).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeItemLine(index)}
                            className="p-1 text-red-500 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" /> Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Footer / Action */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-bold text-gray-800">
                Total Items: {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <Button
                type="submit"
                variant="default"
                disabled={
                  isSaving ||
                  formData.sourceLocationId === formData.destinationLocationId ||
                  formData.items.length === 0
                }
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Create Transfer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  // In a real app, this would be an array of objects fetched from Supabase
  const [transfers, setTransfers] = useState<Transfer[]>(mockTransfers);
  const [isLoading, setIsLoading] = useState(false); // Set to false since we are using mock data initially
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock hook usage
  const { permissions } = useUserRole();

  // Mock API call (Replaced with local state initialization)
  const fetchTransfers = useCallback(async () => {
    // Mock data is already loaded in useState initialization above
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Simulating the initial data load
    fetchTransfers();
  }, [fetchTransfers]);

  const handleCreateTransfer = (newTransferData: NewTransfer) => {
    const totalItems = newTransferData.items.reduce((sum, item) => sum + item.quantity, 0);

    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      transfer_number: `TRF-${transfers.length + 1}`,
      from_store_id: newTransferData.sourceLocationId,
      to_store_id: newTransferData.destinationLocationId,
      status: "pending", // Default status on creation
      total_items: totalItems,
      created_at: new Date().toISOString(),
    };

    // Add the new transfer to the state
    setTransfers((prev) => [newTransfer, ...prev]);
    // Note: The actual line item details would be stored in a separate table/field in a real DB.
  };

  const pagination = usePagination({
    totalItems: transfers.length,
    itemsPerPage: 10,
    initialPage: 1,
  });

  const paginatedTransfers = useMemo(() => {
    return transfers.slice(pagination.startIndex, pagination.endIndex);
  }, [transfers, pagination.startIndex, pagination.endIndex]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "received":
        return "success";
      case "approved":
      case "in_transit":
        return "default";
      case "pending":
        return "warning";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">Inventory Transfers</h1>
          <p className="text-lg text-gray-500 mt-1">Manage stock movements between your internal locations.</p>
        </div>
        {permissions.canCreateTransfers && (
          <div className="flex gap-3">
            {/* The Import Excel button was removed here as requested */}
            <Button onClick={() => setIsModalOpen(true)} variant="default" className="text-sm">
              <Plus className="w-4 h-4" />
              New Transfer
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transfers yet</p>
              {permissions.canCreateTransfers && (
                <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                  <CornerDownRight className="w-5 h-5 mr-2" />
                  Create Your First Transfer
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>From Location</TableHead>
                    <TableHead>To Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium text-blue-600">{transfer.transfer_number}</TableCell>
                      <TableCell>{transfer.from_store_id}</TableCell>
                      <TableCell>{transfer.to_store_id}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(transfer.status) as any}>
                          {transfer.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{transfer.total_items}</TableCell>
                      <TableCell>{new Date(transfer.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="p-1"
                          onClick={() => console.log(`Viewing transfer ${transfer.id}`)} // Mock navigation to detail page
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                canGoPrev={pagination.canGoPrev}
                canGoNext={pagination.canGoNext}
                totalItems={transfers.length}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* The new modal component */}
      <CreateTransferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateTransfer} />
    </div>
  );
};

export default App;
