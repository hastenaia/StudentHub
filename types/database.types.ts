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
      academic_settings: {
        Row: {
          grade_scale: Json
          id: string
          target_gpa: number
          updated_at: string
          user_id: string
        }
        Insert: {
          grade_scale?: Json
          id?: string
          target_gpa?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          grade_scale?: Json
          id?: string
          target_gpa?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          course_id: string
          created_at: string
          creator_name: string | null
          google_announcement_id: string | null
          id: string
          publish_time: string | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          creator_name?: string | null
          google_announcement_id?: string | null
          id?: string
          publish_time?: string | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          creator_name?: string | null
          google_announcement_id?: string | null
          id?: string
          publish_time?: string | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          due_at: string | null
          google_course_work_id: string | null
          grade: number | null
          id: string
          max_points: number | null
          state: string | null
          submitted: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          google_course_work_id?: string | null
          grade?: number | null
          id?: string
          max_points?: number | null
          state?: string | null
          submitted?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          google_course_work_id?: string | null
          grade?: number | null
          id?: string
          max_points?: number | null
          state?: string | null
          submitted?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          end_at: string | null
          google_event_id: string | null
          id: string
          location: string | null
          start_at: string | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          archived: boolean
          color: string | null
          course_code: string | null
          course_name: string | null
          created_at: string
          credit_hours: number
          description: string | null
          google_course_id: string | null
          id: string
          instructor: string | null
          manual_grade: number | null
          name: string
          room: string | null
          section: string | null
          source: string
          teacher_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          course_code?: string | null
          course_name?: string | null
          created_at?: string
          credit_hours?: number
          description?: string | null
          google_course_id?: string | null
          id?: string
          instructor?: string | null
          manual_grade?: number | null
          name: string
          room?: string | null
          section?: string | null
          source?: string
          teacher_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          course_code?: string | null
          course_name?: string | null
          created_at?: string
          credit_hours?: number
          description?: string | null
          google_course_id?: string | null
          id?: string
          instructor?: string | null
          manual_grade?: number | null
          name?: string
          room?: string | null
          section?: string | null
          source?: string
          teacher_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          correct_count: number
          course_id: string | null
          created_at: string
          front: string
          id: string
          incorrect_count: number
          is_known: boolean
          last_reviewed: string | null
          note_id: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          correct_count?: number
          course_id?: string | null
          created_at?: string
          front: string
          id?: string
          incorrect_count?: number
          is_known?: boolean
          last_reviewed?: string | null
          note_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          correct_count?: number
          course_id?: string | null
          created_at?: string
          front?: string
          id?: string
          incorrect_count?: number
          is_known?: boolean
          last_reviewed?: string | null
          note_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          duration_minutes: number
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_accounts: {
        Row: {
          access_token_enc: string
          created_at: string
          email: string | null
          google_subject: string
          id: string
          last_synced_at: string | null
          needs_reconnect: boolean
          refresh_token_enc: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_enc: string
          created_at?: string
          email?: string | null
          google_subject: string
          id?: string
          last_synced_at?: string | null
          needs_reconnect?: boolean
          refresh_token_enc: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_enc?: string
          created_at?: string
          email?: string | null
          google_subject?: string
          id?: string
          last_synced_at?: string | null
          needs_reconnect?: boolean
          refresh_token_enc?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string
          favorite: boolean
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          favorite?: boolean
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          favorite?: boolean
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_calendar_view: string
          default_task_view: string
          full_name: string | null
          id: string
          must_change_password: boolean
          notifications_enabled: boolean
          role: Database["public"]["Enums"]["user_role"]
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_calendar_view?: string
          default_task_view?: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          notifications_enabled?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_calendar_view?: string
          default_task_view?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          notifications_enabled?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          explanation: string | null
          id: string
          options: Json | null
          position: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          explanation?: string | null
          id?: string
          options?: Json | null
          position?: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          all_day: boolean
          color: string | null
          course_id: string | null
          created_at: string
          description: string | null
          end_at: string
          event_type: string
          id: string
          location: string | null
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          event_type?: string
          id?: string
          location?: string | null
          start_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          event_type?: string
          id?: string
          location?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          estimate_minutes: number | null
          id: string
          priority: string
          recur_until: string | null
          recurrence_freq: string | null
          recurrence_interval: number
          sort_order: number
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          estimate_minutes?: number | null
          id?: string
          priority?: string
          recur_until?: string | null
          recurrence_freq?: string | null
          recurrence_interval?: number
          sort_order?: number
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          estimate_minutes?: number | null
          id?: string
          priority?: string
          recur_until?: string | null
          recurrence_freq?: string | null
          recurrence_interval?: number
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          journal: string | null
          mood: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          journal?: string | null
          mood: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          journal?: string | null
          mood?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_entries_user_id_fkey"
            columns: ["user_id"]
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
      [_ in never]: never
    }
    Enums: {
      user_role: "student" | "teacher" | "admin"
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
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const

export type UserRole = Database["public"]["Enums"]["user_role"]
export type CourseSource = "classroom" | "manual"
