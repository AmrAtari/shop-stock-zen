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
import { useStores } from "@/hooks/usePhysicalInventorySessions";

const piSchema = z.object({
  countDate: z.string().min(1, "Count date is required"),
  storeId: z.string().optional(),
  countType: z.enum(["full", "partial", "cycle"]),
  responsiblePerson: z.string().min(1, "Responsible person is required"),
  department: z.string().optional(),
  purpose: z.string().optional(),
  locationFilter: z.string().optional(),
  expectedItems: z.string().optional(),
  notes: z.string().optional(),
});

type PIFormValues = z.infer<typeof piSchema>;

const PhysicalInventoryNew = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: stores = [] } = useStores();

  const form = useForm<PIFormValues>({
    resolver: zodResolver(piSchema),
    defaultValues: {
      countDate: new Date().toISOString().split("T")[0],
      countType: "full",
      responsiblePerson: "",
      department: "",
      purpose: "",
      locationFilter: "",
      expectedItems: "",
      notes: "",
    },
  });

  const handleSubmit = async (values: PIFormValues, startCounting: boolean) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate session number from your types.ts function
      const { data: sessionNumberData, error: funcError } = await supabase.rpc("generate_pi_session_number");
      if (funcError) throw funcError;

      const sessionNumber = sessionNumberData as string;

      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .insert({
          session_number: sessionNumber,
          started_by: user.id,
          status: startCounting ? "in_progress" : "draft",
          store_id: values.storeId || null,
          count_date: values.countDate,
          count_type: values.countType,
          responsible_person: values.responsiblePerson,
          department: values.department || null,
          purpose: values.purpose || null,
          location_filter: values.locationFilter || null,
          expected_items: values.expectedItems ? parseInt(values.expectedItems) : null,
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        startCounting ? `Session ${data.session_number} started` : `Session ${data.session_number} saved as draft`,
      );

      if (startCounting) {
        navigate(`/inventory/physical/${data.id}`);
      } else {
        navigate("/inventory/physical");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/inventory/physical")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sessions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Physical Count</h1>
          <p className="text-muted-foreground mt-1">Create a new physical inventory session</p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Session Identification & Details</CardTitle>
              <CardDescription>Basic information about this physical count session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="countDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Count Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store/Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} {store.location && `- ${store.location}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="countType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Type *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="full" id="full" />
                          <Label htmlFor="full" className="cursor-pointer">
                            Full Count
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="partial" id="partial" />
                          <Label htmlFor="partial" className="cursor-pointer">
                            Partial Count
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cycle" id="cycle" />
                          <Label htmlFor="cycle" className="cursor-pointer">
                            Cycle Count
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>Choose the type of inventory count you want to perform</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse, Retail" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationFilter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Location/Zone</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse A - Zone 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expectedItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Item Count</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Approximate number of items" {...field} />
                    </FormControl>
                    <FormDescription>Optional - helps track progress during counting</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Purpose & Responsible Person */}
          <Card>
            <CardHeader>
              <CardTitle>2. Count Purpose & Personnel</CardTitle>
              <CardDescription>Who is conducting the count and why</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="routine">Routine Count</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                        <SelectItem value="investigation">Investigation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsiblePerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate("/inventory/physical")}>
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={form.handleSubmit((values) => handleSubmit(values, false))}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button disabled={isSubmitting} onClick={form.handleSubmit((values) => handleSubmit(values, true))}>
              <PlayCircle className="w-4 h-4 mr-2" /> Start Counting
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PhysicalInventoryNew;
