import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText, Phone, Mail, Calendar, CheckCircle, Loader2, ArrowRight, Search, Star, Lock } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModernChartCard } from "@/components/ui/modern-chart-card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ActivityMonitor } from "@/components/dashboard/ActivityMonitor";
import { ConversionAnalytics } from "@/components/dashboard/ConversionAnalytics";
import { PipelineSummarySection } from "@/components/dashboard/PipelineSummarySection";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardDetailModal } from "@/components/dashboard/DashboardDetailModal";
import { VolumeDetailModal } from "@/components/dashboard/VolumeDetailModal";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { transformLeadToClient } from "@/utils/clientTransform";
import { databaseService } from "@/services/database";
import { CRMClient } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { usePermissions } from "@/hooks/usePermissions";

// Monthly goals
const MONTHLY_GOALS = {
  leads: 80,
  applications: 28,
  meetings: 20,
  brokerOpens: 12,
  reviews: 12,
  newAgentCalls: 55,
  currentAgentCalls: 90,
  pastClientCalls: 20,
  currentClientCalls: 40,  // New goal for current client calls
  topAgentCalls: 10,
  pastLACalls: 10
};

// Format date and time for activity display
const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Format date-only strings OR timestamps as local dates (avoid timezone issues)
const formatLocalDate = (dateString: string) => {
  // Handle full timestamps (e.g., "2025-12-10 14:30:00+00") by extracting just the date part
  const datePart = dateString.includes(' ') ? dateString.split(' ')[0] : dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to check if a date is today
const isToday = (date: string | Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let compareDate: Date;
  if (typeof date === 'string') {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Parse as local date, not UTC
      const [year, month, day] = date.split('-').map(Number);
      compareDate = new Date(year, month - 1, day);
    } else {
      // It's a full timestamp, parse normally
      compareDate = new Date(date);
    }
  } else {
    compareDate = date;
  }
  
  compareDate.setHours(0, 0, 0, 0);
  return compareDate.getTime() === today.getTime();
};

// Helper to check if a date is yesterday
const isYesterday = (date: string | Date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  let compareDate: Date;
  if (typeof date === 'string') {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Parse as local date, not UTC
      const [year, month, day] = date.split('-').map(Number);
      compareDate = new Date(year, month - 1, day);
    } else {
      // It's a full timestamp, parse normally
      compareDate = new Date(date);
    }
  } else {
    compareDate = date;
  }
  
  compareDate.setHours(0, 0, 0, 0);
  return compareDate.getTime() === yesterday.getTime();
};

// Helper to get highlight classes based on date
const getHighlightClasses = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  if (isToday(date)) {
    return 'bg-green-50 border-green-200 hover:bg-green-100';
  }
  
  if (isYesterday(date)) {
    return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
  }
  
  return '';
};

const STAGE_ID_TO_NAME: Record<string, string> = {
  'c54f417b-3f67-43de-80f5-954cf260d571': 'Leads',
  '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': 'Pending App',
  'a4e162e0-5421-4d17-8ad5-4b1195bbc995': 'Screening',
  '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': 'Pre-Qualified',
  '3cbf38ff-752e-4163-a9a3-1757499b4945': 'Pre-Approved',
  '76eb2e82-e1d9-4f2d-a57d-2120a25696db': 'Active',
  'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd': 'Past Clients'
};

export default function DashboardTabs() {
  // Calculate expected progress based on day of month
  const calculateExpectedProgress = (monthlyGoal: number): number => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round((currentDay / daysInMonth) * monthlyGoal);
  };
  
  const {
    thisMonthLeads,
    yesterdayLeads,
    todayLeads,
    allLeads,
    thisMonthApps,
    yesterdayApps,
    todayApps,
    allApplications,
    thisMonthMeetings,
    lastWeekMeetings,
    thisWeekMeetings,
    allMeetings,
    // Broker Opens
    thisMonthBrokerOpens,
    lastWeekBrokerOpens,
    thisWeekBrokerOpens,
    allBrokerOpens,
    // Combined Calls
    thisMonthCalls,
    yesterdayCalls,
    todayCalls,
    allCalls,
    // Call Type Breakdowns
    thisMonthNewAgentCalls,
    yesterdayNewAgentCalls,
    todayNewAgentCalls,
    thisMonthCurrentAgentCalls,
    yesterdayCurrentAgentCalls,
    todayCurrentAgentCalls,
    thisMonthTopAgentCalls,
    yesterdayTopAgentCalls,
    todayTopAgentCalls,
    thisMonthPastLACalls,
    yesterdayPastLACalls,
    todayPastLACalls,
    thisMonthPastClientCalls,
    yesterdayPastClientCalls,
    todayPastClientCalls,
    thisMonthCurrentClientCalls,
    yesterdayCurrentClientCalls,
    todayCurrentClientCalls,
    // Emails
    thisMonthEmails,
    yesterdayEmails,
    todayEmails,
    allEmails,
    // Reviews
    thisMonthReviews,
    lastWeekReviews,
    thisWeekReviews,
    allReviews,
    recentStageChanges,
    pipelineStageCounts,
    activeMetrics,
    currentMonthPending,
    nextMonthPending,
    thisWeekClosing,
    totalActiveLeads,
    currentMonthLeads,
    nextMonthLeads,
    thisWeekLeads,
    closedYtdLeads,
    closedMonthlyLeads,
    closedYtdMetrics,
    closedMonthlyVolume,
    closedMonthlyUnits,
    allPipelineLeads,
    isLoading,
  } = useDashboardData();

  // Combine monthly volume and units into a single array for charts
  const monthlyData = useMemo(() => {
    if (!closedMonthlyVolume || !closedMonthlyUnits || !Array.isArray(closedMonthlyVolume) || !Array.isArray(closedMonthlyUnits)) return [];
    
    // Create a map of all months (Jan-Dec)
    const monthMap = new Map<number, { month: string; volume: number; units: number }>();
    
    // Initialize all 12 months with 0 values
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthNames.forEach((name, idx) => {
      monthMap.set(idx + 1, { month: name, volume: 0, units: 0 });
    });
    
    // Fill in volume data
    if (Array.isArray(closedMonthlyVolume)) {
      closedMonthlyVolume.forEach((row: any) => {
        const existing = monthMap.get(row.month_num);
        if (existing) {
          existing.volume = Number(row.volume) || 0;
        }
      });
    }
    
    // Fill in units data
    if (Array.isArray(closedMonthlyUnits)) {
      closedMonthlyUnits.forEach((row: any) => {
        const existing = monthMap.get(row.month_num);
        if (existing) {
          existing.units = Number(row.units) || 0;
        }
      });
    }
    
    return Array.from(monthMap.values());
  }, [closedMonthlyVolume, closedMonthlyUnits]);

  const leadsGoal = 100;
  const appsGoal = 30;
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const calculateAverageMonthlyUnits = (ytdUnits: number): string => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Only calculate if we're in 2025
    if (currentYear !== 2025) return "—";
    
    // Get number of months elapsed (1-12)
    const monthsElapsed = currentDate.getMonth() + 1;
    
    if (monthsElapsed === 0) return "—";
    
    const average = ytdUnits / monthsElapsed;
    return average.toFixed(1);
  };

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState<"leads" | "applications" | "meetings" | "calls" | "emails" | "reviews">("leads");
  const [modalGoal, setModalGoal] = useState<number | undefined>(undefined);
  const [modalExpectedProgress, setModalExpectedProgress] = useState<number | undefined>(undefined);
  const [modalActivityType, setModalActivityType] = useState<'broker_open' | 'face_to_face' | 'call' | 'lead' | undefined>(undefined);
  const [modalCallSubType, setModalCallSubType] = useState<'new_agent' | 'current_agent' | 'top_agent' | 'past_la' | undefined>(undefined);

  // Volume modal state
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  const [volumeModalData, setVolumeModalData] = useState<any[]>([]);
  const [volumeModalTitle, setVolumeModalTitle] = useState("");

  // Drawer state
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // All tab state
  const [allLeadsData, setAllLeadsData] = useState<any[]>([]);
  const [selectedAllLeadIds, setSelectedAllLeadIds] = useState<string[]>([]);
  const [allLeadsSearchTerm, setAllLeadsSearchTerm] = useState("");

  // Modal handlers
  const handleOpenModal = (
    title: string, 
    data: any[], 
    type: "leads" | "applications" | "meetings" | "calls" | "emails" | "reviews",
    goal?: number,
    activityType?: 'broker_open' | 'face_to_face' | 'call' | 'lead',
    callSubType?: 'new_agent' | 'current_agent' | 'top_agent' | 'past_la'
  ) => {
    setModalTitle(title);
    setModalData(data);
    setModalType(type);
    setModalGoal(goal);
    setModalExpectedProgress(goal ? calculateExpectedProgress(goal) : undefined);
    setModalActivityType(activityType);
    setModalCallSubType(callSubType);
    setModalOpen(true);
  };

  // Volume modal handler
  const handleOpenVolumeModal = (title: string, data: any[]) => {
    setVolumeModalTitle(title);
    setVolumeModalData(data);
    setVolumeModalOpen(true);
  };

  // Lead click handler - open drawer instead of navigate
  const handleLeadClick = async (leadId: string) => {
    try {
      // Close the modal first
      setModalOpen(false);
      setVolumeModalOpen(false);
      
      // Fetch full lead data
      const lead = await databaseService.getLeadByIdWithEmbeds(leadId);
      if (lead) {
        const crmClient = transformLeadToClient(lead);
        setSelectedClient(crmClient);
        setIsDrawerOpen(true);
      }
    } catch (error) {
      console.error('Error loading lead details:', error);
      toast({
        title: "Error",
        description: "Failed to load lead details",
        variant: "destructive",
      });
    }
  };

  // Transform all pipeline leads for table display
  useEffect(() => {
    if (allPipelineLeads) {
      const transformed = allPipelineLeads.map((lead: any, index: number) => ({
        id: lead.id,
        number: index + 1,
        borrowerName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        leadCreatedOn: lead.lead_on_date || lead.created_at?.split('T')[0],
        currentStage: lead.stage_name,
        notes: lead.notes || '',
        latestFileUpdates: lead.latest_file_updates || '',
        _fullData: lead
      }));
      setAllLeadsData(transformed);
    }
  }, [allPipelineLeads]);

  // Define simple hardcoded columns for All tab
  const allLeadsColumns: ColumnDef<any>[] = [
    {
      accessorKey: '_select',
      header: '',
      cell: ({ row }) => (
        <Checkbox
          checked={selectedAllLeadIds.includes(row.original.id)}
          onCheckedChange={(checked) => {
            setSelectedAllLeadIds(prev =>
              checked ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id)
            );
          }}
        />
      ),
      className: "w-12",
    },
    {
      accessorKey: 'number',
      header: '#',
      className: "w-16 text-center",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.number}</span>
      ),
    },
    {
      accessorKey: 'borrowerName',
      header: 'Borrower Name',
      cell: ({ row }) => (
        <div
          className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors font-medium"
          onClick={(e) => {
            e.stopPropagation();
            handleLeadClick(row.original.id);
          }}
        >
          {row.original.borrowerName || '—'}
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: 'leadCreatedOn',
      header: 'Lead Created On',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.leadCreatedOn 
            ? formatLocalDate(row.original.leadCreatedOn) 
            : '—'}
        </span>
      ),
      className: "w-40",
      sortable: true,
    },
    {
      accessorKey: 'currentStage',
      header: 'Current Stage',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.currentStage}</Badge>
      ),
      sortable: true,
    },
    {
      accessorKey: 'notes',
      header: 'About the Borrower',
      cell: ({ row }) => (
        <div 
          className="max-w-md text-sm line-clamp-2" 
          title={row.original.notes || ''}
        >
          {row.original.notes || '—'}
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: 'latestFileUpdates',
      header: 'Pipeline Review',
      cell: ({ row }) => (
        <div 
          className="max-w-md text-sm line-clamp-2" 
          title={row.original.latestFileUpdates || ''}
        >
          {row.original.latestFileUpdates || '—'}
        </div>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive mortgage business analytics</p>
        </div>
        <Input 
          placeholder="Search..." 
          className="max-w-md h-9" 
        />
      </div>

      <Tabs defaultValue={hasPermission('dashboard_sales') !== 'hidden' ? 'sales' : 'calls'} className="space-y-4">
        <TabsList className="grid w-full h-9" style={{ gridTemplateColumns: `repeat(${[hasPermission('dashboard_sales'), hasPermission('dashboard_calls'), hasPermission('dashboard_active'), hasPermission('dashboard_closed'), hasPermission('dashboard_miscellaneous'), hasPermission('dashboard_all')].filter(p => p !== 'hidden').length}, 1fr)` }}>
          {hasPermission('dashboard_sales') !== 'hidden' && (
            <TabsTrigger value="sales" className="text-sm" disabled={hasPermission('dashboard_sales') === 'locked'}>
              {hasPermission('dashboard_sales') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              Sales
            </TabsTrigger>
          )}
          {hasPermission('dashboard_calls') !== 'hidden' && (
            <TabsTrigger value="calls" className="text-sm" disabled={hasPermission('dashboard_calls') === 'locked'}>
              {hasPermission('dashboard_calls') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              Calls
            </TabsTrigger>
          )}
          {hasPermission('dashboard_active') !== 'hidden' && (
            <TabsTrigger value="active" className="text-sm" disabled={hasPermission('dashboard_active') === 'locked'}>
              {hasPermission('dashboard_active') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              Active
            </TabsTrigger>
          )}
          {hasPermission('dashboard_closed') !== 'hidden' && (
            <TabsTrigger value="closed" className="text-sm" disabled={hasPermission('dashboard_closed') === 'locked'}>
              {hasPermission('dashboard_closed') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              Closed
            </TabsTrigger>
          )}
          {hasPermission('dashboard_miscellaneous') !== 'hidden' && (
            <TabsTrigger value="miscellaneous" className="text-sm" disabled={hasPermission('dashboard_miscellaneous') === 'locked'}>
              {hasPermission('dashboard_miscellaneous') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              Miscellaneous
            </TabsTrigger>
          )}
          {hasPermission('dashboard_all') !== 'hidden' && (
            <TabsTrigger value="all" className="text-sm" disabled={hasPermission('dashboard_all') === 'locked'}>
              {hasPermission('dashboard_all') === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              All
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
            <div className="grid grid-cols-5 gap-4">
              {/* COLUMN 1 - LEADS */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthLeads.length}
                    icon={<Target />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Leads", thisMonthLeads, "leads", MONTHLY_GOALS.leads, 'lead')}
                    showProgress={true}
                    progressValue={thisMonthLeads.length}
                    progressMax={MONTHLY_GOALS.leads}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.leads)}
                    progressColor="[&_.bg-primary]:bg-green-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Leads", yesterdayLeads, "leads")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Leads", todayLeads, "leads")}
                  />
                  
                  <CollapsibleSection
                    title="All Leads" 
                    count={allLeads.length}
                    data={allLeads}
                    renderItem={(lead, index) => {
                      const highlightClass = getHighlightClasses(lead.lead_on_date);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {lead.first_name} {lead.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatLocalDate(lead.lead_on_date)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {STAGE_ID_TO_NAME[lead.pipeline_stage_id] || "Unknown"}
                          </Badge>
                        </div>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 2 - APPLICATIONS */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Applications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthApps.length}
                    icon={<FileText />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Applications", thisMonthApps, "applications", MONTHLY_GOALS.applications)}
                    showProgress={true}
                    progressValue={thisMonthApps.length}
                    progressMax={MONTHLY_GOALS.applications}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.applications)}
                    progressColor="[&_.bg-primary]:bg-green-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayApps.length}
                    icon={<Activity />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Applications", yesterdayApps, "applications")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayApps.length}
                    icon={<Activity />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Applications", todayApps, "applications")}
                  />
                  
                  <CollapsibleSection
                    title="All Applications" 
                    count={allApplications.length}
                    data={allApplications}
                    renderItem={(app, index) => {
                      const highlightClass = getHighlightClasses(app.app_complete_at);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {app.first_name} {app.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.app_complete_at ? new Date(app.app_complete_at).toLocaleDateString() : '-'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {STAGE_ID_TO_NAME[app.pipeline_stage_id] || "Unknown"}
                          </Badge>
                        </div>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 3 - FACE-TO-FACE MEETINGS */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    Face-to-Face Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Face-to-Face Meetings", thisMonthMeetings, "meetings", MONTHLY_GOALS.meetings, 'face_to_face')}
                    showProgress={true}
                    progressValue={thisMonthMeetings.length}
                    progressMax={MONTHLY_GOALS.meetings}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.meetings)}
                    progressColor="[&_.bg-primary]:bg-purple-500"
                  />
                  <ModernStatsCard
                    title="Last Week"
                    value={lastWeekMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Last Week's Face-to-Face Meetings", lastWeekMeetings, "meetings")}
                  />
                  <ModernStatsCard
                    title="This Week"
                    value={thisWeekMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Week's Face-to-Face Meetings", thisWeekMeetings, "meetings")}
                  />
                  
                  <CollapsibleSection
                    title="All Meetings" 
                    count={allMeetings.length}
                    data={allMeetings}
                    renderItem={(meeting, index) => {
                      const highlightClass = getHighlightClasses(meeting.face_to_face_meeting);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {meeting.first_name} {meeting.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(meeting.face_to_face_meeting).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground italic shrink-0 max-w-[150px] truncate">
                            {meeting.notes || "No notes"}
                          </p>
                        </div>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 4 - BROKER OPENS */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Broker Opens
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthBrokerOpens.length}
                    icon={<Calendar />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Broker Opens", thisMonthBrokerOpens, "meetings", MONTHLY_GOALS.brokerOpens, 'broker_open')}
                    showProgress={true}
                    progressValue={thisMonthBrokerOpens.length}
                    progressMax={MONTHLY_GOALS.brokerOpens}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.brokerOpens)}
                    progressColor="[&_.bg-primary]:bg-purple-500"
                  />
                  <ModernStatsCard
                    title="Last Week"
                    value={lastWeekBrokerOpens.length}
                    icon={<Calendar />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Last Week's Broker Opens", lastWeekBrokerOpens, "meetings")}
                  />
                  <ModernStatsCard
                    title="This Week"
                    value={thisWeekBrokerOpens.length}
                    icon={<Calendar />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Week's Broker Opens", thisWeekBrokerOpens, "meetings")}
                  />
                  
                  <CollapsibleSection
                    title="All Broker Opens" 
                    count={allBrokerOpens.length}
                    data={allBrokerOpens}
                    renderItem={(agent: any, index) => {
                      const highlightClass = getHighlightClasses(agent.broker_open);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {agent.first_name} {agent.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Date of Broker's Open: {formatLocalDate(agent.broker_open)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground italic shrink-0 max-w-[150px] truncate">
                            {agent.brokerage || "No brokerage"}
                          </p>
                        </div>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 5 - REVIEWS */}
              <Card className="border-gray-500/30 bg-gray-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-600" />
                    Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthReviews.length}
                    icon={<Star />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Reviews", thisMonthReviews, "reviews", MONTHLY_GOALS.reviews)}
                    showProgress={true}
                    progressValue={thisMonthReviews.length}
                    progressMax={MONTHLY_GOALS.reviews}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.reviews)}
                    progressColor="[&_.bg-primary]:bg-gray-500"
                  />
                  <ModernStatsCard
                    title="Last Week"
                    value={lastWeekReviews.length}
                    icon={<Star />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Last Week's Reviews", lastWeekReviews, "reviews")}
                  />
                  <ModernStatsCard
                    title="This Week"
                    value={thisWeekReviews.length}
                    icon={<Star />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Week's Reviews", thisWeekReviews, "reviews")}
                  />
                  
                  <CollapsibleSection
                    title="All Reviews" 
                    count={allReviews.length}
                    data={allReviews}
                    renderItem={(review: any, index) => {
                      const highlightClass = getHighlightClasses(review.review_left_on);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {review.first_name} {review.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatLocalDate(review.review_left_on)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {STAGE_ID_TO_NAME[review.pipeline_stage_id] || "Unknown"}
                          </Badge>
                        </div>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              </div>

            {/* Recent Activity & Pipeline Summary */}
            <div className="mt-8 grid grid-cols-2 gap-6">
                <CollapsibleSection
                  title="Recent Activity"
                  count={recentStageChanges.length}
                  data={recentStageChanges}
                  defaultOpen={false}
                  renderItem={(change: any, index) => {
                    const isLeadCreation = !change.from_stage;
                    const isGoingToLeads = change.to_stage?.name === 'Leads';
                    
                    return (
                      <div key={change.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-foreground">
                            {change.lead?.first_name} {change.lead?.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {isLeadCreation && isGoingToLeads ? (
                              <span className="text-primary font-medium">Created</span>
                            ) : isLeadCreation ? (
                              <>
                                <span>New</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="text-primary font-medium">{change.to_stage?.name}</span>
                              </>
                            ) : (
                              <>
                                <span>{change.from_stage?.name}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="text-primary font-medium">{change.to_stage?.name || 'Unknown'}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {formatDateTime(change.changed_at)}
                        </Badge>
                      </div>
                    );
                  }}
                />

                <PipelineSummarySection pipelineStageCounts={pipelineStageCounts} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {/* New Agents */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    New Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthNewAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's New Agent Calls", thisMonthNewAgentCalls, "calls", MONTHLY_GOALS.newAgentCalls, 'call', 'new_agent')}
                    showProgress={true}
                    progressValue={thisMonthNewAgentCalls.length}
                    progressMax={MONTHLY_GOALS.newAgentCalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.newAgentCalls)}
                    progressColor="[&_.bg-primary]:bg-blue-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayNewAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's New Agent Calls", yesterdayNewAgentCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayNewAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's New Agent Calls", todayNewAgentCalls, "calls")}
                  />
                </CardContent>
              </Card>

              {/* Current Agents */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Current Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthCurrentAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Current Agent Calls", thisMonthCurrentAgentCalls, "calls", MONTHLY_GOALS.currentAgentCalls, 'call', 'current_agent')}
                    showProgress={true}
                    progressValue={thisMonthCurrentAgentCalls.length}
                    progressMax={MONTHLY_GOALS.currentAgentCalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.currentAgentCalls)}
                    progressColor="[&_.bg-primary]:bg-blue-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayCurrentAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Current Agent Calls", yesterdayCurrentAgentCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayCurrentAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Current Agent Calls", todayCurrentAgentCalls, "calls")}
                  />
                </CardContent>
              </Card>

              {/* Top Agents */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Top Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthTopAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Top Agent Calls", thisMonthTopAgentCalls, "calls", MONTHLY_GOALS.topAgentCalls, 'call', 'top_agent')}
                    showProgress={true}
                    progressValue={thisMonthTopAgentCalls.length}
                    progressMax={MONTHLY_GOALS.topAgentCalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.topAgentCalls)}
                    progressColor="[&_.bg-primary]:bg-blue-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayTopAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Top Agent Calls", yesterdayTopAgentCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayTopAgentCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Top Agent Calls", todayTopAgentCalls, "calls")}
                  />
                </CardContent>
              </Card>

              {/* Past Listing Agents */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Past Listing Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthPastLACalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Past LA Calls", thisMonthPastLACalls, "calls", MONTHLY_GOALS.pastLACalls, 'call', 'past_la')}
                    showProgress={true}
                    progressValue={thisMonthPastLACalls.length}
                    progressMax={MONTHLY_GOALS.pastLACalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.pastLACalls)}
                    progressColor="[&_.bg-primary]:bg-blue-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayPastLACalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Past LA Calls", yesterdayPastLACalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayPastLACalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Past LA Calls", todayPastLACalls, "calls")}
                  />
                </CardContent>
              </Card>

              {/* Current Clients */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" />
                    Current Clients
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthCurrentClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Current Client Calls", thisMonthCurrentClientCalls, "calls", MONTHLY_GOALS.currentClientCalls)}
                    showProgress={true}
                    progressValue={thisMonthCurrentClientCalls.length}
                    progressMax={MONTHLY_GOALS.currentClientCalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.currentClientCalls)}
                    progressColor="[&_.bg-primary]:bg-purple-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayCurrentClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Current Client Calls", yesterdayCurrentClientCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayCurrentClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Current Client Calls", todayCurrentClientCalls, "calls")}
                  />
                </CardContent>
              </Card>

              {/* Past Clients */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" />
                    Past Clients
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthPastClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Past Client Calls", thisMonthPastClientCalls, "calls", MONTHLY_GOALS.pastClientCalls)}
                    showProgress={true}
                    progressValue={thisMonthPastClientCalls.length}
                    progressMax={MONTHLY_GOALS.pastClientCalls}
                    showExpectedProgress={true}
                    expectedProgressValue={calculateExpectedProgress(MONTHLY_GOALS.pastClientCalls)}
                    progressColor="[&_.bg-primary]:bg-purple-500"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayPastClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Past Client Calls", yesterdayPastClientCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayPastClientCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Past Client Calls", todayPastClientCalls, "calls")}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Top Row - Separated Volume and Units */}
              <div className="grid grid-cols-2 gap-4 max-w-4xl">
                {/* Volume Card */}
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Volume Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <ModernStatsCard
                        title="Total Active Volume"
                        value={new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(activeMetrics.total_volume)}
                        icon={<DollarSign />}
                        size="large"
                        centered={true}
                        clickable={true}
                        onClick={() => handleOpenVolumeModal("Total Active Volume", totalActiveLeads)}
                      />
                      <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                        {totalActiveLeads.slice(0, 15).map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                        {totalActiveLeads.length > 15 && (
                          <span className="text-xs text-muted-foreground self-center">+{totalActiveLeads.length - 15} more</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Current Month Pending Volume"
                        value={new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(currentMonthPending.current_month_volume)}
                        icon={<CalendarDays />}
                        centered={true}
                        clickable={true}
                        onClick={() => handleOpenVolumeModal("Current Month Pending Volume", currentMonthLeads)}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentMonthLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Next Month Pending Volume"
                        value={new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(nextMonthPending.next_month_volume)}
                        icon={<CalendarDays />}
                        centered={true}
                        clickable={true}
                        onClick={() => handleOpenVolumeModal("Next Month Pending Volume", nextMonthLeads)}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {nextMonthLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Closing This Week (Volume)"
                        value={new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(thisWeekClosing.this_week_volume)}
                        icon={<TrendingUp />}
                        centered={true}
                        clickable={true}
                        onClick={() => handleOpenVolumeModal("Closing This Week", thisWeekLeads)}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {thisWeekLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Units Card */}
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Unit Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <ModernStatsCard
                        title="Total Active Units"
                        value={activeMetrics.total_units.toString()}
                        icon={<Users />}
                        size="large"
                        centered={true}
                      />
                      <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                        {totalActiveLeads.slice(0, 15).map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                        {totalActiveLeads.length > 15 && (
                          <span className="text-xs text-muted-foreground self-center">+{totalActiveLeads.length - 15} more</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Current Month Pending Units"
                        value={currentMonthPending.current_month_units.toString()}
                        icon={<Users />}
                        centered={true}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentMonthLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Next Month Pending Units"
                        value={nextMonthPending.next_month_units.toString()}
                        icon={<Users />}
                        centered={true}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {nextMonthLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <ModernStatsCard
                        title="Closing This Week (Units)"
                        value={thisWeekClosing.this_week_units.toString()}
                        icon={<TrendingUp />}
                        centered={true}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {thisWeekLeads.map((lead: any) => (
                          <Badge 
                            key={lead.id}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs px-2 py-0.5"
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            {lead.first_name} {lead.last_name?.charAt(0)}.
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Extra Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <ModernStatsCard
                  title="Average Interest Rate"
                  value={`${activeMetrics.avg_interest_rate.toFixed(3)}%`}
                  icon={<BarChart3 />}
                  size="compact"
                  centered={true}
                />
                <ModernStatsCard
                  title="Average Loan Amount"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(activeMetrics.avg_loan_amount)}
                  icon={<DollarSign />}
                  size="compact"
                  centered={true}
                />
                <ModernStatsCard
                  title="Average Clear-to-Close Time"
                  value={activeMetrics.avg_ctc_days !== null ? `${Math.round(activeMetrics.avg_ctc_days)} days` : "—"}
                  icon={<FileText />}
                  size="compact"
                  centered={true}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
          {!closedYtdMetrics || !closedMonthlyVolume || !closedMonthlyUnits ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Top Row - Separated Volume and Units */}
              <div className="grid grid-cols-2 gap-6">
                {/* Volume Card */}
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Volume Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ModernStatsCard
                      title="2025 YTD Volume"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(closedYtdMetrics.ytd_volume)}
                      icon={<DollarSign />}
                      size="large"
                      centered={true}
                      clickable={true}
                      onClick={() => handleOpenVolumeModal("2025 YTD Closed Volume", closedYtdLeads)}
                    />
                    <ModernStatsCard
                      title="Average Loan Amount"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(closedYtdMetrics.avg_loan_amount)}
                      icon={<BarChart3 />}
                      centered={true}
                    />
                  </CardContent>
                </Card>

                {/* Units Card */}
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Unit Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ModernStatsCard
                      title="2025 YTD Units"
                      value={closedYtdMetrics.ytd_units.toString()}
                      icon={<Users />}
                      size="large"
                      centered={true}
                      clickable={true}
                      onClick={() => handleOpenVolumeModal("2025 YTD Closed Units", closedYtdLeads)}
                    />
                    <ModernStatsCard
                      title="Average Monthly Units"
                      value={calculateAverageMonthlyUnits(closedYtdMetrics.ytd_units)}
                      icon={<TrendingUp />}
                      size="large"
                      centered={true}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Charts */}
              <div className="grid grid-cols-2 gap-6">
                <ModernChartCard
                  title="2025 Volume by Month"
                  data={monthlyData}
                  type="bar"
                  dataKey="volume"
                  height={240}
                  color="hsl(var(--primary))"
                  showValueLabels={true}
                  formatValue={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  onBarClick={(index) => {
                    const monthNum = index + 1;
                    const leadsInMonth = closedMonthlyLeads.get(monthNum) || [];
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    handleOpenVolumeModal(`${monthNames[index]} 2025 Closed Volume`, leadsInMonth);
                  }}
                />
                <ModernChartCard
                  title="2025 Units by Month"
                  data={monthlyData}
                  type="bar"
                  dataKey="units"
                  height={240}
                  color="hsl(var(--primary))"
                  showValueLabels={true}
                  onBarClick={(index) => {
                    const monthNum = index + 1;
                    const leadsInMonth = closedMonthlyLeads.get(monthNum) || [];
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    handleOpenVolumeModal(`${monthNames[index]} 2025 Closed Units`, leadsInMonth);
                  }}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="miscellaneous" className="space-y-6">
          {/* EMAILS - Moved from Sales tab */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <ModernStatsCard
                  title="This Month"
                  value={thisMonthEmails.length}
                  icon={<Mail />}
                  size="large"
                  clickable={true}
                  onClick={() => handleOpenModal("This Month's Emails", thisMonthEmails, "emails")}
                />
                <ModernStatsCard
                  title="Yesterday"
                  value={yesterdayEmails.length}
                  icon={<Mail />}
                  size="large"
                  clickable={true}
                  onClick={() => handleOpenModal("Yesterday's Emails", yesterdayEmails, "emails")}
                />
                <ModernStatsCard
                  title="Today"
                  value={todayEmails.length}
                  icon={<Mail />}
                  size="large"
                  clickable={true}
                  onClick={() => handleOpenModal("Today's Emails", todayEmails, "emails")}
                />
              </div>
              
              <CollapsibleSection
                title="All Emails" 
                count={allEmails.length}
                data={allEmails}
                renderItem={(email: any, index) => {
                  const highlightClass = getHighlightClasses(email.timestamp);
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {email.lead?.first_name} {email.lead?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.subject || "No subject"}
                        </p>
                      </div>
                      <Badge variant={email.direction === 'Out' ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {email.direction === 'Out' ? 'Sent' : 'Received'}
                      </Badge>
                    </div>
                  );
                }}
              />
            </CardContent>
          </Card>
          
          <ActivityMonitor />
          
          <ConversionAnalytics />
        </TabsContent>

        {/* All Tab - Unified View of All Leads */}
        <TabsContent value="all" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  All Pipeline Leads ({allLeadsData.length})
                  {selectedAllLeadIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedAllLeadIds.length} selected
                    </Badge>
                  )}
                </CardTitle>
                
                {/* Search Bar */}
                <div className="mt-3">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search all leads..."
                      value={allLeadsSearchTerm}
                      onChange={(e) => setAllLeadsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={allLeadsColumns}
                  data={allLeadsData}
                  searchTerm={allLeadsSearchTerm}
                  showRowNumbers={false}
                />
              </CardContent>
            </Card>
          )}
          
        </TabsContent>
      </Tabs>

      <DashboardDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle}
        data={modalData}
        type={modalType}
        onLeadClick={handleLeadClick}
        goal={modalGoal}
        expectedProgress={modalExpectedProgress}
        activityType={modalActivityType}
        callSubType={modalCallSubType}
      />

      <VolumeDetailModal
        open={volumeModalOpen}
        onOpenChange={setVolumeModalOpen}
        title={volumeModalTitle}
        data={volumeModalData}
        onLeadClick={handleLeadClick}
      />

      {selectedClient && (
        <ClientDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onStageChange={() => {}}
          pipelineType="leads"
          onLeadUpdated={async () => {
            // Optionally refresh dashboard data
          }}
        />
      )}
    </div>
  );
}