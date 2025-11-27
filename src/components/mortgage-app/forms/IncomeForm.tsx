import React, { useState } from 'react';
import { useApplication, EmploymentIncome, OtherIncome } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, X, Briefcase, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IncomeFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const IncomeForm: React.FC<IncomeFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();
  const [showEmploymentDialog, setShowEmploymentDialog] = useState(false);
  const [showOtherIncomeDialog, setShowOtherIncomeDialog] = useState(false);
  const [editingEmploymentId, setEditingEmploymentId] = useState<string | null>(null);
  const [editingOtherIncomeId, setEditingOtherIncomeId] = useState<string | null>(null);
  const [newEmployment, setNewEmployment] = useState<Partial<EmploymentIncome>>({
    employmentType: 'W2',
    isCurrentJob: true,
    isPrimaryIncome: false,
    incomeType: 'salary',
  });
  const [newOtherIncome, setNewOtherIncome] = useState<Partial<OtherIncome>>({
    type: 'rental',
  });

  const addOrUpdateEmployment = () => {
    if (!newEmployment.employerName) {
      toast({
        title: 'Required field missing',
        description: 'Please enter employer name',
        variant: 'destructive',
      });
      return;
    }

    if (editingEmploymentId) {
      // Update existing
      const updated = data.income.employmentIncomes.map((emp) =>
        emp.id === editingEmploymentId ? { ...emp, ...newEmployment } : emp
      );
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'income', data: { ...data.income, employmentIncomes: updated } },
      });
      toast({ title: 'Employment updated' });
    } else {
      // Add new
      const employment: EmploymentIncome = {
        id: Date.now().toString(),
        employmentType: newEmployment.employmentType || 'W2',
        isCurrentJob: newEmployment.isCurrentJob ?? true,
        isPrimaryIncome: newEmployment.isPrimaryIncome ?? false,
        employerName: newEmployment.employerName || '',
        position: newEmployment.position || '',
        startDate: newEmployment.startDate || '',
        monthlyIncome: newEmployment.monthlyIncome || '',
        workPhone: '',
        workPhoneExt: '',
        officeAddress: '',
        timeSpentYears: '',
        timeSpentMonths: '',
        incomeType: newEmployment.incomeType || 'salary',
        basePay: '',
        bonus: '',
        commissions: '',
        overtime: '',
        other: '',
        frequency: 'monthly',
        hourlyRate: '',
        averageHoursPerWeek: '',
        isSeasonalIncome: false,
        isForeignIncome: false,
        employedByFamilyMember: false,
      };
      dispatch({
        type: 'UPDATE_SECTION',
        payload: {
          section: 'income',
          data: { ...data.income, employmentIncomes: [...data.income.employmentIncomes, employment] },
        },
      });
      toast({ title: 'Employment added' });
    }

    setNewEmployment({ employmentType: 'W2', isCurrentJob: true, isPrimaryIncome: false, incomeType: 'salary' });
    setEditingEmploymentId(null);
    setShowEmploymentDialog(false);
  };

  const openEmploymentDialog = (employment?: EmploymentIncome) => {
    if (employment) {
      setEditingEmploymentId(employment.id);
      setNewEmployment(employment);
    } else {
      setEditingEmploymentId(null);
      setNewEmployment({ employmentType: 'W2', isCurrentJob: true, isPrimaryIncome: false, incomeType: 'salary' });
    }
    setShowEmploymentDialog(true);
  };

  const removeEmployment = (id: string) => {
    const updated = data.income.employmentIncomes.filter((e) => e.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'income',
        data: { ...data.income, employmentIncomes: updated },
      },
    });
  };

  const addOrUpdateOtherIncome = () => {
    if (!newOtherIncome.amount) {
      toast({
        title: 'Required field missing',
        description: 'Please enter income amount',
        variant: 'destructive',
      });
      return;
    }

    if (editingOtherIncomeId) {
      // Update existing
      const updated = data.income.otherIncomes.map((inc) =>
        inc.id === editingOtherIncomeId ? { ...inc, ...newOtherIncome } : inc
      );
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'income', data: { ...data.income, otherIncomes: updated } },
      });
      toast({ title: 'Other income updated' });
    } else {
      // Add new
      const otherIncome: OtherIncome = {
        id: Date.now().toString(),
        type: newOtherIncome.type || 'rental',
        amount: newOtherIncome.amount || '',
      };
      dispatch({
        type: 'UPDATE_SECTION',
        payload: {
          section: 'income',
          data: { ...data.income, otherIncomes: [...data.income.otherIncomes, otherIncome] },
        },
      });
      toast({ title: 'Other income added' });
    }

    setNewOtherIncome({ type: 'rental' });
    setEditingOtherIncomeId(null);
    setShowOtherIncomeDialog(false);
  };

  const openOtherIncomeDialog = (income?: OtherIncome) => {
    if (income) {
      setEditingOtherIncomeId(income.id);
      setNewOtherIncome(income);
    } else {
      setEditingOtherIncomeId(null);
      setNewOtherIncome({ type: 'rental' });
    }
    setShowOtherIncomeDialog(true);
  };

  const handleContinue = () => {
    // Validate 2 years of employment history
    const totalMonths = data.income.employmentIncomes.reduce((sum, emp) => {
      if (!emp.startDate) return sum;
      const startDate = new Date(emp.startDate);
      const endDate = emp.isCurrentJob ? new Date() : new Date();
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      return sum + months;
    }, 0);

    if (totalMonths < 24) {
      toast({
        title: '2 Years of Employment Required',
        description: 'You must have at least 2 years of employment history to continue.',
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  const removeOtherIncome = (id: string) => {
    const updated = data.income.otherIncomes.filter((i) => i.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'income',
        data: { ...data.income, otherIncomes: updated },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Income Information</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Income
          </CardTitle>
          <CardDescription>Add all sources of employment income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.income.employmentIncomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No employment income added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.income.employmentIncomes.map((emp) => (
                <Card key={emp.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openEmploymentDialog(emp)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{emp.employerName}</p>
                        <p className="text-sm text-muted-foreground">{emp.position}</p>
                        <p className="text-sm text-muted-foreground capitalize">{emp.employmentType}</p>
                        {emp.monthlyIncome && <p className="text-sm font-medium">${emp.monthlyIncome}/mo</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmployment(emp.id);
                        }}
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
            onClick={() => openEmploymentDialog()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Other Income
          </CardTitle>
          <CardDescription>Add any additional income sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.income.otherIncomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No other income added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.income.otherIncomes.map((income) => (
                <Card key={income.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openOtherIncomeDialog(income)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{income.type}</p>
                        <p className="text-sm text-muted-foreground">${income.amount}/month</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOtherIncome(income.id);
                        }}
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
            onClick={() => openOtherIncomeDialog()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Other Income
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue}>
          Save & Continue
        </Button>
      </div>

      {/* Employment Dialog */}
      <Dialog open={showEmploymentDialog} onOpenChange={setShowEmploymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmploymentId ? 'Edit Employment' : 'Add Employment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <Select
                value={newEmployment.employmentType}
                onValueChange={(value) => setNewEmployment({ ...newEmployment, employmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W2">W2 Employee</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="1099">1099 Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={newEmployment.isCurrentJob}
                onCheckedChange={(checked) => setNewEmployment({ ...newEmployment, isCurrentJob: !!checked })}
              />
              <Label>This is my current job</Label>
            </div>

            <div className="space-y-2">
              <Label>Employer Name *</Label>
              <Input
                value={newEmployment.employerName}
                onChange={(e) => setNewEmployment({ ...newEmployment, employerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Position/Title</Label>
              <Input
                value={newEmployment.position}
                onChange={(e) => setNewEmployment({ ...newEmployment, position: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={newEmployment.startDate}
                onChange={(e) => setNewEmployment({ ...newEmployment, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Income</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  value={newEmployment.monthlyIncome}
                  onChange={(e) => setNewEmployment({ ...newEmployment, monthlyIncome: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEmploymentDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addOrUpdateEmployment}>
                {editingEmploymentId ? 'Update' : 'Add'} Employment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other Income Dialog */}
      <Dialog open={showOtherIncomeDialog} onOpenChange={setShowOtherIncomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOtherIncomeId ? 'Edit Other Income' : 'Add Other Income'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Income Type *</Label>
              <Select
                value={newOtherIncome.type}
                onValueChange={(value) => setNewOtherIncome({ ...newOtherIncome, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Rental Income</SelectItem>
                  <SelectItem value="investment">Investment Income</SelectItem>
                  <SelectItem value="pension">Pension/Retirement</SelectItem>
                  <SelectItem value="social-security">Social Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monthly Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  value={newOtherIncome.amount}
                  onChange={(e) => setNewOtherIncome({ ...newOtherIncome, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowOtherIncomeDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addOrUpdateOtherIncome}>
                {editingOtherIncomeId ? 'Update' : 'Add'} Income
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
