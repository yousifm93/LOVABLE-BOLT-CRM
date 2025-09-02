import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Save, Mail, Send, Shield, Globe, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const EmailMarketingNav = ({ currentPath }: { currentPath: string }) => {
  const navItems = [
    { title: "Campaigns", path: "campaigns", icon: Mail },
    { title: "Templates", path: "templates", icon: Mail },
    { title: "Audiences", path: "audiences", icon: Mail },
    { title: "Analytics", path: "analytics", icon: BarChart3 },
    { title: "Senders", path: "senders", icon: Send },
    { title: "Settings", path: "settings", icon: Mail }
  ];

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-8">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default function EmailSettings() {
  const location = useLocation();
  const [settings, setSettings] = useState({
    companyName: "MortgageBolt",
    companyAddress: "123 Main Street, Miami, FL 33101",
    defaultFromName: "MortgageBolt Team",
    defaultReplyTo: "hello@mortgagebolt.com",
    sendRate: "120",
    enableTracking: true,
    enableClickTracking: true,
    requireDoubleOptin: false,
    autoSuppressBounces: true,
    unsubscribeFooter: "You're receiving this because you interacted with MortgageBolt. {unsubscribe_link} or update your email preferences.",
    complianceDisclaimer: "Marketing emails comply with CAN-SPAM; results tracked for service quality."
  });

  const handleSave = () => {
    // In a real implementation, this would save to the database
    toast({
      title: "Settings Saved",
      description: "Your email marketing settings have been updated successfully."
    });
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <EmailMarketingNav currentPath={location.pathname} />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Settings</h2>
          <p className="text-muted-foreground">Configure global email marketing settings and compliance</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Required for CAN-SPAM compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleSettingChange('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Textarea
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Physical address required in email footer for CAN-SPAM compliance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Sender Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Default Sender Settings
            </CardTitle>
            <CardDescription>Default values for new campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultFromName">Default From Name</Label>
              <Input
                id="defaultFromName"
                value={settings.defaultFromName}
                onChange={(e) => handleSettingChange('defaultFromName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultReplyTo">Default Reply-To</Label>
              <Input
                id="defaultReplyTo"
                type="email"
                value={settings.defaultReplyTo}
                onChange={(e) => handleSettingChange('defaultReplyTo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendRate">Send Rate (emails per minute)</Label>
              <Select value={settings.sendRate} onValueChange={(value) => handleSettingChange('sendRate', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 per minute</SelectItem>
                  <SelectItem value="120">120 per minute</SelectItem>
                  <SelectItem value="300">300 per minute</SelectItem>
                  <SelectItem value="600">600 per minute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tracking & Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tracking & Analytics
            </CardTitle>
            <CardDescription>Configure email tracking preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableTracking">Open Tracking</Label>
                <p className="text-sm text-muted-foreground">Track when emails are opened</p>
              </div>
              <Switch
                id="enableTracking"
                checked={settings.enableTracking}
                onCheckedChange={(checked) => handleSettingChange('enableTracking', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableClickTracking">Click Tracking</Label>
                <p className="text-sm text-muted-foreground">Track link clicks in emails</p>
              </div>
              <Switch
                id="enableClickTracking"
                checked={settings.enableClickTracking}
                onCheckedChange={(checked) => handleSettingChange('enableClickTracking', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Settings
            </CardTitle>
            <CardDescription>Manage subscription and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireDoubleOptin">Double Opt-in</Label>
                <p className="text-sm text-muted-foreground">Require confirmation emails</p>
              </div>
              <Switch
                id="requireDoubleOptin"
                checked={settings.requireDoubleOptin}
                onCheckedChange={(checked) => handleSettingChange('requireDoubleOptin', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSuppressBounces">Auto-suppress Bounces</Label>
                <p className="text-sm text-muted-foreground">Automatically add bounced emails to suppression list</p>
              </div>
              <Switch
                id="autoSuppressBounces"
                checked={settings.autoSuppressBounces}
                onCheckedChange={(checked) => handleSettingChange('autoSuppressBounces', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Footer Templates</CardTitle>
          <CardDescription>Customize the footer content for compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unsubscribeFooter">Unsubscribe Footer</Label>
            <Textarea
              id="unsubscribeFooter"
              value={settings.unsubscribeFooter}
              onChange={(e) => handleSettingChange('unsubscribeFooter', e.target.value)}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Use {"{unsubscribe_link}"} to insert the unsubscribe link. This footer is automatically added to all emails.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="complianceDisclaimer">Compliance Disclaimer</Label>
            <Textarea
              id="complianceDisclaimer"
              value={settings.complianceDisclaimer}
              onChange={(e) => handleSettingChange('complianceDisclaimer', e.target.value)}
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Optional disclaimer about email marketing compliance and tracking.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Merge Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Available Merge Tags</CardTitle>
          <CardDescription>Use these tags in your email templates and footers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Contact Information</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div><code className="bg-muted px-1 rounded">{"{{first_name}}"}</code> - Contact first name</div>
                <div><code className="bg-muted px-1 rounded">{"{{last_name}}"}</code> - Contact last name</div>
                <div><code className="bg-muted px-1 rounded">{"{{full_name}}"}</code> - Full name</div>
                <div><code className="bg-muted px-1 rounded">{"{{email}}"}</code> - Email address</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Location</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div><code className="bg-muted px-1 rounded">{"{{city}}"}</code> - Contact city</div>
                <div><code className="bg-muted px-1 rounded">{"{{state}}"}</code> - Contact state</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">CRM Data</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div><code className="bg-muted px-1 rounded">{"{{loan_stage}}"}</code> - Current loan stage</div>
                <div><code className="bg-muted px-1 rounded">{"{{agent_name}}"}</code> - Assigned agent</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">System Tags</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div><code className="bg-muted px-1 rounded">{"{{unsubscribe_url}}"}</code> - Unsubscribe link</div>
                <div><code className="bg-muted px-1 rounded">{"{{company_address}}"}</code> - Company address</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}