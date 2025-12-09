import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";

interface Property {
  id: string;
  property_address: string;
  property_type: string | null;
  property_usage: string | null;
  property_value: number | null;
  monthly_expenses: number | null;
  monthly_rent: number | null;
  net_income: number | null;
}

interface RealEstateOwnedSectionProps {
  leadId: string;
}

export function RealEstateOwnedSection({ leadId }: RealEstateOwnedSectionProps) {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, [leadId]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("real_estate_properties")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      console.error("Error loading properties:", error);
      toast({
        title: "Error",
        description: "Failed to load real estate properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalProperties = properties.length;
  const totalValue = properties.reduce((sum, p) => sum + (p.property_value || 0), 0);
  const totalRentalIncome = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
  const totalMonthlyExpenses = properties.reduce((sum, p) => sum + (p.monthly_expenses || 0), 0);
  const totalNetIncome = properties.reduce((sum, p) => sum + (p.net_income || 0), 0);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading properties...</div>;
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-muted-foreground mb-2 pl-1 flex items-center gap-2">
        <Home className="h-4 w-4" />
        Real Estate Owned
      </h4>
      <div className="grid grid-cols-5 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Properties</span>
          <span className="text-sm font-medium">{totalProperties}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Value</span>
          <span className="text-sm font-medium">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Rental Income</span>
          <span className="text-sm font-medium text-green-600">
            {formatCurrency(totalRentalIncome)}/mo
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Monthly Expenses</span>
          <span className="text-sm font-medium text-red-600">
            {formatCurrency(totalMonthlyExpenses)}/mo
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Net Income</span>
          <span className={`text-sm font-medium ${totalNetIncome > 0 ? "text-green-600" : totalNetIncome < 0 ? "text-red-600" : ""}`}>
            {formatCurrency(totalNetIncome)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
