import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Mail, Send, Eye, MousePointer, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface CampaignStats {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  created_at: string;
}

export default function EmailAnalytics() {
  const location = useLocation();
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get stats for each campaign
      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          // Get send counts
          const { count: sentCount } = await supabase
            .from('email_campaign_sends')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id);

          const { count: deliveredCount } = await supabase
            .from('email_campaign_sends')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id)
            .in('status', ['delivered', 'sent']);

          // Get event counts
          const { count: openCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id)
            .eq('type', 'open');

          const { count: clickCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id)
            .eq('type', 'click');

          const { count: bounceCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id)
            .eq('type', 'bounce');

          const { count: unsubscribeCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact' })
            .eq('campaign_id', campaign.id)
            .eq('type', 'unsubscribe');

          return {
            ...campaign,
            sent_count: sentCount || 0,
            delivered_count: deliveredCount || 0,
            open_count: openCount || 0,
            click_count: clickCount || 0,
            bounce_count: bounceCount || 0,
            unsubscribe_count: unsubscribeCount || 0,
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate metrics
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered_count, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.open_count, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.click_count, 0);
  
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
  const openRate = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(1) : '0';
  const clickRate = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : '0';

  const calculateRate = (numerator: number, denominator: number) => {
    return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : '0';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <EmailMarketingNav currentPath={location.pathname} />
        <div>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailMarketingNav currentPath={location.pathname} />
      
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Analytics</h2>
        <p className="text-muted-foreground">Track your email campaign performance and engagement metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Delivery Rate: {deliveryRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalOpens.toLocaleString()} total opens
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalClicks.toLocaleString()} total clicks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => ['scheduled', 'sending'].includes(c.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Detailed metrics for your recent email campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaign data yet</h3>
              <p className="text-muted-foreground">Send your first email campaign to see analytics here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                  <TableHead className="text-right">Bounce Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const openRate = calculateRate(campaign.open_count, campaign.delivered_count);
                  const clickRate = calculateRate(campaign.click_count, campaign.delivered_count);
                  const bounceRate = calculateRate(campaign.bounce_count, campaign.sent_count);
                  
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{campaign.sent_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{campaign.delivered_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {openRate}%
                          {parseFloat(openRate) > 20 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {clickRate}%
                          {parseFloat(clickRate) > 2 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {bounceRate}%
                          {parseFloat(bounceRate) < 5 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}