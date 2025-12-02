import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Home, Users, Shield, Pencil, Calendar, DollarSign } from "lucide-react";
import { formatDate, formatYesNo, maskSSN, formatTimeAtAddress, formatCurrency } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

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
    ssn: (client as any).ssn || "",
    dob: (client as any).dob || null,
    occupancy: (client as any).occupancy || "",
    residency_type: (client as any).residency_type || "",
    marital_status: (client as any).marital_status || "",
    monthly_payment_goal: (client as any).monthly_payment_goal || null,
    cash_to_close_goal: (client as any).cash_to_close_goal || null,
    borrower_current_address: (client as any).borrower_current_address || "",
    military_veteran: (client as any).military_veteran || false,
    own_rent_current_address: (client as any).own_rent_current_address || "",
    time_at_current_address_years: (client as any).time_at_current_address_years || null,
    time_at_current_address_months: (client as any).time_at_current_address_months || null,
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      first_name: client.person?.firstName || "",
      last_name: client.person?.lastName || "",
      ssn: (client as any).ssn || "",
      dob: (client as any).dob || null,
      occupancy: (client as any).occupancy || "",
      residency_type: (client as any).residency_type || "",
      marital_status: (client as any).marital_status || "",
      monthly_payment_goal: (client as any).monthly_payment_goal || null,
      cash_to_close_goal: (client as any).cash_to_close_goal || null,
      borrower_current_address: (client as any).borrower_current_address || "",
      military_veteran: (client as any).military_veteran || false,
      own_rent_current_address: (client as any).own_rent_current_address || "",
      time_at_current_address_years: (client as any).time_at_current_address_years || null,
      time_at_current_address_months: (client as any).time_at_current_address_months || null,
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
        ssn: editData.ssn || null,
        dob: editData.dob,
        occupancy: editData.occupancy || null,
        residency_type: editData.residency_type || null,
        marital_status: editData.marital_status || null,
        monthly_pmt_goal: editData.monthly_payment_goal, // Note: DB field is monthly_pmt_goal
        cash_to_close_goal: editData.cash_to_close_goal,
        borrower_current_address: editData.borrower_current_address || null,
        military_veteran: editData.military_veteran,
        own_rent_current_address: editData.own_rent_current_address || null,
        time_at_current_address_years: editData.time_at_current_address_years,
        time_at_current_address_months: editData.time_at_current_address_months,
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

  // Borrower data with inline editing support
  const borrowerData = [
    { 
      icon: User, 
      label: "Borrower First Name", 
      value: client.person?.firstName || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.first_name}
          onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
          className="h-8"
          placeholder="First name"
        />
      ) : undefined
    },
    { 
      icon: User, 
      label: "Borrower Last Name", 
      value: client.person?.lastName || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.last_name}
          onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
          className="h-8"
          placeholder="Last name"
        />
      ) : undefined
    },
    { 
      icon: Shield, 
      label: "Social Security Number", 
      value: maskSSN((client as any).ssn),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.ssn}
          onChange={(e) => setEditData({ ...editData, ssn: e.target.value })}
          className="h-8"
          placeholder="XXX-XX-XXXX"
        />
      ) : undefined
    },
    { 
      icon: Calendar, 
      label: "Date of Birth", 
      value: formatDate((client as any).dob),
      editComponent: isEditing ? (
        <Input
          type="date"
          value={editData.dob || ""}
          onChange={(e) => setEditData({ ...editData, dob: e.target.value || null })}
          className="h-8"
        />
      ) : undefined
    },
    { 
      icon: Home, 
      label: "Occupancy", 
      value: (client as any).occupancy || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.occupancy}
          onValueChange={(value) => setEditData({ ...editData, occupancy: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select occupancy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Primary Residence">Primary Residence</SelectItem>
            <SelectItem value="Second Home">Second Home</SelectItem>
            <SelectItem value="Investment Property">Investment Property</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: Shield, 
      label: "Residency Type", 
      value: (client as any).residency_type || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.residency_type}
          onValueChange={(value) => setEditData({ ...editData, residency_type: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select residency type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="US Citizen">US Citizen</SelectItem>
            <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
            <SelectItem value="Non-Permanent Resident Alien">Non-Permanent Resident Alien</SelectItem>
            <SelectItem value="Foreign National">Foreign National</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: Users, 
      label: "Marital Status", 
      value: (client as any).marital_status || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.marital_status}
          onValueChange={(value) => setEditData({ ...editData, marital_status: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select marital status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Unmarried">Unmarried</SelectItem>
            <SelectItem value="Married">Married</SelectItem>
            <SelectItem value="Separated">Separated</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Monthly Payment Goal", 
      value: (client as any).monthly_payment_goal ? formatCurrency((client as any).monthly_payment_goal) : "—",
      editComponent: isEditing ? (
        <Input
          type="number"
          value={editData.monthly_payment_goal || ""}
          onChange={(e) => setEditData({ ...editData, monthly_payment_goal: parseFloat(e.target.value) || null })}
          className="h-8"
          placeholder="0"
          min="0"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Cash to Close Goal", 
      value: (client as any).cash_to_close_goal ? formatCurrency((client as any).cash_to_close_goal) : "—",
      editComponent: isEditing ? (
        <Input
          type="number"
          value={editData.cash_to_close_goal || ""}
          onChange={(e) => setEditData({ ...editData, cash_to_close_goal: parseFloat(e.target.value) || null })}
          className="h-8"
          placeholder="0"
          min="0"
        />
      ) : undefined
    },
    { 
      icon: Home, 
      label: "Current Address", 
      value: (client as any).borrower_current_address || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.borrower_current_address}
          onChange={(e) => setEditData({ ...editData, borrower_current_address: e.target.value })}
          className="h-8"
          placeholder="Street, City, State, ZIP"
        />
      ) : undefined
    },
    { 
      icon: Home, 
      label: "Own/Rent/Living Status", 
      value: (client as any).own_rent_current_address || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.own_rent_current_address}
          onValueChange={(value) => setEditData({ ...editData, own_rent_current_address: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RENT">Rent</SelectItem>
            <SelectItem value="OWN">Own</SelectItem>
            <SelectItem value="Living Rent-Free">Living Rent-Free</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: Calendar, 
      label: "Time at Current Address", 
      value: formatTimeAtAddress((client as any).time_at_current_address_years, (client as any).time_at_current_address_months),
      editComponent: isEditing ? (
        <div className="flex gap-2">
          <Input
            type="number"
            value={editData.time_at_current_address_years || ""}
            onChange={(e) => setEditData({ ...editData, time_at_current_address_years: parseInt(e.target.value) || null })}
            className="h-8 w-20"
            placeholder="Years"
            min="0"
          />
          <Input
            type="number"
            value={editData.time_at_current_address_months || ""}
            onChange={(e) => setEditData({ ...editData, time_at_current_address_months: parseInt(e.target.value) || null })}
            className="h-8 w-20"
            placeholder="Months"
            min="0"
            max="11"
          />
        </div>
      ) : undefined
    },
    { 
      icon: Shield, 
      label: "Military/Veteran", 
      value: formatYesNo((client as any).military_veteran),
      editComponent: isEditing ? (
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
      ) : undefined
    }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {isEditing ? "Edit Borrower Information" : "Borrower Information"}
            </h3>
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <TwoColumnDetailLayout items={borrowerData} />
        </div>
      </div>
    </ScrollArea>
  );
}
