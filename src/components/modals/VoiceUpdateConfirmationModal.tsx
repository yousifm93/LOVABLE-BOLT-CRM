import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Check, X, ListTodo, Edit3 } from "lucide-react";

interface FieldUpdate {
  field: string;
  fieldLabel: string;
  currentValue: string | number | null;
  newValue: string | number;
}

interface TaskSuggestion {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
}

interface VoiceUpdateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedUpdates: FieldUpdate[];
  taskSuggestions: TaskSuggestion[];
  onApplyFieldUpdates: (selectedUpdates: FieldUpdate[]) => void;
  onCreateTasks: (selectedTasks: TaskSuggestion[]) => void;
}

export function VoiceUpdateConfirmationModal({
  isOpen,
  onClose,
  detectedUpdates,
  taskSuggestions,
  onApplyFieldUpdates,
  onCreateTasks,
}: VoiceUpdateConfirmationModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Record<number, boolean>>({});
  const [editableTasks, setEditableTasks] = useState<TaskSuggestion[]>([]);

  // Initialize selections when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialFields: Record<string, boolean> = {};
      detectedUpdates.forEach((update) => {
        initialFields[update.field] = true;
      });
      setSelectedFields(initialFields);

      const initialTasks: Record<number, boolean> = {};
      taskSuggestions.forEach((_, index) => {
        initialTasks[index] = true;
      });
      setSelectedTasks(initialTasks);
      setEditableTasks([...taskSuggestions]);
    }
  }, [isOpen, detectedUpdates, taskSuggestions]);

  const handleToggleField = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleToggleTask = (index: number) => {
    setSelectedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleTaskEdit = (index: number, field: keyof TaskSuggestion, value: string) => {
    setEditableTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApply = () => {
    // Apply field updates
    const selectedFieldUpdates = detectedUpdates.filter(
      (update) => selectedFields[update.field]
    );
    if (selectedFieldUpdates.length > 0) {
      onApplyFieldUpdates(selectedFieldUpdates);
    }

    // Create selected tasks
    const selectedTaskList = editableTasks.filter((_, index) => selectedTasks[index]);
    if (selectedTaskList.length > 0) {
      onCreateTasks(selectedTaskList);
    }

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const formatValue = (value: string | number | null): string => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    return String(value);
  };

  const selectedFieldCount = Object.values(selectedFields).filter(Boolean).length;
  const selectedTaskCount = Object.values(selectedTasks).filter(Boolean).length;
  const totalSelected = selectedFieldCount + selectedTaskCount;

  const hasFieldUpdates = detectedUpdates.length > 0;
  const hasTaskSuggestions = taskSuggestions.length > 0;
  const defaultTab = hasFieldUpdates ? "fields" : "tasks";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Voice Updates Detected
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Fields ({detectedUpdates.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks ({taskSuggestions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="py-4">
            {detectedUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No field updates detected in your recording.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which field updates to apply:
                </p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {detectedUpdates.map((update) => (
                    <div
                      key={update.field}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selectedFields[update.field]
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={selectedFields[update.field] || false}
                        onCheckedChange={() => handleToggleField(update.field)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{update.fieldLabel}</div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="text-muted-foreground truncate">
                            {formatValue(update.currentValue)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-primary font-medium truncate">
                            {formatValue(update.newValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="py-4">
            {taskSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No task suggestions detected in your recording.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which tasks to create:
                </p>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {editableTasks.map((task, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedTasks[index]
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTasks[index] || false}
                          onCheckedChange={() => handleToggleTask(index)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={task.title}
                              onChange={(e) => handleTaskEdit(index, 'title', e.target.value)}
                              className="h-8"
                              disabled={!selectedTasks[index]}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Due Date</Label>
                              <Input
                                type="date"
                                value={task.dueDate || ''}
                                onChange={(e) => handleTaskEdit(index, 'dueDate', e.target.value)}
                                className="h-8"
                                disabled={!selectedTasks[index]}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Priority</Label>
                              <Select
                                value={task.priority}
                                onValueChange={(value) => handleTaskEdit(index, 'priority', value)}
                                disabled={!selectedTasks[index]}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {task.description && (
                            <div className="space-y-1">
                              <Label className="text-xs">Description</Label>
                              <Input
                                value={task.description}
                                onChange={(e) => handleTaskEdit(index, 'description', e.target.value)}
                                className="h-8"
                                disabled={!selectedTasks[index]}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={totalSelected === 0}>
            <Check className="h-4 w-4 mr-2" />
            Apply {totalSelected > 0 ? `(${totalSelected})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}