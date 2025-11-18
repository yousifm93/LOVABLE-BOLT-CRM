import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FourColumnDetailLayout } from "./FourColumnDetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Building,
  Pencil,
  User,
  Users,
  Shield,
  Calculator,
  Receipt,
  Building2,
  Wallet
} from "lucide-react";
import { 
  formatCurrency, 
  formatPercentage, 
  formatYesNo, 
  formatAmortizationTerm, 
  calculateMonthlyPayment,
  formatDate,
  maskSSN,
  formatTimeAtAddress
} from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";

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
    // Loan & Property
    appraisal_value: client.loan?.appraisedValue || null,
    down_pmt: client.loan?.downPayment || null,
    interest_rate: client.loan?.interestRate || 7.0,
    term: client.loan?.term || 360,
    escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
    fico_score: client.loan?.ficoScore || null,
    piti: client.piti || null,
    
    // Borrower Info
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
    
    // Consolidated Financial Fields
    total_monthly_income: (client as any).totalMonthlyIncome || null,
    assets: (client as any).assets || null,
    monthly_liabilities: (client as any).monthlyLiabilities || null,
    
    // Monthly Payment Breakdown
    principal_interest: (client as any).principalInterest || null,
    property_taxes: (client as any).propertyTaxes || null,
    homeowners_insurance: (client as any).homeownersInsurance || null,
    mortgage_insurance: (client as any).mortgageInsurance || null,
    hoa_dues: (client as any).hoaDues || null,
  });

  // Helper function for PITI calculation
  const calculatePITI = () => {
    return (
      (editData.principal_interest || 0) +
      (editData.property_taxes || 0) +
      (editData.homeowners_insurance || 0) +
      (editData.mortgage_insurance || 0) +
      (editData.hoa_dues || 0)
    );
  };

  // Auto-calculate PITI when payment breakdown components change
  useEffect(() => {
    if (isEditing) {
      const calculatedPITI = calculatePITI();
      setEditData(prev => ({ ...prev, piti: calculatedPITI }));
    }
  }, [
    isEditing, 
    editData.principal_interest, 
    editData.property_taxes, 
    editData.homeowners_insurance, 
    editData.mortgage_insurance, 
    editData.hoa_dues
  ]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset edit data
    setEditData({
      appraisal_value: client.loan?.appraisedValue || null,
      down_pmt: client.loan?.downPayment || null,
      interest_rate: client.loan?.interestRate || 7.0,
      term: client.loan?.term || 360,
      escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
      fico_score: client.loan?.ficoScore || null,
      piti: client.piti || null,
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
      total_monthly_income: (client as any).totalMonthlyIncome || null,
      assets: (client as any).assets || null,
      monthly_liabilities: (client as any).monthlyLiabilities || null,
      principal_interest: (client as any).principalInterest || null,
      property_taxes: (client as any).propertyTaxes || null,
      homeowners_insurance: (client as any).homeownersInsurance || null,
      mortgage_insurance: (client as any).mortgageInsurance || null,
      hoa_dues: (client as any).hoaDues || null,
    });
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
        // Loan & Property
        appraisal_value: editData.appraisal_value?.toString() || null,
        down_pmt: editData.down_pmt?.toString() || null,
        interest_rate: editData.interest_rate,
        term: editData.term,
        escrows: editData.escrows || null,
        fico_score: editData.fico_score,
        piti: editData.piti,
        
        // Borrower Info
        first_name: editData.first_name,
        last_name: editData.last_name,
        ssn: editData.ssn || null,
        dob: editData.dob,
        occupancy: editData.occupancy || null,
        residency_type: editData.residency_type || null,
        marital_status: editData.marital_status || null,
        monthly_pmt_goal: editData.monthly_payment_goal,
        cash_to_close_goal: editData.cash_to_close_goal,
        borrower_current_address: editData.borrower_current_address || null,
        military_veteran: editData.military_veteran,
        
        // Consolidated Financial Fields
        total_monthly_income: editData.total_monthly_income,
        assets: editData.assets,
        monthly_liabilities: editData.monthly_liabilities,
        
        // Monthly Payment Breakdown
        principal_interest: editData.principal_interest,
        property_taxes: editData.property_taxes,
        homeowners_insurance: editData.homeowners_insurance,
        mortgage_insurance: editData.mortgage_insurance,
        hoa_dues: editData.hoa_dues,
      });

      setIsEditing(false);
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
      
      toast({
        title: "Success",
        description: "Information updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating information:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseLoan = async () => {
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
        pipeline_stage_id: 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd', // Past Clients
        is_closed: true,
        closed_at: new Date().toISOString(),
        converted: 'Closed',
        loan_status: 'CTC' // Set loan status to Clear To Close
      });
      
      toast({
        title: "Loan Closed",
        description: "Lead has been moved to Past Clients",
      });
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
    } catch (error: any) {
      console.error('Error closing loan:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to close loan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loan & Property data
  const loanPropertyData = [
    { 
      icon: DollarSign, 
      label: "Appraised Value", 
      value: formatCurrency(client.loan?.appraisedValue || 0),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.appraisal_value || ""}
          onChange={(e) => setEditData({ ...editData, appraisal_value: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
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
          value={editData.fico_score || ""}
          onChange={(e) => setEditData({ ...editData, fico_score: parseInt(e.target.value) || null })}
          className="h-8"
          placeholder="Credit score"
        />
      ) : undefined
    }
  ];

  // Borrower Info data
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

  // Consolidated Financial Fields
  const consolidatedFinancialData = [
    {
      icon: DollarSign,
      label: "Total Monthly Income",
      value: isEditing ? null : formatCurrency((client as any).totalMonthlyIncome),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.total_monthly_income}
          onValueChange={(value) => setEditData(prev => ({ ...prev, total_monthly_income: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Wallet,
      label: "Total Assets",
      value: isEditing ? null : formatCurrency((client as any).assets),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.assets}
          onValueChange={(value) => setEditData(prev => ({ ...prev, assets: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: CreditCard,
      label: "Total Monthly Liabilities",
      value: isEditing ? null : formatCurrency((client as any).monthlyLiabilities),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.monthly_liabilities}
          onValueChange={(value) => setEditData(prev => ({ ...prev, monthly_liabilities: value || 0 }))}
          className="w-full"
        />
      ) : null
    }
  ];

  // Monthly Payment Breakdown
  const monthlyPaymentData = [
    {
      icon: Home,
      label: "Principal & Interest",
      value: isEditing ? null : formatCurrency((client as any).principalInterest),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.principal_interest}
          onValueChange={(value) => setEditData(prev => ({ ...prev, principal_interest: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Receipt,
      label: "Property Taxes",
      value: isEditing ? null : formatCurrency((client as any).propertyTaxes),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.property_taxes}
          onValueChange={(value) => setEditData(prev => ({ ...prev, property_taxes: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Shield,
      label: "Monthly HOI",
      value: isEditing ? null : formatCurrency((client as any).homeownersInsurance),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.homeowners_insurance}
          onValueChange={(value) => setEditData(prev => ({ ...prev, homeowners_insurance: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Shield,
      label: "Monthly MI",
      value: isEditing ? null : formatCurrency((client as any).mortgageInsurance),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.mortgage_insurance}
          onValueChange={(value) => setEditData(prev => ({ ...prev, mortgage_insurance: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Building2,
      label: "HOA Dues",
      value: isEditing ? null : formatCurrency((client as any).hoaDues),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.hoa_dues}
          onValueChange={(value) => setEditData(prev => ({ ...prev, hoa_dues: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
    {
      icon: Calculator,
      label: "PITI (Total Monthly Payment)",
      value: formatCurrency(isEditing ? calculatePITI() : ((client as any).piti || 0)),
      isCalculated: true
    }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Single Edit/Save button set at top */}
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save All"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit All
            </Button>
          )}
        </div>

        {/* Loan & Property Information Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            Loan & Property Information
          </h3>
          <FourColumnDetailLayout items={loanPropertyData} />
        </div>

        {/* Borrower Information Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            Borrower Information
          </h3>
          <FourColumnDetailLayout items={borrowerData} />
        </div>

        {/* Consolidated Financial Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Summary
            </h3>
          </div>
          <FourColumnDetailLayout items={consolidatedFinancialData} />
        </div>

        {/* Monthly Payment Breakdown Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Monthly Payment Breakdown
            </h3>
          </div>
          <FourColumnDetailLayout items={monthlyPaymentData} />
          
          {/* Mark as Closed Button */}
          <div className="flex justify-end mt-4">
            <Button 
              variant="default" 
              onClick={handleCloseLoan}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Closed
            </Button>
          </div>
        </div>

        {/* DTI Calculation */}
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">Debt-to-Income Ratio (DTI):</span>
              <span className="text-2xl font-bold text-primary">
                {(() => {
                  const totalIncome = isEditing ? (editData.total_monthly_income || 0) : ((client as any).totalMonthlyIncome || 0);
                  const totalLiabilities = isEditing ? (editData.monthly_liabilities || 0) : ((client as any).monthlyLiabilities || 0);
                  const piti = isEditing ? calculatePITI() : ((client as any).piti || 0);
                  const dti = totalIncome > 0 ? ((totalLiabilities + piti) / totalIncome * 100) : 0;
                  return `${dti.toFixed(2)}%`;
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
