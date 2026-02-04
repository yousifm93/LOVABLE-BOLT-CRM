import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, Phone, Mail, Building, Users, Upload, Eye, ChevronDown, ChevronRight, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { CreateLenderModal } from "@/components/modals/CreateLenderModal";
import { LenderDetailDialog } from "@/components/LenderDetailDialog";
import { SendLenderEmailModal } from "@/components/modals/SendLenderEmailModal";
import { BulkLenderEmailModal } from "@/components/modals/BulkLenderEmailModal";
import { AILenderSearchModal } from "@/components/modals/AILenderSearchModal";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { toLenderTitleCase } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ButtonFilterBuilder, FilterCondition } from "@/components/ui/button-filter-builder";
import { countActiveFilters, applyAdvancedFilters } from "@/utils/filterUtils";
import { format } from "date-fns";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private" | "HELOC";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  broker_portal_username?: string;
  broker_portal_password?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Dates
  initial_approval_date?: string;
  renewed_on?: string;
  // Products
  product_bs_loan?: string;
  product_manufactured_homes?: string;
  product_fha?: string;
  product_va?: string;
  product_coop?: string;
  product_conv?: string;
  product_wvoe?: string;
  product_high_dti?: string;
  product_condo_hotel?: string;
  product_dr_loan?: string;
  product_fn?: string;
  product_nwc?: string;
  product_heloc?: string;
  product_5_8_unit?: string;
  product_9_plus_unit?: string;
  product_commercial?: string;
  product_construction?: string;
  product_land_loan?: string;
  product_fthb_dscr?: string;
  product_jumbo?: string;
  product_dpa?: string;
  product_no_income_primary?: string;
  product_low_fico?: string;
  product_inv_heloc?: string;
  product_no_seasoning_cor?: string;
  product_tbd_uw?: string;
  product_condo_review_desk?: string;
  product_condo_mip_issues?: string;
  product_nonqm_heloc?: string;
  product_fn_heloc?: string;
  product_no_credit?: string;
  product_558?: string;
  product_itin?: string;
  product_pl_program?: string;
  product_1099_program?: string;
  product_wvoe_family?: string;
  product_1099_less_1yr?: string;
  product_1099_no_biz?: string;
  product_omit_student_loans?: string;
  product_no_ratio_dscr?: string;
  // Clauses
  title_clause?: string;
  insurance_clause?: string;
  // Numbers
  condotel_min_sqft?: number;
  asset_dep_months?: number;
  min_fico?: number;
  min_sqft?: number;
  heloc_min_fico?: number;
  heloc_min?: number;
  max_cash_out_70_ltv?: number;
  // LTVs
  heloc_max_ltv?: number;
  fn_max_ltv?: number;
  bs_loan_max_ltv?: number;
  ltv_1099?: number;
  pl_max_ltv?: number;
  condo_inv_max_ltv?: number;
  jumbo_max_ltv?: number;
  wvoe_max_ltv?: number;
  dscr_max_ltv?: number;
  fha_max_ltv?: number;
  conv_max_ltv?: number;
  max_ltv?: number;
  // Other
  epo_period?: string;
  // Email tracking
  last_email_sent_at?: string;
  last_email_subject?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_fields?: any;
}

// Initial columns - comprehensive list of all lender fields
// Default: first 9 columns visible (up to Send Email), plus notes
const initialColumns = [
  { id: "rowNumber", label: "#", visible: true },
  { id: "lender_name", label: "Lender Name", visible: true },
  { id: "lender_type", label: "Lender Type", visible: true },
  { id: "account_executive", label: "Account Executive", visible: true },
  { id: "ae_email", label: "AE Email", visible: true },
  { id: "ae_phone", label: "AE Phone", visible: true },
  { id: "broker_portal_url", label: "Broker Portal", visible: true },
  { id: "send_email", label: "Send Email", visible: true },
  { id: "last_email_sent", label: "Last Email Sent", visible: true },
  // Loan Limits & Dates - hidden by default
  { id: "min_loan_amount", label: "Min Loan", visible: false },
  { id: "max_loan_amount", label: "Max Loan", visible: false },
  { id: "initial_approval_date", label: "Initial Approval", visible: false },
  { id: "renewed_on", label: "Renewed On", visible: false },
  { id: "epo_period", label: "EPO Period", visible: false },
  // Products - hidden by default
  { id: "product_fha", label: "FHA", visible: false },
  { id: "product_va", label: "VA", visible: false },
  { id: "product_conv", label: "Conventional", visible: false },
  { id: "product_jumbo", label: "Jumbo", visible: false },
  { id: "product_bs_loan", label: "Bank Statement", visible: false },
  { id: "product_wvoe", label: "WVOE", visible: false },
  { id: "product_1099_program", label: "1099 Program", visible: false },
  { id: "product_pl_program", label: "P&L Program", visible: false },
  { id: "product_itin", label: "ITIN", visible: false },
  { id: "product_dpa", label: "DPA", visible: false },
  { id: "product_heloc", label: "HELOC", visible: false },
  { id: "product_inv_heloc", label: "Inv HELOC", visible: false },
  { id: "product_fn_heloc", label: "FN HELOC", visible: false },
  { id: "product_nonqm_heloc", label: "Non-QM HELOC", visible: false },
  { id: "product_manufactured_homes", label: "Manufactured", visible: false },
  { id: "product_coop", label: "Co-Op", visible: false },
  { id: "product_condo_hotel", label: "Condo Hotel", visible: false },
  { id: "product_high_dti", label: "High DTI", visible: false },
  { id: "product_low_fico", label: "Low FICO", visible: false },
  { id: "product_no_credit", label: "No Credit", visible: false },
  { id: "product_dr_loan", label: "DR Loan", visible: false },
  { id: "product_fn", label: "Foreign National", visible: false },
  { id: "product_nwc", label: "NWC", visible: false },
  { id: "product_5_8_unit", label: "5-8 Unit", visible: false },
  { id: "product_9_plus_unit", label: "9+ Units", visible: false },
  { id: "product_commercial", label: "Commercial", visible: false },
  { id: "product_construction", label: "Construction", visible: false },
  { id: "product_land_loan", label: "Land Loan", visible: false },
  { id: "product_fthb_dscr", label: "FTHB DSCR", visible: false },
  { id: "product_no_income_primary", label: "No Inc Primary", visible: false },
  { id: "product_no_seasoning_cor", label: "No Season C/O", visible: false },
  { id: "product_tbd_uw", label: "TBD UW", visible: false },
  { id: "product_condo_review_desk", label: "Condo Review", visible: false },
  { id: "product_condo_mip_issues", label: "Condo MIP", visible: false },
  { id: "product_558", label: "558", visible: false },
  { id: "product_wvoe_family", label: "WVOE Family", visible: false },
  { id: "product_1099_less_1yr", label: "1099 <1yr", visible: false },
  { id: "product_1099_no_biz", label: "1099 No Biz", visible: false },
  { id: "product_omit_student_loans", label: "Omit Student", visible: false },
  { id: "product_no_ratio_dscr", label: "No Ratio DSCR", visible: false },
  // LTVs
  { id: "max_ltv", label: "Max LTV", visible: false },
  { id: "conv_max_ltv", label: "Conv Max LTV", visible: false },
  { id: "fha_max_ltv", label: "FHA Max LTV", visible: false },
  { id: "jumbo_max_ltv", label: "Jumbo Max LTV", visible: false },
  { id: "bs_loan_max_ltv", label: "BS Loan Max LTV", visible: false },
  { id: "wvoe_max_ltv", label: "WVOE Max LTV", visible: false },
  { id: "dscr_max_ltv", label: "DSCR Max LTV", visible: false },
  { id: "ltv_1099", label: "1099 Max LTV", visible: false },
  { id: "pl_max_ltv", label: "P&L Max LTV", visible: false },
  { id: "fn_max_ltv", label: "FN Max LTV", visible: false },
  { id: "heloc_max_ltv", label: "HELOC Max LTV", visible: false },
  { id: "condo_inv_max_ltv", label: "Condo Inv Max LTV", visible: false },
  // Numbers
  { id: "min_fico", label: "Min FICO", visible: false },
  { id: "min_sqft", label: "Min Sqft", visible: false },
  { id: "condotel_min_sqft", label: "Condotel Min Sqft", visible: false },
  { id: "asset_dep_months", label: "Asset Dep (Mo)", visible: false },
  { id: "heloc_min_fico", label: "HELOC Min FICO", visible: false },
  { id: "heloc_min", label: "HELOC Min", visible: false },
  { id: "max_cash_out_70_ltv", label: "Max C/O >70% LTV", visible: false },
  // Other
  { id: "notes", label: "Notes", visible: false },
];

// Filter columns configuration
const filterColumns = [
  { value: 'lender_name', label: 'Lender Name', type: 'text' as const },
  { value: 'lender_type', label: 'Lender Type', type: 'select' as const, options: ['Conventional', 'Non-QM', 'Private', 'HELOC'] },
  { value: 'status', label: 'Status', type: 'select' as const, options: ['Active', 'Pending', 'Inactive'] },
  { value: 'account_executive', label: 'Account Executive', type: 'text' as const },
  { value: 'account_executive_email', label: 'AE Email', type: 'text' as const },
  // Products - all as select with Y/N/TBD options
  { value: 'product_fha', label: 'FHA', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_va', label: 'VA', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_conv', label: 'Conventional', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_jumbo', label: 'Jumbo', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_bs_loan', label: 'Bank Statement', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_wvoe', label: 'WVOE', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_1099_program', label: '1099 Program', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_pl_program', label: 'P&L Program', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_itin', label: 'ITIN', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_dpa', label: 'DPA', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_heloc', label: 'HELOC', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_inv_heloc', label: 'Inv HELOC', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_fn_heloc', label: 'FN HELOC', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_nonqm_heloc', label: 'Non-QM HELOC', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_manufactured_homes', label: 'Manufactured', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_coop', label: 'Co-Op', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_condo_hotel', label: 'Condo Hotel', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_high_dti', label: 'High DTI', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_low_fico', label: 'Low FICO', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_no_credit', label: 'No Credit', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_dr_loan', label: 'DR Loan', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_fn', label: 'Foreign National', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_nwc', label: 'NWC', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_5_8_unit', label: '5-8 Unit', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_9_plus_unit', label: '9+ Units', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_commercial', label: 'Commercial', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_construction', label: 'Construction', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_land_loan', label: 'Land Loan', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_fthb_dscr', label: 'FTHB DSCR', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_no_income_primary', label: 'No Inc Primary', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_no_seasoning_cor', label: 'No Season C/O', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_tbd_uw', label: 'TBD UW', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_condo_review_desk', label: 'Condo Review', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_condo_mip_issues', label: 'Condo MIP', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_558', label: '558', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_wvoe_family', label: 'WVOE Family', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_1099_less_1yr', label: '1099 <1yr', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_1099_no_biz', label: '1099 No Biz', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_omit_student_loans', label: 'Omit Student', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_no_ratio_dscr', label: 'No Ratio DSCR', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  // Numbers
  { value: 'min_loan_amount', label: 'Min Loan Amount', type: 'number' as const },
  { value: 'max_loan_amount', label: 'Max Loan Amount', type: 'number' as const },
  { value: 'min_fico', label: 'Min FICO', type: 'number' as const },
  { value: 'min_sqft', label: 'Min Sqft', type: 'number' as const },
  { value: 'condotel_min_sqft', label: 'Condotel Min Sqft', type: 'number' as const },
  { value: 'asset_dep_months', label: 'Asset Dep (Months)', type: 'number' as const },
  { value: 'heloc_min_fico', label: 'HELOC Min FICO', type: 'number' as const },
  { value: 'heloc_min', label: 'HELOC Min', type: 'number' as const },
  { value: 'max_cash_out_70_ltv', label: 'Max C/O >70% LTV', type: 'number' as const },
  // LTVs
  { value: 'max_ltv', label: 'Max LTV', type: 'number' as const },
  { value: 'conv_max_ltv', label: 'Conv Max LTV', type: 'number' as const },
  { value: 'fha_max_ltv', label: 'FHA Max LTV', type: 'number' as const },
  { value: 'jumbo_max_ltv', label: 'Jumbo Max LTV', type: 'number' as const },
  { value: 'bs_loan_max_ltv', label: 'BS Loan Max LTV', type: 'number' as const },
  { value: 'wvoe_max_ltv', label: 'WVOE Max LTV', type: 'number' as const },
  { value: 'dscr_max_ltv', label: 'DSCR Max LTV', type: 'number' as const },
  { value: 'ltv_1099', label: '1099 Max LTV', type: 'number' as const },
  { value: 'pl_max_ltv', label: 'P&L Max LTV', type: 'number' as const },
  { value: 'fn_max_ltv', label: 'FN Max LTV', type: 'number' as const },
  { value: 'heloc_max_ltv', label: 'HELOC Max LTV', type: 'number' as const },
  { value: 'condo_inv_max_ltv', label: 'Condo Inv Max LTV', type: 'number' as const },
  // Dates
  { value: 'initial_approval_date', label: 'Initial Approval', type: 'date' as const },
  { value: 'renewed_on', label: 'Renewed On', type: 'date' as const },
  // Text
  { value: 'epo_period', label: 'EPO Period', type: 'text' as const },
  { value: 'notes', label: 'Notes', type: 'text' as const },
];

// Product badge renderer
const renderProductBadge = (value: string | undefined) => {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const upperValue = value.toUpperCase();
  if (upperValue === 'Y') {
    return <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Y</Badge>;
  } else if (upperValue === 'N') {
    return <Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-400 text-xs">N</Badge>;
  } else if (upperValue === 'TBD') {
    return <Badge variant="outline" className="text-xs">TBD</Badge>;
  }
  return <span className="text-xs">{value}</span>;
};

// Format currency
const formatCurrency = (value: number | undefined) => {
  if (!value) return "—";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

// Format percentage
const formatPercentage = (value: number | undefined) => {
  if (!value && value !== 0) return "—";
  return `${value}%`;
};

// Format date
const formatDate = (value: string | undefined) => {
  if (!value) return "—";
  try {
    return format(new Date(value), 'MM/dd/yyyy');
  } catch {
    return value;
  }
};

export default function ApprovedLenders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<string>("Active");
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModalLender, setEmailModalLender] = useState<Lender | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lenderToDelete, setLenderToDelete] = useState<Lender | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approvedExpanded, setApprovedExpanded] = useState(true);
  const [notApprovedExpanded, setNotApprovedExpanded] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAISearchOpen, setIsAISearchOpen] = useState(false);
  
  const { toast } = useToast();

  // Handle URL parameter to auto-open lender drawer
  useEffect(() => {
    const openLenderId = searchParams.get('openLender');
    if (openLenderId && !isLoading && lenders.length > 0) {
      const lender = lenders.find(l => l.id === openLenderId);
      if (lender) {
        setSelectedLender(lender);
        setIsDrawerOpen(true);
        // Clear param to prevent re-opening on subsequent renders
        setSearchParams(prev => {
          prev.delete('openLender');
          return prev;
        }, { replace: true });
      }
    }
  }, [searchParams, lenders, isLoading, setSearchParams]);

  const {
    columns: columnVisibility,
    toggleColumn,
    toggleAll,
    saveView,
    reorderColumns,
  } = useColumnVisibility(initialColumns, "lenders-column-visibility");

  useEffect(() => {
    loadLenders();
  }, []);

  const loadLenders = async () => {
    try {
      const lenderData = await databaseService.getLenders();
      setLenders(lenderData);
    } catch (error) {
      console.error('Error loading lenders:', error);
      toast({
        title: "Error",
        description: "Failed to load lenders.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to lender data
  const filteredLenders = useMemo(() => {
    return applyAdvancedFilters(lenders, filters);
  }, [lenders, filters]);

  const handleImportLenders = async () => {
    setIsImporting(true);
    toast({
      title: "Importing...",
      description: "Fetching lender data from CSV file.",
    });

    try {
      const response = await fetch('/lenders-import.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch CSV file');
      }
      const csvData = await response.text();

      const { data, error } = await supabase.functions.invoke('import-lenders', {
        body: { csvData }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Import Complete",
        description: `Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}, Errors: ${data.errors}`,
      });

      await loadLenders();
    } catch (error) {
      console.error('Error importing lenders:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import lenders.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateLender = async (id: string, updates: Partial<Lender>) => {
    try {
      await databaseService.updateLender(id, updates);
      setLenders(prev => prev.map(lender => 
        lender.id === id ? { ...lender, ...updates } : lender
      ));
      toast({
        title: "Success",
        description: "Lender updated successfully.",
      });
    } catch (error) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: "Failed to update lender.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = (lender: Lender, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmailModalLender(lender);
    setIsEmailModalOpen(true);
  };

  const handleContactCreated = () => {
    loadLenders();
  };

  const handleRowClick = (lender: Lender) => {
    setSelectedLender(lender);
    setIsDrawerOpen(true);
  };

  const handleDeleteLender = async () => {
    if (!lenderToDelete) return;
    setIsDeleting(true);
    try {
      await databaseService.softDeleteLender(lenderToDelete.id);
      toast({
        title: "Success",
        description: "Lender deleted successfully.",
      });
      loadLenders();
    } catch (error) {
      console.error('Error deleting lender:', error);
      toast({
        title: "Error",
        description: "Failed to delete lender.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setLenderToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddLender = (defaultStatus: string) => {
    setCreateModalDefaultStatus(defaultStatus);
    setShowCreateModal(true);
  };

  // Split filtered lenders into approved and not approved
  const approvedLenders = filteredLenders.filter(l => l.status === 'Active');
  const notApprovedLenders = filteredLenders.filter(l => l.status !== 'Active');

  const addRowNumbers = (lenderList: Lender[]) => 
    lenderList.map((lender, index) => ({
      ...lender,
      rowNumber: index + 1
    }));

  const isColumnVisible = (columnId: string) => {
    const col = columnVisibility.find(c => c.id === columnId);
    return col ? col.visible : true;
  };

  // Build dynamic columns based on visibility
  const columns: ColumnDef<Lender & { rowNumber?: number }>[] = useMemo(() => {
    const cols: ColumnDef<Lender & { rowNumber?: number }>[] = [];

    // Row number
    if (isColumnVisible("rowNumber")) {
      cols.push({
        accessorKey: "rowNumber",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.rowNumber}</span>
        ),
      });
    }

    // Lender name
    if (isColumnVisible("lender_name")) {
      cols.push({
        accessorKey: "lender_name",
        header: "Lender Name",
        cell: ({ row }) => (
          <div className="flex items-center justify-start text-left">
            <Building className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{toLenderTitleCase(row.original.lender_name)}</span>
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Lender type
    if (isColumnVisible("lender_type")) {
      cols.push({
        accessorKey: "lender_type",
        header: "Lender Type",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground">{row.original.lender_type || "—"}</span>
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Account executive
    if (isColumnVisible("account_executive")) {
      cols.push({
        accessorKey: "account_executive",
        header: "Account Executive",
        cell: ({ row }) => (
          <div className="text-center">
            <span className="text-sm">{row.original.account_executive || "—"}</span>
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // AE Email
    if (isColumnVisible("ae_email")) {
      cols.push({
        accessorKey: "account_executive_email",
        header: "AE Email",
        cell: ({ row }) => (
          <div className="flex items-center text-sm">
            <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_email || "—"}</span>
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // AE Phone
    if (isColumnVisible("ae_phone")) {
      cols.push({
        accessorKey: "account_executive_phone",
        header: "AE Phone",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-muted-foreground">
            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_phone || "—"}</span>
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Broker Portal
    if (isColumnVisible("broker_portal_url")) {
      cols.push({
        accessorKey: "broker_portal_url",
        header: "Broker Portal",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <InlineEditLink
              value={row.original.broker_portal_url}
              onValueChange={(value) => handleUpdateLender(row.original.id, { broker_portal_url: value })}
              placeholder="Portal URL"
            />
          </div>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Send Email
    if (isColumnVisible("send_email")) {
      cols.push({
        accessorKey: "send_email",
        header: "Send Email",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleSendEmail(row.original, e)}
            disabled={!row.original.account_executive_email}
          >
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
        ),
      });
    }

    // Last Email Sent
    if (isColumnVisible("last_email_sent")) {
      cols.push({
        accessorKey: "last_email_sent_at",
        header: "Last Email Sent",
        cell: ({ row }) => {
          const sentAt = row.original.last_email_sent_at;
          const subject = row.original.last_email_subject;
          if (!sentAt) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="text-xs">
              <div className="font-medium">{format(new Date(sentAt), 'MMM dd, yyyy')}</div>
              {subject && <div className="text-muted-foreground truncate max-w-[150px]" title={subject}>{subject}</div>}
            </div>
          );
        },
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Loan limits
    if (isColumnVisible("min_loan_amount")) {
      cols.push({
        accessorKey: "min_loan_amount",
        header: "Min Loan",
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.original.min_loan_amount)}</span>,
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }
    if (isColumnVisible("max_loan_amount")) {
      cols.push({
        accessorKey: "max_loan_amount",
        header: "Max Loan",
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.original.max_loan_amount)}</span>,
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Dates
    if (isColumnVisible("initial_approval_date")) {
      cols.push({
        accessorKey: "initial_approval_date",
        header: "Initial Approval",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.initial_approval_date)}</span>,
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }
    if (isColumnVisible("renewed_on")) {
      cols.push({
        accessorKey: "renewed_on",
        header: "Renewed On",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.renewed_on)}</span>,
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }
    if (isColumnVisible("epo_period")) {
      cols.push({
        accessorKey: "epo_period",
        header: "EPO Period",
        cell: ({ row }) => <span className="text-sm">{row.original.epo_period || "—"}</span>,
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    // Product columns
    const productColumnDefs: { id: string; key: keyof Lender }[] = [
      { id: "product_fha", key: "product_fha" },
      { id: "product_va", key: "product_va" },
      { id: "product_conv", key: "product_conv" },
      { id: "product_jumbo", key: "product_jumbo" },
      { id: "product_bs_loan", key: "product_bs_loan" },
      { id: "product_wvoe", key: "product_wvoe" },
      { id: "product_1099_program", key: "product_1099_program" },
      { id: "product_pl_program", key: "product_pl_program" },
      { id: "product_itin", key: "product_itin" },
      { id: "product_dpa", key: "product_dpa" },
      { id: "product_heloc", key: "product_heloc" },
      { id: "product_inv_heloc", key: "product_inv_heloc" },
      { id: "product_fn_heloc", key: "product_fn_heloc" },
      { id: "product_nonqm_heloc", key: "product_nonqm_heloc" },
      { id: "product_manufactured_homes", key: "product_manufactured_homes" },
      { id: "product_coop", key: "product_coop" },
      { id: "product_condo_hotel", key: "product_condo_hotel" },
      { id: "product_high_dti", key: "product_high_dti" },
      { id: "product_low_fico", key: "product_low_fico" },
      { id: "product_no_credit", key: "product_no_credit" },
      { id: "product_dr_loan", key: "product_dr_loan" },
      { id: "product_fn", key: "product_fn" },
      { id: "product_nwc", key: "product_nwc" },
      { id: "product_5_8_unit", key: "product_5_8_unit" },
      { id: "product_9_plus_unit", key: "product_9_plus_unit" },
      { id: "product_commercial", key: "product_commercial" },
      { id: "product_construction", key: "product_construction" },
      { id: "product_land_loan", key: "product_land_loan" },
      { id: "product_fthb_dscr", key: "product_fthb_dscr" },
      { id: "product_no_income_primary", key: "product_no_income_primary" },
      { id: "product_no_seasoning_cor", key: "product_no_seasoning_cor" },
      { id: "product_tbd_uw", key: "product_tbd_uw" },
      { id: "product_condo_review_desk", key: "product_condo_review_desk" },
      { id: "product_condo_mip_issues", key: "product_condo_mip_issues" },
      { id: "product_558", key: "product_558" },
      { id: "product_wvoe_family", key: "product_wvoe_family" },
      { id: "product_1099_less_1yr", key: "product_1099_less_1yr" },
      { id: "product_1099_no_biz", key: "product_1099_no_biz" },
      { id: "product_omit_student_loans", key: "product_omit_student_loans" },
      { id: "product_no_ratio_dscr", key: "product_no_ratio_dscr" },
    ];

    productColumnDefs.forEach(({ id, key }) => {
      if (isColumnVisible(id)) {
        const colDef = initialColumns.find(c => c.id === id);
        cols.push({
          accessorKey: key,
          header: colDef?.label || id,
          cell: ({ row }) => <div className="flex justify-center">{renderProductBadge(row.original[key] as string | undefined)}</div>,
          sortable: true,
        } as ColumnDef<Lender & { rowNumber?: number }>);
      }
    });

    // LTV columns
    const ltvColumnDefs: { id: string; key: keyof Lender }[] = [
      { id: "max_ltv", key: "max_ltv" },
      { id: "conv_max_ltv", key: "conv_max_ltv" },
      { id: "fha_max_ltv", key: "fha_max_ltv" },
      { id: "jumbo_max_ltv", key: "jumbo_max_ltv" },
      { id: "bs_loan_max_ltv", key: "bs_loan_max_ltv" },
      { id: "wvoe_max_ltv", key: "wvoe_max_ltv" },
      { id: "dscr_max_ltv", key: "dscr_max_ltv" },
      { id: "ltv_1099", key: "ltv_1099" },
      { id: "pl_max_ltv", key: "pl_max_ltv" },
      { id: "fn_max_ltv", key: "fn_max_ltv" },
      { id: "heloc_max_ltv", key: "heloc_max_ltv" },
      { id: "condo_inv_max_ltv", key: "condo_inv_max_ltv" },
    ];

    ltvColumnDefs.forEach(({ id, key }) => {
      if (isColumnVisible(id)) {
        const colDef = initialColumns.find(c => c.id === id);
        cols.push({
          accessorKey: key,
          header: colDef?.label || id,
          cell: ({ row }) => <span className="text-sm">{formatPercentage(row.original[key] as number | undefined)}</span>,
          sortable: true,
        } as ColumnDef<Lender & { rowNumber?: number }>);
      }
    });

    // Number columns
    const numberColumnDefs: { id: string; key: keyof Lender; format?: 'currency' | 'number' }[] = [
      { id: "min_fico", key: "min_fico" },
      { id: "min_sqft", key: "min_sqft" },
      { id: "condotel_min_sqft", key: "condotel_min_sqft" },
      { id: "asset_dep_months", key: "asset_dep_months" },
      { id: "heloc_min_fico", key: "heloc_min_fico" },
      { id: "heloc_min", key: "heloc_min", format: 'currency' },
      { id: "max_cash_out_70_ltv", key: "max_cash_out_70_ltv", format: 'currency' },
    ];

    numberColumnDefs.forEach(({ id, key, format }) => {
      if (isColumnVisible(id)) {
        const colDef = initialColumns.find(c => c.id === id);
        cols.push({
          accessorKey: key,
          header: colDef?.label || id,
          cell: ({ row }) => {
            const value = row.original[key] as number | undefined;
            if (format === 'currency') {
              return <span className="text-sm">{formatCurrency(value)}</span>;
            }
            return <span className="text-sm">{value ?? "—"}</span>;
          },
          sortable: true,
        } as ColumnDef<Lender & { rowNumber?: number }>);
      }
    });

    // Notes
    if (isColumnVisible("notes")) {
      cols.push({
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={row.original.notes || ""}>
            {row.original.notes || "—"}
          </span>
        ),
        sortable: true,
      } as ColumnDef<Lender & { rowNumber?: number }>);
    }

    return cols;
  }, [columnVisibility]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lenders</h1>
        <p className="text-xs italic text-muted-foreground/70">Manage your lending partners</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Lender Directory</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search lenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant={isFilterOpen ? "default" : "outline"}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <ColumnVisibilityButton
              columns={columnVisibility}
              onColumnToggle={toggleColumn}
              onToggleAll={toggleAll}
              onSaveView={saveView}
              onReorderColumns={reorderColumns}
              skipDatabaseFields={true}
            />
            <Button 
              variant="outline" 
              onClick={() => setIsAISearchOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Search
            </Button>
            <Button 
              variant="outline" 
              onClick={handleImportLenders}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import from CSV"}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button 
                  variant="default"
                  onClick={() => setIsBulkEmailModalOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Email {selectedIds.size} Selected
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <ButtonFilterBuilder
                filters={filters}
                onFiltersChange={setFilters}
                columns={filterColumns}
              />
            </div>
          )}

          {/* Approved Lenders Section */}
          <Collapsible open={approvedExpanded} onOpenChange={setApprovedExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-2">
                  {approvedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">Approved</span>
                  <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400">
                    {approvedLenders.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddLender("Active");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Lender
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2">
                <DataTable
                  columns={columns}
                  data={addRowNumbers(approvedLenders)}
                  searchTerm={searchTerm}
                  onRowClick={handleRowClick}
                  selectable={true}
                  selectedIds={Array.from(selectedIds)}
                  onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
                  getRowId={(row) => row.id}
                  onDelete={(lender) => {
                    setLenderToDelete(lender);
                    setIsDeleteDialogOpen(true);
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Not Approved Lenders Section */}
          <Collapsible open={notApprovedExpanded} onOpenChange={setNotApprovedExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-2">
                  {notApprovedExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">Not Approved</span>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {notApprovedLenders.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddLender("Pending");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Lender
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2">
                {notApprovedLenders.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={addRowNumbers(notApprovedLenders)}
                    searchTerm={searchTerm}
                    onRowClick={handleRowClick}
                    selectable={true}
                    selectedIds={Array.from(selectedIds)}
                    onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
                    getRowId={(row) => row.id}
                    onDelete={(lender) => {
                      setLenderToDelete(lender);
                      setIsDeleteDialogOpen(true);
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No lenders in this section</p>
                    <p className="text-sm">Click "Add Lender" to add a new lender to evaluate</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      
      <CreateLenderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onLenderCreated={loadLenders}
        defaultStatus={createModalDefaultStatus as "Active" | "Pending"}
      />

      <LenderDetailDialog
        lender={selectedLender}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLender(null);
        }}
        onLenderUpdated={loadLenders}
      />

      <SendLenderEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailModalLender(null);
        }}
        lender={emailModalLender}
      />

      <BulkLenderEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => {
          setIsBulkEmailModalOpen(false);
          setSelectedIds(new Set());
        }}
        lenders={lenders.filter(l => selectedIds.has(l.id)).map(l => ({
          id: l.id,
          lender_name: l.lender_name,
          account_executive: l.account_executive,
          account_executive_email: l.account_executive_email
        }))}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setLenderToDelete(null);
          }
        }}
        onConfirm={handleDeleteLender}
        title="Delete Lender"
        description={`Are you sure you want to delete "${lenderToDelete?.lender_name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />

      <AILenderSearchModal
        isOpen={isAISearchOpen}
        onClose={() => setIsAISearchOpen(false)}
        onViewLender={(lenderId) => {
          const lender = lenders.find(l => l.id === lenderId);
          if (lender) {
            setSelectedLender(lender);
            setIsDrawerOpen(true);
          }
        }}
        onSelectLenders={(lenderIds) => {
          setSelectedIds(new Set(lenderIds));
          setIsBulkEmailModalOpen(true);
        }}
      />
    </div>
  );
}
