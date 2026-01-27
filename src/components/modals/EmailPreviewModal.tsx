import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2 } from "lucide-react";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: {
    subject: string;
    htmlContent: string;
    sender: { email: string; name: string };
    toEmails: string[];
    ccEmails: string[];
  } | null;
  onSend: (editedHtml: string) => Promise<void>;
  isSending: boolean;
}

export function EmailPreviewModal({
  open,
  onOpenChange,
  previewData,
  onSend,
  isSending,
}: EmailPreviewModalProps) {
  const [editedContent, setEditedContent] = useState<string>("");

  // Update edited content when preview data changes
  React.useEffect(() => {
    if (previewData?.htmlContent) {
      setEditedContent(previewData.htmlContent);
    }
  }, [previewData?.htmlContent]);

  if (!previewData) return null;

  const handleSend = async () => {
    await onSend(editedContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Email header fields */}
          <div className="grid gap-3">
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-sm text-muted-foreground">From:</Label>
              <Input
                value={`${previewData.sender.name} <${previewData.sender.email}>`}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-sm text-muted-foreground">To:</Label>
              <Input
                value={previewData.toEmails.join(", ")}
                readOnly
                className="bg-muted"
              />
            </div>

            {previewData.ccEmails.length > 0 && (
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <Label className="text-sm text-muted-foreground">CC:</Label>
                <Input
                  value={previewData.ccEmails.join(", ")}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}

            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-sm text-muted-foreground">Subject:</Label>
              <Input value={previewData.subject} readOnly className="bg-muted" />
            </div>
          </div>

          {/* Email body editor */}
          <div className="flex-1 min-h-0">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Email Body (editable):
            </Label>
            <ScrollArea className="h-[350px] border rounded-md">
              <RichTextEditor
                value={editedContent}
                onChange={setEditedContent}
                className="border-0"
              />
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
