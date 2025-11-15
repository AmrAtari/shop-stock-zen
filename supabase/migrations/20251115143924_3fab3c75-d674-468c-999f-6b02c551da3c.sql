-- Create function to update shipped quantities to match approved quantities
CREATE OR REPLACE FUNCTION update_shipped_quantities(p_transfer_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.transfer_items
  SET shipped_quantity = COALESCE(approved_quantity, requested_quantity)
  WHERE transfer_id = p_transfer_id;
END;
$$;