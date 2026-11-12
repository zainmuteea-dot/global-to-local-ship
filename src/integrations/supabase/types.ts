export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type InsertWithRequired<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>

type MerchantStoreRow = {
  id: string
  owner_id: string
  name: string
  description: string
  contact_phone: string
  city: string
  status: "active" | "suspended"
  commission_rate: number
  created_by: string | null
  created_at: string
  updated_at: string
}

type MerchantProductRow = {
  id: string
  store_id: string
  title: string
  description: string
  category: string
  price: number
  currency: "YER" | "SAR" | "USD"
  stock: number
  image_path: string
  status: "draft" | "pending_review" | "approved" | "rejected" | "archived"
  review_note: string | null
  created_at: string
  updated_at: string
}

type MerchantOrderRow = {
  id: string
  customer_id: string | null
  store_id: string
  product_id: string
  product_title: string
  quantity: number
  unit_price: number
  currency: "YER" | "SAR" | "USD"
  commission_rate: number
  total_amount: number
  commission_amount: number
  seller_amount: number
  customer_name: string
  customer_phone: string
  customer_city: string
  delivery_address: string
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"
  created_at: string
  updated_at: string
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          details: string
          id: string
          label: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          details: string
          id?: string
          label?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          details?: string
          id?: string
          label?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      admin_role_guard: {
        Row: {
          id: boolean
        }
        Insert: {
          id?: boolean
        }
        Update: {
          id?: boolean
        }
        Relationships: []
      }
      finance_vouchers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string
          fund: string
          id: string
          party: string
          source: string
          voucher_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          fund: string
          id?: string
          party?: string
          source?: string
          voucher_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          fund?: string
          id?: string
          party?: string
          source?: string
          voucher_type?: string
        }
        Relationships: []
      }
      merchant_orders: {
        Row: MerchantOrderRow
        Insert: InsertWithRequired<
          MerchantOrderRow,
          | "store_id"
          | "product_id"
          | "product_title"
          | "quantity"
          | "unit_price"
          | "currency"
          | "commission_rate"
          | "total_amount"
          | "commission_amount"
          | "seller_amount"
          | "customer_name"
          | "customer_phone"
          | "customer_city"
          | "delivery_address"
        >
        Update: Partial<MerchantOrderRow>
        Relationships: []
      }
      merchant_products: {
        Row: MerchantProductRow
        Insert: InsertWithRequired<MerchantProductRow, "store_id" | "title" | "price" | "image_path">
        Update: Partial<MerchantProductRow>
        Relationships: []
      }
      merchant_stores: {
        Row: MerchantStoreRow
        Insert: InsertWithRequired<MerchantStoreRow, "owner_id" | "name" | "contact_phone">
        Update: Partial<MerchantStoreRow>
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      site_ticker_messages: {
        Row: {
          badge: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          href: string | null
          id: string
          is_active: boolean
          message: string
          placement: "home_guest" | "dashboard" | "both"
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          badge?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          message: string
          placement?: "home_guest" | "dashboard" | "both"
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          message?: string
          placement?: "home_guest" | "dashboard" | "both"
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          is_active: boolean
          kind: string
          message: string | null
          payment_id: string | null
          sent_at: string | null
          sent_by: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          message?: string | null
          payment_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          message?: string | null
          payment_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          original_currency: string | null
          phone: string
          product_link: string
          product_name: string | null
          quote_currency: string | null
          sms_accepted_at: string | null
          sms_attempt_count: number | null
          sms_error: string | null
          sms_last_attempt_at: string | null
          sms_provider_batch_id: string | null
          sms_provider_response: Json | null
          sms_status: string | null
          status: string
          total_cost_sar: number | null
          total_cost_usd: number | null
          total_cost_yer: number | null
          tracking_code: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          original_currency?: string | null
          phone: string
          product_link: string
          product_name?: string | null
          quote_currency?: string | null
          sms_accepted_at?: string | null
          sms_attempt_count?: number | null
          sms_error?: string | null
          sms_last_attempt_at?: string | null
          sms_provider_batch_id?: string | null
          sms_provider_response?: Json | null
          sms_status?: string | null
          status?: string
          total_cost_sar?: number | null
          total_cost_usd?: number | null
          total_cost_yer?: number | null
          tracking_code?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          original_currency?: string | null
          phone?: string
          product_link?: string
          product_name?: string | null
          quote_currency?: string | null
          sms_accepted_at?: string | null
          sms_attempt_count?: number | null
          sms_error?: string | null
          sms_last_attempt_at?: string | null
          sms_provider_batch_id?: string | null
          sms_provider_response?: Json | null
          sms_status?: string | null
          status?: string
          total_cost_sar?: number | null
          total_cost_usd?: number | null
          total_cost_yer?: number | null
          tracking_code?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_name: string | null
          id: string
          phone: string | null
          receipt_image: string | null
          reviewed_at: string | null
          status: string
          tracking_code: string
          updated_at: string
          user_id: string | null
          wallet: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_name?: string | null
          id?: string
          phone?: string | null
          receipt_image?: string | null
          reviewed_at?: string | null
          status?: string
          tracking_code: string
          updated_at?: string
          user_id?: string | null
          wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_name?: string | null
          id?: string
          phone?: string | null
          receipt_image?: string | null
          reviewed_at?: string | null
          status?: string
          tracking_code?: string
          updated_at?: string
          user_id?: string | null
          wallet?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_links: {
        Row: {
          slug: string
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          slug: string
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          slug?: string
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: { _customer_name: string; _phone: string; _product_link: string }
        Returns: string
      }
      current_user_has_permission: {
        Args: { _action: string; _area: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      track_order:
        | {
            Args: { _code: string }
            Returns: {
              created_at: string
              product_link: string
              product_name: string
              status: string
              tracking_code: string
              updated_at: string
            }[]
          }
        | {
            Args: { _code: string; _phone: string }
            Returns: {
              created_at: string
              customer_phone: string
              product_name: string
              status: string
              tracking_code: string
              updated_at: string
            }[]
          }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const
