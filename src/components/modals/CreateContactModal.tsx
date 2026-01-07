import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";

interface CreateContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: (contact: any) => void;
  defaultType?: 'agent' | 'borrower' | 'lender';
  defaultStatus?: string;
}

export function CreateContactModal({ open, onOpenChange, onContactCreated, defaultType = 'borrower', defaultStatus = 'Active' }: CreateContactModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    type: "Agent" | "Borrower" | "Other" | "Prospect" | "Lender" | "Title Company" | "Insurance Agent" | "Appraiser" | "Referral Source" | "Third Party";
    notes: string;
  }>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    type: defaultType === 'agent' ? 'Agent' : defaultType === 'borrower' ? 'Borrower' : defaultType === 'lender' ? 'Lender' : 'Other',
    notes: ""
  });

  const resetForm = () => {
    const mappedType = defaultType === 'agent' ? 'Agent' : defaultType === 'borrower' ? 'Borrower' : defaultType === 'lender' ? 'Lender' : 'Other';
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      type: mappedType,
      notes: ""
    });
  };

  useEffect(() => {
    if (open) {
      const mappedType = defaultType === 'agent' ? 'Agent' : defaultType === 'borrower' ? 'Borrower' : defaultType === 'lender' ? 'Lender' : 'Other';
      setFormData(prev => ({ ...prev, type: mappedType }));
    }
  }, [open, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        toast({
          title: "Validation Error",
          description: "First name and last name are required.",
          variant: "destructive"
        });
        return;
      }

      let contact;
      
      // If Agent, insert into buyer_agents table
      if (formData.type === 'Agent' || defaultType === 'agent') {
        contact = await databaseService.createBuyerAgent({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          brokerage: formData.company || null,
          notes: formData.notes || null,
        });
      }
      // If Lender, insert into lenders table
      else if (formData.type === 'Lender') {
        contact = await databaseService.createLender({
          lender_name: formData.company || 'Unknown Lender',
          account_executive: `${formData.first_name} ${formData.last_name}`,
          account_executive_email: formData.email || null,
          account_executive_phone: formData.phone || null,
          status: defaultStatus,
        });
      }
      // Otherwise insert into contacts table
      else {
        contact = await databaseService.createContact({
          ...formData,
          type: formData.type as any // Type assertion for compatibility with database
        });
      }
      
      onContactCreated(contact);
      onOpenChange(false);
      resetForm();
      
      toast({
        title: "Success",
        description: `${formData.type} contact created successfully.`
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      console.error('Form data:', formData);
      console.error('Default type:', defaultType);
      toast({
        title: "Error",
        description: error?.message || "Failed to create contact. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add New {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!defaultType && (
            <div className="space-y-2">
              <Label htmlFor="type">Contact Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Borrower">Borrower</SelectItem>
                  <SelectItem value="Agent">Real Estate Agent</SelectItem>
                  <SelectItem value="Lender">Lender</SelectItem>
                  <SelectItem value="Title Company">Title Company</SelectItem>
                  <SelectItem value="Insurance Agent">Insurance Agent</SelectItem>
                  <SelectItem value="Appraiser">Appraiser</SelectItem>
                  <SelectItem value="Referral Source">Referral Source</SelectItem>
                  <SelectItem value="Third Party">Third Party</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.smith@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {formData.type === 'Agent' && (
            <div className="space-y-2">
              <Label htmlFor="brokerage">Brokerage</Label>
              <Input
                id="brokerage"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Brokerage Name"
              />
            </div>
          )}

          {formData.type === 'Lender' && (
            <div className="space-y-2">
              <Label htmlFor="lender_name">Lender Name</Label>
              <Input
                id="lender_name"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Lender Company Name"
              />
            </div>
          )}

          {!['Agent', 'Lender'].includes(formData.type) && (
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Company Name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}