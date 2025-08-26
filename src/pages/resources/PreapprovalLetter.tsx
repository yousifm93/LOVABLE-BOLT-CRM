import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";

export default function PreapprovalLetter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Preapproval Letter</h1>
        <p className="text-muted-foreground">Generate preapproval letters</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Letter Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-start h-96 pl-4 pt-4">
          <div className="text-left space-y-4">
            <Download className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Preapproval Letters</p>
            <p className="text-muted-foreground">Coming soon - Automated letter generation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}