import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScenarioData } from "./NewRunModal";

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

const NUM_UNITS = [1, 2, 3, 4];

const INCOME_TYPES = [
  { label: "Full Doc", value: "Full Doc - 24M" },
  { label: "DSCR", value: "DSCR" },
  { label: "24-Month Bank Statements", value: "24Mo Business Bank Statements" },
  { label: "12-Month Bank Statements", value: "12Mo Business Bank Statements" },
  { label: "No Ratio Primary", value: "Community - No income/No employment/No DTI" }
];

const LOAN_TERMS = [
  { label: "30 Years", value: 30 },
  { label: "15 Years", value: 15 }
];

const LOAN_TYPES = [
  { label: "Conventional", value: "Conventional" },
  { label: "FHA", value: "FHA" },
  { label: "VA", value: "VA" }
];

interface ScenarioFormProps {
  data: ScenarioData;
  onChange: (data: ScenarioData) => void;
}

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

  // Calculate LTV from loan amount and purchase price
  const calculatedLTV = data.purchase_price > 0 
    ? ((data.loan_amount / data.purchase_price) * 100)
    : 0;

  // Handle LTV change - calculate loan amount from LTV
  const handleLTVChange = (newLTV: number) => {
    if (data.purchase_price > 0 && newLTV > 0) {
      const newLoanAmount = Math.round((data.purchase_price * newLTV) / 100);
      onChange({ ...data, loan_amount: newLoanAmount });
    }
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Income Type, Property Type & Loan Type */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Income Type</Label>
          <Select
            value={data.income_type || "Full Doc - 24M"}
            onValueChange={(value) => updateData('income_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCOME_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
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
        <div className="space-y-2">
          <Label>Loan Type</Label>
          <Select
            value={data.loan_type || "Conventional"}
            onValueChange={(value) => updateData('loan_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOAN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Purchase Price, Loan Amount & LTV */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price *</Label>
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
          <Label htmlFor="loan_amount">Loan Amount *</Label>
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
        <div className="space-y-2">
          <Label htmlFor="ltv">LTV %</Label>
          <Input
            id="ltv"
            type="number"
            value={calculatedLTV > 0 ? calculatedLTV.toFixed(2) : ""}
            onChange={(e) => handleLTVChange(Number(e.target.value))}
            min={0}
            max={100}
            step={0.5}
            placeholder="e.g. 80"
          />
          <p className="text-xs text-muted-foreground">
            Edit LTV or Loan Amount - they sync automatically
          </p>
        </div>
      </div>

      {/* Row 3: Occupancy, Number of Units & Loan Term */}
      <div className="grid gap-4 md:grid-cols-3">
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
          <Label>Number of Units</Label>
          <Select
            value={data.num_units?.toString() || "1"}
            onValueChange={(value) => updateData('num_units', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NUM_UNITS.map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'Unit' : 'Units'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Loan Term</Label>
          <Select
            value={data.loan_term?.toString() || "30"}
            onValueChange={(value) => updateData('loan_term', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOAN_TERMS.map((term) => (
                <SelectItem key={term.value} value={term.value.toString()}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: FICO Score & Zip Code */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fico_score">FICO Score *</Label>
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
          <Label htmlFor="zip_code">Zip Code *</Label>
          <Input
            id="zip_code"
            type="text"
            value={data.zip_code}
            onChange={(e) => updateData('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
            maxLength={5}
            placeholder="e.g. 33131"
          />
        </div>
      </div>

      {/* Conditional DSCR Ratio field */}
      {data.income_type === "DSCR" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>DSCR Ratio</Label>
            <Input
              type="text"
              value={data.dscr_ratio || ""}
              onChange={(e) => updateData('dscr_ratio', e.target.value)}
              placeholder="e.g. 1.25"
            />
            <p className="text-xs text-muted-foreground">
              Enter a value between 0 and 2.0 (e.g., 0.7, 1.25, 1.5)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
