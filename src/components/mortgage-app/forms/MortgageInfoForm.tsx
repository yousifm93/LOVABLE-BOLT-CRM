import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Home } from 'lucide-react';

interface MortgageInfoFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const MortgageInfoForm: React.FC<MortgageInfoFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const form = useForm({
    defaultValues: data.mortgageInfo,
    mode: 'onBlur',
  });

  const { register, watch, setValue, formState: { errors }, handleSubmit } = form;

  useEffect(() => {
    const subscription = form.watch((value) => {
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'mortgageInfo', data: value },
      });
    });
    return () => subscription.unsubscribe();
  }, [form, dispatch]);

  const onSubmit = (formData: any) => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'mortgageInfo', data: formData },
    });
    onNext();
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const number = parseInt(digits);
    return number.toLocaleString();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mortgage Information</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Details
          </CardTitle>
          <CardDescription>Tell us about the property you're interested in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select value={watch('propertyType')} onValueChange={(value) => setValue('propertyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-family">Single Family</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="condo">Condominium</SelectItem>
                  <SelectItem value="multi-family">Multi-Family (2-4 units)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupancy">Occupancy *</Label>
              <Select value={watch('occupancy')} onValueChange={(value) => setValue('occupancy', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select occupancy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Residence</SelectItem>
                  <SelectItem value="second-home">Second Home</SelectItem>
                  <SelectItem value="investment">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  {...register('purchasePrice')}
                  className="pl-7"
                  placeholder="0"
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setValue('purchasePrice', formatted);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentAmount">Down Payment Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  {...register('downPaymentAmount')}
                  className="pl-7"
                  placeholder="0"
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setValue('downPaymentAmount', formatted);
                  }}
                />
              </div>
            </div>
          </div>
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
