
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "body_measurements": {
                  Row: {
                    "created_at": string,"height_cm": number | null,"id": string,"measured_at": string,"notes": string | null,"user_id": string,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"user_id": string,"weight_kg"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"user_id"?: string,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"exercises": {
                  Row: {
                    "category": Database["public"]['Enums']["exercise_category"],"created_at": string,"default_duration_seconds": number | null,"default_reps": number | null,"default_rest_seconds": number,"default_sets": number | null,"description": string,"difficulty": Database["public"]['Enums']["fitness_level"],"equipment": (string)[],"goal_tags": (string)[],"id": string,"instructions": (string)[],"is_active": boolean,"media_url": string | null,"name": string,"routine_tags": (string)[],"safety_notes": string,"slug": string,"target_areas": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["exercise_category"],"created_at"?: string,"default_duration_seconds"?: number | null,"default_reps"?: number | null,"default_rest_seconds"?: number,"default_sets"?: number | null,"description": string,"difficulty"?: Database["public"]['Enums']["fitness_level"],"equipment"?: (string)[],"goal_tags"?: (string)[],"id"?: string,"instructions": (string)[],"is_active"?: boolean,"media_url"?: string | null,"name": string,"routine_tags"?: (string)[],"safety_notes": string,"slug": string,"target_areas"?: (string)[]
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["exercise_category"],"created_at"?: string,"default_duration_seconds"?: number | null,"default_reps"?: number | null,"default_rest_seconds"?: number,"default_sets"?: number | null,"description"?: string,"difficulty"?: Database["public"]['Enums']["fitness_level"],"equipment"?: (string)[],"goal_tags"?: (string)[],"id"?: string,"instructions"?: (string)[],"is_active"?: boolean,"media_url"?: string | null,"name"?: string,"routine_tags"?: (string)[],"safety_notes"?: string,"slug"?: string,"target_areas"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "age_years": number | null,"available_minutes": number,"created_at": string,"display_name": string | null,"evening_time": string,"fitness_level": Database["public"]['Enums']["fitness_level"],"goals": (string)[],"limitations": (string)[],"morning_time": string,"onboarding_complete": boolean,"reminders_enabled": boolean,"timezone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_years"?: number | null,"available_minutes"?: number,"created_at"?: string,"display_name"?: string | null,"evening_time"?: string,"fitness_level"?: Database["public"]['Enums']["fitness_level"],"goals"?: (string)[],"limitations"?: (string)[],"morning_time"?: string,"onboarding_complete"?: boolean,"reminders_enabled"?: boolean,"timezone"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "age_years"?: number | null,"available_minutes"?: number,"created_at"?: string,"display_name"?: string | null,"evening_time"?: string,"fitness_level"?: Database["public"]['Enums']["fitness_level"],"goals"?: (string)[],"limitations"?: (string)[],"morning_time"?: string,"onboarding_complete"?: boolean,"reminders_enabled"?: boolean,"timezone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"routine_exercises": {
                  Row: {
                    "created_at": string,"exercise_id": string,"id": string,"position": number,"prescribed_duration_seconds": number | null,"prescribed_reps": number | null,"prescribed_sets": number | null,"rest_seconds": number,"routine_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"id"?: string,"position": number,"prescribed_duration_seconds"?: number | null,"prescribed_reps"?: number | null,"prescribed_sets"?: number | null,"rest_seconds"?: number,"routine_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"id"?: string,"position"?: number,"prescribed_duration_seconds"?: number | null,"prescribed_reps"?: number | null,"prescribed_sets"?: number | null,"rest_seconds"?: number,"routine_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_exercise_routine_owner_fk"
      columns: ["routine_id","user_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "routine_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string,"estimated_minutes": number,"generated_by": string,"id": string,"name": string,"routine_lineage_id": string,"session_type": Database["public"]['Enums']["session_type"],"status": Database["public"]['Enums']["routine_status"],"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estimated_minutes"?: number,"generated_by"?: string,"id"?: string,"name": string,"routine_lineage_id"?: string,"session_type": Database["public"]['Enums']["session_type"],"status"?: Database["public"]['Enums']["routine_status"],"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"estimated_minutes"?: number,"generated_by"?: string,"id"?: string,"name"?: string,"routine_lineage_id"?: string,"session_type"?: Database["public"]['Enums']["session_type"],"status"?: Database["public"]['Enums']["routine_status"],"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"session_exercises": {
                  Row: {
                    "actual_duration_seconds": number | null,"category_snapshot": Database["public"]['Enums']["exercise_category"],"completed": boolean,"completed_reps": number | null,"completed_sets": number,"created_at": string,"exercise_id": string | null,"exercise_name_snapshot": string,"id": string,"instructions_snapshot": (string)[],"notes": string | null,"position": number,"prescribed_duration_seconds": number | null,"prescribed_reps": number | null,"prescribed_sets": number | null,"rest_seconds": number,"safety_notes_snapshot": string,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_duration_seconds"?: number | null,"category_snapshot": Database["public"]['Enums']["exercise_category"],"completed"?: boolean,"completed_reps"?: number | null,"completed_sets"?: number,"created_at"?: string,"exercise_id"?: string | null,"exercise_name_snapshot": string,"id"?: string,"instructions_snapshot": (string)[],"notes"?: string | null,"position": number,"prescribed_duration_seconds"?: number | null,"prescribed_reps"?: number | null,"prescribed_sets"?: number | null,"rest_seconds"?: number,"safety_notes_snapshot": string,"session_id": string,"user_id": string
                  }
                  Update: {
                    "actual_duration_seconds"?: number | null,"category_snapshot"?: Database["public"]['Enums']["exercise_category"],"completed"?: boolean,"completed_reps"?: number | null,"completed_sets"?: number,"created_at"?: string,"exercise_id"?: string | null,"exercise_name_snapshot"?: string,"id"?: string,"instructions_snapshot"?: (string)[],"notes"?: string | null,"position"?: number,"prescribed_duration_seconds"?: number | null,"prescribed_reps"?: number | null,"prescribed_sets"?: number | null,"rest_seconds"?: number,"safety_notes_snapshot"?: string,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_session_user_fk"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workout_sessions": {
                  Row: {
                    "activity_date": string,"completed_at": string | null,"created_at": string,"duration_seconds": number | null,"id": string,"plan_snapshot": NonNullable<Json>,"routine_id": string | null,"routine_name_snapshot": string,"routine_version_snapshot": number,"session_type": Database["public"]['Enums']["session_type"],"started_at": string,"status": Database["public"]['Enums']["workout_status"],"timezone_snapshot": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"completed_at"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"plan_snapshot": NonNullable<Json>,"routine_id"?: string | null,"routine_name_snapshot": string,"routine_version_snapshot": number,"session_type": Database["public"]['Enums']["session_type"],"started_at"?: string,"status"?: Database["public"]['Enums']["workout_status"],"timezone_snapshot": string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"completed_at"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"plan_snapshot"?: NonNullable<Json>,"routine_id"?: string | null,"routine_name_snapshot"?: string,"routine_version_snapshot"?: number,"session_type"?: Database["public"]['Enums']["session_type"],"started_at"?: string,"status"?: Database["public"]['Enums']["workout_status"],"timezone_snapshot"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_routine_owner_fk"
      columns: ["routine_id","user_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "archive_routine": {
              Args: { p_routine_id: string };
              Returns: Database["public"]["Tables"]["routines"]["Row"];
            },
            "create_routine_with_exercises": {
              Args: {
                p_name: string;
                p_session_type: Database["public"]["Enums"]["session_type"];
                p_estimated_minutes?: number;
                p_exercises?: Json;
                p_generated_by?: string;
              };
              Returns: Database["public"]["Tables"]["routines"]["Row"];
            },
            "update_routine_version": {
              Args: {
                p_routine_id: string;
                p_name?: string | null;
                p_estimated_minutes?: number | null;
                p_exercises?: Json;
              };
              Returns: Database["public"]["Tables"]["routines"]["Row"];
            },
            "start_workout_session": {
              Args: {
                p_routine_id: string;
              };
              Returns: Database["public"]["Tables"]["workout_sessions"]["Row"];
            },
            "complete_workout_session":
{ Args: { "p_duration_seconds"?: number,"p_results": Json,"p_session_id": string }; Returns: {
              "activity_date": string,
"completed_at": string | null,
"created_at": string,
"duration_seconds": number | null,
"id": string,
"plan_snapshot": NonNullable<Json>,
"routine_id": string | null,
"routine_name_snapshot": string,
"routine_version_snapshot": number,
"session_type": Database["public"]['Enums']["session_type"],
"started_at": string,
"status": Database["public"]['Enums']["workout_status"],
"timezone_snapshot": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "workout_sessions"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "exercise_category": "mobility"|"stretching"|"posture"|"push"|"pull"|"legs"|"core"|"cardio"|"posture_spine","fitness_level": "beginner"|"intermediate"|"advanced","routine_status": "draft"|"active"|"archived","session_type": "morning"|"evening","workout_status": "in_progress"|"completed"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "exercise_category": ["mobility", "stretching", "posture", "push", "pull", "legs", "core", "cardio", "posture_spine"],"fitness_level": ["beginner", "intermediate", "advanced"],"routine_status": ["draft", "active", "archived"],"session_type": ["morning", "evening"],"workout_status": ["in_progress", "completed", "cancelled"]
          }
        }
} as const
