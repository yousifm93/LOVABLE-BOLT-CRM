import React, { useState } from 'react';
import { useApplication, Property } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, X, Building } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RealEstateFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const RealEstateForm: React.FC<RealEstateFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();
  const [showDialog, setShowDialog] = useState(false);
  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    propertyUsage: 'primary',
    propertyStatus: 'own',
  });

  const addProperty = () => {
    if (!newProperty.address) {
      toast({
        title: 'Required field missing',
        description: 'Please enter property address',
        variant: 'destructive',
      });
      return;
    }

    const property: Property = {
      id: Date.now().toString(),
      address: newProperty.address,
      propertyValue: newProperty.propertyValue || '',
      propertyUsage: newProperty.propertyUsage || 'primary',
      propertyStatus: newProperty.propertyStatus || 'own',
      propertyType: newProperty.propertyType || '',
      monthlyExpenses: newProperty.monthlyExpenses || '',
    };

    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'realEstate',
        data: [...data.realEstate, property],
      },
    });

    setNewProperty({
      propertyUsage: 'primary',
      propertyStatus: 'own',
    });
    setShowDialog(false);

    toast({
      title: 'Property added',
      description: 'Your property has been added',
    });
  };

  const removeProperty = (id: string) => {
    const updated = data.realEstate.filter((p) => p.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'realEstate', data: updated },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Real Estate Owned</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Your Properties
          </CardTitle>
          <CardDescription>Add any real estate properties you currently own</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.realEstate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No properties added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.realEstate.map((property) => (
                <Card key={property.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{property.address}</p>
                        <p className="text-sm text-muted-foreground capitalize">{property.propertyUsage}</p>
                        {property.propertyValue && (
                          <p className="text-sm font-medium">${property.propertyValue}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProperty(property.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Save & Continue
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Property Address *</Label>
              <Input
                value={newProperty.address}
                onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>

            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select
                value={newProperty.propertyType}
                onValueChange={(value) => setNewProperty({ ...newProperty, propertyType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-family">Single Family</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="condo">Condominium</SelectItem>
                  <SelectItem value="multi-family">Multi-Family</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property Usage</Label>
              <Select
                value={newProperty.propertyUsage}
                onValueChange={(value) => setNewProperty({ ...newProperty, propertyUsage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Residence</SelectItem>
                  <SelectItem value="second-home">Second Home</SelectItem>
                  <SelectItem value="rental">Rental Property</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property Value</Label>
              <Input
                value={newProperty.propertyValue}
                onChange={(e) => setNewProperty({ ...newProperty, propertyValue: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Expenses (Mortgage, HOA, etc.)</Label>
              <Input
                value={newProperty.monthlyExpenses}
                onChange={(e) => setNewProperty({ ...newProperty, monthlyExpenses: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addProperty}>
                Add Property
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
