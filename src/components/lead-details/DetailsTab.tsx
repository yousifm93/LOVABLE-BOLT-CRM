import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { 
  DollarSign, 
  Home, 
  Percent,
  Calendar,
  CreditCard,
  MapPin,
  Building
} from "lucide-react";
import { formatCurrency, formatPercentage, formatYesNo, formatAmortizationTerm } from "@/utils/formatters";

interface DetailsTabProps {
  client: any;
}

export function DetailsTab({ client }: DetailsTabProps) {
  // Mock data for loan & property info fields
  const loanPropertyData = [
    { icon: DollarSign, label: "Purchase Price", value: formatCurrency(client.loan?.purchasePrice || 450000) },
    { icon: DollarSign, label: "Appraised Value", value: formatCurrency(client.loan?.appraisedValue || 455000) },
    { icon: DollarSign, label: "Down Payment", value: formatCurrency(client.loan?.downPayment || 90000) },
    { icon: DollarSign, label: "Loan Amount", value: formatCurrency(client.loan?.loanAmount || 360000) },
    { icon: Percent, label: "LTV", value: formatPercentage(client.loan?.ltv || 80) },
    { icon: Home, label: "Mortgage Type", value: client.loan?.mortgageType || "Conventional", badgeVariant: "outline" as const },
    { icon: Percent, label: "Interest Rate", value: formatPercentage(client.loan?.interestRate || 6.875) },
    { icon: Calendar, label: "Amortization Term", value: formatAmortizationTerm(client.loan?.term || 360) },
    { icon: Building, label: "Escrow Waiver", value: formatYesNo(client.loan?.escrowWaiver || false) },
    { icon: CreditCard, label: "FICO Score", value: client.loan?.ficoScore || "750" },
    { icon: DollarSign, label: "Proposed Monthly Payment", value: formatCurrency(client.loan?.monthlyPayment || 2145) }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Loan & Property Information
          </h3>
          <TwoColumnDetailLayout items={loanPropertyData} />
        </div>
      </div>
    </ScrollArea>
  );
}