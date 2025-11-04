-- Enable RLS on the view (views inherit from base tables, but we can add policies)
-- Grant SELECT on the view to authenticated users
GRANT SELECT ON v_store_stock_levels TO authenticated;
GRANT SELECT ON v_store_stock_levels TO anon;