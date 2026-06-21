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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean | null
          badge: string | null
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          expires_at: string | null
          icon: string | null
          id: string
          message: string
          sub_message: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message: string
          sub_message?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message?: string
          sub_message?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          count: number | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          id: string
          img: string
          sort_order: number | null
          sub: string | null
          title: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          img: string
          sort_order?: number | null
          sub?: string | null
          title: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          img?: string
          sort_order?: number | null
          sub?: string | null
          title?: string
        }
        Relationships: []
      }
      inventory_locks: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          reserved_until: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          reserved_until: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          reserved_until?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          read: boolean | null
          receiver_avatar: string | null
          receiver_id: string
          receiver_name: string | null
          sender_avatar: string | null
          sender_id: string
          sender_name: string | null
          sender_role: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          read?: boolean | null
          receiver_avatar?: string | null
          receiver_id: string
          receiver_name?: string | null
          sender_avatar?: string | null
          sender_id: string
          sender_name?: string | null
          sender_role?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          read?: boolean | null
          receiver_avatar?: string | null
          receiver_id?: string
          receiver_name?: string | null
          sender_avatar?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_role?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          link: string | null
          message: string
          order_id: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          link?: string | null
          message: string
          order_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          link?: string | null
          message?: string
          order_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image: string | null
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: Json | null
          vendor_id: string | null
        }
        Insert: {
          id?: string
          image?: string | null
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity: number
          selected_color?: Json | null
          vendor_id?: string | null
        }
        Update: {
          id?: string
          image?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: Json | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          cancel_reason: string | null
          cancel_request: Json | null
          created_at: string | null
          date: string | null
          delivery_fee: number | null
          discount: number | null
          id: string
          items: Json
          parent_order_id: string | null
          payment_method: string | null
          payment_status: string | null
          promo_code: string | null
          shipping_address: string | null
          status: string | null
          subtotal: number | null
          total: number
          user_id: string
          user_name: string | null
          vendor_id: string | null
          vendor_statuses: Json | null
        }
        Insert: {
          address?: string | null
          cancel_reason?: string | null
          cancel_request?: Json | null
          created_at?: string | null
          date?: string | null
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          items?: Json
          parent_order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          promo_code?: string | null
          shipping_address?: string | null
          status?: string | null
          subtotal?: number | null
          total: number
          user_id: string
          user_name?: string | null
          vendor_id?: string | null
          vendor_statuses?: Json | null
        }
        Update: {
          address?: string | null
          cancel_reason?: string | null
          cancel_request?: Json | null
          created_at?: string | null
          date?: string | null
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          items?: Json
          parent_order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          promo_code?: string | null
          shipping_address?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number
          user_id?: string
          user_name?: string | null
          vendor_id?: string | null
          vendor_statuses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      product_updates: {
        Row: {
          changes: Json
          created_at: string | null
          date: string | null
          id: string
          product_id: string
          reason: string | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          changes?: Json
          created_at?: string | null
          date?: string | null
          id?: string
          product_id: string
          reason?: string | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          changes?: Json
          created_at?: string | null
          date?: string | null
          id?: string
          product_id?: string
          reason?: string | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_updates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_updates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approved_at: string | null
          category: string
          category_id: string | null
          colors: Json | null
          created_at: string | null
          deal_type: string | null
          description: string | null
          extra_image_1: string | null
          extra_image_2: string | null
          extra_image_3: string | null
          id: string
          image: string
          images: string[] | null
          in_stock: boolean | null
          is_new: boolean | null
          is_sale: boolean | null
          keywords: string[] | null
          main_image: string | null
          name: string
          original_price: number
          price: number
          rating: number | null
          reject_reason: string | null
          reviews_count: number | null
          specifications: Json | null
          status: string | null
          stock: number | null
          stock_status: string | null
          subcategory: string | null
          units: number | null
          updated_at: string | null
          vendor: string
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          approved_at?: string | null
          category: string
          category_id?: string | null
          colors?: Json | null
          created_at?: string | null
          deal_type?: string | null
          description?: string | null
          extra_image_1?: string | null
          extra_image_2?: string | null
          extra_image_3?: string | null
          id?: string
          image: string
          images?: string[] | null
          in_stock?: boolean | null
          is_new?: boolean | null
          is_sale?: boolean | null
          keywords?: string[] | null
          main_image?: string | null
          name: string
          original_price: number
          price: number
          rating?: number | null
          reject_reason?: string | null
          reviews_count?: number | null
          specifications?: Json | null
          status?: string | null
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          units?: number | null
          updated_at?: string | null
          vendor: string
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          approved_at?: string | null
          category?: string
          category_id?: string | null
          colors?: Json | null
          created_at?: string | null
          deal_type?: string | null
          description?: string | null
          extra_image_1?: string | null
          extra_image_2?: string | null
          extra_image_3?: string | null
          id?: string
          image?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_new?: boolean | null
          is_sale?: boolean | null
          keywords?: string[] | null
          main_image?: string | null
          name?: string
          original_price?: number
          price?: number
          rating?: number | null
          reject_reason?: string | null
          reviews_count?: number | null
          specifications?: Json | null
          status?: string | null
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          units?: number | null
          updated_at?: string | null
          vendor?: string
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar: string | null
          banner: string | null
          bio: string | null
          created_at: string | null
          email: string
          email_changed_at: string | null
          id: string
          login_at: number | null
          name: string
          nickname: string | null
          nid_trade_license: string | null
          notification_preferences: Json | null
          phone: string | null
          promotion_enabled: boolean | null
          role: string
          social_facebook: string | null
          social_instagram: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          status: string | null
          store_category: string | null
          store_city: string | null
          store_description: string | null
          store_name: string | null
          suspend_reason: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          banner?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          email_changed_at?: string | null
          id: string
          login_at?: number | null
          name?: string
          nickname?: string | null
          nid_trade_license?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          promotion_enabled?: boolean | null
          role?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          status?: string | null
          store_category?: string | null
          store_city?: string | null
          store_description?: string | null
          store_name?: string | null
          suspend_reason?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          banner?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          email_changed_at?: string | null
          id?: string
          login_at?: number | null
          name?: string
          nickname?: string | null
          nid_trade_license?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          promotion_enabled?: boolean | null
          role?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          status?: string | null
          store_category?: string | null
          store_city?: string | null
          store_description?: string | null
          store_name?: string | null
          suspend_reason?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          applies_to: string | null
          assigned_vendor_id: string | null
          code: string
          code_type: string | null
          created_at: string | null
          delivery_discount: number | null
          delivery_discount_type: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          note: string | null
          status: string | null
          used_count: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          applies_to?: string | null
          assigned_vendor_id?: string | null
          code: string
          code_type?: string | null
          created_at?: string | null
          delivery_discount?: number | null
          delivery_discount_type?: string | null
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          note?: string | null
          status?: string | null
          used_count?: number | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          applies_to?: string | null
          assigned_vendor_id?: string | null
          code?: string
          code_type?: string | null
          created_at?: string | null
          delivery_discount?: number | null
          delivery_discount_type?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          note?: string | null
          status?: string | null
          used_count?: number | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_products: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          product_id: string
          product_name: string
          reason: string
          reporter_name: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          product_id: string
          product_name: string
          reason: string
          reporter_name: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          product_id?: string
          product_name?: string
          reason?: string
          reporter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_reviews: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          product_id: string
          report_reason: string | null
          review_id: string
          review_text: string
          reviewer_name: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          product_id: string
          report_reason?: string | null
          review_id: string
          review_text: string
          reviewer_name: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          product_id?: string
          report_reason?: string | null
          review_id?: string
          review_text?: string
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reported_reviews_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          review_id: string
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          review_id: string
          vendor_id: string
          vendor_name: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          review_id?: string
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          date: string | null
          id: string
          product_id: string | null
          product_image: string | null
          product_name: string | null
          rating: number
          user_avatar: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          rating: number
          user_avatar?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          rating?: number
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string
          vendor_reply?: string | null
          vendor_reply_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          count: number | null
          id: string
          name: string
        }
        Insert: {
          category_id: string
          count?: number | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          count?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          message: string | null
          order_id: string | null
          priority: string | null
          replies: Json | null
          status: string | null
          subject: string
          user_email: string
          user_id: string
          user_name: string
          user_role: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          message?: string | null
          order_id?: string | null
          priority?: string | null
          replies?: Json | null
          status?: string | null
          subject: string
          user_email: string
          user_id: string
          user_name: string
          user_role?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          message?: string | null
          order_id?: string | null
          priority?: string | null
          replies?: Json | null
          status?: string | null
          subject?: string
          user_email?: string
          user_id?: string
          user_name?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_requests: {
        Row: {
          created_at: string | null
          current_value: string | null
          id: string
          reason: string | null
          request_type: string
          requested_value: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          current_value?: string | null
          id?: string
          reason?: string | null
          request_type: string
          requested_value?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id: string
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          current_value?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          requested_value?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      release_expired_locks: { Args: never; Returns: undefined }
      reserve_inventory: {
        Args: { p_items: Json; p_order_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
