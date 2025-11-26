import React, { useState } from 'react';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReviewSubmitFormProps {
  onBack: () => void;
}

export const ReviewSubmitForm: React.FC<ReviewSubmitFormProps> = ({ onBack }) => {
  const { data, progressPercentage } = useApplication();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast({
        title: 'Agreement Required',
        description: 'Please agree to the terms and conditions to submit',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Submit to Supabase and create lead
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

      toast({
        title: 'Application Submitted!',
        description: 'We have received your mortgage application. You will be contacted shortly.',
      });

      // Clear localStorage
      localStorage.removeItem('mortgageApplication');
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Review & Submit</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">You're Almost Done!</h3>
              <p className="text-muted-foreground">
                Please review your information below and submit your application. A loan officer will contact you
                within 24 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Loan Purpose</p>
              <p className="font-medium capitalize">{data.loanPurpose || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Type</p>
              <p className="font-medium capitalize">{data.mortgageInfo.propertyType || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchase Price</p>
              <p className="font-medium">${data.mortgageInfo.purchasePrice || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Down Payment</p>
              <p className="font-medium">${data.mortgageInfo.downPaymentAmount || '0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{data.personalInfo.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{data.personalInfo.cellPhone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Address</p>
              <p className="font-medium">{data.personalInfo.currentAddress?.street || 'Not provided'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employment Sources</p>
              <p className="font-medium">{data.income.employmentIncomes.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assets</p>
              <p className="font-medium">{data.assets.assets.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Properties Owned</p>
              <p className="font-medium">{data.realEstate.properties.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              id="terms"
            />
            <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
              I certify that all information provided in this application is true and complete to the best of my
              knowledge. I understand that any false information may result in denial of my application or termination
              of my loan.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !agreedToTerms} size="lg">
          {isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
