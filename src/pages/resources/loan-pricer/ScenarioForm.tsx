import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScenarioData } from "./NewRunModal";

interface ScenarioFormProps {
  data: ScenarioData;
  onChange: (data: ScenarioData) => void;
}

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
      {/* Row 1: FICO Score & Zip Code */}
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

      {/* Row 2: Purchase Price & Loan Amount */}
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {/* Row 3: Occupancy & Property Type */}
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

      {/* Row 4: Number of Units */}
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  );
}
