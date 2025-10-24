import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, CreditCard, TrendingUp, Building, PiggyBank, Pencil } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { sanitizeNumber } from "@/lib/utils";
import { z } from "zod";

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
    total_monthly_income: null as number | null,
    monthly_liabilities: null as number | null,
    assets: null as number | null,
    dti: null as number | null,
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      total_monthly_income: null,
      monthly_liabilities: null,
      assets: null,
      dti: null,
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

    // Validation schema
    const schema = z.object({
      total_monthly_income: z.number().min(0).nullable().optional(),
      monthly_liabilities: z.number().min(0).nullable().optional(),
      assets: z.number().min(0).nullable().optional(),
      dti: z.number().min(0).max(100).nullable().optional(),
    });

    try {
      // Sanitize numeric fields
      const sanitizedData = {
        total_monthly_income: sanitizeNumber(editData.total_monthly_income),
        monthly_liabilities: sanitizeNumber(editData.monthly_liabilities),
        assets: sanitizeNumber(editData.assets),
        dti: sanitizeNumber(editData.dti),
      };

      // Validate
      schema.parse(sanitizedData);

      setIsSaving(true);

      await databaseService.updateLead(leadId, sanitizedData);

      toast({
        title: "Success",
        description: "Financial information updated successfully",
      });

      setIsEditing(false);
      onLeadUpdated?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update financial information",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

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

  if (isEditing) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Edit Financial Information
            </h3>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Gross Monthly Income</Label>
              <Input
                type="number"
                value={editData.total_monthly_income || ""}
                onChange={(e) => setEditData({ ...editData, total_monthly_income: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Total Monthly Debt Payments</Label>
              <Input
                type="number"
                value={editData.monthly_liabilities || ""}
                onChange={(e) => setEditData({ ...editData, monthly_liabilities: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Total Assets</Label>
              <Input
                type="number"
                value={editData.assets || ""}
                onChange={(e) => setEditData({ ...editData, assets: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Debt-to-Income Ratio (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={editData.dti || ""}
                onChange={(e) => setEditData({ ...editData, dti: parseFloat(e.target.value) || null })}
                className="h-8"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <p><strong>Note:</strong> Detailed income breakdown (overtime, bonus, etc.) and asset categories are not yet available for editing. These fields will be added in a future update.</p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Income Information
            </h3>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
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