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
      app_settings: {
        Row: {
          id: number
          sfit_email_lock: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          sfit_email_lock?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          sfit_email_lock?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          created_at: string
          id: string
          item_id: string
          message: string
          status: Database["public"]["Enums"]["claim_status"]
          user_id: string
          verification_question: string | null
          verification_answer: string | null
          meeting_requested: boolean
          meeting_details: string | null
          appeal_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          message: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id: string
          verification_question?: string | null
          verification_answer?: string | null
          meeting_requested?: boolean
          meeting_details?: string | null
          appeal_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          message?: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id?: string
          verification_question?: string | null
          verification_answer?: string | null
          meeting_requested?: boolean
          meeting_details?: string | null
          appeal_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string
          id: string
          item_id: string
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          date_occurred: string | null
          deleted_at: string | null
          description: string | null
          id: string
          location: string | null
          held_at: string | null
          held_where: string | null
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          date_occurred?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          held_at?: string | null
          held_where?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          date_occurred?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          held_at?: string | null
          held_where?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          read: boolean
          related_claim_id: string | null
          related_item_id: string | null
          sender_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          read?: boolean
          related_claim_id?: string | null
          related_item_id?: string | null
          sender_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read?: boolean
          related_claim_id?: string | null
          related_item_id?: string | null
          sender_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          year?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_public_items: {
        Args: { search_query: string; search_type?: string; search_category?: string; p_limit?: number; p_before_score?: number | null; p_before_created_at?: string | null; p_before_id?: string | null }
        Returns: { id: string; created_at: string; user_id: string; title: string; description: string | null; category: string; location: string | null; status: string; date_occurred: string | null; held_where: string | null; held_at: string | null; is_public: boolean; image_url: string | null; image_count: number; relevance_score: number }[]
      }
      browse_public_items: {
        Args: { search_type?: string; search_category?: string; p_limit?: number; p_before_created_at?: string | null; p_before_id?: string | null }
        Returns: { id: string; created_at: string; user_id: string; title: string; description: string | null; category: string; location: string | null; status: string; date_occurred: string | null; held_where: string | null; held_at: string | null; is_public: boolean; image_url: string | null; image_count: number; relevance_score: number }[]
      }
      get_recent_public_items: {
        Args: { p_limit?: number }
        Returns: { id: string; created_at: string; user_id: string; title: string; description: string | null; category: string; location: string | null; status: string; date_occurred: string | null; held_where: string | null; held_at: string | null; is_public: boolean; image_url: string | null; image_count: number; relevance_score: number }[]
      }
      get_home_stats: {
        Args: Record<PropertyKey, never>
        Returns: { total_active: number; total_resolved: number; recent_activity: number }[]
      }
      get_related_public_items: {
        Args: { p_item_id: string; p_category: string; p_status: string; p_limit?: number }
        Returns: { id: string; created_at: string; user_id: string; title: string; description: string | null; category: string; location: string | null; status: string; date_occurred: string | null; held_where: string | null; held_at: string | null; is_public: boolean; image_url: string | null; image_count: number; relevance_score: number }[]
      }
      list_public_items: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          description: string | null
          category: string
          location: string | null
          held_where: string | null
          held_at: string | null
          status: string
          date_occurred: string | null
          created_at: string
          user_id: string
        }[]
      }
      get_public_item: {
        Args: { _id: string }
        Returns: {
          id: string
          title: string
          description: string | null
          category: string
          location: string | null
          held_where: string | null
          held_at: string | null
          status: string
          date_occurred: string | null
          created_at: string
          user_id: string
        }[]
      }
      check_item_availability: {
        Args: { _id: string }
        Returns: {
          id: string
          title: string
          status: string
          category: string
          location: string | null
          is_deleted: boolean
          deleted_at: string | null
        }[]
      }
      list_public_item_images: {
        Args: { _ids: string[] }
        Returns: {
          item_id: string
          url: string
        }[]
      }
      list_public_poster_names: {
        Args: { _ids: string[] }
        Returns: {
          user_id: string
          full_name: string | null
        }[]
      }
      get_sfit_email_lock: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_sfit_email_lock: {
        Args: {
          _enabled: boolean
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _message: string
          _related_claim_id?: string | null
          _related_item_id?: string | null
          _title: string
          _user_id: string
          _kind?: string | null
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      claim_status: "pending" | "approved" | "rejected" | "withdrawn"
      item_category:
        | "electronics"
        | "clothing"
        | "documents"
        | "keys"
        | "wallet"
        | "jewelry"
        | "books"
        | "other"
      item_status: "lost" | "found" | "claimed" | "returned"
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
      app_role: ["admin", "moderator", "user"],
      claim_status: ["pending", "approved", "rejected", "withdrawn"],
      item_category: [
        "electronics",
        "clothing",
        "documents",
        "keys",
        "wallet",
        "jewelry",
        "books",
        "other",
      ],
      item_status: ["lost", "found", "claimed", "returned"],
    },
  },
} as const
