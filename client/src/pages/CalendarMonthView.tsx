import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date()),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export default function CalendarMonthView() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    setRefreshing(false);
  };

  // Transform Google Calendar events to react-big-calendar format
  const calendarEvents: BigCalendarEvent[] = events.map((event) => {
    const startDateStr = event.start.dateTime || event.start.date;
    const endDateStr = event.end.dateTime || event.end.date;
    const isAllDay = !event.start.dateTime;

    return {
      id: event.id,
      title: event.summary || '(No title)',
      start: startDateStr ? new Date(startDateStr) : new Date(),
      end: endDateStr ? new Date(endDateStr) : new Date(),
      allDay: isAllDay,
    };
  });

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to load calendar. Please connect your Google Calendar in Settings."}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="button-refresh-calendar"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="h-[600px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  views={['month']}
                  defaultView="month"
                  style={{ height: '100%' }}
                  data-testid="calendar-month-view"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
