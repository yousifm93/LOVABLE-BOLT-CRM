import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  recipient_email: string;
  recipient_type: string;
  cc_email: string | null;
  template_name: string | null;
  subject_sent: string | null;
  is_test_mode: boolean;
  lead: {
    first_name: string;
    last_name: string;
  } | null;
}

interface EmailAutomationExecutionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string;
  automationName: string;
}

export function EmailAutomationExecutionHistoryModal({
  open,
  onOpenChange,
  automationId,
  automationName,
}: EmailAutomationExecutionHistoryModalProps) {
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
      const { data, error } = await supabase
        .from('email_automation_executions')
        .select(`
          id,
          executed_at,
          success,
          error_message,
          recipient_email,
          recipient_type,
          cc_email,
          template_name,
          subject_sent,
          is_test_mode,
          lead:leads(first_name, last_name)
        `)
        .eq('automation_id', automationId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions((data || []) as unknown as ExecutionRecord[]);
    } catch (error) {
      console.error('Error loading execution history:', error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execution History</DialogTitle>
          <DialogDescription>
            Showing recent executions for: <span className="font-medium">{automationName}</span>
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
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution, index) => (
                  <TableRow key={execution.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDateTime(execution.executed_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={execution.success ? 'default' : 'destructive'}>
                          {execution.success ? 'Sent' : 'Failed'}
                        </Badge>
                        {execution.is_test_mode && (
                          <Badge variant="outline" className="text-xs">Test</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {execution.lead 
                        ? `${execution.lead.first_name} ${execution.lead.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{execution.recipient_email}</div>
                      {execution.cc_email && (
                        <div className="text-xs text-muted-foreground">CC: {execution.cc_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {execution.subject_sent || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-destructive max-w-[150px] truncate">
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
