import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Image } from "lucide-react";

export default function Marketing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketing</h1>
        <p className="text-muted-foreground">Marketing materials and resources</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Megaphone className="h-5 w-5 mr-2 text-primary" />
            Marketing Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-start h-96 pl-4 pt-4">
          <div className="text-left space-y-4">
            <Image className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Marketing Materials</p>
            <p className="text-muted-foreground">Coming soon - Marketing templates and assets</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}