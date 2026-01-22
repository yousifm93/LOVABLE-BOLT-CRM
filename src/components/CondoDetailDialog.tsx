import { Building, MapPin, CheckCircle, Calendar, Percent, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditBoolean } from "@/components/ui/inline-edit-boolean";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { CondoDocumentUpload } from "@/components/ui/condo-document-upload";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Condo {
  id: string;
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
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
  updated_at: string;
}

interface CondoDetailDialogProps {
  condo: Condo | null;
  isOpen: boolean;
  onClose: () => void;
  onCondoUpdated: () => void;
}

const reviewTypeOptions = [
  { value: "Non-QM Limited", label: "Non-QM Limited" },
  { value: "Non-QM Full", label: "Non-QM Full" },
  { value: "Conventional Limited", label: "Conventional Limited" },
  { value: "Conventional Full", label: "Conventional Full" },
  { value: "Restricted", label: "Restricted" }
];

export function CondoDetailDialog({ condo, isOpen, onClose, onCondoUpdated }: CondoDetailDialogProps) {
  const { toast } = useToast();

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!condo?.id) return;

    try {
      await databaseService.updateCondo(condo.id, { [field]: value });
      onCondoUpdated();
      toast({
        title: "Updated",
        description: "Condo information updated successfully.",
      });
    } catch (error) {
      console.error('Error updating condo:', error);
      toast({
        title: "Error",
        description: "Failed to update condo information.",
        variant: "destructive",
      });
    }
  };

  if (!condo) return null;

  const initials = condo.condo_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '??';

  const getReviewTypeColor = (type: string | null) => {
    switch (type) {
      case 'Non-QM Limited': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'Non-QM Full': return 'bg-purple-600/20 text-purple-800 border-purple-600/30';
      case 'Conventional Limited': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'Conventional Full': return 'bg-blue-600/20 text-blue-800 border-blue-600/30';
      case 'Restricted': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatAddress = () => {
    const parts = [condo.street_address, condo.city, condo.state, condo.zip].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  const parsePercent = (value: string | null): number | null => {
    if (!value) return null;
    return parseInt(value.replace('%', ''));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl">{condo.condo_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {formatAddress()}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {condo.review_type && (
                  <Badge className={getReviewTypeColor(condo.review_type)}>
                    {condo.review_type}
                  </Badge>
                )}
                {condo.source_uwm && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                    UWM
                  </Badge>
                )}
                {condo.source_ad && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                    A&D
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Building Information */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="h-4 w-4" />
                Building Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Condo Name</label>
                <InlineEditText
                  value={condo.condo_name}
                  onValueChange={(value) => handleFieldUpdate('condo_name', value)}
                  placeholder="Enter condo name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Street Address</label>
                <InlineEditText
                  value={condo.street_address}
                  onValueChange={(value) => handleFieldUpdate('street_address', value)}
                  placeholder="Enter street address"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <InlineEditText
                    value={condo.city}
                    onValueChange={(value) => handleFieldUpdate('city', value)}
                    placeholder="City"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <InlineEditText
                    value={condo.state}
                    onValueChange={(value) => handleFieldUpdate('state', value)}
                    placeholder="State"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Zip Code</label>
                  <InlineEditText
                    value={condo.zip}
                    onValueChange={(value) => handleFieldUpdate('zip', value)}
                    placeholder="Zip"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4" />
                Approval Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-2.5 border rounded-lg">
                  <div>
                    <span className="font-medium text-sm">UWM</span>
                    <p className="text-xs text-muted-foreground">United Wholesale</p>
                  </div>
                  <InlineEditBoolean
                    value={condo.source_uwm}
                    onValueChange={(value) => handleFieldUpdate('source_uwm', value)}
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 border rounded-lg">
                  <div>
                    <span className="font-medium text-sm">A&D</span>
                    <p className="text-xs text-muted-foreground">A&D Mortgage</p>
                  </div>
                  <InlineEditBoolean
                    value={condo.source_ad}
                    onValueChange={(value) => handleFieldUpdate('source_ad', value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Down Payment Requirements */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-4 w-4" />
                Down Payment Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Primary</label>
                  <div className="mt-1">
                    <InlineEditNumber
                      value={parsePercent(condo.primary_down)}
                      onValueChange={(value) => handleFieldUpdate('primary_down', value !== null ? `${value}%` : null)}
                      suffix="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Second</label>
                  <div className="mt-1">
                    <InlineEditNumber
                      value={parsePercent(condo.second_down)}
                      onValueChange={(value) => handleFieldUpdate('second_down', value !== null ? `${value}%` : null)}
                      suffix="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Investment</label>
                  <div className="mt-1">
                    <InlineEditNumber
                      value={parsePercent(condo.investment_down)}
                      onValueChange={(value) => handleFieldUpdate('investment_down', value !== null ? `${value}%` : null)}
                      suffix="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Budget</label>
                  <div className="mt-2">
                    <CondoDocumentUpload
                      condoId={condo.id}
                      fieldName="budget_doc"
                      currentFile={condo.budget_doc}
                      onUpload={(path) => handleFieldUpdate('budget_doc', path)}
                    />
                  </div>
                </div>
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Master Insurance (MIP)</label>
                  <div className="mt-2">
                    <CondoDocumentUpload
                      condoId={condo.id}
                      fieldName="mip_doc"
                      currentFile={condo.mip_doc}
                      onUpload={(path) => handleFieldUpdate('mip_doc', path)}
                    />
                  </div>
                </div>
                <div className="p-2.5 border rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Questionnaire (CQ)</label>
                  <div className="mt-2">
                    <CondoDocumentUpload
                      condoId={condo.id}
                      fieldName="cq_doc"
                      currentFile={condo.cq_doc}
                      onUpload={(path) => handleFieldUpdate('cq_doc', path)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Details */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Approval Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Review Type</label>
                <InlineEditSelect
                  value={condo.review_type}
                  onValueChange={(value) => handleFieldUpdate('review_type', value)}
                  options={reviewTypeOptions}
                  placeholder="Select review type"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Approval Expiration Date</label>
                <div className="mt-1">
                  <InlineEditDate
                    value={condo.approval_expiration_date}
                    onValueChange={(date) => 
                      handleFieldUpdate('approval_expiration_date', date?.toISOString().split('T')[0] || null)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
