import { useState } from "react";
import * as React from "react";
import { X, Phone, MessageSquare, Mail, FileText, Plus, Upload, MoreHorizontal, User, MapPin, Building2, Calendar, FileCheck, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedTab, setSelectedTab] = useState("activity");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showSmsLogModal, setShowSmsLogModal] = useState(false);
  const [showEmailLogModal, setShowEmailLogModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
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
      const newActivity: Activity = {
        id: Date.now(),
        type: 'note',
        title: 'Note added',
        description: newNote.trim(),
        timestamp: new Date().toISOString(),
        user: 'Current User'
      };
      setActivities(prev => [newActivity, ...prev]);
      setNewNote("");
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
      completed: true,
      assignee: 'Herman Daza'
    }
  ];

  const mockDocuments: Document[] = [
    {
      id: 1,
      name: 'Loan Application.pdf',
      type: 'application',
      uploadDate: '2024-01-10',
      url: '#',
      size: '2.3 MB'
    },
    {
      id: 2,
      name: 'Credit Report.pdf',
      type: 'credit',
      uploadDate: '2024-01-12',
      url: '#',
      size: '1.1 MB'
    }
  ];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      console.log('Closing drawer via overlay click');
      onClose();
    }
  };

  const handleTaskToggle = (taskIndex: number) => {
    // Update the task completion status
    console.log(`Task ${taskIndex} toggled`);
    // In a real app, this would update the task in the backend
  };

  const handleDueDateChange = (date: Date | undefined) => {
    // Update the due date
    console.log('Due date changed to:', date);
    // In a real app, this would update the due date in the backend
  };

  const handleDrawerClose = () => {
    console.log('Closing drawer via close button');
    setSelectedTab("activity");
    setNewNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleOverlayClick}>
      {/* Drawer */}
      <div 
        className="ml-auto h-full w-full max-w-5xl bg-white shadow-strong animate-in slide-in-from-right duration-300 border-l z-[60] relative pointer-events-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={handleDrawerClose} className="ml-auto">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Top Row - Three Equal Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                {mockTasks.slice(0, 3).map((task, index) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={task.completed}
                      onChange={() => handleTaskToggle(index)}
                      className="h-3 w-3"
                    />
                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {mockTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Tracker - 5 Pills */}
          <div className="mb-6">
            <div className="flex items-center justify-center">
              {PIPELINE_STAGES.slice(0, 5).map((stage, index) => {
                const isActive = client.ops.stage === stage.key;
                return (
                  <button
                    key={stage.key}
                    onClick={() => handleStageClick(stage.key)}
                    className={cn(
                      "relative flex items-center justify-center px-4 py-2 rounded-full border-2 border-black font-bold text-xs uppercase transition-all duration-200 hover:shadow-lg",
                      isActive 
                        ? "bg-yellow-400 text-black z-10" 
                        : "bg-white text-black hover:bg-gray-50",
                      index > 0 && "-ml-3"
                    )}
                    style={{ 
                      zIndex: isActive ? 10 : 5 - index,
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCallLogModal(true)}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowSmsLogModal(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowEmailLogModal(true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowAddNoteModal(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowCreateTaskModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
            <Button size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Doc
            </Button>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100vh-240px)]">
          {/* Left: Documents and Stage History */}
          <div className="w-80 border-r p-6 space-y-6">
            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2 text-sm">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span>{doc.name}</span>
                    </div>
                  ))}
                  {mockDocuments.length === 0 && (
                    <p className="text-xs text-muted-foreground">No documents yet</p>
                  )}
                </div>
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

            <Button className="w-full bg-primary hover:bg-primary/90">
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Pre-Approval Letter
            </Button>
          </div>

          {/* Center: Tabs */}
          <div className="flex-1 p-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Chatter/Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Add a note or log an activity..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddNote}>Add</Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          {activity.type === 'call' && <Phone className="h-4 w-4 text-primary-foreground" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4 text-primary-foreground" />}
                          {activity.type === 'sms' && <MessageSquare className="h-4 w-4 text-primary-foreground" />}
                          {activity.type === 'note' && <FileText className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 
                              className="font-medium text-sm truncate flex-1 mr-2" 
                              title={`${activity.title}${activity.description ? ' - ' + activity.description : ''}`}
                            >
                              {activity.title}{activity.description ? ' - ' + activity.description : ''}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {activity.user && (
                            <p className="text-xs text-muted-foreground mt-1">by {activity.user}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={client.person.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={client.person.lastName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={client.person.email} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={client.person.phoneMobile} />
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Amount</Label>
                    <Input value={client.loan.loanAmount} />
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Type</Label>
                    <Select value={client.loan.loanType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Purchase">Purchase</SelectItem>
                        <SelectItem value="Refinance">Refinance</SelectItem>
                        <SelectItem value="Cash-out Refinance">Cash-out Refinance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Add a note..."
                    className="min-h-[100px]"
                  />
                  <Button>Save Note</Button>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Initial consultation completed</span>
                        <span className="text-xs text-muted-foreground">Jan 15, 2024</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Client expressed interest in $450K purchase loan. Good credit profile, stable employment.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Minimal space for future features */}
          <div className="w-80 border-l p-6 space-y-6">
            {/* Additional space for future features */}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showCreateTaskModal}
        onOpenChange={setShowCreateTaskModal}
        onTaskCreated={() => {
          toast({ title: "Success", description: "Task created successfully" });
          // Refresh data logic here
        }}
      />

      <CallLogModal
        open={showCallLogModal}
        onOpenChange={setShowCallLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={() => {
          handleActivityCreated('call');
        }}
      />

      <SmsLogModal
        open={showSmsLogModal}
        onOpenChange={setShowSmsLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={() => {
          handleActivityCreated('sms');
        }}
      />

      <EmailLogModal
        open={showEmailLogModal}
        onOpenChange={setShowEmailLogModal}
        leadId={client.person.id.toString()}
        onActivityCreated={() => {
          handleActivityCreated('email');
        }}
      />

      <AddNoteModal
        open={showAddNoteModal}
        onOpenChange={setShowAddNoteModal}
        leadId={client.person.id.toString()}
        onActivityCreated={() => {
          handleActivityCreated('note');
        }}
      />
    </div>
  );
}