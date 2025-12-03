import { useState } from "react";
import { X, Building2, Mail, Phone, User, Globe, Lock, Eye, EyeOff, DollarSign, Copy, ExternalLink } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private" | "HELOC";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  broker_portal_username?: string;
  broker_portal_password?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface LenderDetailDrawerProps {
  lender: Lender | null;
  isOpen: boolean;
  onClose: () => void;
  onLenderUpdated: () => void;
}

export function LenderDetailDrawer({ lender, isOpen, onClose, onLenderUpdated }: LenderDetailDrawerProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!lender?.id) return;

    try {
      await databaseService.updateLender(lender.id, { [field]: value });
      onLenderUpdated();
      toast({
        title: "Updated",
        description: "Lender information updated successfully.",
      });
    } catch (error) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: "Failed to update lender information.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  if (!lender) return null;

  const initials = lender.lender_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '??';

  const getLenderTypeColor = (type: string) => {
    switch (type) {
      case 'Conventional': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'Non-QM': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'Private': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      case 'HELOC': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Parse first/last name from account_executive
  const aeParts = lender.account_executive?.split(' ') || [];
  const aeFirstName = aeParts[0] || '';
  const aeLastName = aeParts.slice(1).join(' ') || '';

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DrawerTitle className="text-2xl">{lender.lender_name}</DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2 mt-1">
                    <Badge className={getLenderTypeColor(lender.lender_type)}>
                      {lender.lender_type}
                    </Badge>
                    <Badge variant={lender.status === 'Active' ? 'default' : 'secondary'}>
                      {lender.status}
                    </Badge>
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                  <X className="h-5 w-5" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
            {/* Lender Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Lender Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lender Name</label>
                  <InlineEditText
                    value={lender.lender_name}
                    onValueChange={(value) => handleFieldUpdate('lender_name', value)}
                    placeholder="Enter lender name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lender Type</label>
                  <InlineEditLenderType
                    value={lender.lender_type}
                    onValueChange={(value) => handleFieldUpdate('lender_type', value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Executive */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Account Executive
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <InlineEditText
                      value={aeFirstName}
                      onValueChange={(value) => handleFieldUpdate('account_executive', `${value} ${aeLastName}`.trim())}
                      placeholder="First name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <InlineEditText
                      value={aeLastName}
                      onValueChange={(value) => handleFieldUpdate('account_executive', `${aeFirstName} ${value}`.trim())}
                      placeholder="Last name"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <InlineEditText
                    value={lender.account_executive_email}
                    onValueChange={(value) => handleFieldUpdate('account_executive_email', value)}
                    placeholder="ae@lender.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </label>
                  <InlineEditPhone
                    value={lender.account_executive_phone}
                    onValueChange={(value) => handleFieldUpdate('account_executive_phone', value)}
                    placeholder="(555) 555-5555"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  Portal Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Broker Portal URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <InlineEditLink
                      value={lender.broker_portal_url}
                      onValueChange={(value) => handleFieldUpdate('broker_portal_url', value)}
                      placeholder="https://portal.lender.com"
                      className="flex-1"
                    />
                    {lender.broker_portal_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(lender.broker_portal_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <div className="flex items-center gap-2 mt-1">
                    <InlineEditText
                      value={lender.broker_portal_username}
                      onValueChange={(value) => handleFieldUpdate('broker_portal_username', value)}
                      placeholder="Enter username"
                      className="flex-1"
                    />
                    {lender.broker_portal_username && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(lender.broker_portal_username!, 'Username')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                      <span className="flex-1 font-mono text-sm">
                        {showPassword ? lender.broker_portal_password || '—' : '••••••••'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {lender.broker_portal_password && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(lender.broker_portal_password!, 'Password')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Loan Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Minimum Loan Amount</label>
                    <InlineEditCurrency
                      value={lender.min_loan_amount ?? null}
                      onValueChange={(value) => handleFieldUpdate('min_loan_amount', value)}
                      placeholder="$0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Maximum Loan Amount</label>
                    <InlineEditCurrency
                      value={lender.max_loan_amount ?? null}
                      onValueChange={(value) => handleFieldUpdate('max_loan_amount', value)}
                      placeholder="$0"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <InlineEditNotes
                  value={lender.notes}
                  onValueChange={(value) => handleFieldUpdate('notes', value)}
                  placeholder="Add notes about this lender..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}