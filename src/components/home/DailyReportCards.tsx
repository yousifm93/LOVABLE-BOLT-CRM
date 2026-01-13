import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Phone, Download, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RateData {
  rate_15yr_fixed: number | null;
  rate_15yr_fixed_70ltv: number | null;
  rate_15yr_fixed_90ltv: number | null;
  rate_15yr_fixed_95ltv: number | null;
  rate_15yr_fixed_97ltv: number | null;
  rate_30yr_fixed: number | null;
  rate_30yr_fixed_70ltv: number | null;
  rate_30yr_fixed_90ltv: number | null;
  rate_30yr_fixed_95ltv: number | null;
  rate_30yr_fixed_97ltv: number | null;
  rate_30yr_fha: number | null;
  rate_30yr_fha_70ltv: number | null;
  rate_30yr_fha_90ltv: number | null;
  rate_30yr_fha_95ltv: number | null;
  rate_30yr_fha_965ltv: number | null;
  rate_bank_statement: number | null;
  rate_bank_statement_70ltv: number | null;
  rate_bank_statement_75ltv: number | null;
  rate_bank_statement_85ltv: number | null;
  rate_bank_statement_90ltv: number | null;
  rate_dscr: number | null;
  rate_dscr_60ltv: number | null;
  rate_dscr_70ltv: number | null;
  rate_dscr_75ltv: number | null;
  rate_dscr_85ltv: number | null;
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

// All call types to display (even if count is 0)
const ALL_CALL_TYPES = [
  { value: 'new_agent', label: 'New Agent Calls' },
  { value: 'current_agent', label: 'Current Agent Calls' },
  { value: 'top_agent', label: 'Top Agent Calls' },
  { value: 'past_la', label: 'Past LA Calls' },
  { value: 'client', label: 'Current Client Calls' },
  { value: 'past_client', label: 'Past Client Calls' },
];

// Helper function to get the lowest rate from all LTV variants
const getLowestRate = (rates: (number | null | undefined)[]): number | null => {
  const validRates = rates.filter((r): r is number => r !== null && r !== undefined);
  return validRates.length > 0 ? Math.min(...validRates) : null;
};

const get15yrFixedRate = (data: RateData): number | null => {
  return getLowestRate([
    data.rate_15yr_fixed,
    data.rate_15yr_fixed_70ltv,
    data.rate_15yr_fixed_90ltv,
    data.rate_15yr_fixed_95ltv,
    data.rate_15yr_fixed_97ltv,
  ]);
};

const get30yrFixedRate = (data: RateData): number | null => {
  return getLowestRate([
    data.rate_30yr_fixed,
    data.rate_30yr_fixed_70ltv,
    data.rate_30yr_fixed_90ltv,
    data.rate_30yr_fixed_95ltv,
    data.rate_30yr_fixed_97ltv,
  ]);
};

const getFHARate = (data: RateData): number | null => {
  return getLowestRate([
    data.rate_30yr_fha,
    data.rate_30yr_fha_70ltv,
    data.rate_30yr_fha_90ltv,
    data.rate_30yr_fha_95ltv,
    data.rate_30yr_fha_965ltv,
  ]);
};

const getBankStatementRate = (data: RateData): number | null => {
  return getLowestRate([
    data.rate_bank_statement,
    data.rate_bank_statement_70ltv,
    data.rate_bank_statement_75ltv,
    data.rate_bank_statement_85ltv,
    data.rate_bank_statement_90ltv,
  ]);
};

const getDSCRRate = (data: RateData): number | null => {
  return getLowestRate([
    data.rate_dscr,
    data.rate_dscr_60ltv,
    data.rate_dscr_70ltv,
    data.rate_dscr_75ltv,
    data.rate_dscr_85ltv,
  ]);
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
      .select(`
        rate_15yr_fixed, rate_15yr_fixed_70ltv, rate_15yr_fixed_90ltv, rate_15yr_fixed_95ltv, rate_15yr_fixed_97ltv,
        rate_30yr_fixed, rate_30yr_fixed_70ltv, rate_30yr_fixed_90ltv, rate_30yr_fixed_95ltv, rate_30yr_fixed_97ltv,
        rate_30yr_fha, rate_30yr_fha_70ltv, rate_30yr_fha_90ltv, rate_30yr_fha_95ltv, rate_30yr_fha_965ltv,
        rate_bank_statement, rate_bank_statement_70ltv, rate_bank_statement_75ltv, rate_bank_statement_85ltv, rate_bank_statement_90ltv,
        rate_dscr, rate_dscr_60ltv, rate_dscr_70ltv, rate_dscr_75ltv, rate_dscr_85ltv
      `)
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

  // Get computed rates from the raw data
  const computedRates = rates ? {
    rate15yrFixed: get15yrFixedRate(rates),
    rate30yrFixed: get30yrFixedRate(rates),
    rateFHA: getFHARate(rates),
    rateBankStatement: getBankStatementRate(rates),
    rateDSCR: getDSCRRate(rates),
  } : null;

  const RatesTable = () => (
    <div className="mb-4">
      <table className="w-full text-xs border-collapse border rounded-md overflow-hidden">
        <thead className="bg-muted">
          <tr>
            <th className="text-left py-1.5 px-2 font-medium">15yr Fixed</th>
            <th className="text-left py-1.5 px-2 font-medium">30yr Fixed</th>
            <th className="text-left py-1.5 px-2 font-medium">FHA</th>
            <th className="text-left py-1.5 px-2 font-medium">Bank Stmt</th>
            <th className="text-left py-1.5 px-2 font-medium">DSCR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1.5 px-2">{formatRate(computedRates?.rate15yrFixed ?? null)}</td>
            <td className="py-1.5 px-2">{formatRate(computedRates?.rate30yrFixed ?? null)}</td>
            <td className="py-1.5 px-2">{formatRate(computedRates?.rateFHA ?? null)}</td>
            <td className="py-1.5 px-2">{formatRate(computedRates?.rateBankStatement ?? null)}</td>
            <td className="py-1.5 px-2">{formatRate(computedRates?.rateDSCR ?? null)}</td>
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
      <div className="space-y-4">
        <RatesTable />

        {/* Leads Section */}
        <div>
          <h3 className="font-semibold text-sm mb-1.5 border-b pb-1">Leads ({leads.length})</h3>
          {leads.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">None</p>
          ) : (
            <ol className="space-y-1">
              {leads.map((lead, index) => (
                <li key={lead.id}>
                  <span className="font-medium text-xs">{index + 1}. {lead.first_name} {lead.last_name}</span>
                  {lead.notes && (
                    <p className="text-muted-foreground text-xs ml-4">• {lead.notes}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Apps Section */}
        <div>
          <h3 className="font-semibold text-sm mb-1.5 border-b pb-1">Apps ({apps.length})</h3>
          {apps.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">None</p>
          ) : (
            <ol className="space-y-0.5">
              {apps.map((app, index) => (
                <li key={app.id} className="text-xs">
                  {index + 1}. <span className="font-medium">{app.first_name} {app.last_name}</span>
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
          <h3 className="font-semibold text-sm mb-1.5 border-b pb-1">F2F Meetings ({meetings.length})</h3>
          {meetings.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">None</p>
          ) : (
            <ol className="space-y-1">
              {meetings.map((meeting, index) => (
                <li key={meeting.id}>
                  <span className="font-medium text-xs">
                    {index + 1}. {meeting.buyer_agents ? `${meeting.buyer_agents.first_name} ${meeting.buyer_agents.last_name}` : 'Unknown Agent'}
                  </span>
                  {meeting.meeting_location && (
                    <span className="text-muted-foreground text-xs"> @ {meeting.meeting_location}</span>
                  )}
                  {meeting.summary && (
                    <p className="text-muted-foreground text-xs ml-4">• {meeting.summary}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Broker Opens Section */}
        <div>
          <h3 className="font-semibold text-sm mb-1.5 border-b pb-1">Broker Opens ({brokerOpens.length})</h3>
          {brokerOpens.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">None</p>
          ) : (
            <ol className="space-y-1">
              {brokerOpens.map((bo, index) => (
                <li key={bo.id}>
                  <span className="font-medium text-xs">
                    {index + 1}. {bo.buyer_agents ? `${bo.buyer_agents.first_name} ${bo.buyer_agents.last_name}` : 'Unknown Agent'}
                  </span>
                  {bo.meeting_location && (
                    <span className="text-muted-foreground text-xs"> @ {bo.meeting_location}</span>
                  )}
                  {bo.summary && (
                    <p className="text-muted-foreground text-xs ml-4">• {bo.summary}</p>
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

    const totalCalls = Object.values(callsByType).reduce((sum, arr) => sum + arr.length, 0);

    return (
      <div className="space-y-4">
        <RatesTable />

        <div className="text-sm font-semibold mb-2">
          Total Calls: {totalCalls}
        </div>

        {/* All Call Types - always show all, even with 0 */}
        {ALL_CALL_TYPES.map(({ value, label }) => {
          const calls = callsByType[value] || [];
          return (
            <div key={value}>
              <h3 className="font-semibold text-sm mb-1 border-b pb-1">
                {label} ({calls.length})
              </h3>
              {calls.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">None</p>
              ) : (
                <ol className="space-y-1">
                  {calls.map((call, index) => (
                    <li key={call.id}>
                      <span className="font-medium text-xs">
                        {index + 1}. {call.buyer_agents ? `${call.buyer_agents.first_name} ${call.buyer_agents.last_name}` : 'Unknown'}
                      </span>
                      {call.summary && (
                        <p className="text-muted-foreground text-xs ml-4">• {call.summary}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
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

      // Title - centered with underline
      const titleWidth = boldFont.widthOfTextAtSize(title, 16);
      const titleX = (width - titleWidth) / 2;
      page.drawText(title, {
        x: titleX,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      // Underline
      page.drawLine({
        start: { x: titleX, y: yPosition - 3 },
        end: { x: titleX + titleWidth, y: yPosition - 3 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 35;

      // Rates table
      page.drawText('Rates:', {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      const rateLabels = ['15yr Fixed', '30yr Fixed', 'FHA', 'Bank Stmt', 'DSCR'];
      const rateValues = [
        computedRates?.rate15yrFixed,
        computedRates?.rate30yrFixed,
        computedRates?.rateFHA,
        computedRates?.rateBankStatement,
        computedRates?.rateDSCR,
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
          size: 11,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;

        if (items.length === 0) {
          page.drawText('None', {
            x: 60,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          yPosition -= 15;
        } else {
          items.forEach((item, i) => {
            if (yPosition < 60) {
              page = pdfDoc.addPage([612, 792]);
              yPosition = height - 50;
            }

            page.drawText(`${i + 1}. ${item.name}`, {
              x: 60,
              y: yPosition,
              size: 9,
              font: boldFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 12;

            if (item.note) {
              const truncatedNote = item.note.length > 80 ? item.note.substring(0, 80) + '...' : item.note;
              page.drawText(`   • ${truncatedNote}`, {
                x: 70,
                y: yPosition,
                size: 8,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              yPosition -= 12;
            }
          });
          yPosition -= 8;
        }
      };

      if (activeReport === 'sales') {
        addSection(`Leads (${leads.length})`, leads.map(l => ({ name: `${l.first_name} ${l.last_name}`, note: l.notes || undefined })));
        addSection(`Apps (${apps.length})`, apps.map(a => ({ name: `${a.first_name} ${a.last_name}${a.loan_amount ? ` - $${a.loan_amount.toLocaleString()}` : ''}` })));
        addSection(`F2F Meetings (${meetings.length})`, meetings.map(m => ({
          name: m.buyer_agents ? `${m.buyer_agents.first_name} ${m.buyer_agents.last_name}${m.meeting_location ? ` @ ${m.meeting_location}` : ''}` : 'Unknown Agent',
          note: m.summary || undefined
        })));
        addSection(`Broker Opens (${brokerOpens.length})`, brokerOpens.map(b => ({
          name: b.buyer_agents ? `${b.buyer_agents.first_name} ${b.buyer_agents.last_name}${b.meeting_location ? ` @ ${b.meeting_location}` : ''}` : 'Unknown Agent',
          note: b.summary || undefined
        })));
      } else {
        // Add total calls
        page.drawText(`Total Calls: ${Object.values(callsByType).reduce((sum, arr) => sum + arr.length, 0)}`, {
          x: 50,
          y: yPosition,
          size: 11,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        // All call types - show all even with 0
        ALL_CALL_TYPES.forEach(({ value, label }) => {
          const calls = callsByType[value] || [];
          addSection(`${label} (${calls.length})`, calls.map(c => ({
            name: c.buyer_agents ? `${c.buyer_agents.first_name} ${c.buyer_agents.last_name}` : 'Unknown',
            note: c.summary || undefined
          })));
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
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <div className="flex flex-col items-center">
                <Zap className="h-6 w-6 text-primary mb-1" />
                <DialogTitle className="text-lg font-bold underline text-center">
                  {activeReport === 'sales' 
                    ? `Bolt Summary – ${format(yesterday, 'MMMM d, yyyy')}`
                    : `Daily Calls Report – ${format(yesterday, 'MMMM d, yyyy')}`
                  }
                </DialogTitle>
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={exporting || loading}
                  className="text-xs"
                >
                  {exporting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {activeReport === 'sales' ? renderSalesContent() : renderCallsContent()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
