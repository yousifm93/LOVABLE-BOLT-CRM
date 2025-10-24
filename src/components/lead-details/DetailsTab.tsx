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
import { formatCurrency, formatPercentage, formatYesNo, formatAmortizationTerm } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

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
    sales_price: client.loan?.purchasePrice || null,
    appraisal_value: client.loan?.appraisedValue || null,
    down_pmt: client.loan?.downPayment || null,
    loan_amount: client.loan?.loanAmount || null,
    loan_type: client.loan?.mortgageType || "",
    interest_rate: client.loan?.interestRate || null,
    term: client.loan?.term || 360,
    escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
    estimated_fico: client.loan?.ficoScore || null,
    piti: client.loan?.monthlyPayment || null,
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      sales_price: client.loan?.purchasePrice || null,
      appraisal_value: client.loan?.appraisedValue || null,
      down_pmt: client.loan?.downPayment || null,
      loan_amount: client.loan?.loanAmount || null,
      loan_type: client.loan?.mortgageType || "",
      interest_rate: client.loan?.interestRate || null,
      term: client.loan?.term || 360,
      escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
      estimated_fico: client.loan?.ficoScore || null,
      piti: client.loan?.monthlyPayment || null,
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
        loan_type: editData.loan_type || null,
        interest_rate: editData.interest_rate,
        term: editData.term,
        escrows: editData.escrows || null,
        estimated_fico: editData.estimated_fico,
        piti: editData.piti,
      });

      toast({
        title: "Success",
        description: "Loan information updated successfully",
      });

      setIsEditing(false);
      onLeadUpdated?.();
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

  // Mock data for loan & property info fields
  const loanPropertyData = [
    { icon: DollarSign, label: "Purchase Price", value: formatCurrency(client.loan?.purchasePrice || 450000) },
    { icon: DollarSign, label: "Appraised Value", value: formatCurrency(client.loan?.appraisedValue || 455000) },
    { icon: DollarSign, label: "Down Payment", value: formatCurrency(client.loan?.downPayment || 90000) },
    { icon: DollarSign, label: "Loan Amount", value: formatCurrency(client.loan?.loanAmount || 360000) },
    { icon: Percent, label: "LTV", value: formatPercentage(client.loan?.ltv || 80) },
    { icon: Home, label: "Mortgage Type", value: client.loan?.mortgageType || "Conventional", badgeVariant: "outline" as const },
    { icon: Percent, label: "Interest Rate", value: formatPercentage(client.loan?.interestRate || 6.875) },
    { icon: Calendar, label: "Amortization Term", value: formatAmortizationTerm(client.loan?.term || 360) },
    { icon: Building, label: "Escrow Waiver", value: formatYesNo(client.loan?.escrowWaiver || false) },
    { icon: CreditCard, label: "FICO Score", value: client.loan?.ficoScore || "750" },
    { icon: DollarSign, label: "Proposed Monthly Payment", value: formatCurrency(client.loan?.monthlyPayment || 2145) }
  ];

  if (isEditing) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Edit Loan & Property Information
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
              <Label className="text-xs">Purchase Price</Label>
              <Input
                type="number"
                value={editData.sales_price || ""}
                onChange={(e) => setEditData({ ...editData, sales_price: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Appraised Value</Label>
              <Input
                type="text"
                value={editData.appraisal_value || ""}
                onChange={(e) => setEditData({ ...editData, appraisal_value: e.target.value || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Down Payment</Label>
              <Input
                type="text"
                value={editData.down_pmt || ""}
                onChange={(e) => setEditData({ ...editData, down_pmt: e.target.value || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Loan Amount</Label>
              <Input
                type="number"
                value={editData.loan_amount || ""}
                onChange={(e) => setEditData({ ...editData, loan_amount: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mortgage Type</Label>
              <Select
                value={editData.loan_type}
                onValueChange={(value) => setEditData({ ...editData, loan_type: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conventional">Conventional</SelectItem>
                  <SelectItem value="FHA">FHA</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="USDA">USDA</SelectItem>
                  <SelectItem value="Jumbo">Jumbo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.001"
                value={editData.interest_rate || ""}
                onChange={(e) => setEditData({ ...editData, interest_rate: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Amortization Term (months)</Label>
              <Input
                type="number"
                value={editData.term || ""}
                onChange={(e) => setEditData({ ...editData, term: parseInt(e.target.value) || 360 })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Escrows</Label>
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
            </div>

            <div className="space-y-2">
              <Label className="text-xs">FICO Score</Label>
              <Input
                type="number"
                value={editData.estimated_fico || ""}
                onChange={(e) => setEditData({ ...editData, estimated_fico: parseInt(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Monthly Payment (PITI)</Label>
              <Input
                type="number"
                value={editData.piti || ""}
                onChange={(e) => setEditData({ ...editData, piti: parseFloat(e.target.value) || null })}
                className="h-8"
              />
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
              <DollarSign className="h-5 w-5 text-primary" />
              Loan & Property Information
            </h3>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
          <TwoColumnDetailLayout items={loanPropertyData} />
        </div>
      </div>
    </ScrollArea>
  );
}