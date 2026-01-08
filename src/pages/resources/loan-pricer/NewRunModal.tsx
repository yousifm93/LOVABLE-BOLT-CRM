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
  fico_score: number;        // Credit score (300-850)
  zip_code: string;          // 5-digit zip
  num_units: number;         // 1, 2, 3, 4
  purchase_price: number;    // Dollar amount
  loan_amount: number;       // Dollar amount
  occupancy: string;         // Primary Residence | Second Home | Investment
  property_type: string;     // Single Family | Condo | 2-4 Units
  income_type: string;       // Full Doc - 24M | DSCR | Bank Statements | No Ratio
  dscr_ratio: string;        // DSCR ratio (0-2.0), only when DSCR selected
  loan_term: number;         // 15 or 30 years
  loan_type: string;         // Conventional | FHA | VA
}

const INITIAL_SCENARIO: ScenarioData = {
  fico_score: 780,
  zip_code: "33131",
  num_units: 1,
  purchase_price: 400000,
  loan_amount: 320000,
  occupancy: "Primary Residence",
  property_type: "Single Family",
  income_type: "Full Doc - 24M",
  dscr_ratio: "",
  loan_term: 30,
  loan_type: "Conventional"
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
        description: "Please fill in FICO Score and Zip Code",
        variant: "destructive",
      });
      return;
    }

    if (!scenarioData.purchase_price || !scenarioData.loan_amount) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Purchase Price and Loan Amount",
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

      // Call edge function to trigger Axiom
      const { data: axiomResponse, error: axiomError } = await supabase.functions.invoke('loan-pricer-axiom', {
        body: { run_id: pricingRun.id }
      });

      if (axiomError) {
        // Update status to failed if Axiom trigger fails
        const errorMsg = typeof axiomError === 'object' 
          ? (axiomError.message || JSON.stringify(axiomError))
          : String(axiomError);
        await supabase.from('pricing_runs')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', pricingRun.id);
        throw new Error(errorMsg);
      }

      // Parse Axiom response for VNC link (for debugging)
      let vncUrl = '';
      if (axiomResponse?.axiom_response) {
        try {
          const parsed = typeof axiomResponse.axiom_response === 'string' 
            ? JSON.parse(axiomResponse.axiom_response)
            : axiomResponse.axiom_response;
          // Axiom returns VNC URL under "OPEN LINK IN BROWSER" key, fallback to "vnc"
          vncUrl = parsed?.["OPEN LINK IN BROWSER"] || parsed?.vnc || '';
        } catch {
          // Response might not be JSON
        }
      }

      const triggerMethod = axiomResponse?.trigger_method || 'unknown';
      const fieldsSent = axiomResponse?.fields_sent || 0;

      toast({
        title: "Pricing run started",
        description: vncUrl
          ? "Data sent to pricing system. Robot is running..." 
          : "Data sent to pricing system. Results will appear automatically when ready.",
      });

      // Log VNC URL for debugging
      if (vncUrl) {
        console.log('Axiom VNC URL:', vncUrl);
      }

      onRunCreated();
      onOpenChange(false);
      setScenarioData(INITIAL_SCENARIO);
    } catch (error: any) {
      const errorMsg = typeof error === 'object'
        ? (error.message || JSON.stringify(error))
        : String(error);
      toast({
        title: "Error creating pricing run",
        description: errorMsg,
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
