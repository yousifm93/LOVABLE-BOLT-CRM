import { Label } from "@/components/ui/label";
import { Building2, FileText, MessageSquare, Download, ExternalLink, Calendar } from "lucide-react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { InlineEditCondo } from "@/components/ui/inline-edit-condo";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { Button } from "@/components/ui/button";
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
  budget_file_url: string | null;
  cq_file_url: string | null;
  mip_file_url: string | null;
  approval_type: string | null;
  approval_source: string | null;
  approval_expiration_date: string | null;
}

const condoStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Received" },
  { value: "Approved", label: "Approved" }
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
      .select("id, condo_name, budget_file_url, cq_file_url, mip_file_url, approval_type, approval_source, approval_expiration_date")
      .eq("id", data.condo_id)
      .single();

    if (!error && condo) {
      setCondoDetails(condo);
      
      // Auto-populate approval type from condo if lead doesn't have one
      if (!data.condo_approval_type && condo.approval_type) {
        onUpdate('condo_approval_type', condo.approval_type);
      }
    }
    setLoading(false);
  };

  const handleDownload = (url: string, filename: string) => {
    window.open(url, '_blank');
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
          
          {(condoDetails.approval_type || condoDetails.approval_source || condoDetails.approval_expiration_date) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {condoDetails.approval_type && (
                <div>
                  <span className="text-muted-foreground">Approval Type:</span>
                  <p className="font-medium">{condoDetails.approval_type}</p>
                </div>
              )}
              {condoDetails.approval_source && (
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <p className="font-medium">{condoDetails.approval_source}</p>
                </div>
              )}
              {condoDetails.approval_expiration_date && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Expiration:</span>
                  <p className="font-medium">{new Date(condoDetails.approval_expiration_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Condo Documents */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Condo Documents</Label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-1.5 px-2 bg-background rounded border">
                <span className="text-xs font-medium">Budget</span>
                {condoDetails.budget_file_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleDownload(condoDetails.budget_file_url!, 'budget')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No file</span>
                )}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-background rounded border">
                <span className="text-xs font-medium">Condo Questionnaire</span>
                {condoDetails.cq_file_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleDownload(condoDetails.cq_file_url!, 'questionnaire')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No file</span>
                )}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-background rounded border">
                <span className="text-xs font-medium">Master Insurance Policy</span>
                {condoDetails.mip_file_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleDownload(condoDetails.mip_file_url!, 'insurance')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No file</span>
                )}
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
            placeholder={condoDetails?.approval_type || "Select approval type"}
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
