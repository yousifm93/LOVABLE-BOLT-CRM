import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InlineEditAgent } from '@/components/ui/inline-edit-agent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { databaseService, type LeadInsert, type User, type Contact, type PipelineStage } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';

// Format date as YYYY-MM-DD in local timezone
const formatLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: (lead: any) => void;
}

export function CreateLeadModal({ open, onOpenChange, onLeadCreated }: CreateLeadModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const [buyerAgents, setBuyerAgents] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    source: 'none' as any,
    referred_via: 'none' as any,
    lead_on_date: formatLocalDate(new Date()),
    status: 'Working on it' as any,
    teammate_assigned: '', // Will be set to current user on submit
    buyer_agent_id: '',
    task_eta: formatLocalDate(new Date()),
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [usersData, contactsData, stagesData, agentsData] = await Promise.all([
        databaseService.getUsers(),
        databaseService.getContacts(),
        databaseService.getPipelineStages(),
        databaseService.getBuyerAgents(),
      ]);
      
      setUsers(usersData);
      setContacts(contactsData.filter(c => c.type === 'Agent' || c.type === 'Realtor'));
      setPipelineStages(stagesData);
      setBuyerAgents(agentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[DEBUG] Submitting lead creation with data:', formData);
      
      // Find the "Leads" pipeline stage
      const leadsStage = pipelineStages.find(stage => stage.name === 'Leads');
      
      // Get current authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;

      const leadData = {
        first_name: formData.first_name,
        last_name: formData.last_name || '',
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        buyer_agent_id: formData.buyer_agent_id || null,
        task_eta: formData.task_eta,
        // Set defaults for other fields
      pipeline_stage_id: leadsStage?.id || null,
      teammate_assigned: currentUserId, // Set to current authenticated user
      status: 'Working on it' as any,
      referred_via: formData.referred_via === 'none' ? null : formData.referred_via,
      referral_source: formData.source === 'none' ? null : formData.source,
        lead_strength: 'Warm' as any,
        converted: 'Working on it' as any,
        lead_on_date: formatLocalDate(new Date()),
      };

      const newLead = await databaseService.createLead(leadData);
      console.log('[DEBUG] Lead created successfully:', newLead);
      
      // If notes were provided, create a note record
      if (formData.notes.trim() && newLead.id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authorId = session?.user?.id 
            ? users.find(u => u.email === session.user.email)?.id || null
            : null;
          
          await databaseService.createNote({
            lead_id: newLead.id,
            author_id: authorId,
            body: formData.notes,
          });
          console.log('[DEBUG] Note created successfully', authorId ? `by user ${authorId}` : 'without author');
        } catch (noteError) {
          console.error('[DEBUG] Error creating note:', noteError);
          toast({
            title: 'Warning',
            description: 'Lead created but note could not be saved',
            variant: 'destructive',
          });
        }
      }
      
      onLeadCreated(newLead);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        source: 'none',
        referred_via: 'none',
        lead_on_date: formatLocalDate(new Date()),
        status: 'Working on it',
        teammate_assigned: '',
        buyer_agent_id: '',
        task_eta: formatLocalDate(new Date()),
        notes: '',
      });

      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });
    } catch (error: any) {
      console.error('[DEBUG] Error creating lead:', error);
      
      // Enhanced error logging for development
      if (process.env.NODE_ENV === 'development') {
        console.error('[DEBUG] Full Supabase error details:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          status: error?.status,
        });
        
        // Show detailed error in dev mode
        toast({
          title: "Development Error Details",
          description: `Code: ${error?.code || 'Unknown'} - ${error?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      } else {
        // Production error message
        toast({
          title: "Error",
          description: "Failed to create lead. Please try again.",
          variant: "destructive",
        });
      }
      
      // Keep modal open on failure to allow retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_agent_id">Real Estate Agent</Label>
              <InlineEditAgent
                value={buyerAgents.find(a => a.id === formData.buyer_agent_id) || null}
                agents={buyerAgents}
                onValueChange={(agent) => setFormData(prev => ({ 
                  ...prev, 
                  buyer_agent_id: agent?.id || '' 
                }))}
                placeholder="Select agent (optional)"
                className="w-full border rounded-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_eta">Due Date</Label>
              <Input
                id="task_eta"
                type="date"
                value={formData.task_eta}
                onChange={(e) => setFormData(prev => ({ ...prev, task_eta: e.target.value }))}
              />
            </div>
          </div>

          <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between p-2 h-auto">
                <span className="text-sm font-medium">Advanced Options</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="teammate_assigned">Assign User</Label>
                <Select
                  value={formData.teammate_assigned}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teammate_assigned: value }))}
                >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                  ) : (
                    users.filter(u => u.is_assignable !== false).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referred_via">Referral Method</Label>
                  <Select
                    value={formData.referred_via || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, referred_via: value === "none" ? null : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source">Referral Source</Label>
                  <Select
                    value={formData.source || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, source: value === "none" ? null : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}