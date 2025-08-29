import { useState } from "react";
import * as React from "react";
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
import { CallLogModal, SmsLogModal, EmailLogModal, AddNoteModal } from "@/components/modals/ActivityLogModals";
import { useToast } from "@/hooks/use-toast";

interface ClientDetailDrawerProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (clientId: number, newStage: PipelineStage) => void;
  pipelineType: 'leads' | 'active' | 'past-clients';
}

export function ClientDetailDrawer({ client, isOpen, onClose, onStageChange, pipelineType }: ClientDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showSmsLogModal, setShowSmsLogModal] = useState(false);
  const [showEmailLogModal, setShowEmailLogModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<string[]>([
    "Initial loan consultation completed. Client is interested in a 30-year fixed rate mortgage.",
    "Credit score pulled - 720. Good standing for preferred rates.",
    "Client prefers closing in March to align with lease expiration.",
    "Discussed down payment options and PMI requirements.",
    "Property inspection scheduled for next Tuesday. Client confirmed availability."
  ]);
  const [documents, setDocuments] = useState<any[]>([
    { id: 1, name: "W2_2023.pdf", size: 245760, uploadDate: "2024-01-10", type: "application/pdf" },
    { id: 2, name: "Pay_Stub_Dec_2023.pdf", size: 156342, uploadDate: "2024-01-12", type: "application/pdf" },
    { id: 3, name: "Bank_Statement_Nov.pdf", size: 423187, uploadDate: "2024-01-15", type: "application/pdf" },
    { id: 4, name: "Property_Photos.jpg", size: 2847563, uploadDate: "2024-01-16", type: "image/jpeg" },
    { id: 5, name: "Purchase_Agreement.docx", size: 87432, uploadDate: "2024-01-18", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Critical status information based on pipeline stage
  const renderCriticalStatusInfo = () => {
    const stage = client.ops.stage;
    
    switch (stage) {
      case 'leads':
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
            <h4 className="font-medium text-sm mb-3">Lead Status</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Lead qualification: {client.ops.status || 'Working on it'}</div>
              <div>• Priority level: {client.ops.priority || 'Medium'}</div>
              <div>• Referral source: {client.ops.referralSource || 'N/A'}</div>
              <div>• Contact preference: Phone/Email</div>
              <div>• Follow-up required: Yes</div>
            </div>
          </div>
        );
      case 'pending-app':
        return (
           <div className="p-6 bg-muted/30 rounded-lg border border-muted/60 min-h-[120px]">
             <h4 className="font-medium text-sm mb-3">Application Review</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Review progress: {(client as any).progress || 0}%</div>
              <div>• Status: {client.ops.status || 'Pending'}</div>
              <div>• Missing documents: Credit report, Income verification</div>
              <div>• Estimated completion: 3-5 business days</div>
              <div>• Assigned processor: Team Lead</div>
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
             <h4 className="font-medium text-sm mb-3">Status Information</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Current status: {client.ops.status || 'Active'}</div>
              <div>• Priority: {client.ops.priority || 'Medium'}</div>
              <div>• Last updated: Today</div>
              <div>• Assigned team: Primary</div>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  const currentStageIndex = PIPELINE_STAGES.findIndex(stage => stage.key === client.ops.stage);
  const fullName = `${client.person.firstName} ${client.person.lastName}`;
  const initials = `${client.person.firstName[0]}${client.person.lastName[0]}`;

  const handleStageClick = (stageKey: PipelineStage) => {
    if (stageKey !== client.ops.stage) {
      onStageChange(client.person.id, stageKey);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes(prev => [newNote, ...prev]);
      setNewNote('');
      
      const newActivity: Activity = {
        id: Date.now(),
        type: 'note',
        title: 'Note Added',
        description: newNote.trim(),
        timestamp: new Date().toISOString(),
        user: 'Current User'
      };
      setActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleActivityCreated = (activityType: string) => {
    const newActivity: Activity = {
      id: Date.now(),
      type: activityType as any,
      title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} logged`,
      timestamp: new Date().toISOString(),
      user: 'Current User'
    };
    setActivities(prev => [newActivity, ...prev]);
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

  const handleTaskToggle = (taskId: number) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
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

  const mockTasks: Task[] = [
    {
      id: 1,
      title: 'Collect W2 documents',
      dueDate: '2024-01-20',
      completed: false,
      assignee: 'Salma',
      priority: 'High'
    },
    {
      id: 2,
      title: 'Schedule property appraisal',
      dueDate: '2024-01-18',
      completed: true,
      assignee: 'Herman Daza'
    },
    {
      id: 3,
      title: 'Credit report review',
      dueDate: '2024-01-22',
      completed: false,
      assignee: 'Yousif'
    },
    {
      id: 4,
      title: 'Verify employment status',
      dueDate: '2024-01-25',
      completed: false,
      assignee: 'Salma',
      priority: 'Medium'
    },
    {
      id: 5,
      title: 'Review insurance quotes',
      dueDate: '2024-01-28',
      completed: false,
      assignee: 'Herman Daza'
    },
    {
      id: 6,
      title: 'Final loan package review',
      dueDate: '2024-02-01',
      completed: false,
      assignee: 'Yousif',
      priority: 'High'
    }
  ];

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

          {/* Top Row: Contact Info, Status Pills, Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 mb-3 mt-2">
            {/* Contact Information + Lead Name */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleDrawerClose}
                      className="flex items-center justify-center"
                    >
                      <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={client.person.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <Button variant="outline" size="default" className="px-4 py-2">
                    Edit
                  </Button>
                  <Button variant="outline" size="default" className="px-4 py-2">
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Contact Info */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>(352) 328-9828</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{client.person.email}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Buyer's Agent</p>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <button className="text-primary hover:underline text-sm">
                          Sarah Johnson
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Loan Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Loan Amount</p>
                      <span className="font-medium text-sm">{client.loan.loanAmount}</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Loan Type</p>
                      <span className="font-medium text-sm">{client.loan.loanType}</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Property Type</p>
                      <span className="font-medium text-sm">Single Family Home</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Tracker Pills */}
            <Card>
              <CardHeader className="pb-3">
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  {PIPELINE_CONFIGS[pipelineType]?.map((stage, index) => {
                    const isActive = client.ops.stage === stage.key;
                    const currentStageIndex = PIPELINE_CONFIGS[pipelineType]?.findIndex(s => s.key === client.ops.stage) ?? -1;
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
                           fontSize: "12px"
                         }}
                      >
                        {stage.label.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                {/* Critical Status Information - Dynamic based on stage */}
                <div className="mt-4">
                  {renderCriticalStatusInfo()}
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">Notes</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowAddNoteModal(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="bg-gray-50">
                <div className="max-h-[160px] overflow-y-auto space-y-3">
                  <div className="space-y-1">
                    <button className="text-primary hover:underline text-sm font-medium">
                      Initial loan consultation
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Jan 18, 2024 at 2:30 PM • by <button className="text-primary hover:underline">Yousif</button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Client interested in 30-year fixed rate mortgage. Discussed timeline and documentation requirements.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <button className="text-primary hover:underline text-sm font-medium">
                      Credit score review
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Jan 17, 2024 at 10:15 AM • by <button className="text-primary hover:underline">Salma</button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pulled credit report - score of 720. Good standing for preferred rates.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <button className="text-primary hover:underline text-sm font-medium">
                      Documentation checklist
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Jan 16, 2024 at 4:45 PM • by <button className="text-primary hover:underline">Herman Daza</button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Provided client with required document list. W2s and pay stubs are priority.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 h-[calc(100vh-280px)] p-4 pt-0">
          {/* Left Column - Tasks and Chat */}
          <div className="space-y-4 overflow-y-auto">

            {/* Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Tasks
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => handleTaskToggle(task.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {completedTasks[task.id] ? 
                        <CheckCircle className="h-4 w-4" /> : 
                        <Circle className="h-4 w-4" />
                      }
                    </button>
                    <span className={cn(
                      "flex-1",
                      completedTasks[task.id] && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {mockTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </CardContent>
            </Card>

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

          {/* Center Column - Action Buttons and Activity Log */}
          <div className="space-y-4 overflow-y-auto">

            {/* Activity Log */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
                
                {/* Action Buttons */}
                <div className="mt-6 grid grid-cols-5 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCallLogModal(true)}
                    className="text-xs"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSmsLogModal(true)}
                    className="text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    SMS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEmailLogModal(true)}
                    className="text-xs"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddNoteModal(true)}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Add Note
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-580px)] overflow-y-auto">
                <div className="mb-4"></div>
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-primary/20 pl-4 pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">by {activity.user}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notes, Documents, Chat */}
          <div className="space-y-4 overflow-y-auto">
            {/* Document Upload */}

            {/* Document Upload */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-lg flex items-center justify-between">
                  Documents
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </span>
                    </Button>
                    <input
                      type="file"
                      multiple
                      onChange={handleDocumentUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-gray-50">
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {documents.length > 0 ? (
                    documents.map((doc) => {
                      const formatFileSize = (bytes: number) => {
                        if (bytes === 0) return '0 Bytes';
                        const k = 1024;
                        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                      };

                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        });
                      };

                      const getFileExtension = (filename: string) => {
                        return filename.split('.').pop()?.toUpperCase() || 'FILE';
                      };

                      return (
                        <div key={doc.id} className="space-y-1">
                          <button className="text-primary hover:underline text-sm font-medium text-left">
                            {doc.name}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(doc.uploadDate)} • {formatFileSize(doc.size)} • {getFileExtension(doc.name)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stage History */}
            <Card>
              <CardHeader className="pb-3 bg-white">
                <CardTitle className="text-sm font-bold">Stage History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-580px)] overflow-y-auto bg-gray-50">
                {(() => {
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
                      return [
                        { key: 'stage1', label: '', date: '', daysAgo: null },
                        { key: 'stage2', label: '', date: '', daysAgo: null },
                        { key: 'stage3', label: '', date: '', daysAgo: null },
                        { key: 'stage4', label: '', date: '', daysAgo: null }
                      ];
                    } else {
                      return [
                        { key: 'leads', label: 'Lead', date: '2024-01-08', daysAgo: 10 },
                        { key: 'pending-app', label: 'Pending App', date: '2024-01-10', daysAgo: 8 },
                        { key: 'screening', label: 'Screening', date: '2024-01-12', daysAgo: 6 },
                        { key: 'pre-qualified', label: 'Pre-Qualified', date: '2024-01-15', daysAgo: 3 },
                        { key: 'pre-approved', label: 'Pre-Approved', date: '', daysAgo: null }
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
                          {stage.date ? (
                            <p className="text-xs text-muted-foreground">
                              {new Date(stage.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })} - {stage.daysAgo} days ago
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">-</p>
                          )}
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
        onTaskCreated={() => {
          setShowCreateTaskModal(false);
          // Handle task creation
        }}
      />

      <CallLogModal
        open={showCallLogModal}
        onOpenChange={setShowCallLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={(activity) => {
          handleActivityCreated('call');
          setShowCallLogModal(false);
        }}
      />

      <SmsLogModal
        open={showSmsLogModal}
        onOpenChange={setShowSmsLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={(activity) => {
          handleActivityCreated('sms');
          setShowSmsLogModal(false);
        }}
      />

      <EmailLogModal
        open={showEmailLogModal}
        onOpenChange={setShowEmailLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={(activity) => {
          handleActivityCreated('email');
          setShowEmailLogModal(false);
        }}
      />

      <AddNoteModal
        open={showAddNoteModal}
        onOpenChange={setShowAddNoteModal}
        leadId={client.person.id.toString()}
        onActivityCreated={(activity) => {
          handleActivityCreated('note');
          setShowAddNoteModal(false);
        }}
      />
    </div>
  );
}