export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Open' | 'Done' | 'Deferred';

export interface TaskCreationLogEntry {
  at: string;
  by: string | null;
  event: 'created' | 'updated' | 'status_changed' | 'reassigned' | 'priority_changed';
  from?: any;
  to?: any;
}

export interface TaskFormData {
  name: string;
  borrower_id: string | null;
  priority: TaskPriority;
  task_order: number;
  assigned_to: string | null;
  due_date: string | null;
  status: TaskStatus;
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  Open: 'Open',
  Done: 'Done',
  Deferred: 'Deferred'
};