-- Add foreign key constraint between items.supplier and suppliers.id
ALTER TABLE public.items
ADD CONSTRAINT items_supplier_fkey 
FOREIGN KEY (supplier) 
REFERENCES public.suppliers(id)
ON DELETE SET NULL;