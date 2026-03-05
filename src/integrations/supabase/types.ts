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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bans: {
        Row: {
          ban_type: string
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string
          target_id: string
          target_type: string
        }
        Insert: {
          ban_type: string
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason: string
          target_id: string
          target_type: string
        }
        Update: {
          ban_type?: string
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      canteens: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          image_url: string | null
          is_accepting_orders: boolean
          is_open: boolean
          location: string
          name: string
          order_limit: number | null
          stock_mode: string
          updated_at: string
          vendor_email: string | null
          vendor_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean
          is_open?: boolean
          location: string
          name: string
          order_limit?: number | null
          stock_mode?: string
          updated_at?: string
          vendor_email?: string | null
          vendor_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean
          is_open?: boolean
          location?: string
          name?: string
          order_limit?: number | null
          stock_mode?: string
          updated_at?: string
          vendor_email?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canteens_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          canteen_id: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          canteen_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          canteen_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
        ]
      }
      college_config: {
        Row: {
          campus_radius_meters: number
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          show_nearby_shops: boolean
          updated_at: string
        }
        Insert: {
          campus_radius_meters?: number
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          show_nearby_shops?: boolean
          updated_at?: string
        }
        Update: {
          campus_radius_meters?: number
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          show_nearby_shops?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          canteen_id: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          minimum_amount: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          canteen_id?: string | null
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          minimum_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          canteen_id?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          minimum_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
        ]
      }
      crown_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crown_rewards: {
        Row: {
          created_at: string
          crowns_required: number
          description: string
          discount_value: number | null
          id: string
          is_active: boolean
          name: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crowns_required: number
          description: string
          discount_value?: number | null
          id?: string
          is_active?: boolean
          name: string
          reward_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crowns_required?: number
          description?: string
          discount_value?: number | null
          id?: string
          is_active?: boolean
          name?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crown_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crown_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stock: {
        Row: {
          canteen_id: string
          created_at: string
          date: string
          id: string
          menu_item_id: string
          remaining_quantity: number
          status: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          canteen_id: string
          created_at?: string
          date?: string
          id?: string
          menu_item_id: string
          remaining_quantity: number
          status?: string
          total_quantity: number
          updated_at?: string
        }
        Update: {
          canteen_id?: string
          created_at?: string
          date?: string
          id?: string
          menu_item_id?: string
          remaining_quantity?: number
          status?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_stock_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_stock_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications_sent: {
        Row: {
          id: string
          order_id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          order_id: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_sent_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          canteen_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          prep_time: number | null
          price: number
          updated_at: string
        }
        Insert: {
          canteen_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          prep_time?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          canteen_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          prep_time?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string | null
          processed: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id?: string | null
          processed?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string | null
          processed?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_rejection_notifications: {
        Row: {
          canteen_id: string
          canteen_name: string
          created_at: string
          id: string
          is_dismissed: boolean
          order_id: string
          rejection_reason: string | null
          user_id: string
        }
        Insert: {
          canteen_id: string
          canteen_name: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          order_id: string
          rejection_reason?: string | null
          user_id: string
        }
        Update: {
          canteen_id?: string
          canteen_name?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          order_id?: string
          rejection_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_rejection_notifications_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_rejection_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          canteen_id: string
          created_at: string
          customer_phone: string | null
          estimated_ready_time: string | null
          id: string
          net_profit: number | null
          order_no: number | null
          payment_id: string | null
          payment_session_id: string | null
          payment_status: string
          pg_fee: number | null
          pickup_code: string
          platform_fee: number | null
          qr_token: string | null
          qr_used: boolean
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          canteen_id: string
          created_at?: string
          customer_phone?: string | null
          estimated_ready_time?: string | null
          id?: string
          net_profit?: number | null
          order_no?: number | null
          payment_id?: string | null
          payment_session_id?: string | null
          payment_status?: string
          pg_fee?: number | null
          pickup_code: string
          platform_fee?: number | null
          qr_token?: string | null
          qr_used?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          canteen_id?: string
          created_at?: string
          customer_phone?: string | null
          estimated_ready_time?: string | null
          id?: string
          net_profit?: number | null
          order_no?: number | null
          payment_id?: string | null
          payment_session_id?: string | null
          payment_status?: string
          pg_fee?: number | null
          pickup_code?: string
          platform_fee?: number | null
          qr_token?: string | null
          qr_used?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_canteen_id_fkey"
            columns: ["canteen_id"]
            isOneToOne: false
            referencedRelation: "canteens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redeemed_rewards: {
        Row: {
          coupon_code: string
          created_at: string
          discount_value: number
          expires_at: string
          id: string
          is_used: boolean
          reward_id: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          created_at?: string
          discount_value: number
          expires_at?: string
          id?: string
          is_used?: boolean
          reward_id: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          created_at?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_used?: boolean
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeemed_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "crown_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_email_notifications_sent: {
        Row: {
          id: string
          order_id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          order_id: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_email_notifications_sent_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          shop_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_images_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_menu_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          prep_time: number | null
          price: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          prep_time?: number | null
          price: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          prep_time?: number | null
          price?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "shop_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          estimated_ready_time: string | null
          id: string
          net_profit: number | null
          notes: string | null
          order_no: number | null
          payment_id: string | null
          payment_session_id: string | null
          payment_status: string
          pg_fee: number | null
          pickup_code: string
          platform_fee: number | null
          qr_token: string | null
          qr_used: boolean
          shop_id: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_ready_time?: string | null
          id?: string
          net_profit?: number | null
          notes?: string | null
          order_no?: number | null
          payment_id?: string | null
          payment_session_id?: string | null
          payment_status?: string
          pg_fee?: number | null
          pickup_code: string
          platform_fee?: number | null
          qr_token?: string | null
          qr_used?: boolean
          shop_id: string
          status?: string
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_ready_time?: string | null
          id?: string
          net_profit?: number | null
          notes?: string | null
          order_no?: number | null
          payment_id?: string | null
          payment_session_id?: string | null
          payment_status?: string
          pg_fee?: number | null
          pickup_code?: string
          platform_fee?: number | null
          qr_token?: string | null
          qr_used?: boolean
          shop_id?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          approval_status: string
          created_at: string
          id: string
          image_url: string | null
          is_open: boolean
          latitude: number
          longitude: number
          owner_id: string
          owner_name: string
          phone: string
          shop_name: string
          shop_type: string
          updated_at: string
        }
        Insert: {
          address: string
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_open?: boolean
          latitude: number
          longitude: number
          owner_id: string
          owner_name: string
          phone: string
          shop_name: string
          shop_type?: string
          updated_at?: string
        }
        Update: {
          address?: string
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_open?: boolean
          latitude?: number
          longitude?: number
          owner_id?: string
          owner_name?: string
          phone?: string
          shop_name?: string
          shop_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_notifications_sent: {
        Row: {
          id: string
          message_id: string | null
          order_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          order_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string | null
          order_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_pending_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          link_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          link_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          link_code?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_polling_state: {
        Row: {
          id: string
          last_update_id: number
          updated_at: string
        }
        Insert: {
          id?: string
          last_update_id?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_update_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["super_admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["super_admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["super_admin_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_crowns_for_order: {
        Args: { p_order_id: string; p_order_total: number; p_user_id: string }
        Returns: number
      }
      calculate_order_eta: {
        Args: { p_canteen_id: string; p_item_ids: string[] }
        Returns: string
      }
      calculate_shop_order_eta: {
        Args: { p_item_ids: string[]; p_shop_id: string }
        Returns: string
      }
      can_canteen_accept_orders: {
        Args: { p_canteen_id: string }
        Returns: boolean
      }
      check_item_availability: {
        Args: { p_menu_item_id: string }
        Returns: Json
      }
      generate_qr_token: { Args: never; Returns: string }
      get_active_order_count: {
        Args: { p_canteen_id: string }
        Returns: number
      }
      get_next_canteen_order_no: {
        Args: { p_canteen_id: string }
        Returns: number
      }
      get_next_shop_order_no: { Args: { p_shop_id: string }; Returns: number }
      has_super_admin_role: { Args: { _user_id: string }; Returns: boolean }
      is_banned: {
        Args: { _target_id: string; _target_type: string }
        Returns: boolean
      }
      redeem_crown_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      reduce_daily_stock: {
        Args: { p_menu_item_id: string; p_quantity: number }
        Returns: Json
      }
      verify_qr_and_complete_order: {
        Args: { p_qr_token: string; p_vendor_id: string }
        Returns: Json
      }
      verify_qr_and_complete_shop_order: {
        Args: { p_owner_id: string; p_qr_token: string }
        Returns: Json
      }
    }
    Enums: {
      order_status: "pending" | "accepted" | "ready" | "completed" | "rejected"
      super_admin_role: "super_admin"
      user_role: "student" | "vendor"
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
      order_status: ["pending", "accepted", "ready", "completed", "rejected"],
      super_admin_role: ["super_admin"],
      user_role: ["student", "vendor"],
    },
  },
} as const
