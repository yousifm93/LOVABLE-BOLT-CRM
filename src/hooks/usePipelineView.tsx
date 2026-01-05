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
    "mb_loan_number",
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
  ],
  idle: [
    "select",
    "rowNumber",
    "borrower_name",
    "createdOn",
    "realEstateAgent",
    "notes"
  ]
};

// Default column widths for each pipeline type (hardcoded fallback)
// Leads widths updated per user request:
// - notes (About the Borrower): was 275, +20% = 330
// - status: was 100, -10% = 90
// - realEstateAgent: was 95, -10% = 85
// - createdOn (Lead Created On): was 80, -20% = 64
// - name (Borrower): was 105, -20% = 84
const DEFAULT_WIDTHS: Record<string, Record<string, number>> = {
  leads: {
    notes: 330,           // About the Borrower: was 275, +20%
    dueDate: 80,
    user: 80,
    status: 90,           // was 100, -10%
    createdOn: 64,        // Lead Created On: was 80, -20%
    realEstateAgent: 85,  // was 95, -10%
    name: 84,             // Borrower: was 105, -20%
  },
  idle: {
    borrower_name: 84,        // Matching leads borrower
    createdOn: 64,            // Matching leads createdOn
    realEstateAgent: 85,      // Matching leads realEstateAgent
    notes: 330,               // Matching leads notes
    idle_reason: 200,
    idle_future_steps: 80,
    idle_followup_date: 100,
  },
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
        
        // Cast Json types to proper TypeScript types and normalize widths
        const typedViews: PipelineView[] = (views || []).map(v => {
          const rawWidths = v.column_widths as unknown as Record<string, unknown> | undefined;
          // Normalize widths: convert strings to numbers, drop non-finite values
          const normalizedWidths: Record<string, number> = {};
          if (rawWidths && typeof rawWidths === 'object') {
            Object.entries(rawWidths).forEach(([key, val]) => {
              const num = typeof val === 'number' ? val : Number(val);
              if (Number.isFinite(num) && num >= 80 && num <= 600) {
                normalizedWidths[key] = num;
              }
            });
          }
          return {
            ...v,
            column_order: v.column_order as unknown as string[],
            column_widths: Object.keys(normalizedWidths).length > 0 ? normalizedWidths : undefined,
          };
        });
        
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

  // Merge hardcoded defaults with any saved widths from the database
  const defaultWidthsForType = DEFAULT_WIDTHS[pipelineType] || {};
  const mergedWidths = { ...defaultWidthsForType, ...(view?.column_widths || {}) };

  return {
    columnOrder: view?.column_order || DEFAULT_COLUMNS[pipelineType] || [],
    columnWidths: mergedWidths,
    viewName: view?.name,
    loading
  };
}
