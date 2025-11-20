import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const JournalEntryNew = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [entryType, setEntryType] = useState("manual");
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get the logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else navigate("/auth"); // redirect if not logged in
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return toast.error("User not authenticated.");

    if (totalDebit !== totalCredit) {
      return toast.error(`Entry is unbalanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`);
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("journal_entries").insert({
        entry_number: entryNumber,
        entry_date: entryDate,
        description,
        entry_type: entryType,
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: userId, // ✅ Automatically set the logged-in user
        status: "draft",
      });

      if (error) throw error;

      toast.success("Journal entry created successfully!");
      navigate("/accounting/journal-entries");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create journal entry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>New Journal Entry</CardTitle>
          <CardDescription>Fill in the details to create a new journal entry</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label>Entry Number</label>
              <Input
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                placeholder="e.g., JE-1763623695747"
                required
              />
            </div>
            <div className="space-y-2">
              <label>Date</label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label>Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                required
              />
            </div>
            <div className="space-y-2">
              <label>Type</label>
              <Input
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                placeholder="manual, adjustment, etc."
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label>Total Debit</label>
                <Input
                  type="number"
                  value={totalDebit}
                  onChange={(e) => setTotalDebit(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <label>Total Credit</label>
                <Input
                  type="number"
                  value={totalCredit}
                  onChange={(e) => setTotalCredit(parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
