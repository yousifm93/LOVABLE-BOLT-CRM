import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, DollarSign, Home, User, Mail, Phone, Calendar, CreditCard, Building, Shield } from "lucide-react";
import { formatCurrency, formatPercentage, maskSSN, formatYesNo, formatDate, formatAddress, formatAmortizationTerm } from "@/utils/formatters";

interface DetailsTabProps {
  client: any;
}

function DetailRow({ icon: Icon, label, value, badgeVariant }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
      </div>
      <div className="shrink-0">
        {badgeVariant ? (
          <Badge variant={badgeVariant} className="text-xs">
            {value}
          </Badge>
        ) : (
          <span className="text-sm font-medium">{value}</span>
        )}
      </div>
    </div>
  );
}

export function DetailsTab({ client }: DetailsTabProps) {
  // Mock data for fields that don't exist in current CRMClient interface
  const mockLoanData = {
    purchasePrice: 450000,
    appraisedValue: 445000,
    downPayment: 90000,
    ltv: 78.9,
    mortgageType: "Conventional 30-Year Fixed",
    interestRate: 6.875,
    amortizationTerm: 360, // months
    escrowWaiver: false,
    ficoScore: 720,
    proposedMonthlyPayment: 2450
  };

  const mockPropertyData = {
    subjectPropertyAddress: "123 Oak Street, Austin, TX 78701",
    occupancy: "Primary Residence",
    propertyType: "Single Family Residence",
    titleInfo: "Clear title, no liens"
  };

  const mockBorrowerData = {
    socialSecurityNumber: "123456789",
    dateOfBirth: "1985-03-15",
    residenceType: "Own",
    maritalStatus: "Married", 
    numberOfDependents: 2,
    estimatedCreditScore: 720,
    currentAddress: "456 Elm Avenue, Austin, TX 78702",
    occupancyOfCurrentAddress: "Owner Occupied",
    timeAtCurrentAddress: "3 years 2 months",
    militaryVeteran: false
  };

  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-4">
        {/* Loan & Property Info */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            Loan & Property Info
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={DollarSign}
              label="Purchase Price"
              value={formatCurrency(mockLoanData.purchasePrice)}
            />
            <DetailRow
              icon={DollarSign}
              label="Appraised Value"
              value={formatCurrency(mockLoanData.appraisedValue)}
            />
            <DetailRow
              icon={DollarSign}
              label="Down Payment"
              value={formatCurrency(mockLoanData.downPayment)}
            />
            <DetailRow
              icon={DollarSign}
              label="Loan Amount"
              value={formatCurrency(client.loan.loanAmount)}
            />
            <DetailRow
              icon={DollarSign}
              label="LTV"
              value={formatPercentage(mockLoanData.ltv)}
            />
            <DetailRow
              icon={Home}
              label="Mortgage Type"
              value={mockLoanData.mortgageType}
            />
            <DetailRow
              icon={DollarSign}
              label="Interest Rate"
              value={formatPercentage(mockLoanData.interestRate)}
            />
            <DetailRow
              icon={Calendar}
              label="Amortization Term"
              value={formatAmortizationTerm(mockLoanData.amortizationTerm)}
            />
            <DetailRow
              icon={Building}
              label="Escrow Waiver"
              value={formatYesNo(mockLoanData.escrowWaiver)}
            />
            <DetailRow
              icon={CreditCard}
              label="FICO Score"
              value={mockLoanData.ficoScore?.toString()}
            />
            <DetailRow
              icon={DollarSign}
              label="Proposed Monthly Payment"
              value={formatCurrency(mockLoanData.proposedMonthlyPayment)}
            />
          </div>
        </div>

        {/* Property Info */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Home className="h-3 w-3" />
            Property Info
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={MapPin}
              label="Subject Property Address"
              value={mockPropertyData.subjectPropertyAddress}
            />
            <DetailRow
              icon={Home}
              label="Occupancy"
              value={mockPropertyData.occupancy}
            />
            <DetailRow
              icon={Building}
              label="Property Type"
              value={mockPropertyData.propertyType}
            />
            <DetailRow
              icon={Building}
              label="Title Info"
              value={mockPropertyData.titleInfo}
            />
          </div>
        </div>

        {/* Borrower Info */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <User className="h-3 w-3" />
            Borrower Info
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={User}
              label="Borrower First Name"
              value={client.person.firstName}
            />
            <DetailRow
              icon={User}
              label="Borrower Last Name"
              value={client.person.lastName}
            />
            <DetailRow
              icon={Shield}
              label="Social Security Number"
              value={maskSSN(mockBorrowerData.socialSecurityNumber)}
            />
            <DetailRow
              icon={Calendar}
              label="Date of Birth"
              value={formatDate(mockBorrowerData.dateOfBirth)}
            />
            <DetailRow
              icon={Home}
              label="Residence Type"
              value={mockBorrowerData.residenceType}
            />
            <DetailRow
              icon={User}
              label="Marital Status"
              value={mockBorrowerData.maritalStatus}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={client.person.email}
            />
            <DetailRow
              icon={Phone}
              label="Cell Phone"
              value={client.person.phoneMobile}
            />
            <DetailRow
              icon={User}
              label="Number of Dependents"
              value={mockBorrowerData.numberOfDependents?.toString()}
            />
            <DetailRow
              icon={CreditCard}
              label="Estimated Credit Score"
              value={mockBorrowerData.estimatedCreditScore?.toString()}
            />
            <DetailRow
              icon={MapPin}
              label="Current Address"
              value={mockBorrowerData.currentAddress}
            />
            <DetailRow
              icon={Home}
              label="Occupancy of Current Address"
              value={mockBorrowerData.occupancyOfCurrentAddress}
            />
            <DetailRow
              icon={Calendar}
              label="Time at Current Address"
              value={mockBorrowerData.timeAtCurrentAddress}
            />
            <DetailRow
              icon={Shield}
              label="Military/Veteran"
              value={formatYesNo(mockBorrowerData.militaryVeteran)}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}