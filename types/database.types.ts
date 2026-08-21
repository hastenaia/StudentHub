/**
 * Auto-generated types placeholder.
 *
 * Replace this file with the real generated types once your schema exists:
 *   npx supabase gen types typescript --project-id cbdxebzizvgzoupdplvs > types/database.types.ts
 *
 * The Google/academic tables below are hand-maintained to match
 * supabase/migrations/20260813000001_google_academics.sql until the
 * generator is run against a project with the new schema.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "student" | "teacher" | "admin";

export type CourseSource = "classroom" | "manual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_accounts: {
        Row: {
          id: string;
          user_id: string;
          google_subject: string;
          email: string | null;
          access_token_enc: string;
          refresh_token_enc: string;
          token_expires_at: string;
          needs_reconnect: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_subject: string;
          email?: string | null;
          access_token_enc: string;
          refresh_token_enc: string;
          token_expires_at: string;
          needs_reconnect?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_subject?: string;
          email?: string | null;
          access_token_enc?: string;
          refresh_token_enc?: string;
          token_expires_at?: string;
          needs_reconnect?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          google_course_id: string | null;
          source: CourseSource;
          name: string;
          course_code: string | null;
          course_name: string | null;
          instructor: string | null;
          description: string | null;
          section: string | null;
          room: string | null;
          teacher_name: string | null;
          color: string | null;
          credit_hours: number;
          manual_grade: number | null;
          target_pct: number | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_course_id?: string | null;
          source?: CourseSource;
          name: string;
          course_code?: string | null;
          course_name?: string | null;
          instructor?: string | null;
          description?: string | null;
          section?: string | null;
          room?: string | null;
          teacher_name?: string | null;
          color?: string | null;
          credit_hours?: number;
          manual_grade?: number | null;
          target_pct?: number | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_course_id?: string | null;
          source?: CourseSource;
          name?: string;
          course_code?: string | null;
          course_name?: string | null;
          instructor?: string | null;
          description?: string | null;
          section?: string | null;
          room?: string | null;
          teacher_name?: string | null;
          color?: string | null;
          credit_hours?: number;
          manual_grade?: number | null;
          target_pct?: number | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          google_course_work_id: string | null;
          title: string;
          description: string | null;
          due_at: string | null;
          max_points: number | null;
          grade: number | null;
          submitted: boolean;
          state: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          google_course_work_id?: string | null;
          title: string;
          description?: string | null;
          due_at?: string | null;
          max_points?: number | null;
          grade?: number | null;
          submitted?: boolean;
          state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          google_course_work_id?: string | null;
          title?: string;
          description?: string | null;
          due_at?: string | null;
          max_points?: number | null;
          grade?: number | null;
          submitted?: boolean;
          state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          google_announcement_id: string | null;
          text: string;
          creator_name: string | null;
          publish_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          google_announcement_id?: string | null;
          text: string;
          creator_name?: string | null;
          publish_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          google_announcement_id?: string | null;
          text?: string;
          creator_name?: string | null;
          publish_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          google_event_id: string | null;
          summary: string;
          description: string | null;
          location: string | null;
          start_at: string | null;
          end_at: string | null;
          all_day: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_event_id?: string | null;
          summary: string;
          description?: string | null;
          location?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          all_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_event_id?: string | null;
          summary?: string;
          description?: string | null;
          location?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          all_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          tags: string[];
          due_at: string | null;
          estimate_minutes: number | null;
          recurrence_freq: string | null;
          recurrence_interval: number;
          recur_until: string | null;
          sort_order: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          tags?: string[];
          due_at?: string | null;
          estimate_minutes?: number | null;
          recurrence_freq?: string | null;
          recurrence_interval?: number;
          recur_until?: string | null;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          tags?: string[];
          due_at?: string | null;
          estimate_minutes?: number | null;
          recurrence_freq?: string | null;
          recurrence_interval?: number;
          recur_until?: string | null;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      schedule_events: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          event_type: string;
          start_at: string;
          end_at: string;
          all_day: boolean;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          description?: string | null;
          location?: string | null;
          event_type?: string;
          start_at: string;
          end_at: string;
          all_day?: boolean;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          title?: string;
          description?: string | null;
          location?: string | null;
          event_type?: string;
          start_at?: string;
          end_at?: string;
          all_day?: boolean;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_events_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration_minutes: number;
          started_at: string;
          ended_at: string | null;
          task_id: string | null;
          course_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration_minutes: number;
          started_at?: string;
          ended_at?: string | null;
          task_id?: string | null;
          course_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration_minutes?: number;
          started_at?: string;
          ended_at?: string | null;
          task_id?: string | null;
          course_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          content: string | null;
          favorite: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          content?: string | null;
          favorite?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          title?: string;
          content?: string | null;
          favorite?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          note_id: string | null;
          front: string;
          back: string;
          tags: string[];
          is_known: boolean;
          correct_count: number;
          incorrect_count: number;
          last_reviewed: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          note_id?: string | null;
          front: string;
          back: string;
          tags?: string[];
          is_known?: boolean;
          correct_count?: number;
          incorrect_count?: number;
          last_reviewed?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          note_id?: string | null;
          front?: string;
          back?: string;
          tags?: string[];
          is_known?: boolean;
          correct_count?: number;
          incorrect_count?: number;
          last_reviewed?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          title?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          options: Json | null;
          correct_answer: string;
          explanation: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          options?: Json | null;
          correct_answer: string;
          explanation?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_text?: string;
          question_type?: string;
          options?: Json | null;
          correct_answer?: string;
          explanation?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          answers: Json;
          score: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          answers: Json;
          score: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          user_id?: string;
          answers?: Json;
          score?: number;
          total?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      academic_settings: {
        Row: {
          id: string;
          user_id: string;
          grade_scale: Json;
          target_gpa: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          grade_scale?: Json;
          target_gpa?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          grade_scale?: Json;
          target_gpa?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}