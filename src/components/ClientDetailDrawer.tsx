import { useState, useCallback } from "react";
import * as React from "react";
import { format } from "date-fns";
import { calculatePrincipalAndInterest } from "@/hooks/usePITICalculation";
import { X, Phone, MessageSquare, Mail, FileText, Plus, Upload, User, MapPin, Building2, Calendar, FileCheck, Clock, Check, Send, Paperclip, Circle, CheckCircle, Mic, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CRMClient, PipelineStage, PIPELINE_STAGES, PIPELINE_CONFIGS, Activity, Task, Document } from "@/types/crm";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { CreateNextTaskModal } from "@/components/modals/CreateNextTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { CallLogModal, SmsLogModal, EmailLogModal, AddNoteModal } from "@/components/modals/ActivityLogModals";
import { NoteDetailModal } from "@/components/modals/NoteDetailModal";
import { TaskCompletionRequirementModal } from "@/components/modals/TaskCompletionRequirementModal";
import { AgentCallLogModal } from "@/components/modals/AgentCallLogModal";
import { PreApprovalLetterModal } from "@/components/modals/PreApprovalLetterModal";
import { LoanEstimateModal } from "@/components/modals/LoanEstimateModal";
import { VoiceUpdateConfirmationModal } from "@/components/modals/VoiceUpdateConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { LeadTeamContactsDatesCard } from "@/components/lead-details/LeadTeamContactsDatesCard";
import { LeadThirdPartyItemsCard } from "@/components/lead-details/LeadThirdPartyItemsCard";
import { LeadCenterTabs } from "@/components/lead-details/LeadCenterTabs";
import { ContactInfoCard } from "@/components/lead-details/ContactInfoCard";
import { SendEmailTemplatesCard } from "@/components/lead-details/SendEmailTemplatesCard";
import { RealEstateOwnedSection } from "@/components/lead-details/RealEstateOwnedSection";
import { PipelineStageBar } from "@/components/PipelineStageBar";
import { StatusBadge } from "@/components/ui/status-badge";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { MentionableInlineEditNotes } from "@/components/ui/mentionable-inline-edit-notes";
import { getDatabaseFieldName } from "@/types/crm";
import { formatDateModern, formatDateForInput, formatDateFull } from "@/utils/dateUtils";
import { validateTaskCompletion } from "@/services/taskCompletionValidation";
import { validatePipelineStageChange, PipelineStageRule } from "@/services/statusChangeValidation";
import { usePermissions } from "@/hooks/usePermissions";
interface ClientDetailDrawerProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (clientId: number, newStage: PipelineStage) => void;
  pipelineType: 'leads' | 'active' | 'past-clients';
  onLeadUpdated?: () => void | Promise<void>;
  autoStartRecording?: boolean;
}
export function ClientDetailDrawer({
  client,
  isOpen,
  onClose,
  onStageChange,
  pipelineType,
  onLeadUpdated,
  autoStartRecording = false
}: ClientDetailDrawerProps) {
  // Defensive guard: check for valid client with person data
  if (!client?.person) {
    console.warn('[ClientDetailDrawer] Invalid client object - missing person data:', client);
    return (
      <div className={`fixed inset-y-0 right-0 w-[480px] bg-background shadow-xl border-l z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="bg-destructive/10 rounded-full p-4 mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Unable to Load Lead</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The lead details could not be loaded. This may be due to missing data or a sync issue.
          </p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    );
  }
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
  const [showPreApprovalModal, setShowPreApprovalModal] = useState(false);
  const [showLoanEstimateModal, setShowLoanEstimateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Activity | null>(null);
  const [showNoteDetailModal, setShowNoteDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  // Task completion validation state
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [completionRequirement, setCompletionRequirement] = useState<any>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [agentCallLogModalOpen, setAgentCallLogModalOpen] = useState(false);
  const [selectedAgentForCall, setSelectedAgentForCall] = useState<any>(null);
  
  // Create next task modal state
  const [showCreateNextTaskModal, setShowCreateNextTaskModal] = useState(false);

  // Local state for gray section fields to reflect updates immediately
  const [localStatus, setLocalStatus] = useState(client.ops.status || 'Pending App');
  const [localPriority, setLocalPriority] = useState((client as any).priority || 'Medium');
  const [localLikelyToApply, setLocalLikelyToApply] = useState((client as any).likely_to_apply || '');
  const [localLeadStrength, setLocalLeadStrength] = useState((client as any).lead_strength || '');
  const [localNotes, setLocalNotes] = useState((client as any).meta?.notes ?? (client as any).notes ?? '');
  const [localUpdatedAt, setLocalUpdatedAt] = useState((client as any).updated_at || new Date().toISOString());
  
  // Local state for Active stage gray box fields
  const [localInterestRate, setLocalInterestRate] = useState<number | null>(null);
  const [localFicoScore, setLocalFicoScore] = useState<number | null>(null);
  const [localCloseDate, setLocalCloseDate] = useState<string | null>(null);
  const [localCashToClose, setLocalCashToClose] = useState<number | null>(null);
  const [localPiti, setLocalPiti] = useState<number | null>(null);
  const [localOccupancy, setLocalOccupancy] = useState<string | null>(null);
  
  // No longer needed - REO expenses are part of monthly_liabilities on debt side

  // About the Borrower editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Latest File Updates editing state
  const [localFileUpdates, setLocalFileUpdates] = useState((client as any).latest_file_updates ?? '');
  const [isEditingFileUpdates, setIsEditingFileUpdates] = useState(false);
  const [hasUnsavedFileUpdates, setHasUnsavedFileUpdates] = useState(false);
  const [isSavingFileUpdates, setIsSavingFileUpdates] = useState(false);

  const [isRecordingFileUpdates, setIsRecordingFileUpdates] = useState(false);
  const [isSummarizingTranscript, setIsSummarizingTranscript] = useState(false);
  const hasAutoStartedRecording = React.useRef(false);
  const needsReviewUpdate = React.useRef(false);
  const justProcessedVoice = React.useRef(false);

  // Field update confirmation modal state
  const [showFieldUpdateModal, setShowFieldUpdateModal] = useState(false);
  const [detectedFieldUpdates, setDetectedFieldUpdates] = useState<Array<{
    field: string;
    fieldLabel: string;
    currentValue: string | number | null;
    newValue: string | number;
  }>>([]);
  const [detectedTaskSuggestions, setDetectedTaskSuggestions] = useState<Array<{
    title: string;
    description?: string;
    dueDate?: string | null;
    priority: 'low' | 'medium' | 'high';
  }>>([]);

  // Pipeline stage validation state
  const [pipelineValidationModalOpen, setPipelineValidationModalOpen] = useState(false);
  const [pipelineValidationRule, setPipelineValidationRule] = useState<PipelineStageRule | null>(null);
  const [pipelineValidationMissingFields, setPipelineValidationMissingFields] = useState<string[]>([]);
  const [pendingPipelineStage, setPendingPipelineStage] = useState<{ stageId: string; stageLabel: string } | null>(null);
  const [isRefinanceBypass, setIsRefinanceBypass] = useState(false);
  
  // Modal inline edit state for pipeline validation
  const [modalLeadStrength, setModalLeadStrength] = useState<string>('');
  const [modalLikelyToApply, setModalLikelyToApply] = useState<string>('');

  // User info for timestamps
  const [notesUpdatedByUser, setNotesUpdatedByUser] = useState<any>(null);
  const [fileUpdatesUpdatedByUser, setFileUpdatesUpdatedByUser] = useState<any>(null);
  const {
    toast
  } = useToast();
  const { isAdmin } = usePermissions();

  // Reusable save functions for auto-save on blur and drawer close
  const saveNotes = useCallback(async (silent = false) => {
    if (!leadId || !hasUnsavedNotes || isSavingNotes) return;
    const currentNotes = (client as any).meta?.notes ?? (client as any).notes ?? '';
    if (localNotes === currentNotes) {
      setHasUnsavedNotes(false);
      setIsEditingNotes(false);
      return;
    }
    setIsSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: crmUser } = await supabase
        .from('users').select('id').eq('auth_user_id', user?.id).single();
      await databaseService.updateLead(leadId, {
        notes: localNotes,
        notes_updated_by: crmUser?.id || null,
        notes_updated_at: new Date().toISOString()
      });
      if (onLeadUpdated) await onLeadUpdated();
      setHasUnsavedNotes(false);
      setIsEditingNotes(false);
      if (!silent) toast({ title: "Saved", description: "About the Borrower section has been updated." });
    } catch (error: any) {
      console.error('Error saving notes:', error);
      if (!silent) toast({ title: "Error", description: `Failed to save: ${error?.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsSavingNotes(false);
    }
  }, [leadId, hasUnsavedNotes, isSavingNotes, localNotes, client, onLeadUpdated, toast]);

  const saveFileUpdates = useCallback(async (silent = false) => {
    if (!leadId || !hasUnsavedFileUpdates || isSavingFileUpdates) return;
    setIsSavingFileUpdates(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: crmUser } = await supabase
        .from('users').select('id').eq('auth_user_id', user?.id).single();
      await databaseService.updateLead(leadId, {
        latest_file_updates: localFileUpdates,
        latest_file_updates_updated_by: crmUser?.id || null,
        latest_file_updates_updated_at: new Date().toISOString()
      });
      if (onLeadUpdated) await onLeadUpdated();
      setHasUnsavedFileUpdates(false);
      setIsEditingFileUpdates(false);
      if (!silent) toast({ title: "Saved", description: "Latest File Update has been saved." });
    } catch (error: any) {
      console.error('Error saving file updates:', error);
      if (!silent) toast({ title: "Error", description: `Failed to save: ${error?.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsSavingFileUpdates(false);
    }
  }, [leadId, hasUnsavedFileUpdates, isSavingFileUpdates, localFileUpdates, onLeadUpdated, toast]);
  const DEFAULT_INTEREST_RATE = 7.0;
  const DEFAULT_TERM = 360;

  // Track if PITI has been calculated for this lead to prevent duplicates
  const [hasCalculatedPITI, setHasCalculatedPITI] = React.useState(false);

  // Reset PITI calculation flag when lead changes
  React.useEffect(() => {
    setHasCalculatedPITI(false);
  }, [leadId]);

  // REO fetch removed - REO expenses are already included in monthly_liabilities on debt side

  // Auto-calculate PITI components when key fields exist but PITI is empty
  const autoCalculateAndSavePITI = React.useCallback(async () => {
    if (!leadId || hasCalculatedPITI) return;
    
    // Prioritize nested loan object which is reliably populated
    const loanAmount = (client as any).loan?.loanAmount || (client as any).loanAmount || 0;
    const salesPrice = (client as any).loan?.salesPrice || (client as any).salesPrice || 0;
    const propertyType = (client as any).property?.propertyType || (client as any).propertyType || '';
    const currentInterestRate = (client as any).loan?.interestRate ?? (client as any).interestRate ?? null;
    const currentPiti = (client as any).piti ?? null;
    const term = (client as any).loan?.term || DEFAULT_TERM;
    
    console.log('[PITI Debug] loanAmount:', loanAmount, 'salesPrice:', salesPrice, 'currentPiti:', currentPiti, 'currentInterestRate:', currentInterestRate);
    
    // Only auto-calculate if we have loan amount and PITI is not set
    if (loanAmount <= 0) {
      console.log('[PITI Debug] Skipping - no loan amount');
      return;
    }
    
    if (currentPiti !== null && currentPiti > 0) {
      console.log('[PITI Debug] Skipping - PITI already set:', currentPiti);
      setHasCalculatedPITI(true);
      return;
    }
    
    const interestRate = currentInterestRate ?? DEFAULT_INTEREST_RATE;
    
    // Calculate P&I using mortgage formula
    const monthlyRate = interestRate / 100 / 12;
    let principalInterest = 0;
    if (monthlyRate > 0) {
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, term);
      const denominator = Math.pow(1 + monthlyRate, term) - 1;
      principalInterest = loanAmount * (numerator / denominator);
    } else {
      principalInterest = loanAmount / term;
    }
    
    // Calculate Property Taxes (1.5% of sales price annually / 12)
    const propertyTaxes = salesPrice > 0 ? (salesPrice * 0.015) / 12 : 0;
    
    // Calculate Homeowners Insurance
    const isCondo = propertyType?.toLowerCase()?.includes('condo');
    const homeownersInsurance = isCondo ? 75 : Math.max(75, (salesPrice / 100000) * 75);
    
    // Calculate HOA Dues (condos only: $150 per $100K)
    const hoaDues = isCondo ? (salesPrice / 100000) * 150 : 0;
    
    // Calculate Mortgage Insurance (if LTV > 80%)
    const ltv = salesPrice > 0 ? (loanAmount / salesPrice) * 100 : 0;
    const mortgageInsurance = ltv > 80 ? (loanAmount * 0.005) / 12 : 0;
    
    // Total PITI
    const totalPiti = principalInterest + propertyTaxes + homeownersInsurance + hoaDues + mortgageInsurance;
    
    // Calculate DTI if we have total income
    const totalIncome = (client as any).total_monthly_income ?? (client as any).totalMonthlyIncome ?? 0;
    const monthlyLiabilities = (client as any).monthly_liabilities ?? (client as any).monthlyLiabilities ?? 0;
    
    let calculatedDti: number | null = null;
    if (totalIncome > 0) {
      // Back-end DTI = (PITI + monthly liabilities) / total income * 100
      calculatedDti = ((totalPiti + monthlyLiabilities) / totalIncome) * 100;
      calculatedDti = Math.round(calculatedDti * 100) / 100; // Round to 2 decimals
    }
    
    // Prepare update object
    const updateData: Record<string, any> = {
      principal_interest: Math.round(principalInterest),
      property_taxes: Math.round(propertyTaxes),
      homeowners_insurance: Math.round(homeownersInsurance),
      hoa_dues: Math.round(hoaDues),
      mortgage_insurance: Math.round(mortgageInsurance),
      piti: Math.round(totalPiti),
    };
    
    // Add DTI if calculated
    if (calculatedDti !== null) {
      updateData.dti = calculatedDti;
    }
    
    // Also save default interest rate if it was null
    if (currentInterestRate === null) {
      updateData.interest_rate = DEFAULT_INTEREST_RATE;
    }
    
    console.log('[PITI Debug] Saving PITI data:', updateData, 'DTI:', calculatedDti);
    
    try {
      await databaseService.updateLead(leadId, updateData);
      console.log('[ClientDetailDrawer] Auto-calculated and saved PITI:', updateData);
      
      // Mark as calculated to prevent duplicates
      setHasCalculatedPITI(true);
      
      // Update local state
      setLocalPiti(Math.round(totalPiti));
      if (currentInterestRate === null) {
        setLocalInterestRate(DEFAULT_INTEREST_RATE);
      }
      
      // Refresh parent if needed
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
    } catch (error) {
      console.error('[ClientDetailDrawer] Error auto-saving PITI:', error);
    }
  }, [leadId, client, hasCalculatedPITI, onLeadUpdated]);

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
      
      // Sync gray box fields for active stage - use 7% default if null
      const currentInterestRate = (client as any).loan?.interestRate ?? (client as any).interestRate ?? null;
      setLocalInterestRate(currentInterestRate ?? DEFAULT_INTEREST_RATE);
      setLocalFicoScore((client as any).loan?.ficoScore ?? (client as any).creditScore ?? null);
      setLocalCloseDate((client as any).closeDate ?? null);
      setLocalCashToClose((client as any).cashToClose ?? null);
      setLocalPiti((client as any).piti ?? null);
      // Normalize occupancy values to match dropdown options
      const rawOccupancy = (client as any).occupancy ?? null;
      const normalizedOccupancy = rawOccupancy === 'Primary Residence' || rawOccupancy === 'Primary Home' 
        ? 'Primary' 
        : rawOccupancy;
      setLocalOccupancy(normalizedOccupancy);
      
      // Sync lead qualification fields
      setLocalLeadStrength((client as any).lead_strength || '');
      setLocalLikelyToApply((client as any).likely_to_apply || '');

      // Load user info for timestamps
      if ((client as any).notes_updated_by) {
        loadUserInfo((client as any).notes_updated_by, setNotesUpdatedByUser);
      }
      if ((client as any).latest_file_updates_updated_by) {
        loadUserInfo((client as any).latest_file_updates_updated_by, setFileUpdatesUpdatedByUser);
      }
      
      // Save default interest rate to database if null
      if (currentInterestRate === null && (client.ops.stage === 'active' || client.ops.stage === undefined)) {
        databaseService.updateLead(leadId, { interest_rate: DEFAULT_INTEREST_RATE }).catch(console.error);
      }
    }
  }, [isOpen, leadId, client, isEditingNotes, isEditingFileUpdates]);

  // Separate effect for PITI auto-calculation - runs after client data is populated
  React.useEffect(() => {
    if (isOpen && leadId && !hasCalculatedPITI && (client.ops.stage === 'active' || client.ops.stage === undefined)) {
      const loanAmount = (client as any).loan?.loanAmount || (client as any).loanAmount || 0;
      if (loanAmount > 0) {
        autoCalculateAndSavePITI();
      }
    }
  }, [isOpen, leadId, client, hasCalculatedPITI, autoCalculateAndSavePITI]);
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

  // Auto-start recording when opening from Review mode
  React.useEffect(() => {
    // Don't auto-start if we just processed voice (to prevent restart after confirmation modal)
    if (justProcessedVoice.current) {
      justProcessedVoice.current = false;
      return;
    }
    if (isOpen && autoStartRecording && leadId && !hasAutoStartedRecording.current && !isRecordingFileUpdates && !isSummarizingTranscript) {
      hasAutoStartedRecording.current = true;
      // Small delay to let the drawer fully open
      const timer = setTimeout(() => {
        handleVoiceRecordingStart();
      }, 500);
      return () => clearTimeout(timer);
    }
    // Reset auto-start flag when drawer closes
    if (!isOpen) {
      hasAutoStartedRecording.current = false;
    }
  }, [isOpen, autoStartRecording, leadId, isRecordingFileUpdates, isSummarizingTranscript]);
  const loadActivities = async () => {
    if (!leadId) return;
    try {
      const fetchedActivities = await databaseService.getLeadActivities(leadId);
      // Transform to match Activity interface
      const transformedActivities = fetchedActivities.map((activity: any) => {
        // Handle status changes
        if (activity.type === 'status_change') {
          const displayUser = activity.changed_by_user 
            ? `${activity.changed_by_user.first_name} ${activity.changed_by_user.last_name}` 
            : 'System';
          
          // Format field name for display
          const formatFieldName = (fieldName: string): string => {
            const fieldLabels: Record<string, string> = {
              loan_status: 'Loan Status',
              appraisal_status: 'Appraisal Status',
              title_status: 'Title Status',
              hoi_status: 'HOI Status',
              condo_status: 'Condo Status',
              disclosure_status: 'Disclosure Status',
              cd_status: 'CD Status',
              package_status: 'Package Status',
              epo_status: 'EPO Status',
              close_date: 'Closing Date',
              lock_expiration_date: 'Lock Expiration',
              appr_date_time: 'Appraisal Date/Time',
            };
            return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          };
          
          return {
            id: activity.id,
            type: 'status_change' as const,
            title: 'Status changed',
            description: `${formatFieldName(activity.field_name)}: ${activity.old_value || '∅'} → ${activity.new_value}`,
            timestamp: activity.created_at,
            user: displayUser,
            old_value: activity.old_value,
            new_value: activity.new_value,
            field_name: activity.field_name,
            lead_id: activity.lead_id || leadId
          };
        }

        // Handle tasks from database
        if (activity.type === 'task') {
          // For completed tasks, use completed_by_user if available
          const displayUser = activity.status === 'Done' && activity.completed_by_user ? `${activity.completed_by_user.first_name} ${activity.completed_by_user.last_name}` : activity.author ? `${activity.author.first_name} ${activity.author.last_name}` : activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'System';
          return {
            id: activity.id,
            type: 'task' as const,
            title: activity.status === 'Done' ? 'Task completed' : 'Task created',
            description: activity.body || `Task: ${activity.title}${activity.description ? `\nDescription: ${activity.description}` : ''}`,
            timestamp: activity.status === 'Done' ? activity.completed_at || activity.updated_at : activity.created_at,
            user: displayUser,
            author_id: activity.author?.id || activity.user?.id,
            task_id: activity.id,
            task_status: activity.status,
            lead_id: activity.borrower_id || leadId
          };
        }

        // Detect task creation logs from notes (legacy support)
        const isTaskLog = activity.type === 'note' && activity.body?.startsWith('Task created:');

        // Get description based on activity type
        let description = '';
        if (activity.type === 'email') {
          // Use HTML body for proper formatting (line breaks, bullet points, etc.)
          description = activity.html_body || activity.body || activity.snippet || '';
        } else if (activity.type === 'call') {
          description = activity.notes || '';
        } else if (activity.type === 'agent_call') {
          // Agent calls show agent name and summary
          description = `Call with agent: ${activity.agent_name}\n${activity.notes || ''}`;
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
        
        // For inbound emails, show who sent it instead of a user
        let displayUser = activity.author 
          ? `${activity.author.first_name} ${activity.author.last_name}` 
          : activity.user 
            ? `${activity.user.first_name} ${activity.user.last_name}` 
            : 'System';
        
        // For inbound emails, use the sender's email/name
        if (activity.type === 'email' && activity.direction === 'In') {
          displayUser = activity.from_email || 'Unknown sender';
        }
        
        return {
          id: activity.id,
          type: activityType,
          title: isTaskLog ? 'Task created' : activity.type === 'note' ? 'Note added' : activity.type === 'call' ? 'Call logged' : activity.type === 'agent_call' ? 'Agent call logged' : activity.type === 'sms' ? 'SMS logged' : activity.direction === 'In' ? 'Email received' : 'Email logged',
          description,
          timestamp: activity.timestamp || activity.created_at,
          user: displayUser,
          author_id: activity.author_id || activity.user_id,
          task_id: isTaskLog ? activity.body.split('\n')[0].replace('Task created: ', '') : null,
          direction: activity.direction,
          from_email: activity.from_email,
          subject: activity.subject,
          body: activity.body,
          html_body: activity.html_body,
          lead_id: activity.lead_id || leadId,
          to_email: activity.to_email,
          ai_summary: activity.ai_summary,
          attachment_url: activity.attachment_url,
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
  // Helper function to recalculate and save P&I when rate/amount/term changes
  const recalculatePIFromField = useCallback(async (
    fieldName: string,
    newValue: number | null,
    existingLoanAmount?: number,
    existingRate?: number,
    existingTerm?: number
  ) => {
    if (!leadId) return;
    
    // Get current values
    const loanAmount = fieldName === 'loan_amount' 
      ? (newValue ?? 0)
      : (existingLoanAmount ?? (client as any).loan?.loanAmount ?? (client as any).loanAmount ?? 0);
    const interestRate = fieldName === 'interest_rate'
      ? (newValue ?? DEFAULT_INTEREST_RATE)
      : (existingRate ?? (client as any).loan?.interestRate ?? localInterestRate ?? DEFAULT_INTEREST_RATE);
    const term = fieldName === 'term'
      ? (newValue ?? DEFAULT_TERM)
      : (existingTerm ?? (client as any).loan?.term ?? DEFAULT_TERM);
    
    if (loanAmount <= 0) return;
    
    // Calculate P&I using mortgage formula
    const principalInterest = calculatePrincipalAndInterest(loanAmount, interestRate, term);
    
    // Get existing PITI components
    const existingTaxes = (client as any).propertyTaxes ?? 0;
    const existingInsurance = (client as any).homeownersInsurance ?? 0;
    const existingMI = (client as any).mortgageInsurance ?? 0;
    const existingHOA = (client as any).hoaDues ?? 0;
    
    const newPiti = principalInterest + existingTaxes + existingInsurance + existingMI + existingHOA;
    
    console.log('[ClientDetailDrawer] Recalculating P&I:', {
      loanAmount, interestRate, term,
      principalInterest: Math.round(principalInterest),
      newPiti: Math.round(newPiti)
    });
    
    // Calculate DTI if we have total income
    const totalIncome = (client as any).total_monthly_income ?? (client as any).totalMonthlyIncome ?? 0;
    const monthlyLiabilities = (client as any).monthly_liabilities ?? (client as any).monthlyLiabilities ?? 0;
    
    const updateFields: Record<string, any> = {
      principal_interest: Math.round(principalInterest),
      piti: Math.round(newPiti)
    };
    
    // Add DTI if we can calculate it
    if (totalIncome > 0) {
      const calculatedDti = ((newPiti + monthlyLiabilities) / totalIncome) * 100;
      updateFields.dti = Math.round(calculatedDti * 100) / 100;
    }
    
    // Save P&I, PITI, and DTI to database
    try {
      await databaseService.updateLead(leadId, updateFields);
      
      // Update local PITI state
      setLocalPiti(Math.round(newPiti));
    } catch (error) {
      console.error('[ClientDetailDrawer] Error saving P&I:', error);
    }
  }, [leadId, client, localInterestRate]);

  const handleLeadUpdate = async (fieldName: string, value: any) => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing. Cannot save field.",
        variant: "destructive"
      });
      return;
    }
    try {
      const dbFieldName = getDatabaseFieldName(fieldName);
      await databaseService.updateLead(leadId, {
        [dbFieldName]: value
      });

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
      
      // Recalculate P&I when interest_rate, loan_amount, or term changes
      if (fieldName === 'interest_rate' || fieldName === 'loan_amount' || fieldName === 'term') {
        await recalculatePIFromField(dbFieldName, value);
      }
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      toast({
        title: "Field Updated",
        description: `${fieldName} has been updated successfully.`
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${fieldName}.`,
        variant: "destructive"
      });
    }
  };

  // Voice recording handler for Latest File Updates
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const handleVoiceRecordingStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingFileUpdates(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to record voice notes.',
        variant: 'destructive',
      });
    }
  };

  const handleVoiceRecordingStop = () => {
    if (mediaRecorderRef.current && isRecordingFileUpdates) {
      mediaRecorderRef.current.stop();
      setIsRecordingFileUpdates(false);
    }
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    setIsSummarizingTranscript(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      // Transcribe audio
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio: base64Audio }
      });

      if (transcribeError) throw transcribeError;

      if (!transcribeData?.text) {
        throw new Error('No transcription returned');
      }

      const transcription = transcribeData.text;

      // Summarize the transcript
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-transcript', {
        body: { transcript: transcription }
      });

      if (summaryError) throw summaryError;

      if (summaryData?.summary) {
        // Append summary to existing file updates
        const newContent = localFileUpdates 
          ? `${localFileUpdates}\n\n${summaryData.summary}`
          : summaryData.summary;
        
        setLocalFileUpdates(newContent);
        
        // AUTO-SAVE immediately instead of requiring manual save
        if (leadId) {
          try {
            await databaseService.updateLead(leadId, { latest_file_updates: newContent });
            toast({
              title: 'Voice Note Saved',
              description: 'Your voice note has been transcribed and saved automatically.',
            });
          } catch (saveError) {
            console.error('Error auto-saving voice note:', saveError);
            // Fallback to manual save if auto-save fails
            setHasUnsavedFileUpdates(true);
            setIsEditingFileUpdates(true);
            toast({
              title: 'Voice Note Added',
              description: 'Your voice note has been transcribed. Please save manually.',
            });
          }
        } else {
          setHasUnsavedFileUpdates(true);
          setIsEditingFileUpdates(true);
        }
      }

      // Check for field update requests in the transcription
      try {
        const currentLeadData = {
          appraisal_eta: (client as any).appr_eta,
          appraisal_status: (client as any).appraisal_status,
          appraisal_value: (client as any).appraisal_value,
          title_eta: (client as any).title_eta,
          title_status: (client as any).title_status,
          condo_eta: (client as any).condo_eta,
          condo_status: (client as any).condo_status,
          insurance_eta: (client as any).insurance_eta,
          hoi_status: (client as any).hoi_status,
          loan_status: (client as any).loan_status,
          disclosure_status: (client as any).disclosure_status,
          close_date: (client as any).close_date,
          lock_expiration_date: (client as any).lock_expiration_date,
          loan_amount: (client as any).loanAmount,
          sales_price: (client as any).salesPrice,
          interest_rate: (client as any).interestRate,
          cd_status: (client as any).cd_status,
          ba_status: (client as any).ba_status,
          package_status: (client as any).package_status,
          epo_status: (client as any).epo_status,
          program: (client as any).program,
          discount_points_percentage: (client as any).discount_points_percentage,
        };

        const { data: fieldUpdateData, error: fieldUpdateError } = await supabase.functions.invoke('parse-field-updates', {
          body: { transcription, currentLeadData }
        });

        if (!fieldUpdateError && (fieldUpdateData?.detectedUpdates?.length > 0 || fieldUpdateData?.taskSuggestions?.length > 0)) {
          setDetectedFieldUpdates(fieldUpdateData.detectedUpdates || []);
          setDetectedTaskSuggestions(fieldUpdateData.taskSuggestions || []);
          setShowFieldUpdateModal(true);
        }
      } catch (fieldParseError) {
        console.error('Error parsing field updates:', fieldParseError);
        // Non-critical error, don't show to user
      }
    } catch (error) {
      console.error('Error processing voice recording:', error);
      toast({
        title: 'Processing Failed',
        description: 'Could not process the voice recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizingTranscript(false);
      
      // Mark that review timestamp needs updating when drawer closes
      // This prevents refreshing the parent list while user is still interacting
      if (leadId && autoStartRecording) {
        needsReviewUpdate.current = true;
        console.log('[ClientDetailDrawer] Marked for review update on close');
      }
    }
  };

  // Handler for applying selected field updates from voice detection
  const handleApplyFieldUpdates = async (selectedUpdates: Array<{
    field: string;
    fieldLabel: string;
    currentValue: string | number | null;
    newValue: string | number;
  }>) => {
    // Mark that we just processed voice to prevent microphone restart
    justProcessedVoice.current = true;
    
    for (const update of selectedUpdates) {
      try {
        let fieldName = update.field;
        let fieldValue: string | number = update.newValue;
        
        // Handle date fields - add time component to prevent timezone shift
        if (fieldName === 'close_date' && typeof fieldValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fieldValue)) {
          fieldValue = `${fieldValue}T12:00:00`;
        }
        
        await handleLeadUpdate(fieldName, fieldValue);
      } catch (error) {
        console.error(`Error updating ${update.field}:`, error);
      }
    }
    
    if (selectedUpdates.length > 0) {
      toast({
        title: 'Fields Updated',
        description: `${selectedUpdates.length} field(s) updated successfully.`,
      });
    }
  };

  const getLastCommunicationTimes = () => {
    // Find most recent activity of each type
    const lastCall = activities.find(a => a.type === 'call');
    const lastText = activities.find(a => a.type === 'sms');
    const lastEmail = activities.find(a => a.type === 'email');
    
    // Helper to format relative time
    const getRelativeTime = (timestamp: string | undefined) => {
      if (!timestamp) return null;
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return '1 day ago';
      return `${diffInDays} days ago`;
    };
    
    return {
      lastCall: lastCall ? getRelativeTime(lastCall.timestamp) : null,
      lastText: lastText ? getRelativeTime(lastText.timestamp) : null,
      lastEmail: lastEmail ? getRelativeTime(lastEmail.timestamp) : null
    };
  };

  const formatLeadCreationDate = () => {
    const createdAt = (client as any).created_at;
    if (!createdAt) return 'N/A';
    
    const date = new Date(createdAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffInDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format date as "Nov 19, 2:34p"
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toLowerCase().replace(' ', '');
    
    // Calculate relative time
    let relativeTime = '';
    if (diffInDays === 0) relativeTime = 'today';
    else if (diffInDays === 1) relativeTime = 'yesterday';
    else relativeTime = `${diffInDays} days ago`;
    
    return `${formattedDate}, ${formattedTime} (${relativeTime})`;
  };

  // Critical status information based on pipeline stage
  const renderCriticalStatusInfo = () => {
    // Normalize stage to handle both hyphenated and underscored variants
    const rawStage = client.ops.stage;
    const stage = rawStage?.replace(/_/g, '-') as typeof rawStage;
    switch (stage) {
      case 'leads': {
        const { lastCall, lastText, lastEmail } = getLastCommunicationTimes();
        
        return (
          <div className="flex flex-col p-4 bg-muted/30 rounded-lg border border-muted/60">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-6 flex-1">
              {/* Left Column: Lead Details - 2x2 grid layout */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Lead Status</span>
                  <InlineEditSelect 
                    value={(client as any).converted || 'Working on it'} 
                    onValueChange={value => handleLeadUpdate('converted', value)} 
                    options={[
                      { value: 'Working on it', label: 'Working on it' },
                      { value: 'Pending App', label: 'Pending App' },
                      { value: 'Nurture', label: 'Nurture' },
                      { value: 'Dead', label: 'Dead' },
                      { value: 'Needs Attention', label: 'Needs Attention' }
                    ]} 
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Lead Strength:</span>
                  <InlineEditSelect 
                    value={localLeadStrength || (client as any).lead_strength || ''} 
                    onValueChange={value => {
                      setLocalLeadStrength(value);
                      handleLeadUpdate('lead_strength', value);
                    }} 
                    options={[
                      { value: 'Hot', label: 'Hot' },
                      { value: 'Warm', label: 'Warm' },
                      { value: 'Cold', label: 'Cold' }
                    ]} 
                    placeholder="Select strength" 
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Referral Method:</span>
                  <InlineEditSelect 
                    value={(client as any).referred_via || ''} 
                    onValueChange={value => handleLeadUpdate('referred_via', value)} 
                    options={[
                      { value: 'Email', label: 'Email' },
                      { value: 'Text', label: 'Text' },
                      { value: 'Call', label: 'Call' },
                      { value: 'Web', label: 'Web' },
                      { value: 'In Person', label: 'In Person' }
                    ]} 
                    placeholder="Select method" 
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Referral Source:</span>
                  <InlineEditSelect 
                    value={(client as any).referral_source || ''} 
                    onValueChange={value => handleLeadUpdate('referral_source', value)} 
                    options={[
                      { value: 'Agent', label: 'Agent' },
                      { value: 'New Agent', label: 'New Agent' },
                      { value: 'Past Client', label: 'Past Client' },
                      { value: 'Personal', label: 'Personal' },
                      { value: 'Social', label: 'Social' },
                      { value: 'Miscellaneous', label: 'Miscellaneous' }
                    ]} 
                    placeholder="Select source" 
                  />
                </div>
              </div>
              
              {/* Middle Column: Last Communication */}
              <div className="self-stretch inline-flex flex-col gap-1.5 border border-border rounded-md px-3 py-2 bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Call</span>
                  <span className="text-sm font-medium">
                    {lastCall || '—'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Text</span>
                  <span className="text-sm font-medium">
                    {lastText || '—'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Email</span>
                  <span className="text-sm font-medium">
                    {lastEmail || '—'}
                  </span>
                </div>
              </div>
              
              {/* Right Column: Financial Goals - Cash to Close Goal removed */}
              <div className="self-stretch space-y-3 min-w-[160px]">
                <div className="border-2 border-primary rounded-md p-3 bg-primary/5">
                  <div className="text-xs text-muted-foreground mb-1">Monthly Payment Goal</div>
                  <InlineEditCurrency 
                    value={(client as any).monthlyPmtGoal ?? null} 
                    onValueChange={value => handleLeadUpdate('monthlyPmtGoal', value)} 
                    placeholder="$0"
                    className="text-lg font-bold"
                  />
                </div>
              </div>
            </div>
            
            {/* Bottom: Lead Creation Date */}
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground italic">
                Lead Creation Date: {formatLeadCreationDate()}
              </span>
            </div>
          </div>
        );
      }
      case 'pending-app': {
        // Pending App uses simplified Leads-style layout: 3 gray fields + Last Call/Text/Email + Monthly Payment Goal
        const { lastCall, lastText, lastEmail } = getLastCommunicationTimes();
        const loanAmountPendingApp = (client as any).loanAmount || (client as any).loan?.loanAmount || 0;
        const salesPricePendingApp = (client as any).salesPrice || (client as any).loan?.salesPrice || 0;
        const ltvPendingApp = salesPricePendingApp > 0 ? ((loanAmountPendingApp / salesPricePendingApp) * 100).toFixed(2) : null;
        
        return (
          <div className="flex flex-col p-4 bg-muted/30 rounded-lg border border-muted/60">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-6 flex-1">
              {/* Left Column: Gray fields - 2x2 grid layout */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Transaction Type:</span>
                  <InlineEditSelect 
                    value={(client as any).loan_type ?? (client as any).loan?.loanType ?? ''} 
                    onValueChange={value => handleLeadUpdate('loan_type', value)} 
                    options={[
                      { value: 'Purchase', label: 'Purchase' },
                      { value: 'Refinance', label: 'Refinance' },
                      { value: 'HELOC', label: 'HELOC' }
                    ]} 
                    placeholder="Select type" 
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Lead Strength:</span>
                  <InlineEditSelect 
                    value={localLeadStrength || (client as any).lead_strength || ''} 
                    onValueChange={value => {
                      setLocalLeadStrength(value);
                      handleLeadUpdate('lead_strength', value);
                    }} 
                    options={[
                      { value: 'Hot', label: 'Hot' },
                      { value: 'Warm', label: 'Warm' },
                      { value: 'Cold', label: 'Cold' }
                    ]} 
                    placeholder="Select strength" 
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">LTV:</span>
                  <span className="text-sm font-medium">{ltvPendingApp ? `${ltvPendingApp}%` : '—'}</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Likely to Apply:</span>
                  <InlineEditSelect 
                    value={localLikelyToApply || (client as any).likely_to_apply || ''} 
                    onValueChange={value => {
                      setLocalLikelyToApply(value);
                      handleLeadUpdate('likely_to_apply', value);
                    }} 
                    options={[
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' }
                    ]} 
                    placeholder="Select likelihood" 
                  />
                </div>
                
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-xs text-muted-foreground">Credit Score:</span>
                  <span className="text-sm font-medium">{localFicoScore ?? (client as any).fico_score ?? '—'}</span>
                </div>
              </div>
              
              {/* Middle Column: Last Communication */}
              <div className="self-start inline-flex flex-col gap-1.5 border border-border rounded-md px-3 py-2 bg-background">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs text-muted-foreground">Last Call</span>
                  <span className="text-sm font-medium">
                    {lastCall || '—'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs text-muted-foreground">Last Text</span>
                  <span className="text-sm font-medium">
                    {lastText || '—'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs text-muted-foreground">Last Email</span>
                  <span className="text-sm font-medium">
                    {lastEmail || '—'}
                  </span>
                </div>
              </div>
              
              {/* Right Column: Monthly Payment Goal only */}
              <div className="space-y-3 min-w-[160px]">
                <div className="border-2 border-primary rounded-md p-3 bg-primary/5">
                  <div className="text-xs text-muted-foreground mb-1">Monthly Payment Goal</div>
                  <InlineEditCurrency 
                    value={(client as any).monthlyPmtGoal ?? null} 
                    onValueChange={value => handleLeadUpdate('monthlyPmtGoal', value)} 
                    placeholder="$0"
                    className="text-lg font-bold"
                  />
                </div>
              </div>
            </div>
            
            {/* Bottom: Pending App Date */}
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground italic">
                Pending App Date: {(client as any).pending_app_at ? format(new Date((client as any).pending_app_at), 'MMM dd, yyyy') : '—'}
              </span>
            </div>
          </div>
        );
      }
      case 'screening':
      case 'pre-qualified':
      case 'pre-approved': {
        // Calculate LTV for early stages
        const loanAmountEarly = (client as any).loanAmount || (client as any).loan?.loanAmount || 0;
        const salesPriceEarly = (client as any).salesPrice || (client as any).loan?.salesPrice || 0;
        const ltvEarly = salesPriceEarly > 0 ? ((loanAmountEarly / salesPriceEarly) * 100).toFixed(2) : null;
        
        // Calculate front-end and back-end DTI for early stages
        // Total Income = total_monthly_income + subject_property_rental_income only
        // (REO expenses are already included in monthly_liabilities on debt side)
        const baseIncomeEarly = (client as any).total_monthly_income || (client as any).totalMonthlyIncome || 0;
        const subjectPropertyRentalEarly = (client as any).subject_property_rental_income || 0;
        const totalIncomeEarly = baseIncomeEarly + subjectPropertyRentalEarly;
        const monthlyLiabilitiesEarly = (client as any).monthly_liabilities || 0;
        const pitiEarly = localPiti ?? (client as any).piti ?? 0;
        
        const frontEndDtiEarly = totalIncomeEarly > 0 ? ((pitiEarly / totalIncomeEarly) * 100).toFixed(2) : null;
        const backEndDtiEarly = totalIncomeEarly > 0 ? (((pitiEarly + monthlyLiabilitiesEarly) / totalIncomeEarly) * 100).toFixed(2) : null;
        const dtiDisplayEarly = frontEndDtiEarly && backEndDtiEarly 
          ? `${frontEndDtiEarly}% / ${backEndDtiEarly}%` 
          : (client as any).dti 
            ? `${(client as any).dti}%` 
            : '—';
        
        // Get total assets value properly
        const totalAssetsValueEarly = (client as any).assets ?? (client as any).total_assets ?? (client as any).totalAssets;

        return <div className="overflow-y-auto flex flex-col p-4 pb-6 bg-muted/30 rounded-lg border border-muted/60">
            <div className="grid grid-cols-4 gap-4">
              {/* Row 1: MB App Number, LTV, Credit Score, Interest Rate */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">MB App Number</span>
                <span className="text-sm font-medium">{(client as any).mbLoanNumber || (client as any).mb_loan_number || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">LTV</span>
                <span className="text-sm font-medium">{ltvEarly ? `${ltvEarly}%` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Credit Score</span>
                <span className="text-sm font-medium">{localFicoScore ?? (client as any).fico_score ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Interest Rate</span>
                <span className="text-sm font-medium">{localInterestRate ?? (client as any).interest_rate ? `${localInterestRate ?? (client as any).interest_rate}%` : '—'}</span>
              </div>
              
              {/* Row 2: Monthly Income, Cash to Close, PITI, Discount Points */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Monthly Income</span>
                <span className="text-sm font-medium">{totalIncomeEarly ? `$${totalIncomeEarly.toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Cash to Close</span>
                <span className="text-sm font-medium">{localCashToClose ?? (client as any).cash_to_close ?? (client as any).cashToClose ? `$${(localCashToClose ?? (client as any).cash_to_close ?? (client as any).cashToClose).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">PITI</span>
                <span className="text-sm font-medium">{localPiti ?? (client as any).piti ? `$${(localPiti ?? (client as any).piti).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Discount Points</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const pct = (client as any).discount_points_percentage;
                    const loanAmt = Number(client.loan?.loanAmount) || 0;
                    if (pct && loanAmt > 0) {
                      const dollarAmt = (pct / 100) * loanAmt;
                      return `${pct.toFixed(3)}% ($${dollarAmt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
                    }
                    return pct ? `${pct.toFixed(3)}%` : '—';
                  })()}
                </span>
              </div>

              {/* Row 3: Transaction Type, Closing Costs, Total Assets, DTI */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Transaction Type</span>
                <span className="text-sm font-medium">{(client as any).loan_type ?? (client as any).loan?.loanType ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Closing Costs</span>
                <span className="text-sm font-medium">{(client as any).closing_costs ?? (client as any).closingCosts ? `$${((client as any).closing_costs ?? (client as any).closingCosts).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Total Assets</span>
                <span className="text-sm font-medium">{totalAssetsValueEarly ? `$${totalAssetsValueEarly.toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">DTI</span>
                <span className="text-sm font-medium">{dtiDisplayEarly}</span>
              </div>
            </div>
          </div>;
      }
      default:
        // Calculate LTV
        const loanAmount = (client as any).loanAmount || (client as any).loan?.loanAmount || 0;
        const salesPrice = (client as any).salesPrice || (client as any).loan?.salesPrice || 0;
        const ltv = salesPrice > 0 ? ((loanAmount / salesPrice) * 100).toFixed(2) : null;
        
        // Calculate front-end and back-end DTI
        // Total Income = total_monthly_income + subject_property_rental_income only
        // (REO expenses are already included in monthly_liabilities on debt side)
        const baseIncome = (client as any).total_monthly_income || (client as any).totalMonthlyIncome || 0;
        const subjectPropertyRental = (client as any).subject_property_rental_income || 0;
        const totalIncome = baseIncome + subjectPropertyRental;
        const monthlyLiabilities = (client as any).monthly_liabilities || 0;
        const piti = localPiti ?? (client as any).piti ?? 0;
        
        const frontEndDti = totalIncome > 0 ? ((piti / totalIncome) * 100).toFixed(2) : null;
        const backEndDti = totalIncome > 0 ? (((piti + monthlyLiabilities) / totalIncome) * 100).toFixed(2) : null;
        const dtiDisplay = frontEndDti && backEndDti 
          ? `${frontEndDti}% / ${backEndDti}%` 
          : (client as any).dti 
            ? `${(client as any).dti}%` 
            : '—';

        return <div className="overflow-y-auto flex flex-col p-4 pb-6 bg-muted/30 rounded-lg border border-muted/60">
            <div className="grid grid-cols-4 gap-4">
              {/* Row 0: Status Fields - Appraisal, Title, HOI, Condo */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Appraisal</span>
                <StatusBadge status={(client as any).appraisal_status || '—'} className="text-xs h-6 min-w-0 px-2" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Title</span>
                <StatusBadge status={(client as any).title_status || '—'} className="text-xs h-6 min-w-0 px-2" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">HOI</span>
                <StatusBadge status={(client as any).hoi_status || '—'} className="text-xs h-6 min-w-0 px-2" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Condo</span>
                <StatusBadge status={(client as any).condo_status || '—'} className="text-xs h-6 min-w-0 px-2" />
              </div>

              {/* Row 1: Lender Loan #, LTV, Credit Score, Interest Rate */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Lender Loan #</span>
                <span className="text-sm font-medium">{(client as any).lenderLoanNumber || (client as any).lender_loan_number || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">LTV</span>
                <span className="text-sm font-medium">{ltv ? `${ltv}%` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Credit Score</span>
                <span className="text-sm font-medium">{localFicoScore ?? (client as any).fico_score ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Interest Rate</span>
                <span className="text-sm font-medium">{localInterestRate ?? (client as any).interest_rate ? `${localInterestRate ?? (client as any).interest_rate}%` : '—'}</span>
              </div>
              
              {/* Row 2: Closing Date, Cash to Close, PITI, Discount Points */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Closing Date</span>
                <span className="text-sm font-medium">{formatDateFull(localCloseDate) || formatDateFull((client as any).close_date) || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Cash to Close</span>
                <span className="text-sm font-medium">{localCashToClose ?? (client as any).cash_to_close ?? (client as any).cashToClose ? `$${(localCashToClose ?? (client as any).cash_to_close ?? (client as any).cashToClose).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">PITI</span>
                <span className="text-sm font-medium">{localPiti ?? (client as any).piti ? `$${(localPiti ?? (client as any).piti).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Discount Points</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const pct = (client as any).discount_points_percentage;
                    const loanAmt = Number(client.loan?.loanAmount) || 0;
                    if (pct && loanAmt > 0) {
                      const dollarAmt = (pct / 100) * loanAmt;
                      return `${pct.toFixed(3)}% ($${dollarAmt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
                    }
                    return pct ? `${pct.toFixed(3)}%` : '—';
                  })()}
                </span>
              </div>

              {/* Row 3: Lender, Closing Costs, Lock Expiration, DTI */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Lender</span>
                <span className="text-sm font-medium">{(client as any).approved_lender?.lender_name || (client as any).lender_name || (client as any).lenderName || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Closing Costs</span>
                <span className="text-sm font-medium">{(client as any).closing_costs ?? (client as any).closingCosts ? `$${((client as any).closing_costs ?? (client as any).closingCosts).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1",
                  (() => {
                    const closeDate = (client as any).close_date || localCloseDate;
                    const lockExpiration = (client as any).lock_expiration_date;
                    if (!closeDate || lockExpiration) return false;
                    const closeDateObj = new Date(closeDate);
                    const now = new Date();
                    const diffDays = Math.ceil((closeDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30;
                  })() && "text-red-600 font-medium"
                )}>
                  <Calendar className={cn(
                    "h-3 w-3",
                    (() => {
                      const closeDate = (client as any).close_date || localCloseDate;
                      const lockExpiration = (client as any).lock_expiration_date;
                      if (!closeDate || lockExpiration) return false;
                      const closeDateObj = new Date(closeDate);
                      const now = new Date();
                      const diffDays = Math.ceil((closeDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays >= 0 && diffDays <= 30;
                    })() && "text-red-600"
                  )} />
                  Lock Expiration
                </span>
                <span className="text-sm font-medium">{formatDateFull((client as any).lock_expiration_date) || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">DTI</span>
                <span className="text-sm font-medium">{dtiDisplay}</span>
              </div>
            </div>
          </div>;
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
      const pipelineStage = PIPELINE_CONFIGS[pipelineType]?.find(stage => stage.label === normalizedLabel || stage.key === normalizedLabel.toLowerCase().replace(/\s+/g, '-'));
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
    
    // Validate pipeline stage change requirements
    const targetStageKeyVal = normalizedLabel.toLowerCase().replace(/\s+/g, '-');
    const pipelineValidation = validatePipelineStageChange(targetStageKeyVal, client);
    
    if (!pipelineValidation.isValid && pipelineValidation.rule) {
      setPipelineValidationRule(pipelineValidation.rule);
      setPipelineValidationMissingFields(pipelineValidation.missingFields || []);
      setPendingPipelineStage({ stageId, stageLabel: normalizedLabel });
      setIsRefinanceBypass(false);
      setPipelineValidationModalOpen(true);
      return;
    }
    
    try {
      // Define stage order for forward progression detection
      const STAGE_ORDER = ['leads', 'pending-app', 'screening', 'pre-qualified', 'pre-approved', 'active'];
      const STAGE_DATE_FIELDS: Record<string, string> = {
        'pending-app': 'pending_app_at',
        'screening': 'app_complete_at',
        'pre-qualified': 'pre_qualified_at',
        'pre-approved': 'pre_approved_at',
        'active': 'active_at'
      };

      // Get current stage key from client
      const currentStageKey = client.ops.stage;
      const targetStageKey = normalizedLabel.toLowerCase().replace(/\s+/g, '-');
      
      const currentIndex = STAGE_ORDER.indexOf(currentStageKey);
      const targetIndex = STAGE_ORDER.indexOf(targetStageKey);

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

      // If moving forward (skipping stages), auto-populate intermediate stage dates
      if (currentIndex !== -1 && targetIndex !== -1 && targetIndex > currentIndex) {
        const now = new Date().toISOString();
        
        // Fill in all intermediate stage dates
        for (let i = currentIndex + 1; i <= targetIndex; i++) {
          const stageKey = STAGE_ORDER[i];
          const dateField = STAGE_DATE_FIELDS[stageKey];
          
          if (dateField) {
            updateData[dateField] = now;
          }
        }
      }

      // If moving to Pre-Approved, set default converted status to "New"
      const isPreApproved = normalizedLabel === 'Pre-Approved' || stageId === '3cbf38ff-752e-4163-a9a3-1757499b4945';
      if (isPreApproved) {
        updateData.converted = 'New';
      }

      // If moving to Active, also update the pipeline_section to Incoming and always set loan_status to NEW
      // Use both label and UUID to ensure reliable detection
      const isActiveStage = normalizedLabel.toLowerCase() === 'active' || stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
      if (isActiveStage) {
        updateData.pipeline_section = 'Incoming';
        // Always set NEW loan_status when moving to Active stage (triggers task automations)
        updateData.loan_status = 'NEW';
      }
      await databaseService.updateLead(leadId, updateData);
      toast({
        title: `Lead moved to ${normalizedLabel}`,
        description: normalizedLabel === 'Active' ? "Lead converted to Active deal successfully!" : "Pipeline stage updated successfully"
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
    
    // Determine pipeline_section changes based on status
    // This mirrors the logic in Active.tsx to ensure consistency
    const currentSection = (client as any).pipeline_section;
    let updateData: Record<string, any> = {
      loan_status: dbValue as "NEW" | "RFP" | "SUV" | "AWC" | "CTC"
    };
    
    // NEW or RFP should always move to Incoming (unless already Closed)
    if ((statusLabel === 'NEW' || statusLabel === 'RFP') && currentSection !== 'Closed') {
      updateData.pipeline_section = 'Incoming';
    }
    // SUB, AWC, CTC should move from Incoming to Live
    else if ((statusLabel === 'SUB' || statusLabel === 'AWC' || statusLabel === 'CTC') && currentSection === 'Incoming') {
      updateData.pipeline_section = 'Live';
    }
    
    try {
      await databaseService.updateLead(leadId, updateData);
      
      const sectionChanged = updateData.pipeline_section && updateData.pipeline_section !== currentSection;
      toast({
        title: `Loan status updated to ${statusLabel}`,
        description: sectionChanged 
          ? `Status updated and moved to ${updateData.pipeline_section}` 
          : "Status updated successfully"
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

  const handlePastClientsStatusClick = async (statusLabel: string) => {
    const leadId = getLeadId();
    if (!leadId) {
      console.error('Cannot update past client status: missing leadId');
      return;
    }

    // Special handling for "New Lead" - create a copy of the lead
    if (statusLabel === 'New Lead') {
      try {
        // Create new lead record with borrower's info
        const newLead = await databaseService.createLead({
          first_name: client.person.firstName,
          last_name: client.person.lastName,
          phone: client.person.phone || '',
          email: client.person.email || '',
          pipeline_stage_id: '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945', // Leads stage
          referral_source: 'Past Client',
          status: 'Working on it',
          lead_on_date: new Date().toISOString().split('T')[0]
        });

        toast({
          title: "New Lead Created",
          description: `New lead created from past client: ${client.person.firstName} ${client.person.lastName}`,
        });

        // Also update current lead status to "New Lead"
        await databaseService.updateLead(leadId, {
          loan_status: statusLabel as any
        });

        // Refresh parent page data
        if (onLeadUpdated) {
          await onLeadUpdated();
        }

        // Close drawer
        onClose();
      } catch (error) {
        console.error('Error creating new lead:', error);
        toast({
          title: "Error",
          description: "Failed to create new lead",
          variant: "destructive"
        });
      }
      return;
    }

    // Regular status update for other statuses
    try {
      await databaseService.updateLead(leadId, {
        loan_status: statusLabel as any
      });
      toast({
        title: `Status updated to ${statusLabel}`,
        description: "Status updated successfully"
      });

      // Refresh parent page data
      if (onLeadUpdated) {
        await onLeadUpdated();
      }

      // Close drawer to show updated status in table
      onClose();
    } catch (error) {
      console.error('Error updating past client status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
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
    if (!leadId) return;
    
    try {
      const tasks = await databaseService.getLeadTasks(leadId);
      
      // For task activities from tasks table, activity.id IS the task ID
      // For legacy note-based task logs, activity.task_id stores the title
      let matchingTask;
      
      if (activity.type === 'task' && activity.task_id) {
        // Direct task activity - use task_id which is the actual task UUID
        matchingTask = tasks.find(t => t.id === String(activity.task_id));
      }
      
      // Fallback: search by title if not found by ID
      if (!matchingTask) {
        const taskTitle = activity.task_id;
        matchingTask = tasks.find(t => t.title === taskTitle);
      }
      
      if (matchingTask) {
        setSelectedTask(matchingTask);
        setShowTaskDetailModal(true);
      } else {
        toast({
          title: "Task Not Found",
          description: "The task may have been deleted or moved.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error finding task:", error);
      toast({
        title: "Error",
        description: "Failed to open task details",
        variant: "destructive"
      });
    }
  };
  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Done" ? "To Do" : "Done";

    // If marking as Done, validate first
    if (newStatus === "Done") {
      const task = leadTasks.find(t => t.id === taskId);
      if (task) {
        const validation = await validateTaskCompletion(task);
        if (!validation.canComplete) {
          // Show requirement modal
          setCompletionRequirement(validation);
          setPendingTaskId(taskId);
          setRequirementModalOpen(true);
          return; // Don't update status yet
        }
      }
    }
    try {
      await databaseService.updateTask(taskId, {
        status: newStatus
      });
      
      // If marked as Done, check if there are any other open tasks
      if (newStatus === "Done" && leadId) {
        // Check remaining open tasks (exclude the one we just completed)
        const remainingOpenTasks = leadTasks.filter(t => t.id !== taskId && t.status !== 'Done');
        
        if (remainingOpenTasks.length === 0) {
          // Show the create next task modal instead of auto-creating placeholder
          setShowCreateNextTaskModal(true);
        }
      }
      
      await loadLeadTasks();
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };
  const handleLogCallFromTaskModal = () => {
    if (!completionRequirement?.contactInfo) return;
    const contactInfo = completionRequirement.contactInfo;
    if (contactInfo.type === 'buyer_agent' || contactInfo.type === 'listing_agent') {
      setSelectedAgentForCall({
        id: contactInfo.id,
        first_name: contactInfo.name.split(' ')[0],
        last_name: contactInfo.name.split(' ').slice(1).join(' ')
      });
      setAgentCallLogModalOpen(true);
      setRequirementModalOpen(false);
    } else if (contactInfo.type === 'borrower') {
      setShowCallLogModal(true);
      setRequirementModalOpen(false);
    }
  };
  const handleAgentCallLoggedForTask = async () => {
    setAgentCallLogModalOpen(false);

    // Retry the pending status change after call is logged
    if (pendingTaskId) {
      const task = leadTasks.find(t => t.id === pendingTaskId);
      if (task) {
        try {
          await databaseService.updateTask(pendingTaskId, {
            status: "Done"
          });
          await loadLeadTasks();
          toast({
            title: "Success",
            description: "Task completed successfully"
          });
        } catch (error) {
          console.error("Error completing task:", error);
          toast({
            title: "Error",
            description: "Failed to complete task",
            variant: "destructive"
          });
        }
        setPendingTaskId(null);
      }
    }
  };

  // Initialize with mock data
  React.useEffect(() => {
    if (activities.length === 0) {
      setActivities([{
        id: 1,
        type: 'call',
        title: 'Phone call completed',
        description: 'Discussed loan terms and next steps',
        timestamp: '2024-01-18T10:30:00Z',
        user: 'Yousif'
      }, {
        id: 2,
        type: 'email',
        title: 'Pre-approval letter sent',
        description: 'Sent conditional pre-approval letter with terms',
        timestamp: '2024-01-17T15:45:00Z',
        user: 'System'
      }, {
        id: 3,
        type: 'note',
        title: 'Document review completed',
        description: 'Reviewed all submitted financial documents. Everything looks good.',
        timestamp: '2024-01-16T14:20:00Z',
        user: 'Salma'
      }, {
        id: 4,
        type: 'sms',
        title: 'SMS reminder sent',
        description: 'Reminded client about upcoming appraisal appointment',
        timestamp: '2024-01-15T09:15:00Z',
        user: 'Herman Daza'
      }, {
        id: 5,
        type: 'call',
        title: 'Follow-up call',
        description: 'Checked in on client questions about closing costs',
        timestamp: '2024-01-14T16:30:00Z',
        user: 'Yousif'
      }, {
        id: 6,
        type: 'email',
        title: 'Rate lock confirmation',
        description: 'Confirmed 30-day rate lock at 6.875%',
        timestamp: '2024-01-12T11:00:00Z',
        user: 'System'
      }, {
        id: 7,
        type: 'note',
        title: 'Initial consultation',
        description: 'Met with client to discuss loan options and timeline',
        timestamp: '2024-01-10T13:45:00Z',
        user: 'Yousif'
      }]);
    }
  }, []);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const handleOverlayClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Auto-save unsaved notes/file updates before closing
      if (hasUnsavedNotes) await saveNotes(true);
      if (hasUnsavedFileUpdates) await saveFileUpdates(true);
      onClose();
    }
  };
  const handleDrawerClose = async () => {
    // Auto-save unsaved notes/file updates before closing
    if (hasUnsavedNotes) await saveNotes(true);
    if (hasUnsavedFileUpdates) await saveFileUpdates(true);

    setNewNote("");
    setShowCreateTaskModal(false);
    setShowCallLogModal(false);
    setShowSmsLogModal(false);
    setShowEmailLogModal(false);
    setShowAddNoteModal(false);
    
    // Update last_morning_review_at if this was a review session
    if (needsReviewUpdate.current && leadId) {
      try {
        await databaseService.updateLead(leadId, { 
          last_morning_review_at: new Date().toISOString() 
        });
        console.log('[ClientDetailDrawer] Updated last_morning_review_at on close');
        needsReviewUpdate.current = false;
        // Refresh parent list to remove this lead from Review filter
        if (onLeadUpdated) {
          await onLeadUpdated();
        }
      } catch (reviewError) {
        console.error('Error updating last_morning_review_at:', reviewError);
      }
    }
    
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex" onClick={handleOverlayClick}>
      {/* Drawer */}
      <div className="left-60 h-full bg-background shadow-strong animate-in slide-in-from-right duration-300 border-l z-[60] absolute pointer-events-auto" style={{
      width: 'calc(100vw - 240px)'
    }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background p-4 pt-2">
        </div>

        {/* Main Two-Row Layout */}
        <div className="flex flex-col h-[calc(100vh-80px)] min-h-0 p-4 pt-0 gap-4">
          {/* Top Row - equal height cards */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] items-stretch gap-4">
            {/* Left: Contact Info Card */}
            <ContactInfoCard client={client} onClose={handleDrawerClose} leadId={leadId} onLeadUpdated={onLeadUpdated} />

            {/* Center: Pipeline/Status Card */}
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 pt-4">
              {(pipelineType === 'leads' || pipelineType === 'active' || pipelineType === 'past-clients') && (() => {
                const pipelineStageName = (client as any).pipeline_stage?.name || '';
                const isActiveStage = pipelineStageName.toLowerCase() === 'active' || 
                  (client as any).pipeline_stage_id === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
                const isPastClientsStage = pipelineStageName.toLowerCase() === 'past clients' || 
                  (client as any).pipeline_stage_id === 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';
                const effectivePipelineType = isActiveStage ? 'active' : isPastClientsStage ? 'past-clients' : pipelineType;
                
                return (
                  <PipelineStageBar 
                    stages={PIPELINE_CONFIGS[effectivePipelineType]?.map(stage => stage.label.replace(/([a-z])([A-Z])/g, '$1 $2')) || []} 
                    currentStage={effectivePipelineType === 'active' || isActiveStage ? (() => {
                      const raw = (client as any).loanStatus || (client as any).loan_status || client.ops.status || '';
                      const upper = String(raw).toUpperCase();
                      return upper === 'SUV' ? 'SUB' : upper;
                    })() : effectivePipelineType === 'past-clients' || isPastClientsStage ? (() => {
                      const loanStatus = (client as any).loanStatus || (client as any).loan_status || 'Closed';
                      if (loanStatus === 'Closed') return 'Closed';
                      if (loanStatus === 'Needs Support' || loanStatus === 'Need Support') return 'Needs Support';
                      if (loanStatus === 'New Lead') return 'New Lead';
                      return 'Closed';
                    })() : (() => {
                      const s = client.ops.stage;
                      const config = PIPELINE_CONFIGS['leads'];
                      if (!s) return 'New';
                      const byKey = config.find(st => st.key === s);
                      if (byKey) return byKey.label;
                      const byLabel = config.find(st => st.label.toLowerCase() === String(s).toLowerCase());
                      return byLabel ? byLabel.label : 'New';
                    })()} 
                    size="md" 
                    clickable={true} 
                    onStageClick={effectivePipelineType === 'active' || isActiveStage ? handleActiveLoanStatusClick : effectivePipelineType === 'past-clients' || isPastClientsStage ? handlePastClientsStatusClick : handlePipelineStageClick} 
                  />
                );
              })()}

                {/* Critical Status Information - Dynamic based on stage */}
                <div className="mt-4">
                  {renderCriticalStatusInfo()}
                </div>
              </CardContent>
            </Card>

            {/* Right: Send Email Templates Card */}
            <SendEmailTemplatesCard leadId={leadId || ""} />
          </div>

          {/* Bottom Area - scrollable columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 flex-1 min-h-0">
          {/* Left Column - core content by stage */}
          {(() => {
            const opsStage = client.ops?.stage?.toLowerCase() || '';
            const isActiveOrPastClient = opsStage === 'active' || opsStage === 'past-clients';
            const isLeadsOrPendingApp = opsStage === 'leads' || opsStage === 'pending-app';
            const isScreeningOrPreQualOrPreApproved = opsStage === 'screening' || opsStage === 'pre-qualified' || opsStage === 'pre-approved';
            
            return (
              <div className="space-y-4 overflow-y-auto">

                {/* For Leads/Pending App: About the Borrower in left column */}
                {isLeadsOrPendingApp && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">About the Borrower</CardTitle>
                        {!isEditingNotes && localNotes && <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-7 text-xs">
                            Edit
                          </Button>}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingNotes || !localNotes ? <>
                          <Textarea key="notes-textarea-left" value={localNotes} onChange={e => {
                        setLocalNotes(e.target.value);
                        setHasUnsavedNotes(true);
                      }} onBlur={() => { if (hasUnsavedNotes) saveNotes(); }} placeholder="Describe the borrower, how they were referred, what they're looking for..." className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" />
                          {hasUnsavedNotes && <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveNotes()} disabled={isSavingNotes}>
                                {isSavingNotes ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                          setLocalNotes((client as any).notes || '');
                          setHasUnsavedNotes(false);
                          setIsEditingNotes(false);
                        }}>
                                Cancel
                              </Button>
                            </div>}
                        </> : <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingNotes(true)}>
                          {localNotes.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>)}
                        </div>}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).notes_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).notes_updated_at), 'MMM dd, yyyy h:mm a')}
                            {notesUpdatedByUser && <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {notesUpdatedByUser.first_name} {notesUpdatedByUser.last_name}
                              </>}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Latest File Update - for Leads/Pending App in left column */}
                {isLeadsOrPendingApp && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
                        {!isEditingFileUpdates && localFileUpdates && (
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingFileUpdates(true)} className="h-7 text-xs">
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingFileUpdates || !localFileUpdates ? (
                        <>
                          <Textarea 
                            key="file-updates-textarea-leads" 
                            value={localFileUpdates} 
                            onChange={e => {
                              setLocalFileUpdates(e.target.value);
                              setHasUnsavedFileUpdates(true);
                            }}
                            onBlur={() => { if (hasUnsavedFileUpdates) saveFileUpdates(); }}
                            placeholder="Enter the latest update on this file..." 
                            className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" 
                          />
                          {hasUnsavedFileUpdates && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveFileUpdates()} disabled={isSavingFileUpdates}>
                                {isSavingFileUpdates ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setLocalFileUpdates((client as any).latest_file_updates || '');
                                setHasUnsavedFileUpdates(false);
                                setIsEditingFileUpdates(false);
                              }}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingFileUpdates(true)}>
                          {localFileUpdates.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0 leading-relaxed">{line || <br />}</p>)}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).latest_file_updates_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}
                            {fileUpdatesUpdatedByUser && (
                              <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {fileUpdatesUpdatedByUser.first_name} {fileUpdatesUpdatedByUser.last_name}
                              </>
                            )}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Chat with Borrower - For Leads/Pending App in LEFT column (moved from right) */}
                {isLeadsOrPendingApp && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                        <CardHeader className="pb-3">
                          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
                            <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                            <CardTitle className="text-sm font-semibold">Chat with Borrower</CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-3">
                          <div className="space-y-2 min-h-[200px] max-h-[200px] overflow-y-auto border rounded p-2 bg-muted/30">
                            <div className="flex justify-end">
                              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                                <p className="text-sm">Hi! Just wanted to check in on your loan application.</p>
                                <p className="text-xs opacity-75 mt-1">Today 2:30 PM</p>
                              </div>
                            </div>
                            <div className="flex justify-start">
                              <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                                <p className="text-sm">Everything is going well. I submitted the documents.</p>
                                <p className="text-xs text-muted-foreground mt-1">Today 2:45 PM</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1" onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }} />
                            <Button size="sm" onClick={handleSendMessage}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Quick Actions - For Leads/Pending App in left column */}
                {(() => {
                  const opsStage = client.ops?.stage?.toLowerCase() || '';
                  const isLeadsOrPendingApp = opsStage === 'leads' || opsStage === 'pending-app';
                  const isPreQualOrPreApproved = opsStage === 'pre-qualified' || opsStage === 'pre-approved';
                  if (isPreQualOrPreApproved) return null;
                  return (
                    <Collapsible defaultOpen={!isLeadsOrPendingApp}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
                            <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent className="bg-gray-50">
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="default" 
                                className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
                                onClick={() => setShowPreApprovalModal(true)}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="font-semibold text-sm">Pre-Approval</span>
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="default" 
                                className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
                                onClick={() => setShowLoanEstimateModal(true)}
                              >
                                <FileCheck className="h-4 w-4" />
                                <span className="font-semibold text-sm">Loan Estimate</span>
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })()}

                {/* DTI / Address / PITI - For Leads/Pending App in left column */}
                {(() => {
                  const opsStage = client.ops?.stage?.toLowerCase() || '';
                  const isActiveOrPastClient = opsStage === 'active' || opsStage === 'past-clients';
                  const isLeadsOrPendingApp = opsStage === 'pending-app';
                  if (isActiveOrPastClient || !isLeadsOrPendingApp) return null;
                  return (
                    <LeadTeamContactsDatesCard 
                      leadId={leadId || ""} 
                      onLeadUpdated={onLeadUpdated} 
                      defaultCollapsed={true}
                    />
                  );
                })()}

                {/* Third Party Items - For early stages in left column */}
                {(() => {
                  const opsStage = client.ops?.stage?.toLowerCase() || '';
                  const isActiveOrPastClient = opsStage === 'active' || opsStage === 'past-clients';
                  if (isActiveOrPastClient || opsStage === 'leads') return null;
                  return (
                    <LeadThirdPartyItemsCard leadId={leadId || ""} defaultCollapsed={true} />
                  );
                })()}

                {/* About the Borrower - For Screening stage ONLY in left column (above DTI) */}
                {opsStage === 'screening' && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">About the Borrower</CardTitle>
                        {!isEditingNotes && localNotes && <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-7 text-xs">
                            Edit
                          </Button>}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingNotes || !localNotes ? <>
                          <Textarea key="notes-textarea-screening-left" value={localNotes} onChange={e => {
                        setLocalNotes(e.target.value);
                        setHasUnsavedNotes(true);
                      }} onBlur={() => { if (hasUnsavedNotes) saveNotes(); }} placeholder="Describe the borrower, how they were referred, what they're looking for..." className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" />
                          {hasUnsavedNotes && <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveNotes()} disabled={isSavingNotes}>
                                {isSavingNotes ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                          setLocalNotes((client as any).notes || '');
                          setHasUnsavedNotes(false);
                          setIsEditingNotes(false);
                        }}>
                                Cancel
                              </Button>
                            </div>}
                        </> : <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingNotes(true)}>
                          {localNotes.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>)}
                        </div>}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).notes_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).notes_updated_at), 'MMM dd, yyyy h:mm a')}
                            {notesUpdatedByUser && <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {notesUpdatedByUser.first_name} {notesUpdatedByUser.last_name}
                              </>}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Latest File Update - For Screening stage in left column (after About the Borrower) */}
                {opsStage === 'screening' && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
                        {!isEditingFileUpdates && localFileUpdates && (
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingFileUpdates(true)} className="h-7 text-xs">
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingFileUpdates || !localFileUpdates ? (
                        <>
                          <Textarea 
                            key="file-updates-textarea-screening" 
                            value={localFileUpdates} 
                            onChange={e => {
                              setLocalFileUpdates(e.target.value);
                              setHasUnsavedFileUpdates(true);
                            }}
                            onBlur={() => { if (hasUnsavedFileUpdates) saveFileUpdates(); }}
                            placeholder="Enter the latest update on this file..." 
                            className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" 
                          />
                          {hasUnsavedFileUpdates && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveFileUpdates()} disabled={isSavingFileUpdates}>
                                {isSavingFileUpdates ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setLocalFileUpdates((client as any).latest_file_updates || '');
                                setHasUnsavedFileUpdates(false);
                                setIsEditingFileUpdates(false);
                              }}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingFileUpdates(true)}>
                          {localFileUpdates.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0 leading-relaxed">{line || <br />}</p>)}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).latest_file_updates_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}
                            {fileUpdatesUpdatedByUser && (
                              <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {fileUpdatesUpdatedByUser.first_name} {fileUpdatesUpdatedByUser.last_name}
                              </>
                            )}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* About the Borrower - For Pre-Qualified/Pre-Approved in left column (ABOVE DTI) */}
                {(opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">About the Borrower</CardTitle>
                        {!isEditingNotes && localNotes && <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-7 text-xs">
                            Edit
                          </Button>}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingNotes || !localNotes ? <>
                          <Textarea key={`notes-textarea-${opsStage}-top`} value={localNotes} onChange={e => {
                        setLocalNotes(e.target.value);
                        setHasUnsavedNotes(true);
                      }} onBlur={() => { if (hasUnsavedNotes) saveNotes(); }} placeholder="Describe the borrower, how they were referred, what they're looking for..." className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" />
                          {hasUnsavedNotes && <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveNotes()} disabled={isSavingNotes}>
                                {isSavingNotes ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                          setLocalNotes((client as any).notes || '');
                          setHasUnsavedNotes(false);
                          setIsEditingNotes(false);
                        }}>
                                Cancel
                              </Button>
                            </div>}
                        </> : <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingNotes(true)}>
                          {localNotes.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>)}
                        </div>}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).notes_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).notes_updated_at), 'MMM dd, yyyy h:mm a')}
                            {notesUpdatedByUser && <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {notesUpdatedByUser.first_name} {notesUpdatedByUser.last_name}
                              </>}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* DTI / Address / PITI - For Screening/Pre-Qualified/Pre-Approved in left column */}
                {(opsStage === 'screening' || opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (
                  <LeadTeamContactsDatesCard 
                    leadId={leadId || ""} 
                    onLeadUpdated={onLeadUpdated} 
                    defaultCollapsed={false}
                  />
                )}

                {/* Latest File Update - For Pre-Qualified/Pre-Approved in left column (at bottom) */}
                {(opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
                        {!isEditingFileUpdates && localFileUpdates && (
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingFileUpdates(true)} className="h-7 text-xs">
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50">
                      {isEditingFileUpdates || !localFileUpdates ? (
                        <>
                          <Textarea 
                            key={`file-updates-textarea-${opsStage}`}
                            value={localFileUpdates} 
                            onChange={e => {
                              setLocalFileUpdates(e.target.value);
                              setHasUnsavedFileUpdates(true);
                            }}
                            onBlur={() => { if (hasUnsavedFileUpdates) saveFileUpdates(); }}
                            placeholder="Enter the latest update on this file..." 
                            className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" 
                          />
                          {hasUnsavedFileUpdates && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                              <Button size="sm" onClick={() => saveFileUpdates()} disabled={isSavingFileUpdates}>
                                {isSavingFileUpdates ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setLocalFileUpdates((client as any).latest_file_updates || '');
                                setHasUnsavedFileUpdates(false);
                                setIsEditingFileUpdates(false);
                              }}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingFileUpdates(true)}>
                          {localFileUpdates.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0 leading-relaxed">{line || <br />}</p>)}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {(client as any).latest_file_updates_updated_at ? (
                          <>
                            Last updated: {format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}
                            {fileUpdatesUpdatedByUser && (
                              <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                {fileUpdatesUpdatedByUser.first_name} {fileUpdatesUpdatedByUser.last_name}
                              </>
                            )}
                          </>
                        ) : (
                          <span className="italic">No updates yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* For Active/Past Clients: Third Party Items at top */}
                {isActiveOrPastClient && (
                  <LeadThirdPartyItemsCard leadId={leadId || ""} />
                )}

                {/* DTI / Address / PITI - Only for Active/Past Clients in left column */}
                {isActiveOrPastClient && (
                  <LeadTeamContactsDatesCard 
                    leadId={leadId || ""} 
                    onLeadUpdated={onLeadUpdated} 
                    defaultCollapsed={false}
                  />
                )}

                {/* Chat with Borrower - For Active/Past Clients only in left column */}
                {isActiveOrPastClient && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                        <CardHeader className="pb-3">
                          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
                            <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                            <CardTitle className="text-sm font-semibold">Chat with Borrower</CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                      <CollapsibleContent>
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
                            <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1" onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }} />
                            <Button size="sm" onClick={handleSendMessage}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>
            );
          })()}

          {/* Center Column - Lead Information */}
          <div className="space-y-4 overflow-y-auto flex flex-col items-start">

            {/* Lead Information Tabs */}
            <div className="w-full">
              <LeadCenterTabs leadId={leadId} activities={activities} documents={documents} client={client} onLeadUpdated={onLeadUpdated} onActivityUpdated={loadActivities} onClientPatched={patch => {
              // Merge patch into client object for immediate UI update
              Object.assign(client, patch);
            }} onDocumentsChange={loadDocuments} onCallClick={() => {
              if (!leadId) {
                toast({
                  title: "Error",
                  description: "Unable to log activity: Invalid lead ID",
                  variant: "destructive"
                });
                return;
              }
              setShowCallLogModal(true);
            }} onSmsClick={() => {
              if (!leadId) {
                toast({
                  title: "Error",
                  description: "Unable to log activity: Invalid lead ID",
                  variant: "destructive"
                });
                return;
              }
              setShowSmsLogModal(true);
            }} onEmailClick={() => {
              if (!leadId) {
                toast({
                  title: "Error",
                  description: "Unable to log activity: Invalid lead ID",
                  variant: "destructive"
                });
                return;
              }
              setShowEmailLogModal(true);
            }} onNoteClick={() => {
              if (!leadId) {
                toast({
                  title: "Error",
                  description: "Unable to log activity: Invalid lead ID",
                  variant: "destructive"
                });
                return;
              }
              setShowAddNoteModal(true);
            }} onTaskClick={() => setShowCreateTaskModal(true)} onTaskActivityClick={handleTaskActivityClick} />
            </div>
          </div>

          {/* Right Column - Notes, Documents, Stage History */}
          <div className="space-y-4 overflow-y-auto">

            {/* Quick Actions - For Pre-Qualified/Pre-Approved ONLY, positioned after Send Email Templates */}
            {(() => {
              const opsStage = client.ops?.stage?.toLowerCase() || '';
              const isPreQualOrPreApproved = opsStage === 'pre-qualified' || opsStage === 'pre-approved';
              if (!isPreQualOrPreApproved) return null;
              return (
                <Collapsible defaultOpen={true}>
                  <Card>
                    <CardHeader className="pb-3 bg-white">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="bg-gray-50">
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            size="default" 
                            className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
                            onClick={() => setShowPreApprovalModal(true)}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="font-semibold text-sm">Pre-Approval</span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="default" 
                            className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
                            onClick={() => setShowLoanEstimateModal(true)}
                          >
                            <FileCheck className="h-4 w-4" />
                            <span className="font-semibold text-sm">Loan Estimate</span>
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* Latest File Update Section - For Active stage ONLY, between Email Templates and Pipeline Review */}
            {(() => {
              const opsStage = client.ops?.stage?.toLowerCase() || '';
              const isActive = opsStage === 'active';
              if (!isActive) return null;
              return (
                <Card>
                  <CardHeader className="pb-3 bg-white">
                    <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
                  </CardHeader>
                  <CardContent className="bg-gray-50">
                    <div className="h-[110px] overflow-y-auto">
                      <MentionableInlineEditNotes
                        value={(client as any).latest_file_updates || ''}
                        onValueChange={(value) => handleLeadUpdate('latest_file_updates', value)}
                        placeholder="Add status updates, notes, or important information..."
                        className="h-full"
                      />
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {(client as any).latest_file_updates_updated_at ? (
                        <>
                          Last updated: <span className="font-bold">{format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}</span>
                          {fileUpdatesUpdatedByUser && (
                            <>
                              <span>•</span>
                              <User className="h-3 w-3" />
                              {fileUpdatesUpdatedByUser.first_name} {fileUpdatesUpdatedByUser.last_name}
                            </>
                          )}
                        </>
                      ) : (
                        <span className="italic">No updates yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Pipeline Review Section - Only show for Active/Past Clients in right column */}
            {(() => {
              const opsStage = client.ops?.stage?.toLowerCase() || '';
              const isActiveOrPastClient = opsStage === 'active' || opsStage === 'past-clients';
              if (!isActiveOrPastClient) return null;
              return (
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold">Pipeline Review</CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-50 max-h-[280px] overflow-y-auto">
                <div className="min-h-[100px]">
                  <MentionableInlineEditNotes
                    value={(client as any).latest_file_updates || ''}
                    onValueChange={(value) => handleLeadUpdate('latest_file_updates', value)}
                    placeholder="Add pipeline review notes..."
                    className="min-h-[80px]"
                  />
                </div>
                {(client as any).latest_file_updates_updated_at && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last updated: <span className="font-bold">{format(new Date((client as any).latest_file_updates_updated_at), 'MMM dd, yyyy h:mm a')}</span>
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
              );
            })()}

            {/* Tasks */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Tasks
                  <Button size="sm" variant="outline" onClick={() => setShowCreateTaskModal(true)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 bg-gray-50 max-h-[280px] overflow-y-auto">
                {loadingTasks ? <p className="text-xs text-muted-foreground">Loading tasks...</p> : leadTasks.length > 0 ? [...leadTasks].sort((a, b) => {
                  // Open tasks (not Done) first
                  if (a.status === 'Done' && b.status !== 'Done') return 1;
                  if (a.status !== 'Done' && b.status === 'Done') return -1;
                  // Then by created_at (newest first)
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }).map(task => <div key={task.id} className="flex items-center gap-2">
                      <Checkbox 
                        checked={task.status === "Done"} 
                        onCheckedChange={() => handleTaskToggle(task.id, task.status)} 
                      />
                      <div className="flex-1 cursor-pointer hover:bg-gray-100 rounded p-1 -m-1" onClick={() => {
                  setSelectedTask(task);
                  setShowTaskDetailModal(true);
                }}>
                        <span className={cn("text-xs block", task.status === "Done" && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Due: {task.due_date ? formatDateModern(task.due_date) : "No date"}</span>
                          {task.assignee && <>
                              <span>•</span>
                              <span>{task.assignee.first_name} {task.assignee.last_name}</span>
                            </>}
                        </div>
                      </div>
                    </div>) : <p className="text-xs text-muted-foreground">No tasks yet</p>}
              </CardContent>
            </Card>

            {/* About the Borrower Section - Only show for Active/Past Clients in right column */}
            {(() => {
              const opsStage = client.ops?.stage?.toLowerCase() || '';
              const isActiveOrPastClient = opsStage === 'active' || opsStage === 'past-clients';
              if (!isActiveOrPastClient) return null;
              return (
            <Card>
              <CardHeader className="pb-3 bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">About the Borrower</CardTitle>
                  {!isEditingNotes && localNotes && <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-7 text-xs">
                      Edit
                    </Button>}
                </div>
              </CardHeader>
              <CardContent className="bg-gray-50">
                {isEditingNotes || !localNotes ? <>
                    <Textarea key="notes-textarea" value={localNotes} onChange={e => {
                  setLocalNotes(e.target.value);
                  setHasUnsavedNotes(true);
                }} onBlur={() => { if (hasUnsavedNotes) saveNotes(); }} placeholder="Describe the borrower, how they were referred, what they're looking for..." className="h-[110px] resize-none bg-white mb-2 overflow-y-auto" />
                    {hasUnsavedNotes && <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Unsaved</Badge>
                        <Button size="sm" onClick={() => saveNotes()} disabled={isSavingNotes}>
                          {isSavingNotes ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                    setLocalNotes((client as any).notes || '');
                    setHasUnsavedNotes(false);
                    setIsEditingNotes(false);
                  }}>
                          Cancel
                        </Button>
                      </div>}
                  </> : <div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-y-auto" onClick={() => setIsEditingNotes(true)}>
                    {localNotes.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>)}
                  </div>}
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {(client as any).notes_updated_at ? (
                    <>
                      Last updated: {format(new Date((client as any).notes_updated_at), 'MMM dd, yyyy h:mm a')}
                      {notesUpdatedByUser && <>
                          <span>•</span>
                          <User className="h-3 w-3" />
                          {notesUpdatedByUser.first_name} {notesUpdatedByUser.last_name}
                        </>}
                    </>
                  ) : (
                    <span className="italic">No updates yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
              );
            })()}

            {/* Stage History */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold">Stage History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 bg-gray-50">
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
                    return [{
                      key: 'incoming',
                      label: 'NEW',
                      date: '2024-01-08',
                      daysAgo: 10
                    }, {
                      key: 'rfp',
                      label: 'RFP',
                      date: '2024-01-10',
                      daysAgo: 8
                    }, {
                      key: 'submitted',
                      label: 'SUB',
                      date: '2024-01-12',
                      daysAgo: 6
                    }, {
                      key: 'awc',
                      label: 'AWC',
                      date: '2024-01-15',
                      daysAgo: 3
                    }, {
                      key: 'ctc',
                      label: 'CTC',
                      date: '',
                      daysAgo: null
                    }];
                  } else if (pipelineType === 'past-clients') {
                    // Live data for past clients - same as leads pipeline
                    const leadOnDate = (client as any).lead_on_date || null;
                    const createdAt = leadOnDate || (client as any).created_at;
                    const pendingAppAt = (client as any).pending_app_at;
                    const appCompleteAt = (client as any).app_complete_at;
                    const preQualifiedAt = (client as any).pre_qualified_at;
                    const preApprovedAt = (client as any).pre_approved_at;
                    const activeAt = (client as any).active_at;
                    return [{
                      key: 'leads',
                      label: 'New',
                      date: createdAt,
                      daysAgo: calculateDaysAgo(createdAt)
                    }, {
                      key: 'pending-app',
                      label: 'Pending App',
                      date: pendingAppAt,
                      daysAgo: calculateDaysAgo(pendingAppAt)
                    }, {
                      key: 'screening',
                      label: 'Screening',
                      date: appCompleteAt,
                      daysAgo: calculateDaysAgo(appCompleteAt)
                    }, {
                      key: 'pre-qualified',
                      label: 'Pre-Qualified',
                      date: preQualifiedAt,
                      daysAgo: calculateDaysAgo(preQualifiedAt)
                    }, {
                      key: 'pre-approved',
                      label: 'Pre-Approved',
                      date: preApprovedAt,
                      daysAgo: calculateDaysAgo(preApprovedAt)
                    }, {
                      key: 'active',
                      label: 'Active',
                      date: activeAt,
                      daysAgo: calculateDaysAgo(activeAt)
                    }];
                  } else {
                    // Live data for leads pipeline
                    const leadOnDate = (client as any).lead_on_date || null;
                    const createdAt = leadOnDate || (client as any).created_at;
                    const pendingAppAt = (client as any).pending_app_at;
                    const appCompleteAt = (client as any).app_complete_at;
                    const preQualifiedAt = (client as any).pre_qualified_at;
                    const preApprovedAt = (client as any).pre_approved_at;
                    const activeAt = (client as any).active_at;
                    return [{
                      key: 'leads',
                      label: 'New',
                      date: createdAt,
                      daysAgo: calculateDaysAgo(createdAt)
                    }, {
                      key: 'pending-app',
                      label: 'Pending App',
                      date: pendingAppAt,
                      daysAgo: calculateDaysAgo(pendingAppAt)
                    }, {
                      key: 'screening',
                      label: 'Screening',
                      date: appCompleteAt,
                      daysAgo: calculateDaysAgo(appCompleteAt)
                    }, {
                      key: 'pre-qualified',
                      label: 'Pre-Qualified',
                      date: preQualifiedAt,
                      daysAgo: calculateDaysAgo(preQualifiedAt)
                    }, {
                      key: 'pre-approved',
                      label: 'Pre-Approved',
                      date: preApprovedAt,
                      daysAgo: calculateDaysAgo(preApprovedAt)
                    }, {
                      key: 'active',
                      label: 'Active',
                      date: activeAt,
                      daysAgo: calculateDaysAgo(activeAt)
                    }];
                  }
                };
                const stages = getStageHistory();
                const currentStageIndex = stages.findIndex(stage => stage.key === client.ops.stage);
                return stages.map((stage, index) => {
                  const isCompleted = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  
                  // Format timestamp for hover (e.g., "Nov 15, 2024 at 2:30 PM")
                  const formatTimestamp = (dateStr: string | null) => {
                    if (!dateStr) return '';
                    const date = new Date(dateStr);
                    return format(date, 'MMM dd, yyyy \'at\' h:mm a');
                  };
                  
                  return <div key={stage.key} className="flex items-center gap-3 text-sm">
                        <div className={cn("flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold", isCompleted ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400")}>
                          {isCompleted ? "✓" : "•"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{stage.label}</p>
                          <div onClick={e => e.stopPropagation()}>
                            <InlineEditDate 
                              value={stage.date} 
                              onValueChange={newDate => {
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
                                  databaseService.updateLead(leadId, {
                                    [dbField]: dateValue
                                  }).then(() => {
                                    if (onLeadUpdated) onLeadUpdated();
                                    toast({
                                      title: "Success",
                                      description: "Stage date updated"
                                    });
                                  }).catch(error => {
                                    console.error('Error updating stage date:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to update stage date",
                                      variant: "destructive"
                                    });
                                  });
                                }
                              }} 
                              className="text-xs" 
                              placeholder="Set date" 
                            />
                            {stage.date && stage.daysAgo !== null && (
                              <p 
                                className="text-xs text-muted-foreground mt-1 cursor-help" 
                                title={formatTimestamp(stage.date)}
                              >
                                {stage.daysAgo} days ago
                              </p>
                            )}
                          </div>
                        </div>
                      </div>;
                });
              })()}
              </CardContent>
            </Card>

            {/* Quick Actions, DTI/PITI, Third Party Items moved to left column */}
          </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal open={showCreateTaskModal} onOpenChange={setShowCreateTaskModal} preselectedBorrowerId={leadId || undefined} onTaskCreated={() => {
      setShowCreateTaskModal(false);
      loadLeadTasks();
      loadActivities(); // Refresh activity feed to show task creation log
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    }} />

      <TaskDetailModal open={showTaskDetailModal} onOpenChange={setShowTaskDetailModal} task={selectedTask} onTaskUpdated={() => {
      loadLeadTasks();
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    }} />

      {leadId && <>
          <CallLogModal open={showCallLogModal} onOpenChange={setShowCallLogModal} leadId={leadId} onActivityCreated={activity => {
        handleActivityCreated('call');
        setShowCallLogModal(false);
      }} />

          <SmsLogModal open={showSmsLogModal} onOpenChange={setShowSmsLogModal} leadId={leadId} onActivityCreated={activity => {
        handleActivityCreated('sms');
        setShowSmsLogModal(false);
      }} />

          <EmailLogModal open={showEmailLogModal} onOpenChange={setShowEmailLogModal} leadId={leadId} onActivityCreated={activity => {
        handleActivityCreated('email');
        setShowEmailLogModal(false);
      }} />

          <AddNoteModal open={showAddNoteModal} onOpenChange={setShowAddNoteModal} leadId={leadId} onActivityCreated={async activity => {
        await handleActivityCreated('note');
        setShowAddNoteModal(false);
      }} />

          <NoteDetailModal open={showNoteDetailModal} onOpenChange={setShowNoteDetailModal} note={selectedNote} />

          {completionRequirement && <TaskCompletionRequirementModal open={requirementModalOpen} onOpenChange={setRequirementModalOpen} requirement={completionRequirement} onLogCall={handleLogCallFromTaskModal} />}

          {selectedAgentForCall && <AgentCallLogModal agentId={selectedAgentForCall.id} agentName={`${selectedAgentForCall.first_name} ${selectedAgentForCall.last_name}`} isOpen={agentCallLogModalOpen} onClose={() => setAgentCallLogModalOpen(false)} onCallLogged={handleAgentCallLoggedForTask} />}

          {/* Pipeline Stage Validation Modal */}
          {pipelineValidationRule && (
            <Dialog open={pipelineValidationModalOpen} onOpenChange={(open) => {
              if (!open) {
                setPipelineValidationModalOpen(false);
                setIsRefinanceBypass(false);
                setPendingPipelineStage(null);
                setModalLeadStrength('');
                setModalLikelyToApply('');
              } else {
                // Initialize modal values when opening
                setModalLeadStrength((client as any).lead_strength || '');
                setModalLikelyToApply((client as any).likely_to_apply || '');
              }
            }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <DialogTitle>Action Required</DialogTitle>
                  </div>
                  <DialogDescription className="pt-2">
                    {pipelineValidationRule.message}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Please update the following fields:</p>
                  
                  {/* Inline editable fields */}
                  {pipelineValidationMissingFields.includes('lead_strength') && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Lead Strength</Label>
                      <InlineEditSelect 
                        value={modalLeadStrength} 
                        onValueChange={setModalLeadStrength} 
                        options={[
                          { value: 'Hot', label: 'Hot' },
                          { value: 'Warm', label: 'Warm' },
                          { value: 'Cold', label: 'Cold' }
                        ]} 
                        placeholder="Select strength" 
                      />
                    </div>
                  )}
                  
                  {pipelineValidationMissingFields.includes('likely_to_apply') && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Likely to Apply</Label>
                      <InlineEditSelect 
                        value={modalLikelyToApply} 
                        onValueChange={setModalLikelyToApply} 
                        options={[
                          { value: 'High', label: 'High' },
                          { value: 'Medium', label: 'Medium' },
                          { value: 'Low', label: 'Low' }
                        ]} 
                        placeholder="Select likelihood" 
                      />
                    </div>
                  )}
                  
                  {/* Show other missing fields as a list */}
                  {pipelineValidationMissingFields.filter(f => !['lead_strength', 'likely_to_apply'].includes(f)).length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {pipelineValidationMissingFields.filter(f => !['lead_strength', 'likely_to_apply'].includes(f)).map(field => (
                        <li key={field} className="text-foreground font-medium">
                          {field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Show refinance bypass option when moving to Active */}
                  {pendingPipelineStage?.stageLabel.toLowerCase() === 'active' && pipelineValidationMissingFields.includes('contract_file') && (
                    <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                      <Checkbox
                        id="refinance-bypass"
                        checked={isRefinanceBypass}
                        onCheckedChange={(checked) => setIsRefinanceBypass(checked as boolean)}
                      />
                      <Label htmlFor="refinance-bypass" className="text-sm cursor-pointer">
                        This is a refinance or HELOC (no contract needed)
                      </Label>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setPipelineValidationModalOpen(false);
                    setIsRefinanceBypass(false);
                    setPendingPipelineStage(null);
                    setModalLeadStrength('');
                    setModalLikelyToApply('');
                  }}>
                    Close
                  </Button>
                  
                  {/* Save & Continue button for lead_strength/likely_to_apply fields */}
                  {(pipelineValidationMissingFields.includes('lead_strength') || pipelineValidationMissingFields.includes('likely_to_apply')) && pendingPipelineStage && (
                    <Button onClick={async () => {
                      // Validate that required fields are filled
                      const stillMissing: string[] = [];
                      if (pipelineValidationMissingFields.includes('lead_strength') && !modalLeadStrength) {
                        stillMissing.push('Lead Strength');
                      }
                      if (pipelineValidationMissingFields.includes('likely_to_apply') && !modalLikelyToApply) {
                        stillMissing.push('Likely to Apply');
                      }
                      // Check other required fields that can't be edited in modal
                      const otherMissing = pipelineValidationMissingFields.filter(f => !['lead_strength', 'likely_to_apply'].includes(f));
                      
                      if (stillMissing.length > 0) {
                        toast({
                          title: "Missing Fields",
                          description: `Please fill in: ${stillMissing.join(', ')}`,
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      if (otherMissing.length > 0) {
                        toast({
                          title: "Additional Fields Required",
                          description: `Please also update: ${otherMissing.map(f => f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')}`,
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        // Save the field updates
                        const updateData: any = {};
                        if (modalLeadStrength) updateData.lead_strength = modalLeadStrength;
                        if (modalLikelyToApply) updateData.likely_to_apply = modalLikelyToApply;
                        
                        if (Object.keys(updateData).length > 0) {
                          await databaseService.updateLead(leadId!, updateData);
                        }
                        
                        // Close modal and proceed with stage change
                        setPipelineValidationModalOpen(false);
                        setModalLeadStrength('');
                        setModalLikelyToApply('');
                        
                        // Perform the stage change
                        const stageId = pendingPipelineStage.stageId;
                        const normalizedLabel = pendingPipelineStage.stageLabel;
                        setPendingPipelineStage(null);
                        
                        const STAGE_ORDER = ['leads', 'pending-app', 'screening', 'pre-qualified', 'pre-approved', 'active'];
                        const STAGE_DATE_FIELDS: Record<string, string> = {
                          'pending-app': 'pending_app_at',
                          'screening': 'app_complete_at',
                          'pre-qualified': 'pre_qualified_at',
                          'pre-approved': 'pre_approved_at',
                          'active': 'active_at'
                        };

                        const currentStageKey = client.ops.stage;
                        const targetStageKey = normalizedLabel.toLowerCase().replace(/\s+/g, '-');
                        
                        const currentIndex = STAGE_ORDER.indexOf(currentStageKey);
                        const targetIndex = STAGE_ORDER.indexOf(targetStageKey);

                        const stageUpdateData: any = { pipeline_stage_id: stageId };

                        if (currentIndex !== -1 && targetIndex !== -1 && targetIndex > currentIndex) {
                          const now = new Date().toISOString();
                          for (let i = currentIndex + 1; i <= targetIndex; i++) {
                            const stageKey = STAGE_ORDER[i];
                            const dateField = STAGE_DATE_FIELDS[stageKey];
                            if (dateField) {
                              stageUpdateData[dateField] = now;
                            }
                          }
                        }

                        // Handle Active stage defaults
                        const isActiveStage = normalizedLabel.toLowerCase() === 'active' || stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
                        if (isActiveStage) {
                          stageUpdateData.pipeline_section = 'Incoming';
                          stageUpdateData.loan_status = 'NEW';
                        }

                        await databaseService.updateLead(leadId!, stageUpdateData);
                        
                        toast({
                          title: "Pipeline Updated",
                          description: `Lead moved to ${normalizedLabel}`
                        });
                        
                        if (onLeadUpdated) {
                          await onLeadUpdated();
                        }
                      } catch (error: any) {
                        console.error('Error updating fields and pipeline stage:', error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to update",
                          variant: "destructive"
                        });
                      }
                    }}>
                      Save & Continue
                    </Button>
                  )}
                  
                  {isRefinanceBypass && pendingPipelineStage && (
                    <Button onClick={async () => {
                      // Close modal and proceed with stage change bypassing the requirement
                      setPipelineValidationModalOpen(false);
                      setIsRefinanceBypass(false);
                      
                      // Perform the stage change
                      const stageId = pendingPipelineStage.stageId;
                      const normalizedLabel = pendingPipelineStage.stageLabel;
                      setPendingPipelineStage(null);
                      
                      try {
                        const STAGE_ORDER = ['leads', 'pending-app', 'screening', 'pre-qualified', 'pre-approved', 'active'];
                        const STAGE_DATE_FIELDS: Record<string, string> = {
                          'pending-app': 'pending_app_at',
                          'screening': 'app_complete_at',
                          'pre-qualified': 'pre_qualified_at',
                          'pre-approved': 'pre_approved_at',
                          'active': 'active_at'
                        };

                        const currentStageKey = client.ops.stage;
                        const targetStageKey = normalizedLabel.toLowerCase().replace(/\s+/g, '-');
                        
                        const currentIndex = STAGE_ORDER.indexOf(currentStageKey);
                        const targetIndex = STAGE_ORDER.indexOf(targetStageKey);

                        const updateData: any = { pipeline_stage_id: stageId };

                        if (currentIndex !== -1 && targetIndex !== -1 && targetIndex > currentIndex) {
                          const now = new Date().toISOString();
                          for (let i = currentIndex + 1; i <= targetIndex; i++) {
                            const stageKey = STAGE_ORDER[i];
                            const dateField = STAGE_DATE_FIELDS[stageKey];
                            if (dateField) {
                              updateData[dateField] = now;
                            }
                          }
                        }

                        // Handle Active stage defaults
                        const isActiveStageBypass = normalizedLabel.toLowerCase() === 'active' || stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
                        if (isActiveStageBypass) {
                          updateData.pipeline_section = 'Incoming';
                          updateData.loan_status = 'NEW';
                        }

                        await databaseService.updateLead(leadId!, updateData);
                        
                        toast({
                          title: "Pipeline Updated",
                          description: `Lead moved to ${normalizedLabel}`
                        });
                        
                        if (onLeadUpdated) {
                          await onLeadUpdated();
                        }
                      } catch (error: any) {
                        console.error('Error updating pipeline stage:', error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to update pipeline stage",
                          variant: "destructive"
                        });
                      }
                    }}>
                      Continue Without Contract
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <PreApprovalLetterModal isOpen={showPreApprovalModal} onClose={() => setShowPreApprovalModal(false)} client={client} />
          <LoanEstimateModal isOpen={showLoanEstimateModal} onClose={() => setShowLoanEstimateModal(false)} client={client} />
          
          {/* Create Next Task Modal */}
          {leadId && (
            <CreateNextTaskModal
              open={showCreateNextTaskModal}
              onOpenChange={setShowCreateNextTaskModal}
              leadId={leadId}
              leadName={`${client.person.firstName} ${client.person.lastName}`}
              onTaskCreated={loadLeadTasks}
            />
          )}

          <VoiceUpdateConfirmationModal 
            isOpen={showFieldUpdateModal} 
            onClose={() => setShowFieldUpdateModal(false)} 
            detectedUpdates={detectedFieldUpdates}
            taskSuggestions={detectedTaskSuggestions}
            onApplyFieldUpdates={handleApplyFieldUpdates}
            onCreateTasks={async (tasks) => {
              // Get the user_id from the lead (teammate_assigned) for task assignment
              const leadUserId = (client as any).teammate_assigned || (client as any).user_id || null;
              
              for (const task of tasks) {
                try {
                  await databaseService.createTask({
                    title: task.title,
                    description: task.description || '',
                    due_date: task.dueDate || new Date().toISOString().split('T')[0], // Default to today
                    priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) as any,
                    borrower_id: leadId,
                    assignee_id: leadUserId, // Assign to lead's user
                    status: 'To Do',
                  });
                } catch (error) {
                  console.error('Error creating task:', error);
                }
              }
              if (tasks.length > 0) {
                toast({
                  title: 'Tasks Created',
                  description: `${tasks.length} task(s) created successfully.`,
                });
              }
            }}
          />
        </>}
    </div>;
}