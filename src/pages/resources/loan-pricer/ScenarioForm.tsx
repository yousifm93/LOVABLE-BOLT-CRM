import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScenarioData } from "./NewRunModal";

interface ScenarioFormProps {
  data: ScenarioData;
  onChange: (data: ScenarioData) => void;
}

const LOAN_TYPES = ["Conventional", "FHA", "VA"];

const TERM_YEARS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 40
];

const LOAN_PURPOSES = ["Purchase", "Refinance"];

const OCCUPANCY_TYPES = [
  "Primary Residence",
  "Second Home",
  "Investment"
];

const PROPERTY_TYPES = [
  "Single Family",
  "Condo",
  "2-4 Units"
];

const NUM_UNITS = [2, 3, 4];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function ScenarioForm({ data, onChange }: ScenarioFormProps) {
  const updateData = (field: keyof ScenarioData, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Credit Score & Loan Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fico_score">Credit Score (FICO) *</Label>
          <Input
            id="fico_score"
            type="number"
            value={data.fico_score || ""}
            onChange={(e) => updateData('fico_score', Number(e.target.value))}
            min={300}
            max={850}
            placeholder="e.g. 720"
          />
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

      {/* Row 2: Term & Loan Purpose */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Term in Years</Label>
          <Select
            value={data.term_years.toString()}
            onValueChange={(value) => updateData('term_years', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERM_YEARS.map((term) => (
                <SelectItem key={term} value={term.toString()}>
                  {term} Years
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      {/* Row 3: Purchase Price & Loan Amount */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price</Label>
          <Input
            id="purchase_price"
            type="number"
            value={data.purchase_price || ""}
            onChange={(e) => updateData('purchase_price', Number(e.target.value))}
            min={0}
            step={1000}
            placeholder="e.g. 400000"
          />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(data.purchase_price)}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="loan_amount">Loan Amount</Label>
          <Input
            id="loan_amount"
            type="number"
            value={data.loan_amount || ""}
            onChange={(e) => updateData('loan_amount', Number(e.target.value))}
            min={0}
            step={1000}
            placeholder="e.g. 320000"
          />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(data.loan_amount)}
          </p>
        </div>
      </div>

      {/* Row 4: Occupancy & Property Type */}
      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="space-y-2">
          <Label>Property Type</Label>
          <Select
            value={data.property_type}
            onValueChange={(value) => {
              updateData('property_type', value);
              // Clear num_units if not 2-4 Units
              if (value !== "2-4 Units") {
                updateData('num_units', undefined);
              }
            }}
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

      {/* Conditional Row: Number of Units */}
      {data.property_type === "2-4 Units" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Number of Units *</Label>
            <Select
              value={data.num_units?.toString() || ""}
              onValueChange={(value) => updateData('num_units', Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of units" />
              </SelectTrigger>
              <SelectContent>
                {NUM_UNITS.map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} Units
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Row 5: Zip Code & State */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="zip_code">Zip Code *</Label>
          <Input
            id="zip_code"
            type="text"
            value={data.zip_code}
            onChange={(e) => updateData('zip_code', e.target.value)}
            maxLength={5}
            placeholder="e.g. 33131"
          />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select
            value={data.state}
            onValueChange={(value) => updateData('state', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Axiom Integration Instructions */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Axiom.ai Integration Instructions
        </h3>
        <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
          After creating this pricing run, you can use Axiom.ai to automatically scrape your lender's pricing website:
        </p>
        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
          <li>Install the Axiom.ai Chrome extension</li>
          <li>Navigate to your lender's pricing website</li>
          <li>Record a bot that fills in these fields: Credit Score, Loan Type, Term, Purpose, Purchase Price, Loan Amount, Occupancy, Property Type, Units (if applicable), Zip Code, State</li>
          <li>Set the bot to capture the pricing results table/screenshot</li>
          <li>Run the bot manually or schedule it to run automatically</li>
          <li>Results will be saved and viewable in this CRM</li>
        </ol>
      </div>
    </div>
  );
}
