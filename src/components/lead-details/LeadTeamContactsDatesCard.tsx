import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Contact, Calendar } from "lucide-react";
import { TeamTab } from "./TeamTab";
import { ContactsTab } from "./ContactsTab"; 
import { DatesTab } from "./DatesTab";

interface LeadTeamContactsDatesCardProps {
  leadId: string;
}

export function LeadTeamContactsDatesCard({ leadId }: LeadTeamContactsDatesCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Team & Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="team" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              Team
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs flex items-center gap-1">
              <Contact className="h-3 w-3" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="dates" className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Dates
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="team" className="mt-0">
            <div className="grid grid-cols-2 gap-x-4">
              <TeamTab leadId={leadId} />
            </div>
          </TabsContent>
          
          <TabsContent value="contacts" className="mt-0">
            <div className="grid grid-cols-2 gap-x-4">
              <ContactsTab leadId={leadId} />
            </div>
          </TabsContent>
          
          <TabsContent value="dates" className="mt-0">
            <div className="grid grid-cols-2 gap-x-4">
              <DatesTab leadId={leadId} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}