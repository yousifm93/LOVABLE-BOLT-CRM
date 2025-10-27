import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, CreditCard, TrendingUp, Building, PiggyBank, Pencil } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";

interface FinancialInfoTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
}

export function FinancialInfoTab({ client, leadId, onLeadUpdated }: FinancialInfoTabProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    // Income breakdown
    base_employment_income: (client as any).base_employment_income || null,
    overtime_income: (client as any).overtime_income || null,
    bonus_income: (client as any).bonus_income || null,
    self_employment_income: (client as any).self_employment_income || null,
    other_income: (client as any).other_income || null,
    
    // Asset breakdown
    checking_account: (client as any).checking_account || null,
    savings_account: (client as any).savings_account || null,
    investment_accounts: (client as any).investment_accounts || null,
    retirement_accounts: (client as any).retirement_accounts || null,
    gift_funds: (client as any).gift_funds || null,
    other_assets: (client as any).other_assets || null,
    
    // Debt breakdown
    credit_card_debt: (client as any).credit_card_debt || null,
    auto_loans: (client as any).auto_loans || null,
    student_loans: (client as any).student_loans || null,
    other_monthly_debts: (client as any).other_monthly_debts || null,
  });

  // Calculate total income from breakdown
  const calculateTotalIncome = () => {
    const base = editData.base_employment_income || 0;
    const overtime = editData.overtime_income || 0;
    const bonus = editData.bonus_income || 0;
    const selfEmp = editData.self_employment_income || 0;
    const other = editData.other_income || 0;
    return base + overtime + bonus + selfEmp + other;
  };

  // Calculate total assets from breakdown
  const calculateTotalAssets = () => {
    const checking = editData.checking_account || 0;
    const savings = editData.savings_account || 0;
    const investments = editData.investment_accounts || 0;
    const retirement = editData.retirement_accounts || 0;
    const gifts = editData.gift_funds || 0;
    const otherAssets = editData.other_assets || 0;
    return checking + savings + investments + retirement + gifts + otherAssets;
  };

  // Calculate total monthly debts from breakdown
  const calculateTotalDebts = () => {
    const creditCard = editData.credit_card_debt || 0;
    const auto = editData.auto_loans || 0;
    const student = editData.student_loans || 0;
    const other = editData.other_monthly_debts || 0;
    return creditCard + auto + student + other;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      base_employment_income: (client as any).base_employment_income || null,
      overtime_income: (client as any).overtime_income || null,
      bonus_income: (client as any).bonus_income || null,
      self_employment_income: (client as any).self_employment_income || null,
      other_income: (client as any).other_income || null,
      checking_account: (client as any).checking_account || null,
      savings_account: (client as any).savings_account || null,
      investment_accounts: (client as any).investment_accounts || null,
      retirement_accounts: (client as any).retirement_accounts || null,
      gift_funds: (client as any).gift_funds || null,
      other_assets: (client as any).other_assets || null,
      credit_card_debt: (client as any).credit_card_debt || null,
      auto_loans: (client as any).auto_loans || null,
      student_loans: (client as any).student_loans || null,
      other_monthly_debts: (client as any).other_monthly_debts || null,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalIncome = calculateTotalIncome();
      const totalAssets = calculateTotalAssets();
      const totalDebts = calculateTotalDebts();
      
      setIsSaving(true);

      await databaseService.updateLead(leadId, {
        // Income breakdown
        base_employment_income: editData.base_employment_income,
        overtime_income: editData.overtime_income,
        bonus_income: editData.bonus_income,
        self_employment_income: editData.self_employment_income,
        other_income: editData.other_income,
        total_monthly_income: totalIncome,
        
        // Asset breakdown
        checking_account: editData.checking_account,
        savings_account: editData.savings_account,
        investment_accounts: editData.investment_accounts,
        retirement_accounts: editData.retirement_accounts,
        gift_funds: editData.gift_funds,
        other_assets: editData.other_assets,
        assets: totalAssets,
        
        // Debt breakdown
        credit_card_debt: editData.credit_card_debt,
        auto_loans: editData.auto_loans,
        student_loans: editData.student_loans,
        other_monthly_debts: editData.other_monthly_debts,
        monthly_liabilities: totalDebts,
      });

      toast({
        title: "Success",
        description: "Financial information updated successfully",
      });

      setIsEditing(false);
      onLeadUpdated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update financial information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const incomeData = [
    { 
      icon: DollarSign, 
      label: "Gross Monthly Income", 
      value: formatCurrency(calculateTotalIncome()),
      editComponent: isEditing ? (
        <Input
          type="text"
          value={formatCurrency(calculateTotalIncome())}
          disabled
          className="h-8 opacity-60 bg-muted"
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Base Employment Income", 
      value: formatCurrency((client as any).base_employment_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.base_employment_income}
          onValueChange={(value) => setEditData({ ...editData, base_employment_income: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Overtime Income", 
      value: formatCurrency((client as any).overtime_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.overtime_income}
          onValueChange={(value) => setEditData({ ...editData, overtime_income: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Bonus Income", 
      value: formatCurrency((client as any).bonus_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.bonus_income}
          onValueChange={(value) => setEditData({ ...editData, bonus_income: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Self Employment Income", 
      value: formatCurrency((client as any).self_employment_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.self_employment_income}
          onValueChange={(value) => setEditData({ ...editData, self_employment_income: value })}
        />
      ) : undefined
    },
    { 
      icon: TrendingUp, 
      label: "Other Income", 
      value: formatCurrency((client as any).other_income),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_income}
          onValueChange={(value) => setEditData({ ...editData, other_income: value })}
        />
      ) : undefined
    }
  ];

  const assetData = [
    { 
      icon: PiggyBank, 
      label: "Checking Account", 
      value: formatCurrency((client as any).checking_account),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.checking_account}
          onValueChange={(value) => setEditData({ ...editData, checking_account: value })}
        />
      ) : undefined
    },
    { 
      icon: PiggyBank, 
      label: "Savings Account", 
      value: formatCurrency((client as any).savings_account),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.savings_account}
          onValueChange={(value) => setEditData({ ...editData, savings_account: value })}
        />
      ) : undefined
    },
    { 
      icon: TrendingUp, 
      label: "Investment Accounts", 
      value: formatCurrency((client as any).investment_accounts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.investment_accounts}
          onValueChange={(value) => setEditData({ ...editData, investment_accounts: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Retirement Accounts (401k/IRA)", 
      value: formatCurrency((client as any).retirement_accounts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.retirement_accounts}
          onValueChange={(value) => setEditData({ ...editData, retirement_accounts: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Gift Funds", 
      value: formatCurrency((client as any).gift_funds),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.gift_funds}
          onValueChange={(value) => setEditData({ ...editData, gift_funds: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Other Assets", 
      value: formatCurrency((client as any).other_assets),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_assets}
          onValueChange={(value) => setEditData({ ...editData, other_assets: value })}
        />
      ) : undefined
    }
  ];

  const debtData = [
    { 
      icon: CreditCard, 
      label: "Credit Card Debt", 
      value: formatCurrency((client as any).credit_card_debt),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.credit_card_debt}
          onValueChange={(value) => setEditData({ ...editData, credit_card_debt: value })}
        />
      ) : undefined
    },
    { 
      icon: Building, 
      label: "Auto Loans", 
      value: formatCurrency((client as any).auto_loans),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.auto_loans}
          onValueChange={(value) => setEditData({ ...editData, auto_loans: value })}
        />
      ) : undefined
    },
    { 
      icon: DollarSign, 
      label: "Student Loans", 
      value: formatCurrency((client as any).student_loans),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.student_loans}
          onValueChange={(value) => setEditData({ ...editData, student_loans: value })}
        />
      ) : undefined
    },
    { 
      icon: CreditCard, 
      label: "Other Monthly Debts", 
      value: formatCurrency((client as any).other_monthly_debts),
      editComponent: isEditing ? (
        <InlineEditCurrency
          value={editData.other_monthly_debts}
          onValueChange={(value) => setEditData({ ...editData, other_monthly_debts: value })}
        />
      ) : undefined
    }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        {/* Edit/Save buttons */}
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Income Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Monthly Income:</span>
            <span className="text-emerald-600 font-bold">
              {formatCurrency(calculateTotalIncome())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={incomeData} />
        </div>

        {/* Assets Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <PiggyBank className="h-5 w-5 text-primary" />
            <span>Total Assets:</span>
            <span className="text-purple-600 font-bold">
              {formatCurrency(calculateTotalAssets())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={assetData} />
        </div>

        {/* Debts Section */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Monthly Liability:</span>
            <span className="text-orange-600 font-bold">
              {formatCurrency(calculateTotalDebts())}
            </span>
          </h3>
          <TwoColumnDetailLayout items={debtData} />
          
          {/* Show DTI if we have income and debts */}
          {calculateTotalIncome() > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Debt-to-Income Ratio (DTI)</span>
                <span className="text-sm font-bold">
                  {formatPercentage((calculateTotalDebts() / calculateTotalIncome()) * 100)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
