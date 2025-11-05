import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface ScenarioData {
  fico_score: number;
  citizenship: string;
  dti: string;
  property_type: string;
  num_units: number;
  occupancy: string;
  state: string;
  program_type: string;
  loan_type: string;
  amortization_type: string;
  loan_purpose: string;
  loan_amount: number;
  ltv: number;
  lock_period: number;
  broker_compensation: string;
  admin_fee_buyout: boolean;
  escrow_waiver: boolean;
  high_balance: boolean;
  sub_financing: boolean;
}

interface ScenarioFormProps {
  data: ScenarioData;
  onChange: (data: ScenarioData) => void;
  currentStep: number;
}

const PROGRAM_TYPES = [
  "Conventional",
  "Non-QM",
  "Prime Jumbo",
  "FHA",
  "VA"
];

const LOAN_TYPES = [
  "Fixed",
  "ARM"
];

const CITIZENSHIP_OPTIONS = [
  "US Citizen / Permanent Resident",
  "Non-Permanent Resident"
];

const OCCUPANCY_TYPES = [
  "Primary Residence",
  "Second Home",
  "Investment"
];

const LOAN_PURPOSES = [
  "Purchase",
  "Rate and Term Refinance",
  "Cash Out"
];

const AMORTIZATION_TYPES = [
  "30 Year Fixed",
  "25 Year",
  "20 Year",
  "15 Year"
];

const PROPERTY_TYPES = [
  "1 Unit SFR",
  "Condo",
  "2-4 Unit"
];

const NUM_UNITS = [1, 2, 3, 4];

const DTI_OPTIONS = [
  "DTI <=40%",
  "DTI 41%-45%",
  "DTI 46%-50%",
  "DTI >50%"
];

const BROKER_COMPENSATION_OPTIONS = [
  "BPC",
  "1.00%",
  "1.50%",
  "2.00%",
  "2.50%"
];

const LOCK_PERIODS = [30, 45, 60, 90];

export function ScenarioForm({ data, onChange, currentStep }: ScenarioFormProps) {
  const updateData = (field: keyof ScenarioData, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  // Step 1: Loan Program & Property Details
  if (currentStep === 1) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Program Type</Label>
            <Select
              value={data.program_type}
              onValueChange={(value) => updateData('program_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Loan Type</Label>
            <Select
              value={data.loan_type}
              onValueChange={(value) => updateData('loan_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Citizenship</Label>
            <Select
              value={data.citizenship}
              onValueChange={(value) => updateData('citizenship', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIZENSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Occupancy</Label>
            <Select
              value={data.occupancy}
              onValueChange={(value) => updateData('occupancy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OCCUPANCY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select
              value={data.loan_purpose}
              onValueChange={(value) => updateData('loan_purpose', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select
              value={data.property_type}
              onValueChange={(value) => updateData('property_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Number of Units</Label>
            <Select
              value={data.num_units.toString()}
              onValueChange={(value) => updateData('num_units', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUM_UNITS.map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} Unit{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value="Florida" disabled className="bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Loan Amounts & Borrower Details
  if (currentStep === 2) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fico_score">
            FICO Score: <span className="font-semibold">{data.fico_score}</span>
          </Label>
          <Slider
            id="fico_score"
            min={620}
            max={850}
            step={5}
            value={[data.fico_score]}
            onValueChange={(value) => updateData('fico_score', value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>620</span>
            <span>850</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ltv">
            LTV (Loan-to-Value): <span className="font-semibold">{data.ltv}%</span>
          </Label>
          <Slider
            id="ltv"
            min={55}
            max={97}
            step={1}
            value={[data.ltv]}
            onValueChange={(value) => updateData('ltv', value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>55%</span>
            <span>97%</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loan_amount">Loan Amount</Label>
            <Input
              id="loan_amount"
              type="number"
              value={data.loan_amount}
              onChange={(e) => updateData('loan_amount', Number(e.target.value))}
              min={0}
              step={1000}
            />
          </div>
          <div className="space-y-2">
            <Label>DTI (Debt-to-Income)</Label>
            <Select
              value={data.dti}
              onValueChange={(value) => updateData('dti', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DTI_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Amortization Type</Label>
          <Select
            value={data.amortization_type}
            onValueChange={(value) => updateData('amortization_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMORTIZATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Step 3: Additional Options & Review
  if (currentStep === 3) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rate Lock Period</Label>
            <Select
              value={data.lock_period.toString()}
              onValueChange={(value) => updateData('lock_period', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCK_PERIODS.map((period) => (
                  <SelectItem key={period} value={period.toString()}>
                    {period} Days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Broker Compensation</Label>
            <Select
              value={data.broker_compensation}
              onValueChange={(value) => updateData('broker_compensation', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BROKER_COMPENSATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold mb-4 block">Additional Options</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin_fee_buyout"
                checked={data.admin_fee_buyout}
                onCheckedChange={(checked) => updateData('admin_fee_buyout', checked as boolean)}
              />
              <Label htmlFor="admin_fee_buyout" className="cursor-pointer">
                Admin Fee Buyout
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="escrow_waiver"
                checked={data.escrow_waiver}
                onCheckedChange={(checked) => updateData('escrow_waiver', checked as boolean)}
              />
              <Label htmlFor="escrow_waiver" className="cursor-pointer">
                Escrow Waiver
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="high_balance"
                checked={data.high_balance}
                onCheckedChange={(checked) => updateData('high_balance', checked as boolean)}
              />
              <Label htmlFor="high_balance" className="cursor-pointer">
                High Balance
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sub_financing"
                checked={data.sub_financing}
                onCheckedChange={(checked) => updateData('sub_financing', checked as boolean)}
              />
              <Label htmlFor="sub_financing" className="cursor-pointer">
                Sub Financing
              </Label>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold">Scenario Summary</Label>
          <Card className="p-6 mt-2">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Loan Program</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program Type:</span>
                    <span className="font-medium">{data.program_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loan Type:</span>
                    <span className="font-medium">{data.loan_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose:</span>
                    <span className="font-medium">{data.loan_purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amortization:</span>
                    <span className="font-medium">{data.amortization_type}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Property</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{data.property_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units:</span>
                    <span className="font-medium">{data.num_units}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occupancy:</span>
                    <span className="font-medium">{data.occupancy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State:</span>
                    <span className="font-medium">Florida</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Borrower</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FICO Score:</span>
                    <span className="font-medium">{data.fico_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DTI:</span>
                    <span className="font-medium">{data.dti}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Citizenship:</span>
                    <span className="font-medium">{data.citizenship}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Loan Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">${data.loan_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV:</span>
                    <span className="font-medium">{data.ltv}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lock Period:</span>
                    <span className="font-medium">{data.lock_period} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Broker Comp:</span>
                    <span className="font-medium">{data.broker_compensation}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {(data.admin_fee_buyout || data.escrow_waiver || data.high_balance || data.sub_financing) && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Additional Options</h4>
                <div className="flex flex-wrap gap-2">
                  {data.admin_fee_buyout && <Badge variant="secondary">Admin Fee Buyout</Badge>}
                  {data.escrow_waiver && <Badge variant="secondary">Escrow Waiver</Badge>}
                  {data.high_balance && <Badge variant="secondary">High Balance</Badge>}
                  {data.sub_financing && <Badge variant="secondary">Sub Financing</Badge>}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
