import React, { useState } from 'react';
import { useApplication, CoBorrower } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CoBorrowersFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const CoBorrowersForm: React.FC<CoBorrowersFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCoBorrower, setNewCoBorrower] = useState<Partial<CoBorrower>>({
    type: 'spouse',
    firstName: '',
    middleName: '',
    lastName: '',
  });

  const addCoBorrower = () => {
    if (!newCoBorrower.firstName || !newCoBorrower.lastName) {
      toast({
        title: 'Required fields missing',
        description: 'Please enter first and last name',
        variant: 'destructive',
      });
      return;
    }

    const coBorrower: CoBorrower = {
      id: Date.now().toString(),
      type: newCoBorrower.type as 'spouse' | 'other',
      firstName: newCoBorrower.firstName,
      middleName: newCoBorrower.middleName || '',
      lastName: newCoBorrower.lastName,
      suffix: '',
      hasAlternateNames: false,
      hasNickname: false,
      email: '',
      cellPhone: '',
      workPhone: '',
      workPhoneExt: '',
      homePhone: '',
      emailShared: false,
      canCompleteOnBehalf: false,
      continueFillingInfo: false,
    };

    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'coBorrowers',
        data: { ...data.coBorrowers, coBorrowers: [...data.coBorrowers.coBorrowers, coBorrower] },
      },
    });

    setNewCoBorrower({
      type: 'spouse',
      firstName: '',
      middleName: '',
      lastName: '',
    });
    setShowAddDialog(false);

    toast({
      title: 'Co-borrower added',
      description: `${coBorrower.firstName} ${coBorrower.lastName} has been added`,
    });
  };

  const removeCoBorrower = (id: string) => {
    const updated = data.coBorrowers.coBorrowers.filter((cb) => cb.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'coBorrowers', data: { ...data.coBorrowers, coBorrowers: updated } },
    });

    toast({
      title: 'Co-borrower removed',
      description: 'The co-borrower has been removed from the application',
    });
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Co-Borrowers</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Co-Borrower Information
          </CardTitle>
          <CardDescription>
            Add anyone who will be applying for this loan with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.coBorrowers.coBorrowers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No co-borrowers added yet</p>
              <p className="text-sm mt-1">Click the button below to add a co-borrower</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.coBorrowers.coBorrowers.map((coBorrower) => (
                <Card key={coBorrower.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {coBorrower.firstName} {coBorrower.middleName} {coBorrower.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">{coBorrower.type}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCoBorrower(coBorrower.id)}
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
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Co-Borrower
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Save & Continue
        </Button>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Co-Borrower</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={newCoBorrower.type}
                onValueChange={(value) => setNewCoBorrower({ ...newCoBorrower, type: value as 'spouse' | 'other' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                value={newCoBorrower.firstName}
                onChange={(e) => setNewCoBorrower({ ...newCoBorrower, firstName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                value={newCoBorrower.middleName}
                onChange={(e) => setNewCoBorrower({ ...newCoBorrower, middleName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                value={newCoBorrower.lastName}
                onChange={(e) => setNewCoBorrower({ ...newCoBorrower, lastName: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addCoBorrower}>
                Add Co-Borrower
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
