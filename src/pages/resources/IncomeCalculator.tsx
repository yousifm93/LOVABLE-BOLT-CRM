import React, { useState, useEffect } from "react";
import { Plus, Calculator, FileText, AlertTriangle, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadBox } from "@/components/income-calculator/UploadBox";
import { BorrowerSelector } from "@/components/income-calculator/BorrowerSelector";
import { DocumentCard } from "@/components/income-calculator/DocumentCard";
import { ParsedFieldsForm } from "@/components/income-calculator/ParsedFieldsForm";
import { IncomeSummaryCard } from "@/components/income-calculator/IncomeSummaryCard";
import { AuditTrail } from "@/components/income-calculator/AuditTrail";

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
  const [selectedAgency, setSelectedAgency] = useState<string>("fannie");
  const [documents, setDocuments] = useState<IncomeDocument[]>([]);
  const [calculations, setCalculations] = useState<IncomeCalculation[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<IncomeDocument | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Load documents when borrower changes
  useEffect(() => {
    if (selectedBorrower) {
      loadDocuments();
      loadCalculations();
    }
  }, [selectedBorrower]);

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
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
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

  const handleFileUpload = async (files: File[]) => {
    if (!selectedBorrower || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedBorrower.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('income-docs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: docError } = await supabase
          .from('income_documents')
          .insert({
            borrower_id: selectedBorrower.id,
            doc_type: 'pay_stub', // Default, will be classified
            file_name: file.name,
            storage_path: fileName,
            mime_type: file.type,
            file_size_bytes: file.size,
            ocr_status: 'pending'
          });

        if (docError) throw docError;
      }

      await loadDocuments();
      
      toast({
        title: "Upload Successful",
        description: `${files.length} document(s) uploaded successfully`
      });

      // Start OCR processing for uploaded documents
      processRecentDocuments();

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

  const processRecentDocuments = async () => {
    // Call OCR edge function for recent documents
    try {
      const { data: recentDocs } = await supabase
        .from('income_documents')
        .select('*')
        .eq('borrower_id', selectedBorrower?.id)
        .eq('ocr_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentDocs) {
        for (const doc of recentDocs) {
          supabase.functions.invoke('income-ocr', {
            body: { document_id: doc.id }
          });
        }
      }
    } catch (error) {
      console.error('Error starting OCR:', error);
    }
  };

  const handleCalculateIncome = async () => {
    if (!selectedBorrower) return;

    setIsCalculating(true);

    try {
      const { data, error } = await supabase.functions.invoke('income-calculate', {
        body: {
          borrower_id: selectedBorrower.id,
          agency: selectedAgency
        }
      });

      if (error) throw error;

      await loadCalculations();
      
      toast({
        title: "Calculation Complete",
        description: "Income calculation has been completed"
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
      const latestCalculation = calculations[0];
      
      const { data, error } = await supabase.functions.invoke('income-export-pdf', {
        body: { calculation_id: latestCalculation.id }
      });

      if (error) throw error;

      toast({
        title: "Export Successful",
        description: "PDF exported successfully"
      });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    }
  };

  const getAgencyColor = (agency: string) => {
    const colors = {
      fannie: "bg-blue-100 text-blue-800",
      freddie: "bg-green-100 text-green-800", 
      fha: "bg-purple-100 text-purple-800",
      va: "bg-orange-100 text-orange-800",
      usda: "bg-yellow-100 text-yellow-800"
    };
    return colors[agency as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const latestCalculation = calculations[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Income Calculator
                <Badge variant="secondary">Beta</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                Estimates for underwriting support; final income per agency/lender guidelines. Not a credit decision.
              </p>
            </div>
            
            {/* Agency Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Agency:</label>
                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fannie">Fannie Mae</SelectItem>
                    <SelectItem value="freddie">Freddie Mac</SelectItem>
                    <SelectItem value="fha">FHA</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="usda">USDA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Badge className={getAgencyColor(selectedAgency)}>
                {selectedAgency.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Borrower Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Borrower</CardTitle>
            <CardDescription>
              Choose the borrower for income calculation or create a new borrower record
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Documents */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents ({documents.length})
                    </span>
                    <Button
                      size="sm"
                      onClick={() => document.getElementById('file-input')?.click()}
                      disabled={isUploading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Area */}
                  <UploadBox 
                    onFilesSelected={handleFileUpload}
                    isUploading={isUploading}
                    disabled={isUploading}
                  />
                  
                  {/* Document List */}
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        isSelected={selectedDocument?.id === doc.id}
                        onClick={() => setSelectedDocument(doc)}
                      />
                    ))}
                    
                    {documents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No documents uploaded</p>
                        <p className="text-sm">Upload pay stubs, W-2s, or tax returns to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Parsed Fields */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Parsed Fields</CardTitle>
                  <CardDescription>
                    Review and edit extracted document data
                  </CardDescription>
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
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a document to view parsed fields</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Income Summary */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <IncomeSummaryCard 
                  calculation={latestCalculation}
                  borrower={selectedBorrower}
                  agency={selectedAgency}
                  onCalculate={handleCalculateIncome}
                  onExport={handleExportPDF}
                  isCalculating={isCalculating}
                />

                {latestCalculation && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Audit Trail</CardTitle>
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
                  Select a borrower above to begin income analysis and calculations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center p-4">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Upload Documents</h4>
                    <p className="text-sm text-muted-foreground">
                      Pay stubs, W-2s, tax returns
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <Calculator className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Auto Calculate</h4>
                    <p className="text-sm text-muted-foreground">
                      Agency-specific rules
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <Download className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Export Results</h4>
                    <p className="text-sm text-muted-foreground">
                      PDF worksheets & reports
                    </p>
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