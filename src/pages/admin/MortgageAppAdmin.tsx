import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Clock, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function MortgageAppAdmin() {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  
  const applicationUrl = `${window.location.origin}/apply`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(applicationUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Application link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleOpenApplication = () => {
    window.open('/apply', '_blank');
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Mortgage Applications</h1>
        <p className="text-muted-foreground">Manage and review submitted mortgage applications</p>
      </div>
      
      {/* Shareable Link Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Shareable Application Link</CardTitle>
          <CardDescription>Share this link with borrowers to complete their mortgage application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2 bg-background border border-border rounded-md font-mono text-sm">
              {applicationUrl}
            </div>
            <Button onClick={handleCopyLink} variant="outline" size="sm">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={handleOpenApplication} variant="default" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Borrowers can create an account to save their progress</li>
              <li>Applications are saved as they complete each step</li>
              <li>Upon submission, applications flow into the Screening pipeline</li>
              <li>Duplicate leads are automatically merged with existing records</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted to Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Applications submitted in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No applications yet</p>
            <p className="text-sm mt-1">Applications will appear here once borrowers submit them</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
