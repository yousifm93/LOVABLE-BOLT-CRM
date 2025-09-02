import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Plus, Mail, Send, Check, X, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const EmailMarketingNav = ({ currentPath }: { currentPath: string }) => {
  const navItems = [
    { title: "Campaigns", path: "campaigns", icon: Mail },
    { title: "Templates", path: "templates", icon: Mail },
    { title: "Audiences", path: "audiences", icon: Mail },
    { title: "Analytics", path: "analytics", icon: BarChart3 },
    { title: "Senders", path: "senders", icon: Send },
    { title: "Settings", path: "settings", icon: Mail }
  ];

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-8">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

interface EmailSender {
  id: string;
  from_name: string;
  from_email: string;
  domain: string;
  dkim_status: string;
  spf_status: string;
  tracking_domain: string | null;
  is_default: boolean;
  created_at: string;
}

export default function EmailSenders() {
  const location = useLocation();
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      const { data, error } = await supabase
        .from('email_senders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSenders(data || []);
    } catch (error: any) {
      console.error('Error fetching senders:', error);
      toast({
        title: "Error",
        description: "Failed to load senders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      verified: { 
        color: "bg-success text-success-foreground", 
        icon: <Check className="h-3 w-3" />, 
        label: "Verified" 
      },
      pending: { 
        color: "bg-warning text-warning-foreground", 
        icon: <AlertCircle className="h-3 w-3" />, 
        label: "Pending" 
      },
      failed: { 
        color: "bg-destructive text-destructive-foreground", 
        icon: <X className="h-3 w-3" />, 
        label: "Failed" 
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const verifiedSenders = senders.filter(s => s.dkim_status === 'verified' && s.spf_status === 'verified');
  const pendingSenders = senders.filter(s => s.dkim_status === 'pending' || s.spf_status === 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <EmailMarketingNav currentPath={location.pathname} />
        <div>Loading senders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailMarketingNav currentPath={location.pathname} />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Senders</h2>
          <p className="text-muted-foreground">Manage your sender domains and authentication</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Sender
        </Button>
      </div>

      {pendingSenders.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>DNS Configuration Required</AlertTitle>
          <AlertDescription>
            You have {pendingSenders.length} sender(s) with pending DNS verification. 
            Configure your DNS records to improve email deliverability.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Senders</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{senders.length}</div>
            <p className="text-xs text-muted-foreground">Configured domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Senders</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{verifiedSenders.length}</div>
            <p className="text-xs text-muted-foreground">Ready to send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingSenders.length}</div>
            <p className="text-xs text-muted-foreground">Needs DNS setup</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sender Domains</CardTitle>
          <CardDescription>Configure and verify your email sender domains</CardDescription>
        </CardHeader>
        <CardContent>
          {senders.length === 0 ? (
            <div className="text-center py-8">
              <Send className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No senders configured</h3>
              <p className="text-muted-foreground mb-4">Add your first sender domain to start sending emails.</p>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Sender
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender Info</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>DKIM Status</TableHead>
                  <TableHead>SPF Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senders.map((sender) => (
                  <TableRow key={sender.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sender.from_name}</div>
                        <div className="text-sm text-muted-foreground">{sender.from_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{sender.domain}</TableCell>
                    <TableCell>{getStatusBadge(sender.dkim_status)}</TableCell>
                    <TableCell>{getStatusBadge(sender.spf_status)}</TableCell>
                    <TableCell>
                      {sender.is_default && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          Configure DNS
                        </Button>
                        <Button variant="ghost" size="sm">
                          Test
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DNS Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Setup Instructions</CardTitle>
          <CardDescription>Configure these DNS records to verify your domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">DKIM Record</h4>
            <div className="bg-muted p-3 rounded font-mono text-sm">
              <div><strong>Type:</strong> TXT</div>
              <div><strong>Name:</strong> mortgagebolt._domainkey.mortgagebolt.com</div>
              <div><strong>Value:</strong> v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">SPF Record</h4>
            <div className="bg-muted p-3 rounded font-mono text-sm">
              <div><strong>Type:</strong> TXT</div>
              <div><strong>Name:</strong> mortgagebolt.com</div>
              <div><strong>Value:</strong> v=spf1 include:resend.com ~all</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Tracking Domain (Optional)</h4>
            <div className="bg-muted p-3 rounded font-mono text-sm">
              <div><strong>Type:</strong> CNAME</div>
              <div><strong>Name:</strong> email.mortgagebolt.com</div>
              <div><strong>Value:</strong> track.resend.com</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}