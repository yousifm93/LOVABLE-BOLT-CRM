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

// Fetch events via CalDAV protocol
async function fetchCalDAVEvents(
  caldavUrl: string, 
  username: string, 
  password: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  console.log('[CalDAV] Fetching events from:', caldavUrl);
  
  // Format dates for CalDAV query
  const formatCalDAVDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // CalDAV REPORT request body to get events in date range
  const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${formatCalDAVDate(startDate)}" end="${formatCalDAVDate(endDate)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  const authHeader = 'Basic ' + btoa(`${username}:${password}`);
  
  try {
    const response = await fetch(caldavUrl, {
      method: 'REPORT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: reportBody,
    });
    
    if (!response.ok) {
      console.error('[CalDAV] REPORT failed:', response.status, await response.text());
      throw new Error(`CalDAV request failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log('[CalDAV] Response length:', xmlText.length);
    
    // Debug: Log first 1000 chars of response to see the actual format
    console.log('[CalDAV] Raw XML (first 1000 chars):', xmlText.substring(0, 1000));
    
    // Parse calendar-data from XML response with flexible namespace matching
    // IONOS might use different namespace prefixes (C:, cal:, caldav:, or no prefix)
    const events: CalendarEvent[] = [];
    
    // Try multiple regex patterns for calendar-data
    const patterns = [
      /<(?:C:|cal:|caldav:)?calendar-data[^>]*>([\s\S]*?)<\/(?:C:|cal:|caldav:)?calendar-data>/gi,
      /<[^:>]+:calendar-data[^>]*>([\s\S]*?)<\/[^:>]+:calendar-data>/gi,
      /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/gi, // Direct ICS content without XML wrapper
    ];
    
    let foundEvents = false;
    
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;
      
      while ((match = pattern.exec(xmlText)) !== null) {
        foundEvents = true;
        // If match[1] exists (captured group), use it, otherwise use match[0] (full match)
        const rawContent = match[1] || match[0];
        
        const icsContent = rawContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<!\[CDATA\[/g, '')
          .replace(/\]\]>/g, '');
        
        console.log('[CalDAV] Found ICS content, length:', icsContent.length);
        
        const parsedEvents = parseICS(icsContent);
        console.log('[CalDAV] Parsed', parsedEvents.length, 'events from this block');
        events.push(...parsedEvents);
      }
      
      if (foundEvents) break; // Stop if we found events with this pattern
    }
    
    if (!foundEvents) {
      console.log('[CalDAV] No calendar-data blocks found. Checking if response is multistatus...');
      // Log more of the response to debug
      console.log('[CalDAV] Full response:', xmlText.substring(0, 2000));
    }
    
    console.log('[CalDAV] Total parsed events:', events.length);
    return events;
  } catch (error) {
    console.error('[CalDAV] Error:', error);
    throw error;
  }
}

// Check if URL is a CalDAV URL
function isCalDAVUrl(url: string): boolean {
  return url.includes('/caldav/') || url.includes('/dav/') || url.includes('/calendars/');
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
      console.log('[fetch-calendar-events] No calendar URL configured for user');
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

    let events: CalendarEvent[] = [];
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    // Check if this is a CalDAV URL requiring authentication
    if (isCalDAVUrl(settings.ics_url) && settings.caldav_username && settings.caldav_password) {
      console.log('[fetch-calendar-events] Using CalDAV protocol');
      try {
        events = await fetchCalDAVEvents(
          settings.ics_url,
          settings.caldav_username,
          settings.caldav_password,
          startDate,
          endDate
        );
      } catch (caldavError) {
        console.error('[fetch-calendar-events] CalDAV fetch failed:', caldavError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch calendar. Please check your CalDAV credentials.',
          details: caldavError.message 
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Standard ICS fetch
      console.log('[fetch-calendar-events] Fetching standard ICS');
      const icsResponse = await fetch(settings.ics_url);
      
      if (!icsResponse.ok) {
        console.error('[fetch-calendar-events] Failed to fetch ICS:', icsResponse.status);
        
        // Check if it might need CalDAV auth
        if (isCalDAVUrl(settings.ics_url)) {
          return new Response(JSON.stringify({ 
            error: 'This appears to be a CalDAV URL. Please provide your email username and password.',
            requiresAuth: true 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ error: 'Failed to fetch calendar data' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const icsContent = await icsResponse.text();
      console.log(`[fetch-calendar-events] Received ${icsContent.length} bytes of ICS data`);

      // Parse events
      events = parseICS(icsContent);
      console.log(`[fetch-calendar-events] Parsed ${events.length} events`);

      // Filter by date range if provided
      if (start && end) {
        events = events.filter(event => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          return eventStart <= endDate && eventEnd >= startDate;
        });
        console.log(`[fetch-calendar-events] Filtered to ${events.length} events in range`);
      }
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