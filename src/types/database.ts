export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_private: {
        Row: {
          account_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_private_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      accounts: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          deactivated_at: string | null;
          deletion_requested_at: string | null;
          display_name: string;
          id: string;
          preferred_locale: Database['public']['Enums']['locale'];
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          deletion_requested_at?: string | null;
          display_name: string;
          id: string;
          preferred_locale?: Database['public']['Enums']['locale'];
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          deletion_requested_at?: string | null;
          display_name?: string;
          id?: string;
          preferred_locale?: Database['public']['Enums']['locale'];
          updated_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          audience: Database['public']['Enums']['app_role'];
          author_display: string | null;
          author_id: string | null;
          body_md: string;
          created_at: string;
          discord_message_id: string | null;
          discord_posted_message_id: string | null;
          edited_at: string | null;
          hidden_at: string | null;
          id: string;
          pinned: boolean;
          published_at: string;
          source: string;
          title: string | null;
        };
        Insert: {
          audience?: Database['public']['Enums']['app_role'];
          author_display?: string | null;
          author_id?: string | null;
          body_md: string;
          created_at?: string;
          discord_message_id?: string | null;
          discord_posted_message_id?: string | null;
          edited_at?: string | null;
          hidden_at?: string | null;
          id?: string;
          pinned?: boolean;
          published_at?: string;
          source?: string;
          title?: string | null;
        };
        Update: {
          audience?: Database['public']['Enums']['app_role'];
          author_display?: string | null;
          author_id?: string | null;
          body_md?: string;
          created_at?: string;
          discord_message_id?: string | null;
          discord_posted_message_id?: string | null;
          edited_at?: string | null;
          hidden_at?: string | null;
          id?: string;
          pinned?: boolean;
          published_at?: string;
          source?: string;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_details: {
        Row: {
          formed_year: number | null;
          kind: string;
          profile_id: string;
        };
        Insert: {
          formed_year?: number | null;
          kind?: string;
          profile_id: string;
        };
        Update: {
          formed_year?: number | null;
          kind?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_details_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database['public']['Enums']['app_role'] | null;
          id: number;
          new_data: Json | null;
          occurred_at: string;
          old_data: Json | null;
          record_id: string | null;
          table_name: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database['public']['Enums']['app_role'] | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database['public']['Enums']['app_role'] | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      budget_lines: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          label: string;
          planned_millimes: number;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          label: string;
          planned_millimes: number;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          label?: string;
          planned_millimes?: number;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budget_lines_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      correspondence: {
        Row: {
          archived_at: string | null;
          counterpart: string;
          counterpart_email: string | null;
          created_at: string;
          direction: string;
          due_on: string | null;
          id: string;
          owner_id: string | null;
          reference_code: string;
          sent_at: string | null;
          signature_provider: string | null;
          signature_request_id: string | null;
          signed_at: string | null;
          status: Database['public']['Enums']['correspondence_status'];
          subject: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          counterpart?: string;
          counterpart_email?: string | null;
          created_at?: string;
          direction?: string;
          due_on?: string | null;
          id?: string;
          owner_id?: string | null;
          reference_code: string;
          sent_at?: string | null;
          signature_provider?: string | null;
          signature_request_id?: string | null;
          signed_at?: string | null;
          status?: Database['public']['Enums']['correspondence_status'];
          subject: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          counterpart?: string;
          counterpart_email?: string | null;
          created_at?: string;
          direction?: string;
          due_on?: string | null;
          id?: string;
          owner_id?: string | null;
          reference_code?: string;
          sent_at?: string | null;
          signature_provider?: string | null;
          signature_request_id?: string | null;
          signed_at?: string | null;
          status?: Database['public']['Enums']['correspondence_status'];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'correspondence_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      correspondence_documents: {
        Row: {
          correspondence_id: string;
          created_at: string;
          id: string;
          kind: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          correspondence_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          correspondence_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'correspondence_documents_correspondence_id_fkey';
            columns: ['correspondence_id'];
            isOneToOne: false;
            referencedRelation: 'correspondence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'correspondence_documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      correspondence_events: {
        Row: {
          actor_id: string | null;
          correspondence_id: string;
          created_at: string;
          email_message_id: string | null;
          from_status: Database['public']['Enums']['correspondence_status'] | null;
          id: string;
          note: string | null;
          to_status: Database['public']['Enums']['correspondence_status'];
        };
        Insert: {
          actor_id?: string | null;
          correspondence_id: string;
          created_at?: string;
          email_message_id?: string | null;
          from_status?: Database['public']['Enums']['correspondence_status'] | null;
          id?: string;
          note?: string | null;
          to_status: Database['public']['Enums']['correspondence_status'];
        };
        Update: {
          actor_id?: string | null;
          correspondence_id?: string;
          created_at?: string;
          email_message_id?: string | null;
          from_status?: Database['public']['Enums']['correspondence_status'] | null;
          id?: string;
          note?: string | null;
          to_status?: Database['public']['Enums']['correspondence_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'correspondence_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'correspondence_events_correspondence_id_fkey';
            columns: ['correspondence_id'];
            isOneToOne: false;
            referencedRelation: 'correspondence';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          archived_at: string | null;
          audience: Database['public']['Enums']['app_role'];
          category: string | null;
          collection: Database['public']['Enums']['document_collection'];
          created_at: string;
          id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          supersedes_id: string | null;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          audience?: Database['public']['Enums']['app_role'];
          category?: string | null;
          collection?: Database['public']['Enums']['document_collection'];
          created_at?: string;
          id?: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          supersedes_id?: string | null;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          audience?: Database['public']['Enums']['app_role'];
          category?: string | null;
          collection?: Database['public']['Enums']['document_collection'];
          created_at?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          supersedes_id?: string | null;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_supersedes_id_fkey';
            columns: ['supersedes_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      event_lineup: {
        Row: {
          event_id: string;
          position: number;
          profile_id: string;
          role: string | null;
        };
        Insert: {
          event_id: string;
          position?: number;
          profile_id: string;
          role?: string | null;
        };
        Update: {
          event_id?: string;
          position?: number;
          profile_id?: string;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_lineup_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_lineup_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          cover_path: string | null;
          created_at: string;
          description: NonNullable<Json>;
          ends_at: string | null;
          governorate_code: string | null;
          id: string;
          is_free: boolean;
          organized_by_acf: boolean;
          proposed_by: string | null;
          published_at: string | null;
          published_by: string | null;
          search: unknown;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['content_status'];
          ticket_url: string | null;
          title: NonNullable<Json>;
          updated_at: string;
          venue_profile_id: string | null;
          venue_text: string | null;
        };
        Insert: {
          cover_path?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          ends_at?: string | null;
          governorate_code?: string | null;
          id?: string;
          is_free?: boolean;
          organized_by_acf?: boolean;
          proposed_by?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          search?: never;
          slug: string;
          starts_at: string;
          status?: Database['public']['Enums']['content_status'];
          ticket_url?: string | null;
          title: NonNullable<Json>;
          updated_at?: string;
          venue_profile_id?: string | null;
          venue_text?: string | null;
        };
        Update: {
          cover_path?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          ends_at?: string | null;
          governorate_code?: string | null;
          id?: string;
          is_free?: boolean;
          organized_by_acf?: boolean;
          proposed_by?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          search?: never;
          slug?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['content_status'];
          ticket_url?: string | null;
          title?: NonNullable<Json>;
          updated_at?: string;
          venue_profile_id?: string | null;
          venue_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_governorate_code_fkey';
            columns: ['governorate_code'];
            isOneToOne: false;
            referencedRelation: 'governorates';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'events_proposed_by_fkey';
            columns: ['proposed_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_published_by_fkey';
            columns: ['published_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_venue_profile_id_fkey';
            columns: ['venue_profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      genres: {
        Row: {
          id: string;
          name: NonNullable<Json>;
          position: number;
          slug: string;
        };
        Insert: {
          id?: string;
          name: NonNullable<Json>;
          position?: number;
          slug: string;
        };
        Update: {
          id?: string;
          name?: NonNullable<Json>;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      governorates: {
        Row: {
          code: string;
          name: NonNullable<Json>;
          position: number;
        };
        Insert: {
          code: string;
          name: NonNullable<Json>;
          position?: number;
        };
        Update: {
          code?: string;
          name?: NonNullable<Json>;
          position?: number;
        };
        Relationships: [];
      };
      integration_state: {
        Row: {
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: Database['public']['Enums']['app_role'];
          token_hash: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role: Database['public']['Enums']['app_role'];
          token_hash?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database['public']['Enums']['app_role'];
          token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount_millimes: number;
          budget_line_id: string | null;
          category: string;
          counterparty: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          direction: Database['public']['Enums']['ledger_direction'];
          entry_date: string;
          id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          period_id: string | null;
          project_id: string | null;
          reference: string | null;
          reverses_entry_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount_millimes: number;
          budget_line_id?: string | null;
          category: string;
          counterparty?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          direction: Database['public']['Enums']['ledger_direction'];
          entry_date: string;
          id?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          period_id?: string | null;
          project_id?: string | null;
          reference?: string | null;
          reverses_entry_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_millimes?: number;
          budget_line_id?: string | null;
          category?: string;
          counterparty?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          direction?: Database['public']['Enums']['ledger_direction'];
          entry_date?: string;
          id?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          period_id?: string | null;
          project_id?: string | null;
          reference?: string | null;
          reverses_entry_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ledger_entries_budget_line_id_fkey';
            columns: ['budget_line_id'];
            isOneToOne: false;
            referencedRelation: 'budget_lines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_entries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_entries_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'ledger_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_entries_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_entries_reverses_entry_id_fkey';
            columns: ['reverses_entry_id'];
            isOneToOne: true;
            referencedRelation: 'ledger_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      ledger_periods: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          ends_on: string;
          id: string;
          label: string;
          starts_on: string;
        };
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          ends_on: string;
          id?: string;
          label: string;
          starts_on: string;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          ends_on?: string;
          id?: string;
          label?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ledger_periods_closed_by_fkey';
            columns: ['closed_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_rsvps: {
        Row: {
          meeting_id: string;
          note: string | null;
          response: Database['public']['Enums']['rsvp_response'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          meeting_id: string;
          note?: string | null;
          response: Database['public']['Enums']['rsvp_response'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          meeting_id?: string;
          note?: string | null;
          response?: Database['public']['Enums']['rsvp_response'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_rsvps_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_rsvps_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      meetings: {
        Row: {
          audience: Database['public']['Enums']['app_role'];
          cancelled_at: string | null;
          created_at: string;
          created_by: string | null;
          description_md: string;
          ends_at: string | null;
          id: string;
          location_text: string | null;
          minutes_document_id: string | null;
          online_url: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: Database['public']['Enums']['app_role'];
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          ends_at?: string | null;
          id?: string;
          location_text?: string | null;
          minutes_document_id?: string | null;
          online_url?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Database['public']['Enums']['app_role'];
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          ends_at?: string | null;
          id?: string;
          location_text?: string | null;
          minutes_document_id?: string | null;
          online_url?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_minutes_document_id_fkey';
            columns: ['minutes_document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          granted_by: string | null;
          joined_on: string;
          role: Database['public']['Enums']['app_role'];
          status: Database['public']['Enums']['membership_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          joined_on?: string;
          role: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          joined_on?: string;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      moderation_reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reporter_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_reports_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          channel: string;
          id: string;
          kind: string;
          sent_at: string;
          target_id: string;
          user_id: string | null;
        };
        Insert: {
          channel: string;
          id?: string;
          kind: string;
          sent_at?: string;
          target_id: string;
          user_id?: string | null;
        };
        Update: {
          channel?: string;
          id?: string;
          kind?: string;
          sent_at?: string;
          target_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_options: {
        Row: {
          ends_at: string | null;
          id: string;
          label: string;
          poll_id: string;
          position: number;
          starts_at: string | null;
        };
        Insert: {
          ends_at?: string | null;
          id?: string;
          label: string;
          poll_id: string;
          position?: number;
          starts_at?: string | null;
        };
        Update: {
          ends_at?: string | null;
          id?: string;
          label?: string;
          poll_id?: string;
          position?: number;
          starts_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_options_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'polls';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_votes: {
        Row: {
          option_id: string;
          updated_at: string;
          user_id: string;
          value: Database['public']['Enums']['poll_vote_value'];
        };
        Insert: {
          option_id: string;
          updated_at?: string;
          user_id: string;
          value?: Database['public']['Enums']['poll_vote_value'];
        };
        Update: {
          option_id?: string;
          updated_at?: string;
          user_id?: string;
          value?: Database['public']['Enums']['poll_vote_value'];
        };
        Relationships: [
          {
            foreignKeyName: 'poll_votes_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'poll_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'poll_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      polls: {
        Row: {
          audience: Database['public']['Enums']['app_role'];
          closes_at: string | null;
          created_at: string;
          created_by: string | null;
          description_md: string;
          id: string;
          kind: string;
          multi: boolean;
          title: string;
        };
        Insert: {
          audience?: Database['public']['Enums']['app_role'];
          closes_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          id?: string;
          kind?: string;
          multi?: boolean;
          title: string;
        };
        Update: {
          audience?: Database['public']['Enums']['app_role'];
          closes_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          id?: string;
          kind?: string;
          multi?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'polls_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string | null;
          blog_profile_id: string | null;
          body_md: string;
          cover_path: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          kind: Database['public']['Enums']['post_kind'];
          locale: Database['public']['Enums']['locale'];
          published_at: string | null;
          slug: string;
          status: Database['public']['Enums']['content_status'];
          title: string;
          translation_group: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          blog_profile_id?: string | null;
          body_md?: string;
          cover_path?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          kind: Database['public']['Enums']['post_kind'];
          locale: Database['public']['Enums']['locale'];
          published_at?: string | null;
          slug: string;
          status?: Database['public']['Enums']['content_status'];
          title: string;
          translation_group?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          blog_profile_id?: string | null;
          body_md?: string;
          cover_path?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['post_kind'];
          locale?: Database['public']['Enums']['locale'];
          published_at?: string | null;
          slug?: string;
          status?: Database['public']['Enums']['content_status'];
          title?: string;
          translation_group?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_blog_profile_id_fkey';
            columns: ['blog_profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      professional_details: {
        Row: {
          available_for_hire: boolean;
          profile_id: string;
          years_experience: number | null;
        };
        Insert: {
          available_for_hire?: boolean;
          profile_id: string;
          years_experience?: number | null;
        };
        Update: {
          available_for_hire?: boolean;
          profile_id?: string;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'professional_details_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      professions: {
        Row: {
          id: string;
          name: NonNullable<Json>;
          position: number;
          slug: string;
        };
        Insert: {
          id?: string;
          name: NonNullable<Json>;
          position?: number;
          slug: string;
        };
        Update: {
          id?: string;
          name?: NonNullable<Json>;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      profile_genres: {
        Row: {
          genre_id: string;
          profile_id: string;
        };
        Insert: {
          genre_id: string;
          profile_id: string;
        };
        Update: {
          genre_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_genres_genre_id_fkey';
            columns: ['genre_id'];
            isOneToOne: false;
            referencedRelation: 'genres';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_genres_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_managers: {
        Row: {
          added_by: string | null;
          created_at: string;
          profile_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          profile_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          profile_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_managers_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_managers_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_managers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_private: {
        Row: {
          contact_email: string | null;
          contact_phone: string | null;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          contact_phone?: string | null;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          contact_phone?: string | null;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_private_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_professions: {
        Row: {
          profession_id: string;
          profile_id: string;
        };
        Insert: {
          profession_id: string;
          profile_id: string;
        };
        Update: {
          profession_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_professions_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_professions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      project_budgets: {
        Row: {
          notes: string | null;
          project_id: string;
          total_planned_millimes: number;
          updated_at: string;
        };
        Insert: {
          notes?: string | null;
          project_id: string;
          total_planned_millimes?: number;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          project_id?: string;
          total_planned_millimes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_budgets_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_on: string | null;
          id: string;
          name: string;
          starts_on: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_on?: string | null;
          id?: string;
          name: string;
          starts_on?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_on?: string | null;
          id?: string;
          name?: string;
          starts_on?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      public_profiles: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          avatar_path: string | null;
          bio: NonNullable<Json>;
          city: string | null;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          display_name: string;
          governorate_code: string | null;
          id: string;
          links: NonNullable<Json>;
          public_contact: NonNullable<Json>;
          search: unknown;
          slug: string;
          status: Database['public']['Enums']['profile_status'];
          submitted_at: string | null;
          tagline: NonNullable<Json>;
          type: Database['public']['Enums']['profile_type'];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          avatar_path?: string | null;
          bio?: NonNullable<Json>;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name: string;
          governorate_code?: string | null;
          id?: string;
          links?: NonNullable<Json>;
          public_contact?: NonNullable<Json>;
          search?: never;
          slug: string;
          status?: Database['public']['Enums']['profile_status'];
          submitted_at?: string | null;
          tagline?: NonNullable<Json>;
          type: Database['public']['Enums']['profile_type'];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          avatar_path?: string | null;
          bio?: NonNullable<Json>;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name?: string;
          governorate_code?: string | null;
          id?: string;
          links?: NonNullable<Json>;
          public_contact?: NonNullable<Json>;
          search?: never;
          slug?: string;
          status?: Database['public']['Enums']['profile_status'];
          submitted_at?: string | null;
          tagline?: NonNullable<Json>;
          type?: Database['public']['Enums']['profile_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_profiles_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_profiles_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_profiles_governorate_code_fkey';
            columns: ['governorate_code'];
            isOneToOne: false;
            referencedRelation: 'governorates';
            referencedColumns: ['code'];
          },
        ];
      };
      receipts: {
        Row: {
          created_at: string;
          id: string;
          ledger_entry_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ledger_entry_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ledger_entry_id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'receipts_ledger_entry_id_fkey';
            columns: ['ledger_entry_id'];
            isOneToOne: false;
            referencedRelation: 'ledger_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      review_event_notes: {
        Row: {
          note_internal: string;
          review_event_id: string;
        };
        Insert: {
          note_internal: string;
          review_event_id: string;
        };
        Update: {
          note_internal?: string;
          review_event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_event_notes_review_event_id_fkey';
            columns: ['review_event_id'];
            isOneToOne: true;
            referencedRelation: 'review_events';
            referencedColumns: ['id'];
          },
        ];
      };
      review_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          note_public: string | null;
          target_id: string;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          note_public?: string | null;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          note_public?: string | null;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      site_settings: {
        Row: {
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'site_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      studio_details: {
        Row: {
          address: string | null;
          profile_id: string;
          services: string[];
        };
        Insert: {
          address?: string | null;
          profile_id: string;
          services?: string[];
        };
        Update: {
          address?: string | null;
          profile_id?: string;
          services?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'studio_details_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_assignees: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_assignees_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_assignees_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      task_comments: {
        Row: {
          author_id: string | null;
          body_md: string;
          created_at: string;
          id: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body_md: string;
          created_at?: string;
          id?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body_md?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          audience: Database['public']['Enums']['app_role'];
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description_md: string;
          due_on: string | null;
          id: string;
          is_open: boolean;
          priority: number;
          project_id: string | null;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: Database['public']['Enums']['app_role'];
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          due_on?: string | null;
          id?: string;
          is_open?: boolean;
          priority?: number;
          project_id?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Database['public']['Enums']['app_role'];
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_md?: string;
          due_on?: string | null;
          id?: string;
          is_open?: boolean;
          priority?: number;
          project_id?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      venue_details: {
        Row: {
          accessibility: NonNullable<Json>;
          address: string | null;
          capacity: number | null;
          has_backline: boolean;
          lat: number | null;
          lng: number | null;
          profile_id: string;
          venue_kind: string | null;
        };
        Insert: {
          accessibility?: NonNullable<Json>;
          address?: string | null;
          capacity?: number | null;
          has_backline?: boolean;
          lat?: number | null;
          lng?: number | null;
          profile_id: string;
          venue_kind?: string | null;
        };
        Update: {
          accessibility?: NonNullable<Json>;
          address?: string | null;
          capacity?: number | null;
          has_backline?: boolean;
          lat?: number | null;
          lng?: number | null;
          profile_id?: string;
          venue_kind?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_details_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_shifts: {
        Row: {
          capacity: number;
          created_at: string;
          ends_at: string;
          event_id: string | null;
          id: string;
          role_label: NonNullable<Json>;
          starts_at: string;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          ends_at: string;
          event_id?: string | null;
          id?: string;
          role_label: NonNullable<Json>;
          starts_at: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          ends_at?: string;
          event_id?: string | null;
          id?: string;
          role_label?: NonNullable<Json>;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_shifts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_signups: {
        Row: {
          created_at: string;
          id: string;
          shift_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          shift_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          shift_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_signups_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'volunteer_shifts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'volunteer_signups_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_profile: {
        Args: {
          display_name: string;
          profile_type: Database['public']['Enums']['profile_type'];
          slug: string;
        };
        Returns: string;
      };
      meeting_rsvp_counts: {
        Args: { meeting: string };
        Returns: {
          response: Database['public']['Enums']['rsvp_response'];
          total: number;
        }[];
      };
      propose_event: {
        Args: {
          as_profile: string;
          description?: Json;
          ends_at?: string;
          governorate_code?: string;
          is_free?: boolean;
          slug: string;
          starts_at: string;
          ticket_url?: string;
          title: Json;
          venue_profile?: string;
          venue_text?: string;
        };
        Returns: string;
      };
      request_account_deletion: { Args: Record<PropertyKey, never>; Returns: undefined };
      review_profile: {
        Args: { decision: string; note_internal?: string; note_public?: string; profile: string };
        Returns: undefined;
      };
      set_account_deactivated: {
        Args: { deactivated: boolean; target: string };
        Returns: undefined;
      };
      set_event_status: {
        Args: {
          event: string;
          new_status: Database['public']['Enums']['content_status'];
          note_public?: string;
        };
        Returns: undefined;
      };
      set_ledger_period_closed: { Args: { closed: boolean; period: string }; Returns: undefined };
      set_post_status: {
        Args: {
          new_status: Database['public']['Enums']['content_status'];
          note_public?: string;
          post: string;
        };
        Returns: undefined;
      };
      set_task_status: {
        Args: { new_status: Database['public']['Enums']['task_status']; task: string };
        Returns: undefined;
      };
      submit_profile: { Args: { profile: string }; Returns: undefined };
      transition_correspondence: {
        Args: {
          item: string;
          note?: string;
          to_status: Database['public']['Enums']['correspondence_status'];
        };
        Returns: undefined;
      };
      volunteer_shift_counts: {
        Args: { event: string };
        Returns: {
          capacity: number;
          shift_id: string;
          taken: number;
        }[];
      };
    };
    Enums: {
      app_role: 'member' | 'board' | 'admin';
      content_status: 'draft' | 'pending' | 'published' | 'unpublished';
      correspondence_status: 'draft' | 'sent' | 'awaiting_signature' | 'signed' | 'archived';
      document_collection: 'library' | 'legal';
      ledger_direction: 'income' | 'expense';
      locale: 'ar' | 'fr' | 'en';
      membership_status: 'active' | 'suspended' | 'alumni';
      payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
      poll_vote_value: 'yes' | 'maybe' | 'no';
      post_kind: 'news' | 'blog';
      profile_status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
      profile_type: 'artist' | 'professional' | 'venue' | 'studio' | 'blog';
      rsvp_response: 'yes' | 'maybe' | 'no';
      task_status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['member', 'board', 'admin'],
      content_status: ['draft', 'pending', 'published', 'unpublished'],
      correspondence_status: ['draft', 'sent', 'awaiting_signature', 'signed', 'archived'],
      document_collection: ['library', 'legal'],
      ledger_direction: ['income', 'expense'],
      locale: ['ar', 'fr', 'en'],
      membership_status: ['active', 'suspended', 'alumni'],
      payment_method: ['cash', 'bank_transfer', 'cheque', 'card', 'other'],
      poll_vote_value: ['yes', 'maybe', 'no'],
      post_kind: ['news', 'blog'],
      profile_status: ['draft', 'pending', 'approved', 'rejected', 'suspended'],
      profile_type: ['artist', 'professional', 'venue', 'studio', 'blog'],
      rsvp_response: ['yes', 'maybe', 'no'],
      task_status: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
    },
  },
} as const;
