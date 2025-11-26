export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          balance: number
          bill_date: string
          bill_number: string
          created_at: string
          created_by: string | null
          currency_id: string | null
          due_date: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number
          payment_terms: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance: number
          bill_date: string
          bill_number: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          due_date: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          supplier_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          balance?: number
          bill_date?: string
          bill_number?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          currency_id: string | null
          customer_id: number | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number
          payment_terms: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance: number
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          customer_id?: number | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          customer_id?: number | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          name: string
          table_name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          name: string
          table_name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          name?: string
          table_name?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_account_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: Database["public"]["Enums"]["bank_account_type"]
          address: string | null
          available_balance: number | null
          bank_name: string
          branch_code: string | null
          branch_name: string | null
          category_id: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          currency_id: string | null
          current_balance: number
          email: string | null
          gl_account_id: string | null
          iban: string | null
          id: string
          interest_rate: number | null
          is_active: boolean
          is_reconciled: boolean | null
          last_reconciliation_date: string | null
          ledger_balance: number | null
          minimum_balance: number | null
          notes: string | null
          opening_balance: number
          overdraft_limit: number | null
          phone: string | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: Database["public"]["Enums"]["bank_account_type"]
          address?: string | null
          available_balance?: number | null
          bank_name: string
          branch_code?: string | null
          branch_name?: string | null
          category_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          currency_id?: string | null
          current_balance?: number
          email?: string | null
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_reconciled?: boolean | null
          last_reconciliation_date?: string | null
          ledger_balance?: number | null
          minimum_balance?: number | null
          notes?: string | null
          opening_balance?: number
          overdraft_limit?: number | null
          phone?: string | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: Database["public"]["Enums"]["bank_account_type"]
          address?: string | null
          available_balance?: number | null
          bank_name?: string
          branch_code?: string | null
          branch_name?: string | null
          category_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          currency_id?: string | null
          current_balance?: number
          email?: string | null
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_reconciled?: boolean | null
          last_reconciliation_date?: string | null
          ledger_balance?: number | null
          minimum_balance?: number | null
          notes?: string | null
          opening_balance?: number
          overdraft_limit?: number | null
          phone?: string | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bank_account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliation_items: {
        Row: {
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          id: string
          is_reconciled: boolean
          journal_entry_id: string | null
          reconciliation_id: string
          transaction_date: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          is_reconciled?: boolean
          journal_entry_id?: string | null
          reconciliation_id: string
          transaction_date: string
        }
        Update: {
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          is_reconciled?: boolean
          journal_entry_id?: string | null
          reconciliation_id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_account_id: string
          book_balance: number
          created_at: string
          id: string
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          statement_balance: number
          statement_date: string
          status: string
        }
        Insert: {
          bank_account_id: string
          book_balance: number
          created_at?: string
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          statement_balance: number
          statement_date: string
          status?: string
        }
        Update: {
          bank_account_id?: string
          book_balance?: number
          created_at?: string
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          statement_balance?: number
          statement_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          bank_account_id: string
          created_at: string | null
          error_message: string | null
          file_format: string
          file_name: string
          id: string
          imported_at: string | null
          statement_period_end: string
          statement_period_start: string
          status: string | null
          transaction_count: number | null
        }
        Insert: {
          bank_account_id: string
          created_at?: string | null
          error_message?: string | null
          file_format: string
          file_name: string
          id?: string
          imported_at?: string | null
          statement_period_end: string
          statement_period_start: string
          status?: string | null
          transaction_count?: number | null
        }
        Update: {
          bank_account_id?: string
          created_at?: string | null
          error_message?: string | null
          file_format?: string
          file_name?: string
          id?: string
          imported_at?: string | null
          statement_period_end?: string
          statement_period_start?: string
          status?: string | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          bank_account_id: string
          category: string | null
          check_number: string | null
          counterparty: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          id: string
          is_reconciled: boolean | null
          reconciliation_id: string | null
          reference: string | null
          running_balance: number | null
          status: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string | null
          value_date: string
        }
        Insert: {
          bank_account_id: string
          category?: string | null
          check_number?: string | null
          counterparty?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          id?: string
          is_reconciled?: boolean | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          status?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string | null
          value_date: string
        }
        Update: {
          bank_account_id?: string
          category?: string | null
          check_number?: string | null
          counterparty?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          id?: string
          is_reconciled?: boolean | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          status?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_line_items: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          line_number: number
          line_total: number
          quantity: number
          unit_price: number
          vendor_bill_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          line_number: number
          line_total: number
          quantity: number
          unit_price: number
          vendor_bill_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          line_number?: number
          line_total?: number
          quantity?: number
          unit_price?: number
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_line_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_items_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          bank_account_id: string
          created_at: string | null
          id: string
          journal_entry_id: string
          payment_amount: number
          payment_date: string
          payment_method: string | null
          vendor_bill_id: string
        }
        Insert: {
          bank_account_id: string
          created_at?: string | null
          id?: string
          journal_entry_id: string
          payment_amount: number
          payment_date: string
          payment_method?: string | null
          vendor_bill_id: string
        }
        Update: {
          bank_account_id?: string
          created_at?: string | null
          id?: string
          journal_entry_id?: string
          payment_amount?: number
          payment_date?: string
          payment_method?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cash_sessions: {
        Row: {
          cashier_id: string | null
          close_at: string | null
          created_at: string
          end_cash: number | null
          id: string
          notes: string | null
          open_at: string
          start_cash: number
        }
        Insert: {
          cashier_id?: string | null
          close_at?: string | null
          created_at?: string
          end_cash?: number | null
          id?: string
          notes?: string | null
          open_at?: string
          start_cash?: number
        }
        Update: {
          cashier_id?: string | null
          close_at?: string | null
          created_at?: string
          end_cash?: number | null
          id?: string
          notes?: string | null
          open_at?: string
          start_cash?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          main_group_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_group_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          main_group_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_main_group"
            columns: ["main_group_id"]
            isOneToOne: false
            referencedRelation: "main_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          color_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_codes: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      currency_: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_invoices: {
        Row: {
          balance: number | null
          created_at: string | null
          customer_id: number
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          received_amount: number | null
          status: string
          total_amount: number
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          customer_id: number
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          received_amount?: number | null
          status: string
          total_amount: number
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          customer_id?: number
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          received_amount?: number | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      duplicate_comparisons: {
        Row: {
          created_at: string
          differences: Json
          existing_data: Json
          id: string
          import_log_id: string | null
          new_data: Json
          resolution: string | null
          resolved_at: string | null
          sku: string
        }
        Insert: {
          created_at?: string
          differences: Json
          existing_data: Json
          id?: string
          import_log_id?: string | null
          new_data: Json
          resolution?: string | null
          resolved_at?: string | null
          sku: string
        }
        Update: {
          created_at?: string
          differences?: Json
          existing_data?: Json
          id?: string
          import_log_id?: string | null
          new_data?: Json
          resolution?: string | null
          resolved_at?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_comparisons_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      genders: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string
          duplicates_found: number
          error_details: Json | null
          failed_rows: number
          file_name: string
          id: string
          import_type: string
          status: string
          successful_rows: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          duplicates_found?: number
          error_details?: Json | null
          failed_rows: number
          file_name: string
          id?: string
          import_type: string
          status: string
          successful_rows: number
          total_rows: number
        }
        Update: {
          created_at?: string
          duplicates_found?: number
          error_details?: Json | null
          failed_rows?: number
          file_name?: string
          id?: string
          import_type?: string
          status?: string
          successful_rows?: number
          total_rows?: number
        }
        Relationships: []
      }
      invoice_payments: {
        Row: {
          bank_account_id: string
          created_at: string | null
          customer_invoice_id: string
          id: string
          journal_entry_id: string
          payment_amount: number
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          bank_account_id: string
          created_at?: string | null
          customer_invoice_id: string
          id?: string
          journal_entry_id: string
          payment_amount: number
          payment_date: string
          payment_method?: string | null
        }
        Update: {
          bank_account_id?: string
          created_at?: string | null
          customer_invoice_id?: string
          id?: string
          journal_entry_id?: string
          payment_amount?: number
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          color: string | null
          color_id: string | null
          color_id_code: string | null
          cost: number
          created_at: string | null
          gender: string | null
          id: string
          item_color_code: string | null
          item_number: string | null
          last_restocked: string | null
          location: string | null
          main_group: string | null
          min_stock: number
          name: string
          origin: string | null
          pos_description: string | null
          price: number
          quantity: number
          season: string | null
          size: string | null
          sku: string
          store_id: string | null
          supplier: string | null
          tax: number
          theme: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          color_id?: string | null
          color_id_code?: string | null
          cost: number
          created_at?: string | null
          gender?: string | null
          id?: string
          item_color_code?: string | null
          item_number?: string | null
          last_restocked?: string | null
          location?: string | null
          main_group?: string | null
          min_stock?: number
          name: string
          origin?: string | null
          pos_description?: string | null
          price: number
          quantity?: number
          season?: string | null
          size?: string | null
          sku: string
          store_id?: string | null
          supplier?: string | null
          tax?: number
          theme?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          color_id?: string | null
          color_id_code?: string | null
          cost?: number
          created_at?: string | null
          gender?: string | null
          id?: string
          item_color_code?: string | null
          item_number?: string | null
          last_restocked?: string | null
          location?: string | null
          main_group?: string | null
          min_stock?: number
          name?: string
          origin?: string | null
          pos_description?: string | null
          price?: number
          quantity?: number
          season?: string | null
          size?: string | null
          sku?: string
          store_id?: string | null
          supplier?: string | null
          tax?: number
          theme?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_color_fkey"
            columns: ["color"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_gender_fkey"
            columns: ["gender"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_main_group_fkey"
            columns: ["main_group"]
            isOneToOne: false
            referencedRelation: "main_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_origin_fkey"
            columns: ["origin"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_season_fkey"
            columns: ["season"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_size_fkey"
            columns: ["size"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_fkey"
            columns: ["supplier"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          total_credit: number | null
          total_debit: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          entry_type?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          entry_type?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number | null
          credit_amount: number
          debit: number | null
          debit_amount: number
          description: string | null
          id: string
          item_id: string | null
          journal_entry_id: string
          line_number: number
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number | null
          credit_amount?: number
          debit?: number | null
          debit_amount?: number
          description?: string | null
          id?: string
          item_id?: string | null
          journal_entry_id: string
          line_number: number
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number | null
          credit_amount?: number
          debit?: number | null
          debit_amount?: number
          description?: string | null
          id?: string
          item_id?: string | null
          journal_entry_id?: string
          line_number?: number
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      main_groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link: string
          message: string
          reference_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      origins: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          bill_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          payment_id: string
        }
        Insert: {
          allocated_amount: number
          bill_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_id: string
        }
        Update: {
          allocated_amount?: number
          bill_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          currency_id: string | null
          description: string | null
          id: string
          payment_date: string
          payment_method: string
          payment_number: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          id?: string
          payment_date: string
          payment_method: string
          payment_number: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          payment_number?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_inventory_counts: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number
          created_at: string | null
          id: string
          item_id: string
          notes: string | null
          session_id: string
          status: string
          system_quantity: number
          updated_at: string | null
          variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number
          created_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          session_id: string
          status?: string
          system_quantity?: number
          updated_at?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number
          created_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          session_id?: string
          status?: string
          system_quantity?: number
          updated_at?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_inventory_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_inventory_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_inventory_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "physical_inventory_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "physical_inventory_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "physical_inventory_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "physical_inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_inventory_sessions: {
        Row: {
          completed_at: string | null
          count_date: string
          count_type: string
          created_at: string
          department: string | null
          expected_items: number | null
          id: string
          location_filter: string | null
          notes: string | null
          purpose: string | null
          responsible_person: string | null
          session_number: string
          started_at: string
          started_by: string | null
          status: string
          store_id: string | null
        }
        Insert: {
          completed_at?: string | null
          count_date?: string
          count_type?: string
          created_at?: string
          department?: string | null
          expected_items?: number | null
          id?: string
          location_filter?: string | null
          notes?: string | null
          purpose?: string | null
          responsible_person?: string | null
          session_number: string
          started_at?: string
          started_by?: string | null
          status?: string
          store_id?: string | null
        }
        Update: {
          completed_at?: string | null
          count_date?: string
          count_type?: string
          created_at?: string
          department?: string | null
          expected_items?: number | null
          id?: string
          location_filter?: string | null
          notes?: string | null
          purpose?: string | null
          responsible_person?: string | null
          session_number?: string
          started_at?: string
          started_by?: string | null
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      po_approvers: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_levels: {
        Row: {
          cost_price: number
          created_at: string
          effective_date: string
          id: string
          is_current: boolean
          item_id: string
          selling_price: number
          wholesale_price: number | null
        }
        Insert: {
          cost_price: number
          created_at?: string
          effective_date?: string
          id?: string
          is_current?: boolean
          item_id: string
          selling_price: number
          wholesale_price?: number | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          effective_date?: string
          id?: string
          is_current?: boolean
          item_id?: string
          selling_price?: number
          wholesale_price?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string
          description: string | null
          gender: string | null
          gender_id: string
          item_number: string
          name: string
          origin_id: string | null
          pos_description: string | null
          product_id: number
          supplier_id: string | null
          theme: string | null
          wholesale_price: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id: string
          description?: string | null
          gender?: string | null
          gender_id: string
          item_number: string
          name: string
          origin_id?: string | null
          pos_description?: string | null
          product_id?: number
          supplier_id?: string | null
          theme?: string | null
          wholesale_price?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string
          description?: string | null
          gender?: string | null
          gender_id?: string
          item_number?: string
          name?: string
          origin_id?: string | null
          pos_description?: string | null
          product_id?: number
          supplier_id?: string | null
          theme?: string | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_brand_id"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_gender_id"
            columns: ["gender_id"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_origin_id"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          brand_id: string | null
          category_id: string | null
          color: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          gender_id: string | null
          id: string
          item_description: string | null
          item_id: string | null
          item_name: string
          model_number: string | null
          origin_id: string | null
          po_id: number | null
          qc_notes: string | null
          quantity: number
          received_quantity: number
          rejected_quantity: number | null
          size: string | null
          sku: string
          unit: string | null
          updated_by: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_price: number
          created_at?: string
          created_by?: string | null
          gender_id?: string | null
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name: string
          model_number?: string | null
          origin_id?: string | null
          po_id?: number | null
          qc_notes?: string | null
          quantity: number
          received_quantity?: number
          rejected_quantity?: number | null
          size?: string | null
          sku: string
          unit?: string | null
          updated_by?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          gender_id?: string | null
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name?: string
          model_number?: string | null
          origin_id?: string | null
          po_id?: number | null
          qc_notes?: string | null
          quantity?: number
          received_quantity?: number
          rejected_quantity?: number | null
          size?: string | null
          sku?: string
          unit?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          authorized_by: string | null
          billing_address: string | null
          buyer_address: string | null
          buyer_company_name: string | null
          buyer_contact: string | null
          committed_cost: number | null
          created_by: string | null
          currency: string | null
          currency_id: string | null
          exchange_rate: number | null
          expected_delivery: string | null
          expected_delivery_date: string | null
          fob_terms: string | null
          id: number
          is_tax_inclusive: boolean
          order_date: string
          payment_terms: string | null
          po_id: number
          po_number: string | null
          shipping_address: string | null
          shipping_charges: number | null
          shipping_method: string | null
          special_instructions: string | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          supplier: string | null
          supplier_contact_person: string | null
          supplier_id: string
          tax_amount: number | null
          total_cost: number | null
          total_items: number | null
          updated_by: string | null
        }
        Insert: {
          approved_by?: string | null
          authorized_by?: string | null
          billing_address?: string | null
          buyer_address?: string | null
          buyer_company_name?: string | null
          buyer_contact?: string | null
          committed_cost?: number | null
          created_by?: string | null
          currency?: string | null
          currency_id?: string | null
          exchange_rate?: number | null
          expected_delivery?: string | null
          expected_delivery_date?: string | null
          fob_terms?: string | null
          id?: number
          is_tax_inclusive?: boolean
          order_date: string
          payment_terms?: string | null
          po_id?: number
          po_number?: string | null
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_method?: string | null
          special_instructions?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplier_contact_person?: string | null
          supplier_id: string
          tax_amount?: number | null
          total_cost?: number | null
          total_items?: number | null
          updated_by?: string | null
        }
        Update: {
          approved_by?: string | null
          authorized_by?: string | null
          billing_address?: string | null
          buyer_address?: string | null
          buyer_company_name?: string | null
          buyer_contact?: string | null
          committed_cost?: number | null
          created_by?: string | null
          currency?: string | null
          currency_id?: string | null
          exchange_rate?: number | null
          expected_delivery?: string | null
          expected_delivery_date?: string | null
          fob_terms?: string | null
          id?: number
          is_tax_inclusive?: boolean
          order_date?: string
          payment_terms?: string | null
          po_id?: number
          po_number?: string | null
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_method?: string | null
          special_instructions?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplier_contact_person?: string | null
          supplier_id?: string
          tax_amount?: number | null
          total_cost?: number | null
          total_items?: number | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          created_at: string
          id: string
          refund_amount: number
          refund_reason: string | null
          refunded_by: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          refund_amount: number
          refund_reason?: string | null
          refunded_by?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          refund_amount?: number
          refund_reason?: string | null
          refunded_by?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_pos_receipts_report"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_sales_report"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_sessions: {
        Row: {
          created_at: string | null
          created_by: number | null
          discount: number | null
          id: number
          store_id: number | null
          tax: number | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: number | null
          discount?: number | null
          id?: number
          store_id?: number | null
          tax?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: number | null
          discount?: number | null
          id?: number
          store_id?: number | null
          tax?: number | null
          total?: number | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          customer_id: number | null
          sale_id: number
          sale_session_id: number | null
          sale_timestamp: string | null
          total_amount: number | null
          user_id: number | null
        }
        Insert: {
          customer_id?: number | null
          sale_id?: number
          sale_session_id?: number | null
          sale_timestamp?: string | null
          total_amount?: number | null
          user_id?: number | null
        }
        Update: {
          customer_id?: number | null
          sale_id?: number
          sale_session_id?: number | null
          sale_timestamp?: string | null
          total_amount?: number | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sale_session_id_fkey"
            columns: ["sale_session_id"]
            isOneToOne: false
            referencedRelation: "sale_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      stock_on_hand: {
        Row: {
          last_updated: string | null
          min_stock: number | null
          quantity: number
          store_id: string
          variant_id: number
        }
        Insert: {
          last_updated?: string | null
          min_stock?: number | null
          quantity?: number
          store_id: string
          variant_id: number
        }
        Update: {
          last_updated?: string | null
          min_stock?: number | null
          quantity?: number
          store_id?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_on_hand_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_on_hand_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          qty_on_order: number
          quantity: number | null
          store_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          qty_on_order?: number
          quantity?: number | null
          store_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          qty_on_order?: number
          quantity?: number | null
          store_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      supplier_pricing: {
        Row: {
          currency: string | null
          effective_date: string
          id: string
          min_order_qty: number | null
          supplier_id: string
          unit_cost: number
          variant_id: string
        }
        Insert: {
          currency?: string | null
          effective_date?: string
          id?: string
          min_order_qty?: number | null
          supplier_id: string
          unit_cost: number
          variant_id: string
        }
        Update: {
          currency?: string | null
          effective_date?: string
          id?: string
          min_order_qty?: number | null
          supplier_id?: string
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "supplier_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "supplier_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          billing_address: Json | null
          contact_person: string | null
          created_at: string
          currency_code: string
          email: string | null
          id: string
          name: string
          payment_terms: string
          phone: string | null
          shipping_address: Json | null
          status: string
          tax_id: string | null
          vendor_code: string | null
        }
        Insert: {
          billing_address?: Json | null
          contact_person?: string | null
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: string
          name: string
          payment_terms?: string
          phone?: string | null
          shipping_address?: Json | null
          status?: string
          tax_id?: string | null
          vendor_code?: string | null
        }
        Update: {
          billing_address?: Json | null
          contact_person?: string | null
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: string
          name?: string
          payment_terms?: string
          phone?: string | null
          shipping_address?: Json | null
          status?: string
          tax_id?: string | null
          vendor_code?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          currency: string
          default_tax_rate: number
          default_unit: string
          enable_audit_log: boolean
          id: string
          low_stock_threshold: number
          require_2fa: boolean
          updated_at: string | null
        }
        Insert: {
          currency?: string
          default_tax_rate?: number
          default_unit?: string
          enable_audit_log?: boolean
          id?: string
          low_stock_threshold?: number
          require_2fa?: boolean
          updated_at?: string | null
        }
        Update: {
          currency?: string
          default_tax_rate?: number
          default_unit?: string
          enable_audit_log?: boolean
          id?: string
          low_stock_threshold?: number
          require_2fa?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_jurisdictions: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          jurisdiction_type: string
          name: string
          tax_rate_id: string
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction_type: string
          name: string
          tax_rate_id: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction_type?: string
          name?: string
          tax_rate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_jurisdictions_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          country_code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_compound: boolean | null
          liability_account_id: string
          name: string
          rate_percentage: number
          tax_type: string
        }
        Insert: {
          country_code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          liability_account_id: string
          name: string
          rate_percentage: number
          tax_type: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          liability_account_id?: string
          name?: string
          rate_percentage?: number
          tax_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_liability_account_id_fkey"
            columns: ["liability_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          default_tax_rate_id: string | null
          determination_policy: string
          id: number
          last_updated_at: string | null
          tax_number_label: string | null
        }
        Insert: {
          default_tax_rate_id?: string | null
          determination_policy: string
          id?: number
          last_updated_at?: string | null
          tax_number_label?: string | null
        }
        Update: {
          default_tax_rate_id?: string | null
          determination_policy?: string
          id?: number
          last_updated_at?: string | null
          tax_number_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_default_tax_rate_id_fkey"
            columns: ["default_tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      test: {
        Row: {
          id: number
          name: string | null
        }
        Insert: {
          id: number
          name?: string | null
        }
        Update: {
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          cashier_id: string | null
          created_at: string
          discount_fixed: number
          discount_percent: number
          id: string
          is_refund: boolean
          is_refunded: boolean
          item_id: string | null
          payment_method: string
          price: number
          quantity: number
          session_id: string | null
          sku: string
          transaction_id: string
        }
        Insert: {
          amount: number
          cashier_id?: string | null
          created_at?: string
          discount_fixed?: number
          discount_percent?: number
          id?: string
          is_refund?: boolean
          is_refunded?: boolean
          item_id?: string | null
          payment_method?: string
          price: number
          quantity?: number
          session_id?: string | null
          sku: string
          transaction_id: string
        }
        Update: {
          amount?: number
          cashier_id?: string | null
          created_at?: string
          discount_fixed?: number
          discount_percent?: number
          id?: string
          is_refund?: boolean
          is_refunded?: boolean
          item_id?: string | null
          payment_method?: string
          price?: number
          quantity?: number
          session_id?: string | null
          sku?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_pos_receipts_report"
            referencedColumns: ["session_id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          approved_quantity: number | null
          created_at: string | null
          id: string
          item_id: string
          notes: string | null
          received_quantity: number | null
          requested_quantity: number
          shipped_quantity: number | null
          transfer_id: number
        }
        Insert: {
          approved_quantity?: number | null
          created_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          received_quantity?: number | null
          requested_quantity?: number
          shipped_quantity?: number | null
          transfer_id: number
        }
        Update: {
          approved_quantity?: number | null
          created_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          received_quantity?: number | null
          requested_quantity?: number
          shipped_quantity?: number | null
          transfer_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["transfer_id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "v_transfers_report"
            referencedColumns: ["transfer_id"]
          },
        ]
      }
      transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          from_store_id: string
          notes: string | null
          reason: string | null
          received_at: string | null
          received_by: string | null
          request_date: string | null
          requested_by: string | null
          shipped_at: string | null
          shipped_by: string | null
          status: string | null
          to_store_id: string
          total_items: number | null
          transfer_date: string | null
          transfer_id: number
          transfer_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_store_id: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          request_date?: string | null
          requested_by?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string | null
          to_store_id: string
          total_items?: number | null
          transfer_date?: string | null
          transfer_id?: number
          transfer_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_store_id?: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          request_date?: string | null
          requested_by?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string | null
          to_store_id?: string
          total_items?: number | null
          transfer_date?: string | null
          transfer_id?: number
          transfer_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          store_id: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variants: {
        Row: {
          color: string | null
          color_id: string | null
          cost: number | null
          cost_price: number | null
          created_at: string | null
          item_color_code: string | null
          last_restocked: string | null
          product_id: number
          season: string | null
          season_id: string | null
          selling_price: number
          size: string | null
          size_id: string | null
          sku: string
          supplier_id: string | null
          tax_rate: number | null
          unit: string | null
          updated_at: string | null
          variant_id: number
        }
        Insert: {
          color?: string | null
          color_id?: string | null
          cost?: number | null
          cost_price?: number | null
          created_at?: string | null
          item_color_code?: string | null
          last_restocked?: string | null
          product_id: number
          season?: string | null
          season_id?: string | null
          selling_price: number
          size?: string | null
          size_id?: string | null
          sku: string
          supplier_id?: string | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          variant_id?: number
        }
        Update: {
          color?: string | null
          color_id?: string | null
          cost?: number | null
          cost_price?: number | null
          created_at?: string | null
          item_color_code?: string | null
          last_restocked?: string | null
          product_id?: number
          season?: string | null
          season_id?: string | null
          selling_price?: number
          size?: string | null
          size_id?: string | null
          sku?: string
          supplier_id?: string | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_variants_color_id"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_variants_season_id"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_variants_size_id"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          balance: number | null
          bill_date: string
          bill_number: string
          created_at: string | null
          due_date: string
          id: string
          journal_entry_id: string | null
          paid_amount: number | null
          status: string
          supplier_id: string
          total_amount: number
        }
        Insert: {
          balance?: number | null
          bill_date: string
          bill_number: string
          created_at?: string | null
          due_date: string
          id?: string
          journal_entry_id?: string | null
          paid_amount?: number | null
          status: string
          supplier_id: string
          total_amount: number
        }
        Update: {
          balance?: number | null
          bill_date?: string
          bill_number?: string
          created_at?: string | null
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          paid_amount?: number | null
          status?: string
          supplier_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          id: string
          location: string | null
          name: string
        }
        Insert: {
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      workflow_rules: {
        Row: {
          condition_type: string
          created_at: string
          document_type: string
          id: string
          is_active: boolean
          name: string
          required_approver_role: Database["public"]["Enums"]["app_role"]
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          condition_type: string
          created_at?: string
          document_type: string
          id?: string
          is_active?: boolean
          name: string
          required_approver_role: Database["public"]["Enums"]["app_role"]
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          document_type?: string
          id?: string
          is_active?: boolean
          name?: string
          required_approver_role?: Database["public"]["Enums"]["app_role"]
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      items_with_current_price: {
        Row: {
          color: string | null
          id: string | null
          name: string | null
          price: number | null
          quantity: number | null
          size: string | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_color_fkey"
            columns: ["color"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_size_fkey"
            columns: ["size"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_turnover_report: {
        Row: {
          avg_inventory: number | null
          brand: string | null
          category: string | null
          cost_price: number | null
          current_stock: number | null
          item_created_date: string | null
          item_id: string | null
          item_name: string | null
          selling_price: number | null
          sku: string | null
          total_sold: number | null
          turnover_ratio: number | null
        }
        Relationships: []
      }
      v_item_lifecycle_report: {
        Row: {
          brand: string | null
          category: string | null
          current_stock: number | null
          date_added: string | null
          item_id: string | null
          item_name: string | null
          last_po_cost: number | null
          last_po_date: string | null
          last_po_number: string | null
          last_po_quantity: number | null
          last_sale_amount: number | null
          last_sale_date: string | null
          last_sale_price: number | null
          last_sale_quantity: number | null
          last_transaction_id: string | null
          model_number: string | null
          original_cost: number | null
          original_price: number | null
          sku: string | null
          store_id: string | null
          store_name: string | null
          total_quantity_sold: number | null
          total_revenue: number | null
          total_transactions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pos_receipts_report: {
        Row: {
          amount: number | null
          brand: string | null
          cashier_id: string | null
          category: string | null
          close_at: string | null
          cost_price: number | null
          discount_fixed: number | null
          discount_percent: number | null
          end_cash: number | null
          is_refund: boolean | null
          item_id: string | null
          item_name: string | null
          open_at: string | null
          payment_method: string | null
          price: number | null
          quantity: number | null
          receipt_number: string | null
          session_id: string | null
          sku: string | null
          start_cash: number | null
          transaction_date: string | null
          transaction_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
        ]
      }
      v_profit_margin_report: {
        Row: {
          brand: string | null
          category: string | null
          cost_price: number | null
          item_id: string | null
          item_name: string | null
          profit_margin_percent: number | null
          profit_per_unit: number | null
          selling_price: number | null
          sku: string | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
          units_sold: number | null
        }
        Relationships: []
      }
      v_sales_report: {
        Row: {
          amount: number | null
          brand: string | null
          cashier_id: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          discount_fixed: number | null
          discount_percent: number | null
          id: string | null
          is_refund: boolean | null
          is_refunded: boolean | null
          item_id: string | null
          item_name: string | null
          payment_method: string | null
          price: number | null
          quantity: number | null
          session_cashier_id: string | null
          session_id: string | null
          sku: string | null
          transaction_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_pos_receipts_report"
            referencedColumns: ["session_id"]
          },
        ]
      }
      v_stock_movement_summary: {
        Row: {
          brand: string | null
          category: string | null
          from_store: string | null
          item_id: string | null
          item_name: string | null
          movement_date: string | null
          movement_type: string | null
          quantity_change: number | null
          sku: string | null
          to_store: string | null
        }
        Relationships: []
      }
      v_store_stock_levels: {
        Row: {
          brand: string | null
          category: string | null
          id: string | null
          item_id: string | null
          item_name: string | null
          last_restocked: string | null
          min_stock: number | null
          quantity: number | null
          sku: string | null
          store_id: string | null
          store_name: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_transfers_report: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          from_store_id: string | null
          from_store_location: string | null
          from_store_name: string | null
          notes: string | null
          reason: string | null
          received_at: string | null
          received_by: string | null
          request_date: string | null
          requested_by: string | null
          shipped_at: string | null
          shipped_by: string | null
          status: string | null
          to_store_id: string | null
          to_store_location: string | null
          to_store_name: string | null
          total_approved_quantity: number | null
          total_items: number | null
          total_received_quantity: number | null
          total_requested_quantity: number | null
          total_shipped_quantity: number | null
          transfer_date: string | null
          transfer_id: number | null
          transfer_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_foreign_key: {
        Args: {
          column_name_param: string
          foreign_column_param: string
          foreign_table_param: string
          table_name_param: string
        }
        Returns: Json
      }
      check_low_stock_notifications: { Args: never; Returns: undefined }
      create_attribute_table: {
        Args: { p_icon?: string; p_label: string; p_table_name: string }
        Returns: Json
      }
      execute_sql: { Args: { sql: string }; Returns: Json }
      generate_pi_session_number: { Args: never; Returns: string }
      generate_po_number: { Args: { supplier_name: string }; Returns: string }
      generate_transfer_number: { Args: never; Returns: string }
      get_table_columns: {
        Args: { table_name_param: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          foreign_column: string
          foreign_table: string
          is_foreign_key: boolean
          is_nullable: string
          is_primary_key: boolean
        }[]
      }
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role:
        | {
            Args: { role_name: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_po_approver: { Args: { user_id: string }; Returns: boolean }
      list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      next_journal_entry_number: { Args: never; Returns: string }
      pos_session_expected_cash: {
        Args: { session_id_param: string }
        Returns: number
      }
      rename_column: {
        Args: {
          new_column_name: string
          old_column_name: string
          table_name_param: string
        }
        Returns: Json
      }
      update_shipped_quantities: {
        Args: { p_transfer_id: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "supervisor" | "inventory_man" | "cashier"
      bank_account_type:
        | "checking"
        | "savings"
        | "business"
        | "money_market"
        | "current"
        | "fixed_deposit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "supervisor", "inventory_man", "cashier"],
      bank_account_type: [
        "checking",
        "savings",
        "business",
        "money_market",
        "current",
        "fixed_deposit",
      ],
    },
  },
} as const
