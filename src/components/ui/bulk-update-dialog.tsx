import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onUpdate: (field: string, value: any) => Promise<void>;
  fieldOptions: { value: string; label: string; type: string; options?: { value: string; label: string }[] }[];
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  onUpdate,
  fieldOptions,
}: BulkUpdateDialogProps) {
  const [selectedField, setSelectedField] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedFieldConfig = fieldOptions.find(f => f.value === selectedField);

  const handleUpdate = async () => {
    if (!selectedField || !value) return;

    setIsUpdating(true);
    try {
      await onUpdate(selectedField, value);
      onOpenChange(false);
      setSelectedField("");
      setValue("");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedCount} Leads</DialogTitle>
          <DialogDescription>
            Select a field to update and enter the new value for all selected leads.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="field">Field to Update</Label>
            <Select value={selectedField} onValueChange={(val) => {
              setSelectedField(val);
              setValue("");
            }}>
              <SelectTrigger id="field">
                <SelectValue placeholder="Select a field" />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField && selectedFieldConfig && (
            <div className="grid gap-2">
              <Label htmlFor="value">New Value</Label>
              {selectedFieldConfig.type === 'select' && selectedFieldConfig.options ? (
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger id="value">
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFieldConfig.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter new value"
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={!selectedField || !value || isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {selectedCount} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
