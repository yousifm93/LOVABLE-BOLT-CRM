import { Label } from "@/components/ui/label";
import { Building2, MessageSquare, ExternalLink, Calendar, Check, FileText } from "lucide-react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { InlineEditCondo } from "@/components/ui/inline-edit-condo";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { CondoDocumentUpload } from "@/components/ui/condo-document-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface CondoTabProps {
  leadId: string;
  data: {
    condo_id: string | null;
    condo_status: string | null;
    condo_ordered_date: string | null;
    condo_eta: string | null;
    condo_approval_type: string | null;
    condo_notes: string | null;
  };
  onUpdate: (field: string, value: any) => void;
}

interface CondoDetails {
  id: string;
  condo_name: string;
  source_uwm: boolean | null;
  source_ad: boolean | null;
  review_type: string | null;
  approval_expiration_date: string | null;
  primary_down: string | null;
  second_down: string | null;
  investment_down: string | null;
  budget_doc: string | null;
  mip_doc: string | null;
  cq_doc: string | null;
}

const condoStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Docs Received" },
  { value: "Approved", label: "Approved" },
  { value: "Transfer", label: "Transfer" },
  { value: "On Hold", label: "On Hold" },
  { value: "N/A", label: "N/A" }
];

const condoApprovalTypeOptions = [
  { value: "Limited", label: "Limited" },
  { value: "Full", label: "Full" },
  { value: "Non-Warrantable Full", label: "Non-Warrantable Full" },
  { value: "Non-Warrantable Limited", label: "Non-Warrantable Limited" }
];

export function CondoTab({ leadId, data, onUpdate }: CondoTabProps) {
  const [condoDetails, setCondoDetails] = useState<CondoDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data.condo_id) {
      loadCondoDetails();
    } else {
      setCondoDetails(null);
    }
  }, [data.condo_id]);

  const loadCondoDetails = async () => {
    if (!data.condo_id) return;
    
    setLoading(true);
    const { data: condo, error } = await supabase
      .from("condos")
      .select("id, condo_name, source_uwm, source_ad, review_type, approval_expiration_date, primary_down, second_down, investment_down, budget_doc, mip_doc, cq_doc")
      .eq("id", data.condo_id)
      .single();

    if (!error && condo) {
      setCondoDetails(condo);
      
      // Auto-populate approval type from condo review_type if lead doesn't have one
      if (!data.condo_approval_type && condo.review_type) {
        // Map review_type to approval type if applicable
        const reviewType = condo.review_type;
        if (reviewType?.includes('Limited')) {
          onUpdate('condo_approval_type', 'Limited');
        } else if (reviewType?.includes('Full')) {
          onUpdate('condo_approval_type', 'Full');
        }
      }
    }
    setLoading(false);
  };

  const handleCondoDocUpdate = async (field: string, path: string | null) => {
    if (!condoDetails?.id) return;
    
    const { error } = await supabase
      .from('condos')
      .update({ [field]: path })
      .eq('id', condoDetails.id);
    
    if (!error) {
      loadCondoDetails(); // Refresh to show updated doc
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Status, Ordered On, ETA - all in one row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Status */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            Status
          </Label>
          <InlineEditSelect
            value={data.condo_status}
            onValueChange={(value) => onUpdate('condo_status', value)}
            options={condoStatusOptions}
            placeholder="Select status"
            showAsStatusBadge={false}
            className="text-sm"
          />
        </div>

        {/* Ordered On */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Ordered
          </Label>
          <InlineEditDate
            value={data.condo_ordered_date}
            onValueChange={(value) => onUpdate('condo_ordered_date', value)}
            placeholder="-"
          />
        </div>

        {/* ETA */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            ETA
          </Label>
          <InlineEditDate
            value={data.condo_eta}
            onValueChange={(value) => onUpdate('condo_eta', value)}
            placeholder="-"
          />
        </div>
      </div>

      {/* Condo Selection - appears below the row */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Condo
        </Label>
        <InlineEditCondo
          value={data.condo_id}
          onValueChange={(value) => onUpdate('condo_id', value)}
          placeholder="Select condo..."
        />
      </div>

      {/* Condo Details & Approval Info */}
      {condoDetails && (
        <div className="bg-muted/30 p-3 rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{condoDetails.condo_name}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/resources/condolist', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </div>
          
          {/* Sources and Review Type */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Sources:</span>
              <div className="flex gap-1 mt-1">
                {condoDetails.source_uwm && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                    <Check className="h-2 w-2 mr-0.5" /> UWM
                  </Badge>
                )}
                {condoDetails.source_ad && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    <Check className="h-2 w-2 mr-0.5" /> A&D
                  </Badge>
                )}
                {!condoDetails.source_uwm && !condoDetails.source_ad && (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
            {condoDetails.review_type && (
              <div>
                <span className="text-muted-foreground">Review Type:</span>
                <p className="font-medium">{condoDetails.review_type}</p>
              </div>
            )}
          </div>

          {/* Expiration and Down Payments */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {condoDetails.approval_expiration_date && (
              <div>
                <span className="text-muted-foreground">Expiration:</span>
                <p className="font-medium">{new Date(condoDetails.approval_expiration_date).toLocaleDateString()}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-muted-foreground">Down Payments:</span>
              <div className="flex gap-3 mt-1">
                {condoDetails.primary_down && (
                  <span><span className="text-muted-foreground">Primary:</span> {condoDetails.primary_down}</span>
                )}
                {condoDetails.second_down && (
                  <span><span className="text-muted-foreground">Second:</span> {condoDetails.second_down}</span>
                )}
                {condoDetails.investment_down && (
                  <span><span className="text-muted-foreground">Investment:</span> {condoDetails.investment_down}</span>
                )}
              </div>
            </div>
          </div>

          {/* Condo Documents */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Condo Documents</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Budget</span>
                <CondoDocumentUpload
                  condoId={condoDetails.id}
                  fieldName="budget_doc"
                  currentFile={condoDetails.budget_doc}
                  onUpload={(path) => handleCondoDocUpdate('budget_doc', path)}
                  compact={true}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">MIP</span>
                <CondoDocumentUpload
                  condoId={condoDetails.id}
                  fieldName="mip_doc"
                  currentFile={condoDetails.mip_doc}
                  onUpload={(path) => handleCondoDocUpdate('mip_doc', path)}
                  compact={true}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">CQ</span>
                <CondoDocumentUpload
                  condoId={condoDetails.id}
                  fieldName="cq_doc"
                  currentFile={condoDetails.cq_doc}
                  onUpload={(path) => handleCondoDocUpdate('cq_doc', path)}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Type Override (only if condo selected) */}
      {data.condo_id && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">
            Approval Type Override
            <span className="text-[10px] ml-1">(Leave empty to use condo default)</span>
          </Label>
          <InlineEditSelect
            value={data.condo_approval_type}
            onValueChange={(value) => onUpdate('condo_approval_type', value)}
            options={condoApprovalTypeOptions}
            placeholder={condoDetails?.review_type || "Select approval type"}
            showAsStatusBadge={false}
            className="text-sm"
          />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Condo Notes
        </Label>
        <InlineEditNotes
          value={data.condo_notes}
          onValueChange={(value) => onUpdate('condo_notes', value)}
          placeholder="Add notes about condo approval..."
        />
      </div>
    </div>
  );
}
