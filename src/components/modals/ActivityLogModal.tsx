import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/ui/user-avatar";
import { 
  RefreshCw, 
  Undo2, 
  Calendar, 
  DollarSign, 
  Type, 
  ToggleLeft, 
  ArrowRightCircle,
  Hash,
  Percent,
  FileText,
  User,
  Building,
  Phone,
  Mail,
  Clock,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface ActivityLogEntry {
  id: number;
  time: string;
  timeFormatted: string;
  leadId: string;
  leadName: string;
  action: "insert" | "update" | "delete";
  fieldChanged: string;
  fieldKey: string;
  beforeValue: string | null;
  afterValue: string | null;
  changedBy: string | null;
  changedByUser: { first_name: string; last_name: string; email: string } | null;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStage?: string;
  title?: string;
}

// Compact time format
const formatCompactTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  // For older dates, show abbreviated date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFieldName = (field: string): string => {
  // Special field name mappings
  const fieldNameMap: Record<string, string> = {
    loan_status: "Loan Status",
    appraisal_status: "Appraisal",
    title_status: "Title",
    hoi_status: "HOI",
    condo_status: "Condo",
    cd_status: "CD",
    package_status: "Package",
    epo_status: "EPO",
    ba_status: "BA",
    disclosure_status: "Disclosure",
    pipeline_stage_id: "Pipeline Stage",
    pipeline_section: "Section",
    close_date: "Close Date",
    lock_expiration_date: "Lock Exp",
    appraisal_ordered_date: "Appr Ordered",
    appraisal_scheduled_date: "Appr Scheduled",
    appraisal_received_on: "Appr Received",
    loan_amount: "Loan Amt",
    sales_price: "Sales Price",
    interest_rate: "Rate",
    discount_points: "Points",
    dscr_ratio: "DSCR",
    approved_lender_id: "Lender",
    lender_loan_number: "Lender Loan #",
    mb_loan_number: "MB App #",
    loan_program: "Program",
    property_type: "Property Type",
    occupancy: "Occupancy",
    term: "Term",
  };
  
  if (fieldNameMap[field]) return fieldNameMap[field];
  
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

// Get icon for field type
const getFieldIcon = (field: string) => {
  const statusFields = ['loan_status', 'appraisal_status', 'title_status', 'hoi_status', 'condo_status', 'cd_status', 'package_status', 'epo_status', 'ba_status', 'disclosure_status'];
  const dateFields = ['close_date', 'lock_expiration_date', 'appraisal_ordered_date', 'appraisal_scheduled_date', 'appraisal_received_on', 'created_at', 'pending_app_at', 'pre_approved_at', 'active_at', 'ctc_at', 'submitted_at', 'closed_at'];
  const currencyFields = ['loan_amount', 'sales_price', 'appraisal_value', 'cash_to_close', 'closing_costs', 'monthly_payment_goal'];
  const percentFields = ['interest_rate', 'discount_points', 'dscr_ratio', 'ltv'];
  const numberFields = ['term', 'fico_score'];
  const booleanFields = ['escrow', 'converted'];
  const contactFields = ['buyer_agent_id', 'listing_agent_id', 'approved_lender_id'];
  const userFields = ['processor_id', 'lo_id'];
  const phoneFields = ['phone', 'co_borrower_phone'];
  const emailFields = ['email', 'co_borrower_email'];
  
  if (field === 'pipeline_stage_id' || field === 'pipeline_section') return <ArrowRightCircle className="h-3.5 w-3.5 text-purple-500" />;
  if (statusFields.includes(field)) return <FileText className="h-3.5 w-3.5 text-blue-500" />;
  if (dateFields.includes(field)) return <Calendar className="h-3.5 w-3.5 text-orange-500" />;
  if (currencyFields.includes(field)) return <DollarSign className="h-3.5 w-3.5 text-green-500" />;
  if (percentFields.includes(field)) return <Percent className="h-3.5 w-3.5 text-cyan-500" />;
  if (numberFields.includes(field)) return <Hash className="h-3.5 w-3.5 text-gray-500" />;
  if (booleanFields.includes(field)) return <ToggleLeft className="h-3.5 w-3.5 text-amber-500" />;
  if (contactFields.includes(field)) return <Building className="h-3.5 w-3.5 text-indigo-500" />;
  if (userFields.includes(field)) return <User className="h-3.5 w-3.5 text-pink-500" />;
  if (phoneFields.includes(field)) return <Phone className="h-3.5 w-3.5 text-teal-500" />;
  if (emailFields.includes(field)) return <Mail className="h-3.5 w-3.5 text-red-500" />;
  
  return <Type className="h-3.5 w-3.5 text-muted-foreground" />;
};

// Get colored badge for status values
const getStatusBadge = (value: string | null, field: string) => {
  if (!value || value === '—') return <span className="text-muted-foreground">—</span>;
  
  const statusColors: Record<string, string> = {
    // Loan Status
    'NEW': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'RFP': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'SUB': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    'AWC': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    'CTC': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'CLOSED': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    // General statuses
    'N/A': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    'Ordered': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Scheduled': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    'Inspected': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    'Received': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'Cleared': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    'Initial': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Final': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'Sent': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    'Signed': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'Requested': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    // Pipeline sections
    'Incoming': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Live': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };
  
  const statusFields = ['loan_status', 'appraisal_status', 'title_status', 'hoi_status', 'condo_status', 'cd_status', 'package_status', 'epo_status', 'ba_status', 'disclosure_status', 'pipeline_section'];
  
  if (statusFields.includes(field)) {
    const colorClass = statusColors[value] || 'bg-muted text-muted-foreground';
    return (
      <Badge variant="outline" className={`${colorClass} border-0 text-xs font-medium px-2 py-0.5`}>
        {value}
      </Badge>
    );
  }
  
  return <span className="text-sm">{value}</span>;
};

// Format date values
const formatDateValue = (value: string | null): string => {
  if (!value || value === '—') return '—';
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return value;
  }
};

// Format currency values
const formatCurrencyValue = (value: string | null): string => {
  if (!value || value === '—') return '—';
  
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatValue = (value: any, field: string): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  
  const dateFields = ['close_date', 'lock_expiration_date', 'appraisal_ordered_date', 'appraisal_scheduled_date', 'appraisal_received_on'];
  const currencyFields = ['loan_amount', 'sales_price', 'appraisal_value', 'cash_to_close', 'closing_costs'];
  
  if (dateFields.includes(field)) return formatDateValue(String(value));
  if (currencyFields.includes(field)) return formatCurrencyValue(String(value));
  
  return String(value);
};

export function ActivityLogModal({
  isOpen,
  onClose,
  pipelineStage = "Active",
  title,
}: ActivityLogModalProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState("7days");
  const [actionFilter, setActionFilter] = useState("all");
  const [usersMap, setUsersMap] = useState<Record<string, { first_name: string; last_name: string; email: string }>>({});
  const [stagesMap, setStagesMap] = useState<Record<string, string>>({});
  const [lendersMap, setLendersMap] = useState<Record<string, string>>({});
  const [undoing, setUndoing] = useState<number | null>(null);

  // Fetch users for avatar display - map by BOTH id and auth_user_id
  const fetchUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, auth_user_id, first_name, last_name, email");
    
    if (data) {
      const map: Record<string, { first_name: string; last_name: string; email: string }> = {};
      data.forEach(user => {
        const userInfo = {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
        };
        // Map by user.id (used in teammate_assigned, processor_id, lo_id)
        if (user.id) {
          map[user.id] = userInfo;
        }
        // Also map by auth_user_id for changed_by field
        if (user.auth_user_id) {
          map[user.auth_user_id] = userInfo;
        }
      });
      setUsersMap(map);
    }
  };

  // Fetch pipeline stages for name mapping
  const fetchStages = async () => {
    const { data } = await supabase
      .from("pipeline_stages")
      .select("id, name, order_index");
    
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(stage => {
        map[stage.id] = `${stage.order_index}. ${stage.name.toUpperCase()}`;
      });
      setStagesMap(map);
    }
  };

  // Fetch lenders for name mapping
  const fetchLenders = async () => {
    const { data } = await supabase
      .from("lenders")
      .select("id, lender_name");
    
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(lender => {
        map[lender.id] = lender.lender_name;
      });
      setLendersMap(map);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // First, get the pipeline stage ID for the given stage name
      const { data: stagesData } = await supabase
        .from("pipeline_stages")
        .select("id, name");
      
      const targetStageId = stagesData?.find(s => s.name === pipelineStage)?.id;

      // Calculate date range based on filter
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFilter) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "yesterday":
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "7days":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Fetch audit log entries for leads table
      let query = supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", "leads")
        .gte("changed_at", startDate.toISOString())
        .order("changed_at", { ascending: false })
        .limit(300);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter as "insert" | "update" | "delete");
      }

      const { data: auditData, error } = await query;

      if (error) {
        console.error("Error fetching audit log:", error);
        return;
      }

      // Filter by pipeline stage ID (UUID) instead of name
      const filteredData = auditData?.filter((entry) => {
        const afterData = entry.after_data as Record<string, any> | null;
        const beforeData = entry.before_data as Record<string, any> | null;
        
        // Check by pipeline_stage_id (UUID)
        const afterStageId = afterData?.pipeline_stage_id;
        const beforeStageId = beforeData?.pipeline_stage_id;
        
        return afterStageId === targetStageId || beforeStageId === targetStageId;
      }) || [];

      // Transform audit data into activity entries
      const transformedActivities: ActivityLogEntry[] = [];

      for (const entry of filteredData) {
        const beforeData = entry.before_data as Record<string, any> | null;
        const afterData = entry.after_data as Record<string, any> | null;
        
        // Get lead name
        const leadName = afterData?.first_name && afterData?.last_name
          ? `${afterData.first_name} ${afterData.last_name}`
          : beforeData?.first_name && beforeData?.last_name
            ? `${beforeData.first_name} ${beforeData.last_name}`
            : "Unknown";

        const changedByUser = entry.changed_by ? usersMap[entry.changed_by] : null;

        if (entry.action === "insert") {
          transformedActivities.push({
            id: entry.id,
            time: entry.changed_at,
            timeFormatted: formatCompactTime(new Date(entry.changed_at)),
            leadId: entry.item_id || "",
            leadName,
            action: "insert",
            fieldChanged: "New Lead",
            fieldKey: "new_lead",
            beforeValue: null,
            afterValue: "Created",
            changedBy: entry.changed_by,
            changedByUser,
          });
        } else if (entry.action === "delete") {
          transformedActivities.push({
            id: entry.id,
            time: entry.changed_at,
            timeFormatted: formatCompactTime(new Date(entry.changed_at)),
            leadId: entry.item_id || "",
            leadName,
            action: "delete",
            fieldChanged: "Lead",
            fieldKey: "lead",
            beforeValue: "Existed",
            afterValue: null,
            changedBy: entry.changed_by,
            changedByUser,
          });
        } else if (entry.action === "update" && beforeData && afterData) {
          // Find changed fields
          const excludedFields = ["updated_at", "created_at", "id"];
          const changedFields = Object.keys(afterData).filter(
            (key) =>
              !excludedFields.includes(key) &&
              JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key])
          );

          for (const field of changedFields) {
            // Convert UUIDs to readable names
            let beforeVal = formatValue(beforeData[field], field);
            let afterVal = formatValue(afterData[field], field);
            
            // Map pipeline stage IDs to names
            if (field === 'pipeline_stage_id') {
              beforeVal = stagesMap[beforeData[field]] || beforeVal;
              afterVal = stagesMap[afterData[field]] || afterVal;
            }
            
            // Map lender IDs to names
            if (field === 'approved_lender_id') {
              beforeVal = lendersMap[beforeData[field]] || beforeVal;
              afterVal = lendersMap[afterData[field]] || afterVal;
            }
            
            // Map user IDs to names (teammate_assigned, processor_id, lo_id)
            if (['teammate_assigned', 'processor_id', 'lo_id'].includes(field)) {
              const beforeUser = usersMap[beforeData[field]];
              const afterUser = usersMap[afterData[field]];
              if (beforeUser) beforeVal = `${beforeUser.first_name} ${beforeUser.last_name}`;
              if (afterUser) afterVal = `${afterUser.first_name} ${afterUser.last_name}`;
            }

            transformedActivities.push({
              id: entry.id + changedFields.indexOf(field),
              time: entry.changed_at,
              timeFormatted: formatCompactTime(new Date(entry.changed_at)),
              leadId: entry.item_id || "",
              leadName,
              action: "update",
              fieldChanged: formatFieldName(field),
              fieldKey: field,
              beforeValue: beforeVal,
              afterValue: afterVal,
              changedBy: entry.changed_by,
              changedByUser,
            });
          }
        }
      }

      setActivities(transformedActivities);
    } catch (err) {
      console.error("Error in fetchActivities:", err);
    } finally {
      setLoading(false);
    }
  };

  // Undo a change
  const handleUndo = async (activity: ActivityLogEntry) => {
    if (activity.action !== 'update' || !activity.beforeValue || activity.beforeValue === '—') {
      toast.error("Cannot undo this change");
      return;
    }

    setUndoing(activity.id);
    try {
      // Need to convert formatted value back to raw value for certain fields
      let valueToSet: any = activity.beforeValue;
      
      // Handle special cases
      if (activity.beforeValue === '—') {
        valueToSet = null;
      } else if (activity.fieldKey.includes('_date') || activity.fieldKey === 'lock_expiration_date') {
        // Keep as string for dates
        valueToSet = activity.beforeValue;
      } else if (['loan_amount', 'sales_price', 'appraisal_value', 'cash_to_close', 'closing_costs'].includes(activity.fieldKey)) {
        // Remove currency formatting
        valueToSet = parseFloat(activity.beforeValue.replace(/[$,]/g, ''));
      }

      const { error } = await supabase
        .from('leads')
        .update({ [activity.fieldKey]: valueToSet })
        .eq('id', activity.leadId);

      if (error) throw error;

      toast.success(`Reverted ${activity.fieldChanged} for ${activity.leadName}`);
      fetchActivities(); // Refresh the log
    } catch (err) {
      console.error("Error undoing change:", err);
      toast.error("Failed to undo change");
    } finally {
      setUndoing(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchStages();
      fetchLenders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && Object.keys(usersMap).length > 0) {
      fetchActivities();
    }
  }, [isOpen, timeFilter, actionFilter, pipelineStage, usersMap, stagesMap, lendersMap]);

  const displayTitle = title || `${pipelineStage} Pipeline Log`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{displayTitle}</span>
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="insert">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="delete">Deleted</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActivities}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No activity found for the selected filters
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {activities.map((activity, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-muted/40 transition-colors group border-b border-border/50 last:border-b-0"
                >
                  {/* Time - compact */}
                  <div className="w-14 text-xs text-muted-foreground font-mono shrink-0">
                    {activity.timeFormatted}
                  </div>

                  {/* User Avatar */}
                  <div className="shrink-0">
                    {activity.changedByUser ? (
                      <UserAvatar
                        firstName={activity.changedByUser.first_name}
                        lastName={activity.changedByUser.last_name}
                        email={activity.changedByUser.email}
                        size="sm"
                        showTooltip
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Lead Name */}
                  <div className="w-40 font-medium text-sm truncate shrink-0">
                    {activity.leadName}
                  </div>

                  {/* Field with Icon */}
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    {getFieldIcon(activity.fieldKey)}
                    <span className="text-sm text-muted-foreground truncate">
                      {activity.fieldChanged}
                    </span>
                  </div>

                  {/* Before → After Values */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {activity.action === "update" ? (
                      <>
                        {getStatusBadge(activity.beforeValue, activity.fieldKey)}
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        {getStatusBadge(activity.afterValue, activity.fieldKey)}
                      </>
                    ) : activity.action === "insert" ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                        New lead created
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs">
                        Lead deleted
                      </Badge>
                    )}
                  </div>

                  {/* Undo Button */}
                  {activity.action === "update" && activity.beforeValue && activity.beforeValue !== '—' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleUndo(activity)}
                      disabled={undoing === activity.id}
                    >
                      {undoing === activity.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Undo2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
          <span>{activities.length} activities found</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}