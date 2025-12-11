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
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, RefreshCw } from "lucide-react";

interface ActivityLogEntry {
  id: number;
  time: string;
  timeFormatted: string;
  leadId: string;
  leadName: string;
  action: "insert" | "update" | "delete";
  fieldChanged: string;
  beforeValue: string | null;
  afterValue: string | null;
  changedBy: string | null;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStage?: string;
  title?: string;
}

const formatFieldName = (field: string): string => {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getActionBadge = (action: string) => {
  switch (action) {
    case "insert":
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Created</Badge>;
    case "update":
      return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Updated</Badge>;
    case "delete":
      return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Deleted</Badge>;
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
};

export function ActivityLogModal({
  isOpen,
  onClose,
  pipelineStage = "Active",
  title = "Activity Log",
}: ActivityLogModalProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState("7days");
  const [actionFilter, setActionFilter] = useState("all");

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
        .limit(200);

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

        if (entry.action === "insert") {
          transformedActivities.push({
            id: entry.id,
            time: entry.changed_at,
            timeFormatted: formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true }),
            leadId: entry.item_id || "",
            leadName,
            action: "insert",
            fieldChanged: "New Lead",
            beforeValue: null,
            afterValue: "Created",
            changedBy: entry.changed_by,
          });
        } else if (entry.action === "delete") {
          transformedActivities.push({
            id: entry.id,
            time: entry.changed_at,
            timeFormatted: formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true }),
            leadId: entry.item_id || "",
            leadName,
            action: "delete",
            fieldChanged: "Lead",
            beforeValue: "Existed",
            afterValue: null,
            changedBy: entry.changed_by,
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
            transformedActivities.push({
              id: entry.id + changedFields.indexOf(field),
              time: entry.changed_at,
              timeFormatted: formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true }),
              leadId: entry.item_id || "",
              leadName,
              action: "update",
              fieldChanged: formatFieldName(field),
              beforeValue: formatValue(beforeData[field]),
              afterValue: formatValue(afterData[field]),
              changedBy: entry.changed_by,
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

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, timeFilter, actionFilter, pipelineStage]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title} - {pipelineStage} Pipeline</span>
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

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No activity found for the selected filters
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium w-[120px]">TIME</th>
                  <th className="text-left py-2 px-3 font-medium w-[150px]">LEAD NAME</th>
                  <th className="text-left py-2 px-3 font-medium w-[150px]">FIELD CHANGED</th>
                  <th className="text-left py-2 px-3 font-medium">BEFORE → AFTER</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr
                    key={`${activity.id}-${index}`}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {activity.timeFormatted}
                    </td>
                    <td className="py-2 px-3 text-sm font-medium">
                      {activity.leadName}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {getActionBadge(activity.action)}
                        <span className="text-xs">{activity.fieldChanged}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {activity.action === "update" ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                            {activity.beforeValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">
                            {activity.afterValue}
                          </span>
                        </div>
                      ) : activity.action === "insert" ? (
                        <span className="text-xs text-green-600">New lead created</span>
                      ) : (
                        <span className="text-xs text-red-600">Lead deleted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
