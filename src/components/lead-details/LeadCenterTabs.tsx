import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, User } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { DetailsTab } from "./DetailsTab";
import { DocumentsTab } from "./DocumentsTab";

interface LeadCenterTabsProps {
  leadId: string;
  activities: any[];
  documents: any[];
  client: any;
  onCallClick?: () => void;
  onSmsClick?: () => void;
  onEmailClick?: () => void;
  onNoteClick?: () => void;
  onTaskClick?: () => void;
}

export function LeadCenterTabs({ leadId, activities, documents, client, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick }: LeadCenterTabsProps) {
  return (
    <Card className="mb-4 h-[600px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <Tabs defaultValue="activity" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="activity" className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              Details
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
          
          <TabsContent value="details" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DetailsTab client={client} />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0 h-[calc(100%-56px)] overflow-auto">
            <DocumentsTab documents={documents} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}