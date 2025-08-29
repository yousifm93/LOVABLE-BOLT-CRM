import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  FileText, 
  Users, 
  Download, 
  ExternalLink, 
  Star, 
  TrendingUp,
  Target,
  Award,
  BookOpen,
  Mail,
  Phone
} from "lucide-react";

export default function Marketing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Hero Section */}
      <div className="bg-gradient-card border-b">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Partner with <span className="text-primary">Premier Lending</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Join our network of successful real estate agents and grow your business with our comprehensive lending solutions and marketing support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Users className="h-5 w-5 mr-2" />
                Join Our Network
              </Button>
              <Button variant="outline" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Download Resources
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 space-y-16">
        {/* Benefits Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Partner With Us?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide the tools, support, and expertise you need to close more deals and delight your clients.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Competitive Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Access to some of the most competitive rates in the market, helping your clients save money and close faster.
                </p>
                <Badge variant="secondary" className="mt-4">Starting at 6.25% APR</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Fast Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Close loans in as little as 15 days with our streamlined digital process and dedicated support team.
                </p>
                <Badge variant="secondary" className="mt-4">15-Day Close</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Expert Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dedicated loan officers and support staff to help you through every step of the lending process.
                </p>
                <Badge variant="secondary" className="mt-4">24/7 Support</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Marketing Resources */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Marketing Resources</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional marketing materials to help you attract more clients and showcase our partnership.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Home className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Open House Flyers</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Professional flyers showcasing lending options for your open houses.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Listing Templates</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Eye-catching listing templates that highlight financing options.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Buyer Guides</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive guides to help first-time and repeat buyers.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Social Media Kit</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Ready-to-post social media content for your marketing channels.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tools & Resources */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Tools & Resources</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access powerful tools and resources to help your clients and grow your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-gradient-card shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2 text-primary" />
                  Condo Approval Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Search our comprehensive database of pre-approved condominiums across major markets.
                </p>
                <Button className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Database
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Pre-Approval Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Help your clients understand their purchasing power with our instant pre-approval calculator.
                </p>
                <Button className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Use Calculator
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-card rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Partner with Us?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of successful real estate agents who trust us with their clients' lending needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg">
              <Mail className="h-5 w-5 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" size="lg">
              <Phone className="h-5 w-5 mr-2" />
              Schedule Call
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">500+ Partners</p>
              <p className="text-sm text-muted-foreground">Trusted by agents nationwide</p>
            </div>
            <div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">98% Close Rate</p>
              <p className="text-sm text-muted-foreground">Industry-leading success</p>
            </div>
            <div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">15-Day Average</p>
              <p className="text-sm text-muted-foreground">From application to close</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}