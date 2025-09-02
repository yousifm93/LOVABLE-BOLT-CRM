import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Location {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ScenarioData {
  fico_score: number;
  dti_ratio: number;
  location: Location;
  loan_type: string;
  loan_purpose: string;
  loan_amount: number;
  property_value: number;
  down_payment: number;
  loan_term: number;
  lock_period: number;
  providers: string[];
  borrower_type: string;
  occupancy: string;
  property_type: string;
}

interface ScenarioFormProps {
  data: ScenarioData;
  onChange: (data: ScenarioData) => void;
  currentStep: number;
}

const LOAN_TYPES = [
  "Conventional",
  "FHA",
  "VA",
  "USDA",
  "Jumbo",
  "Non-QM"
];

const LOAN_PURPOSES = [
  "Purchase",
  "Refinance",
  "Cash Out Refinance"
];

const LOAN_TERMS = [15, 20, 25, 30];

const LOCK_PERIODS = [30, 45, 60, 90];

const PROVIDERS = [
  { id: "arrive", name: "Arrive.com", description: "Fast digital lending platform" },
  { id: "lenderprice", name: "LenderPrice", description: "Wholesale lending network" }
];

const BORROWER_TYPES = [
  "First Time Buyer",
  "Repeat Buyer",
  "Investor",
  "Self Employed"
];

const OCCUPANCY_TYPES = [
  "Primary Residence",
  "Second Home",
  "Investment Property"
];

const PROPERTY_TYPES = [
  "Single Family",
  "Condo",
  "Townhome",
  "Multi-Family",
  "Manufactured"
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function ScenarioForm({ data, onChange, currentStep }: ScenarioFormProps) {
  const updateData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      onChange({
        ...data,
        [parent]: {
          ...(data[parent as keyof ScenarioData] as any),
          [child]: value
        }
      });
    } else {
      onChange({
        ...data,
        [field]: value
      });
    }
  };

  const toggleProvider = (providerId: string) => {
    const newProviders = data.providers.includes(providerId)
      ? data.providers.filter(p => p !== providerId)
      : [...data.providers, providerId];
    onChange({ ...data, providers: newProviders });
  };

  const calculateLTV = () => {
    if (data.property_value && data.loan_amount) {
      return ((data.loan_amount / data.property_value) * 100).toFixed(1);
    }
    return "0";
  };

  if (currentStep === 1) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fico_score">FICO Score</Label>
            <Input
              id="fico_score"
              type="number"
              value={data.fico_score}
              onChange={(e) => updateData('fico_score', Number(e.target.value))}
              min={300}
              max={850}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dti_ratio">DTI Ratio (%)</Label>
            <Input
              id="dti_ratio"
              type="number"
              value={data.dti_ratio}
              onChange={(e) => updateData('dti_ratio', Number(e.target.value))}
              min={0}
              max={65}
              step={0.1}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Property Location</Label>
          <div className="grid gap-4">
            <Input
              placeholder="Street Address"
              value={data.location.street}
              onChange={(e) => updateData('location.street', e.target.value)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="City"
                value={data.location.city}
                onChange={(e) => updateData('location.city', e.target.value)}
              />
              <Select
                value={data.location.state}
                onValueChange={(value) => updateData('location.state', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="ZIP Code"
                value={data.location.zip}
                onChange={(e) => updateData('location.zip', e.target.value)}
                maxLength={5}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Borrower Type</Label>
            <Select
              value={data.borrower_type}
              onValueChange={(value) => updateData('borrower_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BORROWER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
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
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
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
            <Label>Loan Purpose</Label>
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
            <Label>Loan Term (Years)</Label>
            <Select
              value={data.loan_term.toString()}
              onValueChange={(value) => updateData('loan_term', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TERMS.map((term) => (
                  <SelectItem key={term} value={term.toString()}>
                    {term} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="property_value">Property Value</Label>
            <Input
              id="property_value"
              type="number"
              value={data.property_value}
              onChange={(e) => updateData('property_value', Number(e.target.value))}
              min={0}
              step={1000}
            />
          </div>
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
            <Label>LTV Ratio</Label>
            <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
              {calculateLTV()}%
            </div>
          </div>
        </div>

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
                  {period} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold">Select Pricing Providers</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which lenders to get pricing from
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {PROVIDERS.map((provider) => (
              <Card key={provider.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={provider.id}
                    checked={data.providers.includes(provider.id)}
                    onCheckedChange={() => toggleProvider(provider.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={provider.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {provider.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold">Scenario Summary</Label>
          <Card className="p-4 mt-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Borrower</h4>
                <div className="space-y-1 text-sm">
                  <div>FICO: {data.fico_score}</div>
                  <div>DTI: {data.dti_ratio}%</div>
                  <div>Type: {data.borrower_type}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Property</h4>
                <div className="space-y-1 text-sm">
                  <div>{data.location.city}, {data.location.state}</div>
                  <div>{data.property_type}</div>
                  <div>{data.occupancy}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Loan</h4>
                <div className="space-y-1 text-sm">
                  <div>{data.loan_type} - {data.loan_purpose}</div>
                  <div>${data.loan_amount.toLocaleString()} / {data.loan_term}yr</div>
                  <div>LTV: {calculateLTV()}%</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Providers</h4>
                <div className="flex flex-wrap gap-1">
                  {data.providers.map((providerId) => {
                    const provider = PROVIDERS.find(p => p.id === providerId);
                    return (
                      <Badge key={providerId} variant="secondary">
                        {provider?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}