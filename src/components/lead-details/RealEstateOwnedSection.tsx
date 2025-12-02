import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";

interface Property {
  id: string;
  property_address: string;
  property_type: string | null;
  property_usage: string | null;
  property_value: number | null;
  monthly_expenses: number | null;
  monthly_rent: number | null;
  net_income: number | null;
}

interface RealEstateOwnedSectionProps {
  leadId: string;
}

export function RealEstateOwnedSection({ leadId }: RealEstateOwnedSectionProps) {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    property_address: "",
    property_type: "",
    property_usage: "",
    property_value: "",
    monthly_expenses: "",
    monthly_rent: "",
  });

  useEffect(() => {
    loadProperties();
  }, [leadId]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("real_estate_properties")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      console.error("Error loading properties:", error);
      toast({
        title: "Error",
        description: "Failed to load real estate properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProperty(null);
    setFormData({
      property_address: "",
      property_type: "",
      property_usage: "",
      property_value: "",
      monthly_expenses: "",
      monthly_rent: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      property_address: property.property_address,
      property_type: property.property_type || "",
      property_usage: property.property_usage || "",
      property_value: property.property_value?.toString() || "",
      monthly_expenses: property.monthly_expenses?.toString() || "",
      monthly_rent: property.monthly_rent?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.property_address.trim()) {
      toast({
        title: "Validation Error",
        description: "Property address is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData = {
        lead_id: leadId,
        property_address: formData.property_address,
        property_type: formData.property_type || null,
        property_usage: formData.property_usage || null,
        property_value: formData.property_value ? parseFloat(formData.property_value) : null,
        monthly_expenses: formData.monthly_expenses ? parseFloat(formData.monthly_expenses) : null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
      };

      if (editingProperty) {
        const { error } = await supabase
          .from("real_estate_properties")
          .update(propertyData)
          .eq("id", editingProperty.id);

        if (error) throw error;
        toast({ title: "Success", description: "Property updated successfully" });
      } else {
        const { error } = await supabase
          .from("real_estate_properties")
          .insert([propertyData]);

        if (error) throw error;
        toast({ title: "Success", description: "Property added successfully" });
      }

      setIsDialogOpen(false);
      loadProperties();
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save property",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const { error } = await supabase
        .from("real_estate_properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;
      toast({ title: "Success", description: "Property deleted successfully" });
      loadProperties();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const totalNetIncome = properties.reduce((sum, p) => sum + (p.net_income || 0), 0);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading properties...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Real Estate Owned
          </CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Property
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties added yet</p>
        ) : (
          <>
            {properties.map((property) => (
              <div
                key={property.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{property.property_address}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.property_type || "Unknown Type"} • {property.property_usage || "Unknown Usage"}
                    </p>
                    <div className="mt-2 text-sm space-y-1">
                      {property.property_value && (
                        <p>Value: {formatCurrency(property.property_value)}</p>
                      )}
                      <p>
                        Expenses: {formatCurrency(property.monthly_expenses || 0)}/mo
                        {property.monthly_rent && (
                          <> | Rent: {formatCurrency(property.monthly_rent)}/mo</>
                        )}
                      </p>
                      <p className={property.net_income && property.net_income > 0 ? "text-green-600 font-medium" : property.net_income && property.net_income < 0 ? "text-red-600 font-medium" : ""}>
                        Net: {formatCurrency(property.net_income || 0)}/mo {property.net_income && property.net_income > 0 ? "(Income)" : property.net_income && property.net_income < 0 ? "(Expense)" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(property)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t pt-4">
              <p className={`text-sm font-semibold ${totalNetIncome > 0 ? "text-green-600" : totalNetIncome < 0 ? "text-red-600" : ""}`}>
                Total Net: {formatCurrency(totalNetIncome)}/mo
              </p>
            </div>
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? "Edit Property" : "Add Property"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Property Address *</Label>
                <Input
                  value={formData.property_address}
                  onChange={(e) =>
                    setFormData({ ...formData, property_address: e.target.value })
                  }
                  placeholder="Street, City, State, ZIP"
                />
              </div>
              <div>
                <Label>Property Type</Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, property_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Family">Single Family</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Condo">Condo</SelectItem>
                    <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Usage</Label>
                <Select
                  value={formData.property_usage}
                  onValueChange={(value) =>
                    setFormData({ ...formData, property_usage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select usage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                    <SelectItem value="Second Home">Second Home</SelectItem>
                    <SelectItem value="Rental Property">Rental Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Value</Label>
                <Input
                  type="number"
                  value={formData.property_value}
                  onChange={(e) =>
                    setFormData({ ...formData, property_value: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <Label>Monthly Expenses</Label>
                <Input
                  type="number"
                  value={formData.monthly_expenses}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_expenses: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="col-span-2">
                <Label>Monthly Rent (if rental property)</Label>
                <Input
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_rent: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingProperty ? "Update" : "Add"} Property
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
