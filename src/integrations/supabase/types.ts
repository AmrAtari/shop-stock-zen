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
      items: {
        Row: {
          brand: string | null
          category: string
          color: string | null
          color_id: string | null
          created_at: string
          department: string | null
          description: string | null
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
          quantity: number
          season: string | null
          size: string | null
          sku: string
          supplier: string | null
          tax: number | null
          theme: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          color?: string | null
          color_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
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
          quantity?: number
          season?: string | null
          size?: string | null
          sku: string
          supplier?: string | null
          tax?: number | null
          theme?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          color_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
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
          quantity?: number
          season?: string | null
          size?: string | null
          sku?: string
          supplier?: string | null
          tax?: number | null
          theme?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
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
      physical_inventory_counts: {
        Row: {
          counted_quantity: number
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          session_id: string
          sku: string
          status: string
          system_quantity: number
          variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          counted_quantity: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          session_id: string
          sku: string
          status?: string
          system_quantity: number
          variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          counted_quantity?: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          session_id?: string
          sku?: string
          status?: string
          system_quantity?: number
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
        Relationships: [
          {
            foreignKeyName: "price_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          color: string | null
          cost_price: number
          created_at: string
          id: string
          item_description: string | null
          item_id: string | null
          item_name: string
          model_number: string | null
          po_id: string
          quantity: number
          received_quantity: number
          size: string | null
          sku: string
          unit: string | null
        }
        Insert: {
          color?: string | null
          cost_price: number
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name: string
          model_number?: string | null
          po_id: string
          quantity: number
          received_quantity?: number
          size?: string | null
          sku: string
          unit?: string | null
        }
        Update: {
          color?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name?: string
          model_number?: string | null
          po_id?: string
          quantity?: number
          received_quantity?: number
          size?: string | null
          sku?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          authorized_by: string | null
          billing_address: string | null
          buyer_address: string | null
          buyer_company_name: string | null
          buyer_contact: string | null
          created_at: string
          currency: string | null
          expected_delivery: string | null
          fob_terms: string | null
          id: string
          notes: string | null
          order_date: string
          payment_terms: string | null
          po_number: string
          shipping_address: string | null
          shipping_charges: number | null
          shipping_method: string | null
          special_instructions: string | null
          status: string
          store_id: string | null
          subtotal: number | null
          supplier: string
          supplier_contact_person: string | null
          tax_amount: number | null
          total_cost: number
          total_items: number
          updated_at: string
        }
        Insert: {
          authorized_by?: string | null
          billing_address?: string | null
          buyer_address?: string | null
          buyer_company_name?: string | null
          buyer_contact?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          fob_terms?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number: string
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_method?: string | null
          special_instructions?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number | null
          supplier: string
          supplier_contact_person?: string | null
          tax_amount?: number | null
          total_cost?: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          authorized_by?: string | null
          billing_address?: string | null
          buyer_address?: string | null
          buyer_company_name?: string | null
          buyer_contact?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          fob_terms?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number?: string
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_method?: string | null
          special_instructions?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number | null
          supplier?: string
          supplier_contact_person?: string | null
          tax_amount?: number | null
          total_cost?: number
          total_items?: number
          updated_at?: string
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
        ]
      }
      sales: {
        Row: {
          created_at: string
          id: string
          item_id: string
          price: number
          quantity: number
          sku: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          price: number
          quantity?: number
          sku?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          price?: number
          quantity?: number
          sku?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
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
      stock_adjustments: {
        Row: {
          adjustment: number
          created_at: string
          id: string
          item_id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          reason: string
          reference_number: string | null
        }
        Insert: {
          adjustment: number
          created_at?: string
          id?: string
          item_id: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          reason: string
          reference_number?: string | null
        }
        Update: {
          adjustment?: number
          created_at?: string
          id?: string
          item_id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          reason?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
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
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
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
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          quantity: number
          sku: string
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          quantity: number
          sku: string
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number
          sku?: string
          transfer_id?: string
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
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          from_store_id: string | null
          id: string
          notes: string | null
          reason: string | null
          received_at: string | null
          received_by: string | null
          status: string
          to_store_id: string | null
          total_items: number
          transfer_number: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_store_id?: string | null
          total_items?: number
          transfer_number: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_store_id?: string | null
          total_items?: number
          transfer_number?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_low_stock_notifications: { Args: never; Returns: undefined }
      create_attribute_table: {
        Args: { p_icon?: string; p_label: string; p_table_name: string }
        Returns: Json
      }
      generate_pi_session_number: { Args: never; Returns: string }
      generate_po_number: { Args: { supplier_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pos_session_expected_cash: {
        Args: { session_id_param: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user" | "supervisor" | "inventory_man" | "cashier"
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
    },
  },
} as const
