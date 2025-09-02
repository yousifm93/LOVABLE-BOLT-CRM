import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { DollarSign, CreditCard, TrendingUp, Building, PiggyBank } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface FinancialInfoTabProps {
  client: any;
}

export function FinancialInfoTab({ client }: FinancialInfoTabProps) {
  // Mock data for financial info fields
  const incomeData = [
    { icon: DollarSign, label: "Gross Monthly Income", value: formatCurrency(8500) },
    { icon: DollarSign, label: "Base Employment Income", value: formatCurrency(7500) },
    { icon: DollarSign, label: "Overtime Income", value: formatCurrency(500) },
    { icon: DollarSign, label: "Bonus Income", value: formatCurrency(500) },
    { icon: Building, label: "Self Employment Income", value: formatCurrency(0) },
    { icon: TrendingUp, label: "Other Income", value: formatCurrency(0) }
  ];

  const assetData = [
    { icon: PiggyBank, label: "Checking Account", value: formatCurrency(15000) },
    { icon: PiggyBank, label: "Savings Account", value: formatCurrency(45000) },
    { icon: TrendingUp, label: "Investment Accounts", value: formatCurrency(75000) },
    { icon: Building, label: "Retirement Accounts (401k/IRA)", value: formatCurrency(125000) },
    { icon: DollarSign, label: "Gift Funds", value: formatCurrency(0) },
    { icon: DollarSign, label: "Other Assets", value: formatCurrency(25000) }
  ];

  const debtData = [
    { icon: CreditCard, label: "Credit Card Debt", value: formatCurrency(2500) },
    { icon: Building, label: "Auto Loans", value: formatCurrency(18000) },
    { icon: DollarSign, label: "Student Loans", value: formatCurrency(0) },
    { icon: CreditCard, label: "Other Monthly Debts", value: formatCurrency(450) },
    { icon: DollarSign, label: "Total Monthly Debt Payments", value: formatCurrency(950) },
    { icon: TrendingUp, label: "Debt-to-Income Ratio", value: formatPercentage(11.2) }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Income Information
          </h3>
          <TwoColumnDetailLayout items={incomeData} />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Assets Information
          </h3>
          <TwoColumnDetailLayout items={assetData} />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Debt Information
          </h3>
          <TwoColumnDetailLayout items={debtData} />
        </div>
      </div>
    </ScrollArea>
  );
}