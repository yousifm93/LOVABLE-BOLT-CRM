import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface MissingField {
  tag: string;
  label: string;
}

interface MissingMergeTagsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: MissingField[];
}

export function MissingMergeTagsModal({
  open,
  onOpenChange,
  missingFields,
}: MissingMergeTagsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Missing Information
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Before you can send this email, please fill in the following fields:
          </p>
          
          <ul className="space-y-2">
            {missingFields.map((field) => (
              <li 
                key={field.tag} 
                className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md"
              >
                <span className="w-2 h-2 rounded-full bg-destructive" />
                {field.label}
              </li>
            ))}
          </ul>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
