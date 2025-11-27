import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Home, MapPin } from 'lucide-react';

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

  const handleDownPaymentDollarChange = (value: string) => {
    const formatted = formatCurrency(value);
    setValue('downPaymentAmount', formatted);
    
    const purchasePrice = parseFloat(watch('purchasePrice')?.replace(/,/g, '') || '0');
    const downPaymentDollar = parseFloat(formatted.replace(/,/g, '') || '0');
    
    if (purchasePrice > 0) {
      const percent = ((downPaymentDollar / purchasePrice) * 100).toFixed(2);
      setValue('downPaymentPercent', percent);
    }
  };

  const handleDownPaymentPercentChange = (value: string) => {
    const percent = parseFloat(value || '0');
    setValue('downPaymentPercent', value);
    
    const purchasePrice = parseFloat(watch('purchasePrice')?.replace(/,/g, '') || '0');
    
    if (purchasePrice > 0) {
      const downPaymentDollar = (purchasePrice * percent / 100);
      setValue('downPaymentAmount', downPaymentDollar.toLocaleString());
    }
  };

  const loanAmount = () => {
    const purchasePrice = parseFloat(watch('purchasePrice')?.replace(/,/g, '') || '0');
    const downPayment = parseFloat(watch('downPaymentAmount')?.replace(/,/g, '') || '0');
    return purchasePrice - downPayment;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Mortgage Information</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Details
          </CardTitle>
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

          <div className="grid grid-cols-3 gap-4">
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
                    
                    // Recalculate down payment dollar if percent is set
                    const percent = parseFloat(watch('downPaymentPercent') || '0');
                    if (percent > 0) {
                      const purchasePrice = parseFloat(formatted.replace(/,/g, '') || '0');
                      const downPaymentDollar = (purchasePrice * percent / 100);
                      setValue('downPaymentAmount', downPaymentDollar.toLocaleString());
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentAmount">Down Payment *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  value={watch('downPaymentAmount')}
                  className="pl-7"
                  placeholder="0"
                  onChange={(e) => handleDownPaymentDollarChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentPercent">Down Payment % *</Label>
              <div className="relative">
                <Input
                  value={watch('downPaymentPercent')}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  onChange={(e) => handleDownPaymentPercentChange(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {loanAmount() > 0 && (
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">Your loan amount will be</p>
              <p className="text-3xl font-bold text-green-600">${loanAmount().toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                value={watch('targetLocation')?.city || ''}
                onChange={(e) => setValue('targetLocation', { ...watch('targetLocation'), city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={watch('targetLocation')?.state || ''}
                onValueChange={(value) => setValue('targetLocation', { ...watch('targetLocation'), state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="AL">AL</SelectItem>
                  <SelectItem value="AK">AK</SelectItem>
                  <SelectItem value="AZ">AZ</SelectItem>
                  <SelectItem value="AR">AR</SelectItem>
                  <SelectItem value="CA">CA</SelectItem>
                  <SelectItem value="CO">CO</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="DE">DE</SelectItem>
                  <SelectItem value="FL">FL</SelectItem>
                  <SelectItem value="GA">GA</SelectItem>
                  <SelectItem value="HI">HI</SelectItem>
                  <SelectItem value="ID">ID</SelectItem>
                  <SelectItem value="IL">IL</SelectItem>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="IA">IA</SelectItem>
                  <SelectItem value="KS">KS</SelectItem>
                  <SelectItem value="KY">KY</SelectItem>
                  <SelectItem value="LA">LA</SelectItem>
                  <SelectItem value="ME">ME</SelectItem>
                  <SelectItem value="MD">MD</SelectItem>
                  <SelectItem value="MA">MA</SelectItem>
                  <SelectItem value="MI">MI</SelectItem>
                  <SelectItem value="MN">MN</SelectItem>
                  <SelectItem value="MS">MS</SelectItem>
                  <SelectItem value="MO">MO</SelectItem>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="NE">NE</SelectItem>
                  <SelectItem value="NV">NV</SelectItem>
                  <SelectItem value="NH">NH</SelectItem>
                  <SelectItem value="NJ">NJ</SelectItem>
                  <SelectItem value="NM">NM</SelectItem>
                  <SelectItem value="NY">NY</SelectItem>
                  <SelectItem value="NC">NC</SelectItem>
                  <SelectItem value="ND">ND</SelectItem>
                  <SelectItem value="OH">OH</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                  <SelectItem value="PA">PA</SelectItem>
                  <SelectItem value="RI">RI</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="TN">TN</SelectItem>
                  <SelectItem value="TX">TX</SelectItem>
                  <SelectItem value="UT">UT</SelectItem>
                  <SelectItem value="VT">VT</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="WV">WV</SelectItem>
                  <SelectItem value="WI">WI</SelectItem>
                  <SelectItem value="WY">WY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                value={watch('targetLocation')?.zipCode || ''}
                onChange={(e) => setValue('targetLocation', { ...watch('targetLocation'), zipCode: e.target.value })}
                placeholder="Zip"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comfortableMonthlyPayment">Comfortable Payment *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  {...register('comfortableMonthlyPayment')}
                  className="pl-7"
                  placeholder="0"
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setValue('comfortableMonthlyPayment', formatted);
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
