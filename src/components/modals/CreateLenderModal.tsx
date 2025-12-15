import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { databaseService } from "@/services/database";

interface CreateLenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLenderCreated: () => void;
  defaultStatus?: "Active" | "Pending";
}

const LENDER_TYPES = ["Correspondent", "Retail", "Warehouse", "Wholesale"];

export function CreateLenderModal({ open, onOpenChange, onLenderCreated, defaultStatus = "Pending" }: CreateLenderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    lender_name: "",
    lender_type: "",
    ae_first_name: "",
    ae_last_name: "",
    ae_email: "",
    ae_phone: ""
  });

  const resetForm = () => {
    setFormData({
      lender_name: "",
      lender_type: "",
      ae_first_name: "",
      ae_last_name: "",
      ae_email: "",
      ae_phone: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lender_name.trim()) {
      toast.error("Lender name is required");
      return;
    }

    setIsLoading(true);
    try {
      const accountExecutive = [formData.ae_first_name, formData.ae_last_name]
        .filter(Boolean)
        .join(" ");

      await databaseService.createLender({
        lender_name: formData.lender_name.trim(),
        lender_type: formData.lender_type || null,
        account_executive: accountExecutive || null,
        account_executive_email: formData.ae_email.trim() || null,
        account_executive_phone: formData.ae_phone.trim() || null,
        status: defaultStatus
      });

      toast.success("Lender created successfully");
      resetForm();
      onOpenChange(false);
      onLenderCreated();
    } catch (error) {
      console.error("Error creating lender:", error);
      toast.error("Failed to create lender");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lender</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lender_name">Lender Name *</Label>
            <Input
              id="lender_name"
              value={formData.lender_name}
              onChange={(e) => setFormData({ ...formData, lender_name: e.target.value })}
              placeholder="e.g., United Wholesale Mortgage"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lender_type">Lender Type</Label>
            <Select
              value={formData.lender_type}
              onValueChange={(value) => setFormData({ ...formData, lender_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LENDER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Account Executive</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ae_first_name">First Name</Label>
                <Input
                  id="ae_first_name"
                  value={formData.ae_first_name}
                  onChange={(e) => setFormData({ ...formData, ae_first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ae_last_name">Last Name</Label>
                <Input
                  id="ae_last_name"
                  value={formData.ae_last_name}
                  onChange={(e) => setFormData({ ...formData, ae_last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ae_email">AE Email</Label>
            <Input
              id="ae_email"
              type="email"
              value={formData.ae_email}
              onChange={(e) => setFormData({ ...formData, ae_email: e.target.value })}
              placeholder="ae@lender.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ae_phone">AE Phone</Label>
            <Input
              id="ae_phone"
              type="tel"
              value={formData.ae_phone}
              onChange={(e) => setFormData({ ...formData, ae_phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Lender"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
