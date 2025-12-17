import React from "react";
import { FileText, Eye, Download, Trash2, AlertCircle, CheckCircle, Clock, RefreshCw, Scan, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParserDiagnostics {
  ocr_used?: boolean;
  processing_method?: string;
  anchors_found?: string[];
  paystub_anchors_found?: string[];
  classification_override?: boolean;
  original_classification?: string;
  final_classification?: string;
  file_size_bytes?: number;
  mime_type?: string;
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

interface DocumentCardProps {
  document: IncomeDocument;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onReprocess?: () => void;
}

export function DocumentCard({ document, isSelected, onClick, onDelete, onReprocess }: DocumentCardProps) {
  const { toast } = useToast();
  
  const getStatusIcon = () => {
    switch (document.ocr_status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const variants = {
      pending: "secondary",
      processing: "default", 
      success: "default",
      failed: "destructive"
    } as const;

    const labels = {
      pending: "Pending",
      processing: "Processing",
      success: "Processed", 
      failed: "Failed"
    };

    return (
      <Badge variant={variants[document.ocr_status]} className="text-xs">
        {labels[document.ocr_status]}
      </Badge>
    );
  };

  const getDocTypeLabel = (docType: string) => {
    const labels = {
      pay_stub: "Pay Stub",
      w2: "W-2",
      form_1099: "1099",
      form_1040: "1040",
      schedule_c: "Schedule C",
      schedule_e: "Schedule E",
      schedule_f: "Schedule F", 
      k1: "K-1",
      form_1065: "1065",
      form_1120s: "1120S",
      voe: "VOE"
    };
    return labels[docType as keyof typeof labels] || docType.replace('_', ' ');
  };

  const getDocTypeColor = (docType: string) => {
    const colors = {
      pay_stub: "bg-blue-100 text-blue-800",
      w2: "bg-green-100 text-green-800",
      form_1099: "bg-purple-100 text-purple-800",
      form_1040: "bg-orange-100 text-orange-800",
      schedule_c: "bg-pink-100 text-pink-800",
      schedule_e: "bg-indigo-100 text-indigo-800",
      schedule_f: "bg-yellow-100 text-yellow-800",
      k1: "bg-red-100 text-red-800",
      form_1065: "bg-cyan-100 text-cyan-800",
      form_1120s: "bg-teal-100 text-teal-800",
      voe: "bg-gray-100 text-gray-800"
    };
    return colors[docType as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data } = await supabase.storage
        .from('income-docs')
        .createSignedUrl(document.storage_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleReprocessWithOCR = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      toast({
        title: "Reprocessing with OCR",
        description: "Document is being reprocessed with OCR enabled..."
      });

      await supabase.functions.invoke('income-ocr', {
        body: { document_id: document.id, force_reprocess: true, force_ocr: true }
      });

      onReprocess?.();
    } catch (error) {
      console.error('Error reprocessing:', error);
      toast({
        title: "Reprocess Failed",
        description: "Failed to reprocess document",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const confidencePercentage = document.parse_confidence ? Math.round(document.parse_confidence * 100) : 0;
  
  // Extract parser diagnostics from parsed_json
  const parserDiagnostics: ParserDiagnostics = document.parsed_json?.parser_diagnostics || {};
  const hasOCR = parserDiagnostics.ocr_used;
  const anchorsFound = parserDiagnostics.anchors_found || [];
  const wasReclassified = parserDiagnostics.classification_override;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{document.file_name}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatDate(document.created_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-6 w-6 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Document Type and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Badge className={getDocTypeColor(document.doc_type)}>
                {getDocTypeLabel(document.doc_type)}
              </Badge>
              {wasReclassified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        <FileWarning className="h-3 w-3 mr-1" />
                        Reclassified
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Originally classified as: {parserDiagnostics.original_classification}<br/>
                        Corrected to: {parserDiagnostics.final_classification}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* OCR Badge */}
          {hasOCR && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                <Scan className="h-3 w-3 mr-1" />
                OCR Used
              </Badge>
            </div>
          )}

          {/* IRS Anchors Found */}
          {anchorsFound.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Forms detected:</span>{' '}
              {anchorsFound.slice(0, 3).join(', ')}
              {anchorsFound.length > 3 && ` +${anchorsFound.length - 3} more`}
            </div>
          )}

          {/* Document Period */}
          {(document.doc_period_start || document.doc_period_end) && (
            <div className="text-xs text-muted-foreground">
              Period: {document.doc_period_start && formatDate(document.doc_period_start)}
              {document.doc_period_start && document.doc_period_end && ' - '}
              {document.doc_period_end && formatDate(document.doc_period_end)}
              {document.ytd_flag && (
                <Badge variant="outline" className="ml-2 text-xs">YTD</Badge>
              )}
            </div>
          )}

          {/* Parsing Confidence */}
          {document.ocr_status === 'success' && document.parse_confidence && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Parse Confidence</span>
                <span className="font-medium">{confidencePercentage}%</span>
              </div>
              <Progress 
                value={confidencePercentage} 
                className="h-1"
              />
            </div>
          )}

          {/* Processing Error with Reprocess Button */}
          {document.ocr_status === 'failed' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="h-3 w-3" />
                <span>Processing failed. Try reprocessing with OCR.</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={handleReprocessWithOCR}
              >
                <Scan className="h-3 w-3 mr-1" />
                Reprocess with OCR
              </Button>
            </div>
          )}

          {/* Low Confidence Warning with Reprocess */}
          {document.ocr_status === 'success' && confidencePercentage < 60 && !hasOCR && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="h-3 w-3" />
                <span>Low confidence. Consider reprocessing with OCR.</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={handleReprocessWithOCR}
              >
                <Scan className="h-3 w-3 mr-1" />
                Reprocess with OCR
              </Button>
            </div>
          )}

          {/* Key Fields Preview */}
          {document.parsed_json && document.ocr_status === 'success' && (
            <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
              {document.parsed_json.employer_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employer:</span>
                  <span className="font-medium">{document.parsed_json.employer_name}</span>
                </div>
              )}
              {document.parsed_json.gross_current && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Gross:</span>
                  <span className="font-medium">
                    ${parseFloat(document.parsed_json.gross_current).toLocaleString()}
                  </span>
                </div>
              )}
              {document.parsed_json.pay_frequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium capitalize">
                    {document.parsed_json.pay_frequency.replace('_', ' ')}
                  </span>
                </div>
              )}
              {document.parsed_json.tax_year && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Year:</span>
                  <span className="font-medium">{document.parsed_json.tax_year}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}