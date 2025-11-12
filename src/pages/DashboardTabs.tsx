import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText, Phone, Mail, Calendar, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModernChartCard } from "@/components/ui/modern-chart-card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActivityMonitor } from "@/components/dashboard/ActivityMonitor";
import { ConversionAnalytics } from "@/components/dashboard/ConversionAnalytics";
import { PipelineSummarySection } from "@/components/dashboard/PipelineSummarySection";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardDetailModal } from "@/components/dashboard/DashboardDetailModal";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { transformLeadToClient } from "@/utils/clientTransform";
import { databaseService } from "@/services/database";
import { CRMClient } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

// Monthly goals
const MONTHLY_GOALS = {
  leads: 70,
  applications: 30,
  meetings: 20,
  calls: 110
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

// Format date-only strings as local dates (avoid timezone issues)
const formatLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
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
    yesterdayMeetings,
    todayMeetings,
    allMeetings,
    thisMonthCalls,
    yesterdayCalls,
    todayCalls,
    allCalls,
    recentStageChanges,
    pipelineStageCounts,
    activeMetrics,
    currentMonthPending,
    nextMonthPending,
    thisWeekClosing,
    closedYtdMetrics,
    closedMonthlyVolume,
    closedMonthlyUnits,
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState<"leads" | "applications" | "meetings" | "calls">("leads");

  // Drawer state
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal handlers
  const handleOpenModal = (title: string, data: any[], type: "leads" | "applications" | "meetings" | "calls") => {
    setModalTitle(title);
    setModalData(data);
    setModalType(type);
    setModalOpen(true);
  };

  // Lead click handler - open drawer instead of navigate
  const handleLeadClick = async (leadId: string) => {
    try {
      // Close the modal first
      setModalOpen(false);
      
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

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="sales" className="text-sm">Sales</TabsTrigger>
          <TabsTrigger value="active" className="text-sm">Active</TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">Closed</TabsTrigger>
          <TabsTrigger value="miscellaneous" className="text-sm">Miscellaneous</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
              {/* COLUMN 1 - LEADS */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthLeads.length}
                    icon={<Target />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Leads", thisMonthLeads, "leads")}
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

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{thisMonthLeads.length} / {MONTHLY_GOALS.leads}</span>
                    </div>
                    <Progress 
                      value={(thisMonthLeads.length / MONTHLY_GOALS.leads) * 100} 
                      className="h-2"
                    />
                  </div>
                  
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
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthApps.length}
                    icon={<FileText />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Applications", thisMonthApps, "applications")}
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

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{thisMonthApps.length} / {MONTHLY_GOALS.applications}</span>
                    </div>
                    <Progress 
                      value={(thisMonthApps.length / MONTHLY_GOALS.applications) * 100} 
                      className="h-2 [&>div]:bg-green-600"
                    />
                  </div>
                  
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
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Face-to-Face Meetings", thisMonthMeetings, "meetings")}
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Face-to-Face Meetings", yesterdayMeetings, "meetings")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayMeetings.length}
                    icon={<Users />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Face-to-Face Meetings", todayMeetings, "meetings")}
                  />

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{thisMonthMeetings.length} / {MONTHLY_GOALS.meetings}</span>
                    </div>
                    <Progress 
                      value={(thisMonthMeetings.length / MONTHLY_GOALS.meetings) * 100} 
                      className="h-2 [&>div]:bg-purple-600"
                    />
                  </div>
                  
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

              {/* COLUMN 4 - CALLS */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-600" />
                    Calls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("This Month's Calls", thisMonthCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Yesterday's Calls", yesterdayCalls, "calls")}
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayCalls.length}
                    icon={<Phone />}
                    size="large"
                    clickable={true}
                    onClick={() => handleOpenModal("Today's Calls", todayCalls, "calls")}
                  />

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{thisMonthCalls.length} / {MONTHLY_GOALS.calls}</span>
                    </div>
                    <Progress 
                      value={(thisMonthCalls.length / MONTHLY_GOALS.calls) * 100} 
                      className="h-2 [&>div]:bg-orange-600"
                    />
                  </div>
                  
                  <CollapsibleSection
                    title="All Calls" 
                    count={allCalls.length}
                    data={allCalls}
                    renderItem={(call, index) => {
                      const highlightClass = getHighlightClasses(call.last_agent_call);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between gap-2 p-2 rounded border border-border transition-colors ${highlightClass || 'hover:bg-muted/50'}`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {call.first_name} {call.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(call.last_agent_call).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground italic shrink-0 max-w-[150px] truncate">
                            {call.notes || "No notes"}
                          </p>
                        </div>
                      );
                    }}
                  />
                </CardContent>
                </Card>
              </div>

              {/* Recent Activity & Pipeline Summary */}
              <div className="mt-8 space-y-6">
                <CollapsibleSection
                  title="Recent Activity"
                  count={recentStageChanges.length}
                  data={recentStageChanges}
                  defaultOpen={true}
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

        <TabsContent value="active" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    />
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
                    />
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
                    />
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
                      title="Total Active Units"
                      value={activeMetrics.total_units.toString()}
                      icon={<Users />}
                      size="large"
                      centered={true}
                    />
                    <ModernStatsCard
                      title="Current Month Pending Units"
                      value={currentMonthPending.current_month_units.toString()}
                      icon={<Users />}
                      centered={true}
                    />
                    <ModernStatsCard
                      title="Next Month Pending Units"
                      value={nextMonthPending.next_month_units.toString()}
                      icon={<Users />}
                      centered={true}
                    />
                    <ModernStatsCard
                      title="Closing This Week (Units)"
                      value={thisWeekClosing.this_week_units.toString()}
                      icon={<TrendingUp />}
                      centered={true}
                    />
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
                />
                <ModernChartCard
                  title="2025 Units by Month"
                  data={monthlyData}
                  type="bar"
                  dataKey="units"
                  height={240}
                  color="hsl(var(--primary))"
                  showValueLabels={true}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="miscellaneous" className="space-y-6">
          <ActivityMonitor />
          
          <ConversionAnalytics />
        </TabsContent>
      </Tabs>

      <DashboardDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle}
        data={modalData}
        type={modalType}
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