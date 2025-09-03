import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LeadDate {
  key: string;
  value_date: string | null;
}

interface DatesTabProps {
  leadId: string;
}

const DATE_FIELDS = [
  { key: 'app_received_at', label: 'Application Received' },
  { key: 'docs_requested_at', label: 'Documents Requested' },
  { key: 'docs_received_at', label: 'Documents Received' },
  { key: 'condo_pkg_sent_at', label: 'Condo Package Sent' },
  { key: 'prequal_issued_at', label: 'Pre-Qualification Issued' },
  { key: 'preapproval_issued_at', label: 'Pre-Approval Issued' },
];

function DateRow({ dateKey, label, currentDate, onDateChange, onDateClear }: {
  dateKey: string;
  label: string;
  currentDate: Date | null;
  onDateChange: (key: string, date: Date) => void;
  onDateClear: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium min-w-0 truncate">{label}</span>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {currentDate ? (
          <>
            <span className="text-sm text-muted-foreground">
              {format(currentDate, "MMM dd, yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDateClear(dateKey)}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal text-xs h-7",
                  !currentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {currentDate ? format(currentDate, "MMM dd, yyyy") : "Set date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={currentDate || undefined}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(dateKey, date);
                    setOpen(false);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export function DatesTab({ leadId }: DatesTabProps) {
  const [dates, setDates] = useState<Record<string, Date | null>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDates();
  }, [leadId]);

  const loadDates = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_dates')
        .select('key, value_date')
        .eq('lead_id', leadId);

      if (error) throw error;

      const dateMap: Record<string, Date | null> = {};
      DATE_FIELDS.forEach(field => {
        dateMap[field.key] = null;
      });

      data?.forEach(item => {
        if (item.value_date) {
          dateMap[item.key] = new Date(item.value_date);
        }
      });

      setDates(dateMap);
    } catch (error) {
      console.error('Error loading dates:', error);
      toast({
        title: "Error",
        description: "Failed to load dates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (key: string, date: Date) => {
    try {
      const { error } = await supabase
        .from('lead_dates')
        .upsert({
          lead_id: leadId,
          key,
          value_date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        }, {
          onConflict: 'lead_id,key'
        });

      if (error) throw error;

      setDates(prev => ({ ...prev, [key]: date }));
      toast({
        title: "Success",
        description: "Date saved successfully",
      });
    } catch (error) {
      console.error('Error saving date:', error);
      toast({
        title: "Error",
        description: "Failed to save date",
        variant: "destructive",
      });
    }
  };

  const handleDateClear = async (key: string) => {
    try {
      const { error } = await supabase
        .from('lead_dates')
        .delete()
        .eq('lead_id', leadId)
        .eq('key', key);

      if (error) throw error;

      setDates(prev => ({ ...prev, [key]: null }));
      toast({
        title: "Success",
        description: "Date cleared successfully",
      });
    } catch (error) {
      console.error('Error clearing date:', error);
      toast({
        title: "Error",
        description: "Failed to clear date",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {DATE_FIELDS.map(field => (
          <div key={field.key} className="h-8 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {DATE_FIELDS.map(field => (
        <DateRow
          key={field.key}
          dateKey={field.key}
          label={field.label}
          currentDate={dates[field.key]}
          onDateChange={handleDateChange}
          onDateClear={handleDateClear}
        />
      ))}
      
      {Object.values(dates).every(date => !date) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No dates set
        </p>
      )}
    </div>
  );
}