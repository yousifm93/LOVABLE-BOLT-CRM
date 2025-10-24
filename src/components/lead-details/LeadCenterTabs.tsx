import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, User, DollarSign, Users } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { DetailsTab } from "./DetailsTab";
import { BorrowerInfoTab } from "./BorrowerInfoTab";
import { FinancialInfoTab } from "./FinancialInfoTab";
import { DocumentsTab } from "./DocumentsTab";

interface LeadCenterTabsProps {
  leadId: string | null;
  activities: any[];
  documents: any[];
  client: any;
  onLeadUpdated?: () => void;
  onCallClick?: () => void;
  onSmsClick?: () => void;
  onEmailClick?: () => void;
  onNoteClick?: () => void;
  onTaskClick?: () => void;
}

export function LeadCenterTabs({ leadId, activities, documents, client, onLeadUpdated, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick }: LeadCenterTabsProps) {
  return (
    <Card className="mb-4 h-[600px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <Tabs defaultValue="activity" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="activity" className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="loan-property" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              Loan & Property
            </TabsTrigger>
            <TabsTrigger value="borrower" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              Borrower Info
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Financial Info
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="mt-0 h-[calc(100%-56px)] overflow-hidden">
            <ActivityTab 
              activities={activities}
              onCallClick={onCallClick}
              onSmsClick={onSmsClick}
              onEmailClick={onEmailClick}
              onNoteClick={onNoteClick}
              onTaskClick={onTaskClick}
            />
          </TabsContent>
          
          <TabsContent value="loan-property" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DetailsTab client={client} leadId={leadId} onLeadUpdated={onLeadUpdated} />
          </TabsContent>
          
          <TabsContent value="borrower" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <BorrowerInfoTab client={client} leadId={leadId} onLeadUpdated={onLeadUpdated} />
          </TabsContent>
          
          <TabsContent value="financial" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <FinancialInfoTab client={client} leadId={leadId} onLeadUpdated={onLeadUpdated} />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DocumentsTab documents={documents} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}