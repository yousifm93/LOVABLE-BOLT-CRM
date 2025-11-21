import { useState, useEffect } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { PublicPreApprovalForm } from '@/components/PublicPreApprovalForm';

const Letter = () => {
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    // Check for existing form state or URL parameters
    const savedState = sessionStorage.getItem('formVisible');
    const urlParams = new URLSearchParams(window.location.search);
    const showForm = urlParams.get('form') === 'true';

    if (showForm || savedState === 'true') {
      setFormVisible(true);
    }
  }, []);

  const handleExpandForm = () => {
    setFormVisible(true);
    sessionStorage.setItem('formVisible', 'true');
  };

  const handleCollapseForm = () => {
    setFormVisible(false);
    sessionStorage.removeItem('formVisible');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Form Section */}
      <PublicPreApprovalForm
        formVisible={formVisible}
        onExpand={handleExpandForm}
        onCollapse={handleCollapseForm}
      />
    </div>
  );
};

export default Letter;
