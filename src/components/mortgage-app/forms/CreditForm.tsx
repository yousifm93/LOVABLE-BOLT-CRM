import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface CreditFormProps {
  onNext: () => void;
  onBack: () => void;
}

const creditScoreRanges = [
  { value: '300-579', label: '300-579 (Poor)' },
  { value: '580-669', label: '580-669 (Fair)' },
  { value: '670-739', label: '670-739 (Good)' },
  { value: '740-799', label: '740-799 (Very Good)' },
  { value: '800-850', label: '800-850 (Excellent)' },
];

export const CreditForm: React.FC<CreditFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const form = useForm({
    defaultValues: data.credit,
  });

  const { register, watch, setValue, formState: { errors }, handleSubmit } = form;

  useEffect(() => {
    const subscription = form.watch((value) => {
      // Calculate age from date of birth
      if (value.dateOfBirth) {
        const birthDate = new Date(value.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        value.age = age.toString();
      }

      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'credit', data: value },
      });
    });
    return () => subscription.unsubscribe();
  }, [form, dispatch]);

  const onSubmit = (formData: any) => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'credit', data: formData },
    });
    onNext();
  };

  const formatSSN = (value: string) => {
    const ssn = value.replace(/\D/g, '');
    if (ssn.length <= 3) return ssn;
    if (ssn.length <= 5) return `${ssn.slice(0, 3)}-${ssn.slice(3)}`;
    return `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5, 9)}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Credit Information</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Personal Identification
          </CardTitle>
          <CardDescription>This information is required for credit verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              {...register('dateOfBirth', { required: 'Date of birth is required' })}
              type="date"
            />
            {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
            {data.credit.age && (
              <p className="text-sm text-muted-foreground">Age: {data.credit.age}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialSecurityNumber">Social Security Number *</Label>
            <Input
              {...register('socialSecurityNumber', { required: 'SSN is required' })}
              onChange={(e) => {
                const formatted = formatSSN(e.target.value);
                setValue('socialSecurityNumber', formatted);
              }}
              maxLength={11}
              type="password"
            />
            {errors.socialSecurityNumber && (
              <p className="text-sm text-destructive">{errors.socialSecurityNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmSocialSecurityNumber">Confirm Social Security Number *</Label>
            <Input
              {...register('confirmSocialSecurityNumber', {
                required: 'Please confirm your SSN',
                validate: (value) => value === watch('socialSecurityNumber') || 'SSN does not match',
              })}
              onChange={(e) => {
                const formatted = formatSSN(e.target.value);
                setValue('confirmSocialSecurityNumber', formatted);
              }}
              maxLength={11}
              type="password"
            />
            {errors.confirmSocialSecurityNumber && (
              <p className="text-sm text-destructive">{errors.confirmSocialSecurityNumber.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Score</CardTitle>
          <CardDescription>Please estimate your current credit score range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Estimated Credit Score *</Label>
            <Select
              value={watch('estimatedCreditScore')}
              onValueChange={(value) => setValue('estimatedCreditScore', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select credit score range" />
              </SelectTrigger>
              <SelectContent>
                {creditScoreRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 inline mr-2" />
                Security Notice: Your application and all personal information are safely stored on secured encrypted
                servers.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          Save & Continue
        </Button>
      </div>
    </form>
  );
};
