-- Add all missing role values to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'inventory_man';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cashier';