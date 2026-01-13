import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Settings, Clock, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  allDay: boolean;
}

export function CalendarPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [caldavUsername, setCaldavUsername] = useState("");
  const [caldavPassword, setCaldavPassword] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hasCalendarConfigured, setHasCalendarConfigured] = useState<boolean | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const isCalDAVUrl = (url: string) => {
    return url.includes('/caldav/') || url.includes('/dav/') || url.includes('/calendars/');
  };

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();
      
      const { data, error } = await supabase.functions.invoke('fetch-calendar-events', {
        body: { start, end }
      });
      
      if (error) throw error;
      
      if (data.message === 'No calendar configured') {
        setHasCalendarConfigured(false);
        setEvents([]);
      } else if (data.requiresAuth) {
        setRequiresAuth(true);
        setIsSettingsOpen(true);
        toast({
          title: "Authentication Required",
          description: "This calendar URL requires a username and password.",
          variant: "default",
        });
      } else if (data.error) {
        toast({
          title: "Calendar Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        setHasCalendarConfigured(true);
        setRequiresAuth(false);
        setEvents(data.events || []);
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: "Calendar Error",
        description: error.message || "Failed to load calendar events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDate, toast]);

  // Fetch user's calendar settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_calendar_settings')
        .select('ics_url, caldav_username, caldav_password')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.ics_url) {
        setIcsUrl(data.ics_url);
        setCaldavUsername(data.caldav_username || "");
        setCaldavPassword(data.caldav_password || "");
        setHasCalendarConfigured(true);
      } else {
        setHasCalendarConfigured(false);
      }
    };
    
    fetchSettings();
  }, [user]);

  // Fetch events when date changes
  useEffect(() => {
    if (hasCalendarConfigured) {
      fetchEvents();
    }
  }, [selectedDate, hasCalendarConfigured, fetchEvents]);

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('user_calendar_settings')
        .upsert({
          user_id: user.id,
          ics_url: icsUrl,
          caldav_username: caldavUsername || null,
          caldav_password: caldavPassword || null,
          calendar_enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      toast({
        title: "Settings Saved",
        description: "Your calendar has been configured",
      });
      
      setIsSettingsOpen(false);
      setHasCalendarConfigured(!!icsUrl);
      setRequiresAuth(false);
      
      if (icsUrl) {
        fetchEvents();
      }
    } catch (error: any) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const goToToday = () => setSelectedDate(new Date());
  const goToPrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return "All day";
    const start = new Date(event.start);
    const end = new Date(event.end);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const showCredentials = isCalDAVUrl(icsUrl) || requiresAuth;

  return (
    <div className="flex flex-col h-[400px] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchEvents()} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Date Navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">
            {format(selectedDate, 'EEEE')}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(selectedDate, 'MMM d, yyyy')}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Today button */}
      {!isToday && (
        <div className="px-3 py-2 border-b">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={goToToday}>
            Today
          </Button>
        </div>
      )}
      
      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasCalendarConfigured === false ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">No calendar configured</p>
              <Button size="sm" variant="outline" onClick={() => setIsSettingsOpen(true)}>
                Add Calendar
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No events today</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <p className="text-xs font-medium line-clamp-2">{event.title}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatEventTime(event)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
            <DialogDescription>
              Enter your calendar's URL. For IONOS CalDAV, you'll also need your email credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ics-url">Calendar URL (ICS or CalDAV)</Label>
              <Input
                id="ics-url"
                placeholder="https://calendar.example.com/calendar.ics"
                value={icsUrl}
                onChange={(e) => setIcsUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                For IONOS: Use your CalDAV URL from calendar settings
              </p>
            </div>
            
            {showCredentials && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="caldav-username">Email/Username</Label>
                  <Input
                    id="caldav-username"
                    type="email"
                    placeholder="your@email.com"
                    value={caldavUsername}
                    onChange={(e) => setCaldavUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caldav-password">Password</Label>
                  <Input
                    id="caldav-password"
                    type="password"
                    placeholder="Your email password"
                    value={caldavPassword}
                    onChange={(e) => setCaldavPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your credentials are stored securely and used only to sync your calendar.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings || !icsUrl}>
              {isSavingSettings ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}