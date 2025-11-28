import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface SubmittedApplicationViewProps {
  submittedAt: string;
  applicationData: any;
}

export function SubmittedApplicationView({ submittedAt, applicationData }: SubmittedApplicationViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Success Message */}
        <Card className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-muted-foreground mb-2 leading-relaxed">
            Thank you for submitting your mortgage application. Our team is reviewing your information and will contact you soon.
          </p>
          
          <p className="text-sm text-muted-foreground">
            Submitted on {format(new Date(submittedAt), 'MMMM d, yyyy')} at {format(new Date(submittedAt), 'h:mm a')}
          </p>
        </Card>

        {/* Application Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Application Summary</h2>
          
          <div className="space-y-4">
            {/* Personal Information */}
            <div className="border-b border-border pb-4">
              <h3 className="font-medium mb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">
                    {applicationData?.personalInfo?.firstName} {applicationData?.personalInfo?.middleName} {applicationData?.personalInfo?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <span className="font-medium">{applicationData?.personalInfo?.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{applicationData?.personalInfo?.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth:</span>{' '}
                  <span className="font-medium">
                    {applicationData?.personalInfo?.dateOfBirth ? format(new Date(applicationData.personalInfo.dateOfBirth), 'MM/dd/yyyy') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mortgage Details */}
            <div className="border-b border-border pb-4">
              <h3 className="font-medium mb-2">Mortgage Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Loan Purpose:</span>{' '}
                  <span className="font-medium">{applicationData?.loanPurpose}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Property Type:</span>{' '}
                  <span className="font-medium">{applicationData?.mortgageInfo?.propertyType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Purchase Price:</span>{' '}
                  <span className="font-medium">
                    ${applicationData?.mortgageInfo?.purchasePrice?.toLocaleString() || '0'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Down Payment:</span>{' '}
                  <span className="font-medium">
                    ${applicationData?.mortgageInfo?.downPayment?.toLocaleString() || '0'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Loan Amount:</span>{' '}
                  <span className="font-medium">
                    ${((applicationData?.mortgageInfo?.purchasePrice || 0) - (applicationData?.mortgageInfo?.downPayment || 0)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Credit Score Range:</span>{' '}
                  <span className="font-medium">{applicationData?.personalInfo?.creditScore || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Employment Summary */}
            {applicationData?.income?.employmentIncome?.length > 0 && (
              <div className="border-b border-border pb-4">
                <h3 className="font-medium mb-2">Employment</h3>
                <div className="space-y-2 text-sm">
                  {applicationData.income.employmentIncome.map((emp: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">{emp.employerName}</span>
                      <span className="font-medium">${emp.monthlyIncome?.toLocaleString()}/month</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets Summary */}
            {applicationData?.assets?.assets?.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Total Assets</h3>
                <div className="text-2xl font-bold text-green-600">
                  ${applicationData.assets.assets.reduce((sum: number, asset: any) => sum + (asset.cashMarketValue || 0), 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6 bg-accent/50">
          <h2 className="text-lg font-semibold mb-4">What's Next?</h2>
          <div className="space-y-3 text-sm">
            <p>Our loan officer team will review your application and contact you within 1-2 business days.</p>
            <p className="font-medium">If you have any questions, please contact us:</p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span>(352) 328-9828</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>yousif@mortgagebolt.com</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
