import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Assuming this hook is available and provides store data
import { useStores } from "@/hooks/usePhysicalInventorySessions";

// --- ZOD Schema ---
const piSchema = z.object({
  countDate: z.string().min(1, "Count date is required"),
  // Adjusted storeId to be required for a count session
  storeId: z.string().min(1, "Store is required"),
  countType: z.enum(["full", "partial", "cycle"]),
  responsiblePerson: z.string().min(1, "Responsible person is required"),
  department: z.string().optional(),
  purpose: z.string().optional(),
  locationFilter: z.string().optional(),
  expectedItems: z.string().optional(),
  notes: z.string().optional(), // Added 'notes' to schema to match the field usage
});

type PhysicalInventoryFormData = z.infer<typeof piSchema>;

// --- Component ---
const PhysicalInventoryNew: React.FC = () => {
  const navigate = useNavigate();
  const { data: stores, isLoading: isLoadingStores } = useStores();

  const form = useForm<PhysicalInventoryFormData>({
    resolver: zodResolver(piSchema),
    defaultValues: {
      countDate: new Date().toISOString().split("T")[0],
      storeId: undefined, // Let Select handle initial state
      countType: "full",
      responsiblePerson: "",
      department: "",
      purpose: "",
      locationFilter: "",
      expectedItems: "",
      notes: "",
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: PhysicalInventoryFormData, startCounting: boolean) => {
    // Determine status based on the button clicked
    const status = startCounting ? "Counting" : "Draft";

    // Simple way to generate a session number (e.g., PI-YYYYMMDD-ID)
    const session_number = `PI-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newSession = {
      session_number,
      store_id: data.storeId,
      count_date: data.countDate,
      count_type: data.countType,
      responsible_person: data.responsiblePerson,
      status: status,
      notes: data.notes,
      // Include other fields like department, purpose, etc. if needed in DB
    };

    try {
      const { data: insertedData, error } = await supabase
        .from("physical_inventory_sessions")
        .insert(newSession)
        .select("id")
        .single();

      if (error) throw error;

      toast.success(`Inventory session ${session_number} created as ${status}.`);

      // Navigate to the detail page for counting or back to the list
      if (startCounting) {
        navigate(`/inventory/physical/${insertedData.id}`);
      } else {
        navigate(`/inventory/physical`);
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(`Failed to create session: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/inventory/physical")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sessions
      </Button>

      <h1 className="text-3xl font-bold">New Physical Inventory Count</h1>

      <Form {...form}>
        <form className="space-y-6">
          {/* General Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>Configure the basic parameters for this count session.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Count Date */}
              <FormField
                control={form.control}
                name="countDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsible Person */}
              <FormField
                control={form.control}
                name="responsiblePerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter count manager's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Store ID (Select) - Simplified to fix layout */}
              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store/Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStores}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a store/location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Assuming stores is an array of { id: string, name: string } */}
                        {stores?.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department (Input) */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Count Type Card */}
          <Card>
            <CardHeader>
              <CardTitle>Scope and Type</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Count Type (Radio Group) - Simplified to fix layout */}
              <FormField
                control={form.control}
                name="countType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Type of Count</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full" />
                          </FormControl>
                          <FormLabel className="font-normal">Full Inventory (All Items)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="partial" />
                          </FormControl>
                          <FormLabel className="font-normal">Partial Count (Specific Areas/Items)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="cycle" />
                          </FormControl>
                          <FormLabel className="font-normal">Cycle Count (Ongoing Small Counts)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Filter (Textarea) */}
              <FormField
                control={form.control}
                name="locationFilter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Filter (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Aisle 5, Section B, Shelf 3..." {...field} rows={4} />
                    </FormControl>
                    <FormDescription>Specify locations to include/exclude for a partial count.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purpose (Input) */}
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Annual audit, Damage check" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes" // Using 'notes' to match the schema
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes/Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Special instructions or notes for this count session..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/inventory/physical")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit((data) => handleSubmit(data, false))}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit((data) => handleSubmit(data, true))}
              disabled={isSubmitting}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Counting
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PhysicalInventoryNew;
