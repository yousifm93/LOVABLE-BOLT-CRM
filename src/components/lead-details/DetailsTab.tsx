import React, { useState, useEffect } from "react";
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
  TrendingUp,
  PiggyBank
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
    estimated_fico: client.loan?.ficoScore || null,
    piti: client.loan?.monthlyPayment || null,
    
    // Borrower Info
    first_name: client.person?.firstName || "",
    last_name: client.person?.lastName || "",
    ssn: (client as any).ssn || "",
    dob: (client as any).dob || null,
    occupancy: (client as any).occupancy || "",
    residency_type: (client as any).residency_type || "",
    marital_status: (client as any).marital_status || "",
    number_of_dependents: (client as any).number_of_dependents || null,
    monthly_payment_goal: (client as any).monthly_payment_goal || null,
    cash_to_close_goal: (client as any).cash_to_close_goal || null,
    borrower_current_address: (client as any).borrower_current_address || "",
    time_at_current_address_years: (client as any).time_at_current_address_years || null,
    time_at_current_address_months: (client as any).time_at_current_address_months || null,
    military_veteran: (client as any).military_veteran || false,
    
    // Financial Info
    base_employment_income: (client as any).base_employment_income || null,
    overtime_income: (client as any).overtime_income || null,
    bonus_income: (client as any).bonus_income || null,
    self_employment_income: (client as any).self_employment_income || null,
    other_income: (client as any).other_income || null,
    checking_account: (client as any).checking_account || null,
    savings_account: (client as any).savings_account || null,
    investment_accounts: (client as any).investment_accounts || null,
    retirement_accounts: (client as any).retirement_accounts || null,
    gift_funds: (client as any).gift_funds || null,
    other_assets: (client as any).other_assets || null,
    credit_card_debt: (client as any).credit_card_debt || null,
    auto_loans: (client as any).auto_loans || null,
    student_loans: (client as any).student_loans || null,
    other_monthly_debts: (client as any).other_monthly_debts || null,
  });

  // Calculate totals for financial info
  const calculateTotalIncome = () => {
    const base = editData.base_employment_income || 0;
    const overtime = editData.overtime_income || 0;
    const bonus = editData.bonus_income || 0;
    const selfEmp = editData.self_employment_income || 0;
    const other = editData.other_income || 0;
    return base + overtime + bonus + selfEmp + other;
  };

  const calculateTotalAssets = () => {
    const checking = editData.checking_account || 0;
    const savings = editData.savings_account || 0;
    const investments = editData.investment_accounts || 0;
    const retirement = editData.retirement_accounts || 0;
    const gifts = editData.gift_funds || 0;
    const otherAssets = editData.other_assets || 0;
    return checking + savings + investments + retirement + gifts + otherAssets;
  };

  const calculateTotalDebts = () => {
    const creditCard = editData.credit_card_debt || 0;
    const auto = editData.auto_loans || 0;
    const student = editData.student_loans || 0;
    const other = editData.other_monthly_debts || 0;
    return creditCard + auto + student + other;
  };

  // Auto-calculate monthly payment when loan amount, interest rate, or term changes
  useEffect(() => {
    if (isEditing && client.loan?.loanAmount) {
      const calculatedPayment = calculateMonthlyPayment(
        client.loan.loanAmount,
        editData.interest_rate,
        editData.term
      );
      
      if (calculatedPayment !== null && calculatedPayment !== editData.piti) {
        setEditData(prev => ({ ...prev, piti: calculatedPayment }));
      }
    }
  }, [editData.interest_rate, editData.term, isEditing]);

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
      estimated_fico: client.loan?.ficoScore || null,
      piti: client.loan?.monthlyPayment || null,
      first_name: client.person?.firstName || "",
      last_name: client.person?.lastName || "",
      ssn: (client as any).ssn || "",
      dob: (client as any).dob || null,
      occupancy: (client as any).occupancy || "",
      residency_type: (client as any).residency_type || "",
      marital_status: (client as any).marital_status || "",
      number_of_dependents: (client as any).number_of_dependents || null,
      monthly_payment_goal: (client as any).monthly_payment_goal || null,
      cash_to_close_goal: (client as any).cash_to_close_goal || null,
      borrower_current_address: (client as any).borrower_current_address || "",
      time_at_current_address_years: (client as any).time_at_current_address_years || null,
      time_at_current_address_months: (client as any).time_at_current_address_months || null,
      military_veteran: (client as any).military_veteran || false,
      base_employment_income: (client as any).base_employment_income || null,
      overtime_income: (client as any).overtime_income || null,
      bonus_income: (client as any).bonus_income || null,
      self_employment_income: (client as any).self_employment_income || null,
      other_income: (client as any).other_income || null,
      checking_account: (client as any).checking_account || null,
      savings_account: (client as any).savings_account || null,
      investment_accounts: (client as any).investment_accounts || null,
      retirement_accounts: (client as any).retirement_accounts || null,
      gift_funds: (client as any).gift_funds || null,
      other_assets: (client as any).other_assets || null,
      credit_card_debt: (client as any).credit_card_debt || null,
      auto_loans: (client as any).auto_loans || null,
      student_loans: (client as any).student_loans || null,
      other_monthly_debts: (client as any).other_monthly_debts || null,
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
      const totalIncome = calculateTotalIncome();
      const totalAssets = calculateTotalAssets();
      const totalDebts = calculateTotalDebts();

      await databaseService.updateLead(leadId, {
        // Loan & Property
        appraisal_value: editData.appraisal_value?.toString() || null,
        down_pmt: editData.down_pmt?.toString() || null,
        interest_rate: editData.interest_rate,
        term: editData.term,
        escrows: editData.escrows || null,
        estimated_fico: editData.estimated_fico,
        piti: editData.piti,
        
        // Borrower Info
        first_name: editData.first_name,
        last_name: editData.last_name,
        ssn: editData.ssn || null,
        dob: editData.dob,
        occupancy: editData.occupancy || null,
        residency_type: editData.residency_type || null,
        marital_status: editData.marital_status || null,
        number_of_dependents: editData.number_of_dependents,
        monthly_pmt_goal: editData.monthly_payment_goal,
        cash_to_close_goal: editData.cash_to_close_goal,
        borrower_current_address: editData.borrower_current_address || null,
        time_at_current_address_years: editData.time_at_current_address_years,
        time_at_current_address_months: editData.time_at_current_address_months,
        military_veteran: editData.military_veteran,
        
        // Financial Info
        base_employment_income: editData.base_employment_income,
        overtime_income: editData.overtime_income,
        bonus_income: editData.bonus_income,
        self_employment_income: editData.self_employment_income,
        other_income: editData.other_income,
        total_monthly_income: totalIncome,
        checking_account: editData.checking_account,
        savings_account: editData.savings_account,
        investment_accounts: editData.investment_accounts,
        retirement_accounts: editData.retirement_accounts,
        gift_funds: editData.gift_funds,
        other_assets: editData.other_assets,
        assets: totalAssets,
        credit_card_debt: editData.credit_card_debt,
        auto_loans: editData.auto_loans,
        student_loans: editData.student_loans,
        other_monthly_debts: editData.other_monthly_debts,
        monthly_liabilities: totalDebts,
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
          title="Automatically calculated"
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
      icon: Users, 
      label: "Number of Dependents", 
      value: (client as any).number_of_dependents?.toString() || "—",
      editComponent: isEditing ? (
        <Input
          type="number"
          value={editData.number_of_dependents || ""}
          onChange={(e) => setEditData({ ...editData, number_of_dependents: parseInt(e.target.value) || null })}
          className="h-8"
          placeholder="0"
          min="0"
        />
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
      label: "Time at Current Address", 
      value: formatTimeAtAddress(
        (client as any).time_at_current_address_years, 
        (client as any).time_at_current_address_months
      ),
      editComponent: isEditing ? (
        <div className="flex gap-2">
          <Input
            type="number"
            value={editData.time_at_current_address_years || ""}
            onChange={(e) => setEditData({ ...editData, time_at_current_address_years: parseInt(e.target.value) || null })}
            className="h-8 flex-1"
            placeholder="Years"
            min="0"
          />
          <Input
            type="number"
            value={editData.time_at_current_address_months || ""}
            onChange={(e) => setEditData({ ...editData, time_at_current_address_months: parseInt(e.target.value) || null })}
            className="h-8 flex-1"
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

  // Financial Info data
  const incomeData = [
    { 
      icon: DollarSign, 
      label: "Gross Monthly Income", 
      value: formatCurrency(calculateTotalIncome()),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={formatCurrency(calculateTotalIncome())}
          disabled
          className="h-8 opacity-60 bg-muted"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Base Employment Income", 
      value: formatCurrency((client as any).base_employment_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.base_employment_income}
          onValueChange={(value) => setEditData({ ...editData, base_employment_income: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Overtime Income", 
      value: formatCurrency((client as any).overtime_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.overtime_income}
          onValueChange={(value) => setEditData({ ...editData, overtime_income: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Bonus Income", 
      value: formatCurrency((client as any).bonus_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.bonus_income}
          onValueChange={(value) => setEditData({ ...editData, bonus_income: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Self Employment Income", 
      value: formatCurrency((client as any).self_employment_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.self_employment_income}
          onValueChange={(value) => setEditData({ ...editData, self_employment_income: value })}
        />
      ) : undefined
    },
    { 
      icon: TrendingUp, 
      label: "Other Income", 
      value: formatCurrency((client as any).other_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_income}
          onValueChange={(value) => setEditData({ ...editData, other_income: value })}
        />
      ) : undefined
    }
  ];

  const assetData = [
    { 
      icon: PiggyBank, 
      label: "Checking Account", 
      value: formatCurrency((client as any).checking_account),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.checking_account}
          onValueChange={(value) => setEditData({ ...editData, checking_account: value })}
        />
      ) : undefined
    },
    { 
      icon: PiggyBank, 
      label: "Savings Account", 
      value: formatCurrency((client as any).savings_account),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.savings_account}
          onValueChange={(value) => setEditData({ ...editData, savings_account: value })}
        />
      ) : undefined
    },
    { 
      icon: TrendingUp, 
      label: "Investment Accounts", 
      value: formatCurrency((client as any).investment_accounts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.investment_accounts}
          onValueChange={(value) => setEditData({ ...editData, investment_accounts: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Retirement Accounts (401k/IRA)", 
      value: formatCurrency((client as any).retirement_accounts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.retirement_accounts}
          onValueChange={(value) => setEditData({ ...editData, retirement_accounts: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Gift Funds", 
      value: formatCurrency((client as any).gift_funds),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.gift_funds}
          onValueChange={(value) => setEditData({ ...editData, gift_funds: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Other Assets", 
      value: formatCurrency((client as any).other_assets),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_assets}
          onValueChange={(value) => setEditData({ ...editData, other_assets: value })}
        />
      ) : undefined
    }
  ];

  const debtData = [
    { 
      icon: CreditCard, 
      label: "Credit Card Debt", 
      value: formatCurrency((client as any).credit_card_debt),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.credit_card_debt}
          onValueChange={(value) => setEditData({ ...editData, credit_card_debt: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Auto Loans", 
      value: formatCurrency((client as any).auto_loans),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.auto_loans}
          onValueChange={(value) => setEditData({ ...editData, auto_loans: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Student Loans", 
      value: formatCurrency((client as any).student_loans),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.student_loans}
          onValueChange={(value) => setEditData({ ...editData, student_loans: value })}
        />
      ) : undefined
    },
    { 
      icon: CreditCard, 
      label: "Other Monthly Debts", 
      value: formatCurrency((client as any).other_monthly_debts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_monthly_debts}
          onValueChange={(value) => setEditData({ ...editData, other_monthly_debts: value })}
        />
      ) : undefined
    }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
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
          <TwoColumnDetailLayout items={loanPropertyData} />
        </div>

        {/* Borrower Information Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            Borrower Information
          </h3>
          <TwoColumnDetailLayout items={borrowerData} />
        </div>

        {/* Financial Information Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Monthly Income:</span>
            <span className="text-emerald-600 font-bold">
              {formatCurrency(calculateTotalIncome())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={incomeData} />
        </div>

        {/* Assets Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <PiggyBank className="h-5 w-5 text-primary" />
            <span>Total Assets:</span>
            <span className="text-purple-600 font-bold">
              {formatCurrency(calculateTotalAssets())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={assetData} />
        </div>

        {/* Debts Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Monthly Liability:</span>
            <span className="text-orange-600 font-bold">
              {formatCurrency(calculateTotalDebts())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={debtData} />
          
          {/* Show DTI if we have income and debts */}
          {calculateTotalIncome() > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Debt-to-Income Ratio (DTI)</span>
                <span className="text-sm font-bold">
                  {formatPercentage((calculateTotalDebts() / calculateTotalIncome()) * 100)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}