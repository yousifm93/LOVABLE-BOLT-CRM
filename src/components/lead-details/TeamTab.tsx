import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditContact } from "@/components/ui/inline-edit-contact";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: string;
  account_executive: string | null;
  account_executive_email: string | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
}

interface TeamAssignment {
  role: string;
  user_id: string | null;
  lender_id: string | null;
  contact_id: string | null;
  lender?: Lender;
  contact?: Contact;
}

interface TeamTabProps {
  leadId: string;
}

const TEAM_ROLES = [
  { key: 'lender', label: 'Lender', type: 'lender' },
  { key: 'account_executive', label: 'Account Executive', type: 'readonly' },
];

function TeamRoleRow({ 
  role, 
  label, 
  type,
  assignment, 
  lenders,
  contacts,
  lenderAssignment,
  onAssign, 
  onRemove 
}: {
  role: string;
  label: string;
  type: string;
  assignment?: TeamAssignment;
  lenders: Lender[];
  contacts: Contact[];
  lenderAssignment?: TeamAssignment;
  onAssign: (role: string, entityId: string, entityType: 'lender' | 'contact') => void;
  onRemove: (role: string) => void;
}) {
  
  // For readonly account executive, derive from lender
  if (type === 'readonly') {
    const lender = lenderAssignment?.lender;
    return (
      <div className="py-3 border-b last:border-0">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-sm text-muted-foreground pl-5">
          {lender?.account_executive 
            ? `${lender.account_executive}${lender.account_executive_email ? ` (${lender.account_executive_email})` : ''}`
            : 'Select lender first'}
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        {assignment && type !== 'readonly' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(role)}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive ml-auto"
          >
            <User className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="pl-5">
        {type === 'lender' ? (
          <InlineEditApprovedLender
            value={assignment?.lender || null}
            lenders={lenders}
            onValueChange={(lender) => lender && onAssign(role, lender.id, 'lender')}
            placeholder="Select lender..."
          />
        ) : type === 'contact' ? (
          <InlineEditContact
            value={assignment?.contact_id || null}
            contacts={contacts}
            onValueChange={(value) => value && onAssign(role, value, 'contact')}
            placeholder="Select contact..."
          />
        ) : null}
      </div>
    </div>
  );
}

export function TeamTab({ leadId }: TeamTabProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([loadAssignments(), loadLenders(), loadContacts()]);
  }, [leadId]);

  const loadAssignments = async () => {
    console.log('[DISABLED] Team assignments feature - table deleted');
    setAssignments([]);
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
      toast({
        title: "Error",
        description: "Failed to load lenders",
        variant: "destructive",
      });
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company, email')
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

  const handleAssign = async (role: string, entityId: string, entityType: 'lender' | 'contact') => {
    toast({
      title: "Feature Disabled",
      description: "Team assignments table has been removed",
      variant: "destructive",
    });
  };

  const handleRemove = async (role: string) => {
    toast({
      title: "Feature Disabled",
      description: "Team assignments table has been removed",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {TEAM_ROLES.map(role => (
          <div key={role.key} className="h-8 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const lenderAssignment = assignments.find(a => a.role === 'lender');

  return (
    <div className="space-y-1">
      {TEAM_ROLES.map(role => {
        const assignment = assignments.find(a => a.role === role.key);
        
        return (
          <TeamRoleRow
            key={role.key}
            role={role.key}
            label={role.label}
            type={role.type}
            assignment={assignment}
            lenders={lenders}
            contacts={contacts}
            lenderAssignment={lenderAssignment}
            onAssign={handleAssign}
            onRemove={handleRemove}
          />
        );
      })}
    </div>
  );
}