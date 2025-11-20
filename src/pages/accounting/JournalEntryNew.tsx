import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const JournalEntryNew = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [entryType, setEntryType] = useState("manual");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch stores for dropdown
  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) return toast.error("Failed to fetch stores");
      setStores(data || []);
      if (data?.length) setStoreId(data[0].id);
    };
    fetchStores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get the logged-in user for created_by
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) throw new Error("User not authenticated");

      // Insert new journal entry
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          description,
          entry_type: entryType,
          store_id: storeId,
          status: "draft",
          created_by: user.id, // automatically assigned
          entry_number: `JE-${Date.now()}`, // example auto-generate
          entry_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Journal entry created successfully!");
      navigate(`/accounting/journal-entries/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create entry");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="description">Description</label>
              <Input
                id="description"
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="entryType">Entry Type</label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="store">Store</label>
              <Select value={storeId || ""} onValueChange={setStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
