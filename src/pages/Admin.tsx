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

// Field definitions mapped from Excel spreadsheet (71 fields total)
const fieldDefinitions = [
  // LEAD Fields (1-10) - Used at: LEAD stage
  { id: 1, section: "LEAD", fieldName: "first_name", displayName: "First Name", type: "text", required: true, visible: true },
  { id: 2, section: "LEAD", fieldName: "middle_name", displayName: "Middle Name", type: "text", required: false, visible: true },
  { id: 3, section: "LEAD", fieldName: "last_name", displayName: "Last Name", type: "text", required: true, visible: true },
  { id: 4, section: "LEAD", fieldName: "phone", displayName: "Phone", type: "phone", required: true, visible: true },
  { id: 5, section: "LEAD", fieldName: "email", displayName: "Email", type: "email", required: true, visible: true },
  { id: 6, section: "LEAD", fieldName: "referred_via", displayName: "Referral Method", type: "select", required: false, visible: true },
  { id: 7, section: "LEAD", fieldName: "referral_source", displayName: "Referral Source", type: "select", required: false, visible: true },
  { id: 8, section: "LEAD", fieldName: "converted", displayName: "Lead Status", type: "select", required: false, visible: true },
  { id: 9, section: "LEAD", fieldName: "monthly_pmt_goal", displayName: "Monthly Pmt Goal", type: "currency", required: false, visible: true },
  { id: 10, section: "LEAD", fieldName: "cash_to_close_goal", displayName: "Cash to Close Goal", type: "currency", required: false, visible: true },
  
  // APP COMPLETE Fields (11-33) - Used at: APP COMPLETE stage
  { id: 11, section: "APP COMPLETE", fieldName: "loan_type", displayName: "Loan Type", type: "select", required: false, visible: true },
  { id: 12, section: "APP COMPLETE", fieldName: "income_type", displayName: "Income Type", type: "select", required: false, visible: true },
  { id: 13, section: "APP COMPLETE", fieldName: "reo", displayName: "REO", type: "boolean", required: false, visible: true },
  { id: 14, section: "APP COMPLETE", fieldName: "property_type", displayName: "Property Type", type: "select", required: false, visible: true },
  { id: 15, section: "APP COMPLETE", fieldName: "occupancy", displayName: "Occupancy", type: "select", required: false, visible: true },
  { id: 16, section: "APP COMPLETE", fieldName: "borrower_current_address", displayName: "Borrower Current Address", type: "text", required: false, visible: true },
  { id: 17, section: "APP COMPLETE", fieldName: "own_rent_current_address", displayName: "Own/Rent", type: "select", required: false, visible: true },
  { id: 18, section: "APP COMPLETE", fieldName: "time_at_current_address_years", displayName: "Time at Address (Years)", type: "number", required: false, visible: true },
  { id: 19, section: "APP COMPLETE", fieldName: "time_at_current_address_months", displayName: "Time at Address (Months)", type: "number", required: false, visible: true },
  { id: 20, section: "APP COMPLETE", fieldName: "military_veteran", displayName: "Military/Veteran", type: "boolean", required: false, visible: true },
  { id: 21, section: "APP COMPLETE", fieldName: "dob", displayName: "Date of Birth", type: "date", required: false, visible: true },
  { id: 22, section: "APP COMPLETE", fieldName: "estimated_fico", displayName: "Estimated FICO", type: "number", required: false, visible: true },
  { id: 23, section: "APP COMPLETE", fieldName: "loan_amount", displayName: "Loan Amount", type: "currency", required: false, visible: true },
  { id: 24, section: "APP COMPLETE", fieldName: "sales_price", displayName: "Sales Price", type: "currency", required: false, visible: true },
  { id: 25, section: "APP COMPLETE", fieldName: "down_pmt", displayName: "Down Pmt", type: "text", required: false, visible: true },
  { id: 26, section: "APP COMPLETE", fieldName: "term", displayName: "Term (Amortization)", type: "number", required: false, visible: true },
  { id: 27, section: "APP COMPLETE", fieldName: "monthly_liabilities", displayName: "Stated Liabilities", type: "currency", required: false, visible: true },
  { id: 28, section: "APP COMPLETE", fieldName: "assets", displayName: "Assets", type: "currency", required: false, visible: true },
  { id: 29, section: "APP COMPLETE", fieldName: "subject_address_1", displayName: "Subject Address 1", type: "text", required: false, visible: true },
  { id: 30, section: "APP COMPLETE", fieldName: "subject_address_2", displayName: "Subject Address 2", type: "text", required: false, visible: true },
  { id: 31, section: "APP COMPLETE", fieldName: "subject_city", displayName: "Subject City", type: "text", required: false, visible: true },
  { id: 32, section: "APP COMPLETE", fieldName: "subject_state", displayName: "Subject State", type: "text", required: false, visible: true },
  { id: 33, section: "APP COMPLETE", fieldName: "subject_zip", displayName: "Subject Zip", type: "text", required: false, visible: true },
  { id: 34, section: "APP COMPLETE", fieldName: "arrive_loan_number", displayName: "Arrive Loan #", type: "number", required: false, visible: true },
  
  // APP REVIEW Fields (35-41, 68-72) - Used at: APP REVIEW stage
  { id: 35, section: "APP REVIEW", fieldName: "interest_rate", displayName: "Interest Rate", type: "percentage", required: false, visible: true },
  { id: 36, section: "APP REVIEW", fieldName: "piti", displayName: "PITI", type: "currency", required: false, visible: true },
  { id: 37, section: "APP REVIEW", fieldName: "program", displayName: "Program", type: "text", required: false, visible: true },
  { id: 38, section: "APP REVIEW", fieldName: "total_monthly_income", displayName: "Total Monthly Income", type: "currency", required: false, visible: true },
  { id: 39, section: "APP REVIEW", fieldName: "escrows", displayName: "Escrows", type: "select", required: false, visible: true },
  { id: 40, section: "APP REVIEW", fieldName: "dti", displayName: "DTI", type: "percentage", required: false, visible: true },
  { id: 41, section: "APP REVIEW", fieldName: "close_date", displayName: "Close Date", type: "date", required: false, visible: true },
  { id: 68, section: "APP REVIEW", fieldName: "principal_interest", displayName: "Principal & Interest", type: "currency", required: false, visible: true },
  { id: 69, section: "APP REVIEW", fieldName: "property_taxes", displayName: "Property Taxes", type: "currency", required: false, visible: true },
  { id: 70, section: "APP REVIEW", fieldName: "homeowners_insurance", displayName: "Homeowners Insurance", type: "currency", required: false, visible: true },
  { id: 71, section: "APP REVIEW", fieldName: "mortgage_insurance", displayName: "Mortgage Insurance", type: "currency", required: false, visible: true },
  { id: 72, section: "APP REVIEW", fieldName: "hoa_dues", displayName: "HOA Dues", type: "currency", required: false, visible: true },
  
  // ACTIVE Fields (42-67) - Used at: ACTIVE stage
  { id: 42, section: "ACTIVE", fieldName: "disclosure_status", displayName: "Disclosures", type: "select", required: false, visible: true },
  { id: 43, section: "ACTIVE", fieldName: "loan_status", displayName: "Loan Status", type: "select", required: false, visible: true },
  { id: 44, section: "ACTIVE", fieldName: "appraisal_status", displayName: "Appraisal Status", type: "select", required: false, visible: true },
  { id: 45, section: "ACTIVE", fieldName: "title_status", displayName: "Title Status", type: "select", required: false, visible: true },
  { id: 46, section: "ACTIVE", fieldName: "hoi_status", displayName: "HOI Status", type: "select", required: false, visible: true },
  { id: 47, section: "ACTIVE", fieldName: "mi_status", displayName: "MI Status", type: "select", required: false, visible: true },
  { id: 48, section: "ACTIVE", fieldName: "condo_status", displayName: "Condo Status", type: "select", required: false, visible: true },
  { id: 49, section: "ACTIVE", fieldName: "cd_status", displayName: "CD Status", type: "select", required: false, visible: true },
  { id: 50, section: "ACTIVE", fieldName: "package_status", displayName: "Package Status", type: "select", required: false, visible: true },
  { id: 51, section: "ACTIVE", fieldName: "lock_expiration_date", displayName: "Lock Expiration", type: "date", required: false, visible: true },
  { id: 52, section: "ACTIVE", fieldName: "ba_status", displayName: "BA Status", type: "select", required: false, visible: true },
  { id: 53, section: "ACTIVE", fieldName: "epo_status", displayName: "EPO Status", type: "select", required: false, visible: true },
  { id: 54, section: "ACTIVE", fieldName: "lender_id", displayName: "Lender", type: "select", required: false, visible: true },
  { id: 55, section: "ACTIVE", fieldName: "title_eta", displayName: "Title ETA", type: "date", required: false, visible: true },
  { id: 56, section: "ACTIVE", fieldName: "appr_date_time", displayName: "Appraisal Date/Time", type: "datetime", required: false, visible: true },
  { id: 57, section: "ACTIVE", fieldName: "appr_eta", displayName: "Appraisal ETA", type: "date", required: false, visible: true },
  { id: 58, section: "ACTIVE", fieldName: "appraisal_value", displayName: "Appraisal Value", type: "text", required: false, visible: true },
  { id: 59, section: "ACTIVE", fieldName: "fin_cont", displayName: "Financing Contingency", type: "date", required: false, visible: true },
  { id: 60, section: "ACTIVE", fieldName: "les_file", displayName: "LES File", type: "file", required: false, visible: true },
  { id: 61, section: "ACTIVE", fieldName: "contract_file", displayName: "Contract File", type: "file", required: false, visible: true },
  { id: 62, section: "ACTIVE", fieldName: "initial_approval_file", displayName: "Initial Approval File", type: "file", required: false, visible: true },
  { id: 63, section: "ACTIVE", fieldName: "disc_file", displayName: "Disclosures File", type: "file", required: false, visible: true },
  { id: 64, section: "ACTIVE", fieldName: "appraisal_file", displayName: "Appraisal File", type: "file", required: false, visible: true },
  { id: 65, section: "ACTIVE", fieldName: "insurance_file", displayName: "Insurance File", type: "file", required: false, visible: true },
  { id: 66, section: "ACTIVE", fieldName: "icd_file", displayName: "ICD File", type: "file", required: false, visible: true },
  { id: 67, section: "ACTIVE", fieldName: "fcp_file", displayName: "FCP File", type: "file", required: false, visible: true },
  
  // Additional field
  { id: 73, section: "ACTIVE", fieldName: "search_stage", displayName: "Search Stage", type: "text", required: false, visible: true }
];

const systemStats = [
  { label: "Total Records", value: "1,247", icon: Database, color: "text-primary" },
  { label: "Active Users", value: "23", icon: Users, color: "text-success" },
  { label: "Custom Fields", value: "73", icon: FileText, color: "text-warning" },
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
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-xs italic text-muted-foreground/70">System configuration and field management</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                      <SelectItem value="datetime">DateTime</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="file">File</SelectItem>
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