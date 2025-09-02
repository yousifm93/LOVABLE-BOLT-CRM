import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScenarioForm } from "./ScenarioForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunCreated: () => void;
  leadId?: string;
}

interface ScenarioData {
  // Borrower Info
  fico_score: number;
  dti_ratio: number;
  location: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  
  // Loan Details
  loan_type: string;
  loan_purpose: string;
  loan_amount: number;
  property_value: number;
  down_payment: number;
  loan_term: number;
  
  // Other Options
  lock_period: number;
  providers: string[];
  borrower_type: string;
  occupancy: string;
  property_type: string;
}

const INITIAL_SCENARIO: ScenarioData = {
  fico_score: 740,
  dti_ratio: 30,
  location: {
    street: "",
    city: "",
    state: "",
    zip: ""
  },
  loan_type: "Conventional",
  loan_purpose: "Purchase",
  loan_amount: 400000,
  property_value: 500000,
  down_payment: 100000,
  loan_term: 30,
  lock_period: 45,
  providers: ["arrive", "lenderprice"],
  borrower_type: "First Time Buyer",
  occupancy: "Primary Residence",
  property_type: "Single Family"
};

export function NewRunModal({ open, onOpenChange, onRunCreated, leadId }: NewRunModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [scenarioData, setScenarioData] = useState<ScenarioData>(INITIAL_SCENARIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
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

      // Create provider entries
      const providerEntries = scenarioData.providers.map(provider => ({
        run_id: pricingRun.id,
        provider,
        status: 'queued'
      }));

      const { error: providersError } = await supabase
        .from('pricing_run_providers')
        .insert(providerEntries);

      if (providersError) throw providersError;

      // Call edge function to start processing
      const { error: functionError } = await supabase.functions.invoke('pricing-run-manager', {
        body: { run_id: pricingRun.id }
      });

      if (functionError) {
        console.warn('Edge function call failed:', functionError);
        // Don't fail the whole operation if edge function fails
      }

      toast({
        title: "Pricing run started",
        description: "Your loan pricing request has been submitted and is being processed.",
      });

      onRunCreated();
      onOpenChange(false);
      setCurrentStep(1);
      setScenarioData(INITIAL_SCENARIO);
    } catch (error: any) {
      toast({
        title: "Error starting pricing run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Borrower Information";
      case 2:
        return "Loan Details";
      case 3:
        return "Review & Submit";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Pricing Run - {getStepTitle()}</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <ScenarioForm
          data={scenarioData}
          onChange={setScenarioData}
          currentStep={currentStep}
        />

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? "Starting..." : "Start Pricing Run"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
