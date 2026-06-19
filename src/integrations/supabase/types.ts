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
      form_scores: {
        Row: {
          created_at: string
          exercise_name: string
          feedback: string | null
          id: string
          indicator: string | null
          mistakes: Json | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          feedback?: string | null
          id?: string
          indicator?: string | null
          mistakes?: Json | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          feedback?: string | null
          id?: string
          indicator?: string | null
          mistakes?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      nutrition_entries: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_name: string
          id: string
          logged_on: string
          meal: Database["public"]["Enums"]["meal_type"]
          protein_g: number
          quantity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_name: string
          id?: string
          logged_on?: string
          meal: Database["public"]["Enums"]["meal_type"]
          protein_g?: number
          quantity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_name?: string
          id?: string
          logged_on?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          protein_g?: number
          quantity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          carbs_g: number
          created_at: string
          daily_calories: number
          fat_g: number
          goal_type: Database["public"]["Enums"]["nutrition_goal_type"]
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          daily_calories?: number
          fat_g?: number
          goal_type?: Database["public"]["Enums"]["nutrition_goal_type"]
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          daily_calories?: number
          fat_g?: number
          goal_type?: Database["public"]["Enums"]["nutrition_goal_type"]
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_name: string
          id: string
          record_type: string
          reps: number | null
          session_id: string | null
          user_id: string
          value: number
          weight_kg: number | null
        }
        Insert: {
          achieved_at?: string
          exercise_name: string
          id?: string
          record_type: string
          reps?: number | null
          session_id?: string | null
          user_id: string
          value: number
          weight_kg?: number | null
        }
        Update: {
          achieved_at?: string
          exercise_name?: string
          id?: string
          record_type?: string
          reps?: number | null
          session_id?: string | null
          user_id?: string
          value?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          fitness_goal: string | null
          fitness_level: string
          height_cm: number | null
          id: string
          name: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          fitness_goal?: string | null
          fitness_level?: string
          height_cm?: number | null
          id: string
          name?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          fitness_goal?: string | null
          fitness_level?: string
          height_cm?: number | null
          id?: string
          name?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_sec: number | null
          ended_at: string | null
          id: string
          name: string
          notes: string | null
          started_at: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise_name: string
          id: string
          muscle_group: string | null
          reps: number | null
          rest_sec: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_name: string
          id?: string
          muscle_group?: string | null
          reps?: number | null
          rest_sec?: number | null
          session_id: string
          set_index?: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_name?: string
          id?: string
          muscle_group?: string | null
          reps?: number | null
          rest_sec?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          exercises: Json
          id: string
          is_builtin: boolean
          is_favorite: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercises?: Json
          id?: string
          is_builtin?: boolean
          is_favorite?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          exercises?: Json
          id?: string
          is_builtin?: boolean
          is_favorite?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          duration_min: number | null
          exercise_name: string
          id: string
          muscle_group: string
          notes: string | null
          reps: number | null
          sets: number | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          exercise_name: string
          id?: string
          muscle_group: string
          notes?: string | null
          reps?: number | null
          sets?: number | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          exercise_name?: string
          id?: string
          muscle_group?: string
          notes?: string | null
          reps?: number | null
          sets?: number | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      nutrition_goal_type: "weight_loss" | "muscle_gain" | "maintenance"
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
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      nutrition_goal_type: ["weight_loss", "muscle_gain", "maintenance"],
    },
  },
} as const
