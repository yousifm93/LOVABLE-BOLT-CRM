import { useState } from "react";
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

interface ClientDetailDrawerProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (clientId: number, newStage: PipelineStage) => void;
}

export function ClientDetailDrawer({ client, isOpen, onClose, onStageChange }: ClientDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [selectedTab, setSelectedTab] = useState("activity");

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
      // Add note logic here
      setNewNote("");
    }
  };

  // Mock data for demonstration
  const mockActivities: Activity[] = [
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
  ];

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
      assignee: 'Hermit'
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

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Drawer */}
      <div className="ml-auto h-full w-full max-w-5xl bg-background shadow-strong animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={client.person.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{client.person.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Stage Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Pipeline Progress</span>
              <span className="text-sm text-muted-foreground">
                Stage {currentStageIndex + 1} of {PIPELINE_STAGES.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {PIPELINE_STAGES.map((stage, index) => (
                <div key={stage.key} className="flex items-center">
                  <button
                    onClick={() => handleStageClick(stage.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80",
                      index < currentStageIndex && "bg-secondary text-secondary-foreground",
                      index === currentStageIndex && "bg-primary text-primary-foreground",
                      index > currentStageIndex && "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span className="text-xs">{stage.number}</span>
                    <span>{stage.label}</span>
                  </button>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div className="w-8 h-0.5 bg-border mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button size="sm" variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button size="sm" variant="outline">
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
          {/* Left: Highlights Panel */}
          <div className="w-80 border-r p-6 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.person.phoneMobile}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.person.email}</span>
                </div>
                {client.loan.salesPrice && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Property Address</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Team: {client.ops.team || 'Unassigned'}</span>
                </div>
                {client.loan.loanNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Loan #: {client.loan.loanNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-sm font-medium">{client.loan.loanAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium">{client.loan.loanType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">P/R:</span>
                  <span className="text-sm font-medium">{client.loan.prType}</span>
                </div>
                {client.creditScore && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">FICO:</span>
                    <span className="text-sm font-medium">{client.creditScore}</span>
                  </div>
                )}
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
                    {mockActivities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          {activity.type === 'call' && <Phone className="h-4 w-4 text-primary-foreground" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4 text-primary-foreground" />}
                          {activity.type === 'note' && <FileText className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{activity.title}</h4>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          )}
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

          {/* Right: Related Items */}
          <div className="w-80 border-l p-6 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Tasks
                  <Badge variant="secondary">{mockTasks.filter(t => !t.completed).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2">
                    <Checkbox 
                      checked={task.completed}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.size}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Stage History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Moved to {PIPELINE_STAGES[currentStageIndex]?.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">Jan 15, 2024</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="text-sm">Lead created</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">Jan 10, 2024</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}