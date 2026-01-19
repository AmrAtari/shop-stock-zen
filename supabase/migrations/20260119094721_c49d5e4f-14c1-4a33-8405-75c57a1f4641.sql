-- This migration changes cashier_id from UUID to TEXT to allow text-based cashier identifiers
-- Step 1: Drop views that depend on these columns (using CASCADE)
DROP VIEW IF EXISTS v_pos_receipts_report CASCADE;
DROP VIEW IF EXISTS v_items_sold_report CASCADE;
DROP VIEW IF EXISTS v_sales_report CASCADE;
DROP VIEW IF EXISTS v_inventory_turnover_report CASCADE;
DROP VIEW IF EXISTS v_profit_margin_report CASCADE;
DROP VIEW IF EXISTS v_refunds_report CASCADE;
DROP VIEW IF EXISTS v_payment_methods_report CASCADE;
DROP VIEW IF EXISTS v_cashier_performance_report CASCADE;
DROP VIEW IF EXISTS v_daily_pos_summary CASCADE;
DROP VIEW IF EXISTS v_item_lifecycle_report CASCADE;