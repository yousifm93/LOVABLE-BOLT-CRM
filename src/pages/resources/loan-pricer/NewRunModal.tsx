import { useState, useEffect } from "react";
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
  prefilledScenario?: ScenarioData | null;
}

interface ScenarioData {
  // Borrower Info
  fico_score: number; // Slider 620-850
  citizenship: string; // "US Citizen / Permanent Resident" | "Non-Permanent Resident"
  dti: string; // Dropdown "DTI <=40%" etc.
  
  // Property Info
  property_type: string; // "1 Unit SFR" | "Condo" | "2-4 Unit"
  num_units: number; // 1, 2, 3, 4
  occupancy: string; // "Primary Residence" | "Second Home" | "Investment"
  state: string; // Always "FL" for Florida
  
  // Loan Details
  program_type: string; // "Conventional" | "Non-QM" | "Prime Jumbo" | "FHA" | "VA"
  loan_type: string; // "Fixed" | "ARM"
  amortization_type: string; // "30 Year Fixed" | "25 Year" | "20 Year" | "15 Year"
  loan_purpose: string; // "Purchase" | "Rate and Term Refinance" | "Cash Out"
  loan_amount: number;
  ltv: number; // Slider 55-97
  
  // Additional Options
  lock_period: number; // 30, 45, 60, 90
  broker_compensation: string; // "BPC" | percentage options
  admin_fee_buyout: boolean;
  escrow_waiver: boolean;
  high_balance: boolean;
  sub_financing: boolean;
  
  // Non-QM specific fields (optional)
  income_type?: string;
  mortgage_history?: string;
  credit_events?: string;
}

const INITIAL_SCENARIO: ScenarioData = {
  // Borrower
  fico_score: 720,
  citizenship: "US Citizen / Permanent Resident",
  dti: "DTI <=40%",
  
  // Property
  property_type: "1 Unit SFR",
  num_units: 1,
  occupancy: "Primary Residence",
  state: "FL", // Always Florida
  
  // Loan
  program_type: "Conventional",
  loan_type: "Fixed",
  amortization_type: "30 Year Fixed",
  loan_purpose: "Purchase",
  loan_amount: 400000,
  ltv: 80,
  
  // Additional
  lock_period: 45,
  broker_compensation: "BPC",
  admin_fee_buyout: false,
  escrow_waiver: false,
  high_balance: false,
  sub_financing: false,
  
  // Non-QM specific
  income_type: undefined,
  mortgage_history: undefined,
  credit_events: undefined
};

export function NewRunModal({ open, onOpenChange, onRunCreated, leadId, prefilledScenario }: NewRunModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [scenarioData, setScenarioData] = useState<ScenarioData>(prefilledScenario || INITIAL_SCENARIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update scenario data when prefilled scenario changes
  useEffect(() => {
    if (prefilledScenario) {
      setScenarioData(prefilledScenario);
    }
  }, [prefilledScenario]);

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
    // Validate Non-QM fields
    if (scenarioData.program_type === "Non-QM") {
      if (!scenarioData.income_type || !scenarioData.mortgage_history || !scenarioData.credit_events) {
        toast({
          title: "Missing Non-QM Fields",
          description: "Please fill in all Non-QM specific fields (Income Type, Mortgage History, Credit Events)",
          variant: "destructive",
        });
        return;
      }
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

      // Trigger the scraper edge function
      console.log('Triggering loan pricer scraper for run:', pricingRun.id);
      const { error: functionError } = await supabase.functions.invoke('loan-pricer-scraper', {
        body: { run_id: pricingRun.id }
      });
      
      if (functionError) {
        console.error('Error invoking scraper function:', functionError);
        // Don't throw - the run was created successfully, scraping will be retried
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
        return "Loan Program & Property";
      case 2:
        return "Loan Amounts & Borrower";
      case 3:
        return "Additional Options & Review";
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
