import { useParams, useNavigate } from "react-router-dom";
import {
  useCustomer,
  useCustomerContacts,
  useCustomerPurchaseHistory,
} from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Star,
  User,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { format } from "date-fns";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSystemSettings();
  const customerId = id ? parseInt(id) : undefined;

  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: contacts } = useCustomerContacts(customerId);
  const { data: purchaseHistory } = useCustomerPurchaseHistory(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading customer...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  const totalPurchases = purchaseHistory?.reduce(
    (sum, t) => sum + (t.total_amount || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/customers")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
            {customer.company_name && (
              <p className="text-muted-foreground">{customer.company_name}</p>
            )}
          </div>
        </div>
        <Button onClick={() => navigate(`/crm/customers/${id}/edit`)}>
          <Pencil className="w-4 h-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Limit</p>
                <p className="text-xl font-bold">{formatCurrency(customer.credit_limit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Building2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold">{formatCurrency(customer.outstanding_balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-xl font-bold">{formatCurrency(totalPurchases)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Star className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-xl font-bold">{customer.loyalty_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Code</p>
                    <p className="font-medium">{customer.customer_code || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="capitalize">
                      {customer.customer_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={customer.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {customer.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{customer.tax_id || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <span>{customer.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Persons</CardTitle>
            </CardHeader>
            <CardContent>
              {!contacts?.length ? (
                <p className="text-muted-foreground text-center py-4">No contacts added</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.contact_name}</TableCell>
                        <TableCell>{contact.position || "—"}</TableCell>
                        <TableCell>{contact.email || "—"}</TableCell>
                        <TableCell>{contact.phone || "—"}</TableCell>
                        <TableCell>
                          {contact.is_primary && <Badge variant="default">Primary</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {!purchaseHistory?.length ? (
                <p className="text-muted-foreground text-center py-4">No purchase history</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{transaction.transaction_items?.length || 0} items</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetail;
