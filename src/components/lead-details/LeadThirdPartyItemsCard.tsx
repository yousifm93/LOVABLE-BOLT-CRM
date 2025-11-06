import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, FileText, Shield, Building2 } from "lucide-react";
import { AppraisalTab } from "./AppraisalTab";
import { TitleTab } from "./TitleTab";
import { InsuranceTab } from "./InsuranceTab";
import { CondoTab } from "./CondoTab";

interface LeadThirdPartyItemsCardProps {
  leadId: string;
}

export function LeadThirdPartyItemsCard({ leadId }: LeadThirdPartyItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Third Party Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appraisal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appraisal" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Appraisal
            </TabsTrigger>
            <TabsTrigger value="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
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
          
          <TabsContent value="appraisal" className="min-h-[280px]">
            <div className="grid grid-cols-2 gap-x-6">
              <AppraisalTab leadId={leadId} />
            </div>
          </TabsContent>
          
          <TabsContent value="title" className="min-h-[280px]">
            <div className="grid grid-cols-2 gap-x-6">
              <TitleTab leadId={leadId} />
            </div>
          </TabsContent>
          
          <TabsContent value="insurance" className="min-h-[280px]">
            <div className="grid grid-cols-2 gap-x-6">
              <InsuranceTab leadId={leadId} />
            </div>
          </TabsContent>
          
          <TabsContent value="condo" className="min-h-[280px]">
            <div className="grid grid-cols-2 gap-x-6">
              <CondoTab leadId={leadId} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
