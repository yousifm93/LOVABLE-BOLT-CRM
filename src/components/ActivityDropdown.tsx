import { useState, useEffect } from "react";
import { Bell, Plus, Edit, Trash2, CheckCircle, FileText, Users, Building2, Mail, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";

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
      return <FileText className="h-3.5 w-3.5" />;
    case "tasks":
      return <ClipboardList className="h-3.5 w-3.5" />;
    case "buyer_agents":
      return <Users className="h-3.5 w-3.5" />;
    case "approved_lenders":
      return <Building2 className="h-3.5 w-3.5" />;
    case "email_logs":
      return <Mail className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
};

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case "insert":
      return <Plus className="h-3 w-3" />;
    case "update":
      return <Edit className="h-3 w-3" />;
    case "delete":
      return <Trash2 className="h-3 w-3" />;
    default:
      return <CheckCircle className="h-3 w-3" />;
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

  // Try common name fields
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

export function ActivityDropdown() {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [recentCount, setRecentCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchActivities = async () => {
    try {
      // Get activities from last 7 days, limit to 50
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: auditData, error } = await supabase
        .from("audit_log")
        .select("*")
        .gte("changed_at", sevenDaysAgo.toISOString())
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set((auditData || []).map(a => a.changed_by).filter(Boolean))];
      
      // Fetch user names
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
      
      // Count activities in last 24 hours for badge
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recent = enrichedActivities.filter(
        a => new Date(a.changed_at) > oneDayAgo
      ).length;
      setRecentCount(recent);
      
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lazy load: only fetch when dropdown is opened for the first time
  useEffect(() => {
    if (open && !hasLoaded) {
      fetchActivities();
      setHasLoaded(true);
    }
  }, [open, hasLoaded]);

  // Set up real-time subscription only after first load
  useEffect(() => {
    if (!hasLoaded) return;

    const channel = supabase
      .channel("audit-log-changes")
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
  }, [hasLoaded]);

  const getUserInitials = (name: string) => {
    if (!name || name === "System") return "S";
    const parts = name.split(" ");
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
            <Bell className="h-4 w-4" />
            {recentCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {recentCount > 9 ? "9+" : recentCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Activity Feed</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => {
                setOpen(false);
                setShowFullModal(true);
              }}
            >
              View All
            </Button>
          </div>
          
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
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
                      className="px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getUserInitials(activity.user_name || "System")}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug">
                                <span className="font-medium">{activity.user_name || "System"}</span>
                                {" "}{actionVerb} a {tableName}
                                {itemName && (
                                  <span className="text-muted-foreground">: {itemName}</span>
                                )}
                              </p>
                            </div>
                            <div className={`shrink-0 p-1 rounded ${getActionColor(activity.action)}`}>
                              {getActionIcon(activity.action)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getTableIcon(activity.table_name)}
                              <span className="capitalize">{tableName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
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
        </PopoverContent>
      </Popover>

      <ActivityLogModal
        isOpen={showFullModal}
        onClose={() => setShowFullModal(false)}
      />
    </>
  );
}
