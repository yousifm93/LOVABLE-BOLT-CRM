import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, ChevronDown, Paperclip, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/ui/voice-recorder";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

interface BulkLead {
  first_name: string;
  last_name: string;
  notes: string;
  buyer_agent_id: string | null;
}

export function CreateLeadModalModern({ open, onOpenChange, onLeadCreated }: CreateLeadModalProps) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    lead_on_date: new Date(),
    buyer_agent_id: null as string | null,
    task_eta: new Date(),
    teammate_assigned: "",
    referred_via: "none" as any,
    source: "none" as any,
  });
  const [bulkLeads, setBulkLeads] = useState<BulkLead[]>([{
    first_name: "",
    last_name: "",
    notes: "",
    buyer_agent_id: null,
  }]);
  const [loading, setLoading] = useState(false);
  const [buyerAgents, setBuyerAgents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [agentsData, usersData] = await Promise.all([
        databaseService.getBuyerAgents(),
        databaseService.getUsers(),
      ]);
      setBuyerAgents(agentsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTranscriptionComplete = (text: string) => {
    const separator = formData.notes.trim() ? '\n\n---\n\n' : '';
    setFormData(prev => ({
      ...prev,
      notes: prev.notes + separator + text
    }));
  };

  const handleImagePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains image data
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) {
      // No images in clipboard, allow normal paste behavior
      return;
    }

    // Prevent default paste behavior for images
    e.preventDefault();

    for (const item of imageItems) {
      const blob = item.getAsFile();
      if (!blob) continue;

      // Validate file size (10MB limit)
      if (blob.size > 10 * 1024 * 1024) {
        toast({
          title: 'Image Too Large',
          description: 'Pasted image exceeds 10MB limit.',
          variant: 'destructive',
        });
        continue;
      }

      // Check if we've reached the 5 file limit
      if (selectedFiles.length >= 5) {
        toast({
          title: 'Too Many Files',
          description: 'Maximum 5 files allowed.',
          variant: 'destructive',
        });
        break;
      }

      // Generate filename based on timestamp and MIME type
      const timestamp = Date.now();
      const extension = blob.type.split('/')[1] || 'png';
      const filename = `pasted-image-${timestamp}.${extension}`;

      // Create File object from blob
      const file = new File([blob], filename, { type: blob.type });

      // Add to selectedFiles
      setSelectedFiles(prev => [...prev, file]);

      toast({
        title: 'Image Attached',
        description: `Image pasted and added to attachments.`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'single') {
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
          teammate_assigned: formData.teammate_assigned || 'b06a12ea-00b9-4725-b368-e8a416d4028d',
          referred_via: formData.referred_via === 'none' ? null : formData.referred_via,
          referral_source: formData.source === 'none' ? null : formData.source,
          interest_rate: 7.0,
          term: 360,
          loan_type: 'Purchase',
        });

        if (formData.notes.trim() && newLead.id) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const authorId = session?.user?.id || null;
            
            await databaseService.createNote({
              lead_id: newLead.id,
              author_id: authorId,
              body: formData.notes,
            });
          } catch (noteError) {
            console.error('Error creating note:', noteError);
            toast({
              title: 'Warning',
              description: 'Lead created but note could not be saved',
              variant: 'destructive',
            });
          }
        }

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
          teammate_assigned: "",
          referred_via: "none",
          source: "none",
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
    } else {
      // Bulk mode
      const validLeads = bulkLeads.filter(l => l.first_name.trim());
      
      if (validLeads.length === 0) {
        toast({
          title: "Error",
          description: "At least one lead must have a first name",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        let successCount = 0;
        let failCount = 0;

        for (const lead of validLeads) {
          try {
            await databaseService.createLead({
              first_name: lead.first_name,
              last_name: lead.last_name,
              phone: null,
              email: null,
              notes: lead.notes || null,
              lead_on_date: new Date().toISOString().split('T')[0],
              buyer_agent_id: lead.buyer_agent_id,
              task_eta: new Date().toISOString().split('T')[0],
              status: 'Working on it',
              teammate_assigned: 'b06a12ea-00b9-4725-b368-e8a416d4028d',
              referred_via: null,
              referral_source: null,
              interest_rate: 7.0,
              term: 360,
              loan_type: 'Purchase',
            });
            successCount++;
          } catch (error) {
            console.error("Error creating lead:", error);
            failCount++;
          }
        }

        if (successCount > 0) {
          toast({
            title: "Success",
            description: `${successCount} lead${successCount > 1 ? 's' : ''} created successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
          });
        }

        if (failCount === 0) {
          setBulkLeads([{
            first_name: "",
            last_name: "",
            notes: "",
            buyer_agent_id: null,
          }]);
          onLeadCreated();
          onOpenChange(false);
        }
      } catch (error) {
        console.error("Error creating leads:", error);
        toast({
          title: "Error",
          description: "Failed to create leads",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", mode === 'single' ? "sm:max-w-lg" : "sm:max-w-4xl")}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-left text-xl font-semibold">
              Create New Lead{mode === 'multiple' ? 's' : ''}
            </DialogTitle>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as any)} className="border rounded-md">
              <ToggleGroupItem value="single" className="px-3 py-1 text-sm">Single</ToggleGroupItem>
              <ToggleGroupItem value="multiple" className="px-3 py-1 text-sm">Multiple</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">{mode === 'single' ? (
          // Single Lead Mode
          <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="-"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="-"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="-"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="-"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_agent">Real Estate Agent</Label>
              <InlineEditAgent
                value={buyerAgents.find(a => a.id === formData.buyer_agent_id) || null}
                agents={buyerAgents}
                onValueChange={(agent) => setFormData({ 
                  ...formData, 
                  buyer_agent_id: agent?.id || null 
                })}
                placeholder="-"
                className="w-full border rounded-md"
              />
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
          </div>

          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 px-2 rounded-md transition-colors">
              <span className="text-sm font-medium">Advanced Options</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isAdvancedOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Assign User - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="teammate_assigned">Assign User</Label>
                <Select
                  value={formData.teammate_assigned}
                  onValueChange={(value) => setFormData({ ...formData, teammate_assigned: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.is_assignable !== false).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Referral Method and Referral Source - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referred_via">Referral Method</Label>
                  <Select
                    value={formData.referred_via || "none"}
                    onValueChange={(value) => setFormData({ ...formData, referred_via: value === "none" ? null : value })}
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
                    onValueChange={(value) => setFormData({ ...formData, source: value === "none" ? null : value })}
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
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              onPaste={handleImagePaste}
              placeholder="Enter any notes about this lead (you can also paste images here)"
              rows={3}
            />
          </div>

          {/* Hidden file input */}
          <input
            id="lead-file-input"
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files || []);
              const validFiles: File[] = [];
              
              for (const file of newFiles) {
                if (file.size > 10 * 1024 * 1024) {
                  toast({
                    title: 'File Too Large',
                    description: `${file.name} exceeds 10MB limit.`,
                    variant: 'destructive',
                  });
                  continue;
                }
                
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                if (!['.png', '.jpg', '.jpeg', '.pdf'].includes(extension)) {
                  toast({
                    title: 'Invalid File Type',
                    description: `${file.name} must be PNG, JPG, JPEG, or PDF.`,
                    variant: 'destructive',
                  });
                  continue;
                }
                
                validFiles.push(file);
              }
              
              const newFileList = [...selectedFiles, ...validFiles].slice(0, 5);
              if (selectedFiles.length + validFiles.length > 5) {
                toast({
                  title: 'Too Many Files',
                  description: `Maximum 5 files allowed.`,
                  variant: 'destructive',
                });
              }
              
              setSelectedFiles(newFileList);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* File previews */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 bg-muted/30 rounded-md p-3">
              <p className="text-xs text-muted-foreground font-medium">Attachments ({selectedFiles.length})</p>
              <div className="grid grid-cols-1 gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 bg-background rounded-md p-2 border"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {file.type.startsWith('image/') ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size < 1024 ? file.size + ' B' : 
                           file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : 
                           (file.size / (1024 * 1024)).toFixed(1) + ' MB'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-3 pt-4">
            <div className="flex gap-2">
              {/* Record button - Green circle position */}
              <VoiceRecorder
                onTranscriptionComplete={handleTranscriptionComplete}
                disabled={loading || uploadingFiles}
              />
              
              {/* Upload button - Purple circle position */}
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => document.getElementById('lead-file-input')?.click()}
                disabled={loading || uploadingFiles || selectedFiles.length >= 5}
                className="rounded-full w-10 h-10"
                title="Attach files"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
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
          </>
          ) : (
            // Multiple Leads Mode - Spreadsheet Style
            <div className="space-y-3">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40px] text-center">#</TableHead>
                      <TableHead className="w-[25%]">First Name *</TableHead>
                      <TableHead className="w-[25%]">Last Name</TableHead>
                      <TableHead className="w-[35%]">Notes</TableHead>
                      <TableHead className="w-[10%]">Agent</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkLeads.map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={lead.first_name}
                            onChange={(e) => {
                              const newLeads = [...bulkLeads];
                              newLeads[index].first_name = e.target.value;
                              setBulkLeads(newLeads);
                            }}
                            placeholder="First name"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={lead.last_name}
                            onChange={(e) => {
                              const newLeads = [...bulkLeads];
                              newLeads[index].last_name = e.target.value;
                              setBulkLeads(newLeads);
                            }}
                            placeholder="Last name"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={lead.notes}
                            onChange={(e) => {
                              const newLeads = [...bulkLeads];
                              newLeads[index].notes = e.target.value;
                              setBulkLeads(newLeads);
                            }}
                            placeholder="Notes"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 w-full justify-start text-left font-normal text-xs">
                                {lead.buyer_agent_id ? 
                                  (() => {
                                    const agent = buyerAgents.find(a => a.id === lead.buyer_agent_id);
                                    return agent ? `${agent.first_name} ${agent.last_name}` : "Select";
                                  })() : 
                                  "Select"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
                              <Command>
                                <CommandInput placeholder="Search agents..." />
                                <CommandList>
                                  <CommandEmpty>No agent found.</CommandEmpty>
                                  <CommandGroup>
                                    {buyerAgents.map((agent) => (
                                      <CommandItem
                                        key={agent.id}
                                        value={`${agent.first_name} ${agent.last_name}`}
                                        onSelect={() => {
                                          const newLeads = [...bulkLeads];
                                          newLeads[index].buyer_agent_id = agent.id;
                                          setBulkLeads(newLeads);
                                        }}
                                      >
                                        {agent.first_name} {agent.last_name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          {bulkLeads.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBulkLeads(bulkLeads.filter((_, i) => i !== index))}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkLeads([...bulkLeads, {
                  first_name: "",
                  last_name: "",
                  notes: "",
                  buyer_agent_id: null,
                }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : `Create ${bulkLeads.filter(l => l.first_name.trim()).length} Lead${bulkLeads.filter(l => l.first_name.trim()).length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}