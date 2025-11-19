import { useState } from "react";
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
}

interface InventoryItem {
  quantity: number;
  item: {
    id: string;
    name: string;
    cost: number;
  };
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

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("is_active", true).order("account_code");
      if (error) throw error;
      return data;
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("Debits and credits must be equal");
      }

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
        .map((line) => ({
          journal_entry_id: entry.id,
          account_id: line.account_id,
          description: line.description,
          debit: line.debit || 0,
          credit: line.credit || 0,
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

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) setLines(lines.filter((line) => line.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Generate Opening Stock for selected store
  const generateOpeningStock = async () => {
    if (!selectedStoreId) {
      toast.error("Please select a store first");
      return;
    }

    const { data: inventoryItems, error } = await supabase
      .from<InventoryItem>("store_inventory")
      .select("quantity, item:items(id, name, cost)")
      .eq("store_id", selectedStoreId)
      .gt("quantity", 0);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      toast.error("No inventory items found for this store");
      return;
    }

    // Clear existing lines
    setLines([]);

    // For each inventory item, create debit for Inventory, credit for Retained Earnings
    const newLines: JournalLine[] = inventoryItems.map((inv) => ({
      id: inv.item.id,
      account_id: "", // Select the Inventory account here
      description: `Opening stock: ${inv.item.name}`,
      debit: inv.quantity * inv.item.cost,
      credit: 0,
    }));

    // Add a single credit line to Retained Earnings account for total value
    const totalValue = newLines.reduce((sum, l) => sum + l.debit, 0);
    newLines.push({
      id: "re",
      account_id: "", // Select Retained Earnings account here
      description: "Opening stock - Retained Earnings",
      debit: 0,
      credit: totalValue,
    });

    setLines(newLines);
    toast.success(`Generated opening stock for ${inventoryItems.length} items`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
        </div>
        <Button onClick={() => createEntry.mutate()} disabled={!isBalanced || createEntry.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {createEntry.isPending ? "Saving..." : "Save Entry"}
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
              <Label>Select Store</Label>
              <Select value={selectedStoreId} onValueChange={(v) => setSelectedStoreId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="mt-2" onClick={generateOpeningStock}>
                Generate Opening Stock
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter journal entry description..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Journal Lines</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-2" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Account</TableHead>
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
                    <Select value={line.account_id} onValueChange={(value) => updateLine(line.id, "account_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      placeholder="Line description"
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
                      placeholder="0.00"
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
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 2}
                    >
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
