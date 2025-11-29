import React, { useState } from 'react';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, Send, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/database';

interface ReviewSubmitFormProps {
  onBack: () => void;
  isReadOnly?: boolean;
}

export const ReviewSubmitForm: React.FC<ReviewSubmitFormProps> = ({ onBack, isReadOnly = false }) => {
  const { data, progressPercentage, dispatch } = useApplication();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToSection = (section: number) => {
    dispatch({ type: 'SET_CURRENT_SECTION', payload: section });
  };

  const formatCurrency = (amount: number | string | null | undefined): string => {
    if (!amount) return '$0';
    const cleanAmount = typeof amount === 'string' ? amount.replace(/,/g, '') : amount.toString();
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatAddress = (address: any): string => {
    if (!address) return '—';
    const parts = [
      address.street,
      address.unit,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    return parts.join(', ') || '—';
  };

  const formatLocation = (location: any): string => {
    if (!location) return '—';
    const parts = [
      location.city,
      location.state,
      location.zipCode,
      location.countyName
    ].filter(Boolean);
    return parts.join(', ') || '—';
  };

  const formatYesNo = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    return value ? 'Yes' : 'No';
  };

  const formatCreditScore = (value: string | undefined): string => {
    const map: Record<string, string> = {
      'below-620': 'Below 620',
      '620-660': '620-660',
      '660-699': '660-699',
      '700-739': '700-739',
      '740-plus': '740+',
      // Legacy values for backwards compatibility
      'poor': 'Below 620',
      'fair': '620-679',
      'good': '680-739',
      'very-good': '740-799',
      'excellent': '800+'
    };
    return map[value || ''] || value || '—';
  };

  const getDeclarationAnswer = (questionId: string): boolean | null => {
    const declaration = data.declarations.find(d => d.id === questionId);
    return declaration?.answer ?? null;
  };

  const calculateLoanAmount = (): number => {
    const purchase = parseFloat((data.mortgageInfo.purchasePrice || '0').replace(/,/g, ''));
    const down = parseFloat((data.mortgageInfo.downPaymentAmount || '0').replace(/,/g, ''));
    return purchase - down;
  };

  const calculateTotalAssets = (): number => {
    return data.assets.assets.reduce((sum, asset) => {
      const balance = parseFloat((asset.balance || '0').replace(/,/g, ''));
      return sum + balance;
    }, 0);
  };

  const calculateTotalMonthlyIncome = (): number => {
    const employmentIncome = data.income.employmentIncomes.reduce((sum, emp) => {
      const income = parseFloat((emp.monthlyIncome || '0').replace(/,/g, ''));
      return sum + income;
    }, 0);
    const otherIncome = data.income.otherIncomes.reduce((sum, inc) => {
      const income = parseFloat((inc.amount || '0').replace(/,/g, ''));
      return sum + income;
    }, 0);
    return employmentIncome + otherIncome;
  };

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
      // Submit application via Edge Function (bypasses RLS for public submissions)
      const { data: result, error: submitError } = await supabase.functions.invoke('submit-mortgage-application', {
        body: {
          applicationData: data
        }
      });

      if (submitError) throw submitError;
      if (!result?.success) throw new Error(result?.error || 'Failed to submit application');

      console.log('Application submitted successfully:', result);
      
      // Send confirmation email
      const { error: emailError } = await supabase.functions.invoke('send-application-confirmation', {
        body: {
          borrowerEmail: data.personalInfo.email,
          borrowerName: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`,
          loanPurpose: data.loanPurpose || 'purchase',
          propertyType: data.mortgageInfo.propertyType || 'single family'
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: 'Email Not Sent',
          description: 'Application saved but confirmation email failed to send.',
          variant: 'destructive',
        });
      }

      toast({
        title: 'Application Submitted!',
        description: 'We have received your mortgage application. You will be contacted shortly.',
      });

      // Clear localStorage
      localStorage.removeItem('mortgageApplication');
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Review & Submit</h2>
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

      {/* Mortgage Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Mortgage Information</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(1)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Loan Purpose</p>
              <p className="font-medium capitalize">{data.loanPurpose || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Type</p>
              <p className="font-medium capitalize">{data.mortgageInfo.propertyType || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Usage</p>
              <p className="font-medium capitalize">{data.mortgageInfo.occupancy || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Target Monthly Payment</p>
              <p className="font-medium">{formatCurrency(data.mortgageInfo.comfortableMonthlyPayment)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchase Price</p>
              <p className="font-medium">{formatCurrency(data.mortgageInfo.purchasePrice)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Down Payment</p>
              <p className="font-medium">{formatCurrency(data.mortgageInfo.downPaymentAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loan Amount</p>
              <p className="font-medium">{formatCurrency(calculateLoanAmount())}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Location</p>
              <p className="font-medium">{formatLocation(data.mortgageInfo.targetLocation)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(2)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">
                {[data.personalInfo.firstName, data.personalInfo.middleName, data.personalInfo.lastName]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{data.personalInfo.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cell Phone</p>
              <p className="font-medium">{data.personalInfo.cellPhone || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{data.personalInfo.dateOfBirth || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marital Status</p>
              <p className="font-medium capitalize">{data.personalInfo.maritalStatus || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Credit Score</p>
              <p className="font-medium">{formatCreditScore(data.personalInfo.estimatedCreditScore)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Residency Type</p>
              <p className="font-medium capitalize">{data.personalInfo.residencyType || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Military or Veteran</p>
              <p className="font-medium">{formatYesNo(data.personalInfo.isUSMilitary)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Current Address</p>
              <p className="font-medium">{formatAddress(data.personalInfo.currentAddress)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.personalInfo.propertyOwnership} • 
                {data.personalInfo.yearsAtCurrentAddress || 0} years, {data.personalInfo.monthsAtCurrentAddress || 0} months
              </p>
            </div>
            {data.personalInfo.mailingAddressSame === false && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Mailing Address</p>
                <p className="font-medium">{data.personalInfo.mailingAddress || '—'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Co-Borrowers Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Co-Borrowers</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(3)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.coBorrowers.coBorrowers.length === 0 ? (
            <p className="text-muted-foreground">No co-borrowers</p>
          ) : (
            <div className="space-y-4">
              {data.coBorrowers.coBorrowers.map((coBorrower, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium">{coBorrower.firstName} {coBorrower.lastName}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span>{coBorrower.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      <span>{coBorrower.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relationship: </span>
                      <span className="capitalize">{coBorrower.relationship || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Income</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(4)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.income.employmentIncomes.length === 0 && data.income.otherIncomes.length === 0 ? (
            <p className="text-muted-foreground">No income sources</p>
          ) : (
            <div className="space-y-4">
              {data.income.employmentIncomes.map((emp, index) => (
                <div key={index} className="border-b pb-3">
                  <p className="font-medium">{emp.employerName}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Position: </span>
                      <span>{emp.position}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monthly Income: </span>
                      <span className="font-semibold">{formatCurrency(emp.monthlyIncome)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start Date: </span>
                      <span>{emp.startDate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="capitalize">{emp.employmentType}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.income.otherIncomes.map((inc, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium capitalize">{inc.type}</p>
                  <div className="text-sm mt-2">
                    <span className="text-muted-foreground">Monthly Amount: </span>
                    <span className="font-semibold">{formatCurrency(inc.amount)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Monthly Income:</span>
                  <span className="font-bold text-lg">{formatCurrency(calculateTotalMonthlyIncome())}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Assets</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(5)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.assets.assets.length === 0 ? (
            <p className="text-muted-foreground">No assets</p>
          ) : (
            <div className="space-y-3">
              {data.assets.assets.map((asset, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium capitalize">{asset.type}</p>
                      <p className="text-sm text-muted-foreground">{asset.financialInstitution}</p>
                      <p className="text-sm text-muted-foreground">Account: ***{asset.accountNumber}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(asset.balance)}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Assets:</span>
                  <span className="font-bold text-lg">{formatCurrency(calculateTotalAssets())}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real Estate Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Real Estate Owned</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(6)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.realEstate.properties.length === 0 ? (
            <p className="text-muted-foreground">No real estate owned</p>
          ) : (
            <div className="space-y-4">
              {data.realEstate.properties.map((property, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium">{property.address}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="capitalize">{property.propertyType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Usage: </span>
                      <span className="capitalize">{property.propertyUsage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value: </span>
                      <span className="font-semibold">{formatCurrency(property.propertyValue)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monthly Expenses: </span>
                      <span>{formatCurrency(property.monthlyExpenses)}</span>
                    </div>
                    {property.propertyUsage === 'rental' && property.monthlyRent && (
                      <div>
                        <span className="text-muted-foreground">Monthly Rent: </span>
                        <span className="font-semibold">{formatCurrency(property.monthlyRent)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declarations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Declarations</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => goToSection(7)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Declared bankruptcy in the past 7 years?</span>
              <span className="font-medium">{formatYesNo(getDeclarationAnswer('declared-bankruptcy'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Property foreclosed in the past 7 years?</span>
              <span className="font-medium">{formatYesNo(getDeclarationAnswer('property-foreclosed'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Obligated to pay alimony, child support?</span>
              <span className="font-medium">{formatYesNo(getDeclarationAnswer('alimony-obligations'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Ownership interest in another property?</span>
              <span className="font-medium">{formatYesNo(getDeclarationAnswer('ownership-interest'))}</span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t">
            <h4 className="font-semibold mb-3">Demographics (Optional)</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Ethnicity:</span>
                <span className="capitalize">{data.demographics.ethnicity || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Race:</span>
                <span className="capitalize">
                  {data.demographics.race.doNotWishToProvide ? 'Prefer not to say' : 
                   data.demographics.race.white ? 'White' :
                   data.demographics.race.blackAfricanAmerican ? 'Black or African American' :
                   data.demographics.race.asian ? 'Asian' :
                   data.demographics.race.americanIndianAlaskaNative ? 'American Indian or Alaska Native' :
                   data.demographics.race.nativeHawaiianPacificIslander ? 'Native Hawaiian or Pacific Islander' :
                   '—'
                  }
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Gender:</span>
                <span className="capitalize">{data.demographics.gender || '—'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms Agreement - hide in read-only mode */}
      {!isReadOnly && (
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
      )}

      {/* Action Buttons - hide in read-only mode */}
      {!isReadOnly && (
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
      )}
    </div>
  );
};
