import { useState, useEffect } from "react";
import { Building, MapPin, CheckCircle, Calendar, Percent, FileText, History } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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
  budget_doc_uploaded_at?: string | null;
  mip_doc_uploaded_at?: string | null;
  cq_doc_uploaded_at?: string | null;
  updated_at: string;
}

interface CondoChangeLog {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name?: string;
  created_at: string;
}

interface CondoDetailDialogProps {
  condo: Condo | null;
  isOpen: boolean;
  onClose: () => void;
  onCondoUpdated: () => void;
  onPreview?: (url: string, fileName: string) => void;
}

const reviewTypeOptions = [
  { value: "Non-QM Limited", label: "Non-QM Limited" },
  { value: "Non-QM Full", label: "Non-QM Full" },
  { value: "Conventional Limited", label: "Conventional Limited" },
  { value: "Conventional Full", label: "Conventional Full" },
  { value: "Restricted", label: "Restricted" }
];

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Doc', 'Document')
    .replace('Uwm', 'UWM')
    .replace('Ad', 'A&D');
};

export function CondoDetailDialog({ condo, isOpen, onClose, onCondoUpdated, onPreview }: CondoDetailDialogProps) {
  const { toast } = useToast();
  const [activityLogs, setActivityLogs] = useState<CondoChangeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && condo?.id) {
      fetchActivityLogs(condo.id);
    }
  }, [isOpen, condo?.id]);

  const fetchActivityLogs = async (condoId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('condo_change_logs')
        .select(`
          *,
          user:users!condo_change_logs_changed_by_fkey(first_name, last_name)
        `)
        .eq('condo_id', condoId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const transformedLogs = (data || []).map((log: any) => ({
        ...log,
        changed_by_name: log.user 
          ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim()
          : 'Unknown',
        user: undefined,
      }));
      
      setActivityLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    
    return data?.id || null;
  };

  const logCondoChange = async (condoId: string, field: string, oldValue: any, newValue: any) => {
    const userId = await getCurrentUserId();
    try {
      await supabase.from('condo_change_logs').insert({
        condo_id: condoId,
        field_name: field,
        old_value: oldValue?.toString() || null,
        new_value: newValue?.toString() || null,
        changed_by: userId
      });
      // Refresh activity logs
      fetchActivityLogs(condoId);
    } catch (error) {
      console.error('Error logging condo change:', error);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!condo?.id) return;
    
    const oldValue = condo[field as keyof Condo];
    if (oldValue === value) return;

    try {
      const userId = await getCurrentUserId();
      await databaseService.updateCondo(condo.id, { [field]: value, updated_by: userId });
      
      // Log the change
      await logCondoChange(condo.id, field, oldValue, value);
      
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

  const handleDocUpdate = async (
    field: string, 
    path: string | null, 
    uploadedAt?: string, 
    uploadedBy?: string
  ) => {
    if (!condo?.id) return;
    
    const oldValue = condo[field as keyof Condo];

    try {
      const userId = await getCurrentUserId();
      const updates: Record<string, any> = { [field]: path, updated_by: userId };
      
      if (uploadedAt) {
        updates[`${field}_uploaded_at`] = uploadedAt;
      }
      if (uploadedBy) {
        updates[`${field}_uploaded_by`] = uploadedBy;
      }
      
      if (path === null) {
        updates[`${field}_uploaded_at`] = null;
        updates[`${field}_uploaded_by`] = null;
      }
      
      await databaseService.updateCondo(condo.id, updates);
      
      // Log the change
      await logCondoChange(condo.id, field, oldValue ? 'document' : null, path ? 'document uploaded' : null);
      
      onCondoUpdated();
      toast({
        title: path ? "Uploaded" : "Deleted",
        description: path ? "Document uploaded successfully." : "Document removed.",
      });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document.",
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
                      uploadedAt={condo.budget_doc_uploaded_at}
                      onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate('budget_doc', path, uploadedAt, uploadedBy)}
                      onPreview={onPreview}
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
                      uploadedAt={condo.mip_doc_uploaded_at}
                      onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate('mip_doc', path, uploadedAt, uploadedBy)}
                      onPreview={onPreview}
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
                      uploadedAt={condo.cq_doc_uploaded_at}
                      onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate('cq_doc', path, uploadedAt, uploadedBy)}
                      onPreview={onPreview}
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

          {/* Activity Log */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 max-h-48 overflow-y-auto">
              {loadingLogs ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[8px]">
                          {log.changed_by_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-medium">{log.changed_by_name}</span>
                        <span className="text-muted-foreground"> changed </span>
                        <span className="font-medium">{formatFieldName(log.field_name)}</span>
                        {log.old_value && (
                          <span className="text-muted-foreground"> from "{log.old_value}"</span>
                        )}
                        {log.new_value && (
                          <span className="text-muted-foreground"> to "{log.new_value}"</span>
                        )}
                        <span className="text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
