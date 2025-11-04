import React, { useState, useEffect } from "react";
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
import { 
  DollarSign, 
  Home, 
  Percent,
  Calendar,
  CreditCard,
  MapPin,
  Building,
  Pencil
} from "lucide-react";
import { formatCurrency, formatPercentage, formatYesNo, formatAmortizationTerm, calculateMonthlyPayment } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { sanitizeNumber } from "@/lib/utils";
import { z } from "zod";

interface DetailsTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
}

export function DetailsTab({ client, leadId, onLeadUpdated }: DetailsTabProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    sales_price: client.loan?.salesPrice || client.loan?.purchasePrice || null,
    appraisal_value: client.loan?.appraisedValue || null,
    down_pmt: client.loan?.downPayment || null,
    loan_amount: client.loan?.loanAmount || null,
    loan_type: client.loan?.loanProgram || client.loan?.mortgageType || "",
    interest_rate: client.loan?.interestRate || 7.0,
    term: client.loan?.term || 360,
    escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
    estimated_fico: client.loan?.ficoScore || null,
    piti: client.loan?.monthlyPayment || null,
    property_type: client.property?.propertyType || "",
  });

  // Auto-calculate monthly payment when loan amount, interest rate, or term changes
  useEffect(() => {
    if (isEditing) {
      const calculatedPayment = calculateMonthlyPayment(
        editData.loan_amount,
        editData.interest_rate,
        editData.term
      );
      
      if (calculatedPayment !== null && calculatedPayment !== editData.piti) {
        setEditData(prev => ({ ...prev, piti: calculatedPayment }));
      }
    }
  }, [editData.loan_amount, editData.interest_rate, editData.term, isEditing]);

  // Auto-sync appraised value with purchase price during editing
  useEffect(() => {
    if (isEditing && editData.sales_price) {
      setEditData(prev => ({ ...prev, appraisal_value: editData.sales_price }));
    }
  }, [editData.sales_price, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      sales_price: client.loan?.salesPrice || client.loan?.purchasePrice || null,
      appraisal_value: client.loan?.appraisedValue || null,
      down_pmt: client.loan?.downPayment || null,
      loan_amount: client.loan?.loanAmount || null,
      loan_type: client.loan?.loanProgram || client.loan?.mortgageType || "",
      interest_rate: client.loan?.interestRate || 7.0,
      term: client.loan?.term || 360,
      escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
      estimated_fico: client.loan?.ficoScore || null,
      piti: client.loan?.monthlyPayment || null,
      property_type: client.property?.propertyType || "",
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

    setIsSaving(true);
    try {
      await databaseService.updateLead(leadId, {
        sales_price: editData.sales_price,
        appraisal_value: editData.appraisal_value?.toString() || null,
        down_pmt: editData.down_pmt?.toString() || null,
        loan_amount: editData.loan_amount,
        program: editData.loan_type || null, // Save to 'program' field (Mortgage Type/Loan Program)
        interest_rate: editData.interest_rate,
        term: editData.term,
        escrows: editData.escrows || null,
        estimated_fico: editData.estimated_fico,
        piti: editData.piti,
        property_type: editData.property_type || null,
      });

      setIsEditing(false);
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      
      toast({
        title: "Success",
        description: "Loan information updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating loan info:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update loan information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loan & property info fields
  const loanPropertyData = [
    { 
      icon: DollarSign, 
      label: "Appraised Value", 
      value: formatCurrency(client.loan?.appraisedValue || 0),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.appraisal_value || ""}
          disabled
          className="h-8 bg-muted cursor-not-allowed"
          title="Auto-synced with Purchase Price"
        />
      ) : undefined,
      isCalculated: isEditing
    },
    { 
      icon: DollarSign, 
      label: "Down Payment", 
      value: formatCurrency(client.loan?.downPayment || 0),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.down_pmt || ""}
          onChange={(e) => setEditData({ ...editData, down_pmt: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
    },
    { 
      icon: Percent, 
      label: "LTV", 
      value: client.loan?.ltv ? formatPercentage(client.loan.ltv) : "—"
    },
    { 
      icon: Percent, 
      label: "Interest Rate", 
      value: client.loan?.interestRate ? formatPercentage(client.loan.interestRate) : formatPercentage(7.0),
      editComponent: isEditing ? (
        <Input
          type="number"
          step="0.001"
          value={editData.interest_rate || ""}
          onChange={(e) => setEditData({ ...editData, interest_rate: parseFloat(e.target.value) || null })}
          className="h-8"
          placeholder="7.0"
        />
      ) : undefined
    },
    { 
      icon: Calendar, 
      label: "Amortization Term", 
      value: client.loan?.term ? formatAmortizationTerm(client.loan.term) : formatAmortizationTerm(360),
      editComponent: isEditing ? (
        <Input
          type="number"
          value={editData.term || ""}
          onChange={(e) => setEditData({ ...editData, term: parseInt(e.target.value) || 360 })}
          className="h-8"
          placeholder="360"
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Escrow Waiver", 
      value: formatYesNo(client.loan?.escrowWaiver || false),
      editComponent: isEditing ? (
        <Select
          value={editData.escrows}
          onValueChange={(value) => setEditData({ ...editData, escrows: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Escrowed">Escrowed</SelectItem>
            <SelectItem value="Waived">Waived</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: CreditCard, 
      label: "FICO Score", 
      value: client.loan?.ficoScore?.toString() || "—",
      editComponent: isEditing ? (
        <Input
          type="number"
          value={editData.estimated_fico || ""}
          onChange={(e) => setEditData({ ...editData, estimated_fico: parseInt(e.target.value) || null })}
          className="h-8"
          placeholder="Credit score"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Proposed Monthly Payment", 
      value: client.loan?.monthlyPayment ? formatCurrency(client.loan.monthlyPayment) : "—",
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.piti ? formatCurrency(editData.piti) : "—"}
          disabled
          className="h-8 bg-muted cursor-not-allowed"
          title="Automatically calculated from Loan Amount, Interest Rate, and Term"
        />
      ) : undefined,
      isCalculated: isEditing
    }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {isEditing ? "Edit Loan & Property Information" : "Loan & Property Information"}
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
          <TwoColumnDetailLayout items={loanPropertyData} />
        </div>
      </div>
    </ScrollArea>
  );
}