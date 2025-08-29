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
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
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
          notes?: string | null
          phone?: string | null
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
          notes?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          lead_id: string
          mime_type: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          lead_id: string
          mime_type: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          lead_id?: string
          mime_type?: string
          size_bytes?: number
          uploaded_by?: string
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      format_date_modern: {
        Args: { input_date: string }
        Returns: string
      }
      get_user_account_id: {
        Args: { user_uuid: string }
        Returns: string
      }
    }
    Enums: {
      appraisal_status:
        | "Ordered"
        | "Scheduled"
        | "Inspected"
        | "Received"
        | "Waiver"
      ba_status: "Send" | "Sent" | "Signed"
      call_outcome: "No Answer" | "Left VM" | "Connected"
      cd_status: "Requested" | "Sent" | "Signed"
      condo_status: "Ordered" | "Received" | "Approved"
      contact_type: "Agent" | "Realtor" | "Borrower" | "Other"
      converted_status:
        | "Working on it"
        | "Pending App"
        | "Nurture"
        | "Dead"
        | "Needs Attention"
      disclosure_status: "Ordered" | "Sent" | "Signed" | "Need Signature"
      epo_status: "Send" | "Sent" | "Signed"
      hoi_status: "Quoted" | "Ordered" | "Received"
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
      loan_status: "NEW" | "RFP" | "SUV" | "AWC" | "CTC"
      log_direction: "In" | "Out"
      package_status: "Initial" | "Final"
      pr_type: "P" | "R" | "HELOC"
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
      appraisal_status: [
        "Ordered",
        "Scheduled",
        "Inspected",
        "Received",
        "Waiver",
      ],
      ba_status: ["Send", "Sent", "Signed"],
      call_outcome: ["No Answer", "Left VM", "Connected"],
      cd_status: ["Requested", "Sent", "Signed"],
      condo_status: ["Ordered", "Received", "Approved"],
      contact_type: ["Agent", "Realtor", "Borrower", "Other"],
      converted_status: [
        "Working on it",
        "Pending App",
        "Nurture",
        "Dead",
        "Needs Attention",
      ],
      disclosure_status: ["Ordered", "Sent", "Signed", "Need Signature"],
      epo_status: ["Send", "Sent", "Signed"],
      hoi_status: ["Quoted", "Ordered", "Received"],
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
      loan_status: ["NEW", "RFP", "SUV", "AWC", "CTC"],
      log_direction: ["In", "Out"],
      package_status: ["Initial", "Final"],
      pr_type: ["P", "R", "HELOC"],
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
