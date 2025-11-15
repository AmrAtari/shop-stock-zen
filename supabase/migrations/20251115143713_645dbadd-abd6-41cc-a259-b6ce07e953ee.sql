-- Enhance transfers table for professional workflow
ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS transfer_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status to use more descriptive values
COMMENT ON COLUMN public.transfers.status IS 'Values: requested, approved, in_transit, received, cancelled';

-- Update transfer_items to work with items (not variants)
DROP TABLE IF EXISTS public.transfer_items CASCADE;
CREATE TABLE public.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id INTEGER NOT NULL REFERENCES public.transfers(transfer_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  requested_quantity INTEGER NOT NULL DEFAULT 0,
  approved_quantity INTEGER,
  shipped_quantity INTEGER,
  received_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_from_store ON public.transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_store ON public.transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON public.transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_item ON public.transfer_items(item_id);

-- Function to generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN transfer_number ~ ('^TR-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(transfer_number FROM LENGTH('TR-' || year_part || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM public.transfers;
  
  RETURN 'TR-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- RLS policies for transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transfers involving their store" ON public.transfers;
CREATE POLICY "Users can view transfers involving their store"
ON public.transfers FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create transfer requests" ON public.transfers;
CREATE POLICY "Users can create transfer requests"
ON public.transfers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND requested_by = auth.uid());

DROP POLICY IF EXISTS "Users can update transfers they're involved in" ON public.transfers;
CREATE POLICY "Users can update transfers they're involved in"
ON public.transfers FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'inventory_man'::app_role) OR
    requested_by = auth.uid()
  )
);

-- RLS policies for transfer_items
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transfer items" ON public.transfer_items;
CREATE POLICY "Users can view transfer items"
ON public.transfer_items FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage transfer items" ON public.transfer_items;
CREATE POLICY "Users can manage transfer items"
ON public.transfer_items FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'inventory_man'::app_role)
  )
);

-- Trigger to update inventory when transfer is received
CREATE OR REPLACE FUNCTION handle_transfer_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only process when status changes to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Update inventory for all items in this transfer
    FOR item IN 
      SELECT item_id, received_quantity 
      FROM public.transfer_items 
      WHERE transfer_id = NEW.transfer_id AND received_quantity > 0
    LOOP
      -- Decrease from source store
      UPDATE public.store_inventory
      SET quantity = quantity - item.received_quantity
      WHERE item_id = item.item_id AND store_id = NEW.from_store_id;
      
      -- Increase at destination store
      INSERT INTO public.store_inventory (item_id, store_id, quantity, qty_on_order)
      VALUES (item.item_id, NEW.to_store_id, item.received_quantity, 0)
      ON CONFLICT (item_id, store_id)
      DO UPDATE SET quantity = store_inventory.quantity + item.received_quantity;
    END LOOP;
    
    NEW.received_at := NOW();
    NEW.received_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transfer_receive ON public.transfers;
CREATE TRIGGER trg_transfer_receive
BEFORE UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION handle_transfer_receive();