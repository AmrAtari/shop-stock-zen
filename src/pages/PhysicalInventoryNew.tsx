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
import { Form, FormControl, FormMessage, FormItem, FormLabel } from "@/components/ui/form";
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

      // Generate session number via RPC
      const { data: sessionNumber, error: funcError } = await supabase.rpc("generate_pi_session_number");
      if (funcError) throw funcError;

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

      navigate(startCounting ? `/inventory/physical/${data.id}` : "/inventory/physical");
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
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>1. Session Identification & Details</CardTitle>
              <CardDescription>Basic information about this physical count session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Count Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...form.register("countDate")} />
                  </FormControl>
                  <FormMessage>{form.formState.errors.countDate?.message}</FormMessage>
                </FormItem>

                <FormItem>
                  <FormLabel>Store/Location</FormLabel>
                  <FormControl>
                    <Select
                      value={form.getValues("storeId") || ""}
                      onValueChange={(val) => form.setValue("storeId", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                            {store.location ? ` - ${store.location}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormItem>
                <FormLabel>Count Type *</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={form.getValues("countType")}
                    onValueChange={(val) => form.setValue("countType", val as any)}
                    className="flex gap-4"
                  >
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
                <FormMessage />
              </FormItem>

              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Warehouse, Retail" {...form.register("department")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <FormItem>
                  <FormLabel>Specific Location/Zone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Warehouse A - Zone 3" {...form.register("locationFilter")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormItem>
                <FormLabel>Expected Item Count</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Approximate number of items" {...form.register("expectedItems")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </CardContent>
          </Card>

          {/* Purpose & Responsible */}
          <Card>
            <CardHeader>
              <CardTitle>2. Count Purpose & Personnel</CardTitle>
              <CardDescription>Who is conducting the count and why</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormControl>
                  <Select
                    value={form.getValues("purpose") || ""}
                    onValueChange={(val) => form.setValue("purpose", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual Count">Annual Count</SelectItem>
                      <SelectItem value="Monthly Reconciliation">Monthly Reconciliation</SelectItem>
                      <SelectItem value="Variance Investigation">Variance Investigation</SelectItem>
                      <SelectItem value="Pre-Audit">Pre-Audit</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Responsible Person *</FormLabel>
                <FormControl>
                  <Input placeholder="Name of person conducting the count" {...form.register("responsiblePerson")} />
                </FormControl>
                <FormMessage>{form.formState.errors.responsiblePerson?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Notes/Instructions</FormLabel>
                <FormControl>
                  <Textarea placeholder="Special instructions..." rows={4} {...form.register("notes")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/inventory/physical")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={form.handleSubmit((data) => handleSubmit(data, false))}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={form.handleSubmit((data) => handleSubmit(data, true))} disabled={isSubmitting}>
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
