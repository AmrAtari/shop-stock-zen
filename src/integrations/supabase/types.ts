export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      attribute_types: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          label: string;
          name: string;
          table_name: string;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          label: string;
          name: string;
          table_name: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          label?: string;
          name?: string;
          table_name?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      cash_sessions: {
        Row: {
          cashier_id: string | null;
          close_at: string | null;
          created_at: string;
          end_cash: number | null;
          id: string;
          notes: string | null;
          open_at: string;
          start_cash: number;
        };
        Insert: {
          cashier_id?: string | null;
          close_at?: string | null;
          created_at?: string;
          end_cash?: number | null;
          id?: string;
          notes?: string | null;
          open_at?: string;
          start_cash?: number;
        };
        Update: {
          cashier_id?: string | null;
          close_at?: string | null;
          created_at?: string;
          end_cash?: number | null;
          id?: string;
          notes?: string | null;
          open_at?: string;
          start_cash?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          main_group_id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          main_group_id: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          main_group_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_main_group";
            columns: ["main_group_id"];
            isOneToOne: false;
            referencedRelation: "main_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      colors: {
        Row: {
          color_id: string | null;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          color_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          color_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      currency_: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string | null;
          email: string | null;
          id: number;
          name: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: number;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: number;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      duplicate_comparisons: {
        Row: {
          created_at: string;
          differences: Json;
          existing_data: Json;
          id: string;
          import_log_id: string | null;
          new_data: Json;
          resolution: string | null;
          resolved_at: string | null;
          sku: string;
        };
        Insert: {
          created_at?: string;
          differences: Json;
          existing_data: Json;
          id?: string;
          import_log_id?: string | null;
          new_data: Json;
          resolution?: string | null;
          resolved_at?: string | null;
          sku: string;
        };
        Update: {
          created_at?: string;
          differences?: Json;
          existing_data?: Json;
          id?: string;
          import_log_id?: string | null;
          new_data?: Json;
          resolution?: string | null;
          resolved_at?: string | null;
          sku?: string;
        };
        Relationships: [
          {
            foreignKeyName: "duplicate_comparisons_import_log_id_fkey";
            columns: ["import_log_id"];
            isOneToOne: false;
            referencedRelation: "import_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      genders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      import_logs: {
        Row: {
          created_at: string;
          duplicates_found: number;
          error_details: Json | null;
          failed_rows: number;
          file_name: string;
          id: string;
          import_type: string;
          status: string;
          successful_rows: number;
          total_rows: number;
        };
        Insert: {
          created_at?: string;
          duplicates_found?: number;
          error_details?: Json | null;
          failed_rows: number;
          file_name: string;
          id?: string;
          import_type: string;
          status: string;
          successful_rows: number;
          total_rows: number;
        };
        Update: {
          created_at?: string;
          duplicates_found?: number;
          error_details?: Json | null;
          failed_rows?: number;
          file_name?: string;
          id?: string;
          import_type?: string;
          status?: string;
          successful_rows?: number;
          total_rows?: number;
        };
        Relationships: [];
      };
      items: {
        Row: {
          category: string | null;
          color: string | null;
          color_id: string | null;
          color_id_code: string | null;
          cost: number;
          created_at: string | null;
          gender: string | null;
          id: string;
          item_color_code: string | null;
          item_number: string | null;
          last_restocked: string | null;
          location: string | null;
          main_group: string | null;
          min_stock: number;
          name: string;
          origin: string | null;
          pos_description: string | null;
          price: number;
          quantity: number;
          season: string | null;
          size: string | null;
          sku: string;
          supplier: string | null;
          tax: number;
          theme: string | null;
          unit: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          color?: string | null;
          color_id?: string | null;
          color_id_code?: string | null;
          cost: number;
          created_at?: string | null;
          gender?: string | null;
          id?: string;
          item_color_code?: string | null;
          item_number?: string | null;
          last_restocked?: string | null;
          location?: string | null;
          main_group?: string | null;
          min_stock?: number;
          name: string;
          origin?: string | null;
          pos_description?: string | null;
          price: number;
          quantity?: number;
          season?: string | null;
          size?: string | null;
          sku: string;
          supplier?: string | null;
          tax?: number;
          theme?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          color?: string | null;
          color_id?: string | null;
          color_id_code?: string | null;
          cost?: number;
          created_at?: string | null;
          gender?: string | null;
          id?: string;
          item_color_code?: string | null;
          item_number?: string | null;
          last_restocked?: string | null;
          location?: string | null;
          main_group?: string | null;
          min_stock?: number;
          name?: string;
          origin?: string | null;
          pos_description?: string | null;
          price?: number;
          quantity?: number;
          season?: string | null;
          size?: string | null;
          sku?: string;
          supplier?: string | null;
          tax?: number;
          theme?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_color_fkey";
            columns: ["color"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_gender_fkey";
            columns: ["gender"];
            isOneToOne: false;
            referencedRelation: "genders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_main_group_fkey";
            columns: ["main_group"];
            isOneToOne: false;
            referencedRelation: "main_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_origin_fkey";
            columns: ["origin"];
            isOneToOne: false;
            referencedRelation: "origins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_season_fkey";
            columns: ["season"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_size_fkey";
            columns: ["size"];
            isOneToOne: false;
            referencedRelation: "sizes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_supplier_fkey";
            columns: ["supplier"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_theme_fkey";
            columns: ["theme"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      main_groups: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          link: string;
          message: string;
          reference_id: string | null;
          title: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link: string;
          message: string;
          reference_id?: string | null;
          title: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string;
          message?: string;
          reference_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      origins: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      physical_inventory_sessions: {
        Row: {
          completed_at: string | null;
          count_date: string;
          count_type: string;
          created_at: string;
          department: string | null;
          expected_items: number | null;
          id: string;
          location_filter: string | null;
          notes: string | null;
          purpose: string | null;
          responsible_person: string | null;
          session_number: string;
          started_at: string;
          started_by: string | null;
          status: string;
          store_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          count_date?: string;
          count_type?: string;
          created_at?: string;
          department?: string | null;
          expected_items?: number | null;
          id?: string;
          location_filter?: string | null;
          notes?: string | null;
          purpose?: string | null;
          responsible_person?: string | null;
          session_number: string;
          started_at?: string;
          started_by?: string | null;
          status?: string;
          store_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          count_date?: string;
          count_type?: string;
          created_at?: string;
          department?: string | null;
          expected_items?: number | null;
          id?: string;
          location_filter?: string | null;
          notes?: string | null;
          purpose?: string | null;
          responsible_person?: string | null;
          session_number?: string;
          started_at?: string;
          started_by?: string | null;
          status?: string;
          store_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "physical_inventory_sessions_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      price_levels: {
        Row: {
          cost_price: number;
          created_at: string;
          effective_date: string;
          id: string;
          is_current: boolean;
          item_id: string;
          selling_price: number;
          wholesale_price: number | null;
        };
        Insert: {
          cost_price: number;
          created_at?: string;
          effective_date?: string;
          id?: string;
          is_current?: boolean;
          item_id: string;
          selling_price: number;
          wholesale_price?: number | null;
        };
        Update: {
          cost_price?: number;
          created_at?: string;
          effective_date?: string;
          id?: string;
          is_current?: boolean;
          item_id?: string;
          selling_price?: number;
          wholesale_price?: number | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          brand_id: string | null;
          category_id: string;
          description: string | null;
          gender: string | null;
          gender_id: string;
          item_number: string;
          name: string;
          origin_id: string | null;
          pos_description: string | null;
          product_id: number;
          supplier_id: string | null;
          theme: string | null;
          wholesale_price: number | null;
        };
        Insert: {
          brand_id?: string | null;
          category_id: string;
          description?: string | null;
          gender?: string | null;
          gender_id: string;
          item_number: string;
          name: string;
          origin_id?: string | null;
          pos_description?: string | null;
          product_id?: number;
          supplier_id?: string | null;
          theme?: string | null;
          wholesale_price?: number | null;
        };
        Update: {
          brand_id?: string | null;
          category_id?: string;
          description?: string | null;
          gender?: string | null;
          gender_id?: string;
          item_number?: string;
          name?: string;
          origin_id?: string | null;
          pos_description?: string | null;
          product_id?: number;
          supplier_id?: string | null;
          theme?: string | null;
          wholesale_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_products_brand_id";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_products_category_id";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_products_gender_id";
            columns: ["gender_id"];
            isOneToOne: false;
            referencedRelation: "genders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_products_origin_id";
            columns: ["origin_id"];
            isOneToOne: false;
            referencedRelation: "origins";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          brand_id: string | null;
          category_id: string | null;
          color: string | null;
          cost_price: number;
          created_at: string;
          created_by: string | null;
          gender_id: string | null;
          id: string;
          item_description: string | null;
          item_id: string | null;
          item_name: string;
          model_number: string | null;
          origin_id: string | null;
          po_id: string;
          quantity: number;
          received_quantity: number;
          size: string | null;
          sku: string;
          unit: string | null;
          updated_by: string | null;
        };
        Insert: {
          brand_id?: string | null;
          category_id?: string | null;
          color?: string | null;
          cost_price: number;
          created_at?: string;
          created_by?: string | null;
          gender_id?: string | null;
          id?: string;
          item_description?: string | null;
          item_id?: string | null;
          item_name: string;
          model_number?: string | null;
          origin_id?: string | null;
          po_id: string;
          quantity: number;
          received_quantity?: number;
          size?: string | null;
          sku: string;
          unit?: string | null;
          updated_by?: string | null;
        };
        Update: {
          brand_id?: string | null;
          category_id?: string | null;
          color?: string | null;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          gender_id?: string | null;
          id?: string;
          item_description?: string | null;
          item_id?: string | null;
          item_name?: string;
          model_number?: string | null;
          origin_id?: string | null;
          po_id?: string;
          quantity?: number;
          received_quantity?: number;
          size?: string | null;
          sku?: string;
          unit?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          authorized_by: string | null;
          billing_address: string | null;
          buyer_address: string | null;
          buyer_company_name: string | null;
          buyer_contact: string | null;
          created_by: string | null;
          currency: string | null;
          currency_id: string | null;
          expected_delivery: string | null;
          expected_delivery_date: string | null;
          fob_terms: string | null;
          id: number;
          order_date: string;
          payment_terms: string | null;
          po_id: number;
          po_number: string | null;
          shipping_address: string | null;
          shipping_charges: number | null;
          shipping_method: string | null;
          special_instructions: string | null;
          status: string | null;
          store_id: string | null;
          subtotal: number | null;
          supplier: string | null;
          supplier_contact_person: string | null;
          supplier_id: string;
          tax_amount: number | null;
          total_cost: number | null;
          total_items: number | null;
          updated_by: string | null;
        };
        Insert: {
          authorized_by?: string | null;
          billing_address?: string | null;
          buyer_address?: string | null;
          buyer_company_name?: string | null;
          buyer_contact?: string | null;
          created_by?: string | null;
          currency?: string | null;
          currency_id?: string | null;
          expected_delivery?: string | null;
          expected_delivery_date?: string | null;
          fob_terms?: string | null;
          id?: number;
          order_date: string;
          payment_terms?: string | null;
          po_id?: number;
          po_number?: string | null;
          shipping_address?: string | null;
          shipping_charges?: number | null;
          shipping_method?: string | null;
          special_instructions?: string | null;
          status?: string | null;
          store_id?: string | null;
          subtotal?: number | null;
          supplier?: string | null;
          supplier_contact_person?: string | null;
          supplier_id: string;
          tax_amount?: number | null;
          total_cost?: number | null;
          total_items?: number | null;
          updated_by?: string | null;
        };
        Update: {
          authorized_by?: string | null;
          billing_address?: string | null;
          buyer_address?: string | null;
          buyer_company_name?: string | null;
          buyer_contact?: string | null;
          created_by?: string | null;
          currency?: string | null;
          currency_id?: string | null;
          expected_delivery?: string | null;
          expected_delivery_date?: string | null;
          fob_terms?: string | null;
          id?: number;
          order_date?: string;
          payment_terms?: string | null;
          po_id?: number;
          po_number?: string | null;
          shipping_address?: string | null;
          shipping_charges?: number | null;
          shipping_method?: string | null;
          special_instructions?: string | null;
          status?: string | null;
          store_id?: string | null;
          subtotal?: number | null;
          supplier?: string | null;
          supplier_contact_person?: string | null;
          supplier_id?: string;
          tax_amount?: number | null;
          total_cost?: number | null;
          total_items?: number | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          created_at: string;
          id: string;
          refund_amount: number;
          refund_reason: string | null;
          refunded_by: string | null;
          transaction_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          refund_amount: number;
          refund_reason?: string | null;
          refunded_by?: string | null;
          transaction_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          refund_amount?: number;
          refund_reason?: string | null;
          refunded_by?: string | null;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_sessions: {
        Row: {
          created_at: string | null;
          created_by: number | null;
          discount: number | null;
          id: number;
          store_id: number | null;
          tax: number | null;
          total: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: number | null;
          discount?: number | null;
          id?: number;
          store_id?: number | null;
          tax?: number | null;
          total?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: number | null;
          discount?: number | null;
          id?: number;
          store_id?: number | null;
          tax?: number | null;
          total?: number | null;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          customer_id: number | null;
          sale_id: number;
          sale_session_id: number | null;
          sale_timestamp: string | null;
          total_amount: number | null;
          user_id: number | null;
        };
        Insert: {
          customer_id?: number | null;
          sale_id?: number;
          sale_session_id?: number | null;
          sale_timestamp?: string | null;
          total_amount?: number | null;
          user_id?: number | null;
        };
        Update: {
          customer_id?: number | null;
          sale_id?: number;
          sale_session_id?: number | null;
          sale_timestamp?: string | null;
          total_amount?: number | null;
          user_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_sale_session_id_fkey";
            columns: ["sale_session_id"];
            isOneToOne: false;
            referencedRelation: "sale_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      sizes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      stock_on_hand: {
        Row: {
          last_updated: string | null;
          min_stock: number | null;
          quantity: number;
          store_id: string;
          variant_id: number;
        };
        Insert: {
          last_updated?: string | null;
          min_stock?: number | null;
          quantity?: number;
          store_id: string;
          variant_id: number;
        };
        Update: {
          last_updated?: string | null;
          min_stock?: number | null;
          quantity?: number;
          store_id?: string;
          variant_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stock_on_hand_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_on_hand_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      store_inventory: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          quantity: number | null;
          store_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          quantity?: number | null;
          store_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          quantity?: number | null;
          store_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_inventory_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          location: string | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location?: string | null;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          address: string | null;
          contact_person: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          currency: string;
          default_tax_rate: number;
          default_unit: string;
          enable_audit_log: boolean;
          id: string;
          low_stock_threshold: number;
          require_2fa: boolean;
          updated_at: string | null;
        };
        Insert: {
          currency?: string;
          default_tax_rate?: number;
          default_unit?: string;
          enable_audit_log?: boolean;
          id?: string;
          low_stock_threshold?: number;
          require_2fa?: boolean;
          updated_at?: string | null;
        };
        Update: {
          currency?: string;
          default_tax_rate?: number;
          default_unit?: string;
          enable_audit_log?: boolean;
          id?: string;
          low_stock_threshold?: number;
          require_2fa?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      test: {
        Row: {
          id: number;
          name: string | null;
        };
        Insert: {
          id: number;
          name?: string | null;
        };
        Update: {
          id?: number;
          name?: string | null;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          cashier_id: string | null;
          created_at: string;
          discount_fixed: number;
          discount_percent: number;
          id: string;
          is_refund: boolean;
          is_refunded: boolean;
          item_id: string | null;
          payment_method: string;
          price: number;
          quantity: number;
          session_id: string | null;
          sku: string;
          transaction_id: string;
        };
        Insert: {
          amount: number;
          cashier_id?: string | null;
          created_at?: string;
          discount_fixed?: number;
          discount_percent?: number;
          id?: string;
          is_refund?: boolean;
          is_refunded?: boolean;
          item_id?: string | null;
          payment_method?: string;
          price: number;
          quantity?: number;
          session_id?: string | null;
          sku: string;
          transaction_id: string;
        };
        Update: {
          amount?: number;
          cashier_id?: string | null;
          created_at?: string;
          discount_fixed?: number;
          discount_percent?: number;
          id?: string;
          is_refund?: boolean;
          is_refunded?: boolean;
          item_id?: string | null;
          payment_method?: string;
          price?: number;
          quantity?: number;
          session_id?: string | null;
          sku?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cash_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      transfer_items: {
        Row: {
          quantity: number;
          transfer_id: number;
          transfer_item_id: number;
          variant_id: number;
        };
        Insert: {
          quantity: number;
          transfer_id: number;
          transfer_item_id?: number;
          variant_id: number;
        };
        Update: {
          quantity?: number;
          transfer_id?: number;
          transfer_item_id?: number;
          variant_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "transfer_items_transfer_id_fkey";
            columns: ["transfer_id"];
            isOneToOne: false;
            referencedRelation: "transfers";
            referencedColumns: ["transfer_id"];
          },
          {
            foreignKeyName: "transfer_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      transfers: {
        Row: {
          from_store_id: string;
          status: string | null;
          to_store_id: string;
          transfer_date: string | null;
          transfer_id: number;
        };
        Insert: {
          from_store_id: string;
          status?: string | null;
          to_store_id: string;
          transfer_date?: string | null;
          transfer_id?: number;
        };
        Update: {
          from_store_id?: string;
          status?: string | null;
          to_store_id?: string;
          transfer_date?: string | null;
          transfer_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "transfers_from_store_id_fkey";
            columns: ["from_store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey";
            columns: ["to_store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      variants: {
        Row: {
          color: string | null;
          color_id: string | null;
          cost: number | null;
          cost_price: number | null;
          created_at: string | null;
          item_color_code: string | null;
          last_restocked: string | null;
          product_id: number;
          season: string | null;
          season_id: string | null;
          selling_price: number;
          size: string | null;
          size_id: string | null;
          sku: string;
          supplier_id: string | null;
          tax_rate: number | null;
          unit: string | null;
          updated_at: string | null;
          variant_id: number;
        };
        Insert: {
          color?: string | null;
          color_id?: string | null;
          cost?: number | null;
          cost_price?: number | null;
          created_at?: string | null;
          item_color_code?: string | null;
          last_restocked?: string | null;
          product_id: number;
          season?: string | null;
          season_id?: string | null;
          selling_price: number;
          size?: string | null;
          size_id?: string | null;
          sku: string;
          supplier_id?: string | null;
          tax_rate?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          variant_id?: number;
        };
        Update: {
          color?: string | null;
          color_id?: string | null;
          cost?: number | null;
          cost_price?: number | null;
          created_at?: string | null;
          item_color_code?: string | null;
          last_restocked?: string | null;
          product_id?: number;
          season?: string | null;
          season_id?: string | null;
          selling_price?: number;
          size?: string | null;
          size_id?: string | null;
          sku?: string;
          supplier_id?: string | null;
          tax_rate?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          variant_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_supplier";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_variants_color_id";
            columns: ["color_id"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_variants_season_id";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_variants_size_id";
            columns: ["size_id"];
            isOneToOne: false;
            referencedRelation: "sizes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "variants_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_store_stock_levels: {
        Row: {
          brand: string | null;
          category: string | null;
          id: string | null;
          item_id: string | null;
          item_name: string | null;
          last_restocked: string | null;
          min_stock: number | null;
          quantity: number | null;
          sku: string | null;
          store_id: string | null;
          store_name: string | null;
          unit: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "store_inventory_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_foreign_key: {
        Args: {
          column_name_param: string;
          foreign_column_param: string;
          foreign_table_param: string;
          table_name_param: string;
        };
        Returns: Json;
      };
      check_low_stock_notifications: { Args: never; Returns: undefined };
      create_attribute_table: {
        Args: { p_icon?: string; p_label: string; p_table_name: string };
        Returns: Json;
      };
      execute_sql: { Args: { sql: string }; Returns: Json };
      generate_pi_session_number: { Args: never; Returns: string };
      generate_po_number: { Args: { supplier_name: string }; Returns: string };
      get_table_columns: {
        Args: { table_name_param: string };
        Returns: {
          column_default: string;
          column_name: string;
          data_type: string;
          foreign_column: string;
          foreign_table: string;
          is_foreign_key: boolean;
          is_nullable: string;
          is_primary_key: boolean;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { uid: string }; Returns: boolean };
      list_public_tables: {
        Args: never;
        Returns: {
          table_name: string;
        }[];
      };
      pos_session_expected_cash: {
        Args: { session_id_param: string };
        Returns: number;
      };
      rename_column: {
        Args: {
          new_column_name: string;
          old_column_name: string;
          table_name_param: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "user" | "supervisor" | "inventory_man" | "cashier";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "supervisor", "inventory_man", "cashier"],
    },
  },
} as const;
