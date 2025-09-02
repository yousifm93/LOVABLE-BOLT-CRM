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
          brokerage: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          phone: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          brokerage: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          license_number?: string | null
          phone?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          brokerage?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
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
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          timestamp?: string
          user_id?: string
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
          {
            foreignKeyName: "chunks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
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
      email_logs: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["log_direction"]
          from_email: string
          id: string
          lead_id: string
          snippet: string | null
          subject: string
          timestamp: string
          to_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["log_direction"]
          from_email: string
          id?: string
          lead_id: string
          snippet?: string | null
          subject: string
          timestamp?: string
          to_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["log_direction"]
          from_email?: string
          id?: string
          lead_id?: string
          snippet?: string | null
          subject?: string
          timestamp?: string
          to_email?: string
          user_id?: string
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
      leads: {
        Row: {
          account_id: string
          appraisal_status:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          arrive_loan_number: number | null
          ba_status: Database["public"]["Enums"]["ba_status"] | null
          buyer_agent_id: string | null
          cd_status: Database["public"]["Enums"]["cd_status"] | null
          close_date: string | null
          condo_status: Database["public"]["Enums"]["condo_status"] | null
          converted: Database["public"]["Enums"]["converted_status"] | null
          created_at: string
          created_by: string
          disclosure_status:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          email: string | null
          epo_status: Database["public"]["Enums"]["epo_status"] | null
          first_name: string
          hoi_status: Database["public"]["Enums"]["hoi_status"] | null
          id: string
          last_name: string
          lead_on_date: string
          lead_strength: Database["public"]["Enums"]["lead_strength"] | null
          lender_id: string | null
          listing_agent_id: string | null
          loan_amount: number | null
          loan_status: Database["public"]["Enums"]["loan_status"] | null
          loan_type: string | null
          lock_expiration_date: string | null
          notes: string | null
          occupancy: string | null
          package_status: Database["public"]["Enums"]["package_status"] | null
          phone: string | null
          pipeline_section: string | null
          pipeline_stage_id: string | null
          pr_type: Database["public"]["Enums"]["pr_type"] | null
          property_type: string | null
          referral_source: Database["public"]["Enums"]["referral_source"] | null
          referred_via: Database["public"]["Enums"]["referred_via"] | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          task_eta: string | null
          teammate_assigned: string | null
          title_status: Database["public"]["Enums"]["title_status"] | null
          updated_at: string
        }
        Insert: {
          account_id: string
          appraisal_status?:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          arrive_loan_number?: number | null
          ba_status?: Database["public"]["Enums"]["ba_status"] | null
          buyer_agent_id?: string | null
          cd_status?: Database["public"]["Enums"]["cd_status"] | null
          close_date?: string | null
          condo_status?: Database["public"]["Enums"]["condo_status"] | null
          converted?: Database["public"]["Enums"]["converted_status"] | null
          created_at?: string
          created_by: string
          disclosure_status?:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          email?: string | null
          epo_status?: Database["public"]["Enums"]["epo_status"] | null
          first_name: string
          hoi_status?: Database["public"]["Enums"]["hoi_status"] | null
          id?: string
          last_name: string
          lead_on_date?: string
          lead_strength?: Database["public"]["Enums"]["lead_strength"] | null
          lender_id?: string | null
          listing_agent_id?: string | null
          loan_amount?: number | null
          loan_status?: Database["public"]["Enums"]["loan_status"] | null
          loan_type?: string | null
          lock_expiration_date?: string | null
          notes?: string | null
          occupancy?: string | null
          package_status?: Database["public"]["Enums"]["package_status"] | null
          phone?: string | null
          pipeline_section?: string | null
          pipeline_stage_id?: string | null
          pr_type?: Database["public"]["Enums"]["pr_type"] | null
          property_type?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referred_via?: Database["public"]["Enums"]["referred_via"] | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          task_eta?: string | null
          teammate_assigned?: string | null
          title_status?: Database["public"]["Enums"]["title_status"] | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          appraisal_status?:
            | Database["public"]["Enums"]["appraisal_status"]
            | null
          arrive_loan_number?: number | null
          ba_status?: Database["public"]["Enums"]["ba_status"] | null
          buyer_agent_id?: string | null
          cd_status?: Database["public"]["Enums"]["cd_status"] | null
          close_date?: string | null
          condo_status?: Database["public"]["Enums"]["condo_status"] | null
          converted?: Database["public"]["Enums"]["converted_status"] | null
          created_at?: string
          created_by?: string
          disclosure_status?:
            | Database["public"]["Enums"]["disclosure_status"]
            | null
          email?: string | null
          epo_status?: Database["public"]["Enums"]["epo_status"] | null
          first_name?: string
          hoi_status?: Database["public"]["Enums"]["hoi_status"] | null
          id?: string
          last_name?: string
          lead_on_date?: string
          lead_strength?: Database["public"]["Enums"]["lead_strength"] | null
          lender_id?: string | null
          listing_agent_id?: string | null
          loan_amount?: number | null
          loan_status?: Database["public"]["Enums"]["loan_status"] | null
          loan_type?: string | null
          lock_expiration_date?: string | null
          notes?: string | null
          occupancy?: string | null
          package_status?: Database["public"]["Enums"]["package_status"] | null
          phone?: string | null
          pipeline_section?: string | null
          pipeline_stage_id?: string | null
          pr_type?: Database["public"]["Enums"]["pr_type"] | null
          property_type?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referred_via?: Database["public"]["Enums"]["referred_via"] | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          task_eta?: string | null
          teammate_assigned?: string | null
          title_status?: Database["public"]["Enums"]["title_status"] | null
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "leads_buyer_agent_id_fkey"
            columns: ["buyer_agent_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
          author_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string
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
      pages: {
        Row: {
          content: string | null
          created_at: string | null
          document_id: string
          id: string
          ocr_confidence: number | null
          page_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          ocr_confidence?: number | null
          page_number: number
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          ocr_confidence?: number | null
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
      profiles: {
        Row: {
          account_id: string
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      tasks: {
        Row: {
          assignee_id: string | null
          borrower_id: string | null
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
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
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
          last_login_at?: string | null
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
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
      format_date_modern: {
        Args: { input_date: string }
        Returns: string
      }
      get_user_account_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
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
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
      call_outcome: "No Answer" | "Left VM" | "Connected"
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
      loan_status: "NEW" | "RFP" | "SUV" | "AWC" | "CTC"
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
      task_priority: "Low" | "Medium" | "High" | "Critical"
      task_status:
        | "To Do"
        | "In Progress"
        | "Done"
        | "Working on it"
        | "Need help"
      title_status: "Requested" | "Received"
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
      call_outcome: ["No Answer", "Left VM", "Connected"],
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
      loan_status: ["NEW", "RFP", "SUV", "AWC", "CTC"],
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
      task_priority: ["Low", "Medium", "High", "Critical"],
      task_status: [
        "To Do",
        "In Progress",
        "Done",
        "Working on it",
        "Need help",
      ],
      title_status: ["Requested", "Received"],
      user_role: ["Admin", "LO", "LO Assistant", "Processor", "ReadOnly"],
    },
  },
} as const
