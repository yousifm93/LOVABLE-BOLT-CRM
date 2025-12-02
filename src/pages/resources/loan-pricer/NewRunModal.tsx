import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScenarioForm } from "./ScenarioForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunCreated: () => void;
  leadId?: string;
  prefilledScenario?: ScenarioData | null;
}

export interface ScenarioData {
  fico_score: number;        // Credit score
  loan_type: string;         // Conventional | FHA | VA
  term_years: number;        // 10-30, 40
  loan_purpose: string;      // Purchase | Refinance
  purchase_price: number;    // Dollar amount
  loan_amount: number;       // Dollar amount
  occupancy: string;         // Primary Residence | Second Home | Investment
  property_type: string;     // Single Family | Condo | 2-4 Units
  num_units?: number;        // 2, 3, 4 (conditional)
  zip_code: string;          // 5-digit zip
  state: string;             // US state
}

const INITIAL_SCENARIO: ScenarioData = {
  fico_score: 720,
  loan_type: "Conventional",
  term_years: 30,
  loan_purpose: "Purchase",
  purchase_price: 400000,
  loan_amount: 320000,
  occupancy: "Primary Residence",
  property_type: "Single Family",
  num_units: undefined,
  zip_code: "",
  state: "FL"
};

export function NewRunModal({ open, onOpenChange, onRunCreated, leadId, prefilledScenario }: NewRunModalProps) {
  const [scenarioData, setScenarioData] = useState<ScenarioData>(prefilledScenario || INITIAL_SCENARIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update scenario data when prefilled scenario changes
  useEffect(() => {
    if (prefilledScenario) {
      setScenarioData(prefilledScenario);
    }
  }, [prefilledScenario]);

  const handleSubmit = async () => {
    // Basic validation
    if (!scenarioData.fico_score || !scenarioData.zip_code) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Credit Score and Zip Code",
        variant: "destructive",
      });
      return;
    }

    // Validate 2-4 Units requires num_units
    if (scenarioData.property_type === "2-4 Units" && !scenarioData.num_units) {
      toast({
        title: "Missing Number of Units",
        description: "Please specify the number of units for 2-4 unit properties",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create the pricing run
      const { data: pricingRun, error: runError } = await supabase
        .from('pricing_runs')
        .insert({
          lead_id: leadId || null,
          scenario_json: scenarioData as any,
          status: 'pending'
        })
        .select()
        .single();

      if (runError) throw runError;

      // Call edge function to write to Google Sheet and trigger Axiom
      const { error: sheetError } = await supabase.functions.invoke('loan-pricer-sheets', {
        body: { run_id: pricingRun.id }
      });

      if (sheetError) {
        // Update status to failed if Google Sheet write fails
        await supabase.from('pricing_runs')
          .update({ status: 'failed', error_message: sheetError.message })
          .eq('id', pricingRun.id);
        throw sheetError;
      }

      toast({
        title: "Pricing run started",
        description: "Data sent to pricing system. Results will appear automatically when ready.",
      });

      onRunCreated();
      onOpenChange(false);
      setScenarioData(INITIAL_SCENARIO);
    } catch (error: any) {
      toast({
        title: "Error creating pricing run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Pricing Run</DialogTitle>
        </DialogHeader>

        <ScenarioForm
          data={scenarioData}
          onChange={setScenarioData}
        />

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Pricing Run"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
