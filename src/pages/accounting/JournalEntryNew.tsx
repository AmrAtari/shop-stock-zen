import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  store_id?: string;
  item_id?: string;
}

interface Store {
  id: string;
  name: string;
}

interface InventoryRow {
  item_id: string;
  store_id: string;
  sku: string;
  name: string;
  quantity: number;
  cost: number;
  store_name: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

const JournalEntryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: "1", account_id: "", description: "", debit: 0, credit: 0 },
    { id: "2", account_id: "", description: "", debit: 0, credit: 0 },
  ]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  // Fetch accounts
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("is_active", true).order("account_code");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch stores
  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch inventory for selected store
  const { data: inventory } = useQuery<InventoryRow[]>({
    queryKey: ["store-inventory", selectedStoreId],
    queryFn: async () => {
      if (!selectedStoreId) return [];
      const { data, error } = await supabase
        .from("store_inventory")
        .select(
          `
          item_id,
          quantity,
          store_id,
          items (sku, name, cost),
          stores (name)
        `,
        )
        .eq("store_id", selectedStoreId)
        .gt("quantity", 0);
      if (error) throw error;
      return (
        data?.map((row: any) => ({
          item_id: row.item_id,
          store_id: row.store_id,
          sku: row.items?.sku || "",
          name: row.items?.name || "",
          quantity: Number(row.quantity),
          cost: Number(row.items?.cost || 0),
          store_name: row.stores?.name || "",
        })) || []
      );
    },
    enabled: !!selectedStoreId,
  });

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) setLines(lines.filter((line) => line.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const generateOpeningStock = async () => {
    if (!selectedStoreId) {
      toast.error("Please select a store first");
      return;
    }
    if (!inventory || inventory.length === 0) {
      toast.error("No inventory items found for this store");
      return;
    }

    // Fetch default accounts
    const inventoryAccount = accounts?.find((a) => a.account_type === "Inventory");
    const retainedEarningsAccount = accounts?.find((a) => a.account_code === "3000"); // adjust if needed

    if (!inventoryAccount || !retainedEarningsAccount) {
      toast.error("Inventory or Retained Earnings account not found");
      return;
    }

    // Map inventory to journal lines
    const stockLines: JournalLine[] = inventory.map((item) => ({
      id: item.item_id,
      account_id: inventoryAccount.id,
      description: `Opening Stock for ${item.name} (${item.sku})`,
      debit: item.quantity * item.cost,
      credit: 0,
      store_id: item.store_id,
      item_id: item.item_id,
    }));

    // Credit total to retained earnings
    const totalValue = stockLines.reduce((sum, l) => sum + l.debit, 0);
    const creditLine: JournalLine = {
      id: "RE-" + Date.now(),
      account_id: retainedEarningsAccount.id,
      description: `Opening Stock Total - Store ${stores?.find((s) => s.id === selectedStoreId)?.name}`,
      debit: 0,
      credit: totalValue,
    };

    setLines([...lines, ...stockLines, creditLine]);
    toast.success("Opening stock lines generated");
  };

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!isBalanced) throw new Error("Debits and credits must be equal");

      const { data: entryNumberData, error: entryNumberError } = await supabase.rpc("generate_journal_entry_number");
      if (entryNumberError) throw entryNumberError;

      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumberData,
          entry_date: entryDate,
          description,
          entry_type: "manual",
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: "draft",
        })
        .select()
        .single();
      if (entryError) throw entryError;

      const lineInserts = lines
        .filter((line) => line.account_id && (line.debit > 0 || line.credit > 0))
        .map((line, idx) => ({
          journal_entry_id: entry.id,
          account_id: line.account_id,
          description: line.description,
          debit_amount: line.debit,
          credit_amount: line.credit,
          store_id: line.store_id || null,
          item_id: line.item_id || null,
          line_number: idx + 1,
        }));

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lineInserts);
      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: (entry) => {
      toast.success("Journal entry created successfully");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      navigate(`/accounting/journal-entries/${entry.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create journal entry");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
        </div>
        <Button onClick={() => createEntry.mutate()} disabled={!isBalanced}>
          <Save className="w-4 h-4 mr-2" />
          Save Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entry Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Store (for Opening Stock)</Label>
              <Select value={selectedStoreId} onValueChange={(v) => setSelectedStoreId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generateOpeningStock} className="mt-2">
                Generate Opening Stock
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter journal entry description..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Journal Lines</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-2" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Debit</TableHead>
                <TableHead className="w-[150px]">Credit</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Select value={line.account_id} onValueChange={(v) => updateLine(line.id, "account_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.debit || ""}
                      onChange={(e) => {
                        updateLine(line.id, "debit", parseFloat(e.target.value) || 0);
                        updateLine(line.id, "credit", 0);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.credit || ""}
                      onChange={(e) => {
                        updateLine(line.id, "credit", parseFloat(e.target.value) || 0);
                        updateLine(line.id, "debit", 0);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className={totalDebit !== totalCredit ? "text-red-600" : ""}>
                  ${totalDebit.toFixed(2)}
                </TableCell>
                <TableCell className={totalDebit !== totalCredit ? "text-red-600" : ""}>
                  ${totalCredit.toFixed(2)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {!isBalanced && (
            <p className="text-sm text-red-600 mt-2">Entry is not balanced. Debits and credits must be equal.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
