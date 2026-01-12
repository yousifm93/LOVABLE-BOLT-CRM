import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, FileText, Calendar, Building2, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ReportItem {
  id: string;
  [key: string]: any;
}

type ReportType = 'leads' | 'applications' | 'meetings' | 'broker_opens';

export function SalesReportCards() {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reportConfigs = [
    {
      type: 'leads' as ReportType,
      title: 'Leads This Month',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600',
      description: 'View all leads received this month',
    },
    {
      type: 'applications' as ReportType,
      title: 'Applications This Month',
      icon: FileText,
      color: 'bg-green-500/10 text-green-600',
      description: 'View all applications submitted this month',
    },
    {
      type: 'meetings' as ReportType,
      title: 'Face-to-Face Meetings',
      icon: Calendar,
      color: 'bg-purple-500/10 text-purple-600',
      description: 'View all in-person meetings this month',
    },
    {
      type: 'broker_opens' as ReportType,
      title: "Broker's Opens",
      icon: Building2,
      color: 'bg-orange-500/10 text-orange-600',
      description: "View all broker's open events this month",
    },
  ];

  const fetchReportData = async (type: ReportType) => {
    setLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();
    const startOfMonthDate = startOfMonthISO.split('T')[0];

    try {
      let data: ReportItem[] = [];

      switch (type) {
        case 'leads':
          const { data: leads } = await supabase
            .from('leads')
            .select('id, first_name, last_name, email, phone, lead_on_date, pipeline_stage:pipeline_stages(name)')
            .eq('is_closed', false)
            .gte('lead_on_date', startOfMonthDate)
            .order('lead_on_date', { ascending: true });
          data = (leads || []) as unknown as ReportItem[];
          break;

        case 'applications':
          const { data: apps } = await supabase
            .from('leads')
            .select('id, first_name, last_name, email, phone, app_complete_at, loan_amount, loan_type, pipeline_stage:pipeline_stages(name)')
            .not('app_complete_at', 'is', null)
            .gte('app_complete_at', startOfMonthISO)
            .order('app_complete_at', { ascending: true });
          data = (apps || []) as unknown as ReportItem[];
          break;

        case 'meetings':
          const { data: meetings } = await supabase
            .from('agent_call_logs')
            .select('id, agent_id, summary, logged_at, meeting_location, log_type, buyer_agents:agent_id(first_name, last_name, brokerage)')
            .eq('log_type', 'meeting')
            .gte('logged_at', startOfMonthISO)
            .order('logged_at', { ascending: true });
          data = (meetings || []) as unknown as ReportItem[];
          break;

        case 'broker_opens':
          const { data: brokerOpens } = await supabase
            .from('buyer_agents')
            .select('id, first_name, last_name, brokerage, broker_open, notes')
            .not('broker_open', 'is', null)
            .gte('broker_open', startOfMonthDate)
            .order('broker_open', { ascending: true });
          data = (brokerOpens || []) as unknown as ReportItem[];
          break;
      }

      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (type: ReportType) => {
    setActiveReport(type);
    await fetchReportData(type);
  };

  const exportToPDF = async () => {
    if (!activeReport || reportData.length === 0) return;

    setExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      let yPosition = height - 50;

      const config = reportConfigs.find(c => c.type === activeReport);
      const title = config?.title || 'Report';

      // Title
      page.drawText(title, {
        x: 50,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;

      // Date range
      page.drawText(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 30;

      // Report content
      const lineHeight = 15;
      const maxWidth = width - 100;

      for (const item of reportData) {
        if (yPosition < 80) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        let text = '';
        switch (activeReport) {
          case 'leads':
            text = `• ${item.first_name} ${item.last_name} - ${item.lead_on_date || 'N/A'} - ${item.phone || item.email || 'No contact'}`;
            break;
          case 'applications':
            text = `• ${item.first_name} ${item.last_name} - $${(item.loan_amount || 0).toLocaleString()} - ${item.app_complete_at ? format(new Date(item.app_complete_at), 'MMM d, yyyy') : 'N/A'}`;
            break;
          case 'meetings':
            const agentName = item.buyer_agents ? `${item.buyer_agents.first_name} ${item.buyer_agents.last_name}` : 'Unknown Agent';
            text = `• ${agentName} - ${item.logged_at ? format(new Date(item.logged_at), 'MMM d, yyyy') : 'N/A'} - ${item.meeting_location || 'No location'}`;
            break;
          case 'broker_opens':
            text = `• ${item.first_name} ${item.last_name} (${item.brokerage || 'N/A'}) - ${item.broker_open || 'N/A'}`;
            break;
        }

        page.drawText(text.substring(0, 80), {
          x: 50,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;

        // Add notes/summary if available
        const notes = item.notes || item.summary;
        if (notes) {
          const truncatedNotes = notes.substring(0, 100) + (notes.length > 100 ? '...' : '');
          page.drawText(`  ${truncatedNotes}`, {
            x: 60,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= lineHeight;
        }

        yPosition -= 5; // Space between items
      }

      // Footer
      page.drawText(`Total: ${reportData.length} items`, {
        x: 50,
        y: 30,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeReport}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "PDF report has been downloaded",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (reportData.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No data found for this month
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {reportData.map((item, index) => (
          <div key={item.id || index} className="p-3 bg-muted/50 rounded-lg">
            {activeReport === 'leads' && (
              <>
                <div className="font-medium">{item.first_name} {item.last_name}</div>
                <div className="text-sm text-muted-foreground">
                  Lead Date: {item.lead_on_date || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.phone || item.email || 'No contact info'}
                </div>
              </>
            )}

            {activeReport === 'applications' && (
              <>
                <div className="font-medium">{item.first_name} {item.last_name}</div>
                <div className="text-sm text-muted-foreground">
                  Submitted: {item.app_complete_at ? format(new Date(item.app_complete_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Loan Amount: ${(item.loan_amount || 0).toLocaleString()} | Type: {item.loan_type || 'N/A'}
                </div>
              </>
            )}

            {activeReport === 'meetings' && (
              <>
                <div className="font-medium">
                  {item.buyer_agents ? `${item.buyer_agents.first_name} ${item.buyer_agents.last_name}` : 'Unknown Agent'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Date: {item.logged_at ? format(new Date(item.logged_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Location: {item.meeting_location || 'N/A'}
                </div>
                {item.summary && (
                  <div className="text-sm mt-1">{item.summary}</div>
                )}
              </>
            )}

            {activeReport === 'broker_opens' && (
              <>
                <div className="font-medium">{item.first_name} {item.last_name}</div>
                <div className="text-sm text-muted-foreground">
                  Brokerage: {item.brokerage || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Date: {item.broker_open || 'N/A'}
                </div>
                {item.notes && (
                  <div className="text-sm mt-1">{item.notes}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getReportTitle = () => {
    const config = reportConfigs.find(c => c.type === activeReport);
    return config?.title || 'Report';
  };

  return (
    <>
      {/* Report Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reportConfigs.map((config) => (
          <Card
            key={config.type}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
            onClick={() => handleCardClick(config.type)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <config.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-sm font-medium text-foreground">{config.title}</h3>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Modal */}
      <Dialog open={!!activeReport} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{getReportTitle()}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={exporting || loading || reportData.length === 0}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {renderReportContent()}
          </ScrollArea>

          <div className="text-sm text-muted-foreground text-center">
            Total: {reportData.length} items
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
