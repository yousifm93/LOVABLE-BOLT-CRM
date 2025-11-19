import { useState, useEffect } from 'react';
import { databaseService } from '@/services/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

interface ExecutionRecord {
  id: string;
  executed_at: string;
  success: boolean;
  error_message: string | null;
  lead: {
    first_name: string;
    last_name: string;
  } | null;
  task: {
    title: string;
  } | null;
}

interface TaskAutomationExecutionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string;
  automationName: string;
}

export function TaskAutomationExecutionHistoryModal({
  open,
  onOpenChange,
  automationId,
  automationName,
}: TaskAutomationExecutionHistoryModalProps) {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && automationId) {
      loadExecutions();
    }
  }, [open, automationId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getTaskAutomationExecutions(automationId);
      setExecutions(data || []);
    } catch (error) {
      console.error('Error loading execution history:', error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execution History</DialogTitle>
          <DialogDescription>
            Showing all executions for: <span className="font-medium">{automationName}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            This automation has not run yet
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Ran At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Task Created</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution, index) => (
                  <TableRow key={execution.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(execution.executed_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={execution.success ? 'default' : 'destructive'}>
                        {execution.success ? 'Success' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {execution.lead 
                        ? `${execution.lead.first_name} ${execution.lead.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {execution.task?.title || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {execution.error_message || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
