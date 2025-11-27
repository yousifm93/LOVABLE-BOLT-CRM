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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

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

  const handleUpdateLocation = () => {
    setShowLocationModal(false);
  };

  const loanAmount = () => {
    const purchasePrice = parseFloat(watch('purchasePrice')?.replace(/,/g, '') || '0');
    const downPayment = parseFloat(watch('downPaymentAmount')?.replace(/,/g, '') || '0');
    return purchasePrice - downPayment;
  };

  const formatLocation = () => {
    const location = watch('targetLocation');
    if (location?.city && location?.state) {
      return `${location.city}, ${location.state} ${location.zipCode}`;
    }
    return '';
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
              <Label htmlFor="downPaymentAmount">Down Payment ($) *</Label>
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
              <Label htmlFor="downPaymentPercent">Down Payment (%) *</Label>
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
            <div className="pt-2">
              <p className="text-sm text-green-600 font-medium">Your loan amount will be: ${loanAmount().toLocaleString()}</p>
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
          <CardDescription>Where are you looking to purchase?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetLocation">Where Are You Looking To Purchase? *</Label>
              <div className="relative">
                <Input
                  value={formatLocation()}
                  placeholder="Enter Zip or City"
                  onClick={() => setShowLocationModal(true)}
                  readOnly
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comfortableMonthlyPayment">What is a comfortable housing payment? *</Label>
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

      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Where Are You Looking To Purchase?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                value={watch('targetLocation')?.city || ''}
                onChange={(e) => setValue('targetLocation', { ...watch('targetLocation'), city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={watch('targetLocation')?.state || ''}
                onValueChange={(value) => setValue('targetLocation', { ...watch('targetLocation'), state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AL">Alabama</SelectItem>
                  <SelectItem value="AK">Alaska</SelectItem>
                  <SelectItem value="AZ">Arizona</SelectItem>
                  <SelectItem value="AR">Arkansas</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="CO">Colorado</SelectItem>
                  <SelectItem value="CT">Connecticut</SelectItem>
                  <SelectItem value="DE">Delaware</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="GA">Georgia</SelectItem>
                  <SelectItem value="HI">Hawaii</SelectItem>
                  <SelectItem value="ID">Idaho</SelectItem>
                  <SelectItem value="IL">Illinois</SelectItem>
                  <SelectItem value="IN">Indiana</SelectItem>
                  <SelectItem value="IA">Iowa</SelectItem>
                  <SelectItem value="KS">Kansas</SelectItem>
                  <SelectItem value="KY">Kentucky</SelectItem>
                  <SelectItem value="LA">Louisiana</SelectItem>
                  <SelectItem value="ME">Maine</SelectItem>
                  <SelectItem value="MD">Maryland</SelectItem>
                  <SelectItem value="MA">Massachusetts</SelectItem>
                  <SelectItem value="MI">Michigan</SelectItem>
                  <SelectItem value="MN">Minnesota</SelectItem>
                  <SelectItem value="MS">Mississippi</SelectItem>
                  <SelectItem value="MO">Missouri</SelectItem>
                  <SelectItem value="MT">Montana</SelectItem>
                  <SelectItem value="NE">Nebraska</SelectItem>
                  <SelectItem value="NV">Nevada</SelectItem>
                  <SelectItem value="NH">New Hampshire</SelectItem>
                  <SelectItem value="NJ">New Jersey</SelectItem>
                  <SelectItem value="NM">New Mexico</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                  <SelectItem value="ND">North Dakota</SelectItem>
                  <SelectItem value="OH">Ohio</SelectItem>
                  <SelectItem value="OK">Oklahoma</SelectItem>
                  <SelectItem value="OR">Oregon</SelectItem>
                  <SelectItem value="PA">Pennsylvania</SelectItem>
                  <SelectItem value="RI">Rhode Island</SelectItem>
                  <SelectItem value="SC">South Carolina</SelectItem>
                  <SelectItem value="SD">South Dakota</SelectItem>
                  <SelectItem value="TN">Tennessee</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="UT">Utah</SelectItem>
                  <SelectItem value="VT">Vermont</SelectItem>
                  <SelectItem value="VA">Virginia</SelectItem>
                  <SelectItem value="WA">Washington</SelectItem>
                  <SelectItem value="WV">West Virginia</SelectItem>
                  <SelectItem value="WI">Wisconsin</SelectItem>
                  <SelectItem value="WY">Wyoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                value={watch('targetLocation')?.zipCode || ''}
                onChange={(e) => setValue('targetLocation', { ...watch('targetLocation'), zipCode: e.target.value })}
                placeholder="Enter zip code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="countyName">County Name *</Label>
              <Input
                value={watch('targetLocation')?.countyName || ''}
                onChange={(e) => setValue('targetLocation', { ...watch('targetLocation'), countyName: e.target.value })}
                placeholder="Enter county name"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowLocationModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdateLocation}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
};
