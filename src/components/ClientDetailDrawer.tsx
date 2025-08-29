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
import { CRMClient, PipelineStage, PIPELINE_STAGES, Activity, Task, Document } from "@/types/crm";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { CallLogModal, SmsLogModal, EmailLogModal, AddNoteModal } from "@/components/modals/ActivityLogModals";
import { useToast } from "@/hooks/use-toast";

interface ClientDetailDrawerProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (clientId: number, newStage: PipelineStage) => void;
}

export function ClientDetailDrawer({ client, isOpen, onClose, onStageChange }: ClientDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showSmsLogModal, setShowSmsLogModal] = useState(false);
  const [showEmailLogModal, setShowEmailLogModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

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
          timestamp: '2024-01-15T10:30:00Z',
          user: 'Yousif'
        },
        {
          id: 2,
          type: 'email',
          title: 'Pre-approval letter sent',
          timestamp: '2024-01-14T15:45:00Z',
          user: 'System'
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
      completed: false,
      assignee: 'Herman Daza'
    },
    {
      id: 3,
      title: 'Credit report review',
      dueDate: '2024-01-22',
      completed: false,
      assignee: 'Yousif'
    }
  ];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDrawerClose = () => {
    setNewNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleOverlayClick}>
      {/* Drawer */}
      <div 
        className="ml-auto h-full w-full max-w-7xl bg-white shadow-strong animate-in slide-in-from-right duration-300 border-l z-[60] relative pointer-events-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">Lead Details</h1>
            <Button variant="ghost" size="icon" onClick={handleDrawerClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Status Tracker Pills at Top Center */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              {PIPELINE_STAGES.slice(0, 5).map((stage, index) => {
                const isActive = client.ops.stage === stage.key;
                return (
                  <button
                    key={stage.key}
                    onClick={() => handleStageClick(stage.key)}
                    className={cn(
                      "relative flex items-center justify-center rounded-full border-2 border-black font-bold text-xs uppercase transition-all duration-200 hover:shadow-lg",
                      isActive 
                        ? "bg-yellow-400 text-black z-20" 
                        : "bg-white text-black hover:bg-gray-50",
                      index > 0 && "-ml-3"
                    )}
                    style={{ 
                      zIndex: isActive ? 20 : 10 - index,
                      width: "128px",
                      height: "40px"
                    }}
                  >
                    {stage.label.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Three Column Layout */}
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-180px)] p-6">
          {/* Left Column - 4 Stacked Boxes */}
          <div className="space-y-4 overflow-y-auto">
            {/* Contact Information + Lead Name */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.person.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{client.person.phoneMobile}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{client.person.email}</span>
                </div>
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{client.loan.loanAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{client.loan.loanType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property:</span>
                  <span className="font-medium">{client.loan.prType}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
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
                {mockTasks.slice(0, 4).map((task) => (
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

            {/* Stage History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stage History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Lead Created</span>
                    <span className="text-muted-foreground">
                      {client.dates.createdOn ? new Date(client.dates.createdOn).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Current Stage</span>
                    <span className="text-muted-foreground capitalize">{client.ops.stage}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Action Buttons and Activity Log */}
          <div className="space-y-4 overflow-y-auto">
            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCallLogModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSmsLogModal(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailLogModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddNoteModal(true)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Task
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Doc
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
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
            {/* Notes Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 min-h-[60px]"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {notes.map((note, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      {note}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader className="pb-3">
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
              <CardContent>
                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                        <Paperclip className="h-3 w-3" />
                        <span className="flex-1 truncate">{doc.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat Box */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Chat with Borrower</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded text-sm min-h-[100px]">
                  <p className="text-muted-foreground">Chat functionality coming soon...</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
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