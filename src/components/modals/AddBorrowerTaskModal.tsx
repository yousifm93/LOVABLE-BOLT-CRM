import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddBorrowerTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { task_name: string; task_description: string; priority: number }) => Promise<void>;
}

const PRESET_DOCUMENT_TYPES = [
  { name: "Government-Issued Photo ID", description: "Upload a clear copy of your driver's license, passport, or state ID" },
  { name: "Bank Statements (Last 2 Months)", description: "Complete bank statements for all accounts showing your name and account number" },
  { name: "Pay Stubs (Last 30 Days)", description: "Most recent pay stubs covering the last 30 days of employment" },
  { name: "W-2 Forms (Last 2 Years)", description: "W-2 forms from all employers for the past two years" },
  { name: "Tax Returns (Last 2 Years)", description: "Complete federal tax returns including all schedules" },
  { name: "Proof of Employment", description: "Recent employment verification letter or offer letter" },
  { name: "Proof of Assets", description: "Documentation of stocks, bonds, retirement accounts, or other assets" },
  { name: "Gift Letter", description: "Signed gift letter if receiving gift funds for down payment" },
  { name: "HOA Documents", description: "HOA budget, master insurance, and meeting minutes if applicable" },
  { name: "Other Document", description: "" }
];

export function AddBorrowerTaskModal({ open, onOpenChange, onSubmit }: AddBorrowerTaskModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<string>("1");
  const [submitting, setSubmitting] = useState(false);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const found = PRESET_DOCUMENT_TYPES.find(p => p.name === preset);
    if (found) {
      setTaskName(found.name);
      setTaskDescription(found.description);
    }
  };

  const handleSubmit = async () => {
    if (!taskName.trim()) return;
    
    setSubmitting(true);
    try {
      await onSubmit({
        task_name: taskName.trim(),
        task_description: taskDescription.trim(),
        priority: parseInt(priority, 10)
      });
      
      // Reset form
      setSelectedPreset("");
      setTaskName("");
      setTaskDescription("");
      setPriority("1");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setSelectedPreset("");
      setTaskName("");
      setTaskDescription("");
      setPriority("1");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Document Request</DialogTitle>
          <DialogDescription>
            Create a new document request for the borrower. They will see this in their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a document type..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_DOCUMENT_TYPES.map(preset => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-name">Request Title</Label>
            <Input
              id="task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter document request title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Instructions for Borrower</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe what documents the borrower should upload..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">High Priority</SelectItem>
                <SelectItem value="2">Medium Priority</SelectItem>
                <SelectItem value="3">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!taskName.trim() || submitting}
          >
            {submitting ? "Creating..." : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
