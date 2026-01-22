import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface DocumentRejectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  onConfirm: (notes: string) => void;
}

export function DocumentRejectionModal({ 
  open, 
  onOpenChange, 
  documentName, 
  onConfirm 
}: DocumentRejectionModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!notes.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(notes.trim());
      setNotes('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reject Document
          </DialogTitle>
          <DialogDescription>
            Please explain why <span className="font-medium">"{documentName}"</span> is being rejected. 
            This feedback will be shared with the borrower so they know what to fix.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea 
            placeholder="e.g., Please upload a clearer copy of the document. The current image is blurry and text is not readable." 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what needs to be corrected so the borrower can resubmit properly.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!notes.trim() || isSubmitting}
          >
            {isSubmitting ? 'Rejecting...' : 'Reject & Request Revision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
