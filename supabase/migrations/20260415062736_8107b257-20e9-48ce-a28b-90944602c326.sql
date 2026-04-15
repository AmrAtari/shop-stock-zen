ALTER TABLE public.store_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE OR REPLACE TRIGGER update_store_inventory_updated_at
BEFORE UPDATE ON public.store_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();