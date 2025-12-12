import React, { useState, useEffect, useRef } from "react";
import { Plus, Calculator, FileText, AlertTriangle, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadBox } from "@/components/income-calculator/UploadBox";
import { DocumentCard } from "@/components/income-calculator/DocumentCard";
import { ParsedFieldsForm } from "@/components/income-calculator/ParsedFieldsForm";
import { IncomeSummaryCard } from "@/components/income-calculator/IncomeSummaryCard";
import { AuditTrail } from "@/components/income-calculator/AuditTrail";
import { DocumentChecklist } from "@/components/income-calculator/DocumentChecklist";
import { LOAN_PROGRAM_REQUIREMENTS } from "@/utils/loanProgramDocRequirements";

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  lead_id?: string;
}

interface IncomeDocument {
  id: string;
  borrower_id: string;
  doc_type: string;
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

interface IncomeCalculation {
  id: string;
  borrower_id: string;
  agency: string;
  result_monthly_income?: number;
  confidence?: number;
  warnings?: any;
  overrides?: any;
  created_at: string;
}

export default function IncomeCalculator() {
  // Simple session-based state - use sessionId as a pseudo-borrower-id
  const [sessionId] = useState<string>(() => {
    // Generate a unique session ID for this calculator session (as UUID format)
    const saved = localStorage.getItem('incomeCalc_sessionId');
    if (saved) return saved;
    // Generate a UUID-like string for compatibility with borrower_id field
    const newId = crypto.randomUUID();
    localStorage.setItem('incomeCalc_sessionId', newId);
    return newId;
  });
  
  // Optional borrower name for labeling (not required)
  const [borrowerName, setBorrowerName] = useState<string>(() => {
    return localStorage.getItem('incomeCalc_borrowerName') || '';
  });
  
  const [selectedProgram, setSelectedProgram] = useState<string>(() => {
    return localStorage.getItem('incomeCalc_program') || 'conventional';
  });
  const [documents, setDocuments] = useState<IncomeDocument[]>([]);
  const [calculations, setCalculations] = useState<IncomeCalculation[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<IncomeDocument | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Save borrower name to localStorage
  const handleBorrowerNameChange = (name: string) => {
    setBorrowerName(name);
    localStorage.setItem('incomeCalc_borrowerName', name);
  };

  // Save program selection to localStorage
  const handleProgramChange = (program: string) => {
    setSelectedProgram(program);
    localStorage.setItem('incomeCalc_program', program);
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadCalculations();
  }, [sessionId]);

  // Poll for OCR status updates
  useEffect(() => {
    const pendingDocs = documents.filter(d => d.ocr_status === 'pending' || d.ocr_status === 'processing');
    if (pendingDocs.length === 0) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('income_documents')
        .select('*')
        .eq('borrower_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as IncomeDocument[]) || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('income_calculations')
        .select('*')
        .eq('borrower_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations((data as IncomeCalculation[]) || []);
    } catch (error) {
      console.error('Error loading calculations:', error);
    }
  };

  const handleFileUpload = async (files: File[], docType?: string) => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('income-docs')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Use borrower_id field with our sessionId (which is now UUID format)
        const insertData: Record<string, unknown> = {
          borrower_id: sessionId,
          doc_type: (docType || pendingDocType || 'pay_stub'),
          file_name: file.name,
          storage_path: fileName,
          mime_type: file.type,
          file_size_bytes: file.size,
          ocr_status: 'pending'
        };
        
        const { data: docData, error: docError } = await supabase
          .from('income_documents')
          .insert([insertData as any])
          .select()
          .single();

        if (docError) {
          console.error('Document insert error:', docError);
          throw docError;
        }

        // Trigger OCR processing
        if (docData) {
          supabase.functions.invoke('income-ocr', {
            body: { document_id: docData.id, expected_doc_type: docType || pendingDocType }
          });
        }
      }

      await loadDocuments();
      setPendingDocType(null);
      
      toast({
        title: "Upload Successful",
        description: `${files.length} document(s) uploaded and processing started`
      });

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCalculateIncome = async () => {
    if (documents.length === 0) {
      toast({
        title: "No Documents",
        description: "Upload documents before calculating income",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);

    try {
      const { data, error } = await supabase.functions.invoke('income-calculate', {
        body: {
          borrower_id: sessionId,
          agency: 'fannie',
          loan_program: selectedProgram
        }
      });

      if (error) throw error;

      await loadCalculations();
      
      toast({
        title: "Calculation Complete",
        description: `Monthly income: $${data?.monthly_income?.toLocaleString() || 0}`
      });

    } catch (error) {
      console.error('Error calculating income:', error);
      toast({
        title: "Calculation Failed", 
        description: "Failed to calculate income",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportPDF = async () => {
    if (calculations.length === 0) {
      toast({
        title: "No Calculations",
        description: "Run a calculation before exporting",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('income-export-pdf', {
        body: { calculation_id: calculations[0].id }
      });

      if (error) throw error;

      if (data?.export_url) {
        window.open(data.export_url, '_blank');
      }

      toast({
        title: "Export Successful",
        description: "Form 1084 worksheet generated"
      });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export worksheet",
        variant: "destructive"
      });
    }
  };

  const handleClearSession = () => {
    localStorage.removeItem('incomeCalc_sessionId');
    localStorage.removeItem('incomeCalc_borrowerName');
    localStorage.removeItem('incomeCalc_program');
    window.location.reload();
  };

  const latestCalculation = calculations[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Income Calculator
                <Badge variant="secondary">Fannie Mae</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload documents, auto-calculate income, export Form 1084 worksheet
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Loan Program:</label>
                <Select value={selectedProgram} onValueChange={handleProgramChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOAN_PROGRAM_REQUIREMENTS).map(([key, prog]) => (
                      <SelectItem key={key} value={key}>{prog.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Simple Borrower Name Input + Clear Session */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Borrower Info (Optional)</CardTitle>
                <CardDescription className="text-sm">
                  Enter a name to label documents, or leave blank
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearSession}>
                New Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <Input
                value={borrowerName}
                onChange={(e) => handleBorrowerNameChange(e.target.value)}
                placeholder="Enter borrower name (optional)"
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document Checklist */}
          <div className="lg:col-span-1">
            <DocumentChecklist
              program={selectedProgram}
              documents={documents}
              onUploadClick={(docType) => setPendingDocType(docType)}
              fileInputRef={checklistFileInputRef}
            />
            {/* Hidden file input for checklist uploads */}
            <input
              ref={checklistFileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  handleFileUpload(files, pendingDocType || undefined);
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Documents */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents ({documents.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <UploadBox 
                  onFilesSelected={(files) => handleFileUpload(files)}
                  isUploading={isUploading}
                  disabled={isUploading}
                />
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      isSelected={selectedDocument?.id === doc.id}
                      onClick={() => setSelectedDocument(doc)}
                    />
                  ))}
                  
                  {documents.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parsed Fields */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Parsed Fields</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDocument ? (
                  <ParsedFieldsForm 
                    document={selectedDocument}
                    onUpdate={(updatedDoc) => {
                      setDocuments(docs => 
                        docs.map(d => d.id === updatedDoc.id ? updatedDoc : d)
                      );
                      setSelectedDocument(updatedDoc);
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a document to view</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Income Summary */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <IncomeSummaryCard 
                calculation={latestCalculation}
                borrower={borrowerName ? { first_name: borrowerName.split(' ')[0] || '', last_name: borrowerName.split(' ').slice(1).join(' ') || '', id: sessionId } : null}
                agency="fannie"
                onCalculate={handleCalculateIncome}
                onExport={handleExportPDF}
                isCalculating={isCalculating}
              />

              {latestCalculation && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Audit Trail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AuditTrail calculationId={latestCalculation.id} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
