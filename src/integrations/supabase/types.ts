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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          agent_ref: string | null
          created_at: string | null
          est_avg_hscw: number | null
          est_avg_live_wt: number | null
          head_count: number | null
          id: string
          lot_id: string | null
          plant_id: string | null
          requested_kill_date: string | null
          requested_window_end: string | null
          requested_window_start: string | null
          species: string
          status: string | null
          supplier_id: string | null
          target_grid_id: string | null
        }
        Insert: {
          agent_ref?: string | null
          created_at?: string | null
          est_avg_hscw?: number | null
          est_avg_live_wt?: number | null
          head_count?: number | null
          id?: string
          lot_id?: string | null
          plant_id?: string | null
          requested_kill_date?: string | null
          requested_window_end?: string | null
          requested_window_start?: string | null
          species: string
          status?: string | null
          supplier_id?: string | null
          target_grid_id?: string | null
        }
        Update: {
          agent_ref?: string | null
          created_at?: string | null
          est_avg_hscw?: number | null
          est_avg_live_wt?: number | null
          head_count?: number | null
          id?: string
          lot_id?: string | null
          plant_id?: string | null
          requested_kill_date?: string | null
          requested_window_end?: string | null
          requested_window_start?: string | null
          species?: string
          status?: string | null
          supplier_id?: string | null
          target_grid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_target_grid_id_fkey"
            columns: ["target_grid_id"]
            isOneToOne: false
            referencedRelation: "app_gridspecs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_target_grid_id_fkey"
            columns: ["target_grid_id"]
            isOneToOne: false
            referencedRelation: "gridspecs"
            referencedColumns: ["id"]
          },
        ]
      }
      day_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          planned_head: number
          plant_id: string | null
          species: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          planned_head?: number
          plant_id?: string | null
          species: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          planned_head?: number
          plant_id?: string | null
          species?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_plans_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      gridspecs: {
        Row: {
          dentition_or_age: string | null
          effective_from: string | null
          effective_to: string | null
          fat_code: string | null
          id: string
          max_hscw: number | null
          min_hscw: number | null
          notes: string | null
          plant_id: string | null
          species: string
          version: number
          yield_adj_rules: Json | null
        }
        Insert: {
          dentition_or_age?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fat_code?: string | null
          id?: string
          max_hscw?: number | null
          min_hscw?: number | null
          notes?: string | null
          plant_id?: string | null
          species: string
          version?: number
          yield_adj_rules?: Json | null
        }
        Update: {
          dentition_or_age?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fat_code?: string | null
          id?: string
          max_hscw?: number | null
          min_hscw?: number | null
          notes?: string | null
          plant_id?: string | null
          species?: string
          version?: number
          yield_adj_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gridspecs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_events: {
        Row: {
          booking_id: string | null
          event_type: string | null
          id: string
          location: string | null
          notes: string | null
          timestamp: string
        }
        Insert: {
          booking_id?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          timestamp?: string
        }
        Update: {
          booking_id?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "app_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_records: {
        Row: {
          changes_count: number | null
          date: string
          fill_rate_pct: number | null
          id: string
          lead_time_variance_hr: number | null
          on_spec_pct: number | null
          plant_id: string | null
          rework_hours: number | null
          slot_adherence_pct: number | null
        }
        Insert: {
          changes_count?: number | null
          date: string
          fill_rate_pct?: number | null
          id?: string
          lead_time_variance_hr?: number | null
          on_spec_pct?: number | null
          plant_id?: string | null
          rework_hours?: number | null
          slot_adherence_pct?: number | null
        }
        Update: {
          changes_count?: number | null
          date?: string
          fill_rate_pct?: number | null
          id?: string
          lead_time_variance_hr?: number | null
          on_spec_pct?: number | null
          plant_id?: string | null
          rework_hours?: number | null
          slot_adherence_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_records_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          company_name: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          licence_type: string | null
          plant_name: string
          species_supported: string[] | null
          state: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          licence_type?: string | null
          plant_name: string
          species_supported?: string[] | null
          state?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          licence_type?: string | null
          plant_name?: string
          species_supported?: string[] | null
          state?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      slot_conflicts: {
        Row: {
          assigned_loads: number
          created_at: string
          id: string
          is_conflict: boolean
          max_loads: number
          slot_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_loads?: number
          created_at?: string
          id?: string
          is_conflict?: boolean
          max_loads?: number
          slot_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_loads?: number
          created_at?: string
          id?: string
          is_conflict?: boolean
          max_loads?: number
          slot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_conflicts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "app_transport_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_conflicts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "transport_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          abn: string | null
          contact_name: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          type: string | null
        }
        Insert: {
          abn?: string | null
          contact_name?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          type?: string | null
        }
        Update: {
          abn?: string | null
          contact_name?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string | null
        }
        Relationships: []
      }
      transport_slots: {
        Row: {
          assigned_booking_ids: string[] | null
          conflict_flag: boolean | null
          date: string
          id: string
          max_truck_loads: number | null
          plant_id: string | null
          species: string
          window_end_dt: string
          window_start_dt: string
        }
        Insert: {
          assigned_booking_ids?: string[] | null
          conflict_flag?: boolean | null
          date: string
          id?: string
          max_truck_loads?: number | null
          plant_id?: string | null
          species: string
          window_end_dt: string
          window_start_dt: string
        }
        Update: {
          assigned_booking_ids?: string[] | null
          conflict_flag?: boolean | null
          date?: string
          id?: string
          max_truck_loads?: number | null
          plant_id?: string | null
          species?: string
          window_end_dt?: string
          window_start_dt?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_slots_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      app_bookings: {
        Row: {
          agent_ref: string | null
          created_at: string | null
          est_avg_hscw: number | null
          est_avg_live_wt: number | null
          head_count: number | null
          id: string | null
          lot_id: string | null
          plant_id: string | null
          plant_name: string | null
          requested_kill_date: string | null
          requested_window_end: string | null
          requested_window_start: string | null
          species: string | null
          status: string | null
          supplier_id: string | null
          target_grid_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_target_grid_id_fkey"
            columns: ["target_grid_id"]
            isOneToOne: false
            referencedRelation: "app_gridspecs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_target_grid_id_fkey"
            columns: ["target_grid_id"]
            isOneToOne: false
            referencedRelation: "gridspecs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_gridspecs: {
        Row: {
          dentition_or_age: string | null
          effective_from: string | null
          effective_to: string | null
          fat_code: string | null
          id: string | null
          max_hscw: number | null
          min_hscw: number | null
          notes: string | null
          plant_id: string | null
          species: string | null
          version: number | null
          yield_adj_rules: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gridspecs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_transport_slots: {
        Row: {
          assigned_booking_ids: string[] | null
          conflict_flag: boolean | null
          date: string | null
          id: string | null
          max_truck_loads: number | null
          plant_id: string | null
          species: string | null
          window_end_dt: string | null
          window_start_dt: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_slots_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
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
