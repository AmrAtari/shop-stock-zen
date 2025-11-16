-- Create accounting tables

-- Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
  parent_account_id UUID REFERENCES public.accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  entry_type TEXT NOT NULL DEFAULT 'manual' CHECK (entry_type IN ('manual', 'auto', 'adjustment', 'closing')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  reference_type TEXT,
  reference_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  description TEXT,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Accounts Payable
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency_id UUID REFERENCES public.currency_(id),
  total_amount NUMERIC(15,2) NOT NULL,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'cancelled')),
  payment_terms TEXT,
  notes TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts Receivable
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES public.customers(id),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency_id UUID REFERENCES public.currency_(id),
  total_amount NUMERIC(15,2) NOT NULL,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'cancelled')),
  payment_terms TEXT,
  notes TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'other')),
  amount NUMERIC(15,2) NOT NULL,
  currency_id UUID REFERENCES public.currency_(id),
  reference_number TEXT,
  description TEXT,
  bank_account_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment Allocations (links payments to bills/invoices)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES public.accounts_payable(id),
  invoice_id UUID REFERENCES public.accounts_receivable(id),
  allocated_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_bill_or_invoice CHECK (
    (bill_id IS NOT NULL AND invoice_id IS NULL) OR 
    (invoice_id IS NOT NULL AND bill_id IS NULL)
  )
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'other')),
  currency_id UUID REFERENCES public.currency_(id),
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  gl_account_id UUID REFERENCES public.accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  statement_date DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL,
  book_balance NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank Reconciliation Items
CREATE TABLE IF NOT EXISTS public.bank_reconciliation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  transaction_date DATE NOT NULL,
  description TEXT,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON public.accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_ap_supplier ON public.accounts_payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ap_status ON public.accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_dates ON public.accounts_payable(bill_date, due_date);
CREATE INDEX IF NOT EXISTS idx_ar_customer ON public.accounts_receivable(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON public.bank_reconciliations(bank_account_id);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Authenticated users can view accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update accounts"
  ON public.accounts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete accounts"
  ON public.accounts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for journal_entries
CREATE POLICY "Authenticated users can view journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own draft entries"
  ON public.journal_entries FOR UPDATE
  USING (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can update any journal entry"
  ON public.journal_entries FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for journal_entry_lines
CREATE POLICY "Authenticated users can view journal entry lines"
  ON public.journal_entry_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert journal entry lines"
  ON public.journal_entry_lines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update journal entry lines"
  ON public.journal_entry_lines FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete journal entry lines"
  ON public.journal_entry_lines FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for accounts_payable
CREATE POLICY "Authenticated users can view AP"
  ON public.accounts_payable FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create AP"
  ON public.accounts_payable FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update AP"
  ON public.accounts_payable FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for accounts_receivable
CREATE POLICY "Authenticated users can view AR"
  ON public.accounts_receivable FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create AR"
  ON public.accounts_receivable FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update AR"
  ON public.accounts_receivable FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for payment_allocations
CREATE POLICY "Authenticated users can view payment allocations"
  ON public.payment_allocations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create payment allocations"
  ON public.payment_allocations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for bank_accounts
CREATE POLICY "Authenticated users can view bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bank_reconciliations
CREATE POLICY "Authenticated users can view reconciliations"
  ON public.bank_reconciliations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage reconciliations"
  ON public.bank_reconciliations FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for bank_reconciliation_items
CREATE POLICY "Authenticated users can view reconciliation items"
  ON public.bank_reconciliation_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage reconciliation items"
  ON public.bank_reconciliation_items FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Insert default accounts for a basic chart of accounts
INSERT INTO public.accounts (account_code, account_name, account_type, description) VALUES
-- Assets
('1000', 'Cash', 'asset', 'Cash on hand and in banks'),
('1100', 'Accounts Receivable', 'asset', 'Money owed by customers'),
('1200', 'Inventory', 'asset', 'Merchandise inventory'),
('1500', 'Fixed Assets', 'asset', 'Property, plant, and equipment'),
-- Liabilities
('2000', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
('2100', 'Sales Tax Payable', 'liability', 'Sales tax collected'),
('2200', 'Loans Payable', 'liability', 'Bank loans and financing'),
-- Equity
('3000', 'Owner''s Equity', 'equity', 'Owner''s investment'),
('3100', 'Retained Earnings', 'equity', 'Accumulated profits'),
-- Revenue
('4000', 'Sales Revenue', 'revenue', 'Revenue from sales'),
('4100', 'Service Revenue', 'revenue', 'Revenue from services'),
-- Cost of Goods Sold
('5000', 'Cost of Goods Sold', 'cogs', 'Direct costs of inventory sold'),
-- Expenses
('6000', 'Rent Expense', 'expense', 'Store and office rent'),
('6100', 'Salaries Expense', 'expense', 'Employee salaries and wages'),
('6200', 'Utilities Expense', 'expense', 'Electricity, water, internet'),
('6300', 'Marketing Expense', 'expense', 'Advertising and promotion'),
('6400', 'Office Supplies', 'expense', 'Office supplies and consumables')
ON CONFLICT (account_code) DO NOTHING;