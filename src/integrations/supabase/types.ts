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
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          note: string | null
          target_user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          note?: string | null
          target_user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          note?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      admin_secrets: {
        Row: {
          description: string | null
          id: string
          secret_key: string
          secret_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          secret_key: string
          secret_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          secret_key?: string
          secret_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          is_submitted: boolean
          payment_method: string
          status: string
          transaction_ref: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_submitted?: boolean
          payment_method: string
          status?: string
          transaction_ref?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_submitted?: boolean
          payment_method?: string
          status?: string
          transaction_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          back_image_url: string
          created_at: string
          date_of_birth: string | null
          front_image_url: string
          full_name: string
          id: string
          id_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          back_image_url: string
          created_at?: string
          date_of_birth?: string | null
          front_image_url: string
          full_name: string
          id?: string
          id_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          back_image_url?: string
          created_at?: string
          date_of_birth?: string | null
          front_image_url?: string
          full_name?: string
          id?: string
          id_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linked_bank_accounts: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          id: string
          is_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          images: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          transaction_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          transaction_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_profiles: {
        Row: {
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bio: string | null
          created_at: string
          display_name: string
          facebook_url: string | null
          id: string
          is_active: boolean
          phone: string | null
          specialization: string | null
          updated_at: string
          user_id: string
          zalo_contact: string | null
        }
        Insert: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          facebook_url?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id: string
          zalo_contact?: string | null
        }
        Update: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          facebook_url?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
          zalo_contact?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "marketplace_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "marketplace_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      private_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          balance_freeze_reason: string | null
          balance_frozen_at: string | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string
          full_name: string | null
          id: string
          is_balance_frozen: boolean | null
          is_banned: boolean
          is_suspicious: boolean | null
          is_verified: boolean | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          phone_number: string | null
          reputation_score: number
          suspicious_at: string | null
          suspicious_reason: string | null
          telegram_chat_id: string | null
          total_transactions: number
          updated_at: string
          user_id: string
          warning_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          balance_freeze_reason?: string | null
          balance_frozen_at?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_balance_frozen?: boolean | null
          is_banned?: boolean
          is_suspicious?: boolean | null
          is_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          phone_number?: string | null
          reputation_score?: number
          suspicious_at?: string | null
          suspicious_reason?: string | null
          telegram_chat_id?: string | null
          total_transactions?: number
          updated_at?: string
          user_id: string
          warning_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          balance_freeze_reason?: string | null
          balance_frozen_at?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_balance_frozen?: boolean | null
          is_banned?: boolean
          is_suspicious?: boolean | null
          is_verified?: boolean | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          phone_number?: string | null
          reputation_score?: number
          suspicious_at?: string | null
          suspicious_reason?: string | null
          telegram_chat_id?: string | null
          total_transactions?: number
          updated_at?: string
          user_id?: string
          warning_message?: string | null
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transaction_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          new_status: string | null
          note: string | null
          old_data: Json | null
          old_status: string | null
          performed_by: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          new_status?: string | null
          note?: string | null
          old_data?: Json | null
          old_status?: string | null
          performed_by?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          new_status?: string | null
          note?: string | null
          old_data?: Json | null
          old_status?: string | null
          performed_by?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          arbiter_id: string | null
          buyer_confirmed: boolean | null
          buyer_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          deposited_at: string | null
          dispute_at: string | null
          dispute_reason: string | null
          dispute_time_hours: number
          fee_bearer: Database["public"]["Enums"]["fee_bearer"]
          id: string
          images: string[] | null
          invite_link: string | null
          moderator_id: string | null
          platform_fee_amount: number
          platform_fee_percent: number
          product_description: string | null
          product_name: string
          room_id: string | null
          room_password: string | null
          seller_confirmed: boolean | null
          seller_id: string | null
          seller_receives: number
          shipped_at: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_code: string
          updated_at: string
        }
        Insert: {
          amount: number
          arbiter_id?: string | null
          buyer_confirmed?: boolean | null
          buyer_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deposited_at?: string | null
          dispute_at?: string | null
          dispute_reason?: string | null
          dispute_time_hours?: number
          fee_bearer?: Database["public"]["Enums"]["fee_bearer"]
          id?: string
          images?: string[] | null
          invite_link?: string | null
          moderator_id?: string | null
          platform_fee_amount?: number
          platform_fee_percent?: number
          product_description?: string | null
          product_name: string
          room_id?: string | null
          room_password?: string | null
          seller_confirmed?: boolean | null
          seller_id?: string | null
          seller_receives?: number
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_code: string
          updated_at?: string
        }
        Update: {
          amount?: number
          arbiter_id?: string | null
          buyer_confirmed?: boolean | null
          buyer_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deposited_at?: string | null
          dispute_at?: string | null
          dispute_reason?: string | null
          dispute_time_hours?: number
          fee_bearer?: Database["public"]["Enums"]["fee_bearer"]
          id?: string
          images?: string[] | null
          invite_link?: string | null
          moderator_id?: string | null
          platform_fee_amount?: number
          platform_fee_percent?: number
          product_description?: string | null
          product_name?: string
          room_id?: string | null
          room_password?: string | null
          seller_confirmed?: boolean | null
          seller_id?: string | null
          seller_receives?: number
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_code?: string
          updated_at?: string
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          completed_at: string | null
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_amount: number; p_note?: string; p_user_id: string }
        Returns: undefined
      }
      admin_freeze_balance: {
        Args: { p_freeze: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      approve_kyc: { Args: { p_submission_id: string }; Returns: undefined }
      confirm_deposit: { Args: { deposit_id: string }; Returns: undefined }
      confirm_deposit_sepay: {
        Args: {
          p_deposit_id: string
          p_reference: string
          p_sepay_tx_id?: number
          p_transfer_amount: number
        }
        Returns: undefined
      }
      confirm_withdrawal: {
        Args: { withdrawal_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hold_withdrawal: {
        Args: { reason?: string; withdrawal_id: string }
        Returns: undefined
      }
      reject_kyc: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { reason: string; withdrawal_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      fee_bearer: "buyer" | "seller" | "split"
      kyc_status: "none" | "pending" | "approved" | "rejected"
      transaction_status:
        | "pending"
        | "deposited"
        | "shipping"
        | "completed"
        | "disputed"
        | "cancelled"
        | "refunded"
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
      fee_bearer: ["buyer", "seller", "split"],
      kyc_status: ["none", "pending", "approved", "rejected"],
      transaction_status: [
        "pending",
        "deposited",
        "shipping",
        "completed",
        "disputed",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const
