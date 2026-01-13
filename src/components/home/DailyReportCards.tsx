import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Phone, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RateData {
  rate_15yr_fixed: number | null;
  rate_30yr_fixed: number | null;
  rate_30yr_fha: number | null;
  rate_bank_statement: number | null;
  rate_dscr: number | null;
}

interface LeadItem {
  id: string;
  first_name: string;
  last_name: string;
  notes: string | null;
}

interface AppItem {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
}

interface CallLogItem {
  id: string;
  agent_id: string;
  summary: string;
  call_type: string | null;
  log_type: string | null;
  meeting_location: string | null;
  buyer_agents: {
    first_name: string;
    last_name: string;
  } | null;
}

type DailyReportType = 'sales' | 'calls';

const CALL_TYPE_LABELS: Record<string, string> = {
  new_agent: 'New Agent Calls',
  current_agent: 'Current Agent Calls',
  past_la: 'Past LA Calls',
  new_la: 'New LA Calls',
  client: 'Client Calls',
  lender: 'Lender Calls',
  other: 'Other Calls',
};

export function DailyReportCards() {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState<DailyReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Data states
  const [rates, setRates] = useState<RateData | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [meetings, setMeetings] = useState<CallLogItem[]>([]);
  const [brokerOpens, setBrokerOpens] = useState<CallLogItem[]>([]);
  const [callsByType, setCallsByType] = useState<Record<string, CallLogItem[]>>({});

  const yesterday = subDays(new Date(), 1);
  const yesterdayStart = startOfDay(yesterday).toISOString();
  const yesterdayEnd = endOfDay(yesterday).toISOString();
  const yesterdayDate = format(yesterday, 'yyyy-MM-dd');

  const fetchRates = async () => {
    const { data } = await supabase
      .from('daily_market_updates')
      .select('rate_15yr_fixed, rate_30yr_fixed, rate_30yr_fha, rate_bank_statement, rate_dscr')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    return data as RateData | null;
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Fetch rates
      const ratesData = await fetchRates();
      setRates(ratesData);

      // Fetch leads from yesterday
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, first_name, last_name, notes')
        .eq('lead_on_date', yesterdayDate)
        .order('created_at', { ascending: true });
      setLeads((leadsData || []) as LeadItem[]);

      // Fetch apps from yesterday
      const { data: appsData } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount')
        .gte('app_complete_at', yesterdayStart)
        .lt('app_complete_at', yesterdayEnd)
        .order('app_complete_at', { ascending: true });
      setApps((appsData || []) as AppItem[]);

      // Fetch meetings from yesterday
      const { data: meetingsData } = await supabase
        .from('agent_call_logs')
        .select('id, agent_id, summary, call_type, log_type, meeting_location, buyer_agents:agent_id(first_name, last_name)')
        .eq('log_type', 'meeting')
        .gte('logged_at', yesterdayStart)
        .lt('logged_at', yesterdayEnd)
        .order('logged_at', { ascending: true });
      setMeetings((meetingsData || []) as unknown as CallLogItem[]);

      // Fetch broker opens from yesterday
      const { data: brokerOpensData } = await supabase
        .from('agent_call_logs')
        .select('id, agent_id, summary, call_type, log_type, meeting_location, buyer_agents:agent_id(first_name, last_name)')
        .eq('log_type', 'broker_open')
        .gte('logged_at', yesterdayStart)
        .lt('logged_at', yesterdayEnd)
        .order('logged_at', { ascending: true });
      setBrokerOpens((brokerOpensData || []) as unknown as CallLogItem[]);

    } catch (error) {
      console.error('Error fetching sales report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallsData = async () => {
    setLoading(true);
    try {
      // Fetch rates
      const ratesData = await fetchRates();
      setRates(ratesData);

      // Fetch all calls from yesterday
      const { data: callsData } = await supabase
        .from('agent_call_logs')
        .select('id, agent_id, summary, call_type, log_type, meeting_location, buyer_agents:agent_id(first_name, last_name)')
        .eq('log_type', 'call')
        .gte('logged_at', yesterdayStart)
        .lt('logged_at', yesterdayEnd)
        .order('logged_at', { ascending: true });

      // Group calls by type
      const grouped: Record<string, CallLogItem[]> = {};
      (callsData || []).forEach((call: any) => {
        const type = call.call_type || 'other';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(call as CallLogItem);
      });
      setCallsByType(grouped);

    } catch (error) {
      console.error('Error fetching calls report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (type: DailyReportType) => {
    setActiveReport(type);
    if (type === 'sales') {
      await fetchSalesData();
    } else {
      await fetchCallsData();
    }
  };

  const formatRate = (rate: number | null) => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${rate.toFixed(3)}%`;
  };

  const RatesTable = () => (
    <div className="mb-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 font-medium">15yr Fixed</th>
            <th className="text-left py-2 font-medium">30yr Fixed</th>
            <th className="text-left py-2 font-medium">FHA</th>
            <th className="text-left py-2 font-medium">Bank Stmt</th>
            <th className="text-left py-2 font-medium">DSCR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2">{formatRate(rates?.rate_15yr_fixed ?? null)}</td>
            <td className="py-2">{formatRate(rates?.rate_30yr_fixed ?? null)}</td>
            <td className="py-2">{formatRate(rates?.rate_30yr_fha ?? null)}</td>
            <td className="py-2">{formatRate(rates?.rate_bank_statement ?? null)}</td>
            <td className="py-2">{formatRate(rates?.rate_dscr ?? null)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderSalesContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <RatesTable />

        {/* Leads Section */}
        <div>
          <h3 className="font-semibold text-base mb-2">Leads</h3>
          {leads.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2">
              {leads.map((lead, index) => (
                <li key={lead.id} className="text-sm">
                  <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                  {lead.notes && (
                    <ul className="ml-6 mt-1">
                      <li className="text-muted-foreground list-disc">{lead.notes}</li>
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Apps Section */}
        <div>
          <h3 className="font-semibold text-base mb-2">Apps</h3>
          {apps.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              {apps.map((app) => (
                <li key={app.id} className="text-sm">
                  <span className="font-medium">{app.first_name} {app.last_name}</span>
                  {app.loan_amount && (
                    <span className="text-muted-foreground"> - ${app.loan_amount.toLocaleString()}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* F2F Meetings Section */}
        <div>
          <h3 className="font-semibold text-base mb-2">F2F Meetings</h3>
          {meetings.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="text-sm">
                  <span className="font-medium">
                    {meeting.buyer_agents ? `${meeting.buyer_agents.first_name} ${meeting.buyer_agents.last_name}` : 'Unknown Agent'}
                  </span>
                  {meeting.meeting_location && (
                    <span className="text-muted-foreground"> @ {meeting.meeting_location}</span>
                  )}
                  {meeting.summary && (
                    <ul className="ml-6 mt-1">
                      <li className="text-muted-foreground list-disc">{meeting.summary}</li>
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Broker Opens Section */}
        <div>
          <h3 className="font-semibold text-base mb-2">Broker Opens</h3>
          {brokerOpens.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2">
              {brokerOpens.map((bo) => (
                <li key={bo.id} className="text-sm">
                  <span className="font-medium">
                    {bo.buyer_agents ? `${bo.buyer_agents.first_name} ${bo.buyer_agents.last_name}` : 'Unknown Agent'}
                  </span>
                  {bo.meeting_location && (
                    <span className="text-muted-foreground"> @ {bo.meeting_location}</span>
                  )}
                  {bo.summary && (
                    <ul className="ml-6 mt-1">
                      <li className="text-muted-foreground list-disc">{bo.summary}</li>
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  };

  const renderCallsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const callTypes = ['new_agent', 'current_agent', 'past_la', 'new_la', 'client', 'lender', 'other'];
    const totalCalls = Object.values(callsByType).reduce((sum, arr) => sum + arr.length, 0);

    return (
      <div className="space-y-6">
        <RatesTable />

        {totalCalls === 0 ? (
          <p className="text-muted-foreground text-sm">No calls logged yesterday</p>
        ) : (
          callTypes.map((type) => {
            const calls = callsByType[type] || [];
            if (calls.length === 0) return null;

            return (
              <div key={type}>
                <h3 className="font-semibold text-base mb-2">{CALL_TYPE_LABELS[type] || type}</h3>
                <ol className="list-decimal list-inside space-y-2">
                  {calls.map((call) => (
                    <li key={call.id} className="text-sm">
                      <span className="font-medium">
                        {call.buyer_agents ? `${call.buyer_agents.first_name} ${call.buyer_agents.last_name}` : 'Unknown'}
                      </span>
                      {call.summary && (
                        <ul className="ml-6 mt-1">
                          <li className="text-muted-foreground list-disc">{call.summary}</li>
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const exportToPDF = async () => {
    if (!activeReport) return;

    setExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();
      let yPosition = height - 50;

      const title = activeReport === 'sales' 
        ? `Bolt Summary – ${format(yesterday, 'MMMM d, yyyy')}`
        : `Daily Calls Report – ${format(yesterday, 'MMMM d, yyyy')}`;

      // Title
      page.drawText(title, {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Rates table
      page.drawText('Rates:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 18;

      const rateLabels = ['15yr Fixed', '30yr Fixed', 'FHA', 'Bank Stmt', 'DSCR'];
      const rateValues = [
        rates?.rate_15yr_fixed,
        rates?.rate_30yr_fixed,
        rates?.rate_30yr_fha,
        rates?.rate_bank_statement,
        rates?.rate_dscr,
      ];

      let xPos = 50;
      rateLabels.forEach((label, i) => {
        page.drawText(`${label}: ${formatRate(rateValues[i] ?? null)}`, {
          x: xPos,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0, 0, 0),
        });
        xPos += 105;
      });
      yPosition -= 25;

      const addSection = (sectionTitle: string, items: { name: string; note?: string }[]) => {
        if (yPosition < 100) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        page.drawText(sectionTitle, {
          x: 50,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 18;

        if (items.length === 0) {
          page.drawText('None', {
            x: 60,
            y: yPosition,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          yPosition -= 20;
        } else {
          items.forEach((item, i) => {
            if (yPosition < 60) {
              page = pdfDoc.addPage([612, 792]);
              yPosition = height - 50;
            }

            page.drawText(`${i + 1}. ${item.name}`, {
              x: 60,
              y: yPosition,
              size: 10,
              font,
              color: rgb(0, 0, 0),
            });
            yPosition -= 14;

            if (item.note) {
              const truncatedNote = item.note.length > 80 ? item.note.substring(0, 80) + '...' : item.note;
              page.drawText(`   • ${truncatedNote}`, {
                x: 70,
                y: yPosition,
                size: 9,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              yPosition -= 14;
            }
          });
          yPosition -= 10;
        }
      };

      if (activeReport === 'sales') {
        addSection('Leads', leads.map(l => ({ name: `${l.first_name} ${l.last_name}`, note: l.notes || undefined })));
        addSection('Apps', apps.map(a => ({ name: `${a.first_name} ${a.last_name}${a.loan_amount ? ` - $${a.loan_amount.toLocaleString()}` : ''}` })));
        addSection('F2F Meetings', meetings.map(m => ({
          name: m.buyer_agents ? `${m.buyer_agents.first_name} ${m.buyer_agents.last_name}${m.meeting_location ? ` @ ${m.meeting_location}` : ''}` : 'Unknown Agent',
          note: m.summary || undefined
        })));
        addSection('Broker Opens', brokerOpens.map(b => ({
          name: b.buyer_agents ? `${b.buyer_agents.first_name} ${b.buyer_agents.last_name}${b.meeting_location ? ` @ ${b.meeting_location}` : ''}` : 'Unknown Agent',
          note: b.summary || undefined
        })));
      } else {
        const callTypes = ['new_agent', 'current_agent', 'past_la', 'new_la', 'client', 'lender', 'other'];
        callTypes.forEach((type) => {
          const calls = callsByType[type] || [];
          if (calls.length > 0) {
            addSection(CALL_TYPE_LABELS[type] || type, calls.map(c => ({
              name: c.buyer_agents ? `${c.buyer_agents.first_name} ${c.buyer_agents.last_name}` : 'Unknown',
              note: c.summary || undefined
            })));
          }
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-${activeReport}-report-${format(yesterday, 'yyyy-MM-dd')}.pdf`;
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

  const reportConfigs = [
    {
      type: 'sales' as DailyReportType,
      title: 'Daily Sales Report',
      icon: FileText,
      color: 'bg-emerald-500/10 text-emerald-600',
      description: "Yesterday's leads, apps & activities",
    },
    {
      type: 'calls' as DailyReportType,
      title: 'Daily Calls Report',
      icon: Phone,
      color: 'bg-sky-500/10 text-sky-600',
      description: "Yesterday's call activity by type",
    },
  ];

  return (
    <>
      {/* Report Cards */}
      <div className="grid grid-cols-2 gap-3">
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
              <span>
                {activeReport === 'sales' 
                  ? `Bolt Summary – ${format(yesterday, 'MMMM d, yyyy')}`
                  : `Daily Calls Report – ${format(yesterday, 'MMMM d, yyyy')}`
                }
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={exporting || loading}
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
            {activeReport === 'sales' ? renderSalesContent() : renderCallsContent()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
