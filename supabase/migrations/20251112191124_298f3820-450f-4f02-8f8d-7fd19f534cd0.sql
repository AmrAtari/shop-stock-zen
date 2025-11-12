-- Add unique constraint on store_inventory to enable ON CONFLICT upsert
ALTER TABLE public.store_inventory 
ADD CONSTRAINT store_inventory_item_store_unique 
UNIQUE (item_id, store_id);