-- Add foreign key constraint from vendor_bills to suppliers
ALTER TABLE public.vendor_bills
ADD CONSTRAINT vendor_bills_supplier_id_fkey
FOREIGN KEY (supplier_id)
REFERENCES public.suppliers(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier_id ON public.vendor_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON public.vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_date ON public.vendor_bills(due_date);