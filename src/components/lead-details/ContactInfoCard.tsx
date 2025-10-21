import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, User } from "lucide-react";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
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
  
  // Edit form state
  const [editData, setEditData] = useState({
    phone: client.person?.phone || "",
    email: client.person?.email || "",
    buyersAgent: "",
    loanAmount: client.loan?.loanAmount || null,
    salesPrice: client.loan?.salesPrice || null,
    transactionType: client.loan?.loanType || "",
    propertyType: client.property?.propertyType || "",
    loanProgram: client.loan?.loanProgram || "",
  });

  const fullName = `${client.person.firstName} ${client.person.lastName}`;
  const initials = `${client.person.firstName[0]}${client.person.lastName[0]}`;

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      phone: client.person?.phone || "",
      email: client.person?.email || "",
      buyersAgent: "",
      loanAmount: client.loan?.loanAmount || null,
      salesPrice: client.loan?.salesPrice || null,
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

    // Basic validation
    if (!editData.email.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await databaseService.updateLead(leadId, {
        phone: editData.phone,
        email: editData.email,
        loan_amount: editData.loanAmount,
        sales_price: editData.salesPrice,
        loan_type: editData.transactionType,
        property_type: editData.propertyType,
      });

      toast({
        title: "Success",
        description: "Lead updated successfully",
      });

      setIsEditing(false);
      onLeadUpdated?.();
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
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
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Phone Number</Label>
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
                    <span>{client.person?.phone || "(352) 328-9828"}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="h-8"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{client.person.email}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Buyer's Agent</Label>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>—</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Loan Amount</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.loanAmount || ""}
                    onChange={(e) => setEditData({ ...editData, loanAmount: parseFloat(e.target.value) || null })}
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium text-sm">{client.loan?.loanAmount || "—"}</span>
                )}
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Sales Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.salesPrice || ""}
                    onChange={(e) => setEditData({ ...editData, salesPrice: parseFloat(e.target.value) || null })}
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium text-sm">$425,000</span>
                )}
              </div>
              <div>
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
                  <span className="font-medium text-sm">{client.loan?.loanType || "—"}</span>
                )}
              </div>
              <div>
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
                  <span className="font-medium text-sm">Single Family Home</span>
                )}
              </div>
              <div>
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
                  <span className="font-medium text-sm">Conventional</span>
                )}
              </div>
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
    </>
  );
}
