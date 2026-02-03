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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { Building } from "lucide-react";

interface CreateCondoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCondoCreated: () => void;
}

const reviewTypeOptions = [
  { value: "Non-QM Limited", label: "Non-QM Limited" },
  { value: "Non-QM Full", label: "Non-QM Full" },
  { value: "Conventional Limited", label: "Conventional Limited" },
  { value: "Conventional Full", label: "Conventional Full" },
  { value: "Restricted", label: "Restricted" },
];

export function CreateCondoModal({
  open,
  onOpenChange,
  onCondoCreated,
}: CreateCondoModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    condo_name: "",
    street_address: "",
    city: "",
    state: "",
    zip: "",
    source_uwm: false,
    source_ad: false,
    source_prmg: false,
    review_type: "",
  });

  const resetForm = () => {
    setFormData({
      condo_name: "",
      street_address: "",
      city: "",
      state: "",
      zip: "",
      source_uwm: false,
      source_ad: false,
      source_prmg: false,
      review_type: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.condo_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Condo name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await databaseService.createCondo({
        condo_name: formData.condo_name,
        street_address: formData.street_address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        source_uwm: formData.source_uwm,
        source_ad: formData.source_ad,
        source_prmg: formData.source_prmg,
        review_type: formData.review_type || null,
      });

      toast({
        title: "Success",
        description: "Condo created successfully",
      });

      resetForm();
      onOpenChange(false);
      onCondoCreated();
    } catch (error) {
      console.error("Error creating condo:", error);
      toast({
        title: "Error",
        description: "Failed to create condo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Add New Condo
          </DialogTitle>
          <DialogDescription>
            Enter the condominium details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Condo Name */}
          <div className="space-y-2">
            <Label htmlFor="condo_name">
              Condo Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="condo_name"
              value={formData.condo_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, condo_name: e.target.value }))
              }
              placeholder="e.g., Brickell Heights"
              autoFocus
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="street_address">Street Address</Label>
            <Input
              id="street_address"
              value={formData.street_address}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  street_address: e.target.value,
                }))
              }
              placeholder="e.g., 45 SW 9th Street"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="Miami"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, state: e.target.value }))
                }
                placeholder="FL"
                maxLength={2}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="zip">Zip Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, zip: e.target.value }))
                }
                placeholder="33130"
              />
            </div>
          </div>

          {/* Approval Sources */}
          <div className="space-y-3">
            <Label>Approval Sources</Label>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="source_uwm"
                  checked={formData.source_uwm}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, source_uwm: checked }))
                  }
                />
                <Label htmlFor="source_uwm" className="font-normal cursor-pointer">
                  UWM Approved
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="source_ad"
                  checked={formData.source_ad}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, source_ad: checked }))
                  }
                />
                <Label htmlFor="source_ad" className="font-normal cursor-pointer">
                  A&D Approved
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="source_prmg"
                  checked={formData.source_prmg}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, source_prmg: checked }))
                  }
                />
                <Label htmlFor="source_prmg" className="font-normal cursor-pointer">
                  PRMG Approved
                </Label>
              </div>
            </div>
          </div>

          {/* Review Type */}
          <div className="space-y-2">
            <Label htmlFor="review_type">Review Type</Label>
            <Select
              value={formData.review_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, review_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select review type" />
              </SelectTrigger>
              <SelectContent>
                {reviewTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Condo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
