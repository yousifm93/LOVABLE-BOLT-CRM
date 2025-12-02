import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Clock, ExternalLink, Copy, Check, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MortgageApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  loan_type: string | null;
  sales_price: number | null;
  loan_amount: number | null;
  app_complete_at: string;
  pipeline_stage_id: string;
}

interface StartedApplication {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  email_verified: boolean;
}

export default function MortgageAppAdmin() {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [applications, setApplications] = useState<MortgageApplication[]>([]);
  const [startedApps, setStartedApps] = useState<StartedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    pending: 0,
    started: 0,
    accountsCreated: 0,
    verifiedAccounts: 0,
    unverifiedAccounts: 0,
  });
  
  // Use production URL for shareable link (accessible without Lovable login)
  const PRODUCTION_URL = "https://mortgagebolt.org";
  const applicationUrl = `${PRODUCTION_URL}/apply`;
  
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
    window.open(`${PRODUCTION_URL}/apply`, '_blank');
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      // Get applications from Screening pipeline that have app_complete_at set
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, loan_type, sales_price, loan_amount, app_complete_at, pipeline_stage_id')
        .eq('pipeline_stage_id', 'a4e162e0-5421-4d17-8ad5-4b1195bbc995') // Screening
        .not('app_complete_at', 'is', null)
        .order('app_complete_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);

      // Get started applications (application_users without completed applications)
      const { data: appUsers, error: appUsersError } = await supabase
        .from('application_users')
        .select('id, email, first_name, last_name, phone, created_at, email_verified')
        .order('created_at', { ascending: false });

      if (appUsersError) throw appUsersError;

      // Filter out users who have completed applications
      const completedUserIds = new Set(data?.map(app => app.id) || []);
      const startedOnly = appUsers?.filter(user => !completedUserIds.has(user.id)) || [];
      setStartedApps(startedOnly);

      // Calculate stats
      const total = data?.length || 0;
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = data?.filter(app => new Date(app.app_complete_at) >= firstOfMonth).length || 0;

      const verifiedCount = appUsers?.filter(u => u.email_verified).length || 0;
      const unverifiedCount = appUsers?.filter(u => !u.email_verified).length || 0;

      setStats({
        total,
        thisMonth,
        pending: total, // All in Screening are considered pending
        started: startedOnly.length,
        accountsCreated: appUsers?.length || 0,
        verifiedAccounts: verifiedCount,
        unverifiedAccounts: unverifiedCount,
      });
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
            <CardTitle className="text-sm font-medium">Accounts Created</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accountsCreated}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.verifiedAccounts} verified</span>
              {' • '}
              <span className="text-orange-600">{stats.unverifiedAccounts} unverified</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">In Screening</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Started (Not Completed)</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.started}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Submitted this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Started Applications Table */}
      {startedApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications Started (Not Completed)</CardTitle>
            <CardDescription>Users who created accounts but haven't submitted applications yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {startedApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.first_name || app.last_name 
                        ? `${app.first_name || ''} ${app.last_name || ''}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{app.email}</span>
                        </div>
                        {app.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{app.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(app.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        In Progress
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>All submitted mortgage applications</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
              <p>Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No applications yet</p>
              <p className="text-sm mt-1">Applications will appear here once borrowers submit them</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.first_name} {app.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {app.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{app.email}</span>
                          </div>
                        )}
                        {app.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{app.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {app.loan_type || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {app.loan_amount 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(app.loan_amount)
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(app.app_complete_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Screening</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
