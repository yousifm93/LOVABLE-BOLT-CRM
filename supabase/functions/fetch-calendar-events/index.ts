import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  allDay: boolean;
}

// Parse ICS VEVENT into our event format
function parseVEvent(veventBlock: string): CalendarEvent | null {
  try {
    const getField = (field: string): string | undefined => {
      const regex = new RegExp(`^${field}[;:](.*)$`, 'im');
      const match = veventBlock.match(regex);
      return match ? match[1].replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined;
    };

    const uid = getField('UID') || crypto.randomUUID();
    const summary = getField('SUMMARY') || 'Untitled Event';
    const dtstart = getField('DTSTART');
    const dtend = getField('DTEND');
    const location = getField('LOCATION');
    const description = getField('DESCRIPTION');

    if (!dtstart) return null;

    // Parse date/time - handle both DATE and DATETIME formats
    const parseDateTime = (dt: string): { date: Date; allDay: boolean } => {
      // Remove any parameters before the value (e.g., TZID=...)
      const value = dt.includes(':') ? dt.split(':').pop()! : dt;
      
      if (value.length === 8) {
        // All day event: YYYYMMDD
        return { 
          date: new Date(
            parseInt(value.slice(0, 4)),
            parseInt(value.slice(4, 6)) - 1,
            parseInt(value.slice(6, 8))
          ),
          allDay: true 
        };
      } else {
        // Date time: YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
        const year = parseInt(value.slice(0, 4));
        const month = parseInt(value.slice(4, 6)) - 1;
        const day = parseInt(value.slice(6, 8));
        const hour = parseInt(value.slice(9, 11));
        const minute = parseInt(value.slice(11, 13));
        const second = parseInt(value.slice(13, 15)) || 0;
        
        const date = value.endsWith('Z') 
          ? new Date(Date.UTC(year, month, day, hour, minute, second))
          : new Date(year, month, day, hour, minute, second);
        
        return { date, allDay: false };
      }
    };

    const start = parseDateTime(dtstart);
    const end = dtend ? parseDateTime(dtend) : { date: start.date, allDay: start.allDay };

    return {
      id: uid,
      title: summary,
      start: start.date.toISOString(),
      end: end.date.toISOString(),
      location,
      description,
      allDay: start.allDay,
    };
  } catch (error) {
    console.error('Error parsing VEVENT:', error);
    return null;
  }
}

// Parse full ICS content
function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  // Unfold long lines (ICS uses line folding with CRLF + space/tab)
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, '');
  
  // Extract VEVENT blocks
  const veventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/gi;
  const veventBlocks = unfolded.match(veventRegex) || [];
  
  for (const block of veventBlocks) {
    const event = parseVEvent(block);
    if (event) {
      events.push(event);
    }
  }
  
  return events;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { start, end } = await req.json();
    console.log(`[fetch-calendar-events] Fetching events for user ${user.id} from ${start} to ${end}`);

    // Get user's calendar settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_calendar_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('[fetch-calendar-events] Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch calendar settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings?.ics_url) {
      console.log('[fetch-calendar-events] No ICS URL configured for user');
      return new Response(JSON.stringify({ events: [], message: 'No calendar configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.calendar_enabled) {
      return new Response(JSON.stringify({ events: [], message: 'Calendar disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ICS content
    console.log('[fetch-calendar-events] Fetching ICS from URL');
    const icsResponse = await fetch(settings.ics_url);
    
    if (!icsResponse.ok) {
      console.error('[fetch-calendar-events] Failed to fetch ICS:', icsResponse.status);
      return new Response(JSON.stringify({ error: 'Failed to fetch calendar data' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const icsContent = await icsResponse.text();
    console.log(`[fetch-calendar-events] Received ${icsContent.length} bytes of ICS data`);

    // Parse events
    let events = parseICS(icsContent);
    console.log(`[fetch-calendar-events] Parsed ${events.length} events`);

    // Filter by date range if provided
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      events = events.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart <= endDate && eventEnd >= startDate;
      });
      console.log(`[fetch-calendar-events] Filtered to ${events.length} events in range`);
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fetch-calendar-events] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});