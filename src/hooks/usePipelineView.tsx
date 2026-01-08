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
    "listing_agent",
    "earliest_task_due_date"
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
    "name",
    "pendingAppOn",
    "status",
    "realEstateAgent",
    "user",
    "dueDate",
    "notes",
    "latestFileUpdates"
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
    "idle_previous_stage_name",
    "realEstateAgent",
    "idle_reason",
    "idle_future_steps",
    "idle_followup_date"
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
    notes: 396,           // About the Borrower: +20% (was 330)
    dueDate: 72,          // Task Due: -10% (was 80)
    user: 72,             // User: -10% (was 80)
    status: 72,           // Status: -20% (was 90)
    createdOn: 58,        // Lead Created On: -10% (was 64)
    realEstateAgent: 77,  // Real Estate Agent: -10% (was 85)
    name: 76,             // Borrower: -10% (was 84)
  },
  pending_app: {
    name: 76,             // Borrower: match leads
    pendingAppOn: 58,     // Pending App On: match createdOn from leads
    status: 72,           // Status: match leads
    realEstateAgent: 77,  // Real Estate Agent: match leads
    user: 72,             // User: match leads
    dueDate: 72,          // Task Due: match leads
    notes: 396,           // About the Borrower: match leads
  },
  idle: {
    borrower_name: 105,
    createdOn: 80,
    idle_previous_stage_name: 100,
    realEstateAgent: 95,
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
