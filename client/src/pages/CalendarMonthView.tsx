import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, Pencil, Trash2, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  location?: string;
  description?: string;
}

export default function CalendarMonthView() {
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<BigCalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    summary: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
  });

  const { toast } = useToast();

  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: { eventId: string; updates: typeof editFormData }) => {
      const response = await apiRequest('PATCH', `/api/calendar/events/${data.eventId}`, data.updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('DELETE', `/api/calendar/events/${eventId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    setRefreshing(false);
  };

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    setEditFormData({
      summary: selectedEvent.title,
      description: selectedEvent.description || '',
      location: selectedEvent.location || '',
      startDateTime: selectedEvent.start.toISOString(),
      endDateTime: selectedEvent.end.toISOString(),
    });
    setEditDialogOpen(true);
  };

  const handleDeleteEvent = () => {
    setDeleteDialogOpen(true);
  };

  const handleSubmitEdit = () => {
    if (!selectedEvent) return;
    updateEventMutation.mutate({
      eventId: selectedEvent.id,
      updates: editFormData,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedEvent) return;
    deleteEventMutation.mutate(selectedEvent.id);
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
      location: event.location,
      description: event.description,
    };
  });

  // Custom event rendering to show time in month view
  const EventComponent = ({ event }: { event: BigCalendarEvent }) => {
    const timeStr = event.allDay ? '' : format(event.start, 'h:mm a');
    return (
      <span className="text-xs">
        {timeStr && <strong>{timeStr}</strong>} {event.title}
      </span>
    );
  };

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
                  views={['month', 'week', 'day', 'agenda']}
                  view={view}
                  onView={(newView: View) => setView(newView)}
                  onSelectEvent={handleSelectEvent}
                  style={{ height: '100%' }}
                  components={{
                    event: EventComponent,
                  }}
                  data-testid="calendar-view"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent && !editDialogOpen && !deleteDialogOpen} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent data-testid="dialog-event-detail">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Time</Label>
                <p className="text-sm">
                  {selectedEvent && (
                    selectedEvent.allDay
                      ? format(selectedEvent.start, 'MMMM d, yyyy')
                      : `${format(selectedEvent.start, 'MMMM d, yyyy h:mm a')} - ${format(selectedEvent.end, 'h:mm a')}`
                  )}
                </p>
              </div>
              {selectedEvent?.location && (
                <div>
                  <Label className="text-sm font-semibold">Location</Label>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}
              {selectedEvent?.description && (
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleEditEvent}
                data-testid="button-edit-event"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEvent}
                data-testid="button-delete-event"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent data-testid="dialog-edit-event">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-summary">Title</Label>
                <Input
                  id="edit-summary"
                  value={editFormData.summary}
                  onChange={(e) => setEditFormData({ ...editFormData, summary: e.target.value })}
                  data-testid="input-event-title"
                />
              </div>
              <div>
                <Label htmlFor="edit-start">Start Date & Time</Label>
                <Input
                  id="edit-start"
                  type="datetime-local"
                  value={editFormData.startDateTime.slice(0, 16)}
                  onChange={(e) => setEditFormData({ ...editFormData, startDateTime: new Date(e.target.value).toISOString() })}
                  data-testid="input-event-start"
                />
              </div>
              <div>
                <Label htmlFor="edit-end">End Date & Time</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  value={editFormData.endDateTime.slice(0, 16)}
                  onChange={(e) => setEditFormData({ ...editFormData, endDateTime: new Date(e.target.value).toISOString() })}
                  data-testid="input-event-end"
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  data-testid="input-event-location"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  data-testid="input-event-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitEdit}
                disabled={updateEventMutation.isPending}
                data-testid="button-save-event"
              >
                {updateEventMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent data-testid="dialog-confirm-delete">
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteEventMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
