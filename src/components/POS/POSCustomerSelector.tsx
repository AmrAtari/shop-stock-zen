import { useState, useEffect } from "react";
import { Search, UserPlus, User, Star, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface POSCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  customer_type: string;
  credit_limit: number;
  outstanding_balance: number;
}

interface POSCustomerSelectorProps {
  selectedCustomer: POSCustomer | null;
  onSelectCustomer: (customer: POSCustomer | null) => void;
}

export function POSCustomerSelector({ selectedCustomer, onSelectCustomer }: POSCustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["pos-customers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, email, phone, loyalty_points, customer_type, credit_limit, outstanding_balance")
        .eq("status", "active")
        .order("name")
        .limit(20);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as POSCustomer[];
    },
  });

  const handleSelectCustomer = (customer: POSCustomer) => {
    onSelectCustomer(customer);
    setOpen(false);
    toast.success(`Customer selected: ${customer.name}`);
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
    toast.info("Customer removed from transaction");
  };

  return (
    <div className="space-y-2">
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground">{selectedCustomer.name}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  {selectedCustomer.loyalty_points || 0} pts
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClearCustomer}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start">
                <Search className="h-4 w-4 mr-2" />
                Search Customer...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search by name, phone, or email..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "Searching..." : "No customers found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.phone || ""}`}
                        onSelect={() => handleSelectCustomer(customer)}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {customer.phone || customer.email || "No contact"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1 text-yellow-500" />
                            {customer.loyalty_points || 0}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <QuickAddCustomerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCustomerCreated={(customer) => {
          onSelectCustomer(customer);
          setShowAddDialog(false);
          queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
        }}
      />
    </div>
  );
}

// Quick Add Customer Dialog
interface QuickAddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: POSCustomer) => void;
}

function QuickAddCustomerDialog({ open, onOpenChange, onCustomerCreated }: QuickAddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          customer_type: "retail",
          status: "active",
          loyalty_points: 0,
          credit_limit: 0,
          outstanding_balance: 0,
        })
        .select("id, name, email, phone, loyalty_points, customer_type, credit_limit, outstanding_balance")
        .single();

      if (error) throw error;

      toast.success(`Customer "${name}" created successfully`);
      onCustomerCreated(data as POSCustomer);

      // Reset form
      setName("");
      setPhone("");
      setEmail("");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create customer: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Add Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Name *</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Creating..." : "Create Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
