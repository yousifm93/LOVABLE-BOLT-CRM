import { PublicPreApprovalForm } from '@/components/PublicPreApprovalForm';

const Letter = () => {
  return (
    <div className="space-y-6">
      {/* Header - matching other resource pages */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pre-Approval Letter</h1>
        <p className="text-sm text-muted-foreground">
          Generate and send pre-approval letters to borrowers
        </p>
      </div>
      
      {/* Form always visible */}
      <PublicPreApprovalForm formVisible={true} />
    </div>
  );
};

export default Letter;
