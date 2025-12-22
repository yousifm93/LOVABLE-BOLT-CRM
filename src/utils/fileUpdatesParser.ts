/**
 * Parse file updates text and split into today's updates vs older updates
 */

interface ParsedFileUpdates {
  todayUpdates: string[];
  olderUpdates: string[];
  olderCount: number;
}

/**
 * Parse the file updates text by timestamp patterns and split into today vs older
 * Timestamp format: [MM/DD/YY H:MM AM/PM] or [MM/DD/YYYY H:MM AM/PM]
 */
export function parseFileUpdatesByDate(text: string): ParsedFileUpdates {
  if (!text || text.trim() === '') {
    return { todayUpdates: [], olderUpdates: [], olderCount: 0 };
  }

  const today = new Date();
  const todayStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
  const todayStrShort = `${today.getMonth() + 1}/${today.getDate()}`;
  
  // Get 2-digit and 4-digit year formats
  const year2 = today.getFullYear().toString().slice(-2);
  const year4 = today.getFullYear().toString();

  // Regex to match timestamp pattern at start of lines or entries
  const timestampRegex = /\[(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\]/gi;

  // Split text into entries by timestamp
  const entries: { date: string; content: string }[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  timestampRegex.lastIndex = 0;
  const matches: { index: number; date: string }[] = [];

  while ((match = timestampRegex.exec(text)) !== null) {
    const month = match[1];
    const day = match[2];
    const year = match[3];
    matches.push({
      index: match.index,
      date: `${month}/${day}/${year}`
    });
  }

  // Build entries based on timestamp positions
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    
    if (content) {
      entries.push({
        date: matches[i].date,
        content
      });
    }
  }

  // If no timestamps found, treat entire text as today's update
  if (entries.length === 0) {
    return { 
      todayUpdates: text.trim() ? [text.trim()] : [], 
      olderUpdates: [], 
      olderCount: 0 
    };
  }

  const todayUpdates: string[] = [];
  const olderUpdates: string[] = [];

  for (const entry of entries) {
    // Check if entry date matches today
    const [month, day, year] = entry.date.split('/');
    const entryDateStr = `${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
    const entryYear = year.length === 2 ? year : year.slice(-2);
    
    const isToday = (entryDateStr === todayStr || `${month}/${day}` === todayStrShort) && 
                    (entryYear === year2 || year === year4);

    if (isToday) {
      todayUpdates.push(entry.content);
    } else {
      olderUpdates.push(entry.content);
    }
  }

  return {
    todayUpdates,
    olderUpdates,
    olderCount: olderUpdates.length
  };
}

/**
 * Render a single file update entry with bolded timestamps
 */
export function renderFileUpdateEntry(text: string): { parts: { text: string; isBold: boolean }[] }[] {
  const lines = text.split('\n');
  return lines.map(line => {
    const parts = line.split(/(\[\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\])/gi);
    return {
      parts: parts.map(part => ({
        text: part,
        isBold: /^\[\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\]$/i.test(part)
      }))
    };
  });
}
