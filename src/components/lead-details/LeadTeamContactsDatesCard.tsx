import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Contact, Calendar, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TeamTab } from "./TeamTab";
import { ContactsTab } from "./ContactsTab"; 
import { DatesTab } from "./DatesTab";
import { PITITab } from "./PITITab";

interface LeadTeamContactsDatesCardProps {
  leadId: string;
}

export function LeadTeamContactsDatesCard({ leadId }: LeadTeamContactsDatesCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <CardTitle className="text-base font-medium">Team, Contacts & Dates</CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="team" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
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
                <TabsTrigger value="piti" className="text-xs flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  PITI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="team" className="mt-0 min-h-[280px]">
                <div className="grid grid-cols-2 gap-x-4">
                  <TeamTab leadId={leadId} />
                </div>
              </TabsContent>
              
              <TabsContent value="contacts" className="mt-0 min-h-[280px]">
                <div className="grid grid-cols-2 gap-x-4">
                  <ContactsTab leadId={leadId} />
                </div>
              </TabsContent>
              
              <TabsContent value="dates" className="mt-0 min-h-[280px]">
                <div className="grid grid-cols-2 gap-x-4">
                  <DatesTab leadId={leadId} />
                </div>
              </TabsContent>
              
              <TabsContent value="piti" className="mt-0 min-h-[280px]">
                <PITITab leadId={leadId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}