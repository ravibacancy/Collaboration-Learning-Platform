export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      annotations: {
        Row: {
          annotation_type: string;
          content: Json;
          created_at: string;
          document_id: string;
          id: string;
          page_number: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          annotation_type: string;
          content?: Json;
          created_at?: string;
          document_id: string;
          id?: string;
          page_number?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          annotation_type?: string;
          content?: Json;
          created_at?: string;
          document_id?: string;
          id?: string;
          page_number?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "annotations_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      annotation_versions: {
        Row: {
          action: "created" | "updated" | "deleted";
          actor_id: string | null;
          annotation_id: string | null;
          annotation_type: string;
          captured_at: string;
          content: Json;
          document_id: string;
          id: string;
          page_number: number;
        };
        Insert: {
          action: "created" | "updated" | "deleted";
          actor_id?: string | null;
          annotation_id?: string | null;
          annotation_type: string;
          captured_at?: string;
          content?: Json;
          document_id: string;
          id?: string;
          page_number: number;
        };
        Update: {
          action?: "created" | "updated" | "deleted";
          actor_id?: string | null;
          annotation_id?: string | null;
          annotation_type?: string;
          captured_at?: string;
          content?: Json;
          document_id?: string;
          id?: string;
          page_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "annotation_versions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "annotation_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          classroom_id: string;
          created_at: string;
          document_id: string;
          due_at: string | null;
          id: string;
          instructions: string | null;
          published_at: string;
          published_by: string;
          title: string;
        };
        Insert: {
          classroom_id: string;
          created_at?: string;
          document_id: string;
          due_at?: string | null;
          id?: string;
          instructions?: string | null;
          published_at?: string;
          published_by: string;
          title: string;
        };
        Update: {
          classroom_id?: string;
          created_at?: string;
          document_id?: string;
          due_at?: string | null;
          id?: string;
          instructions?: string | null;
          published_at?: string;
          published_by?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_submissions: {
        Row: {
          assignment_id: string;
          id: string;
          status: "submitted" | "reviewed" | "returned";
          student_id: string;
          submission_text: string | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          id?: string;
          status?: "submitted" | "reviewed" | "returned";
          student_id: string;
          submission_text?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          id?: string;
          status?: "submitted" | "reviewed" | "returned";
          student_id?: string;
          submission_text?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      classroom_members: {
        Row: {
          classroom_id: string;
          created_at: string;
          id: string;
          role: "owner" | "teacher" | "student";
          user_id: string;
        };
        Insert: {
          classroom_id: string;
          created_at?: string;
          id?: string;
          role?: "owner" | "teacher" | "student";
          user_id: string;
        };
        Update: {
          classroom_id?: string;
          created_at?: string;
          id?: string;
          role?: "owner" | "teacher" | "student";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classroom_members_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
        ];
      };
      classroom_invites: {
        Row: {
          accepted_at: string | null;
          classroom_id: string;
          created_at: string;
          declined_at: string | null;
          email: string;
          id: string;
          invited_by: string;
          role: "owner" | "teacher" | "student";
        };
        Insert: {
          accepted_at?: string | null;
          classroom_id: string;
          created_at?: string;
          declined_at?: string | null;
          email: string;
          id?: string;
          invited_by: string;
          role?: "owner" | "teacher" | "student";
        };
        Update: {
          accepted_at?: string | null;
          classroom_id?: string;
          created_at?: string;
          declined_at?: string | null;
          email?: string;
          id?: string;
          invited_by?: string;
          role?: "owner" | "teacher" | "student";
        };
        Relationships: [
          {
            foreignKeyName: "classroom_invites_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classroom_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          actor_id: string | null;
          classroom_id: string | null;
          created_at: string;
          event_data: Json;
          event_type: "invite_sent" | "invite_accepted" | "invite_declined" | "invite_revoked" | "member_joined" | "member_left" | "member_role_updated";
          id: string;
        };
        Insert: {
          actor_id?: string | null;
          classroom_id?: string | null;
          created_at?: string;
          event_data?: Json;
          event_type: "invite_sent" | "invite_accepted" | "invite_declined" | "invite_revoked" | "member_joined" | "member_left" | "member_role_updated";
          id?: string;
        };
        Update: {
          actor_id?: string | null;
          classroom_id?: string | null;
          created_at?: string;
          event_data?: Json;
          event_type?: "invite_sent" | "invite_accepted" | "invite_declined" | "invite_revoked" | "member_joined" | "member_left" | "member_role_updated";
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_outbox: {
        Row: {
          body: string;
          classroom_id: string | null;
          created_at: string;
          error: string | null;
          id: string;
          invite_id: string | null;
          metadata: Json;
          sent_at: string | null;
          status: "pending" | "sent" | "failed";
          subject: string;
          to_email: string;
          triggered_by: string | null;
        };
        Insert: {
          body: string;
          classroom_id?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          invite_id?: string | null;
          metadata?: Json;
          sent_at?: string | null;
          status?: "pending" | "sent" | "failed";
          subject: string;
          to_email: string;
          triggered_by?: string | null;
        };
        Update: {
          body?: string;
          classroom_id?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          invite_id?: string | null;
          metadata?: Json;
          sent_at?: string | null;
          status?: "pending" | "sent" | "failed";
          subject?: string;
          to_email?: string;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_outbox_invite_id_fkey";
            columns: ["invite_id"];
            isOneToOne: false;
            referencedRelation: "classroom_invites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_outbox_triggered_by_fkey";
            columns: ["triggered_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          classroom_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          permission_key: string;
          user_id: string | null;
        };
        Insert: {
          classroom_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          permission_key: string;
          user_id?: string | null;
        };
        Update: {
          classroom_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          permission_key?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permissions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      file_storage: {
        Row: {
          bucket: string;
          classroom_id: string;
          created_at: string;
          created_by: string | null;
          document_id: string | null;
          file_name: string | null;
          id: string;
          mime_type: string | null;
          path: string;
          size_bytes: number | null;
        };
        Insert: {
          bucket?: string;
          classroom_id: string;
          created_at?: string;
          created_by?: string | null;
          document_id?: string | null;
          file_name?: string | null;
          id?: string;
          mime_type?: string | null;
          path: string;
          size_bytes?: number | null;
        };
        Update: {
          bucket?: string;
          classroom_id?: string;
          created_at?: string;
          created_by?: string | null;
          document_id?: string | null;
          file_name?: string | null;
          id?: string;
          mime_type?: string | null;
          path?: string;
          size_bytes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "file_storage_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "file_storage_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "file_storage_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      version_history: {
        Row: {
          created_at: string;
          created_by: string | null;
          document_id: string;
          file_path: string;
          id: string;
          note: string | null;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          document_id: string;
          file_path: string;
          id?: string;
          note?: string | null;
          version_number: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          document_id?: string;
          file_path?: string;
          id?: string;
          note?: string | null;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "version_history_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "version_history_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          classroom_id: string | null;
          created_at: string;
          document_id: string | null;
          event_data: Json;
          event_type: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          classroom_id?: string | null;
          created_at?: string;
          document_id?: string | null;
          event_data?: Json;
          event_type: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          classroom_id?: string | null;
          created_at?: string;
          document_id?: string | null;
          event_data?: Json;
          event_type?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          classroom_id: string | null;
          content: Json;
          created_at: string;
          description: string | null;
          id: string;
          owner_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          classroom_id?: string | null;
          content?: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          classroom_id?: string | null;
          content?: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "templates_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_settings: {
        Row: {
          classroom_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          provider: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          classroom_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          provider: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          classroom_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          provider?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_settings_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_settings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      classrooms: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          join_code: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          join_code?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          join_code?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          annotation_id: string | null;
          body: string;
          created_at: string;
          document_id: string;
          id: string;
          parent_comment_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          annotation_id?: string | null;
          body: string;
          created_at?: string;
          document_id: string;
          id?: string;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          annotation_id?: string | null;
          body?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          classroom_id: string;
          created_at: string;
          file_path: string;
          file_type: string;
          id: string;
          owner_id: string;
          status: "draft" | "active" | "archived";
          title: string;
          updated_at: string;
        };
        Insert: {
          classroom_id: string;
          created_at?: string;
          file_path: string;
          file_type?: string;
          id?: string;
          owner_id: string;
          status?: "draft" | "active" | "archived";
          title: string;
          updated_at?: string;
        };
        Update: {
          classroom_id?: string;
          created_at?: string;
          file_path?: string;
          file_type?: string;
          id?: string;
          owner_id?: string;
          status?: "draft" | "active" | "archived";
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
        ];
      };
      document_sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          document_id: string;
          external_id: string | null;
          id: string;
          metadata: Json;
          provider: "google_drive" | "onedrive" | "dropbox" | "box" | "url";
          source_url: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          document_id: string;
          external_id?: string | null;
          id?: string;
          metadata?: Json;
          provider?: "google_drive" | "onedrive" | "dropbox" | "box" | "url";
          source_url: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          document_id?: string;
          external_id?: string | null;
          id?: string;
          metadata?: Json;
          provider?: "google_drive" | "onedrive" | "dropbox" | "box" | "url";
          source_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_sources_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_connections: {
        Row: {
          classroom_id: string;
          config: Json;
          connected_by: string | null;
          created_at: string;
          display_name: string | null;
          external_class_id: string | null;
          id: string;
          provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          status: "pending" | "connected" | "error";
          updated_at: string;
        };
        Insert: {
          classroom_id: string;
          config?: Json;
          connected_by?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_class_id?: string | null;
          id?: string;
          provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          status?: "pending" | "connected" | "error";
          updated_at?: string;
        };
        Update: {
          classroom_id?: string;
          config?: Json;
          connected_by?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_class_id?: string | null;
          id?: string;
          provider?: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          status?: "pending" | "connected" | "error";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_connections_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_oauth_states: {
        Row: {
          classroom_id: string;
          code_verifier: string;
          created_at: string;
          id: string;
          provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          state: string;
          user_id: string;
        };
        Insert: {
          classroom_id: string;
          code_verifier: string;
          created_at?: string;
          id?: string;
          provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          state: string;
          user_id: string;
        };
        Update: {
          classroom_id?: string;
          code_verifier?: string;
          created_at?: string;
          id?: string;
          provider?: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
          state?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_oauth_states_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_tokens: {
        Row: {
          access_token: string;
          connection_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          refresh_token: string | null;
          scope: string | null;
          token_type: string | null;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          connection_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          refresh_token?: string | null;
          scope?: string | null;
          token_type?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          connection_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          refresh_token?: string | null;
          scope?: string | null;
          token_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_tokens_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "integration_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      lms_courses: {
        Row: {
          classroom_id: string;
          connection_id: string;
          created_at: string;
          description: string | null;
          external_id: string;
          id: string;
          name: string;
          room: string | null;
          section: string | null;
          updated_at: string;
        };
        Insert: {
          classroom_id: string;
          connection_id: string;
          created_at?: string;
          description?: string | null;
          external_id: string;
          id?: string;
          name: string;
          room?: string | null;
          section?: string | null;
          updated_at?: string;
        };
        Update: {
          classroom_id?: string;
          connection_id?: string;
          created_at?: string;
          description?: string | null;
          external_id?: string;
          id?: string;
          name?: string;
          room?: string | null;
          section?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lms_courses_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lms_courses_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "integration_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      lms_coursework: {
        Row: {
          alternate_link: string | null;
          classroom_id: string;
          connection_id: string;
          course_external_id: string;
          created_at: string;
          description: string | null;
          due_at: string | null;
          external_id: string;
          id: string;
          max_points: number | null;
          state: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          alternate_link?: string | null;
          classroom_id: string;
          connection_id: string;
          course_external_id: string;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          external_id: string;
          id?: string;
          max_points?: number | null;
          state?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          alternate_link?: string | null;
          classroom_id?: string;
          connection_id?: string;
          course_external_id?: string;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          external_id?: string;
          id?: string;
          max_points?: number | null;
          state?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lms_coursework_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lms_coursework_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "integration_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      lms_submissions: {
        Row: {
          assigned_grade: number | null;
          classroom_id: string;
          connection_id: string;
          course_external_id: string;
          coursework_external_id: string;
          draft_grade: number | null;
          external_id: string;
          id: string;
          late: boolean | null;
          state: string | null;
          student_external_id: string | null;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          assigned_grade?: number | null;
          classroom_id: string;
          connection_id: string;
          course_external_id: string;
          coursework_external_id: string;
          draft_grade?: number | null;
          external_id: string;
          id?: string;
          late?: boolean | null;
          state?: string | null;
          student_external_id?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          assigned_grade?: number | null;
          classroom_id?: string;
          connection_id?: string;
          course_external_id?: string;
          coursework_external_id?: string;
          draft_grade?: number | null;
          external_id?: string;
          id?: string;
          late?: boolean | null;
          state?: string | null;
          student_external_id?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lms_submissions_classroom_id_fkey";
            columns: ["classroom_id"];
            isOneToOne: false;
            referencedRelation: "classrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lms_submissions_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "integration_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          reference_id: string | null;
          reference_type: string | null;
          sender_id: string;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          reference_id?: string | null;
          reference_type?: string | null;
          sender_id: string;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          reference_id?: string | null;
          reference_type?: string | null;
          sender_id?: string;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          name: string;
          owner_id: string | null;
          status: "Planning" | "In Progress" | "Done";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name: string;
          owner_id?: string | null;
          status?: "Planning" | "In Progress" | "Done";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name?: string;
          owner_id?: string | null;
          status?: "Planning" | "In Progress" | "Done";
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          is_done: boolean;
          priority: 1 | 2 | 3;
          project_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          is_done?: boolean;
          priority?: 1 | 2 | 3;
          project_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          is_done?: boolean;
          priority?: 1 | 2 | 3;
          project_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      annotation_version_action: "created" | "updated" | "deleted";
      audit_event_type: "invite_sent" | "invite_accepted" | "invite_declined" | "invite_revoked" | "member_joined" | "member_left" | "member_role_updated";
      cloud_provider: "google_drive" | "onedrive" | "dropbox" | "box" | "url";
      classroom_role: "owner" | "teacher" | "student";
      connection_status: "pending" | "connected" | "error";
      document_status: "draft" | "active" | "archived";
      email_status: "pending" | "sent" | "failed";
      integration_provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
    };
    CompositeTypes: Record<string, never>;
  };
};
