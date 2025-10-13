import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, RefreshCw, ExternalLink, MapPin, Users, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  htmlLink?: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [showCreateCaseDialog, setShowCreateCaseDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [caseNumber, setCaseNumber] = useState("");

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  const syncCasesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/sync-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Success",
        description: "Cases synced to Google Calendar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSyncCases = async () => {
    setSyncing(true);
    await syncCasesMutation.mutateAsync();
    setSyncing(false);
  };

  const handleCreateCaseFromEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setCaseNumber("");
    setShowCreateCaseDialog(true);
  };

  const createCaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return;
      
      const response = await fetch('/api/calendar/create-case-from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          caseNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create case');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      toast({
        title: "Case Created",
        description: "Case created successfully from calendar event",
      });
      setShowCreateCaseDialog(false);
      setSelectedEvent(null);
      setCaseNumber("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Case",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitCreateCase = () => {
    if (!caseNumber.trim()) {
      toast({
        title: "Case Number Required",
        description: "Please enter a case number",
        variant: "destructive",
      });
      return;
    }
    createCaseMutation.mutate();
  };

  const formatEventDate = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return 'No date';
    
    const date = new Date(dateStr);
    return format(date, 'PPP p');
  };

  const getEventDuration = (event: CalendarEvent) => {
    const startStr = event.start.dateTime || event.start.date;
    const endStr = event.end.dateTime || event.end.date;
    
    if (!startStr || !endStr) return '';
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    
    if (duration < 60) return `${duration} min`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-calendar">Calendar</h1>
            <p className="text-muted-foreground">Manage mediation sessions and appointments</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-calendar">Calendar</h1>
            <p className="text-muted-foreground">View and manage your Google Calendar events</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] })}
              variant="outline"
              data-testid="button-refresh-calendar"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleSyncCases}
              disabled={syncing}
              data-testid="button-sync-cases"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {syncing ? "Syncing..." : "Sync All Cases to Calendar"}
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No upcoming events</h2>
              <p className="text-muted-foreground mb-4">
                Your Google Calendar is clear. Sync your cases to create calendar events.
              </p>
              <Button onClick={handleSyncCases} disabled={syncing} data-testid="button-sync-empty">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Sync Cases to Calendar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} data-testid={`event-${event.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{event.summary}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatEventDate(event)}</span>
                        </div>
                        {getEventDuration(event) && (
                          <Badge variant="secondary">{getEventDuration(event)}</Badge>
                        )}
                      </div>
                    </div>
                    {event.htmlLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(event.htmlLink, '_blank')}
                        data-testid={`button-open-event-${event.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {event.description && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium mb-1">Attendees:</div>
                        <div className="flex flex-wrap gap-2">
                          {event.attendees.map((attendee, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {attendee.displayName || attendee.email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateCaseFromEvent(event)}
                      data-testid={`button-create-case-${event.id}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Case from Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateCaseDialog} onOpenChange={setShowCreateCaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Case from Calendar Event</DialogTitle>
              <DialogDescription>
                Create a new mediation case from this calendar event. The event details will be used to populate the case information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="case-number">Case Number *</Label>
                <Input
                  id="case-number"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g., MED-2024-001"
                  data-testid="input-case-number"
                />
              </div>
              {selectedEvent && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">Event: {selectedEvent.summary}</p>
                  {selectedEvent.start.dateTime && (
                    <p className="text-muted-foreground">
                      Date: {format(new Date(selectedEvent.start.dateTime), 'PPP p')}
                    </p>
                  )}
                  {selectedEvent.location && (
                    <p className="text-muted-foreground">Location: {selectedEvent.location}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateCaseDialog(false)}
                data-testid="button-cancel-create-case"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCreateCase}
                disabled={createCaseMutation.isPending}
                data-testid="button-submit-create-case"
              >
                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
