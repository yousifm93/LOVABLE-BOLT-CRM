import React, { useState } from 'react';
import { useApplication, CoBorrower } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoBorrowersFormProps {
  onNext: () => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

export const CoBorrowersForm: React.FC<CoBorrowersFormProps> = ({ onNext, onBack, isReadOnly = false }) => {
  const { data, dispatch, progressPercentage } = useApplication();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCoBorrower, setNewCoBorrower] = useState<Partial<CoBorrower>>({
    relationship: 'spouse',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const addCoBorrower = () => {
    if (!newCoBorrower.firstName || !newCoBorrower.email || !newCoBorrower.relationship) {
      toast({
        title: 'Required fields missing',
        description: 'Please enter first name, email, and relationship',
        variant: 'destructive',
      });
      return;
    }

    if (newCoBorrower.relationship === 'other' && !newCoBorrower.customRelationship) {
      toast({
        title: 'Required field missing',
        description: 'Please specify the relationship',
        variant: 'destructive',
      });
      return;
    }

    const coBorrower: CoBorrower = {
      id: Date.now().toString(),
      relationship: newCoBorrower.relationship as 'spouse' | 'family' | 'friend' | 'other',
      customRelationship: newCoBorrower.customRelationship,
      firstName: newCoBorrower.firstName!,
      lastName: newCoBorrower.lastName!,
      email: newCoBorrower.email!,
      phone: newCoBorrower.phone!,
    };

    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'coBorrowers',
        data: { ...data.coBorrowers, coBorrowers: [...data.coBorrowers.coBorrowers, coBorrower] },
      },
    });

    setNewCoBorrower({
      relationship: 'spouse',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    setShowAddDialog(false);

    toast({
      title: 'Co-borrower invited',
      description: `An invitation has been sent to ${coBorrower.email}`,
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
    <div className={cn("space-y-6", isReadOnly && "opacity-60 pointer-events-none")}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Co-Borrowers</h2>
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
                          {coBorrower.firstName} {coBorrower.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{coBorrower.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {coBorrower.relationship === 'other' ? coBorrower.customRelationship : coBorrower.relationship}
                        </p>
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

          {!data.coBorrowers.applySolelyByMyself && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Co-Borrower
            </Button>
          )}

          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              checked={data.coBorrowers.applySolelyByMyself}
              onCheckedChange={(checked) => {
                dispatch({
                  type: 'UPDATE_SECTION',
                  payload: {
                    section: 'coBorrowers',
                    data: { ...data.coBorrowers, applySolelyByMyself: !!checked },
                  },
                });
              }}
            />
            <Label>I am applying solely</Label>
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext}>
            Save & Continue
          </Button>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Co-Borrower</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  value={newCoBorrower.firstName}
                  onChange={(e) => setNewCoBorrower({ ...newCoBorrower, firstName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  value={newCoBorrower.lastName}
                  onChange={(e) => setNewCoBorrower({ ...newCoBorrower, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                type="email"
                value={newCoBorrower.email}
                onChange={(e) => setNewCoBorrower({ ...newCoBorrower, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="tel"
                value={newCoBorrower.phone}
                onChange={(e) => setNewCoBorrower({ ...newCoBorrower, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship to you *</Label>
              <Select
                value={newCoBorrower.relationship}
                onValueChange={(value) => setNewCoBorrower({ ...newCoBorrower, relationship: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCoBorrower.relationship === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customRelationship">Please specify *</Label>
                <Input
                  value={newCoBorrower.customRelationship}
                  onChange={(e) => setNewCoBorrower({ ...newCoBorrower, customRelationship: e.target.value })}
                  placeholder="Enter relationship"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addCoBorrower}>
                Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
