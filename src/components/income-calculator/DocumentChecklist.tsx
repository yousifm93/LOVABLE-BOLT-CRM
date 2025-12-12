import React from "react";
import { CheckCircle, Circle, AlertCircle, FileText, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  LOAN_PROGRAM_REQUIREMENTS, 
  DOC_TYPE_METADATA,
  type DocumentRequirement 
} from "@/utils/loanProgramDocRequirements";

interface IncomeDocument {
  id: string;
  doc_type: string;
  file_name: string;
  ocr_status: string;
  parsed_json?: any;
}

interface DocumentChecklistProps {
  program: string;
  documents: IncomeDocument[];
  onUploadClick?: (docType: string) => void;
}

export function DocumentChecklist({ program, documents, onUploadClick }: DocumentChecklistProps) {
  const programReqs = LOAN_PROGRAM_REQUIREMENTS[program];
  
  if (!programReqs) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Unknown loan program</p>
        </CardContent>
      </Card>
    );
  }

  // Count uploaded documents by type
  const uploadedByType: Record<string, IncomeDocument[]> = {};
  documents.forEach(doc => {
    if (!uploadedByType[doc.doc_type]) {
      uploadedByType[doc.doc_type] = [];
    }
    uploadedByType[doc.doc_type].push(doc);
  });

  // Calculate completion
  const requiredDocs = programReqs.documents.filter(d => d.required);
  const completedRequired = requiredDocs.filter(req => {
    const uploaded = uploadedByType[req.docType] || [];
    // Check if enough documents are uploaded based on quantity requirement
    if (req.quantity && req.period === 'years') {
      return uploaded.length >= req.quantity;
    }
    return uploaded.length > 0;
  });

  const completionPercentage = requiredDocs.length > 0 
    ? Math.round((completedRequired.length / requiredDocs.length) * 100)
    : 100;

  const getDocStatus = (req: DocumentRequirement) => {
    const uploaded = uploadedByType[req.docType] || [];
    if (uploaded.length === 0) {
      return { status: 'missing', icon: Circle, color: 'text-muted-foreground' };
    }
    
    // Check if we have enough based on quantity
    if (req.quantity && req.period === 'years' && uploaded.length < req.quantity) {
      return { status: 'partial', icon: AlertCircle, color: 'text-yellow-500' };
    }
    
    // Check processing status
    const allProcessed = uploaded.every(d => d.ocr_status === 'success');
    const anyFailed = uploaded.some(d => d.ocr_status === 'failed');
    
    if (anyFailed) {
      return { status: 'error', icon: AlertCircle, color: 'text-destructive' };
    }
    if (!allProcessed) {
      return { status: 'processing', icon: AlertCircle, color: 'text-blue-500' };
    }
    
    return { status: 'complete', icon: CheckCircle, color: 'text-green-500' };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Document Checklist</CardTitle>
            <CardDescription>{programReqs.label} Requirements</CardDescription>
          </div>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {completionPercentage}% Complete
          </Badge>
        </div>
        <Progress value={completionPercentage} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Required Documents */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Required</h4>
          {programReqs.documents.filter(d => d.required).map(req => {
            const { status, icon: StatusIcon, color } = getDocStatus(req);
            const uploaded = uploadedByType[req.docType] || [];
            const metadata = DOC_TYPE_METADATA[req.docType];
            
            return (
              <div 
                key={req.docType}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md",
                  status === 'complete' ? 'bg-green-50' : 
                  status === 'partial' ? 'bg-yellow-50' :
                  status === 'error' ? 'bg-red-50' : 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className={cn("h-4 w-4", color)} />
                  <div>
                    <span className="text-sm font-medium">{req.label}</span>
                    {req.quantity && req.period && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({req.quantity} {req.period})
                      </span>
                    )}
                    {uploaded.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        • {uploaded.length} uploaded
                      </span>
                    )}
                  </div>
                </div>
                
                {status !== 'complete' && onUploadClick && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onUploadClick(req.docType)}
                    className="h-7 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Optional Documents */}
        {programReqs.documents.filter(d => !d.required).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Optional</h4>
            {programReqs.documents.filter(d => !d.required).map(req => {
              const uploaded = uploadedByType[req.docType] || [];
              const hasDoc = uploaded.length > 0;
              
              return (
                <div 
                  key={req.docType}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md",
                    hasDoc ? 'bg-muted/50' : 'bg-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {hasDoc ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">{req.label}</span>
                      {uploaded.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          • {uploaded.length} uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!hasDoc && onUploadClick && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onUploadClick(req.docType)}
                      className="h-7 text-xs opacity-50 hover:opacity-100"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tip */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-3">
          <strong>Tip:</strong> {programReqs.description}
        </div>
      </CardContent>
    </Card>
  );
}
