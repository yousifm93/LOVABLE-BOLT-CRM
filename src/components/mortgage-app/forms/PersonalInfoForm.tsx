import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { cn } from '@/lib/utils';

interface PersonalInfoFormProps {
  onNext: () => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ onNext, onBack, isReadOnly = false }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const form = useForm({
    defaultValues: data.personalInfo,
    mode: 'onBlur',
  });

  const { register, watch, setValue, formState: { errors }, handleSubmit } = form;

  useEffect(() => {
    const subscription = form.watch((value) => {
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'personalInfo', data: value },
      });
    });
    return () => subscription.unsubscribe();
  }, [form, dispatch]);

  const onSubmit = (formData: any) => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'personalInfo', data: formData },
    });
    onNext();
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", isReadOnly && "opacity-60 pointer-events-none")}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Personal Information</h2>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Borrower Name</CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input {...register('firstName', { required: 'First name is required' })} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input {...register('middleName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input {...register('lastName', { required: 'Last name is required' })} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                type="email"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone *</Label>
              <Input
                {...register('cellPhone', { required: 'Cell phone is required' })}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setValue('cellPhone', formatted);
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={watch('consentToContact')}
              onCheckedChange={(checked) => setValue('consentToContact', !!checked)}
            />
            <Label>I consent to be contacted via phone, text, or email *</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                value={watch('currentAddress')?.street || ''}
                onChange={(e) => setValue('currentAddress', { ...watch('currentAddress'), street: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Address 2</Label>
              <Input
                value={watch('currentAddress')?.unit || ''}
                onChange={(e) => setValue('currentAddress', { ...watch('currentAddress'), unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                value={watch('currentAddress')?.city || ''}
                onChange={(e) => setValue('currentAddress', { ...watch('currentAddress'), city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                value={watch('currentAddress')?.state || ''}
                onChange={(e) => setValue('currentAddress', { ...watch('currentAddress'), state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                value={watch('currentAddress')?.zipCode || ''}
                onChange={(e) => setValue('currentAddress', { ...watch('currentAddress'), zipCode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyOwnership">Do you own or rent? *</Label>
              <Select value={watch('propertyOwnership')} onValueChange={(value) => setValue('propertyOwnership', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="living-rent-free">Living Rent Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsAtCurrentAddress">Years at Address</Label>
              <Input 
                {...register('yearsAtCurrentAddress')} 
                type="number" 
                className="rounded-r-none border-r-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthsAtCurrentAddress">Months at Address</Label>
              <Select
                value={watch('monthsAtCurrentAddress') || ''}
                onValueChange={(value) => setValue('monthsAtCurrentAddress', value)}
              >
                <SelectTrigger className="rounded-l-none">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="residencyType">Residency Type *</Label>
              <Select value={watch('residencyType')} onValueChange={(value) => setValue('residencyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select residency type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-citizen">US Citizen</SelectItem>
                  <SelectItem value="permanent-resident">Permanent Resident</SelectItem>
                  <SelectItem value="non-permanent-resident">Non-Permanent Resident</SelectItem>
                  <SelectItem value="foreign-national">Foreign National</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status *</Label>
              <Select value={watch('maritalStatus')} onValueChange={(value) => setValue('maritalStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="unmarried">Unmarried</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <EnhancedDatePicker
                value={watch('dateOfBirth') ? new Date(watch('dateOfBirth')) : undefined}
                onValueChange={(date) => setValue('dateOfBirth', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Select date of birth"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCreditScore">Estimated Credit Score</Label>
              <Select value={watch('estimatedCreditScore')} onValueChange={(value) => setValue('estimatedCreditScore', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="740-plus">740+</SelectItem>
                  <SelectItem value="700-739">700-739</SelectItem>
                  <SelectItem value="660-699">660-699</SelectItem>
                  <SelectItem value="620-660">620-660</SelectItem>
                  <SelectItem value="below-620">Below 620</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={watch('isUSMilitary')}
              onCheckedChange={(checked) => setValue('isUSMilitary', !!checked)}
            />
            <Label>I am a veteran or currently serving in the military</Label>
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="submit">
            Save & Continue
          </Button>
        </div>
      )}
    </form>
  );
};
