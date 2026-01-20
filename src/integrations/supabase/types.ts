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
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
          rate_limit: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
          rate_limit?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
          rate_limit?: number | null
        }
        Relationships: []
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
          entity_name: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
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
      bin_locations: {
        Row: {
          aisle: string | null
          bin: string | null
          bin_code: string
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rack: string | null
          shelf: string | null
          store_id: string | null
        }
        Insert: {
          aisle?: string | null
          bin?: string | null
          bin_code: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rack?: string | null
          shelf?: string | null
          store_id?: string | null
        }
        Update: {
          aisle?: string | null
          bin?: string | null
          bin_code?: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rack?: string | null
          shelf?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bin_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bin_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bin_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bin_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bin_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
      budget_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          approved_by: string | null
          budget_line_id: string
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          adjustment_type: string
          amount: number
          approved_by?: string | null
          budget_line_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          adjustment_type?: string
          amount?: number
          approved_by?: string | null
          budget_line_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_adjustments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          account_id: string
          actual_amount: number | null
          budget_period_id: string
          budgeted_amount: number
          created_at: string | null
          id: string
          notes: string | null
          store_id: string | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          account_id: string
          actual_amount?: number | null
          budget_period_id: string
          budgeted_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          store_id?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          account_id?: string
          actual_amount?: number | null
          budget_period_id?: string
          budgeted_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          store_id?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_period_id_fkey"
            columns: ["budget_period_id"]
            isOneToOne: false
            referencedRelation: "budget_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "budget_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "budget_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "budget_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      budget_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          fiscal_year: number
          id: string
          name: string
          start_date: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          fiscal_year: number
          id?: string
          name: string
          start_date: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          fiscal_year?: number
          id?: string
          name?: string
          start_date?: string
          status?: string | null
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
          store_id: string | null
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
          store_id?: string | null
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
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
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
      customer_contacts: {
        Row: {
          contact_name: string
          created_at: string | null
          customer_id: number | null
          email: string | null
          id: string
          is_primary: boolean | null
          phone: string | null
          position: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string | null
          customer_id?: number | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          position?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string | null
          customer_id?: number | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_group_members: {
        Row: {
          customer_id: number
          group_id: string
        }
        Insert: {
          customer_id: number
          group_id: string
        }
        Update: {
          customer_id?: number
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_group_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "customer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_groups: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
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
          company_name: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          customer_code: string | null
          customer_type: string | null
          email: string | null
          id: number
          loyalty_points: number | null
          name: string
          notes: string | null
          outstanding_balance: number | null
          phone: string | null
          status: string | null
          tax_id: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_code?: string | null
          customer_type?: string | null
          email?: string | null
          id?: number
          loyalty_points?: number | null
          name: string
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_code?: string | null
          customer_type?: string | null
          email?: string | null
          id?: number
          loyalty_points?: number | null
          name?: string
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
        }
        Relationships: []
      }
      dashboard_configurations: {
        Row: {
          config_name: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          layout: Json | null
          user_id: string
          widgets: Json
        }
        Insert: {
          config_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json | null
          user_id: string
          widgets: Json
        }
        Update: {
          config_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json | null
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      delivery_note_items: {
        Row: {
          created_at: string | null
          delivery_note_id: string | null
          id: string
          quantity_shipped: number
          sales_order_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          quantity_shipped: number
          sales_order_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          quantity_shipped?: number
          sales_order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          delivery_number: string
          id: string
          notes: string | null
          sales_order_id: string | null
          shipping_method: string | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          delivery_number: string
          id?: string
          notes?: string | null
          sales_order_id?: string | null
          shipping_method?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          delivery_number?: string
          id?: string
          notes?: string | null
          sales_order_id?: string | null
          shipping_method?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
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
      document_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
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
      exchange_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          from_currency_id: string | null
          id: string
          rate: number
          source: string | null
          to_currency_id: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          from_currency_id?: string | null
          id?: string
          rate: number
          source?: string | null
          to_currency_id?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          from_currency_id?: string | null
          id?: string
          rate?: number
          source?: string | null
          to_currency_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_id_fkey"
            columns: ["from_currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_id_fkey"
            columns: ["to_currency_id"]
            isOneToOne: false
            referencedRelation: "currency_"
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
      integration_configs: {
        Row: {
          config: Json | null
          created_at: string | null
          credentials_encrypted: string | null
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          sync_frequency_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_frequency_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_frequency_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          records_failed: number | null
          records_processed: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_configs"
            referencedColumns: ["id"]
          },
        ]
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
      item_batches: {
        Row: {
          batch_number: string
          cost_price: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_id: string | null
          manufacture_date: string | null
          notes: string | null
          quantity: number | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          batch_number: string
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          manufacture_date?: string | null
          notes?: string | null
          quantity?: number | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          batch_number?: string
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          manufacture_date?: string | null
          notes?: string | null
          quantity?: number | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      item_bin_locations: {
        Row: {
          bin_id: string
          item_id: string
          max_quantity: number | null
          min_quantity: number | null
          quantity: number | null
        }
        Insert: {
          bin_id: string
          item_id: string
          max_quantity?: number | null
          min_quantity?: number | null
          quantity?: number | null
        }
        Update: {
          bin_id?: string
          item_id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_bin_locations_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bin_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_bin_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
        ]
      }
      item_serial_numbers: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string
          sold_transaction_id: string | null
          status: string | null
          store_id: string | null
          warranty_expiry: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number: string
          sold_transaction_id?: string | null
          status?: string | null
          store_id?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string
          sold_transaction_id?: string | null
          status?: string | null
          store_id?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_serial_numbers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_serial_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "item_serial_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            referencedRelation: "v_items_sold_report"
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
          {
            foreignKeyName: "journal_entry_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          calculation_formula: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          kpi_code: string
          name: string
          target_value: number | null
          unit: string | null
        }
        Insert: {
          calculation_formula?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          kpi_code: string
          name: string
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          calculation_formula?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          kpi_code?: string
          name?: string
          target_value?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      kpi_history: {
        Row: {
          actual_value: number | null
          created_at: string | null
          id: string
          kpi_id: string | null
          period_date: string
          target_value: number | null
          variance: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          period_date: string
          target_value?: number | null
          variance?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          period_date?: string
          target_value?: number | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_history_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
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
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          sms_enabled: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          sms_enabled?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          sms_enabled?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body_template: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sms_template: string | null
          subject: string | null
          template_code: string
        }
        Insert: {
          body_template: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sms_template?: string | null
          subject?: string | null
          template_code: string
        }
        Update: {
          body_template?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sms_template?: string | null
          subject?: string | null
          template_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          email_sent: boolean | null
          id: string
          is_read: boolean
          link: string
          message: string
          priority: string | null
          reference_id: string | null
          sms_sent: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean
          link: string
          message: string
          priority?: string | null
          reference_id?: string | null
          sms_sent?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean
          link?: string
          message?: string
          priority?: string | null
          reference_id?: string | null
          sms_sent?: boolean | null
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
            referencedRelation: "v_items_sold_report"
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
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      po_amendments: {
        Row: {
          amendment_date: string | null
          amendment_number: number
          approved_by: string | null
          changes: Json
          created_at: string | null
          id: string
          po_id: number | null
          reason: string
          status: string | null
        }
        Insert: {
          amendment_date?: string | null
          amendment_number: number
          approved_by?: string | null
          changes: Json
          created_at?: string | null
          id?: string
          po_id?: number | null
          reason: string
          status?: string | null
        }
        Update: {
          amendment_date?: string | null
          amendment_number?: number
          approved_by?: string | null
          changes?: Json
          created_at?: string | null
          id?: string
          po_id?: number | null
          reason?: string
          status?: string | null
        }
        Relationships: []
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
      po_receiving: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          po_id: number | null
          received_by: string | null
          receiving_date: string | null
          receiving_number: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          po_id?: number | null
          received_by?: string | null
          receiving_date?: string | null
          receiving_number: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          po_id?: number | null
          received_by?: string | null
          receiving_date?: string | null
          receiving_number?: string
          status?: string | null
        }
        Relationships: []
      }
      po_receiving_items: {
        Row: {
          accepted_quantity: number | null
          batch_number: string | null
          created_at: string | null
          id: string
          po_item_id: string | null
          qc_notes: string | null
          qc_status: string | null
          received_quantity: number
          receiving_id: string | null
          rejected_quantity: number | null
          rejection_reason: string | null
        }
        Insert: {
          accepted_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          id?: string
          po_item_id?: string | null
          qc_notes?: string | null
          qc_status?: string | null
          received_quantity: number
          receiving_id?: string | null
          rejected_quantity?: number | null
          rejection_reason?: string | null
        }
        Update: {
          accepted_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          id?: string
          po_item_id?: string | null
          qc_notes?: string | null
          qc_status?: string | null
          received_quantity?: number
          receiving_id?: string | null
          rejected_quantity?: number | null
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_receiving_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_items_receiving_id_fkey"
            columns: ["receiving_id"]
            isOneToOne: false
            referencedRelation: "po_receiving"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_po_report"
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
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            referencedRelation: "v_refunds_report"
            referencedColumns: ["id"]
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
      reorder_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          item_id: string | null
          last_triggered_at: string | null
          lead_time_days: number | null
          preferred_supplier_id: string | null
          reorder_point: number
          reorder_quantity: number
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          last_triggered_at?: string | null
          lead_time_days?: number | null
          preferred_supplier_id?: string | null
          reorder_point: number
          reorder_quantity: number
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          last_triggered_at?: string | null
          lead_time_days?: number | null
          preferred_supplier_id?: string | null
          reorder_point?: number
          reorder_quantity?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "reorder_rules_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reorder_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reorder_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reorder_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
      sales_order_items: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          item_id: string | null
          item_name: string | null
          line_total: number | null
          quantity: number
          sales_order_id: string | null
          shipped_quantity: number | null
          sku: string | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          line_total?: number | null
          quantity: number
          sales_order_id?: string | null
          shipped_quantity?: number | null
          sku?: string | null
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          line_total?: number | null
          quantity?: number
          sales_order_id?: string | null
          shipped_quantity?: number | null
          sku?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_with_current_price"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_turnover_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_lifecycle_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_profit_margin_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          approved_by: string | null
          billing_address: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: number | null
          discount_amount: number | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          order_type: string | null
          payment_terms: string | null
          shipping_address: string | null
          shipping_amount: number | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          billing_address?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: number | null
          discount_amount?: number | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          order_type?: string | null
          payment_terms?: string | null
          shipping_address?: string | null
          shipping_amount?: number | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          billing_address?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: number | null
          discount_amount?: number | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          order_type?: string | null
          payment_terms?: string | null
          shipping_address?: string | null
          shipping_amount?: number | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            foreignKeyName: "stock_on_hand_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "stock_on_hand_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "stock_on_hand_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "stock_on_hand_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            referencedRelation: "v_items_sold_report"
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
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            referencedRelation: "v_items_sold_report"
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
          customer_id: number | null
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
          customer_id?: number | null
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
          customer_id?: number | null
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
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_items_sold_report"
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
            referencedRelation: "v_cash_sessions_report"
            referencedColumns: ["id"]
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
            referencedRelation: "v_items_sold_report"
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
            referencedRelation: "v_stock_movement_summary"
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
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
          created_by: string | null
          due_date: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_terms: string | null
          status: string
          supplier_id: string
          total_amount: number
        }
        Insert: {
          balance?: number | null
          bill_date: string
          bill_number: string
          created_at?: string | null
          created_by?: string | null
          due_date: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_terms?: string | null
          status: string
          supplier_id: string
          total_amount: number
        }
        Update: {
          balance?: number | null
          bill_date?: string
          bill_number?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_terms?: string | null
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
      vendor_performance: {
        Row: {
          avg_lead_time_days: number | null
          created_at: string | null
          defect_rate: number | null
          evaluation_period: string | null
          id: string
          late_deliveries: number | null
          on_time_deliveries: number | null
          overall_score: number | null
          period_end: string | null
          period_start: string | null
          quality_pass_rate: number | null
          supplier_id: string | null
          total_orders: number | null
          total_value: number | null
        }
        Insert: {
          avg_lead_time_days?: number | null
          created_at?: string | null
          defect_rate?: number | null
          evaluation_period?: string | null
          id?: string
          late_deliveries?: number | null
          on_time_deliveries?: number | null
          overall_score?: number | null
          period_end?: string | null
          period_start?: string | null
          quality_pass_rate?: number | null
          supplier_id?: string | null
          total_orders?: number | null
          total_value?: number | null
        }
        Update: {
          avg_lead_time_days?: number | null
          created_at?: string | null
          defect_rate?: number | null
          evaluation_period?: string | null
          id?: string
          late_deliveries?: number | null
          on_time_deliveries?: number | null
          overall_score?: number | null
          period_end?: string | null
          period_start?: string | null
          quality_pass_rate?: number | null
          supplier_id?: string | null
          total_orders?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_supplier_id_fkey"
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
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          name: string
          retry_count: number | null
          secret_key: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          retry_count?: number | null
          secret_key?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          retry_count?: number | null
          secret_key?: string | null
          url?: string
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
      v_cash_sessions_report: {
        Row: {
          cash_difference: number | null
          cashier_id: string | null
          cashier_name: string | null
          close_at: string | null
          end_cash: number | null
          id: string | null
          notes: string | null
          open_at: string | null
          refund_count: number | null
          start_cash: number | null
          store_name: string | null
          total_card_sales: number | null
          total_cash_sales: number | null
          total_refunds: number | null
          total_sales: number | null
          transaction_count: number | null
          variance: number | null
        }
        Relationships: []
      }
      v_cashier_performance_report: {
        Row: {
          avg_transaction_value: number | null
          card_sales: number | null
          cash_sales: number | null
          cashier_id: string | null
          cashier_name: string | null
          items_sold: number | null
          net_sales: number | null
          sessions_worked: number | null
          store_id: string | null
          store_name: string | null
          total_refund_amount: number | null
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
      v_daily_pos_summary: {
        Row: {
          store_id: string | null
          store_name: string | null
          total_refund_amount: number | null
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
      v_inventory_turnover_report: {
        Row: {
          current_stock: number | null
          item_id: string | null
          item_name: string | null
          sku: string | null
          units_sold: number | null
        }
        Relationships: []
      }
      v_item_lifecycle_report: {
        Row: {
          first_added: string | null
          item_id: string | null
          item_name: string | null
          last_restocked: string | null
          last_sold: string | null
          sku: string | null
          total_units_sold: number | null
        }
        Relationships: []
      }
      v_items_sold_report: {
        Row: {
          category: string | null
          item_id: string | null
          item_name: string | null
          sku: string | null
          store_id: string | null
          store_name: string | null
          total_revenue: number | null
          total_sold: number | null
        }
        Relationships: []
      }
      v_payment_methods_report: {
        Row: {
          payment_method: string | null
          store_id: string | null
          store_name: string | null
          total_amount: number | null
          transaction_count: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
      v_po_report: {
        Row: {
          approved_by: string | null
          created_by: string | null
          currency_id: string | null
          expected_delivery_date: string | null
          order_date: string | null
          payment_terms: string | null
          po_id: number | null
          po_number: string | null
          shipping_charges: number | null
          status: string | null
          store_id: string | null
          store_name: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tax_amount: number | null
          total_cost: number | null
          total_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      v_pos_receipts_report: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          end_cash: number | null
          line_items: number | null
          payment_method: string | null
          session_id: string | null
          start_cash: number | null
          total_amount: number | null
          transaction_id: string | null
        }
        Relationships: [
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
            referencedRelation: "v_cash_sessions_report"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profit_margin_report: {
        Row: {
          cost: number | null
          item_id: string | null
          item_name: string | null
          margin: number | null
          margin_percent: number | null
          price: number | null
          sku: string | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
          units_sold: number | null
        }
        Relationships: []
      }
      v_refunds_report: {
        Row: {
          amount: number | null
          cashier_id: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          item_name: string | null
          price: number | null
          quantity: number | null
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
            referencedRelation: "v_items_sold_report"
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
      v_sales_report: {
        Row: {
          amount: number | null
          brand: string | null
          cashier_id: string | null
          category: string | null
          created_at: string | null
          discount_fixed: number | null
          discount_percent: number | null
          id: string | null
          is_refund: boolean | null
          item_id: string | null
          item_name: string | null
          payment_method: string | null
          price: number | null
          quantity: number | null
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
            referencedRelation: "v_items_sold_report"
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
      v_stock_movement_summary: {
        Row: {
          approved_quantity: number | null
          from_store_id: string | null
          from_store_name: string | null
          item_id: string | null
          item_name: string | null
          movement_date: string | null
          movement_type: string | null
          received_quantity: number | null
          requested_quantity: number | null
          shipped_quantity: number | null
          sku: string | null
          status: string | null
          to_store_id: string | null
          to_store_name: string | null
          transfer_id: number | null
          transfer_number: string | null
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
            referencedRelation: "v_items_sold_report"
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
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
      }
      v_store_inventory_report: {
        Row: {
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string | null
          item_id: string | null
          item_name: string | null
          min_stock: number | null
          qty_on_order: number | null
          selling_price: number | null
          sku: string | null
          store_id: string | null
          store_location: string | null
          store_name: string | null
          store_quantity: number | null
          updated_at: string | null
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
            referencedRelation: "v_items_sold_report"
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
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
        ]
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
            referencedRelation: "v_items_sold_report"
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
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_cashier_performance_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_pos_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_items_sold_report"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "v_payment_methods_report"
            referencedColumns: ["store_id"]
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
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { role_name: Database["public"]["Enums"]["app_role"] }
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
