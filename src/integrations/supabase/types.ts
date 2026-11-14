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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      mentions: {
        Row: {
          attributes_to: string | null
          attribution_quotes: Json
          classified: boolean
          contents_read: boolean
          domain: string
          id: string
          involved_party: boolean
          is_independent: boolean
          is_origin: boolean
          mainstream: boolean
          outlet: string
          paywalled: boolean
          published_at: string | null
          snippet: string
          source_api: string
          sourcing: string
          stance: string
          title: string
          trace_id: string
          url: string
        }
        Insert: {
          attributes_to?: string | null
          attribution_quotes?: Json
          classified?: boolean
          contents_read?: boolean
          domain: string
          id?: string
          involved_party?: boolean
          is_independent?: boolean
          is_origin?: boolean
          mainstream?: boolean
          outlet: string
          paywalled?: boolean
          published_at?: string | null
          snippet?: string
          source_api?: string
          sourcing?: string
          stance?: string
          title: string
          trace_id: string
          url: string
        }
        Update: {
          attributes_to?: string | null
          attribution_quotes?: Json
          classified?: boolean
          contents_read?: boolean
          domain?: string
          id?: string
          involved_party?: boolean
          is_independent?: boolean
          is_origin?: boolean
          mainstream?: boolean
          outlet?: string
          paywalled?: boolean
          published_at?: string | null
          snippet?: string
          source_api?: string
          sourcing?: string
          stance?: string
          title?: string
          trace_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
        ]
      }
      precedents: {
        Row: {
          case_title: string
          created_at: string
          days_to_resolution: number | null
          deal_type: string
          document_id: string
          first_reported_at: string | null
          id: string
          outcome: string
          outlet: string
          resolution_source: string | null
          resolved: boolean
          sourcing: string
          trace_id: string
        }
        Insert: {
          case_title: string
          created_at?: string
          days_to_resolution?: number | null
          deal_type?: string
          document_id: string
          first_reported_at?: string | null
          id?: string
          outcome?: string
          outlet?: string
          resolution_source?: string | null
          resolved?: boolean
          sourcing?: string
          trace_id: string
        }
        Update: {
          case_title?: string
          created_at?: string
          days_to_resolution?: number | null
          deal_type?: string
          document_id?: string
          first_reported_at?: string | null
          id?: string
          outcome?: string
          outlet?: string
          resolution_source?: string | null
          resolved?: boolean
          sourcing?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precedents_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          at: string
          id: string
          reason: string
          status: string
          trace_id: string
        }
        Insert: {
          at?: string
          id?: string
          reason: string
          status: string
          trace_id: string
        }
        Update: {
          at?: string
          id?: string
          reason?: string
          status?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
        ]
      }
      traces: {
        Row: {
          checked_at: string
          claim: string
          confidence: number
          confirm_signals: Json
          created_at: string
          entities: Json
          error: string | null
          id: string
          kill_signals: Json
          lease_token: string | null
          lease_until: string | null
          origin_mention_id: string | null
          paused: boolean
          query: string
          rechecking: boolean
          research_result: Json | null
          smoke_score: number
          stage: string
          status: string
          summary_md: string
          watch_signals: Json
          watching: boolean
          window_days: number
        }
        Insert: {
          checked_at?: string
          claim: string
          confidence?: number
          confirm_signals?: Json
          created_at?: string
          entities?: Json
          error?: string | null
          id?: string
          kill_signals?: Json
          lease_token?: string | null
          lease_until?: string | null
          origin_mention_id?: string | null
          paused?: boolean
          query: string
          rechecking?: boolean
          research_result?: Json | null
          smoke_score?: number
          stage?: string
          status?: string
          summary_md?: string
          watch_signals?: Json
          watching?: boolean
          window_days?: number
        }
        Update: {
          checked_at?: string
          claim?: string
          confidence?: number
          confirm_signals?: Json
          created_at?: string
          entities?: Json
          error?: string | null
          id?: string
          kill_signals?: Json
          lease_token?: string | null
          lease_until?: string | null
          origin_mention_id?: string | null
          paused?: boolean
          query?: string
          rechecking?: boolean
          research_result?: Json | null
          smoke_score?: number
          stage?: string
          status?: string
          summary_md?: string
          watch_signals?: Json
          watching?: boolean
          window_days?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_trace_lease: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
