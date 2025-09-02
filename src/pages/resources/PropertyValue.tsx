import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Home, MapPin, DollarSign, Calendar, Bed, Bath, Square } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertyValuation {
  estimate: number;
  low: number;
  high: number;
  confidence: number;
  provider: string;
  cached: boolean;
  cachedDaysAgo?: number;
  comps: Array<{
    address: string;
    distance_miles: number;
    beds: number;
    baths: number;
    sqft: number;
    sale_price: number;
    sale_date: string;
  }>;
}

interface PropertyValueProps {
  mode?: 'internal' | 'public';
}

export default function PropertyValue({ mode = 'internal' }: PropertyValueProps) {
  const [address, setAddress] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [sqft, setSqft] = useState('');
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<PropertyValuation | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEstimate = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('avm-estimate', {
        body: {
          address: address.trim(),
          beds: beds ? parseInt(beds) : undefined,
          baths: baths ? parseFloat(baths) : undefined,
          squareFootage: sqft ? parseInt(sqft) : undefined,
          mode
        }
      });

      if (error) {
        console.error('Valuation error:', error);
        toast.error('Failed to get property valuation');
        return;
      }

      setValuation(data);
      toast.success('Property valuation completed');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get property valuation');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setValuation(null);
    handleEstimate();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Value Estimator</h1>
        <p className="text-muted-foreground">
          Get an instant estimate of your property's value using automated valuation models
        </p>
      </div>

      <div className="grid gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Information
            </CardTitle>
            <CardDescription>
              Enter the property address and optional details for a more accurate estimate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Property Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St, Miami, FL 33101"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="beds">Bedrooms</Label>
                <Input
                  id="beds"
                  type="number"
                  placeholder="3"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="baths">Bathrooms</Label>
                <Input
                  id="baths"
                  type="number"
                  step="0.5"
                  placeholder="2.5"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sqft">Square Feet</Label>
                <Input
                  id="sqft"
                  type="number"
                  placeholder="1500"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button 
              onClick={handleEstimate} 
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? 'Getting Estimate...' : 'Get Property Estimate'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {valuation && (
          <>
            {/* Main Estimate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Estimated Value
                  </CardTitle>
                  {valuation.cached && (
                    <CardDescription>
                      Refreshed {valuation.cachedDaysAgo} day(s) ago
                      <Button variant="link" onClick={handleRefresh} className="ml-2 p-0 h-auto">
                        Refresh
                      </Button>
                    </CardDescription>
                  )}
                </div>
                <Badge variant="secondary">{valuation.provider}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {formatCurrency(valuation.estimate)}
                  </div>
                  <div className="text-muted-foreground">
                    Range: {formatCurrency(valuation.low)} - {formatCurrency(valuation.high)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confidence Level</span>
                    <span>{Math.round(valuation.confidence * 100)}%</span>
                  </div>
                  <Progress value={valuation.confidence * 100} className="w-full" />
                </div>

                {valuation.confidence < 0.35 && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Low confidence estimate. Consider requesting a professional comparative market analysis (CMA) for a more accurate valuation.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2 mt-6">
                  <Button variant="outline" className="flex-1 min-w-fit">
                    Request Free CMA
                  </Button>
                  <Button variant="outline" className="flex-1 min-w-fit">
                    Talk to Loan Advisor
                  </Button>
                  <Button className="flex-1 min-w-fit">
                    Start Pre-Qualification
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comparables */}
            {valuation.comps && valuation.comps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Recent Comparable Sales
                  </CardTitle>
                  <CardDescription>
                    Similar properties sold recently in the area
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {valuation.comps.map((comp, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{comp.address}</h4>
                            <p className="text-sm text-muted-foreground">
                              {comp.distance_miles} miles away
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatCurrency(comp.sale_price)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(comp.sale_date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {comp.beds} beds
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {comp.baths} baths
                          </span>
                          <span className="flex items-center gap-1">
                            <Square className="h-3 w-3" />
                            {comp.sqft?.toLocaleString()} sq ft
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground space-y-2">
                  <h4 className="font-semibold text-foreground">Important Disclaimer</h4>
                  <p>
                    This is an estimate, provided for educational purposes and borrower engagement. 
                    Automated valuation models (AVMs) can vary; results are not an appraisal or a credit decision. 
                    For a precise valuation, request a comparative market analysis (CMA) or appraisal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}