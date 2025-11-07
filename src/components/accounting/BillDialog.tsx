import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/queryKeys";
import { VendorBill } from "@/hooks/useAccountsPayable";

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: VendorBill | null;
  onSubmit: (data: Partial<VendorBill>) => void;
}

export const BillDialog = ({ open, onOpenChange, bill, onSubmit }: BillDialogProps) => {
  const [formData, setFormData] = useState({
    supplier_id: "",
    bill_date: "",
    due_date: "",
    total_amount: "",
    currency_id: "USD",
    payment_terms: "",
    notes: "",
  });

  const { data: suppliers } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currency_")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (bill) {
      setFormData({
        supplier_id: bill.supplier_id,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        total_amount: bill.total_amount.toString(),
        currency_id: bill.currency_id,
        payment_terms: bill.payment_terms || "",
        notes: bill.notes || "",
      });
    } else {
      setFormData({
        supplier_id: "",
        bill_date: new Date().toISOString().split("T")[0],
        due_date: "",
        total_amount: "",
        currency_id: "USD",
        payment_terms: "",
        notes: "",
      });
    }
  }, [bill, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const totalAmount = parseFloat(formData.total_amount);

    onSubmit({
      supplier_id: formData.supplier_id,
      bill_date: formData.bill_date,
      due_date: formData.due_date,
      total_amount: totalAmount,
      paid_amount: bill?.paid_amount || 0,
      balance: totalAmount - (bill?.paid_amount || 0),
      currency_id: formData.currency_id,
      exchange_rate: 1.0,
      status: bill?.status || "draft",
      payment_terms: formData.payment_terms,
      notes: formData.notes,
      created_by: user.user.id,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{bill ? "Edit Bill" : "Create New Bill"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency_id}
                onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies?.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bill_date">Bill Date *</Label>
              <Input
                id="bill_date"
                type="date"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_amount">Total Amount *</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="e.g., Net 30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {bill ? "Update Bill" : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
