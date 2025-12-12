import React, { useState, useEffect } from "react";
import { Plus, Calculator, FileText, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadBox } from "@/components/income-calculator/UploadBox";
import { BorrowerSelector } from "@/components/income-calculator/BorrowerSelector";
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
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("conventional");
  const [documents, setDocuments] = useState<IncomeDocument[]>([]);
  const [calculations, setCalculations] = useState<IncomeCalculation[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<IncomeDocument | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedBorrower) {
      loadDocuments();
      loadCalculations();
    }
  }, [selectedBorrower]);

  // Poll for OCR status updates
  useEffect(() => {
    if (!selectedBorrower) return;
    
    const pendingDocs = documents.filter(d => d.ocr_status === 'pending' || d.ocr_status === 'processing');
    if (pendingDocs.length === 0) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, selectedBorrower]);

  const loadDocuments = async () => {
    if (!selectedBorrower) return;

    try {
      const { data, error } = await supabase
        .from('income_documents')
        .select('*')
        .eq('borrower_id', selectedBorrower.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadCalculations = async () => {
    if (!selectedBorrower) return;

    try {
      const { data, error } = await supabase
        .from('income_calculations')
        .select('*')
        .eq('borrower_id', selectedBorrower.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Error loading calculations:', error);
    }
  };

  const handleFileUpload = async (files: File[], docType?: string) => {
    if (!selectedBorrower || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedBorrower.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('income-docs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: docData, error: docError } = await supabase
          .from('income_documents')
          .insert({
            borrower_id: selectedBorrower.id,
            doc_type: docType || pendingDocType || 'pay_stub',
            file_name: file.name,
            storage_path: fileName,
            mime_type: file.type,
            file_size_bytes: file.size,
            ocr_status: 'pending'
          })
          .select()
          .single();

        if (docError) throw docError;

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
    if (!selectedBorrower) return;

    setIsCalculating(true);

    try {
      const { data, error } = await supabase.functions.invoke('income-calculate', {
        body: {
          borrower_id: selectedBorrower.id,
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
    if (!selectedBorrower || calculations.length === 0) return;

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
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Borrower</CardTitle>
            <CardDescription>
              Choose the borrower for income calculation or link from existing lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BorrowerSelector 
              selectedBorrower={selectedBorrower}
              onBorrowerSelect={setSelectedBorrower}
            />
          </CardContent>
        </Card>

        {selectedBorrower ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Document Checklist */}
            <div className="lg:col-span-1">
              <DocumentChecklist
                program={selectedProgram}
                documents={documents}
                onUploadClick={(docType) => setPendingDocType(docType)}
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
                  borrower={selectedBorrower}
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
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Welcome to Income Calculator</h3>
                <p className="text-muted-foreground mb-4">
                  Select a borrower above to begin income analysis
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
                  <div className="p-4 bg-muted/50 rounded">
                    <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">1. Upload Documents</h4>
                    <p className="text-muted-foreground">Pay stubs, W-2s, tax returns</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded">
                    <Calculator className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">2. Auto Calculate</h4>
                    <p className="text-muted-foreground">Fannie Mae compliant</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded">
                    <Download className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">3. Export Form 1084</h4>
                    <p className="text-muted-foreground">PDF worksheet</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
