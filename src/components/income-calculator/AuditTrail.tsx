import React, { useState, useEffect } from "react";
import { Clock, User, FileText, Calculator, Download, Eye, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditEvent {
  id: string;
  step: string;
  payload: any;
  created_at: string;
  actor_id?: string;
  calculation_id?: string;
  document_id?: string;
}

interface AuditTrailProps {
  calculationId: string;
}

export function AuditTrail({ calculationId }: AuditTrailProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditEvents();
  }, [calculationId]);

  const loadAuditEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('income_audit_events')
        .select('*')
        .eq('calculation_id', calculationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading audit events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'upload':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'ocr':
        return <Eye className="h-4 w-4 text-purple-500" />;
      case 'classify':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case 'parse':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'validate':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'calculate':
        return <Calculator className="h-4 w-4 text-indigo-500" />;
      case 'export':
        return <Download className="h-4 w-4 text-teal-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepLabel = (step: string) => {
    const labels = {
      upload: "Document Upload",
      ocr: "OCR Processing",
      classify: "Document Classification",
      parse: "Field Extraction", 
      validate: "Data Validation",
      calculate: "Income Calculation",
      export: "Export Generated"
    };
    return labels[step as keyof typeof labels] || step.charAt(0).toUpperCase() + step.slice(1);
  };

  const getStepColor = (step: string) => {
    const colors = {
      upload: "bg-blue-100 text-blue-800",
      ocr: "bg-purple-100 text-purple-800",
      classify: "bg-orange-100 text-orange-800", 
      parse: "bg-green-100 text-green-800",
      validate: "bg-yellow-100 text-yellow-800",
      calculate: "bg-indigo-100 text-indigo-800",
      export: "bg-teal-100 text-teal-800"
    };
    return colors[step as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    };
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPayloadDetails = (step: string, payload: any) => {
    if (!payload || Object.keys(payload).length === 0) return null;
    
    // Return human-readable formatted details instead of raw JSON
    const details: string[] = [];
    
    switch (step) {
      case 'upload':
        if (payload.file_name) details.push(`File: ${payload.file_name}`);
        if (payload.file_size) details.push(`Size: ${(payload.file_size / 1024).toFixed(1)} KB`);
        if (payload.doc_type) details.push(`Type: ${payload.doc_type.replace(/_/g, ' ')}`);
        break;
      case 'ocr':
        if (payload.pages_processed) details.push(`Pages: ${payload.pages_processed}`);
        if (payload.confidence) details.push(`Confidence: ${Math.round(payload.confidence * 100)}%`);
        if (payload.doc_type) details.push(`Detected: ${payload.doc_type.replace(/_/g, ' ')}`);
        break;
      case 'parse':
        if (payload.fields_extracted) details.push(`Fields extracted: ${payload.fields_extracted}`);
        if (payload.doc_type) details.push(`Document: ${payload.doc_type.replace(/_/g, ' ')}`);
        break;
      case 'validate':
        if (payload.warnings_count !== undefined) details.push(`Warnings: ${payload.warnings_count}`);
        if (payload.errors_count !== undefined) details.push(`Errors: ${payload.errors_count}`);
        break;
      case 'calculate':
        if (payload.monthly_income !== undefined) details.push(`Monthly Income: ${formatCurrency(payload.monthly_income)}`);
        if (payload.components_count) details.push(`Components: ${payload.components_count}`);
        if (payload.documents_processed) details.push(`Documents: ${payload.documents_processed}`);
        if (payload.doc_types) details.push(`Types: ${payload.doc_types.join(', ').replace(/_/g, ' ')}`);
        if (payload.warnings_count) details.push(`Warnings: ${payload.warnings_count}`);
        break;
      case 'export':
      case 'export_form_1084':
        if (payload.format) details.push(`Format: ${payload.format.toUpperCase()}`);
        if (payload.monthly_income !== undefined) details.push(`Income: ${formatCurrency(payload.monthly_income)}`);
        if (payload.components_count) details.push(`Components: ${payload.components_count}`);
        if (payload.documents_count) details.push(`Documents: ${payload.documents_count}`);
        break;
      default:
        // For unknown steps, show key-value pairs in readable format
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (typeof value === 'number') {
              details.push(`${label}: ${value.toLocaleString()}`);
            } else if (typeof value === 'string') {
              details.push(`${label}: ${value}`);
            }
          }
        });
    }
    
    return details.length > 0 ? details : null;
  };

  const getSummaryFromPayload = (step: string, payload: any) => {
    switch (step) {
      case 'upload':
        return payload.file_name ? `File: ${payload.file_name}` : 'Document uploaded';
      case 'ocr':
        return payload.pages_processed ? `${payload.pages_processed} pages processed` : 'OCR completed';
      case 'parse':
        return payload.fields_extracted ? `${payload.fields_extracted} fields extracted` : 'Fields parsed';
      case 'validate':
        return payload.warnings_count ? `${payload.warnings_count} warnings found` : 'Validation completed';
      case 'calculate':
        return payload.monthly_income !== undefined ? `Monthly income: ${formatCurrency(payload.monthly_income)}` : 'Calculation completed';
      case 'export':
      case 'export_form_1084':
        return payload.format ? `${payload.format.toUpperCase()} worksheet exported` : 'Export completed';
      default:
        return 'Step completed';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading audit trail...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No audit events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const timestamp = formatTimestamp(event.created_at);
        const isExpanded = expandedEvents.has(event.id);
        const hasPayload = event.payload && Object.keys(event.payload).length > 0;
        const summary = getSummaryFromPayload(event.step, event.payload);

        return (
          <div key={event.id} className="relative">
            {/* Timeline connector */}
            {index < events.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-6 bg-border" />
            )}
            
            <Card className="border-l-4 border-l-muted">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-1">
                    {getStepIcon(event.step)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {getStepLabel(event.step)}
                        </h4>
                        <Badge className={getStepColor(event.step)}>
                          {event.step}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{timestamp.time}</div>
                        <div>{timestamp.date}</div>
                      </div>
                    </div>
                    
                    {summary && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {summary}
                      </p>
                    )}

                    {/* Expandable payload */}
                    {hasPayload && (
                      <Collapsible>
                        <CollapsibleTrigger
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          onClick={() => toggleEventExpansion(event.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          View Details
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-2">
                          <div className="text-xs bg-muted p-3 rounded space-y-1">
                            {formatPayloadDetails(event.step, event.payload)?.map((detail, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{detail}</span>
                              </div>
                            )) || (
                              <span className="text-muted-foreground">No additional details</span>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Actor info */}
                    {event.actor_id && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>User ID: {event.actor_id.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}