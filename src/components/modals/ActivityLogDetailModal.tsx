import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ActivityLogDetailModalProps {
  log: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogDetailModal({ log, isOpen, onClose }: ActivityLogDetailModalProps) {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {log.log_type === 'meeting' ? '🤝 Meeting Details' : log.log_type === 'broker_open' ? '📅 Broker\'s Open Details' : '📞 Call Details'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {log.log_type === 'broker_open' ? 'Date' : 'Date & Time'}
            </label>
            <p className="text-sm text-muted-foreground">
              {log.log_type === 'broker_open' 
                ? new Date(log.logged_at).toLocaleDateString() 
                : new Date(log.logged_at).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Logged By</label>
            <p className="text-sm text-muted-foreground">
              {log.users?.first_name} {log.users?.last_name}
            </p>
          </div>
          {log.meeting_location && (
            <div>
              <label className="text-sm font-medium">Location</label>
              <p className="text-sm text-muted-foreground">{log.meeting_location}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Summary</label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {log.summary}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
