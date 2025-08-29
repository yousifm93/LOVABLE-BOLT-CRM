import { useState } from "react";
import { X, MapPin, Phone, Mail, Calendar, FileText, MessageSquare, PhoneCall, User, Clock, DollarSign, Home, Building, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  loan_amount?: number;
  property_type?: string;
  loan_type?: string;
  status?: string;
  pipeline_section?: string;
  lead_on_date?: string;
  close_date?: string;
  notes?: string;
  teammate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface ClientDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStageChange?: (leadId: string, newStage: string) => void;
}

export function ClientDetailDrawer({ lead, open, onClose, onStageChange }: ClientDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState<"call" | "sms" | "email">("call");

  if (!open || !lead) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const mockTasks = [
    { id: "1", title: "Review application documents", status: "To Do", priority: "High", due_date: "2024-01-20" },
    { id: "2", title: "Schedule appraisal", status: "In Progress", priority: "Medium", due_date: "2024-01-22" },
  ];

  const mockActivities = [
    { id: "1", type: "call", description: "Initial consultation call", timestamp: "2024-01-15T10:30:00Z", user: "John Smith" },
    { id: "2", type: "email", description: "Sent pre-approval documents", timestamp: "2024-01-14T14:15:00Z", user: "Sarah Johnson" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50" onClick={handleOverlayClick}>
      <div className="h-full w-full max-w-2xl bg-background border-l shadow-lg overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-card">
            <div className="flex items-center space-x-4">
              <UserAvatar
                firstName={lead.first_name}
                lastName={lead.last_name}
                email={lead.email || ""}
                size="lg"
              />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {lead.first_name} {lead.last_name}
                </h2>
                <Badge variant="secondary" className="mt-1">
                  {lead.status || "Active"}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-muted/30">
            {[
              { id: "overview", label: "Overview", icon: User },
              { id: "notes", label: "Notes", icon: FileText },
              { id: "tasks", label: "Tasks", icon: CheckCircle },
              { id: "activity", label: "Activity", icon: Clock },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-background text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.email || "No email"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.phone || "No phone"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Loan Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Loan Amount</Label>
                        <p className="text-lg font-semibold">
                          {lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Property Type</Label>
                        <p className="text-sm">{lead.property_type || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Loan Type</Label>
                        <p className="text-sm">{lead.loan_type || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Lead Date</Label>
                        <p className="text-sm">
                          {lead.lead_on_date ? format(new Date(lead.lead_on_date), "MMM d, yyyy") : "Not specified"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Team Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lead.teammate ? (
                      <div className="flex items-center space-x-3">
                        <UserAvatar
                          firstName={lead.teammate.first_name}
                          lastName={lead.teammate.last_name}
                          email={lead.teammate.email}
                          size="sm"
                        />
                        <span className="text-sm">{lead.teammate.first_name} {lead.teammate.last_name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No team member assigned</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this client..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                  <Button className="mt-2" size="sm">
                    Save Notes
                  </Button>
                </div>
                
                {lead.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Existing Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{lead.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Tasks</h3>
                  <Button onClick={() => setShowTaskModal(true)} size="sm">
                    Add Task
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {mockTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">Due: {task.due_date}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={task.priority === "High" ? "destructive" : "secondary"}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Activity Log</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActivityType("call");
                        setShowActivityModal(true);
                      }}
                    >
                      <PhoneCall className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActivityType("email");
                        setShowActivityModal(true);
                      }}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActivityType("sms");
                        setShowActivityModal(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      SMS
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {mockActivities.map((activity) => (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {activity.type === "call" && <PhoneCall className="h-4 w-4 text-blue-500" />}
                            {activity.type === "email" && <Mail className="h-4 w-4 text-green-500" />}
                            {activity.type === "sms" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), "MMM d, yyyy h:mm a")} by {activity.user}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        borrowerId={lead.id}
      />
    </div>
  );
}