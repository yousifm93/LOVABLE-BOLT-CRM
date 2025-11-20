import { useState } from "react";
import * as React from "react";
import { format } from "date-fns";
import { X, Phone, MessageSquare, Mail, FileText, Plus, Upload, User, MapPin, Building2, Calendar, FileCheck, Clock, Check, Send, Paperclip, Circle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CRMClient, PipelineStage, PIPELINE_STAGES, PIPELINE_CONFIGS, Activity, Task, Document } from "@/types/crm";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { CallLogModal, SmsLogModal, EmailLogModal, AddNoteModal } from "@/components/modals/ActivityLogModals";
import { NoteDetailModal } from "@/components/modals/NoteDetailModal";
import { useToast } from "@/hooks/use-toast";
import { LeadTeamContactsDatesCard } from "@/components/lead-details/LeadTeamContactsDatesCard";
import { LeadThirdPartyItemsCard } from "@/components/lead-details/LeadThirdPartyItemsCard";
import { LeadCenterTabs } from "@/components/lead-details/LeadCenterTabs";
import { ContactInfoCard } from "@/components/lead-details/ContactInfoCard";
import { SendEmailTemplatesCard } from "@/components/lead-details/SendEmailTemplatesCard";
import { PipelineStageBar } from "@/components/PipelineStageBar";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { getDatabaseFieldName } from "@/types/crm";
import { formatDateModern, formatDateForInput } from "@/utils/dateUtils";

interface ClientDetailDrawerProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (clientId: number, newStage: PipelineStage) => void;
  pipelineType: 'leads' | 'active' | 'past-clients';
  onLeadUpdated?: () => void | Promise<void>;
}

export function ClientDetailDrawer({ client, isOpen, onClose, onStageChange, pipelineType, onLeadUpdated }: ClientDetailDrawerProps) {
  // Extract lead UUID - handle both CRMClient and database Lead objects
  const getLeadId = (): string | null => {
    // Check if it's a database Lead object (has UUID id directly)
    if ((client as any).id && typeof (client as any).id === 'string') {
      const uuid = (client as any).id;
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(uuid)) {
        console.log('[ClientDetailDrawer] Extracted leadId from client.id:', uuid);
        return uuid;
      }
    }
    // Check if it's a CRMClient with databaseId
    if (client.databaseId) {
      console.log('[ClientDetailDrawer] Extracted leadId from client.databaseId:', client.databaseId);
      return client.databaseId;
    }
    // No valid UUID found
    console.warn('[ClientDetailDrawer] No valid leadId found. Client object:', client);
    return null;
  };

  const leadId = getLeadId();

  const [newNote, setNewNote] = useState("");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showSmsLogModal, setShowSmsLogModal] = useState(false);
  const [showEmailLogModal, setShowEmailLogModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Activity | null>(null);
  const [showNoteDetailModal, setShowNoteDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  
  // Local state for gray section fields to reflect updates immediately
  const [localStatus, setLocalStatus] = useState(client.ops.status || 'Pending App');
  const [localPriority, setLocalPriority] = useState((client as any).priority || 'Medium');
  const [localLikelyToApply, setLocalLikelyToApply] = useState((client as any).likely_to_apply || 'Likely');
  const [localNotes, setLocalNotes] = useState((client as any).meta?.notes ?? (client as any).notes ?? '');
  const [localUpdatedAt, setLocalUpdatedAt] = useState((client as any).updated_at || new Date().toISOString());
  
  // About the Borrower editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Latest File Updates editing state
  const [localFileUpdates, setLocalFileUpdates] = useState((client as any).latest_file_updates ?? '');
  const [isEditingFileUpdates, setIsEditingFileUpdates] = useState(false);
  const [hasUnsavedFileUpdates, setHasUnsavedFileUpdates] = useState(false);
  const [isSavingFileUpdates, setIsSavingFileUpdates] = useState(false);
  
  // User info for timestamps
  const [notesUpdatedByUser, setNotesUpdatedByUser] = useState<any>(null);
  const [fileUpdatesUpdatedByUser, setFileUpdatesUpdatedByUser] = useState<any>(null);
  
  const { toast } = useToast();

  // Sync localNotes and fileUpdates when drawer opens or lead changes
  React.useEffect(() => {
    if (isOpen && leadId && !isEditingNotes && !isEditingFileUpdates) {
      const notes = (client as any).meta?.notes ?? (client as any).notes ?? '';
      const fileUpdates = (client as any).latest_file_updates ?? '';
      console.log('[ClientDetailDrawer] Syncing notes on drawer open. leadId:', leadId, 'notes:', notes);
      setLocalNotes(notes);
      setLocalFileUpdates(fileUpdates);
      setHasUnsavedNotes(false);
      setIsEditingNotes(false);
      setHasUnsavedFileUpdates(false);
      setIsEditingFileUpdates(false);
      
      // Load user info for timestamps
      if ((client as any).notes_updated_by) {
        loadUserInfo((client as any).notes_updated_by, setNotesUpdatedByUser);
      }
      if ((client as any).latest_file_updates_updated_by) {
        loadUserInfo((client as any).latest_file_updates_updated_by, setFileUpdatesUpdatedByUser);
      }
    }
  }, [isOpen, leadId, isEditingNotes, isEditingFileUpdates]);
  
  const loadUserInfo = async (userId: string, setter: (user: any) => void) => {
    try {
      const users = await databaseService.getUsers();
      const user = users?.find((u: any) => u.id === userId);
      if (user) setter(user);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  // Load activities and documents when drawer opens
  React.useEffect(() => {
    if (isOpen && leadId) {
      loadActivities();
      loadDocuments();
      loadLeadTasks();
    }
  }, [isOpen, leadId]);

  const loadActivities = async () => {
    if (!leadId) return;
    try {
      const fetchedActivities = await databaseService.getLeadActivities(leadId);
      // Transform to match Activity interface
        const transformedActivities = fetchedActivities.map((activity: any) => {
          // Handle tasks from database
          if (activity.type === 'task') {
            return {
              id: activity.id,
              type: 'task' as const,
              title: 'Task created',
              description: activity.body || `${activity.title}\n${activity.description || ''}`,
              timestamp: activity.created_at,
              user: activity.author ? `${activity.author.first_name} ${activity.author.last_name}` : 
                    activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'System',
              author_id: activity.author?.id || activity.user?.id,
              task_id: activity.id
            };
          }
          
          // Detect task creation logs from notes (legacy support)
          const isTaskLog = activity.type === 'note' && activity.body?.startsWith('Task created:');
          
          // Get description based on activity type
          let description = '';
          if (activity.type === 'email') {
            description = activity.snippet || '';
          } else if (activity.type === 'call') {
            description = activity.notes || '';
          } else if (activity.type === 'sms') {
            description = activity.body || '';
          } else if (activity.type === 'note') {
            if (isTaskLog) {
              // Format task details on multiple lines
              const lines = activity.body.split('\n');
              description = lines.join('\n');
            } else {
              description = activity.body || '';
            }
          }
          
          const activityType = isTaskLog ? 'task' : activity.type;
          
          return {
            id: activity.id,
            type: activityType,
            title: isTaskLog ? 'Task created' :
                   activity.type === 'note' ? 'Note added' : 
                   activity.type === 'call' ? 'Call logged' :
                   activity.type === 'sms' ? 'SMS logged' : 'Email logged',
            description,
            timestamp: activity.created_at,
            user: activity.author ? `${activity.author.first_name} ${activity.author.last_name}` :
                  activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'System',
            author_id: activity.author_id || activity.user_id,
            task_id: isTaskLog ? activity.body.split('\n')[0].replace('Task created: ', '') : null
          };
        });
      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      // Don't show toast error to avoid cluttering UI on open
    }
  };

  const loadDocuments = async () => {
    if (!leadId) return;
    try {
      const fetchedDocuments = await databaseService.getLeadDocuments(leadId);
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleLeadUpdate = async (fieldName: string, value: any) => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing. Cannot save field.",
        variant: "destructive",
      });
      return;
    }

    try {
      const dbFieldName = getDatabaseFieldName(fieldName);
      await databaseService.updateLead(leadId, { [dbFieldName]: value });
      
      // Update local state immediately so UI reflects the change
      const now = new Date().toISOString();
      setLocalUpdatedAt(now);
      
      if (fieldName === 'status') {
        setLocalStatus(value);
      } else if (fieldName === 'priority') {
        setLocalPriority(value);
      } else if (fieldName === 'likelyToApply') {
        setLocalLikelyToApply(value);
      } else if (fieldName === 'notes') {
        setLocalNotes(value);
      }
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      
      toast({
        title: "Field Updated",
        description: `${fieldName} has been updated successfully.`,
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${fieldName}.`,
        variant: "destructive",
      });
    }
  };

  // Critical status information based on pipeline stage
  const renderCriticalStatusInfo = () => {
    const stage = client.ops.stage;
    
    switch (stage) {
      case 'leads':
        return (
          <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
            <h4 className="font-medium text-sm mb-3">Lead Information</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Lead Status:</span>
                <InlineEditSelect
                  value={(client as any).converted || 'Working on it'}
                  onValueChange={(value) => handleLeadUpdate('converted', value)}
                  options={[
                    { value: 'Working on it', label: 'Working on it' },
                    { value: 'Pending App', label: 'Pending App' },
                    { value: 'Nurture', label: 'Nurture' },
                    { value: 'Dead', label: 'Dead' },
                    { value: 'Needs Attention', label: 'Needs Attention' },
                  ]}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Referral Method:</span>
                <InlineEditSelect
                  value={(client as any).referred_via || ''}
                  onValueChange={(value) => handleLeadUpdate('referred_via', value)}
                  options={[
                    { value: 'Email', label: 'Email' },
                    { value: 'Text', label: 'Text' },
                    { value: 'Call', label: 'Call' },
                    { value: 'Web', label: 'Web' },
                    { value: 'In-Person', label: 'In-Person' },
                  ]}
                  placeholder="Select method"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Referral Source:</span>
                <InlineEditSelect
                  value={(client as any).referral_source || ''}
                  onValueChange={(value) => handleLeadUpdate('referral_source', value)}
                  options={[
                    { value: 'Agent', label: 'Agent' },
                    { value: 'New Agent', label: 'New Agent' },
                    { value: 'Past Client', label: 'Past Client' },
                    { value: 'Personal', label: 'Personal' },
                    { value: 'Social', label: 'Social' },
                    { value: 'Miscellaneous', label: 'Miscellaneous' },
                  ]}
                  placeholder="Select source"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Monthly Payment Goal:</span>
                <InlineEditCurrency
                  value={(client as any).monthly_pmt_goal || null}
                  onValueChange={(value) => handleLeadUpdate('monthly_pmt_goal', value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Cash to Close Goal:</span>
                <InlineEditCurrency
                  value={(client as any).cash_to_close_goal || null}
                  onValueChange={(value) => handleLeadUpdate('cash_to_close_goal', value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Last Follow-Up:</span>
                <InlineEditDate
                  value={(client as any).last_follow_up_date || null}
                  onValueChange={(date) => handleLeadUpdate('last_follow_up_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select date"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Next Follow-Up:</span>
                <InlineEditDate
                  value={(client as any).task_eta || (client as any).dueDate || null}
                  onValueChange={(date) => handleLeadUpdate('task_eta', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select date"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Lead Created:</span>
                <span className="text-sm">{formatDateModern((client as any).created_at)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Last Updated:</span>
                <span className="text-sm">{formatDateModern((client as any).updated_at)}</span>
              </div>
            </div>
          </div>
        );
      case 'pending-app':
        return (
          <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
            <h4 className="font-medium text-sm mb-3">Application Status</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Current Status:</span>
                <InlineEditSelect
                  value={localStatus}
                  options={[
                    { value: 'Pending App', label: 'Pending App' },
                    { value: 'App Complete', label: 'App Complete' },
                    { value: 'Standby', label: 'Standby' },
                    { value: 'DNA', label: 'DNA' }
                  ]}
                  onValueChange={(value) => handleLeadUpdate('status', value)}
                  showAsStatusBadge
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Priority:</span>
                <InlineEditSelect
                  value={localPriority}
                  options={[
                    { value: 'High', label: 'High' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Low', label: 'Low' }
                  ]}
                  onValueChange={(value) => handleLeadUpdate('priority', value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Monthly Payment Goal:</span>
                <InlineEditCurrency
                  value={(client as any).monthly_pmt_goal || null}
                  onValueChange={(value) => handleLeadUpdate('monthly_pmt_goal', value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Cash to Close Goal:</span>
                <InlineEditCurrency
                  value={(client as any).cash_to_close_goal || null}
                  onValueChange={(value) => handleLeadUpdate('cash_to_close_goal', value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Last Follow-Up:</span>
                <InlineEditDate
                  value={(client as any).last_follow_up_date || null}
                  onValueChange={(date) => handleLeadUpdate('last_follow_up_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select date"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Next Follow-Up:</span>
                <InlineEditDate
                  value={(client as any).task_eta || (client as any).dueDate || null}
                  onValueChange={(date) => handleLeadUpdate('task_eta', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select date"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Follow-Ups Count:</span>
                <span className="text-lg font-bold text-primary">
                  {(client as any).follow_up_count || 0}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Pending App On:</span>
                <span className="text-sm">{formatDateModern((client as any).pending_app_at)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Lead Created:</span>
                <span className="text-sm">{formatDateModern((client as any).created_at)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Last Updated:</span>
                <span className="text-sm">{formatDateModern(localUpdatedAt)}</span>
              </div>
            </div>
          </div>
        );
      case 'screening':
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
             <h4 className="font-medium text-sm mb-3">Initial Verification</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Income type: {(client as any).incomeType || 'W2'}</div>
              <div>• Next step: {(client as any).nextStep || 'Income Verification'}</div>
              <div>• Verification status: In progress</div>
              <div>• Credit score range: 720-750</div>
              <div>• Documentation complete: 75%</div>
            </div>
          </div>
        );
      case 'pre-qualified':
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
             <h4 className="font-medium text-sm mb-3">Pre-Qualification Details</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Qualified amount: {(client as any).qualifiedAmount || 'N/A'}</div>
              <div>• DTI ratio: {(client as any).dti || 'N/A'}%</div>
              <div>• Expires: {(client as any).expirationDate || 'N/A'}</div>
              <div>• Interest rate range: 6.5% - 7.0%</div>
              <div>• Next step: Pre-approval documentation</div>
            </div>
          </div>
        );
      case 'pre-approved':
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
             <h4 className="font-medium text-sm mb-3">Pre-Approval Status</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Shopping status: {client.ops.status || 'New'}</div>
              <div>• Buyer's agent: {(client as any).buyersAgent || 'Not assigned'}</div>
              <div>• Agreement: {(client as any).buyersAgreement || 'Pending'}</div>
              <div>• House hunting active: Yes</div>
              <div>• Rate lock available: 60 days</div>
            </div>
          </div>
        );
      default:
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
             <h4 className="font-medium text-sm mb-3">Screening Status</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Current Status:</span>
                <InlineEditSelect
                  value={localStatus}
                  options={[
                    { value: 'Pending App', label: 'Pending App' },
                    { value: 'App Complete', label: 'App Complete' },
                    { value: 'Standby', label: 'Standby' },
                    { value: 'DNA', label: 'DNA' }
                  ]}
                  onValueChange={(value) => handleLeadUpdate('status', value)}
                  showAsStatusBadge
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Priority:</span>
                <InlineEditSelect
                  value={localPriority}
                  options={[
                    { value: 'High', label: 'High' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Low', label: 'Low' }
                  ]}
                  onValueChange={(value) => handleLeadUpdate('priority', value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[140px]">Last Updated:</span>
                <span className="text-sm">{formatDateModern(localUpdatedAt)}</span>
              </div>
              
              {/* Credit, Income & Assets Section */}
              <div className="pt-3 mt-3 border-t border-muted">
                <h4 className="font-medium text-sm mb-3">Credit, Income & Assets</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[140px]">Credit Score:</span>
                    <InlineEditNumber
                      value={(client as any).creditScore || null}
                      onValueChange={(value) => handleLeadUpdate('creditScore', value)}
                      placeholder="Enter score"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[140px]">Total Monthly Income:</span>
                    <InlineEditCurrency
                      value={(client as any).totalMonthlyIncome || null}
                      onValueChange={(value) => handleLeadUpdate('totalMonthlyIncome', value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[140px]">Total Assets:</span>
                    <InlineEditCurrency
                      value={(client as any).assets || null}
                      onValueChange={(value) => handleLeadUpdate('assets', value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[140px]">Monthly Liabilities:</span>
                    <InlineEditCurrency
                      value={(client as any).monthlyLiabilities || null}
                      onValueChange={(value) => handleLeadUpdate('monthlyLiabilities', value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[140px]">DTI Ratio:</span>
                    <InlineEditPercentage
                      value={(client as any).dti || null}
                      onValueChange={(value) => handleLeadUpdate('dti', value)}
                    />
                  </div>
                </div>
              </div>
            </div>
           </div>
        );
    }
  };

  if (!isOpen) return null;

  const currentStageIndex = PIPELINE_STAGES.findIndex(stage => stage.key === client.ops.stage);
  const fullName = `${client.person.firstName} ${client.person.lastName}`;
  const initials = `${client.person.firstName[0]}${client.person.lastName[0]}`;

  // Pipeline stage UUID mapping
  const STAGE_NAME_TO_ID: Record<string, string> = {
    'New': 'c54f417b-3f67-43de-80f5-954cf260d571',
    'Pending App': '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945',
    'Screening': 'a4e162e0-5421-4d17-8ad5-4b1195bbc995',
    'Pre-Qualified': '09162eec-d2b2-48e5-86d0-9e66ee8b2af7',
    'Pre-Approved': '3cbf38ff-752e-4163-a9a3-1757499b4945',
    'Active': '76eb2e82-e1d9-4f2d-a57d-2120a25696db'
  };

  const handlePipelineStageClick = async (stageLabel: string) => {
    if (!leadId) {
      console.error('Cannot update pipeline stage: missing leadId');
      toast({
        title: "Error",
        description: "Unable to update stage: Invalid lead ID",
        variant: "destructive"
      });
      return;
    }
    
    // Normalize the label for lookup (trim, consistent spacing)
    const normalizedLabel = stageLabel.trim();
    
    // Direct lookup
    let stageId = STAGE_NAME_TO_ID[normalizedLabel];
    
    // If direct lookup fails, try to find by key in PIPELINE_CONFIGS
    if (!stageId) {
      const pipelineStage = PIPELINE_CONFIGS[pipelineType]?.find(
        stage => stage.label === normalizedLabel || stage.key === normalizedLabel.toLowerCase().replace(/\s+/g, '-')
      );
      
      if (pipelineStage) {
        // Map the key to the stage ID
        const keyToIdMapping: Record<string, string> = {
          'leads': 'c54f417b-3f67-43de-80f5-954cf260d571',
          'pending-app': '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945',
          'screening': 'a4e162e0-5421-4d17-8ad5-4b1195bbc995',
          'pre-qualified': '09162eec-d2b2-48e5-86d0-9e66ee8b2af7',
          'pre-approved': '3cbf38ff-752e-4163-a9a3-1757499b4945',
          'active': '76eb2e82-e1d9-4f2d-a57d-2120a25696db'
        };
        stageId = keyToIdMapping[pipelineStage.key];
      }
    }
    
    if (!stageId) {
      console.error('Cannot update pipeline stage: stage not found', { 
        stageLabel, 
        normalizedLabel,
        availableStages: Object.keys(STAGE_NAME_TO_ID),
        pipelineType
      });
      toast({
        title: "Error",
        description: `Unable to move lead to "${stageLabel}". Stage not recognized.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Special handling for Pending App stage
      const isPendingApp = normalizedLabel === 'Pending App' || stageId === '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945';
      
      const updateData: any = { 
        pipeline_stage_id: stageId
      };
      
      // If moving to Pending App, set defaults
      if (isPendingApp) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        updateData.status = 'Pending App';
        updateData.task_eta = today;
      }
      
      // If moving to Active, also update the pipeline_section to Incoming
      if (normalizedLabel === 'Active') {
        updateData.pipeline_section = 'Incoming';
      }
      
      await databaseService.updateLead(leadId, updateData);
      
      toast({ 
        title: `Lead moved to ${normalizedLabel}`,
        description: normalizedLabel === 'Active' 
          ? "Lead converted to Active deal successfully!" 
          : "Pipeline stage updated successfully"
      });
      
      // Refresh parent page data before closing
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      
      // Close drawer so user sees the lead move to new page
      handleDrawerClose();
    } catch (error) {
      console.error('Error updating pipeline stage:', error);
      toast({
        title: "Error",
        description: "Failed to update pipeline stage. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleActiveLoanStatusClick = async (statusLabel: string) => {
    const leadId = getLeadId();
    if (!leadId) {
      console.error('Cannot update loan status: missing leadId');
      return;
    }
    
    // Map label to database value (SUB -> SUV)
    const labelToDbValue: Record<string, string> = {
      'NEW': 'NEW',
      'RFP': 'RFP',
      'SUB': 'SUV',
      'AWC': 'AWC',
      'CTC': 'CTC'
    };
    
    const dbValue = labelToDbValue[statusLabel] || statusLabel;
    
    try {
      await databaseService.updateLead(leadId, { 
        loan_status: dbValue as "NEW" | "RFP" | "SUV" | "AWC" | "CTC"
      });
      
      toast({ 
        title: `Loan status updated to ${statusLabel}`,
        description: "Status updated successfully"
      });
      
    // Refresh parent page data
    if (onLeadUpdated) {
      await onLeadUpdated();
    }
    
    // Close drawer to show updated status in table
    onClose();
    
  } catch (error) {
    console.error('Error updating loan status:', error);
    toast({
      title: "Error",
      description: "Failed to update loan status",
      variant: "destructive"
    });
  }
};

  const handleStageClick = (stageKey: string) => {
    if (stageKey !== client.ops.stage) {
      onStageChange(client.person.id, stageKey as PipelineStage);
    }
  };

  const handleActivityCreated = async (activityType: string) => {
    // Reload activities from database to get the latest data
    await loadActivities();
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const newDoc = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          uploadDate: new Date().toISOString(),
          type: file.type
        };
        setDocuments(prev => [newDoc, ...prev]);
      });
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newActivity: Activity = {
        id: Date.now(),
        type: 'note',
        title: 'Message Sent',
        description: chatMessage,
        timestamp: new Date().toISOString(),
        user: 'Current User'
      };
      setActivities(prev => [newActivity, ...prev]);
      setChatMessage('');
    }
  };

  const loadLeadTasks = async () => {
    const leadId = getLeadId();
    if (!leadId) return;

    setLoadingTasks(true);
    try {
      const tasks = await databaseService.getLeadTasks(leadId);
      setLeadTasks(tasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskActivityClick = async (activity: any) => {
    // Extract task title from activity description
    // Format: "Task created: [title]\nAssigned to: [name]\nDue: [date]"
    const taskTitle = activity.task_id; // We stored the task title in task_id field
    
    if (!leadId || !taskTitle) return;

    try {
      // Find the task by title and lead_id
      const tasks = await databaseService.getLeadTasks(leadId);
      const matchingTask = tasks.find(t => t.title === taskTitle);
      
      if (matchingTask) {
        setSelectedTask(matchingTask);
        setShowTaskDetailModal(true);
      } else {
        toast({
          title: "Task Not Found",
          description: "The task may have been deleted or moved.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error finding task:", error);
      toast({
        title: "Error",
        description: "Failed to open task details",
        variant: "destructive",
      });
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Done" ? "To Do" : "Done";
      await databaseService.updateTask(taskId, { status: newStatus });
      
      // Refresh tasks
      await loadLeadTasks();
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Initialize with mock data
  React.useEffect(() => {
    if (activities.length === 0) {
      setActivities([
        {
          id: 1,
          type: 'call',
          title: 'Phone call completed',
          description: 'Discussed loan terms and next steps',
          timestamp: '2024-01-18T10:30:00Z',
          user: 'Yousif'
        },
        {
          id: 2,
          type: 'email',
          title: 'Pre-approval letter sent',
          description: 'Sent conditional pre-approval letter with terms',
          timestamp: '2024-01-17T15:45:00Z',
          user: 'System'
        },
        {
          id: 3,
          type: 'note',
          title: 'Document review completed',
          description: 'Reviewed all submitted financial documents. Everything looks good.',
          timestamp: '2024-01-16T14:20:00Z',
          user: 'Salma'
        },
        {
          id: 4,
          type: 'sms',
          title: 'SMS reminder sent',
          description: 'Reminded client about upcoming appraisal appointment',
          timestamp: '2024-01-15T09:15:00Z',
          user: 'Herman Daza'
        },
        {
          id: 5,
          type: 'call',
          title: 'Follow-up call',
          description: 'Checked in on client questions about closing costs',
          timestamp: '2024-01-14T16:30:00Z',
          user: 'Yousif'
        },
        {
          id: 6,
          type: 'email',
          title: 'Rate lock confirmation',
          description: 'Confirmed 30-day rate lock at 6.875%',
          timestamp: '2024-01-12T11:00:00Z',
          user: 'System'
        },
        {
          id: 7,
          type: 'note',
          title: 'Initial consultation',
          description: 'Met with client to discuss loan options and timeline',
          timestamp: '2024-01-10T13:45:00Z',
          user: 'Yousif'
        }
      ]);
    }
  }, []);

  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDrawerClose = () => {
    setNewNote("");
    setShowCreateTaskModal(false);
    setShowCallLogModal(false);
    setShowSmsLogModal(false);
    setShowEmailLogModal(false);
    setShowAddNoteModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleOverlayClick}>
      {/* Drawer */}
      <div 
        className="left-60 h-full bg-background shadow-strong animate-in slide-in-from-right duration-300 border-l z-[60] absolute pointer-events-auto" 
        style={{ width: 'calc(100vw - 240px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background p-4 pt-2">
        </div>

        {/* Main Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 h-[calc(100vh-80px)] p-4 pt-0">
          {/* Left Column - Contact Info, Team & Contacts, Tasks, Chat */}
          <div className="space-y-4 overflow-y-auto">
            {/* Contact Info Card - Moved from top row */}
            <ContactInfoCard 
              client={client} 
              onClose={handleDrawerClose} 
              leadId={leadId}
              onLeadUpdated={onLeadUpdated}
            />

            {/* Third Party Items */}
            <LeadThirdPartyItemsCard leadId={leadId || ""} />

            {/* Team / Contacts / Dates */}
            <LeadTeamContactsDatesCard leadId={leadId || ""} />


            {/* Chat with Borrower */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Chat with Borrower</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 min-h-[300px] max-h-[300px] overflow-y-auto border rounded p-2 bg-muted/30">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                      <p className="text-sm">Hi John! Just wanted to check in on your loan application. How are things going?</p>
                      <p className="text-xs opacity-75 mt-1">Today 2:30 PM</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-sm">Hi! Everything is going well. I just submitted the additional documents you requested.</p>
                      <p className="text-xs text-muted-foreground mt-1">Today 2:45 PM</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                      <p className="text-sm">Great! I'll review them and get back to you by tomorrow.</p>
                      <p className="text-xs opacity-75 mt-1">Today 3:00 PM</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Status Tracker & Lead Information */}
          <div className="space-y-4 overflow-y-auto flex flex-col">
            {/* Status Tracker Pills - Moved from top row */}
            <Card>
              <CardHeader className="pb-3">
              </CardHeader>
              <CardContent>
{pipelineType === 'leads' || pipelineType === 'active' ? (
                  <PipelineStageBar
                    stages={PIPELINE_CONFIGS[pipelineType]?.map(stage => stage.label.replace(/([a-z])([A-Z])/g, '$1 $2')) || []}
                    currentStage={
                      pipelineType === 'active' 
                        ? (() => {
                            const raw = (client as any).loanStatus || (client as any).loan_status || client.ops.status || '';
                            const upper = String(raw).toUpperCase();
                            return upper === 'SUV' ? 'SUB' : upper;
                          })()
                        : (() => {
                            const s = client.ops.stage;
                            const config = PIPELINE_CONFIGS['leads'];
                            if (!s) return 'New';
                            // Try key match (e.g., 'leads', 'pending-app', etc.)
                            const byKey = config.find(st => st.key === s);
                            if (byKey) return byKey.label;
                            // Try label match (e.g., 'Pending App', 'Pre-Approved')
                            const byLabel = config.find(st => st.label.toLowerCase() === String(s).toLowerCase());
                            return byLabel ? byLabel.label : 'New';
                          })()
                    }
                    size="md"
                    clickable={true}
                    onStageClick={
                      pipelineType === 'active'
                        ? handleActiveLoanStatusClick
                        : handlePipelineStageClick
                    }
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    {PIPELINE_CONFIGS[pipelineType]?.map((stage, index) => {
                      const isActive = (client.ops.stage as string) === stage.key;
                      const currentStageIndex = PIPELINE_CONFIGS[pipelineType]?.findIndex(s => s.key === (client.ops.stage as string)) ?? -1;
                      // Z-index: higher for stages to the left, active gets highest
                      const zIndex = isActive ? 25 : 20 - index;
                      return (
                        <button
                          key={stage.key}
                          onClick={() => handleStageClick(stage.key)}
                          className={cn(
                            "relative flex items-center justify-center rounded-full border-2 border-black font-bold text-xs uppercase transition-all duration-200 hover:shadow-lg whitespace-nowrap px-3",
                            isActive 
                              ? "bg-yellow-400 text-black" 
                              : "bg-white text-black hover:bg-gray-50",
                            index > 0 && "-ml-1"
                          )}
                           style={{ 
                             zIndex: zIndex,
                             width: "100px",
                             height: "48px",
                             fontSize: "18px"
                           }}
                        >
                          {stage.label.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Critical Status Information - Dynamic based on stage */}
                <div className="mt-4">
                  {renderCriticalStatusInfo()}
                </div>
              </CardContent>
            </Card>

            {/* Lead Information Tabs */}
            <div className="flex-1 min-h-0">
              <LeadCenterTabs 
                leadId={leadId}
                activities={activities}
                documents={documents}
                client={client}
                onLeadUpdated={onLeadUpdated}
                onActivityUpdated={loadActivities}
                onClientPatched={(patch) => {
                  // Merge patch into client object for immediate UI update
                  Object.assign(client, patch);
                }}
                onDocumentsChange={loadDocuments}
              onCallClick={() => {
                if (!leadId) {
                  toast({
                    title: "Error",
                    description: "Unable to log activity: Invalid lead ID",
                    variant: "destructive",
                  });
                  return;
                }
                setShowCallLogModal(true);
              }}
              onSmsClick={() => {
                if (!leadId) {
                  toast({
                    title: "Error",
                    description: "Unable to log activity: Invalid lead ID",
                    variant: "destructive",
                  });
                  return;
                }
                setShowSmsLogModal(true);
              }}
              onEmailClick={() => {
                if (!leadId) {
                  toast({
                    title: "Error",
                    description: "Unable to log activity: Invalid lead ID",
                    variant: "destructive",
                  });
                  return;
                }
                setShowEmailLogModal(true);
              }}
              onNoteClick={() => {
                if (!leadId) {
                  toast({
                    title: "Error",
                    description: "Unable to log activity: Invalid lead ID",
                    variant: "destructive",
                  });
                  return;
                }
                setShowAddNoteModal(true);
              }}
              onTaskClick={() => setShowCreateTaskModal(true)}
              onTaskActivityClick={handleTaskActivityClick}
              />
            </div>
          </div>

          {/* Right Column - Notes, Documents, Stage History */}
          <div className="space-y-4 overflow-y-auto">
            {/* Send Email Templates */}
            <SendEmailTemplatesCard leadId={leadId || ""} />

            {/* Tasks - moved before About the Borrower */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Tasks
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 bg-gray-50">
                {loadingTasks ? (
                  <p className="text-xs text-muted-foreground">Loading tasks...</p>
                ) : leadTasks.length > 0 ? (
                  leadTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <Checkbox 
                        checked={task.status === "Done"}
                        onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                      />
                      <div 
                        className="flex-1 cursor-pointer hover:bg-gray-100 rounded p-1 -m-1"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetailModal(true);
                        }}
                      >
                        <span className={cn(
                          "text-xs block",
                          task.status === "Done" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Due: {task.due_date ? formatDateModern(task.due_date) : "No date"}</span>
                          {task.assignee && (
                            <>
                              <span>•</span>
                              <span>{task.assignee.first_name} {task.assignee.last_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </CardContent>
            </Card>

            {/* About the Borrower Section */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">About the Borrower</CardTitle>
                  {!isEditingNotes && localNotes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="bg-gray-50">
                {isEditingNotes || !localNotes ? (
                  <>
                    <Textarea
                      key="notes-textarea"
                      value={localNotes}
                      onChange={(e) => {
                        setLocalNotes(e.target.value);
                        setHasUnsavedNotes(true);
                      }}
                      placeholder="Describe the borrower, how they were referred, what they're looking for..."
                      className="min-h-[160px] resize-none bg-white mb-2"
                    />
                    {hasUnsavedNotes && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            const currentNotes = (client as any).meta?.notes ?? (client as any).notes ?? '';
                            if (localNotes === currentNotes) {
                              toast({
                                title: "No Changes",
                                description: "Notes haven't changed.",
                              });
                              setHasUnsavedNotes(false);
                              setIsEditingNotes(false);
                              return;
                            }
                            
                            setIsSavingNotes(true);
                            console.log('[ClientDetailDrawer] Saving notes. leadId:', leadId, 'notes:', localNotes);
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              
                              // Batch update to prevent multiple toasts
                              await databaseService.updateLead(leadId!, {
                                notes: localNotes,
                                notes_updated_by: user?.id || null,
                                notes_updated_at: new Date().toISOString()
                              });
                              
                              console.log('[ClientDetailDrawer] Notes saved successfully to database');
                              
                              if (onLeadUpdated) {
                                await onLeadUpdated();
                                console.log('[ClientDetailDrawer] Parent refreshed with new data');
                              }
                              
                              setHasUnsavedNotes(false);
                              setIsEditingNotes(false);
                              
                              toast({
                                title: "Saved",
                                description: "About the Borrower section has been updated.",
                              });
                            } catch (error) {
                              console.error('[ClientDetailDrawer] Error saving notes:', error);
                              toast({
                                title: "Error",
                                description: "Failed to save. Please try again.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsSavingNotes(false);
                            }
                          }}
                          disabled={isSavingNotes}
                        >
                          {isSavingNotes ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLocalNotes((client as any).notes || '');
                            setHasUnsavedNotes(false);
                            setIsEditingNotes(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div 
                    className="bg-white rounded-md p-3 min-h-[100px] text-sm border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {localNotes.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>
                    ))}
                  </div>
                )}
                {(client as any).notes_updated_at && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last updated: {format(new Date((client as any).notes_updated_at), 'MMM dd, yyyy h:mm a')}
                    {notesUpdatedByUser && (
                      <>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        {notesUpdatedByUser.first_name} {notesUpdatedByUser.last_name}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest File Updates Section */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">Latest File Updates</CardTitle>
                  {!isEditingFileUpdates && localFileUpdates && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingFileUpdates(true)}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="bg-gray-50">
                {isEditingFileUpdates || !localFileUpdates ? (
                  <>
                    <Textarea
                      key="file-updates-textarea"
                      value={localFileUpdates}
                      onChange={(e) => {
                        setLocalFileUpdates(e.target.value);
                        setHasUnsavedFileUpdates(true);
                      }}
                      placeholder="Track file uploads, document updates, and important file changes..."
                      className="min-h-[160px] resize-none bg-white mb-2"
                    />
                    {hasUnsavedFileUpdates && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            const currentFileUpdates = (client as any).latest_file_updates ?? '';
                            if (localFileUpdates === currentFileUpdates) {
                              toast({
                                title: "No Changes",
                                description: "File updates haven't changed.",
                              });
                              setHasUnsavedFileUpdates(false);
                              setIsEditingFileUpdates(false);
                              return;
                            }
                            
                            setIsSavingFileUpdates(true);
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              
                              // Batch update to prevent multiple toasts
                              await databaseService.updateLead(leadId!, {
                                latest_file_updates: localFileUpdates,
                                latest_file_updates_updated_by: user?.id || null,
                                latest_file_updates_updated_at: new Date().toISOString()
                              });
                              
                              if (onLeadUpdated) {
                                await onLeadUpdated();
                              }
                              
                              setHasUnsavedFileUpdates(false);
                              setIsEditingFileUpdates(false);
                              
                              toast({
                                title: "Saved",
                                description: "Latest File Updates section has been updated.",
                              });
                            } catch (error) {
                              console.error('Error saving file updates:', error);
                              toast({
                                title: "Error",
                                description: "Failed to save. Please try again.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsSavingFileUpdates(false);
                            }
                          }}
                          disabled={isSavingFileUpdates}
                        >
                          {isSavingFileUpdates ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLocalFileUpdates((client as any).latest_file_updates || '');
                            setHasUnsavedFileUpdates(false);
                            setIsEditingFileUpdates(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div 
                    className="bg-white rounded-md p-3 min-h-[100px] text-sm border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsEditingFileUpdates(true)}
                  >
                    {localFileUpdates.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>
                    ))}
                  </div>
                )}
                {(client as any).latest_file_updates_updated_at && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last updated: {format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}
                    {fileUpdatesUpdatedByUser && (
                      <>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        {fileUpdatesUpdatedByUser.first_name} {fileUpdatesUpdatedByUser.last_name}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stage History */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold">Stage History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-580px)] overflow-y-auto bg-gray-50">
                {(() => {
                  const calculateDaysAgo = (dateString: string | null): number | null => {
                    if (!dateString) return null;
                    let date: Date;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                      const [y, m, d] = dateString.split('-').map(Number);
                      date = new Date(y, m - 1, d);
                    } else {
                      date = new Date(dateString);
                    }
                    if (isNaN(date.getTime())) return null;
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const diffMs = startOfToday.getTime() - targetStart.getTime();
                    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  };
                  
                  const getStageHistory = () => {
                    if (pipelineType === 'active') {
                      return [
                        { key: 'incoming', label: 'NEW', date: '2024-01-08', daysAgo: 10 },
                        { key: 'rfp', label: 'RFP', date: '2024-01-10', daysAgo: 8 },
                        { key: 'submitted', label: 'SUB', date: '2024-01-12', daysAgo: 6 },
                        { key: 'awc', label: 'AWC', date: '2024-01-15', daysAgo: 3 },
                        { key: 'ctc', label: 'CTC', date: '', daysAgo: null }
                      ];
                    } else if (pipelineType === 'past-clients') {
                      // Live data for past clients - same as leads pipeline
                      const leadOnDate = (client as any).lead_on_date || null;
                      const createdAt = leadOnDate || (client as any).created_at;
                      const pendingAppAt = (client as any).pending_app_at;
                      const appCompleteAt = (client as any).app_complete_at;
                      const preQualifiedAt = (client as any).pre_qualified_at;
                      const preApprovedAt = (client as any).pre_approved_at;
                      const activeAt = (client as any).active_at;
                      
                      return [
                        { 
                          key: 'leads', 
                          label: 'New', 
                          date: createdAt, 
                          daysAgo: calculateDaysAgo(createdAt) 
                        },
                        { 
                          key: 'pending-app', 
                          label: 'Pending App', 
                          date: pendingAppAt, 
                          daysAgo: calculateDaysAgo(pendingAppAt) 
                        },
                        { 
                          key: 'screening', 
                          label: 'Screening', 
                          date: appCompleteAt, 
                          daysAgo: calculateDaysAgo(appCompleteAt) 
                        },
                        { 
                          key: 'pre-qualified', 
                          label: 'Pre-Qualified', 
                          date: preQualifiedAt, 
                          daysAgo: calculateDaysAgo(preQualifiedAt) 
                        },
                        { 
                          key: 'pre-approved', 
                          label: 'Pre-Approved', 
                          date: preApprovedAt, 
                          daysAgo: calculateDaysAgo(preApprovedAt) 
                        },
                        { 
                          key: 'active', 
                          label: 'Active', 
                          date: activeAt, 
                          daysAgo: calculateDaysAgo(activeAt) 
                        }
                      ];
                    } else {
                      // Live data for leads pipeline
                      const leadOnDate = (client as any).lead_on_date || null;
                      const createdAt = leadOnDate || (client as any).created_at;
                      const pendingAppAt = (client as any).pending_app_at;
                      const appCompleteAt = (client as any).app_complete_at;
                      const preQualifiedAt = (client as any).pre_qualified_at;
                      const preApprovedAt = (client as any).pre_approved_at;
                      const activeAt = (client as any).active_at;
                      
                      return [
                        { 
                          key: 'leads', 
                          label: 'New', 
                          date: createdAt, 
                          daysAgo: calculateDaysAgo(createdAt) 
                        },
                        { 
                          key: 'pending-app', 
                          label: 'Pending App', 
                          date: pendingAppAt, 
                          daysAgo: calculateDaysAgo(pendingAppAt) 
                        },
                        { 
                          key: 'screening', 
                          label: 'Screening', 
                          date: appCompleteAt, 
                          daysAgo: calculateDaysAgo(appCompleteAt) 
                        },
                        { 
                          key: 'pre-qualified', 
                          label: 'Pre-Qualified', 
                          date: preQualifiedAt, 
                          daysAgo: calculateDaysAgo(preQualifiedAt) 
                        },
                        { 
                          key: 'pre-approved', 
                          label: 'Pre-Approved', 
                          date: preApprovedAt, 
                          daysAgo: calculateDaysAgo(preApprovedAt) 
                        },
                        { 
                          key: 'active', 
                          label: 'Active', 
                          date: activeAt, 
                          daysAgo: calculateDaysAgo(activeAt) 
                        }
                      ];
                    }
                  };
                  const stages = getStageHistory();
                  
                  const currentStageIndex = stages.findIndex(stage => stage.key === client.ops.stage);
                  
                  return stages.map((stage, index) => {
                    const isCompleted = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    
                    return (
                      <div key={stage.key} className="flex items-center gap-3 text-sm">
                        <div className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                          isCompleted 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-gray-100 text-gray-400"
                        )}>
                          {isCompleted ? "✓" : "•"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{stage.label}</p>
                          <div onClick={(e) => e.stopPropagation()}>
                            <InlineEditDate
                              value={stage.date}
                              onValueChange={(newDate) => {
                                const fieldMap: Record<string, string> = {
                                  'leads': 'lead_on_date',
                                  'pending-app': 'pending_app_at',
                                  'screening': 'app_complete_at',
                                  'pre-qualified': 'pre_qualified_at',
                                  'pre-approved': 'pre_approved_at',
                                  'active': 'active_at'
                                };
                                const dbField = fieldMap[stage.key];
                                if (dbField && leadId) {
                                  let dateValue: string | null = null;
                                  if (dbField === 'lead_on_date') {
                                    dateValue = newDate ? formatDateForInput(newDate) : null;
                                  } else {
                                    dateValue = newDate ? newDate.toISOString() : null;
                                  }
                                  databaseService.updateLead(leadId, { [dbField]: dateValue })
                                    .then(() => {
                                      if (onLeadUpdated) onLeadUpdated();
                                      toast({
                                        title: "Success",
                                        description: "Stage date updated",
                                      });
                                    })
                                    .catch((error) => {
                                      console.error('Error updating stage date:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to update stage date",
                                        variant: "destructive",
                                      });
                                    });
                                }
                              }}
                              className="text-xs"
                              placeholder="Set date"
                            />
                            {stage.date && stage.daysAgo !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {stage.daysAgo} days ago
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showCreateTaskModal}
        onOpenChange={setShowCreateTaskModal}
        preselectedBorrowerId={leadId || undefined}
        onTaskCreated={() => {
          setShowCreateTaskModal(false);
          loadLeadTasks();
          loadActivities(); // Refresh activity feed to show task creation log
          toast({
            title: "Success",
            description: "Task created successfully",
          });
        }}
      />

      <TaskDetailModal
        open={showTaskDetailModal}
        onOpenChange={setShowTaskDetailModal}
        task={selectedTask}
        onTaskUpdated={() => {
          loadLeadTasks();
          toast({
            title: "Success",
            description: "Task updated successfully",
          });
        }}
      />

      {leadId && (
        <>
          <CallLogModal
            open={showCallLogModal}
            onOpenChange={setShowCallLogModal}
            leadId={leadId}
            onActivityCreated={(activity) => {
              handleActivityCreated('call');
              setShowCallLogModal(false);
            }}
          />

          <SmsLogModal
            open={showSmsLogModal}
            onOpenChange={setShowSmsLogModal}
            leadId={leadId}
            onActivityCreated={(activity) => {
              handleActivityCreated('sms');
              setShowSmsLogModal(false);
            }}
          />

          <EmailLogModal
            open={showEmailLogModal}
            onOpenChange={setShowEmailLogModal}
            leadId={leadId}
            onActivityCreated={(activity) => {
              handleActivityCreated('email');
              setShowEmailLogModal(false);
            }}
          />

          <AddNoteModal
            open={showAddNoteModal}
            onOpenChange={setShowAddNoteModal}
            leadId={leadId}
            onActivityCreated={async (activity) => {
              await handleActivityCreated('note');
              setShowAddNoteModal(false);
            }}
          />

          <NoteDetailModal
            open={showNoteDetailModal}
            onOpenChange={setShowNoteDetailModal}
            note={selectedNote}
          />
        </>
      )}
    </div>
  );
}