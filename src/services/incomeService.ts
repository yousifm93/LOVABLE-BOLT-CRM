import { supabase } from "@/integrations/supabase/client";

export interface BorrowerData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  lead_id?: string;
  created_at: string;
}

export type DocType = 'pay_stub' | 'w2' | 'form_1099' | 'form_1040' | 'schedule_c' | 'schedule_e' | 'schedule_f' | 'k1' | 'form_1065' | 'form_1120s' | 'voe';

export interface IncomeDocumentData {
  id: string;
  borrower_id: string;
  doc_type: DocType;
  file_name: string;
  storage_path: string;
  ocr_status: 'pending' | 'processing' | 'success' | 'failed';
  parsed_json?: any;
  parse_confidence?: number;
  doc_period_start?: string;
  doc_period_end?: string;
  ytd_flag?: boolean;
  created_at: string;
}

export interface IncomeCalculationData {
  id: string;
  borrower_id: string;
  agency: string;
  result_monthly_income?: number;
  confidence?: number;
  warnings?: any;
  overrides?: any;
  created_at: string;
}

export const incomeService = {
  // Borrower operations
  async getBorrowers() {
    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as BorrowerData[];
  },

  async createBorrower(borrowerData: Omit<BorrowerData, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('borrowers')
      .insert(borrowerData)
      .select()
      .single();
    
    if (error) throw error;
    return data as BorrowerData;
  },

  // Document operations  
  async getDocumentsByBorrower(borrowerId: string) {
    const { data, error } = await supabase
      .from('income_documents')
      .select('*')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as IncomeDocumentData[];
  },

  async uploadDocument(file: File, borrowerId: string, docType: DocType = 'pay_stub') {
    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${borrowerId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('income-docs')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error } = await supabase
      .from('income_documents')
      .insert({
        borrower_id: borrowerId,
        doc_type: docType,
        file_name: file.name,
        storage_path: fileName,
        mime_type: file.type,
        file_size_bytes: file.size,
        ocr_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as IncomeDocumentData;
  },

  async updateDocument(documentId: string, updates: Partial<IncomeDocumentData>) {
    const { data, error } = await supabase
      .from('income_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IncomeDocumentData;
  },

  // Calculation operations
  async getCalculationsByBorrower(borrowerId: string) {
    const { data, error } = await supabase
      .from('income_calculations')
      .select('*')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as IncomeCalculationData[];
  },

  async calculateIncome(borrowerId: string, agency: string) {
    const { data, error } = await supabase.functions.invoke('income-calculate', {
      body: { borrower_id: borrowerId, agency }
    });

    if (error) throw error;
    return data;
  },

  async exportToPDF(calculationId: string) {
    const { data, error } = await supabase.functions.invoke('income-export-pdf', {
      body: { calculation_id: calculationId }
    });

    if (error) throw error;
    return data;
  },

  // OCR operations
  async processDocument(documentId: string) {
    const { data, error } = await supabase.functions.invoke('income-ocr', {
      body: { document_id: documentId }
    });

    if (error) throw error;
    return data;
  },

  // Audit operations
  async getAuditEvents(calculationId: string) {
    const { data, error } = await supabase
      .from('income_audit_events')
      .select('*')
      .eq('calculation_id', calculationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // File operations
  async getFileUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from('income-docs')
      .createSignedUrl(storagePath, 3600);
    
    return data?.signedUrl;
  },

  async deleteDocument(documentId: string, storagePath: string) {
    // Delete from storage
    await supabase.storage
      .from('income-docs')
      .remove([storagePath]);

    // Delete database record
    const { error } = await supabase
      .from('income_documents')
      .delete()
      .eq('id', documentId);
    
    if (error) throw error;
  }
};