import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Plus, Edit, Trash2, User } from "lucide-react";

interface ActivityDetail {
  item_id: string;
  action: string;
  table_name: string;
  changed_at: string;
  changed_by: string | null;
  before_data: any;
  after_data: any;
  display_name: string;
  fields_changed: string[];
  user_first_name: string | null;
  user_last_name: string | null;
}

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityDetail | null;
}

const actionColors = {
  insert: "bg-success text-success-foreground",
  update: "bg-info text-info-foreground", 
  delete: "bg-destructive text-destructive-foreground"
};

const actionIcons = {
  insert: Plus,
  update: Edit,
  delete: Trash2
};

const formatFieldName = (field: string): string => {
  return field
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export function ActivityDetailModal({ isOpen, onClose, activity }: ActivityDetailModalProps) {
  if (!activity) return null;

  const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons];
  const isInsert = activity.action === 'insert';
  const isDelete = activity.action === 'delete';
  const isUpdate = activity.action === 'update';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={actionColors[activity.action as keyof typeof actionColors]}>
              <ActionIcon className="h-3 w-3 mr-1" />
              {activity.action.toUpperCase()}
            </Badge>
            {activity.display_name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {format(new Date(activity.changed_at), 'MMM d, yyyy h:mm a')}
            {activity.user_first_name && (
              <span className="ml-2">
                by {activity.user_first_name} {activity.user_last_name}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* INSERT: Show only new data */}
            {isInsert && activity.after_data && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-success">New Record Created</h4>
                <div className="space-y-2">
                  {Object.entries(activity.after_data)
                    .filter(([key]) => !['id', 'created_at', 'updated_at', 'account_id'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 p-2 rounded bg-success/10">
                        <div className="text-sm font-medium">{formatFieldName(key)}</div>
                        <div className="col-span-2 text-sm">{formatValue(value)}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* DELETE: Show deleted data */}
            {isDelete && activity.before_data && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-destructive">Record Deleted</h4>
                <div className="space-y-2">
                  {Object.entries(activity.before_data)
                    .filter(([key]) => !['id', 'created_at', 'updated_at', 'account_id'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 p-2 rounded bg-destructive/10">
                        <div className="text-sm font-medium">{formatFieldName(key)}</div>
                        <div className="col-span-2 text-sm line-through">{formatValue(value)}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* UPDATE: Show before/after comparison */}
            {isUpdate && activity.fields_changed && activity.fields_changed.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-info">
                  {activity.fields_changed.length} Field{activity.fields_changed.length !== 1 ? 's' : ''} Changed
                </h4>
                <div className="space-y-3">
                  {activity.fields_changed
                    .filter(field => !['id', 'created_at', 'updated_at', 'account_id'].includes(field))
                    .map((field) => {
                      const beforeValue = activity.before_data?.[field];
                      const afterValue = activity.after_data?.[field];
                      return (
                        <div key={field} className="border rounded-lg p-3 bg-card">
                          <div className="text-sm font-semibold mb-2">{formatFieldName(field)}</div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Before */}
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Before</div>
                              <div className="p-2 rounded bg-destructive/10 text-sm">
                                {formatValue(beforeValue)}
                              </div>
                            </div>
                            {/* After */}
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">After</div>
                              <div className="p-2 rounded bg-success/10 text-sm font-medium">
                                {formatValue(afterValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* No changes detected */}
            {isUpdate && (!activity.fields_changed || activity.fields_changed.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                No field changes detected
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
