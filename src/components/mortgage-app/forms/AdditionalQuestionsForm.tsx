import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdditionalQuestionsFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const AdditionalQuestionsForm: React.FC<AdditionalQuestionsFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const form = useForm({
    defaultValues: data.additionalQuestions,
  });

  const watchedFields = form.watch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'additionalQuestions', data: watchedFields },
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [watchedFields, dispatch]);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const number = parseInt(digits);
    return number.toLocaleString();
  };

  const handleNext = () => {
    const formData = form.getValues();

    if (!formData.targetMonthlyPayment || formData.targetMonthlyPayment.trim() === '') {
      toast({
        title: 'Required field missing',
        description: 'Please enter your target monthly payment',
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Additional Questions</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Your Preferences
          </CardTitle>
          <CardDescription>Help us understand your goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetMonthlyPayment">
              What is your target monthly payment? *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                {...form.register('targetMonthlyPayment')}
                className="pl-7"
                placeholder="0"
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  form.setValue('targetMonthlyPayment', formatted);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This includes principal, interest, taxes, and insurance (PITI)
            </p>
          </div>
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
    </div>
  );
};
