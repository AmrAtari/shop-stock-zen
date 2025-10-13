-- Extend suppliers table with contact details
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Extend purchase_orders table with comprehensive fields
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS order_date timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS buyer_company_name text,
  ADD COLUMN IF NOT EXISTS buyer_address text,
  ADD COLUMN IF NOT EXISTS buyer_contact text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS supplier_contact_person text,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'AED')),
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS fob_terms text,
  ADD COLUMN IF NOT EXISTS special_instructions text,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_charges numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS authorized_by uuid REFERENCES auth.users(id);

-- Extend purchase_order_items table with item details
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS item_description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS model_number text,
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';

-- Create function to generate PO number in format: PO-SupplierName-0001
CREATE OR REPLACE FUNCTION generate_po_number(supplier_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_sequence integer;
  next_sequence integer;
  po_prefix text;
  clean_supplier text;
BEGIN
  -- Clean supplier name: uppercase, replace spaces/special chars with dash
  clean_supplier := REGEXP_REPLACE(UPPER(supplier_name), '[^A-Z0-9]+', '-', 'g');
  clean_supplier := TRIM(BOTH '-' FROM clean_supplier);
  
  -- Create prefix
  po_prefix := 'PO-' || clean_supplier || '-';
  
  -- Get the last sequence number for this supplier
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN po_number ~ ('^' || po_prefix || '[0-9]+$')
        THEN CAST(SUBSTRING(po_number FROM LENGTH(po_prefix) + 1) AS integer)
        ELSE 0
      END
    ),
    0
  ) INTO last_sequence
  FROM purchase_orders
  WHERE po_number LIKE po_prefix || '%';
  
  -- Increment sequence
  next_sequence := last_sequence + 1;
  
  -- Return formatted PO number with 4-digit padding
  RETURN po_prefix || LPAD(next_sequence::text, 4, '0');
END;
$$;