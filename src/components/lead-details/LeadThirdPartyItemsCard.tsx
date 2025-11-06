import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Building2, Shield, FileCheck } from "lucide-react";
import { AppraisalTab } from "./AppraisalTab";
import { TitleTab } from "./TitleTab";
import { InsuranceTab } from "./InsuranceTab";
import { CondoTab } from "./CondoTab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadThirdPartyItemsCardProps {
  leadId: string;
}

export function LeadThirdPartyItemsCard({ leadId }: LeadThirdPartyItemsCardProps) {
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead-third-party', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('appr_date_time, appr_eta, appraisal_value, appraisal_file, appraisal_status, appraisal_notes, title_ordered_date, title_eta, title_file, title_status, title_notes, hoi_status, insurance_policy_file, insurance_inspection_file, insurance_notes, condo_name, condo_docs_file, condo_status, condo_approval_type, condo_notes')
        .eq('id', leadId)
        .single();
      if (error) throw error;
      return {
        ...data,
        appraisal_value: data.appraisal_value ? Number(data.appraisal_value) : null
      };
    }
  });

  const handleUpdate = async (field: string, value: any) => {
    const { error } = await supabase
      .from('leads')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    
    if (error) {
      toast.error("Failed to update", { description: error.message });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['lead-third-party', leadId] });
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    toast.success("Updated successfully");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Third Party Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Third Party Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appraisal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appraisal" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Appraisal
            </TabsTrigger>
            <TabsTrigger value="title" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Title
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Insurance
            </TabsTrigger>
            <TabsTrigger value="condo" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Condo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appraisal" className="mt-4">
            <AppraisalTab 
              leadId={leadId}
              data={{
                appr_date_time: lead.appr_date_time,
                appr_eta: lead.appr_eta,
                appraisal_value: lead.appraisal_value,
                appraisal_file: lead.appraisal_file,
                appraisal_status: lead.appraisal_status,
                appraisal_notes: lead.appraisal_notes
              }}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="title" className="mt-4">
            <TitleTab 
              leadId={leadId}
              data={{
                title_ordered_date: lead.title_ordered_date,
                title_eta: lead.title_eta,
                title_file: lead.title_file,
                title_status: lead.title_status,
                title_notes: lead.title_notes
              }}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="insurance" className="mt-4">
            <InsuranceTab 
              leadId={leadId}
              data={{
                hoi_status: lead.hoi_status,
                insurance_policy_file: lead.insurance_policy_file,
                insurance_inspection_file: lead.insurance_inspection_file,
                insurance_notes: lead.insurance_notes
              }}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="condo" className="mt-4">
            <CondoTab 
              leadId={leadId}
              data={{
                condo_name: lead.condo_name,
                condo_docs_file: lead.condo_docs_file,
                condo_status: lead.condo_status,
                condo_approval_type: lead.condo_approval_type,
                condo_notes: lead.condo_notes
              }}
              onUpdate={handleUpdate}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
