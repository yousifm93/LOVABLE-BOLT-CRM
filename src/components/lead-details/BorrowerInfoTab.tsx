import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, Home, Users, Shield, Pencil } from "lucide-react";
import { formatDate, formatYesNo, maskSSN, formatAddress } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { sanitizeNumber } from "@/lib/utils";
import { z } from "zod";

interface BorrowerInfoTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
}

export function BorrowerInfoTab({ client, leadId, onLeadUpdated }: BorrowerInfoTabProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    first_name: client.person?.firstName || "",
    last_name: client.person?.lastName || "",
    email: client.person?.email || "",
    phone: client.person?.phone || "",
    dob: null as string | null,
    borrower_current_address: "",
    own_rent_current_address: "",
    time_at_current_address_years: null as number | null,
    time_at_current_address_months: null as number | null,
    military_veteran: false,
    estimated_fico: null as number | null,
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      first_name: client.person?.firstName || "",
      last_name: client.person?.lastName || "",
      email: client.person?.email || "",
      phone: client.person?.phone || "",
      dob: null,
      borrower_current_address: "",
      own_rent_current_address: "",
      time_at_current_address_years: null,
      time_at_current_address_months: null,
      military_veteran: false,
      estimated_fico: null,
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

    if (!editData.first_name?.trim() || !editData.last_name?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await databaseService.updateLead(leadId, {
        first_name: editData.first_name,
        last_name: editData.last_name,
        email: editData.email || null,
        phone: editData.phone || null,
        dob: editData.dob,
        borrower_current_address: editData.borrower_current_address || null,
        own_rent_current_address: editData.own_rent_current_address || null,
        time_at_current_address_years: editData.time_at_current_address_years,
        time_at_current_address_months: editData.time_at_current_address_months,
        military_veteran: editData.military_veteran,
        estimated_fico: editData.estimated_fico,
      });

      toast({
        title: "Success",
        description: "Borrower information updated successfully",
      });

      setIsEditing(false);
      onLeadUpdated?.();
    } catch (error: any) {
      console.error("Error updating borrower info:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update borrower information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Mock data for borrower info fields not in current client structure
  const borrowerData = [
    { icon: User, label: "Borrower First Name", value: client.person?.firstName || "John" },
    { icon: User, label: "Borrower Last Name", value: client.person?.lastName || "Smith" },
    { icon: Shield, label: "Social Security Number", value: maskSSN("123456789") },
    { icon: User, label: "Date of Birth", value: formatDate("1985-06-15") },
    { icon: Home, label: "Residence Type", value: "Owner Occupied" },
    { icon: Users, label: "Marital Status", value: "Married" },
    { icon: Mail, label: "Email", value: client.person?.email || "—" },
    { icon: Phone, label: "Cell Phone", value: client.person?.phone || "—" },
    { icon: Users, label: "Number of Dependents", value: "2" },
    { icon: Shield, label: "Estimated Credit Score", value: "750" },
    { icon: Home, label: "Current Address", value: formatAddress("123 Main St, Anytown, CA 90210") },
    { icon: Home, label: "Occupancy of Current Address", value: "Primary Residence" },
    { icon: Home, label: "Time at Current Address", value: "3 years" },
    { icon: Shield, label: "Military/Veteran", value: formatYesNo(false) }
  ];

  if (isEditing) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Edit Borrower Information
            </h3>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">First Name *</Label>
              <Input
                value={editData.first_name}
                onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Last Name *</Label>
              <Input
                value={editData.last_name}
                onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Phone</Label>
              <Input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Date of Birth</Label>
              <Input
                type="date"
                value={editData.dob || ""}
                onChange={(e) => setEditData({ ...editData, dob: e.target.value || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Estimated FICO Score</Label>
              <Input
                type="number"
                value={editData.estimated_fico || ""}
                onChange={(e) => setEditData({ ...editData, estimated_fico: parseInt(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Current Address</Label>
              <Input
                value={editData.borrower_current_address}
                onChange={(e) => setEditData({ ...editData, borrower_current_address: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Own/Rent Current Address</Label>
              <Select
                value={editData.own_rent_current_address}
                onValueChange={(value) => setEditData({ ...editData, own_rent_current_address: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Own">Own</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Living with Family">Living with Family</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Time at Current Address (Years)</Label>
              <Input
                type="number"
                value={editData.time_at_current_address_years || ""}
                onChange={(e) => setEditData({ ...editData, time_at_current_address_years: parseInt(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Time at Current Address (Months)</Label>
              <Input
                type="number"
                value={editData.time_at_current_address_months || ""}
                onChange={(e) => setEditData({ ...editData, time_at_current_address_months: parseInt(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Military/Veteran Status</Label>
              <Select
                value={editData.military_veteran ? "Yes" : "No"}
                onValueChange={(value) => setEditData({ ...editData, military_veteran: value === "Yes" })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Borrower Information
            </h3>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
          <TwoColumnDetailLayout items={borrowerData} />
        </div>
      </div>
    </ScrollArea>
  );
}