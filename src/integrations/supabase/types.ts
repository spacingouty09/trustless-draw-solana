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
      entries: {
        Row: {
          created_at: string
          event_id: string
          handle: string
          handle_hash: string
          id: string
          index: number
          wallet: string
        }
        Insert: {
          created_at?: string
          event_id: string
          handle: string
          handle_hash: string
          id?: string
          index: number
          wallet: string
        }
        Update: {
          created_at?: string
          event_id?: string
          handle?: string
          handle_hash?: string
          id?: string
          index?: number
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          commit_tx: string | null
          created_at: string
          cutoff_ts: string
          delegation_pda: string | null
          description: string
          draw_seed: string | null
          id: string
          mastodon_account_acct: string
          mastodon_account_id: string | null
          mastodon_instance: string
          mastodon_status_id: string
          mastodon_status_url: string
          num_winners: number
          organizer_pubkey: string
          prize_token: string
          prize_total: number
          require_boost: boolean
          require_favourite: boolean
          require_follow: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          commit_tx?: string | null
          created_at?: string
          cutoff_ts: string
          delegation_pda?: string | null
          description?: string
          draw_seed?: string | null
          id?: string
          mastodon_account_acct: string
          mastodon_account_id?: string | null
          mastodon_instance: string
          mastodon_status_id: string
          mastodon_status_url: string
          num_winners?: number
          organizer_pubkey: string
          prize_token?: string
          prize_total: number
          require_boost?: boolean
          require_favourite?: boolean
          require_follow?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          commit_tx?: string | null
          created_at?: string
          cutoff_ts?: string
          delegation_pda?: string | null
          description?: string
          draw_seed?: string | null
          id?: string
          mastodon_account_acct?: string
          mastodon_account_id?: string | null
          mastodon_instance?: string
          mastodon_status_id?: string
          mastodon_status_url?: string
          num_winners?: number
          organizer_pubkey?: string
          prize_token?: string
          prize_total?: number
          require_boost?: boolean
          require_favourite?: boolean
          require_follow?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mastodon_oauth_apps: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          instance: string
          redirect_uri: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          instance: string
          redirect_uri: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          instance?: string
          redirect_uri?: string
        }
        Relationships: []
      }
      verification_log: {
        Row: {
          created_at: string
          detail: Json
          event_id: string
          handle: string
          id: string
          result: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          event_id: string
          handle: string
          id?: string
          result: string
        }
        Update: {
          created_at?: string
          detail?: Json
          event_id?: string
          handle?: string
          id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          created_at: string
          entry_id: string
          event_id: string
          id: string
          payout_tx: string | null
          share: number
        }
        Insert: {
          created_at?: string
          entry_id: string
          event_id: string
          id?: string
          payout_tx?: string | null
          share: number
        }
        Update: {
          created_at?: string
          entry_id?: string
          event_id?: string
          id?: string
          payout_tx?: string | null
          share?: number
        }
        Relationships: [
          {
            foreignKeyName: "winners_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
