import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationProvider, useApplication } from '@/contexts/MortgageApplicationContext';
import { BorrowerAuthProvider, useBorrowerAuth } from '@/hooks/useBorrowerAuth';
import { ApplicationSidebar } from '@/components/mortgage-app/ApplicationSidebar';
import { MobileApplicationSidebar } from '@/components/mortgage-app/MobileApplicationSidebar';
import { MobileHeader } from '@/components/mortgage-app/MobileHeader';
import { LoanPurposeModal } from '@/components/mortgage-app/LoanPurposeModal';
import { LoanOfficerPanel } from '@/components/mortgage-app/LoanOfficerPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, CheckCircle } from 'lucide-react';
import { MortgageInfoForm } from '@/components/mortgage-app/forms/MortgageInfoForm';
import { PersonalInfoForm } from '@/components/mortgage-app/forms/PersonalInfoForm';
import { CoBorrowersForm } from '@/components/mortgage-app/forms/CoBorrowersForm';
import { IncomeForm } from '@/components/mortgage-app/forms/IncomeForm';
import { AssetsForm } from '@/components/mortgage-app/forms/AssetsForm';
import { RealEstateForm } from '@/components/mortgage-app/forms/RealEstateForm';
import { DeclarationsForm } from '@/components/mortgage-app/forms/DeclarationsForm';
import { ReviewSubmitForm } from '@/components/mortgage-app/forms/ReviewSubmitForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubmittedApplicationView } from '@/components/mortgage-app/SubmittedApplicationView';

const MortgageApplicationContent = () => {
  const navigate = useNavigate();
  const { data, dispatch } = useApplication();
  const { user, signOut, session, loading, emailVerified, verificationChecked } = useBorrowerAuth();
  const isMobile = useIsMobile();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showLoanPurposeModal, setShowLoanPurposeModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Redirect unauthenticated users to auth page
  useEffect(() => {
    if (!loading && !user) {
      navigate('/apply/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Check if email is verified - redirect to auth if not verified
  useEffect(() => {
    if (!verificationChecked) return; // Wait for verification check to complete
    
    if (user && !emailVerified) {
      navigate('/apply/auth', { replace: true });
    }
  }, [user, emailVerified, verificationChecked, navigate]);

  // Check if application was already submitted
  useEffect(() => {
    const checkSubmissionStatus = async () => {
      if (!user) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: appData, error } = await supabase
        .from('mortgage_applications')
        .select('status, submitted_at, application_data')
        .eq('user_id', user.id)
        .single();
      
      if (!error && appData?.status === 'submitted') {
        setIsSubmitted(true);
        setSubmittedAt(appData.submitted_at);
        setSubmittedData(appData.application_data);
      }
    };
    
    checkSubmissionStatus();
  }, [user]);

  useEffect(() => {
    if (!data.loanPurpose && !isSubmitted) {
      setShowLoanPurposeModal(true);
    }
  }, [data.loanPurpose, isSubmitted]);

  const handleSectionChange = (sectionId: number) => {
    dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionId });
  };

  const goToNextSection = () => {
    const nextSection = data.currentSection + 1;
    if (nextSection <= 8) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: nextSection });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousSection = () => {
    const prevSection = data.currentSection - 1;
    if (prevSection >= 1) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: prevSection });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderCurrentForm = () => {
    switch (data.currentSection) {
      case 1:
        return <MortgageInfoForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 2:
        return <PersonalInfoForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 3:
        return <CoBorrowersForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 4:
        return <IncomeForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 5:
        return <AssetsForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 6:
        return <RealEstateForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 7:
        return <DeclarationsForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      case 8:
        return <ReviewSubmitForm onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
      default:
        return <MortgageInfoForm onNext={goToNextSection} onBack={goToPreviousSection} isReadOnly={isSubmitted} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <ApplicationSidebar onSectionChange={handleSectionChange} isReadOnly={isSubmitted} />}

      {/* Mobile Sidebar */}
      {isMobile && (
        <MobileApplicationSidebar
          open={showMobileSidebar}
          onOpenChange={setShowMobileSidebar}
          onSectionChange={handleSectionChange}
          isReadOnly={isSubmitted}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && !isSubmitted && (
          <MobileHeader
            onMenuToggle={() => setShowMobileSidebar(true)}
            onPrevious={goToPreviousSection}
            onNext={goToNextSection}
          />
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl mx-auto p-4 md:p-8">
            {/* Success Banner (when submitted) */}
            {isSubmitted && submittedAt && (
              <Card className="bg-green-50 border-green-200 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-800 mb-2">Application Submitted Successfully!</h3>
                      <p className="text-green-700 mb-1">
                        Thank you for submitting your mortgage application. Our team is reviewing your information and will contact you soon.
                      </p>
                      <p className="text-sm text-green-600">
                        Submitted on {new Date(submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Info for Authenticated Users */}
            {user && !isSubmitted && (
              <Card className="border-border bg-background p-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="font-semibold text-sm">{user.email}</p>
                  </div>
                  <Button onClick={signOut} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </Card>
            )}

            {renderCurrentForm()}

            {/* Application Summary (when submitted) */}
            {isSubmitted && submittedData && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Application Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Personal Information */}
                  <div className="border-b border-border pb-4">
                    <h3 className="font-medium mb-2">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">
                          {submittedData?.personalInfo?.firstName} {submittedData?.personalInfo?.middleName} {submittedData?.personalInfo?.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <span className="font-medium">{submittedData?.personalInfo?.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>{' '}
                        <span className="font-medium">{submittedData?.personalInfo?.cellPhone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date of Birth:</span>{' '}
                        <span className="font-medium">
                          {submittedData?.personalInfo?.dateOfBirth || 'N/A'}
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
                        <span className="font-medium capitalize">{submittedData?.loanPurpose}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Property Type:</span>{' '}
                        <span className="font-medium capitalize">{submittedData?.mortgageInfo?.propertyType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Purchase Price:</span>{' '}
                        <span className="font-medium">
                          ${submittedData?.mortgageInfo?.purchasePrice?.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Down Payment:</span>{' '}
                        <span className="font-medium">
                          ${submittedData?.mortgageInfo?.downPaymentAmount?.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-accent/50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">What's Next?</h3>
                    <p className="text-sm mb-3">Our loan officer team will review your application and contact you within 1-2 business days.</p>
                    <p className="text-sm font-medium mb-2">If you have any questions, please contact us:</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Phone:</span>
                      <span>(352) 328-9828</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Email:</span>
                      <span>yousif@mortgagebolt.com</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Loan Officer Panel - Desktop Only */}
      {!isMobile && (
        <div className="w-80 border-l border-border overflow-y-auto bg-card">
          <LoanOfficerPanel />
        </div>
      )}

      {/* Loan Purpose Modal */}
      <LoanPurposeModal
        open={showLoanPurposeModal}
        onClose={() => setShowLoanPurposeModal(false)}
      />
    </div>
  );
};

export default function MortgageApplication() {
  return (
    <BorrowerAuthProvider>
      <ApplicationProvider>
        <MortgageApplicationContent />
      </ApplicationProvider>
    </BorrowerAuthProvider>
  );
}
