import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Plus, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoanEstimateData {
  borrowerName: string;
  propertyAddress: string;
  loanAmount: string;
  interestRate: string;
  loanTerm: string;
  loanType: string;
  monthlyPayment: string;
  downPayment: string;
  closingCosts: string;
  notes: string;
}

export default function LoanEstimate() {
  const [estimateData, setEstimateData] = useState<LoanEstimateData>({
    borrowerName: "",
    propertyAddress: "",
    loanAmount: "",
    interestRate: "",
    loanTerm: "30",
    loanType: "Conventional",
    monthlyPayment: "",
    downPayment: "",
    closingCosts: "",
    notes: ""
  });

  const [savedEstimates, setSavedEstimates] = useState<LoanEstimateData[]>([]);
  const { toast } = useToast();

  const handleInputChange = (field: keyof LoanEstimateData, value: string) => {
    setEstimateData(prev => ({ ...prev, [field]: value }));
  };

  const calculateMonthlyPayment = () => {
    const principal = parseFloat(estimateData.loanAmount);
    const rate = parseFloat(estimateData.interestRate) / 100 / 12;
    const payments = parseInt(estimateData.loanTerm) * 12;

    if (principal && rate && payments) {
      const monthlyPayment = (principal * rate * Math.pow(1 + rate, payments)) / (Math.pow(1 + rate, payments) - 1);
      setEstimateData(prev => ({ ...prev, monthlyPayment: monthlyPayment.toFixed(2) }));
    }
  };

  const handleSaveEstimate = () => {
    if (!estimateData.borrowerName || !estimateData.loanAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in borrower name and loan amount.",
        variant: "destructive"
      });
      return;
    }

    setSavedEstimates(prev => [...prev, { ...estimateData }]);
    toast({
      title: "Success",
      description: "Loan estimate saved successfully.",
    });
  };

  const handleGenerateDocument = () => {
    toast({
      title: "Document Generated",
      description: "Loan estimate document is ready for download.",
    });
  };

  const handleClearForm = () => {
    setEstimateData({
      borrowerName: "",
      propertyAddress: "",
      loanAmount: "",
      interestRate: "",
      loanTerm: "30",
      loanType: "Conventional",
      monthlyPayment: "",
      downPayment: "",
      closingCosts: "",
      notes: ""
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Loan Estimate Generator</h1>
        <p className="text-muted-foreground">Create and manage loan estimates for borrowers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Estimate Form */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-primary" />
              Loan Estimate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="borrowerName">Borrower Name</Label>
                <Input
                  id="borrowerName"
                  value={estimateData.borrowerName}
                  onChange={(e) => handleInputChange("borrowerName", e.target.value)}
                  placeholder="Enter borrower name"
                />
              </div>
              <div>
                <Label htmlFor="loanAmount">Loan Amount</Label>
                <Input
                  id="loanAmount"
                  type="number"
                  value={estimateData.loanAmount}
                  onChange={(e) => handleInputChange("loanAmount", e.target.value)}
                  placeholder="Enter loan amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                value={estimateData.propertyAddress}
                onChange={(e) => handleInputChange("propertyAddress", e.target.value)}
                placeholder="Enter property address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={estimateData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                <Select value={estimateData.loanTerm} onValueChange={(value) => handleInputChange("loanTerm", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Years</SelectItem>
                    <SelectItem value="20">20 Years</SelectItem>
                    <SelectItem value="25">25 Years</SelectItem>
                    <SelectItem value="30">30 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="loanType">Loan Type</Label>
                <Select value={estimateData.loanType} onValueChange={(value) => handleInputChange("loanType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conventional">Conventional</SelectItem>
                    <SelectItem value="FHA">FHA</SelectItem>
                    <SelectItem value="VA">VA</SelectItem>
                    <SelectItem value="USDA">USDA</SelectItem>
                    <SelectItem value="Jumbo">Jumbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="monthlyPayment">Monthly Payment</Label>
                <div className="flex gap-2">
                  <Input
                    id="monthlyPayment"
                    type="number"
                    value={estimateData.monthlyPayment}
                    onChange={(e) => handleInputChange("monthlyPayment", e.target.value)}
                    placeholder="0.00"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calculateMonthlyPayment}
                  >
                    Calc
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="downPayment">Down Payment</Label>
                <Input
                  id="downPayment"
                  type="number"
                  value={estimateData.downPayment}
                  onChange={(e) => handleInputChange("downPayment", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="closingCosts">Estimated Closing Costs</Label>
                <Input
                  id="closingCosts"
                  type="number"
                  value={estimateData.closingCosts}
                  onChange={(e) => handleInputChange("closingCosts", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={estimateData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes or conditions"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveEstimate} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Save Estimate
              </Button>
              <Button onClick={handleGenerateDocument} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
              <Button onClick={handleClearForm} variant="outline">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Estimates */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Saved Estimates ({savedEstimates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedEstimates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No saved estimates yet</p>
                <p className="text-sm text-muted-foreground">Create your first loan estimate using the form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedEstimates.map((estimate, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{estimate.borrowerName}</h4>
                        <p className="text-sm text-muted-foreground">{estimate.propertyAddress}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span>Loan: ${parseFloat(estimate.loanAmount || "0").toLocaleString()}</span>
                      <span>Rate: {estimate.interestRate}%</span>
                      <span>Payment: ${estimate.monthlyPayment}</span>
                      <span>Type: {estimate.loanType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}