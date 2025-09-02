import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import PropertyValue from './PropertyValue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PropertyValuePublic() {
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [leadData, setLeadData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agreeToContact: false
  });
  const [submittingLead, setSubmittingLead] = useState(false);

  const handleGetEstimate = () => {
    setShowLeadCapture(true);
  };

  const handleLeadSubmit = async () => {
    if (!leadData.firstName || !leadData.email || !leadData.agreeToContact) {
      toast.error('Please fill in all required fields and agree to be contacted');
      return;
    }

    setSubmittingLead(true);
    try {
      // For now, just proceed without storing the lead
      // In production, you'd want to handle this properly with RLS policies
      console.log('Lead data:', leadData);
      
      setShowLeadCapture(false);
      setShowResults(true);
      toast.success('Thank you! Here\'s your property estimate');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save your information');
    } finally {
      setSubmittingLead(false);
    }
  };

  if (showResults) {
    return <PropertyValue mode="public" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto py-16 px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            What's Your <span className="text-primary">Home Worth?</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get an instant, accurate estimate of your property's value using advanced 
            automated valuation models and recent comparable sales data.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4"
            onClick={handleGetEstimate}
          >
            Get My Free Home Value Estimate
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto py-16 px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <CardTitle>Instant Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Get your property estimate in seconds, not days. No waiting for appointments or callbacks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <CardTitle>Data-Driven Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Our AVM uses the latest market data and comparable sales to provide reliable estimates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <CardTitle>Comparable Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                See recent sales of similar properties in your area to understand your home's market position.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Discover Your Home's Value?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners who have used our free property valuation tool 
            to make informed decisions about their real estate.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4"
            onClick={handleGetEstimate}
          >
            Start My Free Valuation Now
          </Button>
        </div>
      </div>

      {/* Lead Capture Modal */}
      <Dialog open={showLeadCapture} onOpenChange={setShowLeadCapture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Your Free Home Value Report</DialogTitle>
            <DialogDescription>
              We'll need a few details to provide you with the most accurate estimate and comparable sales data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={leadData.firstName}
                  onChange={(e) => setLeadData({...leadData, firstName: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={leadData.lastName}
                  onChange={(e) => setLeadData({...leadData, lastName: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={leadData.email}
                onChange={(e) => setLeadData({...leadData, email: e.target.value})}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={leadData.phone}
                onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToContact"
                checked={leadData.agreeToContact}
                onCheckedChange={(checked) => setLeadData({...leadData, agreeToContact: !!checked})}
              />
              <Label htmlFor="agreeToContact" className="text-sm">
                I agree to be contacted by MortgageBolt regarding my property valuation and potential mortgage services *
              </Label>
            </div>

            <Button 
              className="w-full" 
              onClick={handleLeadSubmit}
              disabled={submittingLead}
            >
              {submittingLead ? 'Processing...' : 'Get My Home Value Report'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your information is secure and will only be used to provide your property valuation and related mortgage services.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}