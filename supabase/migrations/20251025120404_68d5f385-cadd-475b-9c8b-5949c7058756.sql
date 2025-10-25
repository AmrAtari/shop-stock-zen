-- Create store_inventory table for per-store inventory tracking
CREATE TABLE IF NOT EXISTS public.store_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  last_restocked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, store_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_inventory_item ON public.store_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_quantity ON public.store_inventory(quantity);

-- Enable RLS
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view store inventory"
ON public.store_inventory
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert store inventory"
ON public.store_inventory
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update store inventory"
ON public.store_inventory
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete store inventory"
ON public.store_inventory
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create view for stock levels with item and store details
CREATE OR REPLACE VIEW public.v_store_stock_levels AS
SELECT 
  si.id,
  si.item_id,
  si.store_id,
  si.quantity,
  si.min_stock,
  si.last_restocked,
  i.sku,
  i.name AS item_name,
  s.name AS store_name,
  i.category,
  i.brand,
  i.unit
FROM public.store_inventory si
JOIN public.items i ON i.id = si.item_id
JOIN public.stores s ON s.id = si.store_id;

-- Function to update global inventory when store inventory changes
CREATE OR REPLACE FUNCTION public.update_global_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.items 
    SET quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM public.store_inventory 
      WHERE item_id = OLD.item_id
    )
    WHERE id = OLD.item_id;
    RETURN OLD;
  ELSE
    UPDATE public.items 
    SET quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM public.store_inventory 
      WHERE item_id = NEW.item_id
    )
    WHERE id = NEW.item_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update global inventory
DROP TRIGGER IF EXISTS trg_update_global_inventory ON public.store_inventory;
CREATE TRIGGER trg_update_global_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.store_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_global_inventory();

-- Add store_id to stock_adjustments for tracking store-specific adjustments
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_store ON public.stock_adjustments(store_id);

-- Trigger for updating updated_at timestamp
DROP TRIGGER IF EXISTS update_store_inventory_updated_at ON public.store_inventory;
CREATE TRIGGER update_store_inventory_updated_at
BEFORE UPDATE ON public.store_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for store_inventory
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_inventory;