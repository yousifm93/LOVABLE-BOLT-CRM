import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreapprovalData {
  borrowerName: string;
  loanAmount: string;
  interestRate: string;
  loanTerm: string;
  loanType: string;
  propertyAddress: string;
  expirationDate: string;
  conditions: string;
  lenderName: string;
}

export default function PreapprovalLetter() {
  const [letterData, setLetterData] = useState<PreapprovalData>({
    borrowerName: "",
    loanAmount: "",
    interestRate: "",
    loanTerm: "30",
    loanType: "Conventional",
    propertyAddress: "",
    expirationDate: "",
    conditions: "",
    lenderName: ""
  });

  const [savedLetters, setSavedLetters] = useState<PreapprovalData[]>([]);
  const { toast } = useToast();

  const handleInputChange = (field: keyof PreapprovalData, value: string) => {
    setLetterData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveLetter = () => {
    if (!letterData.borrowerName || !letterData.loanAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in borrower name and loan amount.",
        variant: "destructive"
      });
      return;
    }

    setSavedLetters(prev => [...prev, { ...letterData }]);
    toast({
      title: "Success",
      description: "Preapproval letter saved successfully.",
    });
  };

  const handleGenerateDocument = () => {
    toast({
      title: "Document Generated",
      description: "Preapproval letter is ready for download.",
    });
  };

  const handleClearForm = () => {
    setLetterData({
      borrowerName: "",
      loanAmount: "",
      interestRate: "",
      loanTerm: "30",
      loanType: "Conventional",
      propertyAddress: "",
      expirationDate: "",
      conditions: "",
      lenderName: ""
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Preapproval Letter Generator</h1>
        <p className="text-muted-foreground">Create and manage preapproval letters for borrowers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preapproval Letter Form */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Letter Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="borrowerName">Borrower Name</Label>
                <Input
                  id="borrowerName"
                  value={letterData.borrowerName}
                  onChange={(e) => handleInputChange("borrowerName", e.target.value)}
                  placeholder="Enter borrower name"
                />
              </div>
              <div>
                <Label htmlFor="loanAmount">Loan Amount</Label>
                <Input
                  id="loanAmount"
                  type="number"
                  value={letterData.loanAmount}
                  onChange={(e) => handleInputChange("loanAmount", e.target.value)}
                  placeholder="Enter loan amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="propertyAddress">Property Address (Optional)</Label>
              <Input
                id="propertyAddress"
                value={letterData.propertyAddress}
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
                  value={letterData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                <Select value={letterData.loanTerm} onValueChange={(value) => handleInputChange("loanTerm", value)}>
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
                <Select value={letterData.loanType} onValueChange={(value) => handleInputChange("loanType", value)}>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={letterData.expirationDate}
                  onChange={(e) => handleInputChange("expirationDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lenderName">Lender Name</Label>
                <Input
                  id="lenderName"
                  value={letterData.lenderName}
                  onChange={(e) => handleInputChange("lenderName", e.target.value)}
                  placeholder="Enter lender name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conditions">Conditions & Notes</Label>
              <Textarea
                id="conditions"
                value={letterData.conditions}
                onChange={(e) => handleInputChange("conditions", e.target.value)}
                placeholder="Special conditions, requirements, or additional notes"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveLetter} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Save Letter
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

        {/* Saved Letters */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Saved Letters ({savedLetters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedLetters.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No saved letters yet</p>
                <p className="text-sm text-muted-foreground">Create your first preapproval letter using the form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedLetters.map((letter, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{letter.borrowerName}</h4>
                        <p className="text-sm text-muted-foreground">{letter.propertyAddress || "No property specified"}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span>Amount: ${parseFloat(letter.loanAmount || "0").toLocaleString()}</span>
                      <span>Rate: {letter.interestRate}%</span>
                      <span>Term: {letter.loanTerm} years</span>
                      <span>Type: {letter.loanType}</span>
                    </div>
                    {letter.expirationDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(letter.expirationDate).toLocaleDateString()}
                      </p>
                    )}
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