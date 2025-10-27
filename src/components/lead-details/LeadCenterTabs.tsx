import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, User, DollarSign, Users, List } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { DetailsTab } from "./DetailsTab";
import { BorrowerInfoTab } from "./BorrowerInfoTab";
import { FinancialInfoTab } from "./FinancialInfoTab";
import { DocumentsTab } from "./DocumentsTab";
import { AllFieldsTab } from "./AllFieldsTab";

interface LeadCenterTabsProps {
  leadId: string | null;
  activities: any[];
  documents: any[];
  client: any;
  onLeadUpdated?: () => void;
  onClientPatched?: (patch: any) => void;
  onDocumentsChange?: () => void;
  onCallClick?: () => void;
  onSmsClick?: () => void;
  onEmailClick?: () => void;
  onNoteClick?: () => void;
  onTaskClick?: () => void;
}

export function LeadCenterTabs({ leadId, activities, documents, client, onLeadUpdated, onClientPatched, onDocumentsChange, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick }: LeadCenterTabsProps) {
  return (
    <Card className="mb-4 h-[600px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <Tabs defaultValue="activity" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
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
            <TabsTrigger value="all-fields" className="text-xs flex items-center gap-1">
              <List className="h-3 w-3" />
              All Fields
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
            <DocumentsTab 
              leadId={leadId} 
              documents={documents} 
              onDocumentsChange={onDocumentsChange || (() => {})}
            />
          </TabsContent>
          
          <TabsContent value="all-fields" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <AllFieldsTab 
              client={client} 
              leadId={leadId} 
              onLeadUpdated={onLeadUpdated}
              onClientPatched={onClientPatched}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}