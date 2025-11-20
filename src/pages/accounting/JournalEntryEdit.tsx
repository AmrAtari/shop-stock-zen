import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const JournalEntryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: entry, isLoading } = useQuery({
    queryKey: ["journal_entry", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*").eq("id", id).single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Journal Entry: {entry?.entry_number}</h1>
        <div></div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is the placeholder for the Journal Entry Edit page. You will implement the form submission logic here.
          </p>
          <div className="mt-4 p-4 border rounded-lg">
            <p>
              <strong>Entry Number:</strong> {entry?.entry_number}
            </p>
            <p>
              <strong>Description:</strong> {entry?.description}
            </p>
            <p>
              <strong>Status:</strong> {entry?.status}
            </p>
            <p>
              <strong>Total Debit:</strong> {entry?.total_debit}
            </p>
            <p>
              <strong>Total Credit:</strong> {entry?.total_credit}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryEdit;
