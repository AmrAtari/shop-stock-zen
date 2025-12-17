import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateSalesOrder, SalesOrderItem } from "@/hooks/useSalesOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useStores } from "@/hooks/usePurchaseOrders";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem extends Partial<SalesOrderItem> {
  tempId: string;
}

export default function SalesOrderNew() {
  const navigate = useNavigate();
  const { formatCurrency } = useSystemSettings();
  const createOrder = useCreateSalesOrder();
  const { data: customers } = useCustomers();
  const { data: stores } = useStores();

  const [formData, setFormData] = useState({
    customer_id: "",
    store_id: "",
    order_type: "sales_order",
    expected_delivery: "",
    payment_terms: "",
    shipping_address: "",
    billing_address: "",
    notes: "",
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemSku, setNewItemSku] = useState("");

  const addItem = async () => {
    if (!newItemSku.trim()) return;

    const { data: item } = await supabase
      .from("items")
      .select("id, sku, name, price")
      .eq("sku", newItemSku.trim())
      .single();

    if (item) {
      setItems([
        ...items,
        {
          tempId: crypto.randomUUID(),
          item_id: item.id,
          sku: item.sku,
          item_name: item.name,
          quantity: 1,
          unit_price: item.price,
          discount_percentage: 0,
          tax_rate: 0,
          line_total: item.price,
        },
      ]);
      setNewItemSku("");
    }
  };

  const updateItem = (tempId: string, field: string, value: number) => {
    setItems(
      items.map((item) => {
        if (item.tempId === tempId) {
          const updated = { ...item, [field]: value };
          const quantity = updated.quantity || 0;
          const unitPrice = updated.unit_price || 0;
          const discount = updated.discount_percentage || 0;
          updated.line_total = quantity * unitPrice * (1 - discount / 100);
          return updated;
        }
        return item;
      })
    );
  };

  const removeItem = (tempId: string) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const taxAmount = items.reduce(
    (sum, item) =>
      sum + ((item.line_total || 0) * (item.tax_rate || 0)) / 100,
    0
  );
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createOrder.mutateAsync({
      customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
      store_id: formData.store_id || null,
      order_type: formData.order_type,
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery: formData.expected_delivery || null,
      payment_terms: formData.payment_terms || null,
      shipping_address: formData.shipping_address || null,
      billing_address: formData.billing_address || null,
      notes: formData.notes || null,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      status: "draft",
      items: items.map(({ tempId, ...item }) => item),
    });

    navigate("/sales/orders");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sales Order</h1>
          <p className="text-muted-foreground">Create a new sales order or quotation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select
                  value={formData.order_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, order_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotation">Quotation</SelectItem>
                    <SelectItem value="sales_order">Sales Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customer_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Store</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, store_id: value })
                  }
                >
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
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_delivery: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: e.target.value })
                  }
                  placeholder="e.g., Net 30"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Shipping Address</Label>
                <Textarea
                  value={formData.shipping_address}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={formData.billing_address}
                  onChange={(e) =>
                    setFormData({ ...formData, billing_address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter SKU to add item"
                value={newItemSku}
                onChange={(e) => setNewItemSku(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
              />
              <Button type="button" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-32">Unit Price</TableHead>
                  <TableHead className="w-24">Discount %</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No items added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.tempId}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.tempId, "quantity", parseInt(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.tempId, "unit_price", parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discount_percentage}
                          onChange={(e) =>
                            updateItem(
                              item.tempId,
                              "discount_percentage",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.line_total || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.tempId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
