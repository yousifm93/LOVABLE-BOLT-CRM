import { useState, useEffect } from "react";
import { databaseService } from "@/services/database";

interface PipelineView {
  id: string;
  name: string;
  pipeline_type: string;
  column_order: string[];
  column_widths?: Record<string, number>;
  is_default: boolean;
}

// Default column orders for each pipeline type
const DEFAULT_COLUMNS: Record<string, string[]> = {
  active: [
    "borrower_name",
    "team",
    "lender",
    "arrive_loan_number",
    "loan_amount",
    "disclosure_status",
    "close_date",
    "loan_status",
    "appraisal_status",
    "title_status",
    "hoi_status",
    "condo_status",
    "cd_status",
    "package_status",
    "lock_expiration_date",
    "ba_status",
    "epo_status",
    "buyer_agent",
    "listing_agent"
  ],
  leads: [
    "name",
    "createdOn",
    "realEstateAgent",
    "status",
    "user",
    "dueDate",
    "notes"
  ],
  pending_app: [
    "borrower_name",
    "email",
    "phone",
    "team",
    "dueDate",
    "notes"
  ],
  screening: [
    "borrower_name",
    "email",
    "phone",
    "team",
    "creditScore",
    "dueDate",
    "notes"
  ],
  pre_qualified: [
    "borrower_name",
    "email",
    "phone",
    "team",
    "loanAmount",
    "dueDate",
    "notes"
  ],
  pre_approved: [
    "borrower_name",
    "email",
    "phone",
    "team",
    "loanAmount",
    "lender",
    "dueDate",
    "notes"
  ],
  past_clients: [
    "borrower_name",
    "email",
    "phone",
    "closeDate",
    "loanAmount",
    "status"
  ]
};

/**
 * Hook to fetch and use the active pipeline view for a given pipeline type
 * Returns column order, column widths, view name, and loading state
 * Falls back to default columns if no view is found
 */
export function usePipelineView(pipelineType: string) {
  const [view, setView] = useState<PipelineView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchView = async () => {
      setLoading(true);
      try {
        const views = await databaseService.getPipelineViews(pipelineType);
        
        // Cast Json types to proper TypeScript types
        const typedViews: PipelineView[] = (views || []).map(v => ({
          ...v,
          column_order: v.column_order as unknown as string[],
          column_widths: v.column_widths as unknown as Record<string, number> | undefined,
        }));
        
        // Find default view, or Main View, or first view
        const defaultView = typedViews.find(v => v.is_default);
        const mainView = typedViews.find(v => v.name.toLowerCase() === 'main view');
        const selectedView = defaultView || mainView || typedViews[0];
        
        setView(selectedView || null);
      } catch (error) {
        console.error("Error fetching pipeline view:", error);
        setView(null);
      } finally {
        setLoading(false);
      }
    };

    fetchView();
  }, [pipelineType]);

  return {
    columnOrder: view?.column_order || DEFAULT_COLUMNS[pipelineType] || [],
    columnWidths: view?.column_widths || {},
    viewName: view?.name,
    loading
  };
}
