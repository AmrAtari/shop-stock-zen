import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCustomer } from "@/hooks/useCustomers";
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
import { ArrowLeft, Save } from "lucide-react";

const CustomerNew = () => {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    customer_code: "",
    company_name: "",
    tax_id: "",
    credit_limit: 0,
    customer_type: "retail",
    status: "active",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(form, {
      onSuccess: () => navigate("/crm/customers"),
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "credit_limit" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/customers")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Customer</h1>
          <p className="text-muted-foreground">Add a new customer to your database</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_code">Customer Code</Label>
                  <Input
                    id="customer_code"
                    name="customer_code"
                    value={form.customer_code}
                    onChange={handleChange}
                    placeholder="e.g., CUST-001"
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Select
                    value={form.customer_type}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, customer_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    name="tax_id"
                    value={form.tax_id}
                    onChange={handleChange}
                    placeholder="Tax identification number"
                  />
                </div>
                <div>
                  <Label htmlFor="credit_limit">Credit Limit</Label>
                  <Input
                    id="credit_limit"
                    name="credit_limit"
                    type="number"
                    value={form.credit_limit}
                    onChange={handleChange}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Full address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional notes about the customer..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/crm/customers")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomer.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {createCustomer.isPending ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomerNew;
