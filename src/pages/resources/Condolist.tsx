import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Search } from "lucide-react";

export default function Condolist() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Condolist</h1>
        <p className="text-muted-foreground">Approved condominium directory</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2 text-primary" />
            Approved Condominiums
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-start h-96 pl-4 pt-4">
          <div className="text-left space-y-4">
            <Search className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Condo Directory</p>
            <p className="text-muted-foreground">Coming soon - Searchable approved condo database</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}