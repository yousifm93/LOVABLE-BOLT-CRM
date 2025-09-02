import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TeamAssignment {
  role: string;
  user_id: string;
  user?: TeamMember;
}

interface TeamTabProps {
  leadId: string;
}

const TEAM_ROLES = [
  { key: 'loan_officer', label: 'Loan Officer' },
  { key: 'loa1', label: 'LOA 1' },
  { key: 'loa2', label: 'LOA 2' },
  { key: 'processor', label: 'Processor' },
  { key: 'underwriting1', label: 'Underwriting 1' },
];

function TeamRoleRow({ role, label, assignment, users, onAssign, onRemove }: {
  role: string;
  label: string;
  assignment?: TeamAssignment;
  users: TeamMember[];
  onAssign: (role: string, userId: string) => void;
  onRemove: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(assignment?.user_id || "");

  const selectedUser = users.find(user => user.id === value);

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <User className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium min-w-0 truncate">{label}</span>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {assignment ? (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Unknown User'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(role)}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[150px] justify-between text-xs h-7"
              >
                {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : "Select user..."}
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search users..." className="h-8" />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.first_name} ${user.last_name} ${user.email}`}
                        onSelect={() => {
                          setValue(user.id);
                          onAssign(role, user.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3 w-3",
                            value === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{user.first_name} {user.last_name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export function TeamTab({ leadId }: TeamTabProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([loadAssignments(), loadUsers()]);
  }, [leadId]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('team_assignments')
        .select(`
          role,
          user_id,
          user:users!team_assignments_user_id_fkey(id, first_name, last_name, email)
        `)
        .eq('lead_id', leadId);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading team assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load team assignments",
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error", 
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (role: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('team_assignments')
        .upsert({
          lead_id: leadId,
          role,
          user_id: userId,
        }, {
          onConflict: 'lead_id,role'
        });

      if (error) throw error;

      await loadAssignments();
      toast({
        title: "Success",
        description: "Team member assigned successfully",
      });
    } catch (error) {
      console.error('Error assigning team member:', error);
      toast({
        title: "Error",
        description: "Failed to assign team member", 
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (role: string) => {
    try {
      const { error } = await supabase
        .from('team_assignments')
        .delete()
        .eq('lead_id', leadId)
        .eq('role', role);

      if (error) throw error;

      await loadAssignments();
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
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

  return (
    <div className="space-y-1">
      {TEAM_ROLES.map(role => {
        const assignment = assignments.find(a => a.role === role.key);
        
        return (
          <TeamRoleRow
            key={role.key}
            role={role.key}
            label={role.label}
            assignment={assignment}
            users={users}
            onAssign={handleAssign}
            onRemove={handleRemove}
          />
        );
      })}
      
      {assignments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No team members assigned
        </p>
      )}
    </div>
  );
}