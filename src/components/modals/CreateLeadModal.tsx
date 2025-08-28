import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { databaseService, type LeadInsert, type User, type Contact, type PipelineStage } from '@/services/database';

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
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    source: '' as any,
    referred_via: '' as any,
    lead_on_date: new Date().toISOString().split('T')[0],
    status: 'Working on it' as any,
    teammate_assigned: '',
    buyer_agent_id: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [usersData, contactsData, stagesData] = await Promise.all([
        databaseService.getUsers(),
        databaseService.getContacts(),
        databaseService.getPipelineStages(),
      ]);
      
      setUsers(usersData);
      setContacts(contactsData.filter(c => c.type === 'Agent' || c.type === 'Realtor'));
      setPipelineStages(stagesData);
      
      // Set current user as default teammate if not already set
      if (user && !formData.teammate_assigned) {
        const currentUser = usersData.find(u => u.email === user.email);
        if (currentUser) {
          setFormData(prev => ({ ...prev, teammate_assigned: currentUser.id }));
        }
      }
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
      
      const leadData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        // Set defaults for other fields
        pipeline_stage_id: leadsStage?.id || null,
        teammate_assigned: user ? users.find(u => u.email === user.email)?.id || null : null,
        status: 'Working on it' as any,
        referred_via: 'Email' as any,
        referral_source: 'Agent' as any,
        lead_strength: 'Warm' as any,
        converted: 'Working on it' as any,
        lead_on_date: new Date().toISOString().split('T')[0],
      };

      const newLead = await databaseService.createLead(leadData);
      console.log('[DEBUG] Lead created successfully:', newLead);
      
      onLeadCreated(newLead);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        source: '',
        referred_via: '',
        lead_on_date: new Date().toISOString().split('T')[0],
        status: 'Working on it',
        teammate_assigned: '',
        buyer_agent_id: '',
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
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
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