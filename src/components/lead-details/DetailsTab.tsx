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
  Lock,
  Trash2,
  MapPin,
  Landmark,
  ClipboardCheck,
  Hash,
  Target
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditContact } from "@/components/ui/inline-edit-contact";
import { supabase } from "@/integrations/supabase/client";
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
import { calculatePrincipalAndInterest, calculatePITIComponents } from "@/hooks/usePITICalculation";

interface DetailsTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
  onClose?: () => void;
}

export function DetailsTab({ client, leadId, onLeadUpdated, onClose }: DetailsTabProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
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
    cash_to_close: (client as any).cash_to_close || (client as any).cashToClose || null,
    closing_costs: (client as any).closing_costs || (client as any).closingCosts || null,
    close_date: (client as any).close_date || null,
    
    // Loan & Property - Property
    occupancy: (client as any).occupancy || "",
    property_type: client.property?.propertyType || "",
    subject_address_1: (client as any).subject_address_1 || "",
    subject_address_2: (client as any).subject_address_2 || "",
    subject_city: (client as any).subject_city || "",
    subject_state: (client as any).subject_state || "",
    subject_zip: (client as any).subject_zip || "",
    subject_property_rental_income: (client as any).subject_property_rental_income || null,
    
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
    discount_points_percentage: (client as any).discount_points_percentage || null,
    adjustments_credits: (client as any).adjustments_credits || null,
    apr: (client as any).apr || null,
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

  // Helper function for closing costs calculation from Loan Estimate fee fields
  const calculateClosingCosts = () => {
    const loanAmount = Number(editData.loan_amount) || 0;
    const discountPointsPercentage = Number(editData.discount_points_percentage) || 0;
    const discountPointsDollar = (discountPointsPercentage / 100) * loanAmount;
    
    // Sum all fee fields from Loan Estimate
    const fees = 
      ((client as any).underwriting_fee || 500) + // Default underwriting fee
      ((client as any).appraisal_fee || 500) + // Default appraisal fee
      ((client as any).credit_report_fee || 65) + // Default credit report fee
      ((client as any).processing_fee || 995) + // Default processing fee
      ((client as any).lenders_title_insurance || 1000) + // Default lender's title insurance
      ((client as any).title_closing_fee || 450) + // Default title closing fee
      ((client as any).intangible_tax || 0) +
      ((client as any).transfer_tax || 0) +
      ((client as any).recording_fees || 300) + // Default recording fees
      discountPointsDollar;
    
    return Math.round(fees);
  };

  // Load agents, lenders, and contacts for the Contacts section
  useEffect(() => {
    const loadData = async () => {
      try {
        const [agentsRes, lendersRes, contactsRes] = await Promise.all([
          supabase.from('buyer_agents').select('*').order('first_name'),
          supabase.from('lenders').select('*').order('lender_name'),
          supabase.from('contacts').select('*').order('first_name')
        ]);
        if (agentsRes.data) setAgents(agentsRes.data);
        if (lendersRes.data) setLenders(lendersRes.data);
        if (contactsRes.data) setContacts(contactsRes.data);
      } catch (error) {
        console.error('Error loading contacts data:', error);
      }
    };
    loadData();
  }, []);

  // Sync address fields when client prop changes (e.g., edited in DatesTab)
  useEffect(() => {
    setEditData(prev => ({
      ...prev,
      subject_address_1: (client as any).subject_address_1 || "",
      subject_address_2: (client as any).subject_address_2 || "",
      subject_city: (client as any).subject_city || "",
      subject_state: (client as any).subject_state || "",
      subject_zip: (client as any).subject_zip || "",
      occupancy: (client as any).occupancy || "",
    }));
  }, [
    (client as any).subject_address_1,
    (client as any).subject_address_2,
    (client as any).subject_city,
    (client as any).subject_state,
    (client as any).subject_zip,
    (client as any).occupancy
  ]);
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

  // Auto-calculate DSCR ratio when subject property rental income or PITI changes
  useEffect(() => {
    const rentalIncome = editData.subject_property_rental_income || 0;
    const piti = editData.piti || 0;
    
    if (rentalIncome > 0 && piti > 0) {
      const calculatedDSCR = Math.round((rentalIncome / piti) * 100) / 100;
      setEditData(prev => ({ ...prev, dscr_ratio: calculatedDSCR }));
    }
  }, [editData.subject_property_rental_income, editData.piti]);

  // Auto-calculate closing costs when loan amount or discount points change
  useEffect(() => {
    const loanAmount = Number(editData.loan_amount) || 0;
    if (loanAmount > 0) {
      const calculatedClosingCosts = calculateClosingCosts();
      // Only update if no closing costs are set or they're 0
      if (!editData.closing_costs || editData.closing_costs === 0) {
        setEditData(prev => ({ ...prev, closing_costs: calculatedClosingCosts }));
      }
    }
  }, [editData.loan_amount, editData.discount_points_percentage]);

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
      cash_to_close: (client as any).cash_to_close || (client as any).cashToClose || null,
      closing_costs: (client as any).closing_costs || (client as any).closingCosts || null,
      occupancy: (client as any).occupancy || "",
      property_type: client.property?.propertyType || "",
      subject_address_1: (client as any).subject_address_1 || "",
      subject_address_2: (client as any).subject_address_2 || "",
      subject_city: (client as any).subject_city || "",
      subject_state: (client as any).subject_city || "",
      subject_zip: (client as any).subject_zip || "",
      subject_property_rental_income: (client as any).subject_property_rental_income || null,
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
      lock_expiration_date: (client as any).lock_expiration_date || null,
      dscr_ratio: (client as any).dscr_ratio || null,
      prepayment_penalty: (client as any).prepayment_penalty || "",
      discount_points_percentage: (client as any).discount_points_percentage || null,
      adjustments_credits: (client as any).adjustments_credits || null,
      apr: (client as any).apr || null,
      close_date: (client as any).close_date || null,
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
      // Check if loan_amount, interest_rate, or term changed - recalculate P&I
      const loanAmount = Number(editData.loan_amount) || 0;
      const salesPrice = Number(editData.sales_price) || 0;
      const interestRate = editData.interest_rate ?? 7.0;
      const term = editData.term || 360;
      const propertyType = editData.property_type || '';
      
      let updateData: Record<string, any> = {
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
        subject_property_rental_income: editData.subject_property_rental_income || null,
        
        // Financial Summary
        monthly_pmt_goal: editData.monthly_payment_goal,
        cash_to_close_goal: editData.cash_to_close_goal,
        total_monthly_income: editData.total_monthly_income,
        assets: editData.assets,
        monthly_liabilities: editData.monthly_liabilities,
        fico_score: editData.fico_score,
        
        // Rate Lock fields
        lock_expiration_date: editData.lock_expiration_date,
        dscr_ratio: editData.dscr_ratio,
        prepayment_penalty: editData.prepayment_penalty || null,
        discount_points_percentage: editData.discount_points_percentage,
        // Calculate and save dollar amount from percentage
        discount_points: editData.discount_points_percentage && loanAmount 
          ? (editData.discount_points_percentage / 100) * loanAmount 
          : null,
        adjustments_credits: editData.adjustments_credits,
        apr: editData.apr,
      };
      
      // Recalculate P&I if loan amount is present
      if (loanAmount > 0) {
        const pitiComponents = calculatePITIComponents({
          loanAmount,
          salesPrice,
          interestRate,
          term,
          propertyType
        });
        
        // Only update PITI components if they weren't manually set or are currently 0
        updateData.principal_interest = pitiComponents.principalInterest;
        updateData.property_taxes = editData.property_taxes ?? pitiComponents.propertyTaxes;
        updateData.homeowners_insurance = editData.homeowners_insurance ?? pitiComponents.homeownersInsurance;
        updateData.mortgage_insurance = editData.mortgage_insurance ?? pitiComponents.mortgageInsurance;
        updateData.hoa_dues = editData.hoa_dues ?? pitiComponents.hoaDues;
        
        // Recalculate total PITI
        updateData.piti = 
          updateData.principal_interest + 
          (updateData.property_taxes || 0) + 
          (updateData.homeowners_insurance || 0) + 
          (updateData.mortgage_insurance || 0) + 
          (updateData.hoa_dues || 0);
        
        console.log('[DetailsTab] Recalculated PITI:', {
          loanAmount, interestRate, term,
          principalInterest: updateData.principal_interest,
          totalPiti: updateData.piti
        });
      } else {
        // Use manual values if provided
        updateData.principal_interest = editData.principal_interest;
        updateData.property_taxes = editData.property_taxes;
        updateData.homeowners_insurance = editData.homeowners_insurance;
        updateData.mortgage_insurance = editData.mortgage_insurance;
        updateData.hoa_dues = editData.hoa_dues;
        updateData.piti = editData.piti;
      }

      await databaseService.updateLead(leadId, updateData);

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
        loan_status: 'Closed',
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

  const handleDeleteLead = async () => {
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
      // Delete the lead - the database will throw an error if there are associated tasks due to FK constraint
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      if (deleteError) {
        // Check if it's a foreign key violation (associated tasks exist)
        if (deleteError.code === '23503' || deleteError.message?.includes('foreign key') || deleteError.message?.includes('violates')) {
          toast({
            title: "Cannot Delete Lead",
            description: "There are tasks associated with this lead. Please complete or delete the associated tasks first, then try again.",
            variant: "destructive",
          });
          setIsDeleting(false);
          return;
        }
        throw deleteError;
      }
      
      toast({
        title: "Lead Deleted",
        description: "The lead has been successfully deleted",
      });
      
      // Close the drawer if callback provided
      if (onClose) {
        onClose();
      }
      
      if (onLeadUpdated) {
        await onLeadUpdated();
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================
  // BORROWER INFORMATION DATA (Horizontal flow: 3 columns)
  // Reordered: Row 1: First/Last/DOB, Row 2: Phone/Email/Address, Row 3: Marital/Residency/Gender
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
    // Row 2: Phone, Email, Current Address (moved up)
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
      value: client.person?.email ? (
        <div 
          className="group relative cursor-pointer"
          onClick={() => {
            if (client.person?.email) {
              navigator.clipboard.writeText(client.person.email);
              toast({ title: "Email copied", description: client.person.email });
            }
          }}
        >
          <span className="text-sm font-medium group-hover:hidden truncate max-w-[150px] block">
            Email
          </span>
          <span className="text-sm font-medium hidden group-hover:block text-primary underline truncate max-w-[200px]">
            {client.person.email}
          </span>
        </div>
      ) : "—",
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
      label: "Borrower's Current Address", 
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
    // Row 3: Marital, Residency, Gender (moved down)
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
  ];

  // ============================================
  // LOAN & PROPERTY - TRANSACTION DETAILS (4x2 Grid)
  // Row 1: Transaction Type, Purchase Price, LTV, Closing Costs
  // Row 2: Loan Program, Loan Amount, Down Payment, Cash to Close
  // ============================================
  const transactionDetailsData = [
    // Row 1
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
      icon: Calendar, 
      label: "Closing Date", 
      value: formatDate((client as any).close_date),
      editComponent: isEditing ? (
        <Input
          type="date"
          value={(client as any).close_date?.split('T')[0] || ""}
          onChange={(e) => setEditData({ ...editData, close_date: e.target.value || null })}
          className="h-8"
        />
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
      icon: Percent, 
      label: "LTV", 
      value: client.loan?.ltv ? formatPercentage(client.loan.ltv) : "—"
    },
    { 
      icon: DollarSign, 
      label: "Closing Costs", 
      value: formatCurrency((client as any).closingCosts || (client as any).closing_costs || 0),
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
    // Row 2
    { 
      icon: FileText, 
      label: "Loan Program",
      value: client.loan?.loanProgram || "—",
      editComponent: isEditing ? (
        <Select
          value={editData.loan_program || ""}
          onValueChange={(value) => setEditData({ ...editData, loan_program: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Conventional">Conventional</SelectItem>
            <SelectItem value="FHA">FHA</SelectItem>
            <SelectItem value="VA">VA</SelectItem>
            <SelectItem value="DSCR">DSCR</SelectItem>
            <SelectItem value="Jumbo">Jumbo</SelectItem>
            <SelectItem value="USDA">USDA</SelectItem>
            <SelectItem value="Bank Statement">Bank Statement</SelectItem>
          </SelectContent>
        </Select>
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
      icon: DollarSign, 
      label: "Cash to Close", 
      value: formatCurrency((client as any).cashToClose || (client as any).cash_to_close || 0),
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
        if (occ === "Primary Residence" || occ === "Primary Home") return "Primary";
        if (occ === "Investment Property") return "Investment";
        return occ || "—";
      })(),
      editComponent: isEditing ? (
        <Select
          value={(() => {
            const occ = editData.occupancy;
            if (occ === "Primary Residence" || occ === "Primary Home") return "Primary";
            if (occ === "Investment Property") return "Investment";
            return occ;
          })()}
          onValueChange={(value) => setEditData({ ...editData, occupancy: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select occupancy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Primary">Primary</SelectItem>
            <SelectItem value="Second Home">Second Home</SelectItem>
            <SelectItem value="Investment">Investment</SelectItem>
          </SelectContent>
        </Select>
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Subject Property Rental Income", 
      value: formatCurrency((client as any).subject_property_rental_income || 0),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.subject_property_rental_income}
          onValueChange={(value) => setEditData(prev => ({ ...prev, subject_property_rental_income: value || 0 }))}
          className="w-full"
        />
      ) : null
    },
  ];

  // Subject Property Address fields
  const subjectPropertyAddressData = [
    { 
      icon: MapPin, 
      label: "Address 1", 
      value: (client as any).subject_address_1 || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.subject_address_1}
          onChange={(e) => setEditData({ ...editData, subject_address_1: e.target.value })}
          className="h-8"
          placeholder="Street address"
        />
      ) : undefined
    },
    { 
      icon: MapPin, 
      label: "Address 2", 
      value: (client as any).subject_address_2 || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.subject_address_2}
          onChange={(e) => setEditData({ ...editData, subject_address_2: e.target.value })}
          className="h-8"
          placeholder="Unit, suite, etc."
        />
      ) : undefined
    },
    { 
      icon: MapPin, 
      label: "City", 
      value: (client as any).subject_city || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.subject_city}
          onChange={(e) => setEditData({ ...editData, subject_city: e.target.value })}
          className="h-8"
          placeholder="City"
        />
      ) : undefined
    },
    { 
      icon: MapPin, 
      label: "State", 
      value: (client as any).subject_state || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.subject_state}
          onChange={(e) => setEditData({ ...editData, subject_state: e.target.value })}
          className="h-8"
          placeholder="State"
        />
      ) : undefined
    },
    { 
      icon: MapPin, 
      label: "Zip", 
      value: (client as any).subject_zip || "—",
      editComponent: isEditing ? (
        <Input
          value={editData.subject_zip}
          onChange={(e) => setEditData({ ...editData, subject_zip: e.target.value })}
          className="h-8"
          placeholder="Zip code"
        />
      ) : undefined
    },
  ];

  // ============================================
  // FINANCIAL SUMMARY DATA (4 fields only)
  // ============================================
  const financialSummaryData = [
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

  // ============================================
  // GOALS DATA (Monthly Payment Goal, Cash to Close Goal)
  // ============================================
  const goalsData = [
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
  ];

  // Monthly Payment Breakdown
  const monthlyPaymentData = [
    {
      icon: Home,
      label: "P&I",
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
      label: "Taxes",
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
      label: "HOI",
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
      label: "MI",
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
      label: "HOA",
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
      label: "PITI",
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
      <div className="space-y-3 pt-0">

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

          {/* Subject Property Address - Single Row Grid */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Subject Property Address</h4>
            <div className="grid grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg">
              {subjectPropertyAddressData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <item.icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </div>
                  {isEditing && item.editComponent ? item.editComponent : (
                    <span className="text-sm font-medium">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
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
                icon: Percent, 
                label: "APR", 
                value: (client as any).apr ? `${(client as any).apr.toFixed(3)}%` : "—",
                editComponent: isEditing ? (
                  <Input
                    type="number"
                    step="0.001"
                    value={editData.apr || ""}
                    onChange={(e) => setEditData({ ...editData, apr: parseFloat(e.target.value) || null })}
                    className="h-8"
                    placeholder="7.125"
                  />
                ) : undefined
              },
              { 
                icon: Hash, 
                label: "Discount Points", 
                value: (() => {
                  const pct = (client as any).discount_points_percentage;
                  const loanAmt = client.loan?.loanAmount || 0;
                  if (pct && loanAmt > 0) {
                    const dollarAmt = (pct / 100) * loanAmt;
                    return `${pct.toFixed(3)}% ($${dollarAmt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
                  }
                  return pct ? `${pct.toFixed(3)}%` : "—";
                })(),
                editComponent: isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={editData.discount_points_percentage || ""}
                      onChange={(e) => setEditData({ ...editData, discount_points_percentage: parseFloat(e.target.value) || null })}
                      className="h-8 w-24"
                      placeholder="1.246"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {editData.discount_points_percentage && editData.loan_amount 
                        ? `($${((editData.discount_points_percentage / 100) * editData.loan_amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
                        : ''}
                    </span>
                  </div>
                ) : undefined
              },
              { 
                icon: Calendar, 
                label: "Amortization Term", 
                value: client.loan?.term ? formatAmortizationTerm(client.loan.term) : formatAmortizationTerm(360),
                editComponent: isEditing ? (
                  <Select
                    value={String(editData.term || 360)}
                    onValueChange={(value) => setEditData({ ...editData, term: parseInt(value) })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="120">120 months (10 years)</SelectItem>
                      <SelectItem value="180">180 months (15 years)</SelectItem>
                      <SelectItem value="240">240 months (20 years)</SelectItem>
                      <SelectItem value="300">300 months (25 years)</SelectItem>
                      <SelectItem value="360">360 months (30 years)</SelectItem>
                      <SelectItem value="480">480 months (40 years)</SelectItem>
                    </SelectContent>
                  </Select>
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
              { 
                icon: DollarSign, 
                label: "Credits", 
                value: formatCurrency((client as any).adjustments_credits || 0),
                editComponent: isEditing ? (
                  <InlineEditCurrency
                    value={editData.adjustments_credits}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, adjustments_credits: value || 0 }))}
                    className="w-full"
                  />
                ) : null
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
          
          {/* Monthly Payment Breakdown - Single Row */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1">Monthly Payment Breakdown</h4>
            <div className="grid grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg">
              {monthlyPaymentData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <item.icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </div>
                  {isEditing && item.editComponent ? item.editComponent : (
                    <span className={`text-sm font-medium ${(item as any).isCalculated ? 'text-primary font-semibold' : ''}`}>{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. CONTACTS */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contacts
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            {/* Buyer's Agent */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" /> Buyer's Agent
              </Label>
              <InlineEditAgent
                value={(client as any).buyer_agent_id ? agents.find(a => a.id === (client as any).buyer_agent_id) : null}
                agents={agents}
                onValueChange={async (agent) => {
                  if (!leadId) return;
                  try {
                    await databaseService.updateLead(leadId, { buyer_agent_id: agent?.id || null });
                    if (onLeadUpdated) await onLeadUpdated();
                  } catch (error: any) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
                placeholder="Select buyer's agent..."
              />
            </div>

            {/* Listing Agent */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" /> Listing Agent
              </Label>
              <InlineEditAgent
                value={(client as any).listing_agent_id ? agents.find(a => a.id === (client as any).listing_agent_id) : null}
                agents={agents}
                onValueChange={async (agent) => {
                  if (!leadId) return;
                  try {
                    await databaseService.updateLead(leadId, { listing_agent_id: agent?.id || null });
                    if (onLeadUpdated) await onLeadUpdated();
                  } catch (error: any) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
                placeholder="Select listing agent..."
              />
            </div>

            {/* Lender */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Landmark className="h-3 w-3" /> Lender
              </Label>
              <InlineEditApprovedLender
                value={(client as any).approved_lender_id ? lenders.find(l => l.id === (client as any).approved_lender_id) : null}
                lenders={lenders}
                onValueChange={async (lender) => {
                  if (!leadId) return;
                  try {
                    await databaseService.updateLead(leadId, { approved_lender_id: lender?.id || null });
                    if (onLeadUpdated) await onLeadUpdated();
                  } catch (error: any) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
                placeholder="Select lender..."
              />
            </div>

            {/* Title Company - placeholder for future */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <Building className="h-3 w-3" /> Title Company
              </Label>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>

            {/* Insurance Provider - placeholder for future */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <Shield className="h-3 w-3" /> Insurance Provider
              </Label>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>

            {/* Appraisal Company - placeholder for future */}
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <ClipboardCheck className="h-3 w-3" /> Appraisal Company
              </Label>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
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

        {/* Goals Section - Vertical Stack */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Goals
          </h3>
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            {goalsData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">{item.label}:</span>
                {isEditing && item.editComponent ? (
                  <div className="flex-1 max-w-xs">{item.editComponent}</div>
                ) : (
                  <span className="text-sm font-semibold">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

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
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? "Deleting..." : "Delete Lead"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the lead
                    and all associated data. If there are tasks associated with this lead,
                    you will need to delete them first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
