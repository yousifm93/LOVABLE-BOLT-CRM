import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, User, DollarSign, Users, List, CheckCircle } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { DetailsTab } from "./DetailsTab";
import { DocumentsTab } from "./DocumentsTab";
import { ConditionsTab } from "./ConditionsTab";
import { AllFieldsTab } from "./AllFieldsTab";
import { usePermissions } from "@/hooks/usePermissions";

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
  onTaskActivityClick?: (activity: any) => void;
  onActivityUpdated?: () => void;
}

export function LeadCenterTabs({ leadId, activities, documents, client, onLeadUpdated, onClientPatched, onDocumentsChange, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick, onTaskActivityClick, onActivityUpdated }: LeadCenterTabsProps) {
  const { hasPermission } = usePermissions();
  const showAllFieldsTab = hasPermission('lead_details_all_fields') !== 'hidden';
  const visibleTabCount = 4 + (showAllFieldsTab ? 1 : 0);
  
  return (
    <Card className="mb-4 h-[calc(100vh-300px)]">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-medium">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <Tabs defaultValue="activity" className="w-full h-full">
          <TabsList className={`grid w-full mb-4`} style={{ gridTemplateColumns: `repeat(${visibleTabCount}, 1fr)` }}>
            <TabsTrigger value="activity" className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="loan-property" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              Loan & Property
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="conditions" className="text-xs flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Conditions
            </TabsTrigger>
            {showAllFieldsTab && (
              <TabsTrigger value="all-fields" className="text-xs flex items-center gap-1">
                <List className="h-3 w-3" />
                All Fields
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="activity" className="mt-0 h-[calc(100%-56px)] overflow-hidden">
            <ActivityTab 
              activities={activities}
              onCallClick={onCallClick}
              onSmsClick={onSmsClick}
              onEmailClick={onEmailClick}
              onNoteClick={onNoteClick}
              onTaskClick={onTaskClick}
              onTaskActivityClick={onTaskActivityClick}
              onActivityUpdated={onActivityUpdated}
            />
          </TabsContent>
          
          <TabsContent value="loan-property" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DetailsTab client={client} leadId={leadId} onLeadUpdated={onLeadUpdated} />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DocumentsTab 
              leadId={leadId} 
              documents={documents} 
              onDocumentsChange={onDocumentsChange || (() => {})}
              onLeadUpdated={onLeadUpdated}
              lead={client}
            />
          </TabsContent>
          
          <TabsContent value="conditions" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            {leadId ? (
              <ConditionsTab 
                leadId={leadId} 
                onConditionsChange={onLeadUpdated}
                lead={client}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No lead selected
              </div>
            )}
          </TabsContent>
          
          {showAllFieldsTab && (
            <TabsContent value="all-fields" className="mt-0 h-[calc(100%-56px)] overflow-auto">
              <AllFieldsTab 
                client={client} 
                leadId={leadId} 
                onLeadUpdated={onLeadUpdated}
                onClientPatched={onClientPatched}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}