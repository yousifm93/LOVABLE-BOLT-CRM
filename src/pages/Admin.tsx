import { useState } from "react";
import { Settings, Database, Users, FileText, BarChart3, Shield, Plus, Edit, Trash2 } from "lucide-react";
import UserManagement from "@/pages/UserManagement";
import PasswordsVault from "@/pages/PasswordsVault";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Field definitions for all CRM areas
const fieldDefinitions = [
  // Leads fields
  { id: 1, section: "Leads", fieldName: "firstName", displayName: "First Name", type: "text", required: true, visible: true },
  { id: 2, section: "Leads", fieldName: "lastName", displayName: "Last Name", type: "text", required: true, visible: true },
  { id: 3, section: "Leads", fieldName: "email", displayName: "Email", type: "email", required: true, visible: true },
  { id: 4, section: "Leads", fieldName: "phone", displayName: "Phone", type: "phone", required: true, visible: true },
  { id: 5, section: "Leads", fieldName: "loanAmount", displayName: "Loan Amount", type: "currency", required: true, visible: true },
  { id: 6, section: "Leads", fieldName: "creditScore", displayName: "Credit Score", type: "number", required: false, visible: true },
  { id: 7, section: "Leads", fieldName: "incomeType", displayName: "Income Type", type: "select", required: false, visible: true },
  { id: 8, section: "Leads", fieldName: "referralSource", displayName: "Referral Source", type: "text", required: false, visible: true },
  { id: 9, section: "Leads", fieldName: "notes", displayName: "Notes", type: "textarea", required: false, visible: true },
  { id: 10, section: "Leads", fieldName: "leadDate", displayName: "Lead Date", type: "date", required: true, visible: true },

  // Pending App fields
  { id: 11, section: "Pending App", fieldName: "applicationDate", displayName: "Application Date", type: "date", required: true, visible: true },
  { id: 12, section: "Pending App", fieldName: "loanType", displayName: "Loan Type", type: "select", required: true, visible: true },
  { id: 13, section: "Pending App", fieldName: "propertyAddress", displayName: "Property Address", type: "text", required: false, visible: true },
  { id: 14, section: "Pending App", fieldName: "purchasePrice", displayName: "Purchase Price", type: "currency", required: false, visible: true },
  { id: 15, section: "Pending App", fieldName: "downPayment", displayName: "Down Payment", type: "currency", required: false, visible: true },
  { id: 16, section: "Pending App", fieldName: "employmentStatus", displayName: "Employment Status", type: "select", required: false, visible: true },
  { id: 17, section: "Pending App", fieldName: "monthlyIncome", displayName: "Monthly Income", type: "currency", required: false, visible: true },
  { id: 18, section: "Pending App", fieldName: "assets", displayName: "Assets", type: "currency", required: false, visible: true },
  { id: 19, section: "Pending App", fieldName: "liabilities", displayName: "Liabilities", type: "currency", required: false, visible: true },
  { id: 20, section: "Pending App", fieldName: "applicationProgress", displayName: "Application Progress", type: "percentage", required: false, visible: true },

  // Screening fields
  { id: 21, section: "Screening", fieldName: "screeningDate", displayName: "Screening Date", type: "date", required: true, visible: true },
  { id: 22, section: "Screening", fieldName: "creditPull", displayName: "Credit Pull", type: "select", required: false, visible: true },
  { id: 23, section: "Screening", fieldName: "incomeVerification", displayName: "Income Verification", type: "select", required: false, visible: true },
  { id: 24, section: "Screening", fieldName: "assetVerification", displayName: "Asset Verification", type: "select", required: false, visible: true },
  { id: 25, section: "Screening", fieldName: "dti", displayName: "DTI Ratio", type: "percentage", required: false, visible: true },
  { id: 26, section: "Screening", fieldName: "ltv", displayName: "LTV Ratio", type: "percentage", required: false, visible: true },
  { id: 27, section: "Screening", fieldName: "riskLevel", displayName: "Risk Level", type: "select", required: false, visible: true },
  { id: 28, section: "Screening", fieldName: "nextStep", displayName: "Next Step", type: "text", required: false, visible: true },
  { id: 29, section: "Screening", fieldName: "priority", displayName: "Priority", type: "select", required: false, visible: true },
  { id: 30, section: "Screening", fieldName: "underwriterNotes", displayName: "Underwriter Notes", type: "textarea", required: false, visible: true },

  // Pre-Qualified fields
  { id: 31, section: "Pre-Qualified", fieldName: "qualifiedDate", displayName: "Qualified Date", type: "date", required: true, visible: true },
  { id: 32, section: "Pre-Qualified", fieldName: "qualifiedAmount", displayName: "Qualified Amount", type: "currency", required: true, visible: true },
  { id: 33, section: "Pre-Qualified", fieldName: "interestRate", displayName: "Interest Rate", type: "percentage", required: false, visible: true },
  { id: 34, section: "Pre-Qualified", fieldName: "loanTerm", displayName: "Loan Term", type: "number", required: false, visible: true },
  { id: 35, section: "Pre-Qualified", fieldName: "monthlyPayment", displayName: "Monthly Payment", type: "currency", required: false, visible: true },
  { id: 36, section: "Pre-Qualified", fieldName: "expirationDate", displayName: "Expiration Date", type: "date", required: false, visible: true },
  { id: 37, section: "Pre-Qualified", fieldName: "conditions", displayName: "Conditions", type: "textarea", required: false, visible: true },
  { id: 38, section: "Pre-Qualified", fieldName: "loanOfficer", displayName: "Loan Officer", type: "select", required: false, visible: true },
  { id: 39, section: "Pre-Qualified", fieldName: "processor", displayName: "Processor", type: "select", required: false, visible: true },
  { id: 40, section: "Pre-Qualified", fieldName: "letterSent", displayName: "Letter Sent", type: "boolean", required: false, visible: true },

  // Pre-Approved fields
  { id: 41, section: "Pre-Approved", fieldName: "approvedDate", displayName: "Approved Date", type: "date", required: true, visible: true },
  { id: 42, section: "Pre-Approved", fieldName: "approvedAmount", displayName: "Approved Amount", type: "currency", required: true, visible: true },
  { id: 43, section: "Pre-Approved", fieldName: "finalRate", displayName: "Final Rate", type: "percentage", required: false, visible: true },
  { id: 44, section: "Pre-Approved", fieldName: "rateLock", displayName: "Rate Lock", type: "boolean", required: false, visible: true },
  { id: 45, section: "Pre-Approved", fieldName: "lockExpiration", displayName: "Lock Expiration", type: "date", required: false, visible: true },
  { id: 46, section: "Pre-Approved", fieldName: "underwriter", displayName: "Underwriter", type: "select", required: false, visible: true },
  { id: 47, section: "Pre-Approved", fieldName: "conditions", displayName: "Conditions", type: "textarea", required: false, visible: true },
  { id: 48, section: "Pre-Approved", fieldName: "documentChecklist", displayName: "Document Checklist", type: "checklist", required: false, visible: true },
  { id: 49, section: "Pre-Approved", fieldName: "appraisalOrdered", displayName: "Appraisal Ordered", type: "boolean", required: false, visible: true },
  { id: 50, section: "Pre-Approved", fieldName: "titleOrdered", displayName: "Title Ordered", type: "boolean", required: false, visible: true },

  // Active fields
  { id: 51, section: "Active", fieldName: "activationDate", displayName: "Activation Date", type: "date", required: true, visible: true },
  { id: 52, section: "Active", fieldName: "closingDate", displayName: "Closing Date", type: "date", required: false, visible: true },
  { id: 53, section: "Active", fieldName: "fundingDate", displayName: "Funding Date", type: "date", required: false, visible: true },
  { id: 54, section: "Active", fieldName: "progress", displayName: "Progress", type: "percentage", required: false, visible: true },
  { id: 55, section: "Active", fieldName: "currentStage", displayName: "Current Stage", type: "select", required: false, visible: true },
  { id: 56, section: "Active", fieldName: "daysToClosing", displayName: "Days to Closing", type: "number", required: false, visible: true },
  { id: 57, section: "Active", fieldName: "closingCosts", displayName: "Closing Costs", type: "currency", required: false, visible: true },
  { id: 58, section: "Active", fieldName: "titleCompany", displayName: "Title Company", type: "text", required: false, visible: true },
  { id: 59, section: "Active", fieldName: "realtor", displayName: "Realtor", type: "text", required: false, visible: true },
  { id: 60, section: "Active", fieldName: "finalWalkthrough", displayName: "Final Walkthrough", type: "date", required: false, visible: true },

  // Past Clients fields
  { id: 61, section: "Past Clients", fieldName: "closedDate", displayName: "Closed Date", type: "date", required: true, visible: true },
  { id: 62, section: "Past Clients", fieldName: "finalLoanAmount", displayName: "Final Loan Amount", type: "currency", required: true, visible: true },
  { id: 63, section: "Past Clients", fieldName: "finalRate", displayName: "Final Rate", type: "percentage", required: true, visible: true },
  { id: 64, section: "Past Clients", fieldName: "satisfaction", displayName: "Satisfaction", type: "rating", required: false, visible: true },
  { id: 65, section: "Past Clients", fieldName: "referrals", displayName: "Referrals Generated", type: "number", required: false, visible: true },
  { id: 66, section: "Past Clients", fieldName: "lastContact", displayName: "Last Contact", type: "date", required: false, visible: true },
  { id: 67, section: "Past Clients", fieldName: "reviewLeft", displayName: "Review Left", type: "boolean", required: false, visible: true },
  { id: 68, section: "Past Clients", fieldName: "followUpScheduled", displayName: "Follow-up Scheduled", type: "boolean", required: false, visible: true },
  { id: 69, section: "Past Clients", fieldName: "anniversaryDate", displayName: "Anniversary Date", type: "date", required: false, visible: true },
  { id: 70, section: "Past Clients", fieldName: "clientType", displayName: "Client Type", type: "select", required: false, visible: true }
];

const systemStats = [
  { label: "Total Records", value: "1,247", icon: Database, color: "text-primary" },
  { label: "Active Users", value: "23", icon: Users, color: "text-success" },
  { label: "Custom Fields", value: "70", icon: FileText, color: "text-warning" },
  { label: "System Health", value: "98%", icon: BarChart3, color: "text-info" },
];

export default function Admin() {
  const [selectedSection, setSelectedSection] = useState("all");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldSection, setNewFieldSection] = useState("Leads");

  const filteredFields = selectedSection === "all" 
    ? fieldDefinitions 
    : fieldDefinitions.filter(field => field.section === selectedSection);

  const sections = [...new Set(fieldDefinitions.map(field => field.section))];

  const handleAddField = () => {
    // Add new field logic would go here
    console.log("Adding field:", { newFieldName, newFieldType, newFieldSection });
    setNewFieldName("");
    setNewFieldType("text");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">System configuration and field management</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Shield className="h-4 w-4 mr-2" />
          System Settings
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {systemStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fields">Field Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="passwords">Passwords</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>CRM Field Configuration</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage custom fields across all CRM sections. {filteredFields.length} fields shown.
              </p>
            </CardHeader>
            <CardContent>
              {/* Add New Field Form */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-6">
                <div>
                  <Label htmlFor="fieldName">Field Name</Label>
                  <Input
                    id="fieldName"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Enter field name"
                  />
                </div>
                <div>
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fieldSection">Section</Label>
                  <Select value={newFieldSection} onValueChange={setNewFieldSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddField} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>

              {/* Fields Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Visible</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Badge variant="outline">{field.section}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{field.fieldName}</TableCell>
                        <TableCell>{field.displayName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{field.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {field.required ? (
                            <Badge variant="destructive">Required</Badge>
                          ) : (
                            <Badge variant="outline">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {field.visible ? (
                            <Badge variant="default">Visible</Badge>
                          ) : (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="passwords" className="space-y-4">
          <PasswordsVault />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Configure system-wide settings and preferences</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System settings interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">Generate reports and view system analytics</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Reports interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}