import { useState, useEffect } from "react";
import { Bell, Plus, Edit, Trash2, CheckCircle, FileText, Users, Building2, Mail, ClipboardList } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AuditLogEntry {
  id: number;
  table_name: string;
  action: string;
  category: string;
  item_id: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  changed_at: string;
  changed_by: string | null;
  user_name?: string;
}

const getTableIcon = (tableName: string) => {
  switch (tableName) {
    case "leads":
      return <FileText className="h-3 w-3" />;
    case "tasks":
      return <ClipboardList className="h-3 w-3" />;
    case "buyer_agents":
      return <Users className="h-3 w-3" />;
    case "approved_lenders":
      return <Building2 className="h-3 w-3" />;
    case "email_logs":
      return <Mail className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case "insert":
      return <Plus className="h-2.5 w-2.5" />;
    case "update":
      return <Edit className="h-2.5 w-2.5" />;
    case "delete":
      return <Trash2 className="h-2.5 w-2.5" />;
    default:
      return <CheckCircle className="h-2.5 w-2.5" />;
  }
};

const getActionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case "insert":
      return "bg-green-500/20 text-green-600 dark:text-green-400";
    case "update":
      return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    case "delete":
      return "bg-red-500/20 text-red-600 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatTableName = (tableName: string) => {
  const names: Record<string, string> = {
    leads: "lead",
    tasks: "task",
    buyer_agents: "agent",
    approved_lenders: "lender",
    email_logs: "email",
    conditions: "condition",
    borrowers: "borrower",
    documents: "document",
    call_logs: "call log",
    notes: "note",
  };
  return names[tableName] || tableName.replace(/_/g, " ");
};

const getItemName = (entry: AuditLogEntry): string => {
  const data = entry.after_data || entry.before_data;
  if (!data) return "";

  if (data.borrower_name) return data.borrower_name;
  if (data.first_name && data.last_name) return `${data.first_name} ${data.last_name}`;
  if (data.name) return data.name;
  if (data.title) return data.title;
  if (data.subject) return data.subject;
  
  return "";
};

const getActionVerb = (action: string) => {
  switch (action.toLowerCase()) {
    case "insert":
      return "created";
    case "update":
      return "updated";
    case "delete":
      return "deleted";
    default:
      return "modified";
  }
};

export function ActivityPanel() {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: auditData, error } = await supabase
        .from("audit_log")
        .select("*")
        .gte("changed_at", sevenDaysAgo.toISOString())
        .neq("table_name", "email_logs")
        .neq("table_name", "email_field_suggestions")
        .neq("table_name", "email_automation_executions")
        .neq("table_name", "email_campaigns")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const userIds = [...new Set((auditData || []).map(a => a.changed_by).filter(Boolean))];
      
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, auth_user_id, first_name, last_name");
        
        if (users) {
          users.forEach(user => {
            const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";
            if (user.id) userMap[user.id] = name;
            if (user.auth_user_id) userMap[user.auth_user_id] = name;
          });
        }
      }

      const enrichedActivities: AuditLogEntry[] = (auditData || []).map(activity => ({
        ...activity,
        action: activity.action as string,
        before_data: activity.before_data as Record<string, any> | null,
        after_data: activity.after_data as Record<string, any> | null,
        user_name: activity.changed_by ? userMap[activity.changed_by] || "System" : "System",
      }));

      setActivities(enrichedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel("activity-panel-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_log",
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserInitials = (name: string) => {
    if (!name || name === "System") return "S";
    const parts = name.split(" ");
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Activity</h3>
      </div>
      
      <ScrollArea className="flex-1 max-h-[520px]">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-xs text-muted-foreground">Loading...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Bell className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-xs">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => {
              const itemName = getItemName(activity);
              const tableName = formatTableName(activity.table_name);
              const actionVerb = getActionVerb(activity.action);
              
              return (
                <div
                  key={activity.id}
                  className="px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getUserInitials(activity.user_name || "System")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-tight" title={`${activity.user_name || "System"} ${actionVerb} ${tableName}${itemName ? `: ${itemName}` : ''}`}>
                            <span className="font-medium">{activity.user_name || "System"}</span>
                            {" "}{actionVerb} {tableName}
                            {itemName && (
                              <span className="text-muted-foreground block truncate" title={itemName}>
                                {itemName}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className={`shrink-0 p-0.5 rounded ${getActionColor(activity.action)}`}>
                          {getActionIcon(activity.action)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.changed_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
