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
import { Card } from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { MortgageInfoForm } from '@/components/mortgage-app/forms/MortgageInfoForm';
import { PersonalInfoForm } from '@/components/mortgage-app/forms/PersonalInfoForm';
import { CoBorrowersForm } from '@/components/mortgage-app/forms/CoBorrowersForm';
import { IncomeForm } from '@/components/mortgage-app/forms/IncomeForm';
import { AssetsForm } from '@/components/mortgage-app/forms/AssetsForm';
import { RealEstateForm } from '@/components/mortgage-app/forms/RealEstateForm';
import { DeclarationsForm } from '@/components/mortgage-app/forms/DeclarationsForm';
import { ReviewSubmitForm } from '@/components/mortgage-app/forms/ReviewSubmitForm';
import { useIsMobile } from '@/hooks/use-mobile';

const MortgageApplicationContent = () => {
  const navigate = useNavigate();
  const { data, dispatch } = useApplication();
  const { user, signOut, session, loading, emailVerified, verificationChecked } = useBorrowerAuth();
  const isMobile = useIsMobile();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showLoanPurposeModal, setShowLoanPurposeModal] = useState(false);

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

  useEffect(() => {
    if (!data.loanPurpose) {
      setShowLoanPurposeModal(true);
    }
  }, [data.loanPurpose]);

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
        return <MortgageInfoForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 2:
        return <PersonalInfoForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 3:
        return <CoBorrowersForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 4:
        return <IncomeForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 5:
        return <AssetsForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 6:
        return <RealEstateForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 7:
        return <DeclarationsForm onNext={goToNextSection} onBack={goToPreviousSection} />;
      case 8:
        return <ReviewSubmitForm onBack={goToPreviousSection} />;
      default:
        return <MortgageInfoForm onNext={goToNextSection} onBack={goToPreviousSection} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <ApplicationSidebar onSectionChange={handleSectionChange} />}

      {/* Mobile Sidebar */}
      {isMobile && (
        <MobileApplicationSidebar
          open={showMobileSidebar}
          onOpenChange={setShowMobileSidebar}
          onSectionChange={handleSectionChange}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <MobileHeader
            onMenuToggle={() => setShowMobileSidebar(true)}
            onPrevious={goToPreviousSection}
            onNext={goToNextSection}
          />
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl mx-auto p-4 md:p-8">
            {/* User Info for Authenticated Users */}
            {user && (
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
