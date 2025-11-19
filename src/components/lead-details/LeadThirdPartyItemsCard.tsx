import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Building2, Shield, FileCheck, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(true);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead-third-party', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('appraisal_status, appraisal_ordered_date, appraisal_scheduled_date, appr_date_time, appr_eta, appraisal_value, appraisal_file, appraisal_notes, title_ordered_date, title_eta, title_file, title_status, title_notes, hoi_status, insurance_quoted_date, insurance_ordered_date, insurance_received_date, insurance_policy_file, insurance_inspection_file, insurance_notes, condo_id, condo_status, condo_ordered_date, condo_eta, condo_approval_type, condo_notes, sales_price')
        .eq('id', leadId)
        .single();
      if (error) throw error;
      return {
        ...data,
        appraisal_value: data.appraisal_value ? Number(data.appraisal_value) : null,
        sales_price: data.sales_price ? Number(data.sales_price) : null
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <CardTitle className="text-base font-medium">Third Party Items</CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="appraisal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="appraisal" className="text-xs flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Appraisal
                </TabsTrigger>
                <TabsTrigger value="title" className="text-xs flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Title
                </TabsTrigger>
                <TabsTrigger value="insurance" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Insurance
                </TabsTrigger>
                <TabsTrigger value="condo" className="text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Condo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appraisal" className="mt-4">
                <AppraisalTab 
                  leadId={leadId}
                  data={{
                    appraisal_status: lead.appraisal_status,
                    appraisal_ordered_date: lead.appraisal_ordered_date,
                    appraisal_scheduled_date: lead.appraisal_scheduled_date,
                    appr_date_time: lead.appr_date_time,
                    appr_eta: lead.appr_eta,
                    appraisal_value: lead.appraisal_value,
                    appraisal_file: lead.appraisal_file,
                    appraisal_notes: lead.appraisal_notes,
                    sales_price: lead.sales_price
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
                    insurance_quoted_date: lead.insurance_quoted_date,
                    insurance_ordered_date: lead.insurance_ordered_date,
                    insurance_received_date: lead.insurance_received_date,
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
                    condo_id: lead.condo_id,
                    condo_status: lead.condo_status,
                    condo_ordered_date: lead.condo_ordered_date,
                    condo_eta: lead.condo_eta,
                    condo_approval_type: lead.condo_approval_type,
                    condo_notes: lead.condo_notes
                  }}
                  onUpdate={handleUpdate}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
