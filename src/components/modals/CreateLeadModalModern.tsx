import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/ui/voice-recorder";
import { LeadAttachmentUpload } from "@/components/ui/lead-attachment-upload";

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

export function CreateLeadModalModern({ open, onOpenChange, onLeadCreated }: CreateLeadModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    lead_on_date: new Date(),
    buyer_agent_id: null as string | null,
    task_eta: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [buyerAgents, setBuyerAgents] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadBuyerAgents();
    }
  }, [open]);

  const loadBuyerAgents = async () => {
    try {
      const agents = await databaseService.getBuyerAgents();
      setBuyerAgents(agents || []);
    } catch (error) {
      console.error('Error loading buyer agents:', error);
    }
  };

  const handleTranscriptionComplete = (text: string) => {
    const separator = formData.notes.trim() ? '\n\n---\n\n' : '';
    setFormData(prev => ({
      ...prev,
      notes: prev.notes + separator + text
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim()) {
      toast({
        title: "Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newLead = await databaseService.createLead({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        email: formData.email || null,
        notes: formData.notes || null,
        lead_on_date: `${formData.lead_on_date.getFullYear()}-${String(formData.lead_on_date.getMonth() + 1).padStart(2, '0')}-${String(formData.lead_on_date.getDate()).padStart(2, '0')}`,
        buyer_agent_id: formData.buyer_agent_id,
        task_eta: `${formData.task_eta.getFullYear()}-${String(formData.task_eta.getMonth() + 1).padStart(2, '0')}-${String(formData.task_eta.getDate()).padStart(2, '0')}`,
        status: 'Working on it',
        teammate_assigned: 'b06a12ea-00b9-4725-b368-e8a416d4028d', // Yousif Mohamed
        interest_rate: 7.0,
        term: 360,
        loan_type: 'Purchase',
      });

      // If notes were provided, create a note record
      if (formData.notes.trim() && newLead.id) {
        try {
          // Get current user ID from session
          const { data: { session } } = await supabase.auth.getSession();
          const authorId = session?.user?.id || null;
          
          await databaseService.createNote({
            lead_id: newLead.id,
            author_id: authorId,
            body: formData.notes,
          });
          console.log('Note created successfully', authorId ? `by user ${authorId}` : 'without author');
        } catch (noteError) {
          console.error('Error creating note:', noteError);
          toast({
            title: 'Warning',
            description: 'Lead created but note could not be saved',
            variant: 'destructive',
          });
        }
      }

      // Upload attached files
      if (selectedFiles.length > 0 && newLead.id) {
        setUploadingFiles(true);
        try {
          for (const file of selectedFiles) {
            await databaseService.uploadLeadDocument(
              newLead.id,
              file,
              { 
                title: "Lead Attachment",
                notes: "Uploaded during lead creation"
              }
            );
          }
          toast({
            title: "Success",
            description: `${selectedFiles.length} file(s) attached to lead`
          });
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          toast({
            title: 'Warning',
            description: 'Lead created but some files could not be uploaded',
            variant: 'destructive',
          });
        } finally {
          setUploadingFiles(false);
        }
      }

      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        notes: "",
        lead_on_date: new Date(),
        buyer_agent_id: null,
        task_eta: new Date(),
      });
      setSelectedFiles([]);
      
      onLeadCreated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating lead:', err);
      toast({
        title: "Failed to create lead",
        description: `${err?.message || 'Unknown error'}${err?.details ? ' — ' + err.details : ''}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Create New Lead
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer_agent">Real Estate Agent</Label>
            <Select
              value={formData.buyer_agent_id || ""}
              onValueChange={(value) => setFormData({ ...formData, buyer_agent_id: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {buyerAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.first_name} {agent.last_name}
                    {agent.brokerage ? ` - ${agent.brokerage}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_eta">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.task_eta && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.task_eta ? format(formData.task_eta, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.task_eta}
                  onSelect={(date) => date && setFormData({ ...formData, task_eta: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_on_date">Lead On Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.lead_on_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.lead_on_date ? format(formData.lead_on_date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.lead_on_date}
                  onSelect={(date) => date && setFormData({ ...formData, lead_on_date: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter any notes about this lead"
              rows={3}
            />
          </div>

          <LeadAttachmentUpload
            files={selectedFiles}
            onFilesChange={setSelectedFiles}
            disabled={loading || uploadingFiles}
          />

          <div className="flex justify-between items-center gap-3 pt-4">
            <div className="flex gap-2">
              <VoiceRecorder
                onTranscriptionComplete={handleTranscriptionComplete}
                disabled={loading || uploadingFiles}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingFiles}
              >
                {loading ? "Creating..." : uploadingFiles ? "Uploading..." : "Create Lead"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}