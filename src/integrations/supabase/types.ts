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
      agent_call_logs: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          log_type: string | null
          logged_at: string
          logged_by: string
          meeting_location: string | null
          summary: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          log_type?: string | null
          logged_at?: string
          logged_by: string
          meeting_location?: string | null
          summary: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          log_type?: string | null
          logged_at?: string
          logged_by?: string
          meeting_location?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "buyer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_call_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          answer: string
          citations: Json | null
          confidence_score: number | null
          created_at: string | null
          id: string
          model_name: string | null
          query_id: string
        }
        Insert: {
          answer: string
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          model_name?: string | null
          query_id: string
        }
        Update: {
          answer?: string
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          model_name?: string | null
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_audit_log: {
        Row: {
          created_at: string | null
          data_accessed: Json | null
          id: string
          query_text: string
          response_summary: string | null
          session_id: string | null
          tools_called: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_accessed?: Json | null
          id?: string
          query_text: string
          response_summary?: string | null
          session_id?: string | null
          tools_called?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_accessed?: Json | null
          id?: string
          query_text?: string
          response_summary?: string | null
          session_id?: string | null
          tools_called?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["change_action"]
          after_data: Json | null
          before_data: Json | null
          category: string
          changed_at: string
          changed_by: string | null
          id: number
          item_id: string | null
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["change_action"]
          after_data?: Json | null
          before_data?: Json | null
          category: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          item_id?: string | null
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["change_action"]
          after_data?: Json | null
          before_data?: Json | null
          category?: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          item_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          bio_long: string | null
          bio_short: string | null
          created_at: string
          email: string | null
          expertise_areas: string[] | null
          headshot_url: string | null
          id: string
          is_active: boolean
          name: string
          socials_json: Json | null
          team_member_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          bio_long?: string | null
          bio_short?: string | null
          created_at?: string
          email?: string | null
          expertise_areas?: string[] | null
          headshot_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          socials_json?: Json | null
          team_member_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          bio_long?: string | null
          bio_short?: string | null
          created_at?: string
          email?: string | null
          expertise_areas?: string[] | null
          headshot_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          socials_json?: Json | null
          team_member_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          body_mdx: string | null
          canonical_url: string | null
          category: Database["public"]["Enums"]["blog_category"]
          cover_url: string | null
          created_at: string
          dek: string | null
          engagement_score: number | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          og_image_url: string | null
          published_at: string | null
          read_time_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          body_mdx?: string | null
          canonical_url?: string | null
          category: Database["public"]["Enums"]["blog_category"]
          cover_url?: string | null
          created_at?: string
          dek?: string | null
          engagement_score?: number | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          body_mdx?: string | null
          canonical_url?: string | null
          category?: Database["public"]["Enums"]["blog_category"]
          cover_url?: string | null
          created_at?: string
          dek?: string | null
          engagement_score?: number | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_id: string | null
          phone: string | null
          ssn_last4: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_id?: string | null
          phone?: string | null
          ssn_last4?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_id?: string | null
          phone?: string | null
          ssn_last4?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_agents: {
        Row: {
          agent_rank: string | null
          brokerage: string
          created_at: string
          email: string | null
          face_to_face_meeting: string | null
          first_name: string
          id: string
          last_agent_call: string | null
          last_name: string
          license_number: string | null
          next_agent_call: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          agent_rank?: string | null
          brokerage: string
          created_at?: string
          email?: string | null
          face_to_face_meeting?: string | null
          first_name: string
          id?: string
          last_agent_call?: string | null
          last_name: string
          license_number?: string | null
          next_agent_call?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          agent_rank?: string | null
          brokerage?: string
          created_at?: string
          email?: string | null
          face_to_face_meeting?: string | null
          first_name?: string
          id?: string
          last_agent_call?: string | null
          last_name?: string
          license_number?: string | null
          next_agent_call?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chunk_embeddings: {
        Row: {
          chunk_id: string
          created_at: string | null
          embedding: string | null
          id: string
          model_name: string | null
        }
        Insert: {
          chunk_id: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          model_name?: string | null
        }
        Update: {
          chunk_id?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          model_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chunk_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          id: string
          page_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          id?: string
          page_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          id?: string
          page_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      condos: {
        Row: {
          approval_expiration_date: string | null
          approval_source:
            | Database["public"]["Enums"]["approval_source_type"]
            | null
          approval_type:
            | Database["public"]["Enums"]["approval_type_type"]
            | null
          area: string | null
          budget_file_url: string | null
          city: string | null
          condo_name: string
          cq_file_url: string | null
          created_at: string
          id: string
          mip_file_url: string | null
          state: string | null
          street_address: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          approval_expiration_date?: string | null
          approval_source?:
            | Database["public"]["Enums"]["approval_source_type"]
            | null
          approval_type?:
            | Database["public"]["Enums"]["approval_type_type"]
            | null
          area?: string | null
          budget_file_url?: string | null
          city?: string | null
          condo_name: string
          cq_file_url?: string | null
          created_at?: string
          id?: string
          mip_file_url?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          approval_expiration_date?: string | null
          approval_source?:
            | Database["public"]["Enums"]["approval_source_type"]
            | null
          approval_type?:
            | Database["public"]["Enums"]["approval_type_type"]
            | null
          area?: string | null
          budget_file_url?: string | null
          city?: string | null
          condo_name?: string
          cq_file_url?: string | null
          created_at?: string
          id?: string
          mip_file_url?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_created_date: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["contact_type"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_created_date?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          type: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_created_date?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          messages: Json | null
          session_id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          session_id: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          session_id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cost_profiles: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          is_active: boolean
          lender_fees: number
          mi_rules: Json | null
          name: string
          prepaids_rule: Json | null
          recording_fees: number
          third_party_fees: number
          title_fees: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          lender_fees?: number
          mi_rules?: Json | null
          name: string
          prepaids_rule?: Json | null
          recording_fees?: number
          third_party_fees?: number
          title_fees?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          lender_fees?: number
          mi_rules?: Json | null
          name?: string
          prepaids_rule?: Json | null
          recording_fees?: number
          third_party_fees?: number
          title_fees?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_fields: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          dropdown_options: Json | null
          field_name: string
          field_type: string
          file_config: Json | null
          id: string
          is_in_use: boolean | null
          is_required: boolean | null
          is_system_field: boolean | null
          is_visible: boolean | null
          section: string
          sort_order: number | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          dropdown_options?: Json | null
          field_name: string
          field_type: string
          file_config?: Json | null
          id?: string
          is_in_use?: boolean | null
          is_required?: boolean | null
          is_system_field?: boolean | null
          is_visible?: boolean | null
          section: string
          sort_order?: number | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          dropdown_options?: Json | null
          field_name?: string
          field_type?: string
          file_config?: Json | null
          id?: string
          is_in_use?: boolean | null
          is_required?: boolean | null
          is_system_field?: boolean | null
          is_visible?: boolean | null
          section?: string
          sort_order?: number | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      crm_fields_audit: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_at: string | null
          changed_by: string | null
          field_id: string | null
          id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          field_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          field_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_fields_audit_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          effective_date: string | null
          file_name: string
          file_url: string
          id: string
          lead_id: string | null
          lender_name: string | null
          mime_type: string
          notes: string | null
          size_bytes: number
          status: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string
          version_tag: string | null
        }
        Insert: {
          created_at?: string
          effective_date?: string | null
          file_name: string
          file_url: string
          id?: string
          lead_id?: string | null
          lender_name?: string | null
          mime_type: string
          notes?: string | null
          size_bytes: number
          status?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by: string
          version_tag?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string | null
          file_name?: string
          file_url?: string
          id?: string
          lead_id?: string | null
          lender_name?: string | null
          mime_type?: string
          notes?: string | null
          size_bytes?: number
          status?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_campaign_sends: {
        Row: {
          campaign_id: string
          contact_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["send_status"] | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"] | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          from_sender_id: string
          id: string
          list_id: string
          name: string
          preview_text: string | null
          scheduled_at: string | null
          segment_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id: string
          totals_json: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          from_sender_id: string
          id?: string
          list_id: string
          name: string
          preview_text?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id: string
          totals_json?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          from_sender_id?: string
          id?: string
          list_id?: string
          name?: string
          preview_text?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject?: string
          template_id?: string
          totals_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_from_sender_id_fkey"
            columns: ["from_sender_id"]
            isOneToOne: false
            referencedRelation: "email_senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "email_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contacts: {
        Row: {
          city: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          object_id: string | null
          object_type: string | null
          phone: string | null
          state: string | null
          tags: string[] | null
          unsubscribed: boolean | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          object_id?: string | null
          object_type?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          unsubscribed?: boolean | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          object_id?: string | null
          object_type?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          unsubscribed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          campaign_id: string
          contact_id: string
          id: string
          meta: Json | null
          occurred_at: string
          type: Database["public"]["Enums"]["email_event_type"]
        }
        Insert: {
          campaign_id: string
          contact_id: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          type: Database["public"]["Enums"]["email_event_type"]
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          type?: Database["public"]["Enums"]["email_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_list_memberships: {
        Row: {
          contact_id: string
          id: string
          list_id: string
          source: string | null
          subscribed: boolean | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          contact_id: string
          id?: string
          list_id: string
          source?: string | null
          subscribed?: boolean | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          contact_id?: string
          id?: string
          list_id?: string
          source?: string | null
          subscribed?: boolean | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          created_at: string
          delivery_status: string | null
          direction: Database["public"]["Enums"]["log_direction"]
          error_details: string | null
          from_email: string
          id: string
          lead_id: string
          opened_at: string | null
          provider_message_id: string | null
          snippet: string | null
          subject: string
          timestamp: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string | null
          direction: Database["public"]["Enums"]["log_direction"]
          error_details?: string | null
          from_email: string
          id?: string
          lead_id: string
          opened_at?: string | null
          provider_message_id?: string | null
          snippet?: string | null
          subject: string
          timestamp?: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string | null
          direction?: Database["public"]["Enums"]["log_direction"]
          error_details?: string | null
          from_email?: string
          id?: string
          lead_id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          snippet?: string | null
          subject?: string
          timestamp?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_segments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rules_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rules_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_senders: {
        Row: {
          created_at: string
          dkim_status: string | null
          domain: string
          from_email: string
          from_name: string
          id: string
          is_default: boolean | null
          spf_status: string | null
          tracking_domain: string | null
        }
        Insert: {
          created_at?: string
          dkim_status?: string | null
          domain: string
          from_email: string
          from_name: string
          id?: string
          is_default?: boolean | null
          spf_status?: string | null
          tracking_domain?: string | null
        }
        Update: {
          created_at?: string
          dkim_status?: string | null
          domain?: string
          from_email?: string
          from_name?: string
          id?: string
          is_default?: boolean | null
          spf_status?: string | null
          tracking_domain?: string | null
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html: string
          id: string
          is_archived: boolean | null
          json_blocks: Json | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          html: string
          id?: string
          is_archived?: boolean | null
          json_blocks?: Json | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          is_archived?: boolean | null
          json_blocks?: Json | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      income_audit_events: {
        Row: {
          actor_id: string | null
          calculation_id: string | null
          created_at: string
          document_id: string | null
          id: string
          payload: Json | null
          step: Database["public"]["Enums"]["audit_step"]
        }
        Insert: {
          actor_id?: string | null
          calculation_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          payload?: Json | null
          step: Database["public"]["Enums"]["audit_step"]
        }
        Update: {
          actor_id?: string | null
          calculation_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          payload?: Json | null
          step?: Database["public"]["Enums"]["audit_step"]
        }
        Relationships: [
          {
            foreignKeyName: "income_audit_events_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "income_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_audit_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "income_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      income_calculations: {
        Row: {
          agency: Database["public"]["Enums"]["agency_type"]
          borrower_id: string
          calc_date: string
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          inputs_version: string | null
          overrides: Json | null
          result_monthly_income: number | null
          updated_at: string
          warnings: Json | null
        }
        Insert: {
          agency: Database["public"]["Enums"]["agency_type"]
          borrower_id: string
          calc_date?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs_version?: string | null
          overrides?: Json | null
          result_monthly_income?: number | null
          updated_at?: string
          warnings?: Json | null
        }
        Update: {
          agency?: Database["public"]["Enums"]["agency_type"]
          borrower_id?: string
          calc_date?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs_version?: string | null
          overrides?: Json | null
          result_monthly_income?: number | null
          updated_at?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "income_calculations_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      income_components: {
        Row: {
          calculation_id: string
          calculation_method: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          id: string
          monthly_amount: number
          months_considered: number | null
          notes: string | null
          source_documents: Json | null
        }
        Insert: {
          calculation_id: string
          calculation_method?: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          monthly_amount: number
          months_considered?: number | null
          notes?: string | null
          source_documents?: Json | null
        }
        Update: {
          calculation_id?: string
          calculation_method?: string | null
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          monthly_amount?: number
          months_considered?: number | null
          notes?: string | null
          source_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "income_components_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "income_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      income_documents: {
        Row: {
          borrower_id: string
          created_at: string
          created_by: string | null
          doc_period_end: string | null
          doc_period_start: string | null
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_name: string
          file_size_bytes: number
          id: string
          mime_type: string
          ocr_status: Database["public"]["Enums"]["ocr_status"]
          page_count: number | null
          parse_confidence: number | null
          parsed_json: Json | null
          storage_path: string
          updated_at: string
          ytd_flag: boolean | null
        }
        Insert: {
          borrower_id: string
          created_at?: string
          created_by?: string | null
          doc_period_end?: string | null
          doc_period_start?: string | null
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_name: string
          file_size_bytes: number
          id?: string
          mime_type: string
          ocr_status?: Database["public"]["Enums"]["ocr_status"]
          page_count?: number | null
          parse_confidence?: number | null
          parsed_json?: Json | null
          storage_path: string
          updated_at?: string
          ytd_flag?: boolean | null
        }
        Update: {
          borrower_id?: string
          created_at?: string
          created_by?: string | null
          doc_period_end?: string | null
          doc_period_start?: string | null
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_name?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          ocr_status?: Database["public"]["Enums"]["ocr_status"]
          page_count?: number | null
          parse_confidence?: number | null
          parsed_json?: Json | null
          storage_path?: string
          updated_at?: string
          ytd_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "income_documents_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          document_id: string
          embeddings_created: number | null
          error_message: string | null
          id: string
          pages_processed: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["ingestion_status"] | null
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          document_id: string
          embeddings_created?: number | null
          error_message?: string | null
          id?: string
          pages_processed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ingestion_status"] | null
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          document_id?: string
          embeddings_created?: number | null
          error_message?: string | null
          id?: string
          pages_processed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ingestion_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_condition_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          condition_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          condition_id: string
          created_at?: string
          id?: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          condition_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_condition_status_history_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "lead_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_conditions: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          condition_type: string
          created_at: string | null
          created_by: string | null
          description: string
          document_id: string | null
          due_date: string | null
          id: string
          lead_id: string
          notes: string | null
          priority: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          condition_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          document_id?: string | null
          due_date?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          priority?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          condition_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          document_id?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_conditions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conditions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conditions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conditions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string
          active_at: string | null
          app_complete_at: string | null
          appr_date_time: string | null
          appr_eta: string | null
          appraisal_file: string | null
          appraisal_notes: string | null
          appraisal_ordered_date: string | null
          appraisal_scheduled_date: string | null
          appraisal_status:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          appraisal_value: string | null
          approved_lender_id: string | null
          arrive_loan_number: number | null
          assets: number | null
          ba_status: Database["public"]["Enums"]["ba_status"] | null
          borrower_current_address: string | null
          buyer_agent_id: string | null
          cash_to_close: number | null
          cash_to_close_goal: number | null
          cd_status: Database["public"]["Enums"]["cd_status"] | null
          close_date: string | null
          closed_at: string | null
          closing_costs: number | null
          condo_approval_type: string | null
          condo_docs_file: string | null
          condo_eta: string | null
          condo_id: string | null
          condo_name: string | null
          condo_notes: string | null
          condo_ordered_date: string | null
          condo_status: Database["public"]["Enums"]["condo_status"] | null
          contract_file: string | null
          converted: Database["public"]["Enums"]["converted_status"] | null
          created_at: string
          created_by: string
          ctc_at: string | null
          disc_file: string | null
          disclosure_status:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          dob: string | null
          down_pmt: string | null
          dti: number | null
          email: string | null
          epo_status: Database["public"]["Enums"]["epo_status"] | null
          escrows: string | null
          fcp_file: string | null
          fico_score: number | null
          fin_cont: string | null
          first_name: string
          follow_up_count: number | null
          hoa_dues: number | null
          hoi_status: Database["public"]["Enums"]["hoi_status"] | null
          homeowners_insurance: number | null
          icd_file: string | null
          id: string
          income_type: string | null
          initial_approval_file: string | null
          insurance_file: string | null
          insurance_inspection_file: string | null
          insurance_notes: string | null
          insurance_ordered_date: string | null
          insurance_policy_file: string | null
          insurance_quoted_date: string | null
          insurance_received_date: string | null
          interest_rate: number | null
          is_closed: boolean | null
          last_follow_up_date: string | null
          last_name: string
          latest_file_updates: string | null
          latest_file_updates_updated_at: string | null
          latest_file_updates_updated_by: string | null
          lead_on_date: string
          lead_strength: Database["public"]["Enums"]["lead_strength"] | null
          lender_id: string | null
          lender_loan_number: string | null
          les_file: string | null
          likely_to_apply: string | null
          listing_agent_id: string | null
          loan_amount: number | null
          loan_status: Database["public"]["Enums"]["loan_status"] | null
          loan_type: string | null
          lock_expiration_date: string | null
          marital_status: string | null
          mi_status: string | null
          middle_name: string | null
          military_veteran: boolean | null
          monthly_liabilities: number | null
          monthly_pmt_goal: number | null
          mortgage_insurance: number | null
          notes: string | null
          notes_updated_at: string | null
          notes_updated_by: string | null
          occupancy: string | null
          own_rent_current_address: string | null
          package_status: Database["public"]["Enums"]["package_status"] | null
          pending_app_at: string | null
          phone: string | null
          pipeline_section: string | null
          pipeline_stage_id: string | null
          piti: number | null
          pr_type: Database["public"]["Enums"]["pr_type"] | null
          pre_approved_at: string | null
          pre_qualified_at: string | null
          principal_interest: number | null
          priority: string | null
          program: string | null
          property_taxes: number | null
          property_type: string | null
          referral_source: Database["public"]["Enums"]["referral_source"] | null
          referred_via: Database["public"]["Enums"]["referred_via"] | null
          reo: boolean | null
          residency_type: string | null
          sales_price: number | null
          search_stage: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          ssn: string | null
          status: Database["public"]["Enums"]["lead_status"]
          subject_address_1: string | null
          subject_address_2: string | null
          subject_city: string | null
          subject_state: string | null
          subject_zip: string | null
          submitted_at: string | null
          task_eta: string | null
          teammate_assigned: string | null
          term: number | null
          title_eta: string | null
          title_file: string | null
          title_notes: string | null
          title_ordered_date: string | null
          title_status: Database["public"]["Enums"]["title_status"] | null
          total_monthly_income: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          active_at?: string | null
          app_complete_at?: string | null
          appr_date_time?: string | null
          appr_eta?: string | null
          appraisal_file?: string | null
          appraisal_notes?: string | null
          appraisal_ordered_date?: string | null
          appraisal_scheduled_date?: string | null
          appraisal_status?:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          appraisal_value?: string | null
          approved_lender_id?: string | null
          arrive_loan_number?: number | null
          assets?: number | null
          ba_status?: Database["public"]["Enums"]["ba_status"] | null
          borrower_current_address?: string | null
          buyer_agent_id?: string | null
          cash_to_close?: number | null
          cash_to_close_goal?: number | null
          cd_status?: Database["public"]["Enums"]["cd_status"] | null
          close_date?: string | null
          closed_at?: string | null
          closing_costs?: number | null
          condo_approval_type?: string | null
          condo_docs_file?: string | null
          condo_eta?: string | null
          condo_id?: string | null
          condo_name?: string | null
          condo_notes?: string | null
          condo_ordered_date?: string | null
          condo_status?: Database["public"]["Enums"]["condo_status"] | null
          contract_file?: string | null
          converted?: Database["public"]["Enums"]["converted_status"] | null
          created_at?: string
          created_by: string
          ctc_at?: string | null
          disc_file?: string | null
          disclosure_status?:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          dob?: string | null
          down_pmt?: string | null
          dti?: number | null
          email?: string | null
          epo_status?: Database["public"]["Enums"]["epo_status"] | null
          escrows?: string | null
          fcp_file?: string | null
          fico_score?: number | null
          fin_cont?: string | null
          first_name: string
          follow_up_count?: number | null
          hoa_dues?: number | null
          hoi_status?: Database["public"]["Enums"]["hoi_status"] | null
          homeowners_insurance?: number | null
          icd_file?: string | null
          id?: string
          income_type?: string | null
          initial_approval_file?: string | null
          insurance_file?: string | null
          insurance_inspection_file?: string | null
          insurance_notes?: string | null
          insurance_ordered_date?: string | null
          insurance_policy_file?: string | null
          insurance_quoted_date?: string | null
          insurance_received_date?: string | null
          interest_rate?: number | null
          is_closed?: boolean | null
          last_follow_up_date?: string | null
          last_name: string
          latest_file_updates?: string | null
          latest_file_updates_updated_at?: string | null
          latest_file_updates_updated_by?: string | null
          lead_on_date?: string
          lead_strength?: Database["public"]["Enums"]["lead_strength"] | null
          lender_id?: string | null
          lender_loan_number?: string | null
          les_file?: string | null
          likely_to_apply?: string | null
          listing_agent_id?: string | null
          loan_amount?: number | null
          loan_status?: Database["public"]["Enums"]["loan_status"] | null
          loan_type?: string | null
          lock_expiration_date?: string | null
          marital_status?: string | null
          mi_status?: string | null
          middle_name?: string | null
          military_veteran?: boolean | null
          monthly_liabilities?: number | null
          monthly_pmt_goal?: number | null
          mortgage_insurance?: number | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          occupancy?: string | null
          own_rent_current_address?: string | null
          package_status?: Database["public"]["Enums"]["package_status"] | null
          pending_app_at?: string | null
          phone?: string | null
          pipeline_section?: string | null
          pipeline_stage_id?: string | null
          piti?: number | null
          pr_type?: Database["public"]["Enums"]["pr_type"] | null
          pre_approved_at?: string | null
          pre_qualified_at?: string | null
          principal_interest?: number | null
          priority?: string | null
          program?: string | null
          property_taxes?: number | null
          property_type?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referred_via?: Database["public"]["Enums"]["referred_via"] | null
          reo?: boolean | null
          residency_type?: string | null
          sales_price?: number | null
          search_stage?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          ssn?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject_address_1?: string | null
          subject_address_2?: string | null
          subject_city?: string | null
          subject_state?: string | null
          subject_zip?: string | null
          submitted_at?: string | null
          task_eta?: string | null
          teammate_assigned?: string | null
          term?: number | null
          title_eta?: string | null
          title_file?: string | null
          title_notes?: string | null
          title_ordered_date?: string | null
          title_status?: Database["public"]["Enums"]["title_status"] | null
          total_monthly_income?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          active_at?: string | null
          app_complete_at?: string | null
          appr_date_time?: string | null
          appr_eta?: string | null
          appraisal_file?: string | null
          appraisal_notes?: string | null
          appraisal_ordered_date?: string | null
          appraisal_scheduled_date?: string | null
          appraisal_status?:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          appraisal_value?: string | null
          approved_lender_id?: string | null
          arrive_loan_number?: number | null
          assets?: number | null
          ba_status?: Database["public"]["Enums"]["ba_status"] | null
          borrower_current_address?: string | null
          buyer_agent_id?: string | null
          cash_to_close?: number | null
          cash_to_close_goal?: number | null
          cd_status?: Database["public"]["Enums"]["cd_status"] | null
          close_date?: string | null
          closed_at?: string | null
          closing_costs?: number | null
          condo_approval_type?: string | null
          condo_docs_file?: string | null
          condo_eta?: string | null
          condo_id?: string | null
          condo_name?: string | null
          condo_notes?: string | null
          condo_ordered_date?: string | null
          condo_status?: Database["public"]["Enums"]["condo_status"] | null
          contract_file?: string | null
          converted?: Database["public"]["Enums"]["converted_status"] | null
          created_at?: string
          created_by?: string
          ctc_at?: string | null
          disc_file?: string | null
          disclosure_status?:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          dob?: string | null
          down_pmt?: string | null
          dti?: number | null
          email?: string | null
          epo_status?: Database["public"]["Enums"]["epo_status"] | null
          escrows?: string | null
          fcp_file?: string | null
          fico_score?: number | null
          fin_cont?: string | null
          first_name?: string
          follow_up_count?: number | null
          hoa_dues?: number | null
          hoi_status?: Database["public"]["Enums"]["hoi_status"] | null
          homeowners_insurance?: number | null
          icd_file?: string | null
          id?: string
          income_type?: string | null
          initial_approval_file?: string | null
          insurance_file?: string | null
          insurance_inspection_file?: string | null
          insurance_notes?: string | null
          insurance_ordered_date?: string | null
          insurance_policy_file?: string | null
          insurance_quoted_date?: string | null
          insurance_received_date?: string | null
          interest_rate?: number | null
          is_closed?: boolean | null
          last_follow_up_date?: string | null
          last_name?: string
          latest_file_updates?: string | null
          latest_file_updates_updated_at?: string | null
          latest_file_updates_updated_by?: string | null
          lead_on_date?: string
          lead_strength?: Database["public"]["Enums"]["lead_strength"] | null
          lender_id?: string | null
          lender_loan_number?: string | null
          les_file?: string | null
          likely_to_apply?: string | null
          listing_agent_id?: string | null
          loan_amount?: number | null
          loan_status?: Database["public"]["Enums"]["loan_status"] | null
          loan_type?: string | null
          lock_expiration_date?: string | null
          marital_status?: string | null
          mi_status?: string | null
          middle_name?: string | null
          military_veteran?: boolean | null
          monthly_liabilities?: number | null
          monthly_pmt_goal?: number | null
          mortgage_insurance?: number | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          occupancy?: string | null
          own_rent_current_address?: string | null
          package_status?: Database["public"]["Enums"]["package_status"] | null
          pending_app_at?: string | null
          phone?: string | null
          pipeline_section?: string | null
          pipeline_stage_id?: string | null
          piti?: number | null
          pr_type?: Database["public"]["Enums"]["pr_type"] | null
          pre_approved_at?: string | null
          pre_qualified_at?: string | null
          principal_interest?: number | null
          priority?: string | null
          program?: string | null
          property_taxes?: number | null
          property_type?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referred_via?: Database["public"]["Enums"]["referred_via"] | null
          reo?: boolean | null
          residency_type?: string | null
          sales_price?: number | null
          search_stage?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          ssn?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject_address_1?: string | null
          subject_address_2?: string | null
          subject_city?: string | null
          subject_state?: string | null
          subject_zip?: string | null
          submitted_at?: string | null
          task_eta?: string | null
          teammate_assigned?: string | null
          term?: number | null
          title_eta?: string | null
          title_file?: string | null
          title_notes?: string | null
          title_ordered_date?: string | null
          title_status?: Database["public"]["Enums"]["title_status"] | null
          total_monthly_income?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_approved_lender"
            columns: ["approved_lender_id"]
            isOneToOne: false
            referencedRelation: "lenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_lender"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_listing_agent"
            columns: ["listing_agent_id"]
            isOneToOne: false
            referencedRelation: "buyer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_teammate_assigned"
            columns: ["teammate_assigned"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_buyer_agent_id_fkey"
            columns: ["buyer_agent_id"]
            isOneToOne: false
            referencedRelation: "buyer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_condo_id_fkey"
            columns: ["condo_id"]
            isOneToOne: false
            referencedRelation: "condos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_latest_file_updates_updated_by_fkey"
            columns: ["latest_file_updates_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_notes_updated_by_fkey"
            columns: ["notes_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_teammate_assigned_fkey"
            columns: ["teammate_assigned"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lender_partnerships: {
        Row: {
          competitive_advantages: string[] | null
          created_at: string | null
          customer_rating: number | null
          display_name: string
          display_order: number | null
          geographic_coverage: string[] | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          name: string
          partnership_level: string | null
          review_count: number | null
          specializations: string[] | null
          supported_loan_types: string[] | null
          trust_badges: string[] | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          competitive_advantages?: string[] | null
          created_at?: string | null
          customer_rating?: number | null
          display_name: string
          display_order?: number | null
          geographic_coverage?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          partnership_level?: string | null
          review_count?: number | null
          specializations?: string[] | null
          supported_loan_types?: string[] | null
          trust_badges?: string[] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          competitive_advantages?: string[] | null
          created_at?: string | null
          customer_rating?: number | null
          display_name?: string
          display_order?: number | null
          geographic_coverage?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          partnership_level?: string | null
          review_count?: number | null
          specializations?: string[] | null
          supported_loan_types?: string[] | null
          trust_badges?: string[] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      lenders: {
        Row: {
          account_executive: string | null
          account_executive_email: string | null
          account_executive_phone: string | null
          broker_portal_url: string | null
          created_at: string
          id: string
          lender_name: string
          lender_type: Database["public"]["Enums"]["lender_type"]
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          account_executive?: string | null
          account_executive_email?: string | null
          account_executive_phone?: string | null
          broker_portal_url?: string | null
          created_at?: string
          id?: string
          lender_name: string
          lender_type?: Database["public"]["Enums"]["lender_type"]
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_executive?: string | null
          account_executive_email?: string | null
          account_executive_phone?: string | null
          broker_portal_url?: string | null
          created_at?: string
          id?: string
          lender_name?: string
          lender_type?: Database["public"]["Enums"]["lender_type"]
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order_index: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      pipeline_views: {
        Row: {
          column_order: Json
          column_widths: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          pipeline_type: string
          updated_at: string | null
        }
        Insert: {
          column_order?: Json
          column_widths?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          pipeline_type: string
          updated_at?: string | null
        }
        Update: {
          column_order?: Json
          column_widths?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          pipeline_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      podcast_analytics: {
        Row: {
          episode_id: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          referrer: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          user_session: string | null
        }
        Insert: {
          episode_id: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          referrer?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_session?: string | null
        }
        Update: {
          episode_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          referrer?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_session?: string | null
        }
        Relationships: []
      }
      pricing_artifacts: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          provider_id: string
          storage_path: string
          type: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          provider_id: string
          storage_path: string
          type: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          provider_id?: string
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_artifacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pricing_run_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_credentials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mfa_type: string | null
          provider: string
          secret_ref: string
          totp_secret_ref: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mfa_type?: string | null
          provider: string
          secret_ref: string
          totp_secret_ref?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mfa_type?: string | null
          provider?: string
          secret_ref?: string
          totp_secret_ref?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      pricing_offers: {
        Row: {
          apr: number | null
          assumptions: Json | null
          cash_to_close_delta: number | null
          created_at: string
          eligibility_flags: Json | null
          id: string
          lender: string
          lock_days: number
          normalized_json: Json
          payment_est: number | null
          points: number
          price: number
          program_name: string
          provider_id: string
          rank: number | null
          rate: number
        }
        Insert: {
          apr?: number | null
          assumptions?: Json | null
          cash_to_close_delta?: number | null
          created_at?: string
          eligibility_flags?: Json | null
          id?: string
          lender: string
          lock_days: number
          normalized_json?: Json
          payment_est?: number | null
          points?: number
          price: number
          program_name: string
          provider_id: string
          rank?: number | null
          rate: number
        }
        Update: {
          apr?: number | null
          assumptions?: Json | null
          cash_to_close_delta?: number | null
          created_at?: string
          eligibility_flags?: Json | null
          id?: string
          lender?: string
          lock_days?: number
          normalized_json?: Json
          payment_est?: number | null
          points?: number
          price?: number
          program_name?: string
          provider_id?: string
          rank?: number | null
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pricing_run_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_run_providers: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          provider: string
          run_id: string
          started_at: string | null
          status: string
          warnings: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          provider: string
          run_id: string
          started_at?: string | null
          status?: string
          warnings?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          provider?: string
          run_id?: string
          started_at?: string | null
          status?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_run_providers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pricing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_runs: {
        Row: {
          button_scan_results: Json | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          debug_html_snapshots: Json | null
          debug_logs: string[] | null
          debug_mode: boolean | null
          debug_screenshots: Json | null
          error_message: string | null
          id: string
          lead_id: string | null
          results_json: Json | null
          retry_count: number | null
          scenario_json: Json
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          button_scan_results?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          debug_html_snapshots?: Json | null
          debug_logs?: string[] | null
          debug_mode?: boolean | null
          debug_screenshots?: Json | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          results_json?: Json | null
          retry_count?: number | null
          scenario_json?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          button_scan_results?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          debug_html_snapshots?: Json | null
          debug_logs?: string[] | null
          debug_mode?: boolean | null
          debug_screenshots?: Json | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          results_json?: Json | null
          retry_count?: number | null
          scenario_json?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_valuations: {
        Row: {
          cached_until: string | null
          confidence: number | null
          estimate: number | null
          high: number | null
          id: string
          low: number | null
          provider_payload: Json | null
          request_id: string
        }
        Insert: {
          cached_until?: string | null
          confidence?: number | null
          estimate?: number | null
          high?: number | null
          id?: string
          low?: number | null
          provider_payload?: Json | null
          request_id: string
        }
        Update: {
          cached_until?: string | null
          confidence?: number | null
          estimate?: number | null
          high?: number | null
          id?: string
          low?: number | null
          provider_payload?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_valuations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "valuation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_configs: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualification_scenarios: {
        Row: {
          created_at: string | null
          employment_types: string[] | null
          first_time_buyer_only: boolean | null
          geographic_restrictions: Json | null
          id: string
          income_documentation_required: string[] | null
          is_active: boolean | null
          max_credit_score: number | null
          max_debt_to_income_percent: number | null
          min_credit_score: number | null
          min_down_payment_percent: number | null
          min_income_amount: number | null
          occupancy_types: string[] | null
          program_id: string
          property_types: string[] | null
          qualification_probability_weight: number | null
          scenario_name: string
          special_programs: string[] | null
        }
        Insert: {
          created_at?: string | null
          employment_types?: string[] | null
          first_time_buyer_only?: boolean | null
          geographic_restrictions?: Json | null
          id?: string
          income_documentation_required?: string[] | null
          is_active?: boolean | null
          max_credit_score?: number | null
          max_debt_to_income_percent?: number | null
          min_credit_score?: number | null
          min_down_payment_percent?: number | null
          min_income_amount?: number | null
          occupancy_types?: string[] | null
          program_id: string
          property_types?: string[] | null
          qualification_probability_weight?: number | null
          scenario_name: string
          special_programs?: string[] | null
        }
        Update: {
          created_at?: string | null
          employment_types?: string[] | null
          first_time_buyer_only?: boolean | null
          geographic_restrictions?: Json | null
          id?: string
          income_documentation_required?: string[] | null
          is_active?: boolean | null
          max_credit_score?: number | null
          max_debt_to_income_percent?: number | null
          min_credit_score?: number | null
          min_down_payment_percent?: number | null
          min_income_amount?: number | null
          occupancy_types?: string[] | null
          program_id?: string
          property_types?: string[] | null
          qualification_probability_weight?: number | null
          scenario_name?: string
          special_programs?: string[] | null
        }
        Relationships: []
      }
      queries: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          question: string
          status: Database["public"]["Enums"]["query_status"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          question: string
          status?: Database["public"]["Enums"]["query_status"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          question?: string
          status?: Database["public"]["Enums"]["query_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_profiles: {
        Row: {
          base_rate: number
          created_at: string
          effective_date: string
          fico_max: number
          fico_min: number
          id: string
          is_active: boolean
          ltv_max: number
          ltv_min: number
          name: string
          points: number | null
          product: Database["public"]["Enums"]["loan_product"]
          term_months: number
          updated_at: string
        }
        Insert: {
          base_rate: number
          created_at?: string
          effective_date?: string
          fico_max?: number
          fico_min?: number
          id?: string
          is_active?: boolean
          ltv_max?: number
          ltv_min?: number
          name: string
          points?: number | null
          product: Database["public"]["Enums"]["loan_product"]
          term_months: number
          updated_at?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          effective_date?: string
          fico_max?: number
          fico_min?: number
          id?: string
          is_active?: boolean
          ltv_max?: number
          ltv_min?: number
          name?: string
          points?: number | null
          product?: Database["public"]["Enums"]["loan_product"]
          term_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          slug: string
          url: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          slug: string
          url: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          slug?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          body: string
          created_at: string
          direction: Database["public"]["Enums"]["log_direction"]
          from_number: string
          id: string
          lead_id: string
          timestamp: string
          to_number: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          direction: Database["public"]["Enums"]["log_direction"]
          from_number: string
          id?: string
          lead_id: string
          timestamp?: string
          to_number: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["log_direction"]
          from_number?: string
          id?: string
          lead_id?: string
          timestamp?: string
          to_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage_id: string | null
          id: string
          lead_id: string
          notes: string | null
          to_stage_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      task_automation_executions: {
        Row: {
          automation_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          success: boolean | null
          task_id: string | null
        }
        Insert: {
          automation_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          success?: boolean | null
          task_id?: string | null
        }
        Update: {
          automation_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          success?: boolean | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "task_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_automation_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_automations: {
        Row: {
          assigned_to_user_id: string | null
          category: string | null
          completion_requirement_config: Json | null
          completion_requirement_type: string | null
          created_at: string | null
          created_by: string | null
          due_date_offset_days: number | null
          id: string
          is_active: boolean | null
          last_scheduled_execution: string | null
          name: string
          subcategory: string | null
          task_description: string
          task_name: string
          task_priority: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          category?: string | null
          completion_requirement_config?: Json | null
          completion_requirement_type?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date_offset_days?: number | null
          id?: string
          is_active?: boolean | null
          last_scheduled_execution?: string | null
          name: string
          subcategory?: string | null
          task_description: string
          task_name: string
          task_priority?: string | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          category?: string | null
          completion_requirement_config?: Json | null
          completion_requirement_type?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date_offset_days?: number | null
          id?: string
          is_active?: boolean | null
          last_scheduled_execution?: string | null
          name?: string
          subcategory?: string | null
          task_description?: string
          task_name?: string
          task_priority?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_automations_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          borrower_id: string | null
          completion_requirement_type: string | null
          created_at: string
          created_by: string | null
          creation_log: Json | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_order: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          borrower_id?: string | null
          completion_requirement_type?: string | null
          created_at?: string
          created_by?: string | null
          creation_log?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          borrower_id?: string | null
          completion_requirement_type?: string | null
          created_at?: string
          created_by?: string | null
          creation_log?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_loan_interests: {
        Row: {
          calculators_used: string[] | null
          comparison_count: number | null
          created_at: string | null
          credit_score_range: string | null
          down_payment_range: string | null
          filters_applied: Json | null
          first_time_buyer: boolean | null
          id: string
          last_activity: string | null
          loan_purpose: string | null
          occupancy_type: string | null
          programs_viewed: string[] | null
          property_type: string | null
          scroll_depth_percent: number | null
          search_queries: string[] | null
          session_id: string
          time_on_page: number | null
          user_id: string | null
        }
        Insert: {
          calculators_used?: string[] | null
          comparison_count?: number | null
          created_at?: string | null
          credit_score_range?: string | null
          down_payment_range?: string | null
          filters_applied?: Json | null
          first_time_buyer?: boolean | null
          id?: string
          last_activity?: string | null
          loan_purpose?: string | null
          occupancy_type?: string | null
          programs_viewed?: string[] | null
          property_type?: string | null
          scroll_depth_percent?: number | null
          search_queries?: string[] | null
          session_id: string
          time_on_page?: number | null
          user_id?: string | null
        }
        Update: {
          calculators_used?: string[] | null
          comparison_count?: number | null
          created_at?: string | null
          credit_score_range?: string | null
          down_payment_range?: string | null
          filters_applied?: Json | null
          first_time_buyer?: boolean | null
          id?: string
          last_activity?: string | null
          loan_purpose?: string | null
          occupancy_type?: string | null
          programs_viewed?: string[] | null
          property_type?: string | null
          scroll_depth_percent?: number | null
          search_queries?: string[] | null
          session_id?: string
          time_on_page?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          is_assignable: boolean | null
          last_login_at: string | null
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          is_assignable?: boolean | null
          last_login_at?: string | null
          last_name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          is_assignable?: boolean | null
          last_login_at?: string | null
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      valuation_comparables: {
        Row: {
          address: string
          baths: number | null
          beds: number | null
          distance_miles: number | null
          id: string
          lot_sqft: number | null
          photo_url: string | null
          sale_date: string | null
          sale_price: number | null
          sqft: number | null
          valuation_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          baths?: number | null
          beds?: number | null
          distance_miles?: number | null
          id?: string
          lot_sqft?: number | null
          photo_url?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
          valuation_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          baths?: number | null
          beds?: number | null
          distance_miles?: number | null
          id?: string
          lot_sqft?: number | null
          photo_url?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
          valuation_id?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "valuation_comparables_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "property_valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_requests: {
        Row: {
          address: string
          baths: number | null
          beds: number | null
          city: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          mode: string
          provider_primary: string | null
          provider_used: string | null
          requester_type: string
          sqft: number | null
          state: string | null
          status: string
          unit: string | null
          zip: string | null
        }
        Insert: {
          address: string
          baths?: number | null
          beds?: number | null
          city?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          mode: string
          provider_primary?: string | null
          provider_used?: string | null
          requester_type: string
          sqft?: number | null
          state?: string | null
          status: string
          unit?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          baths?: number | null
          beds?: number | null
          city?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          mode?: string
          provider_primary?: string | null
          provider_used?: string | null
          requester_type?: string
          sqft?: number | null
          state?: string | null
          status?: string
          unit?: string | null
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_qualification_probability: {
        Args: {
          credit_score: number
          debt_to_income_percent: number
          down_payment_percent: number
          occupancy_type?: string
          program_slug: string
          property_type?: string
        }
        Returns: number
      }
      dashboard_activity: {
        Args: { _from: string; _to: string }
        Returns: {
          action: string
          category: string
          cnt: number
        }[]
      }
      dashboard_activity_latest: {
        Args: { _category: string; _from: string; _to: string }
        Returns: {
          action: string
          changed_at: string
          item_id: string
          table_name: string
        }[]
      }
      dashboard_conversions: {
        Args: { _from: string; _to: string }
        Returns: {
          conversion_pct: number
          converted: number
          dead: number
          nurtured: number
          stage: string
          total: number
        }[]
      }
      execute_date_based_automations: { Args: never; Returns: Json }
      execute_scheduled_automations: { Args: never; Returns: Json }
      format_date_modern: { Args: { input_date: string }; Returns: string }
      get_user_account_id: { Args: { user_uuid: string }; Returns: string }
      search_blog_posts: {
        Args: { search_query: string }
        Returns: {
          author_id: string
          body_mdx: string | null
          canonical_url: string | null
          category: Database["public"]["Enums"]["blog_category"]
          cover_url: string | null
          created_at: string
          dek: string | null
          engagement_score: number | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          og_image_url: string | null
          published_at: string | null
          read_time_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "blog_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      simple_search_chunks: {
        Args: { match_limit?: number; query_text: string }
        Returns: {
          chunk_id: string
          content: string
          document_name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      agency_type: "fannie" | "freddie" | "fha" | "va" | "usda" | "nonqm"
      appraisal_status:
        | "Ordered"
        | "Scheduled"
        | "Inspected"
        | "Received"
        | "Waiver"
      approval_source_type: "PennyMac" | "A&D" | "UWM"
      approval_type_type: "Full" | "Limited" | "Non-QM" | "Hard Money"
      audit_step:
        | "upload"
        | "ocr"
        | "classify"
        | "parse"
        | "validate"
        | "calculate"
        | "export"
      ba_status: "Send" | "Sent" | "Signed"
      blog_category:
        | "guides"
        | "market-updates"
        | "loan-programs"
        | "miami-condo-101"
        | "success-stories"
        | "company-news"
      blog_status: "draft" | "scheduled" | "published" | "archived"
      call_outcome: "No Answer" | "Left VM" | "Connected"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "paused"
        | "sent"
        | "failed"
      cd_status: "Requested" | "Sent" | "Signed"
      change_action: "insert" | "update" | "delete"
      component_type:
        | "base_hourly"
        | "base_salary"
        | "overtime"
        | "bonus"
        | "commission"
        | "self_employed"
        | "rental"
        | "other"
      condo_status: "Ordered" | "Received" | "Approved"
      contact_type:
        | "Agent"
        | "Realtor"
        | "Borrower"
        | "Other"
        | "Real Estate Agent"
        | "Prospect"
        | "Third Party"
      converted_status:
        | "Working on it"
        | "Pending App"
        | "Nurture"
        | "Dead"
        | "Needs Attention"
        | "Converted"
        | "App Complete"
        | "Standby"
        | "DNA"
        | "Just Applied"
        | "Screening"
        | "Pre-Qualified"
        | "Pre-Approved"
        | "New"
        | "Shopping"
        | "Offers Out"
        | "Under Contract"
        | "Long-Term"
        | "Ready for Pre-Approval"
        | "Incoming"
        | "Long Term"
        | "Closed"
        | "Need Support"
        | "New Lead"
      disclosure_status: "Ordered" | "Sent" | "Signed" | "Need Signature"
      doc_type:
        | "pay_stub"
        | "w2"
        | "form_1099"
        | "form_1040"
        | "schedule_c"
        | "schedule_e"
        | "schedule_f"
        | "k1"
        | "form_1065"
        | "form_1120s"
        | "voe"
      document_status: "pending" | "processing" | "completed" | "failed"
      email_event_type:
        | "open"
        | "click"
        | "bounce"
        | "spam"
        | "unsubscribe"
        | "delivered"
      epo_status: "Send" | "Sent" | "Signed"
      hoi_status: "Quoted" | "Ordered" | "Received"
      ingestion_status: "pending" | "processing" | "completed" | "failed"
      lead_source:
        | "Website"
        | "Referral"
        | "Cold Call"
        | "Social Media"
        | "Email Campaign"
        | "Walk-in"
        | "Other"
      lead_status:
        | "Working on it"
        | "Pending App"
        | "Nurture"
        | "Dead"
        | "Needs Attention"
      lead_strength: "Hot" | "Warm" | "Cold" | "Qualified"
      lender_type: "Conventional" | "Non-QM" | "Private"
      loan_product: "conv" | "fha" | "va" | "usda"
      loan_status:
        | "NEW"
        | "RFP"
        | "SUV"
        | "AWC"
        | "CTC"
        | "New RFP"
        | "New"
        | "SUB"
      log_direction: "In" | "Out"
      ocr_status: "pending" | "processing" | "success" | "failed"
      package_status: "Initial" | "Final"
      pay_frequency: "weekly" | "biweekly" | "semimonthly" | "monthly"
      pr_type: "P" | "R" | "HELOC"
      query_status: "pending" | "processing" | "completed" | "failed"
      referral_source:
        | "Agent"
        | "New Agent"
        | "Past Client"
        | "Personal"
        | "Social"
        | "Miscellaneous"
      referred_via:
        | "Phone"
        | "Email"
        | "Social"
        | "Personal"
        | "Text"
        | "Call"
        | "Web"
        | "In Person"
      refi_status: "uploaded" | "ocr" | "parsed" | "computed" | "error"
      send_status: "queued" | "sent" | "delivered" | "failed"
      task_priority: "Low" | "Medium" | "High" | "Critical"
      task_status:
        | "To Do"
        | "In Progress"
        | "Done"
        | "Working on it"
        | "Need help"
      title_status: "Requested" | "Received" | "Ordered"
      user_role: "Admin" | "LO" | "LO Assistant" | "Processor" | "ReadOnly"
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
      agency_type: ["fannie", "freddie", "fha", "va", "usda", "nonqm"],
      appraisal_status: [
        "Ordered",
        "Scheduled",
        "Inspected",
        "Received",
        "Waiver",
      ],
      approval_source_type: ["PennyMac", "A&D", "UWM"],
      approval_type_type: ["Full", "Limited", "Non-QM", "Hard Money"],
      audit_step: [
        "upload",
        "ocr",
        "classify",
        "parse",
        "validate",
        "calculate",
        "export",
      ],
      ba_status: ["Send", "Sent", "Signed"],
      blog_category: [
        "guides",
        "market-updates",
        "loan-programs",
        "miami-condo-101",
        "success-stories",
        "company-news",
      ],
      blog_status: ["draft", "scheduled", "published", "archived"],
      call_outcome: ["No Answer", "Left VM", "Connected"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "paused",
        "sent",
        "failed",
      ],
      cd_status: ["Requested", "Sent", "Signed"],
      change_action: ["insert", "update", "delete"],
      component_type: [
        "base_hourly",
        "base_salary",
        "overtime",
        "bonus",
        "commission",
        "self_employed",
        "rental",
        "other",
      ],
      condo_status: ["Ordered", "Received", "Approved"],
      contact_type: [
        "Agent",
        "Realtor",
        "Borrower",
        "Other",
        "Real Estate Agent",
        "Prospect",
        "Third Party",
      ],
      converted_status: [
        "Working on it",
        "Pending App",
        "Nurture",
        "Dead",
        "Needs Attention",
        "Converted",
        "App Complete",
        "Standby",
        "DNA",
        "Just Applied",
        "Screening",
        "Pre-Qualified",
        "Pre-Approved",
        "New",
        "Shopping",
        "Offers Out",
        "Under Contract",
        "Long-Term",
        "Ready for Pre-Approval",
        "Incoming",
        "Long Term",
        "Closed",
        "Need Support",
        "New Lead",
      ],
      disclosure_status: ["Ordered", "Sent", "Signed", "Need Signature"],
      doc_type: [
        "pay_stub",
        "w2",
        "form_1099",
        "form_1040",
        "schedule_c",
        "schedule_e",
        "schedule_f",
        "k1",
        "form_1065",
        "form_1120s",
        "voe",
      ],
      document_status: ["pending", "processing", "completed", "failed"],
      email_event_type: [
        "open",
        "click",
        "bounce",
        "spam",
        "unsubscribe",
        "delivered",
      ],
      epo_status: ["Send", "Sent", "Signed"],
      hoi_status: ["Quoted", "Ordered", "Received"],
      ingestion_status: ["pending", "processing", "completed", "failed"],
      lead_source: [
        "Website",
        "Referral",
        "Cold Call",
        "Social Media",
        "Email Campaign",
        "Walk-in",
        "Other",
      ],
      lead_status: [
        "Working on it",
        "Pending App",
        "Nurture",
        "Dead",
        "Needs Attention",
      ],
      lead_strength: ["Hot", "Warm", "Cold", "Qualified"],
      lender_type: ["Conventional", "Non-QM", "Private"],
      loan_product: ["conv", "fha", "va", "usda"],
      loan_status: ["NEW", "RFP", "SUV", "AWC", "CTC", "New RFP", "New", "SUB"],
      log_direction: ["In", "Out"],
      ocr_status: ["pending", "processing", "success", "failed"],
      package_status: ["Initial", "Final"],
      pay_frequency: ["weekly", "biweekly", "semimonthly", "monthly"],
      pr_type: ["P", "R", "HELOC"],
      query_status: ["pending", "processing", "completed", "failed"],
      referral_source: [
        "Agent",
        "New Agent",
        "Past Client",
        "Personal",
        "Social",
        "Miscellaneous",
      ],
      referred_via: [
        "Phone",
        "Email",
        "Social",
        "Personal",
        "Text",
        "Call",
        "Web",
        "In Person",
      ],
      refi_status: ["uploaded", "ocr", "parsed", "computed", "error"],
      send_status: ["queued", "sent", "delivered", "failed"],
      task_priority: ["Low", "Medium", "High", "Critical"],
      task_status: [
        "To Do",
        "In Progress",
        "Done",
        "Working on it",
        "Need help",
      ],
      title_status: ["Requested", "Received", "Ordered"],
      user_role: ["Admin", "LO", "LO Assistant", "Processor", "ReadOnly"],
    },
  },
} as const
