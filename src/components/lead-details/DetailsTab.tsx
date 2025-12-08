import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FourColumnDetailLayout } from "./FourColumnDetailLayout";
import { RealEstateOwnedSection } from "./RealEstateOwnedSection";
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
import { FileUpload } from "@/components/ui/file-upload";
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
  Wallet,
  ArrowRightLeft,
  FileText,
  Phone,
  Mail,
  Lock
} from "lucide-react";
import { 
  formatCurrency, 
  formatPercentage, 
  formatYesNo, 
  formatAmortizationTerm, 
  calculateMonthlyPayment,
  formatDate,
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
    // Borrower Info
    first_name: client.person?.firstName || "",
    last_name: client.person?.lastName || "",
    phone: client.person?.phone || client.person?.phoneMobile || "",
    email: client.person?.email || "",
    dob: (client as any).dob || null,
    marital_status: (client as any).marital_status || "",
    borrower_current_address: (client as any).borrower_current_address || "",
    residency_type: (client as any).residency_type || "",
    demographic_gender: (client as any).demographic_gender || "",
    military_veteran: (client as any).military_veteran || false,
    
    // Loan & Property - Transaction Details
    loan_type: client.loan?.loanType || "",
    sales_price: client.loan?.salesPrice || null,
    loan_amount: client.loan?.loanAmount || null,
    loan_program: client.loan?.loanProgram || "",
    down_pmt: client.loan?.downPayment || null,
    interest_rate: client.loan?.interestRate ?? 7.0,
    term: client.loan?.term || 360,
    escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
    cash_to_close: (client as any).cash_to_close || null,
    closing_costs: (client as any).closing_costs || null,
    
    // Loan & Property - Property
    occupancy: (client as any).occupancy || "",
    property_type: client.property?.propertyType || "",
    subject_address_1: (client as any).subject_address_1 || "",
    subject_address_2: (client as any).subject_address_2 || "",
    subject_city: (client as any).subject_city || "",
    subject_state: (client as any).subject_state || "",
    subject_zip: (client as any).subject_zip || "",
    
    // Financial Summary
    monthly_payment_goal: (client as any).monthly_payment_goal || null,
    cash_to_close_goal: (client as any).cash_to_close_goal || null,
    total_monthly_income: (client as any).totalMonthlyIncome || null,
    assets: (client as any).assets || null,
    monthly_liabilities: (client as any).monthlyLiabilities || null,
    fico_score: client.loan?.ficoScore || null,
    principal_interest: (client as any).principalInterest || null,
    property_taxes: (client as any).propertyTaxes || null,
    homeowners_insurance: (client as any).homeownersInsurance || null,
    mortgage_insurance: (client as any).mortgageInsurance || null,
    hoa_dues: (client as any).hoaDues || null,
    piti: client.piti || null,
    // Rate Lock fields
    lock_expiration_date: (client as any).lock_expiration_date || null,
    dscr_ratio: (client as any).dscr_ratio || null,
    prepayment_penalty: (client as any).prepayment_penalty || "",
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
    // Reset all edit data
    setEditData({
      first_name: client.person?.firstName || "",
      last_name: client.person?.lastName || "",
      phone: client.person?.phone || client.person?.phoneMobile || "",
      email: client.person?.email || "",
      dob: (client as any).dob || null,
      marital_status: (client as any).marital_status || "",
      borrower_current_address: (client as any).borrower_current_address || "",
      residency_type: (client as any).residency_type || "",
      demographic_gender: (client as any).demographic_gender || "",
      military_veteran: (client as any).military_veteran || false,
      loan_type: client.loan?.loanType || "",
      sales_price: client.loan?.salesPrice || null,
      loan_amount: client.loan?.loanAmount || null,
      loan_program: client.loan?.loanProgram || "",
      down_pmt: client.loan?.downPayment || null,
      interest_rate: client.loan?.interestRate ?? 7.0,
      term: client.loan?.term || 360,
      escrows: client.loan?.escrowWaiver ? "Waived" : "Escrowed",
      cash_to_close: (client as any).cash_to_close || null,
      closing_costs: (client as any).closing_costs || null,
      occupancy: (client as any).occupancy || "",
      property_type: client.property?.propertyType || "",
      subject_address_1: (client as any).subject_address_1 || "",
      subject_address_2: (client as any).subject_address_2 || "",
      subject_city: (client as any).subject_city || "",
      subject_state: (client as any).subject_state || "",
      subject_zip: (client as any).subject_zip || "",
      monthly_payment_goal: (client as any).monthly_payment_goal || null,
      cash_to_close_goal: (client as any).cash_to_close_goal || null,
      total_monthly_income: (client as any).totalMonthlyIncome || null,
      assets: (client as any).assets || null,
      monthly_liabilities: (client as any).monthlyLiabilities || null,
      fico_score: client.loan?.ficoScore || null,
      principal_interest: (client as any).principalInterest || null,
      property_taxes: (client as any).propertyTaxes || null,
      homeowners_insurance: (client as any).homeownersInsurance || null,
      mortgage_insurance: (client as any).mortgageInsurance || null,
      hoa_dues: (client as any).hoaDues || null,
      piti: client.piti || null,
      // Rate Lock fields
      lock_expiration_date: (client as any).lock_expiration_date || null,
      dscr_ratio: (client as any).dscr_ratio || null,
      prepayment_penalty: (client as any).prepayment_penalty || "",
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
        // Borrower Info
        first_name: editData.first_name,
        last_name: editData.last_name,
        phone: editData.phone,
        email: editData.email,
        dob: editData.dob,
        marital_status: editData.marital_status || null,
        borrower_current_address: editData.borrower_current_address || null,
        residency_type: editData.residency_type || null,
        demographic_gender: editData.demographic_gender || null,
        military_veteran: editData.military_veteran,
        
        // Loan & Property - Transaction Details
        loan_type: editData.loan_type,
        sales_price: editData.sales_price,
        loan_amount: editData.loan_amount,
        program: editData.loan_program || null,
        down_pmt: editData.down_pmt?.toString() || null,
        interest_rate: editData.interest_rate,
        term: editData.term,
        escrows: editData.escrows || null,
        cash_to_close: editData.cash_to_close,
        closing_costs: editData.closing_costs,
        
        // Loan & Property - Property
        occupancy: editData.occupancy || null,
        property_type: editData.property_type || null,
        subject_address_1: editData.subject_address_1 || null,
        subject_address_2: editData.subject_address_2 || null,
        subject_city: editData.subject_city || null,
        subject_state: editData.subject_state || null,
        subject_zip: editData.subject_zip || null,
        
        // Financial Summary
        monthly_pmt_goal: editData.monthly_payment_goal,
        cash_to_close_goal: editData.cash_to_close_goal,
        total_monthly_income: editData.total_monthly_income,
        assets: editData.assets,
        monthly_liabilities: editData.monthly_liabilities,
        fico_score: editData.fico_score,
        
        // Monthly Payment Breakdown
        principal_interest: editData.principal_interest,
        property_taxes: editData.property_taxes,
        homeowners_insurance: editData.homeowners_insurance,
        mortgage_insurance: editData.mortgage_insurance,
        hoa_dues: editData.hoa_dues,
        piti: editData.piti,
        
        // Rate Lock fields
        lock_expiration_date: editData.lock_expiration_date,
        dscr_ratio: editData.dscr_ratio,
        prepayment_penalty: editData.prepayment_penalty || null,
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
        loan_status: 'CTC',
        pipeline_section: 'Closed'
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

  // ============================================
  // BORROWER INFORMATION DATA (Horizontal flow: 3 columns)
  // ============================================
  const borrowerData = [
    // Row 1
    { 
      icon: User, 
      label: "First Name", 
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
      label: "Last Name", 
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
    // Row 2
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
      icon: User, 
      label: "Gender", 
      value: (client as any).demographic_gender || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.demographic_gender}
          onValueChange={(value) => setEditData({ ...editData, demographic_gender: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
            <SelectItem value="Prefer not to disclose">Prefer not to disclose</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    // Row 3
    { 
      icon: Phone, 
      label: "Borrower Phone", 
      value: client.person?.phone || client.person?.phoneMobile || "—",
      editComponent: isEditing ? (
        <Input
          type="tel"
          value={editData.phone}
          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
          className="h-8"
          placeholder="Phone number"
        />
      ) : undefined
    },
    { 
      icon: Mail, 
      label: "Borrower Email", 
      value: client.person?.email || "—",
      editComponent: isEditing ? (
        <Input
          type="email"
          value={editData.email}
          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
          className="h-8"
          placeholder="Email address"
        />
      ) : undefined
    },
    { 
      icon: Home, 
      label: "Current Property Address", 
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
  ];

  // ============================================
  // LOAN & PROPERTY - TRANSACTION DETAILS
  // ============================================
  const transactionDetailsData = [
    { 
      icon: ArrowRightLeft, 
      label: "Transaction Type", 
      value: client.loan?.loanType || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.loan_type}
          onValueChange={(value) => setEditData({ ...editData, loan_type: value })}
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
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Purchase Price",
      value: formatCurrency(client.loan?.salesPrice || 0),
      editComponent: isEditing ? (
        <Input
          type="number"
          step="1000"
          min="0"
          value={editData.sales_price || ""}
          onChange={(e) => setEditData({ ...editData, sales_price: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Loan Amount",
      value: formatCurrency(client.loan?.loanAmount || 0),
      editComponent: isEditing ? (
        <Input
          type="number"
          step="1000"
          min="0"
          value={editData.loan_amount || ""}
          onChange={(e) => setEditData({ ...editData, loan_amount: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
    },
    { 
      icon: FileText, 
      label: "Loan Program",
      value: client.loan?.loanProgram || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.loan_program}
          onChange={(e) => setEditData({ ...editData, loan_program: e.target.value })}
          className="h-8"
          placeholder="e.g. Conventional, FHA, VA"
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
      icon: DollarSign, 
      label: "Cash to Close", 
      value: formatCurrency((client as any).cash_to_close || 0),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.cash_to_close || ""}
          onChange={(e) => setEditData({ ...editData, cash_to_close: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Closing Costs", 
      value: formatCurrency((client as any).closing_costs || 0),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={editData.closing_costs || ""}
          onChange={(e) => setEditData({ ...editData, closing_costs: e.target.value || null })}
          className="h-8"
          placeholder="0"
        />
      ) : undefined
    },
  ];

  // ============================================
  // LOAN & PROPERTY - PROPERTY (Row 1: Type + Occupancy, Row 2: Address fields)
  // ============================================
  const propertyData = [
    // Row 1
    { 
      icon: Building, 
      label: "Property Type", 
      value: client.property?.propertyType || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.property_type}
          onValueChange={(value) => setEditData({ ...editData, property_type: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Single Family">Single Family</SelectItem>
            <SelectItem value="Townhouse">Townhouse</SelectItem>
            <SelectItem value="Condo">Condo</SelectItem>
            <SelectItem value="Multi-Family">Multi-Family</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: Home, 
      label: "Occupancy", 
      value: (() => {
        const occ = (client as any).occupancy;
        if (occ === "Primary Residence") return "Primary";
        if (occ === "Second Home") return "Second";
        if (occ === "Investment Property") return "Investment";
        return occ || "—";
      })(),
      editComponent: isEditing ? (
        <Select
          value={editData.occupancy}
          onValueChange={(value) => setEditData({ ...editData, occupancy: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select occupancy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Primary Residence">Primary</SelectItem>
            <SelectItem value="Second Home">Second</SelectItem>
            <SelectItem value="Investment Property">Investment</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
  ];

  // ============================================
  // FINANCIAL SUMMARY DATA
  // ============================================
  const financialSummaryData = [
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
    },
    { 
      icon: CreditCard, 
      label: "Credit Score", 
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
    },
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

  // Co-Borrower Information data
  const coBorrowerData = [
    {
      icon: Users,
      label: "First Name",
      value: (client as any).co_borrower_first_name || "—"
    },
    {
      icon: Users,
      label: "Last Name",
      value: (client as any).co_borrower_last_name || "—"
    },
    {
      icon: Users,
      label: "Relationship",
      value: (client as any).co_borrower_relationship || "—"
    },
    {
      icon: Users,
      label: "Phone",
      value: (client as any).co_borrower_phone || "—"
    },
    {
      icon: Users,
      label: "Email",
      value: (client as any).co_borrower_email || "—"
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pt-2">
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

        {/* 1. BORROWER INFORMATION */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-primary" />
            Borrower Information
          </h3>
          <FourColumnDetailLayout items={borrowerData} columns={3} />
        </div>

        {/* 2. LOAN & PROPERTY INFORMATION */}
        <div className="pt-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            Loan & Property Information
          </h3>
          
          {/* Transaction Details Subheading */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Transaction Details</h4>
            <FourColumnDetailLayout items={transactionDetailsData} />
          </div>
          
          {/* Property Subheading */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Property</h4>
            <FourColumnDetailLayout items={propertyData} />
          </div>

          {/* Rate Lock Information Subheading */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Rate Lock Information</h4>
            <FourColumnDetailLayout items={[
              { 
                icon: Percent, 
                label: "Interest Rate", 
                value: client.loan?.interestRate ? `${client.loan.interestRate}%` : "—",
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
                label: "Lock Expiration", 
                value: formatDate((client as any).lock_expiration_date),
                editComponent: isEditing ? (
                  <Input
                    type="date"
                    value={editData.lock_expiration_date || ""}
                    onChange={(e) => setEditData({ ...editData, lock_expiration_date: e.target.value || null })}
                    className="h-8"
                  />
                ) : undefined
              },
              { 
                icon: Calculator, 
                label: "DSCR Ratio", 
                value: (client as any).dscr_ratio ? String((client as any).dscr_ratio) : "—",
                editComponent: isEditing ? (
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max="2"
                    value={editData.dscr_ratio || ""}
                    onChange={(e) => setEditData({ ...editData, dscr_ratio: parseFloat(e.target.value) || null })}
                    className="h-8"
                    placeholder="1.25"
                  />
                ) : undefined
              },
              { 
                icon: Lock, 
                label: "Prepayment Penalty", 
                value: (client as any).prepayment_penalty ? `${(client as any).prepayment_penalty} Year${(client as any).prepayment_penalty !== "1" ? "s" : ""}` : "—",
                editComponent: isEditing ? (
                  <Select
                    value={editData.prepayment_penalty}
                    onValueChange={(value) => setEditData({ ...editData, prepayment_penalty: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 Years</SelectItem>
                      <SelectItem value="1">1 Year</SelectItem>
                      <SelectItem value="2">2 Years</SelectItem>
                      <SelectItem value="3">3 Years</SelectItem>
                      <SelectItem value="4">4 Years</SelectItem>
                      <SelectItem value="5">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
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
                value: (client as any).escrows || formatYesNo(client.loan?.escrowWaiver || false),
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
            ]} />
          </div>
        </div>

        {/* 3. FINANCIAL SUMMARY */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Financial Summary
          </h3>
          <FourColumnDetailLayout items={financialSummaryData} />
          
          {/* Real Estate Owned Section */}
          {leadId && <RealEstateOwnedSection leadId={leadId} />}
          
          {/* Monthly Payment Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Monthly Payment Breakdown</h4>
            <FourColumnDetailLayout items={monthlyPaymentData} />
          </div>
        </div>

        {/* Co-Borrower Information Section */}
        {((client as any).co_borrower_first_name || (client as any).co_borrower_last_name) && (
          <div className="pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              Co-Borrower Information
            </h3>
            <FourColumnDetailLayout items={coBorrowerData} />
          </div>
        )}

        {/* Paper Application Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            Paper Application
          </h3>
          <div className="p-4 bg-muted/30 rounded-lg">
            <Label>Application PDF</Label>
            <FileUpload 
              value={(client as any).paper_application_url}
              onValueChange={async (url) => {
                if (!leadId) return;
                try {
                  await databaseService.updateLead(leadId, { paper_application_url: url });
                  if (onLeadUpdated) await onLeadUpdated();
                  toast({
                    title: "Success",
                    description: "Paper application updated successfully",
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update paper application",
                    variant: "destructive",
                  });
                }
              }}
              bucket="lead-attachments"
              accept=".pdf"
              placeholder="Upload application PDF"
            />
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
                  const piti = isEditing ? calculatePITI() : ((client as any).piti || 0);
                  const dti = totalIncome > 0 ? (piti / totalIncome * 100) : 0;
                  return `${dti.toFixed(2)}%`;
                })()}
              </span>
            </div>
          </div>
          
          {/* Mark as Closed Button */}
          <div className="flex justify-end">
            <Button 
              variant="default" 
              onClick={handleCloseLoan}
              disabled={isSaving}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Mark as Closed
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
