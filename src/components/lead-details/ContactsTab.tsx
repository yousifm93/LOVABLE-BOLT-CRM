import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, X, Plus, Building, User, Phone, Mail, ClipboardCheck, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { databaseService } from "@/services/database";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: string;
  account_executive: string | null;
  account_executive_email: string | null;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  brokerage?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  type: string;
}

interface ExternalContact {
  type: string;
  contact_id: string;
  contact?: Contact;
}

interface ContactsTabProps {
  leadId: string;
  lead?: any;
  onLeadUpdated?: () => void;
}

const CONTACT_TYPES = [
  { key: 'buyer_agent', label: "Buyer's Agent", icon: User, type: 'agent' },
  { key: 'listing_agent', label: 'Listing Agent', icon: User, type: 'agent' },
  { key: 'lender', label: 'Lender', icon: Landmark, type: 'lender' },
  { key: 'account_executive', label: 'Account Executive', icon: User, type: 'readonly' },
  { key: 'title', label: 'Title Company', icon: Building, type: 'contact' },
  { key: 'insurance', label: 'Insurance Provider', icon: Building, type: 'contact' },
  { key: 'appraisal', label: 'Appraisal Company', icon: ClipboardCheck, type: 'contact' },
];

function ContactRow({ type, label, icon: Icon, assignment, contacts, onAssign, onRemove, onAddNew }: {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  assignment?: ExternalContact;
  contacts: Contact[];
  onAssign: (type: string, contactId: string) => void;
  onRemove: (type: string) => void;
  onAddNew: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  
  const selectedContact = assignment?.contact;
  const filteredContacts = contacts.filter(contact => 
    contact.type === 'lender' || contact.type === 'agent' || contact.type === 'vendor'
  );

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        {assignment && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(type)}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive ml-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {assignment ? (
        <div className="text-sm text-muted-foreground pl-5">
          <div>
            {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : 'Unknown Contact'}
          </div>
          {selectedContact?.company && (
            <div className="text-xs">{selectedContact.company}</div>
          )}
        </div>
      ) : (
        <div className="pl-5 flex items-center gap-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between text-xs h-8"
              >
                Select contact...
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search contacts..." className="h-8" />
                <CommandList>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`${contact.first_name} ${contact.last_name} ${contact.company || ''}`}
                        onSelect={() => {
                          onAssign(type, contact.id);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-3 w-3 opacity-0")} />
                        <div className="flex flex-col">
                          <span className="text-sm">{contact.first_name} {contact.last_name}</span>
                          {contact.company && (
                            <span className="text-xs text-muted-foreground">{contact.company}</span>
                          )}
                          {contact.email && (
                            <span className="text-xs text-muted-foreground">{contact.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddNew(type)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AddContactModal({ isOpen, onClose, onSave, contactType }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Omit<Contact, 'id'>) => void;
  contactType: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    onSave({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      type: contactType === 'buyers_agent' || contactType === 'listing_agent' ? 'agent' : 'vendor',
    });
    
    // Reset form
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompany("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!firstName.trim() || !lastName.trim()}>
            Save Contact
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsTab({ leadId, lead, onLeadUpdated }: ContactsTabProps) {
  const [assignments, setAssignments] = useState<ExternalContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [leadData, setLeadData] = useState<any>(lead || null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([loadLeadData(), loadContacts(), loadAgents(), loadLenders()]);
  }, [leadId]);

  // Update local state when lead prop changes - include embedded objects
  useEffect(() => {
    if (lead) {
      setLeadData({
        ...lead,
        buyer_agent_id: lead.buyer_agent_id,
        listing_agent_id: lead.listing_agent_id,
        approved_lender_id: lead.approved_lender_id,
        buyer_agent: lead.buyer_agent,
        listing_agent: lead.listing_agent,
        approved_lender: lead.approved_lender,
      });
    }
  }, [lead]);

  const loadLeadData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          buyer_agent_id, 
          listing_agent_id, 
          approved_lender_id,
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(*),
          listing_agent:buyer_agents!leads_listing_agent_id_fkey(*),
          approved_lender:lenders!leads_approved_lender_id_fkey(*)
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLeadData((prev: any) => ({ 
        ...prev, 
        ...data,
        buyer_agent: data.buyer_agent,
        listing_agent: data.listing_agent,
        approved_lender: data.approved_lender,
      }));
    } catch (error) {
      console.error('Error loading lead data:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company, type')
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await databaseService.getBuyerAgents();
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadLenders = async () => {
    try {
      const { data, error } = await supabase
        .from('lenders')
        .select('*')
        .order('lender_name');

      if (error) throw error;
      setLenders(data || []);
    } catch (error) {
      console.error('Error loading lenders:', error);
    }
  };

  const handleAgentChange = async (fieldName: 'buyer_agent_id' | 'listing_agent_id', agent: Agent | null) => {
    try {
      await databaseService.updateLead(leadId, { [fieldName]: agent?.id || null });
      // Update both ID and embedded object in local state
      const embeddedFieldName = fieldName === 'buyer_agent_id' ? 'buyer_agent' : 'listing_agent';
      setLeadData((prev: any) => ({ 
        ...prev, 
        [fieldName]: agent?.id || null,
        [embeddedFieldName]: agent 
      }));
      onLeadUpdated?.();
      toast({
        title: "Updated",
        description: "Agent updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update agent",
        variant: "destructive",
      });
    }
  };

  const handleLenderChange = async (lender: Lender | null) => {
    try {
      await databaseService.updateLead(leadId, { approved_lender_id: lender?.id || null });
      // Update both ID and embedded object in local state
      setLeadData((prev: any) => ({ 
        ...prev, 
        approved_lender_id: lender?.id || null,
        approved_lender: lender 
      }));
      onLeadUpdated?.();
      toast({
        title: "Updated",
        description: "Lender updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update lender",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = (type: string) => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const handleSaveNewContact = async (contactData: Omit<Contact, 'id'>) => {
    try {
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          type: contactData.type as any
        })
        .select()
        .single();

      if (createError) throw createError;
      await loadContacts();
      
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error", 
        description: "Failed to create contact",
        variant: "destructive",
      });
    }
  };

  // Get current agent/lender values - prioritize embedded objects from lead prop
  const buyerAgent = leadData?.buyer_agent || agents.find(a => a.id === leadData?.buyer_agent_id) || null;
  const listingAgent = leadData?.listing_agent || agents.find(a => a.id === leadData?.listing_agent_id) || null;
  const selectedLender = leadData?.approved_lender || lenders.find(l => l.id === leadData?.approved_lender_id) || null;

  if (loading) {
    return (
      <div className="space-y-2">
        {CONTACT_TYPES.map(type => (
          <div key={type.key} className="h-8 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {CONTACT_TYPES.map(contactType => {
          // Handle buyer's agent
          if (contactType.key === 'buyer_agent') {
            return (
              <div key={contactType.key} className="py-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <contactType.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{contactType.label}</span>
                </div>
                <div className="pl-5">
                  <InlineEditAgent
                    value={buyerAgent}
                    agents={agents}
                    onValueChange={(agent) => handleAgentChange('buyer_agent_id', agent)}
                    placeholder="Select buyer's agent..."
                    type="buyer"
                  />
                </div>
              </div>
            );
          }

          // Handle listing agent
          if (contactType.key === 'listing_agent') {
            return (
              <div key={contactType.key} className="py-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <contactType.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{contactType.label}</span>
                </div>
                <div className="pl-5">
                  <InlineEditAgent
                    value={listingAgent}
                    agents={agents}
                    onValueChange={(agent) => handleAgentChange('listing_agent_id', agent)}
                    placeholder="Select listing agent..."
                    type="listing"
                  />
                </div>
              </div>
            );
          }

          // Handle lender type
          if (contactType.type === 'lender') {
            return (
              <div key={contactType.key} className="py-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <contactType.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{contactType.label}</span>
                </div>
                <div className="pl-5">
                  <InlineEditApprovedLender
                    value={selectedLender}
                    lenders={lenders}
                    onValueChange={(lender) => handleLenderChange(lender as Lender | null)}
                    placeholder="Select lender..."
                  />
                </div>
              </div>
            );
          }

          // Handle readonly account executive
          if (contactType.type === 'readonly') {
            return (
              <div key={contactType.key} className="py-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <contactType.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{contactType.label}</span>
                </div>
                <div className="text-sm text-muted-foreground pl-5">
                  {selectedLender?.account_executive 
                    ? `${selectedLender.account_executive}${selectedLender.account_executive_email ? ` (${selectedLender.account_executive_email})` : ''}`
                    : 'Select lender first'}
                </div>
              </div>
            );
          }

          const assignment = assignments.find(a => a.type === contactType.key);
          
          return (
            <ContactRow
              key={contactType.key}
              type={contactType.key}
              label={contactType.label}
              icon={contactType.icon}
              assignment={assignment}
              contacts={contacts}
              onAssign={() => {}}
              onRemove={() => {}}
              onAddNew={handleAddNew}
            />
          );
        })}
      </div>

      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveNewContact}
        contactType={addModalType}
      />
    </>
  );
}