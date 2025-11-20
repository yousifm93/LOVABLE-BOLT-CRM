import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (fieldData: {
    field_name: string;
    display_name: string;
    description: string;
    section: string;
    field_type: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function AddFieldModal({ open, onOpenChange, onAdd, loading }: AddFieldModalProps) {
  const [fieldName, setFieldName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState("LEAD");
  const [fieldType, setFieldType] = useState("text");

  const handleSubmit = async () => {
    if (!fieldName || !displayName) return;
    
    await onAdd({
      field_name: fieldName,
      display_name: displayName,
      description,
      section,
      field_type: fieldType,
    });
    
    // Reset form
    setFieldName("");
    setDisplayName("");
    setDescription("");
    setSection("LEAD");
    setFieldType("text");
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setFieldName("");
    setDisplayName("");
    setDescription("");
    setSection("LEAD");
    setFieldType("text");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Field</DialogTitle>
          <DialogDescription>
            Create a new custom field for your CRM. All fields are available on all boards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">
                Field Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fieldName"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. middle_name"
              />
              <p className="text-xs text-muted-foreground">
                Database field name (snake_case)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Middle Name"
              />
              <p className="text-xs text-muted-foreground">
                User-friendly label
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Borrower's middle name"
            />
            <p className="text-xs text-muted-foreground">
              Optional description for this field
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD">Lead Info</SelectItem>
                  <SelectItem value="FINANCIAL">Financial</SelectItem>
                  <SelectItem value="PROPERTY">Property</SelectItem>
                  <SelectItem value="OPERATIONS">Operations</SelectItem>
                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                  <SelectItem value="DATES">Dates</SelectItem>
                  <SelectItem value="STATUS">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="datetime">DateTime</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!fieldName || !displayName || loading}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
