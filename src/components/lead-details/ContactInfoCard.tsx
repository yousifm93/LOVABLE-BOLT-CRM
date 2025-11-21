import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, User, DollarSign, ArrowRightLeft, Home, Building2, Landmark } from "lucide-react";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { sanitizeNumber } from "@/lib/utils";
import { formatPhone } from "@/utils/formatters";
import { z } from "zod";

interface ContactInfoCardProps {
  client: any;
  onClose: () => void;
  leadId?: string;
  onLeadUpdated?: () => void;
}

export function ContactInfoCard({ client, onClose, leadId, onLeadUpdated }: ContactInfoCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [showAgentDrawer, setShowAgentDrawer] = useState(false);
  
  // Edit form state
  const [editData, setEditData] = useState({
    firstName: client.person?.firstName || "",
    lastName: client.person?.lastName || "",
    phone: client.person?.phone || client.person?.phoneMobile || "",
    email: client.person?.email || "",
    buyer_agent_id: (client as any).buyer_agent_id || null,
    listing_agent_id: (client as any).listing_agent_id || null,
    loanAmount: client.loan?.loanAmount || null,
    salesPrice: client.loan?.salesPrice || null,
    appraisal_value: client.loan?.appraisedValue || null,
    transactionType: client.loan?.loanType || "",
    propertyType: client.property?.propertyType || "",
    loanProgram: client.loan?.loanProgram || "",
  });

  // Auto-sync appraised value with purchase price during editing
  useEffect(() => {
    if (isEditing && editData.salesPrice) {
      setEditData(prev => ({ ...prev, appraisal_value: prev.salesPrice }));
    }
  }, [editData.salesPrice, isEditing]);

  // Fetch agents list
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const buyerAgentsData = await databaseService.getBuyerAgents();
        setAgents(buyerAgentsData || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
    fetchAgents();
  }, []);

  const fullName = `${client.person.firstName} ${client.person.lastName}`;
  const initials = `${client.person.firstName[0]}${client.person.lastName[0]}`;

  // Derive agent objects for display and editing
  const buyerAgent = (client as any).buyer_agent || agents.find(a => a.id === (client as any).buyer_agent_id);
  const listingAgent = (client as any).listing_agent || agents.find(a => a.id === (client as any).listing_agent_id);

  const handleAgentClick = async () => {
    const agentId = (client as any).buyer_agent_id;
    if (!agentId) return;
    
    try {
      const agent = await databaseService.getBuyerAgentById(agentId);
      setSelectedAgent(agent);
      setShowAgentDrawer(true);
    } catch (error) {
      console.error('Error fetching agent:', error);
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive"
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      firstName: client.person?.firstName || "",
      lastName: client.person?.lastName || "",
      phone: client.person?.phone || client.person?.phoneMobile || "",
      email: client.person?.email || "",
      buyer_agent_id: (client as any).buyer_agent_id || null,
      listing_agent_id: (client as any).listing_agent_id || null,
      loanAmount: client.loan?.loanAmount || null,
      salesPrice: client.loan?.salesPrice || null,
      appraisal_value: client.loan?.appraisedValue || null,
      transactionType: client.loan?.loanType || "",
      propertyType: client.property?.propertyType || "",
      loanProgram: client.loan?.loanProgram || "",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing",
        variant: "destructive",
      });
      return;
    }

    // Validation schema
    const schema = z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Invalid email address").optional().or(z.literal('')),
      phone: z.string().optional(),
      loanAmount: z.number().min(0).nullable().optional(),
      salesPrice: z.number().min(0).nullable().optional(),
    });

    try {
      // Sanitize numeric fields
      const sanitizedData = {
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        email: editData.email.trim(),
        phone: editData.phone,
        loanAmount: sanitizeNumber(editData.loanAmount),
        salesPrice: sanitizeNumber(editData.salesPrice),
      };

      // Validate
      schema.parse(sanitizedData);

      setIsSaving(true);
      
      await databaseService.updateLead(leadId, {
        first_name: sanitizedData.firstName,
        last_name: sanitizedData.lastName,
        phone: sanitizedData.phone,
        email: sanitizedData.email,
        buyer_agent_id: editData.buyer_agent_id,
        listing_agent_id: editData.listing_agent_id,
        loan_amount: sanitizedData.loanAmount,
        sales_price: sanitizedData.salesPrice,
        appraisal_value: sanitizedData.salesPrice?.toString() || null, // Sync with purchase price
        loan_type: editData.transactionType,
        property_type: editData.propertyType,
        program: editData.loanProgram, // Save loan program to 'program' field
      });

      setIsEditing(false);
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update lead",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await databaseService.deleteLead(leadId);
      
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });

      setShowDeleteDialog(false);
      onClose();
      onLeadUpdated?.();
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="h-[320px] flex flex-col">
        <CardHeader className="pb-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex items-center justify-center"
            >
              <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={client.person.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  placeholder="First Name"
                  className="h-8"
                />
                <Input
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="h-8"
                />
              </div>
            ) : (
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
            )}
            
            <div className="flex gap-2 ml-4">
              {!isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="px-4 py-2"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="px-4 py-2"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    size="default" 
                    className="px-4 py-2"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="px-4 py-2"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Borrower Phone</Label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{formatPhone(client.person?.phone || client.person?.phoneMobile)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Borrower Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span 
                      className="truncate cursor-pointer hover:underline" 
                      title={client.person.email}
                      onClick={() => {
                        navigator.clipboard.writeText(client.person.email);
                        toast({ title: "Email copied to clipboard" });
                      }}
                    >
                      {client.person.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Buyer's Agent</Label>
                {isEditing ? (
                  <InlineEditAgent
                    value={buyerAgent}
                    agents={agents}
                    onValueChange={(agent) => setEditData({ ...editData, buyer_agent_id: agent?.id || null })}
                    placeholder="Select buyer's agent"
                    type="buyer"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <button
                      onClick={handleAgentClick}
                      className="text-primary hover:underline cursor-pointer disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                      disabled={!(client as any).buyer_agent_id}
                    >
                      {buyerAgent ? `${buyerAgent.first_name} ${buyerAgent.last_name}` : "—"}
                    </button>
                  </div>
                )}
              </div>
              {/* Listing Agent - always shown */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Listing Agent</Label>
                {isEditing ? (
                  <InlineEditAgent
                    value={listingAgent}
                    agents={agents}
                    onValueChange={(agent) => setEditData({ ...editData, listing_agent_id: agent?.id || null })}
                    placeholder="Select listing agent"
                    type="listing"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {listingAgent ? `${listingAgent.first_name} ${listingAgent.last_name}` : "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Purchase Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="1000"
                    min="0"
                    value={editData.salesPrice || ""}
                    onChange={(e) => setEditData({ ...editData, salesPrice: e.target.value })}
                    placeholder="Enter amount"
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {client.loan?.salesPrice ? `$${Number(client.loan.salesPrice).toLocaleString()}` : "—"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Loan Amount</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="1000"
                    min="0"
                    value={editData.loanAmount || ""}
                    onChange={(e) => setEditData({ ...editData, loanAmount: e.target.value })}
                    placeholder="Enter amount"
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Landmark className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {client.loan?.loanAmount ? `$${Number(client.loan.loanAmount).toLocaleString()}` : "—"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Property Type</Label>
                {isEditing ? (
                  <Select
                    value={editData.propertyType}
                    onValueChange={(value) => setEditData({ ...editData, propertyType: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single Family Home">Single Family Home</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{client.property?.propertyType || "—"}</span>
                  </div>
                )}
              </div>

              {/* Transaction Type - always in Loan & Property section */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                {isEditing ? (
                  <Select
                    value={editData.transactionType}
                    onValueChange={(value) => setEditData({ ...editData, transactionType: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Refinance">Refinance</SelectItem>
                      <SelectItem value="HELOC">HELOC</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{client.loan?.loanType || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Loan Program</Label>
                {isEditing ? (
                  <Select
                    value={editData.loanProgram}
                    onValueChange={(value) => setEditData({ ...editData, loanProgram: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conventional">Conventional</SelectItem>
                      <SelectItem value="FHA">FHA</SelectItem>
                      <SelectItem value="VA">VA</SelectItem>
                      <SelectItem value="USDA">USDA</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{client.loan?.loanProgram || "—"}</span>
                  </div>
                )}
              </div>
              {/* Transaction Type for active stage only */}
              {client.ops.stage === 'Active' && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                  {isEditing ? (
                    <Select
                      value={editData.transactionType}
                      onValueChange={(value) => setEditData({ ...editData, transactionType: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Purchase">Purchase</SelectItem>
                        <SelectItem value="Refinance">Refinance</SelectItem>
                        <SelectItem value="HELOC">HELOC</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      <span>{client.loan?.loanType || "—"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AgentDetailDialog
        agent={selectedAgent}
        isOpen={showAgentDrawer}
        onClose={() => {
          setShowAgentDrawer(false);
          setSelectedAgent(null);
        }}
        onAgentUpdated={() => {
          onLeadUpdated?.();
        }}
      />
    </>
  );
}
