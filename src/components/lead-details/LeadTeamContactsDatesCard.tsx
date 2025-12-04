import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Contact, Home, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DTITab } from "./DTITab";
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
            <CardTitle className="text-base font-medium">DTI, Contacts & Address</CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="dti" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-2">
                <TabsTrigger value="dti" className="text-xs flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  DTI
                </TabsTrigger>
                <TabsTrigger value="contacts" className="text-xs flex items-center gap-1">
                  <Contact className="h-3 w-3" />
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="dates" className="text-xs flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Address
                </TabsTrigger>
                <TabsTrigger value="piti" className="text-xs flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  PITI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="dti" className="mt-0">
                <DTITab leadId={leadId} />
              </TabsContent>
              
              <TabsContent value="contacts" className="mt-0">
                <ContactsTab leadId={leadId} />
              </TabsContent>
              
              <TabsContent value="dates" className="mt-0">
                <DatesTab leadId={leadId} />
              </TabsContent>
              
              <TabsContent value="piti" className="mt-0">
                <PITITab leadId={leadId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}