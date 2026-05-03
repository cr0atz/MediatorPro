import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AIChat from "./AIChat";
import DocumentManager from "./DocumentManager";
import CaseNotes from "./CaseNotes";
import EmailModal from "./EmailModal";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, Party, Document, PartyType, PositionType } from "@shared/schema";
import { 
  AlertTriangle, ArrowLeft, Mail, Video, Trash2, Info, Users, Folder, 
  StickyNote, Bot, Circle, Download, FileText, Plus, Phone, Edit2, CalendarDays,
  MessageSquare, CalendarPlus, Edit
} from "lucide-react";

interface CaseDetailProps {
  caseId: string;
  onBack: () => void;
}

export default function CaseDetail({ caseId, onBack }: CaseDetailProps) {
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddPartyDialog, setShowAddPartyDialog] = useState(false);
  const [showEditCaseDialog, setShowEditCaseDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreatingZoomMeeting, setIsCreatingZoomMeeting] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [editingDisputeBackground, setEditingDisputeBackground] = useState(false);
  const [editingIssues, setEditingIssues] = useState(false);
  const [disputeBackgroundText, setDisputeBackgroundText] = useState('');
  const [issuesText, setIssuesText] = useState('');

  // Fetch party types for dropdown
  const { data: partyTypes } = useQuery<PartyType[]>({
    queryKey: ['/api/party-types'],
  });

  // Fetch position types for dropdown
  const { data: positionTypes } = useQuery<PositionType[]>({
    queryKey: ['/api/position-types'],
  });

  const [partyForm, setPartyForm] = useState({
    entityName: '',
    partyType: 'applicant',
    position: '',
    primaryContactName: '',
    primaryContactRole: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    legalRepName: '',
    legalRepFirm: '',
    legalRepEmail: '',
    legalRepPhone: '',
  });
  const [editingParty, setEditingParty] = useState<any>(null);
  const [showEditPartyDialog, setShowEditPartyDialog] = useState(false);
  const [showAddScheduleDialog, setShowAddScheduleDialog] = useState(false);
  const [showEditScheduleDialog, setShowEditScheduleDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    eventType: '',
    eventTitle: '',
    eventDate: '',
    location: '',
    notes: '',
  });

  const addPartyMutation = useMutation({
    mutationFn: async (partyData: any) => {
      const response = await apiRequest('POST', `/api/cases/${caseId}/parties`, partyData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add party');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Success",
        description: "Party added successfully",
      });
      setShowAddPartyDialog(false);
      setPartyForm({
        entityName: '',
        partyType: 'applicant',
        position: '',
        primaryContactName: '',
        primaryContactRole: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        legalRepName: '',
        legalRepFirm: '',
        legalRepEmail: '',
        legalRepPhone: '',
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add party",
        variant: "destructive",
      });
    },
  });

  const updatePartyMutation = useMutation({
    mutationFn: async ({ partyId, partyData }: { partyId: string; partyData: any }) => {
      const response = await apiRequest('PATCH', `/api/cases/${caseId}/parties/${partyId}`, partyData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update party');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Success",
        description: "Party updated successfully",
      });
      setShowEditPartyDialog(false);
      setEditingParty(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update party",
        variant: "destructive",
      });
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      // Convert datetime-local string to ISO string for the server
      const eventData = {
        ...scheduleData,
        eventDate: new Date(scheduleData.eventDate).toISOString(),
      };
      const response = await apiRequest('POST', `/api/cases/${caseId}/events`, eventData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "events"] });
      toast({
        title: "Success",
        description: "Schedule added successfully",
      });
      setShowAddScheduleDialog(false);
      setScheduleForm({
        eventType: '',
        eventTitle: '',
        eventDate: '',
        location: '',
        notes: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add schedule",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: any }) => {
      const data = {
        ...eventData,
        eventDate: new Date(eventData.eventDate).toISOString(),
      };
      const response = await apiRequest('PATCH', `/api/cases/${caseId}/events/${eventId}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "events"] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      setShowEditScheduleDialog(false);
      setEditingEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('DELETE', `/api/cases/${caseId}/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "events"] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const setActiveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('PATCH', `/api/cases/${caseId}/events/${eventId}`, { isActive: true });
      if (!response.ok) {
        throw new Error('Failed to set active event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "events"] });
      toast({
        title: "Success",
        description: "Event set as active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to set active event",
        variant: "destructive",
      });
    },
  });

  const syncToCalendarMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('POST', `/api/cases/${caseId}/events/${eventId}/sync-calendar`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync to calendar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "events"] });
      toast({
        title: "Success",
        description: "Event synced to Google Calendar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync to calendar",
        variant: "destructive",
      });
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/cases/${caseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Case deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      onBack();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive",
      });
    },
  });

  const createZoomMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/cases/${caseId}/zoom-meeting`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Zoom meeting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Success",
        description: "Zoom meeting created successfully",
      });
      setIsCreatingZoomMeeting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Zoom meeting",
        variant: "destructive",
      });
      setIsCreatingZoomMeeting(false);
    },
  });

  const [editCaseForm, setEditCaseForm] = useState({
    caseNumber: '',
    mediationNumber: '',
    mediatorName: '',
    mediationType: '',
    mediationDate: '',
    premises: '',
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest('PATCH', `/api/cases/${caseId}`, updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update case');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Success",
        description: "Case updated successfully",
      });
      setShowEditCaseDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case",
        variant: "destructive",
      });
    },
  });

  const handleCreateZoomMeeting = () => {
    setIsCreatingZoomMeeting(true);
    createZoomMeetingMutation.mutate();
  };

  const handleJoinZoomMeeting = () => {
    if (case_.zoomMeetingLink) {
      window.open(case_.zoomMeetingLink, '_blank');
    }
  };

  const handleSyncToCalendar = async () => {
    if (!case_.mediationDate) {
      toast({
        title: "No Mediation Date",
        description: "Please set a mediation date before syncing to calendar",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingCalendar(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/sync-to-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync to calendar');
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });

      toast({
        title: "Calendar Synced",
        description: result.action === 'created' 
          ? "Calendar event created successfully" 
          : "Calendar event updated successfully",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync to calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleEditCase = () => {
    const updates: any = {};
    if (editCaseForm.caseNumber) updates.caseNumber = editCaseForm.caseNumber;
    if (editCaseForm.mediationNumber) updates.mediationNumber = editCaseForm.mediationNumber;
    if (editCaseForm.mediatorName) updates.mediatorName = editCaseForm.mediatorName;
    if (editCaseForm.mediationType) updates.mediationType = editCaseForm.mediationType;
    if (editCaseForm.mediationDate) {
      // Convert datetime-local input to ISO string
      updates.mediationDate = new Date(editCaseForm.mediationDate).toISOString();
    }
    if (editCaseForm.premises) updates.premises = editCaseForm.premises;
    
    updateCaseMutation.mutate(updates);
  };

  const handleSaveDisputeBackground = async () => {
    try {
      await updateCaseMutation.mutateAsync({
        disputeBackground: disputeBackgroundText.trim() || null
      });
      setEditingDisputeBackground(false);
      setDisputeBackgroundText('');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleSaveIssues = async () => {
    try {
      const issues = issuesText
        .split('\n')
        .map(issue => issue.trim())
        .filter(issue => issue.length > 0);
      
      await updateCaseMutation.mutateAsync({
        issuesForDiscussion: issues.length > 0 ? issues : []
      });
      setEditingIssues(false);
      setIssuesText('');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ["/api/cases", caseId],
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "communications"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch communications");
      return res.json();
    },
  });

  const { data: caseEvents = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "events"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/events`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  if (error) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    } else {
      toast({
        title: "Error",
        description: "Failed to fetch case details",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-destructive w-16 h-16 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Case not found</h2>
          <Button onClick={onBack}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const case_ = caseData as Case & { parties: Party[], documents: Document[] };
  const applicants = case_.parties.filter(p => p.partyType === 'applicant');
  const respondents = case_.parties.filter(p => p.partyType === 'respondent');

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <>
      {/* Case Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold" data-testid="text-case-number">
                {case_.caseNumber}
              </h2>
              <Badge className={`${getStatusBadgeClass(case_.status)} text-xs`}>
                {case_.status}
              </Badge>
            </div>
            <div className="text-primary-foreground/90 text-sm" data-testid="text-case-parties">
              {applicants.length > 0 && (
                <span>
                  <strong>Applicant{applicants.length > 1 ? 's' : ''}:</strong> {applicants.map(p => p.entityName).join(', ')}
                </span>
              )}
              {applicants.length > 0 && respondents.length > 0 && <span className="mx-2">|</span>}
              {respondents.length > 0 && (
                <span>
                  <strong>Respondent{respondents.length > 1 ? 's' : ''}:</strong> {respondents.map(p => p.entityName).join(', ')}
                </span>
              )}
              {applicants.length === 0 && respondents.length === 0 && (
                <span className="text-primary-foreground/70">No parties added yet</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowEmailModal(true)}
              className="bg-white/20 text-primary-foreground hover:bg-white/30"
              data-testid="button-send-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            {case_.zoomMeetingLink ? (
              <Button
                variant="default"
                onClick={handleJoinZoomMeeting}
                className="bg-white text-primary hover:bg-white/90"
                data-testid="button-join-session"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Session
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleCreateZoomMeeting}
                disabled={createZoomMeetingMutation.isPending}
                className="bg-white text-primary hover:bg-white/90"
                data-testid="button-set-zoom"
              >
                <Video className="w-4 h-4 mr-2" />
                {createZoomMeetingMutation.isPending ? 'Creating...' : 'Set Zoom'}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-500/20 text-primary-foreground hover:bg-red-500/30"
              data-testid="button-delete-case"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="border-b border-border bg-muted/30">
          <div className="px-6">
            <TabsList className="bg-transparent">
              <TabsTrigger
                value="overview"
                className="flex items-center space-x-2"
                data-testid="tab-overview"
              >
                <Info className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="parties"
                className="flex items-center space-x-2"
                data-testid="tab-parties"
              >
                <Users className="w-4 h-4" />
                <span>Parties</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="flex items-center space-x-2"
                data-testid="tab-documents"
              >
                <Folder className="w-4 h-4" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center space-x-2"
                data-testid="tab-notes"
              >
                <StickyNote className="w-4 h-4" />
                <span>Case Notes</span>
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="flex items-center space-x-2"
                data-testid="tab-ai"
              >
                <Bot className="w-4 h-4" />
                <span>AI Analysis</span>
              </TabsTrigger>
              <TabsTrigger
                value="communications"
                className="flex items-center space-x-2"
                data-testid="tab-communications"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Communications</span>
              </TabsTrigger>
              <TabsTrigger
                value="meetings"
                className="flex items-center space-x-2"
                data-testid="tab-meetings"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Meetings</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content - Overview */}
        <TabsContent value="overview" className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Case Information</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowAddScheduleDialog(true)}
                        data-testid="button-add-schedule"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Schedule
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowEditCaseDialog(true)}
                        data-testid="button-edit-case"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Case Number</p>
                      <p className="text-sm text-foreground font-mono">{case_.caseNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Mediation Number</p>
                      <p className="text-sm text-foreground font-mono">{case_.mediationNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Mediator</p>
                      <p className="text-sm text-foreground">{case_.mediatorName || 'Assigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Mediation Type</p>
                      <p className="text-sm text-foreground">{case_.mediationType || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Session Date</p>
                      <p className="text-sm text-foreground">{formatDate(case_.mediationDate?.toString() || null)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Premises</p>
                      <p className="text-sm text-foreground">{case_.premises || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Applicant(s)</p>
                      <div className="text-sm text-foreground">
                        {applicants.length > 0 ? (
                          <div className="space-y-1">
                            {applicants.map((p, idx) => (
                              <div key={idx}>{p.entityName}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Respondent(s)</p>
                      <div className="text-sm text-foreground">
                        {respondents.length > 0 ? (
                          <div className="space-y-1">
                            {respondents.map((p, idx) => (
                              <div key={idx}>{p.entityName}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">All Parties</p>
                      <div className="text-sm text-foreground">
                        {case_?.parties && case_.parties.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {case_.parties.map((p: any, idx: number) => (
                              <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 rounded border text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {p.partyType}
                                </Badge>
                                <span>{p.entityName}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No parties added yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Events Section */}
                  {caseEvents && caseEvents.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Scheduled Events</h4>
                      <div className="space-y-3">
                        {caseEvents.map((event: any) => {
                          const eventDate = new Date(event.eventDate);
                          const isUpcoming = eventDate > new Date();
                          return (
                            <div key={event.id} className={`p-3 rounded-lg border ${event.isActive ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : isUpcoming ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={isUpcoming ? "default" : "secondary"} className="text-xs">
                                      {event.eventType}
                                    </Badge>
                                    {event.isActive && (
                                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                                        ⭐ Active Event
                                      </Badge>
                                    )}
                                    {isUpcoming && !event.isActive && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        Upcoming
                                      </Badge>
                                    )}
                                    {event.calendarEventId && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        📅 Synced
                                      </Badge>
                                    )}
                                  </div>
                                  {event.eventTitle && (
                                    <p className="text-sm font-medium text-foreground">{event.eventTitle}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <CalendarDays className="w-3 h-3" />
                                      {eventDate.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </div>
                                    <div>
                                      {eventDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1">
                                        📍 {event.location}
                                      </div>
                                    )}
                                  </div>
                                  {event.notes && (
                                    <p className="text-xs text-muted-foreground mt-2">{event.notes}</p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  {!event.isActive && isUpcoming && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setActiveEventMutation.mutate(event.id)}
                                      title="Set as active event"
                                    >
                                      ⭐
                                    </Button>
                                  )}
                                  {!event.calendarEventId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => syncToCalendarMutation.mutate(event.id)}
                                      title="Sync to Google Calendar"
                                    >
                                      📅
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setEditingEvent(event);
                                      setScheduleForm({
                                        eventType: event.eventType,
                                        eventTitle: event.eventTitle || '',
                                        eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
                                        location: event.location || '',
                                        notes: event.notes || '',
                                      });
                                      setShowEditScheduleDialog(true);
                                    }}
                                    title="Edit event"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this event?')) {
                                        deleteScheduleMutation.mutate(event.id);
                                      }
                                    }}
                                    title="Delete event"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Dispute Background</h3>
                    {!editingDisputeBackground && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingDisputeBackground(true);
                          setDisputeBackgroundText(case_.disputeBackground || '');
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {editingDisputeBackground ? (
                    <div className="space-y-3">
                      <Textarea
                        value={disputeBackgroundText}
                        onChange={(e) => setDisputeBackgroundText(e.target.value)}
                        placeholder="Enter dispute background..."
                        rows={4}
                        className="w-full"
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveDisputeBackground()}
                          disabled={updateCaseMutation.isPending}
                        >
                          {updateCaseMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDisputeBackground(false);
                            setDisputeBackgroundText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-dispute-background">
                      {case_.disputeBackground || 'No dispute background provided. Click the edit button to add one.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Issues for Discussion</h3>
                    {!editingIssues && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIssues(true);
                          setIssuesText((case_.issuesForDiscussion || []).join('\n'));
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {editingIssues ? (
                    <div className="space-y-3">
                      <Textarea
                        value={issuesText}
                        onChange={(e) => setIssuesText(e.target.value)}
                        placeholder="Enter each issue on a new line..."
                        rows={6}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Enter each issue on a separate line</p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveIssues()}
                          disabled={updateCaseMutation.isPending}
                        >
                          {updateCaseMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingIssues(false);
                            setIssuesText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {case_.issuesForDiscussion && case_.issuesForDiscussion.length > 0 ? (
                        <ul className="space-y-2" data-testid="list-issues">
                          {case_.issuesForDiscussion.map((issue, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <Circle className="text-primary w-2 h-2 mt-1" />
                              <span className="text-sm text-foreground">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No issues for discussion added. Click the edit button to add some.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    {case_.zoomMeetingLink ? (
                      <Button 
                        className="w-full justify-center" 
                        onClick={handleJoinZoomMeeting}
                        data-testid="button-join-zoom"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Zoom Session
                      </Button>
                    ) : (
                      <Button 
                        className="w-full justify-center" 
                        onClick={handleCreateZoomMeeting}
                        disabled={isCreatingZoomMeeting}
                        data-testid="button-start-zoom"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        {isCreatingZoomMeeting ? 'Creating Meeting...' : 'Start Zoom Session'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      onClick={() => setShowEmailModal(true)}
                      data-testid="button-send-communication"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Communication
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      onClick={handleSyncToCalendar}
                      disabled={isSyncingCalendar || !case_.mediationDate}
                      data-testid="button-sync-calendar"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {case_.calendarEventId ? 'Update Calendar Event' : 'Sync to Calendar'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      data-testid="button-export-summary"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Case Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Case Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Case Created</p>
                        <p className="text-xs text-muted-foreground">
                          {case_.createdAt ? new Date(case_.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Current Status</p>
                        <p className="text-xs text-muted-foreground capitalize">{case_.status}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Documents</h3>
                  <div className="space-y-2">
                    {case_.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents uploaded</p>
                    ) : (
                      case_.documents.slice(0, 3).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center space-x-3">
                            <FileText className="text-red-500 w-5 h-5" />
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-32">
                                {doc.originalName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab Content - Parties */}
        <TabsContent value="parties" className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Case Parties</h2>
            <Button onClick={() => setShowAddPartyDialog(true)} data-testid="button-add-party">
              <Plus className="w-4 h-4 mr-2" />
              Add Party
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Applicants Column - LEFT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Applicant</h3>
                <Badge variant="outline" className="text-xs">Primary Party</Badge>
              </div>
              {applicants.length === 0 ? (
                <p className="text-muted-foreground text-sm">No applicants added</p>
              ) : (
                applicants.map((applicant, index) => (
                  <Card key={applicant.id || index}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Entity Name</p>
                            <p className="text-sm font-semibold text-foreground" data-testid={`text-applicant-name-${applicant.id}`}>
                              {applicant.entityName}
                            </p>
                            {applicant.position && (
                              <Badge variant="secondary" className="mt-2">{applicant.position}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingParty(applicant);
                              setPartyForm({
                                entityName: applicant.entityName || '',
                                partyType: applicant.partyType || 'applicant',
                                position: applicant.position || '',
                                primaryContactName: applicant.primaryContactName || '',
                                primaryContactRole: applicant.primaryContactRole || '',
                                primaryContactEmail: applicant.primaryContactEmail || '',
                                primaryContactPhone: applicant.primaryContactPhone || '',
                                legalRepName: applicant.legalRepName || '',
                                legalRepFirm: applicant.legalRepFirm || '',
                                legalRepEmail: applicant.legalRepEmail || '',
                                legalRepPhone: applicant.legalRepPhone || '',
                              });
                              setShowEditPartyDialog(true);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        {applicant.primaryContactName && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Primary Contact</p>
                            <div className="bg-card rounded-md p-3 border border-border">
                              <p className="text-sm font-medium text-foreground">{applicant.primaryContactName}</p>
                              {applicant.primaryContactRole && (
                                <p className="text-xs text-muted-foreground">{applicant.primaryContactRole}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {applicant.primaryContactEmail && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Mail className="text-muted-foreground mr-2 w-4 h-4" />
                                    {applicant.primaryContactEmail}
                                  </p>
                                )}
                                {applicant.primaryContactPhone && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Phone className="text-muted-foreground mr-2 w-4 h-4" />
                                    {applicant.primaryContactPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {applicant.legalRepName && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Legal Representative</p>
                            <div className="bg-card rounded-md p-3 border border-border">
                              <p className="text-sm font-medium text-foreground">{applicant.legalRepName}</p>
                              {applicant.legalRepFirm && (
                                <p className="text-xs text-muted-foreground">{applicant.legalRepFirm}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {applicant.legalRepEmail && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Mail className="text-muted-foreground mr-2 w-4 h-4" />
                                    {applicant.legalRepEmail}
                                  </p>
                                )}
                                {applicant.legalRepPhone && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Phone className="text-muted-foreground mr-2 w-4 h-4" />
                                    {applicant.legalRepPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Respondents Column - RIGHT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Respondent</h3>
                <Badge variant="outline" className="text-xs">Opposing Party</Badge>
              </div>
              {respondents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No respondents added</p>
              ) : (
                respondents.map((respondent, index) => (
                  <Card key={respondent.id || index}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Entity Name</p>
                            <p className="text-sm font-semibold text-foreground" data-testid={`text-respondent-name-${respondent.id}`}>
                              {respondent.entityName}
                            </p>
                            {respondent.position && (
                              <Badge variant="secondary" className="mt-2">{respondent.position}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingParty(respondent);
                              setPartyForm({
                                entityName: respondent.entityName || '',
                                partyType: respondent.partyType || 'respondent',
                                position: respondent.position || '',
                                primaryContactName: respondent.primaryContactName || '',
                                primaryContactRole: respondent.primaryContactRole || '',
                                primaryContactEmail: respondent.primaryContactEmail || '',
                                primaryContactPhone: respondent.primaryContactPhone || '',
                                legalRepName: respondent.legalRepName || '',
                                legalRepFirm: respondent.legalRepFirm || '',
                                legalRepEmail: respondent.legalRepEmail || '',
                                legalRepPhone: respondent.legalRepPhone || '',
                              });
                              setShowEditPartyDialog(true);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        {respondent.primaryContactName && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Primary Contact</p>
                            <div className="bg-card rounded-md p-3 border border-border">
                              <p className="text-sm font-medium text-foreground">{respondent.primaryContactName}</p>
                              {respondent.primaryContactRole && (
                                <p className="text-xs text-muted-foreground">{respondent.primaryContactRole}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {respondent.primaryContactEmail && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Mail className="text-muted-foreground mr-2 w-4 h-4" />
                                    {respondent.primaryContactEmail}
                                  </p>
                                )}
                                {respondent.primaryContactPhone && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Phone className="text-muted-foreground mr-2 w-4 h-4" />
                                    {respondent.primaryContactPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {respondent.legalRepName && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Legal Representative</p>
                            <div className="bg-card rounded-md p-3 border border-border">
                              <p className="text-sm font-medium text-foreground">{respondent.legalRepName}</p>
                              {respondent.legalRepFirm && (
                                <p className="text-xs text-muted-foreground">{respondent.legalRepFirm}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {respondent.legalRepEmail && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Mail className="text-muted-foreground mr-2 w-4 h-4" />
                                    {respondent.legalRepEmail}
                                  </p>
                                )}
                                {respondent.legalRepPhone && (
                                  <p className="text-xs text-foreground flex items-center">
                                    <Phone className="text-muted-foreground mr-2 w-4 h-4" />
                                    {respondent.legalRepPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {applicants.length === 0 && respondents.length === 0 && (
            <div className="text-center p-8 mt-4">
              <Users className="text-muted-foreground w-16 h-16 mb-4" />
              <p className="text-foreground font-medium">No party information</p>
              <p className="text-muted-foreground text-sm">Party details will appear here once extracted from documents</p>
            </div>
          )}
        </TabsContent>

        {/* Tab Content - Documents */}
        <TabsContent value="documents" className="p-6">
          <DocumentManager caseId={caseId} />
        </TabsContent>

        {/* Tab Content - Case Notes */}
        <TabsContent value="notes" className="p-6">
          <CaseNotes caseId={caseId} />
        </TabsContent>

        {/* Tab Content - AI Analysis */}
        <TabsContent value="ai" className="p-6">
          <AIChat caseId={caseId} />
        </TabsContent>

        {/* Tab Content - Communications */}
        <TabsContent value="communications" className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Communications Log</h2>
                <p className="text-muted-foreground">Track all communications and activities for this case</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h3>
                  
                  {/* Communications timeline */}
                  <div className="space-y-4">
                    {communications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No communications logged yet</p>
                        <p className="text-sm mt-2">Communications will appear here when you:</p>
                        <ul className="text-sm mt-2 space-y-1">
                          <li>• Send emails to parties</li>
                          <li>• Create or join Zoom meetings</li>
                          <li>• Add calendar entries</li>
                          <li>• Schedule phone calls</li>
                        </ul>
                      </div>
                    ) : (
                      communications.map((comm: any) => (
                        <div key={comm.id} className="border-l-4 border-primary/30 pl-4 py-3 hover:bg-muted/50 rounded-r">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={comm.type === 'email' ? 'default' : 'secondary'}>
                                {comm.type.toUpperCase()}
                              </Badge>
                              <Badge variant={comm.direction === 'outgoing' ? 'outline' : 'default'}>
                                {comm.direction === 'outgoing' ? '→ Sent' : '← Received'}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(comm.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {comm.subject && (
                            <h4 className="font-semibold text-foreground mb-1">{comm.subject}</h4>
                          )}
                          <div className="text-sm text-muted-foreground mb-2">
                            <strong>To:</strong> {JSON.parse(comm.recipients || '[]').join(', ')}
                          </div>
                          {comm.content && (
                            <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">
                              {comm.content}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Content - Meetings */}
        <TabsContent value="meetings" className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Meetings & Events</h2>
                <p className="text-muted-foreground">Manage Zoom meetings, phone calls, and calendar events</p>
              </div>
              <Button 
                onClick={() => setShowAddScheduleDialog(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Event</span>
              </Button>
            </div>

            {/* Zoom Meeting Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Video className="w-5 h-5 mr-2 text-primary" />
                    Zoom Meetings
                  </h3>
                  {case_.zoomMeetingLink ? (
                    <Button 
                      onClick={handleJoinZoomMeeting}
                      className="flex items-center space-x-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Join Current Meeting</span>
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleCreateZoomMeeting}
                      disabled={createZoomMeetingMutation.isPending}
                      className="flex items-center space-x-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>{createZoomMeetingMutation.isPending ? 'Creating...' : 'Create Zoom Meeting'}</span>
                    </Button>
                  )}
                </div>
                
                {case_.zoomMeetingLink ? (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Zoom Meeting</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm bg-background px-3 py-1 rounded">{case_.zoomMeetingLink}</code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(case_.zoomMeetingLink || '');
                          toast({ title: "Copied", description: "Meeting link copied to clipboard" });
                        }}
                      >
                        Copy Link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No Zoom meeting created yet</p>
                    <p className="text-sm mt-2">Create a Zoom meeting to enable video conferencing for this case</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Events Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <CalendarDays className="w-5 h-5 mr-2 text-primary" />
                    Calendar Events
                  </h3>
                  {!case_.calendarEventId && case_.mediationDate && (
                    <Button 
                      onClick={handleSyncToCalendar}
                      disabled={isSyncingCalendar}
                      className="flex items-center space-x-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>{isSyncingCalendar ? 'Syncing...' : 'Sync to Calendar'}</span>
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {case_.calendarEventId ? (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Mediation Session</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {case_.mediationDate ? new Date(case_.mediationDate).toLocaleString() : 'Date not set'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Synced to Google Calendar</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No calendar events synced</p>
                      <p className="text-sm mt-2">Sync this case to your Google Calendar to manage events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phone Calls Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Phone className="w-5 h-5 mr-2 text-primary" />
                    Scheduled Phone Calls
                  </h3>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setScheduleForm({
                        eventType: 'Phone Call',
                        eventTitle: '',
                        eventDate: '',
                        location: 'Phone',
                        notes: '',
                      });
                      setShowAddScheduleDialog(true);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Call</span>
                  </Button>
                </div>
                
                {caseEvents?.filter((e: any) => e.eventType === 'Phone Call').length > 0 ? (
                  <div className="space-y-3">
                    {caseEvents
                      .filter((e: any) => e.eventType === 'Phone Call')
                      .map((event: any) => {
                        const eventDate = new Date(event.eventDate);
                        const isUpcoming = eventDate > new Date();
                        return (
                          <div key={event.id} className={`p-3 rounded-lg border ${isUpcoming ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{event.eventTitle || 'Phone Call'}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    {eventDate.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </div>
                                  <div>{eventDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
                                  {isUpcoming && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Upcoming
                                    </Badge>
                                  )}
                                </div>
                                {event.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">{event.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No phone calls scheduled</p>
                    <p className="text-sm mt-2">Schedule phone calls with parties to keep track of important conversations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showEmailModal && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          caseId={caseId}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
              All associated documents, parties, and notes will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCaseMutation.mutate()}
              disabled={deleteCaseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCaseMutation.isPending ? "Deleting..." : "Delete Case"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAddPartyDialog} onOpenChange={setShowAddPartyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Party</DialogTitle>
            <DialogDescription>
              Manually add a party to this case. Fill in the required fields and any additional information available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="entityName">Entity Name *</Label>
                <Input
                  id="entityName"
                  value={partyForm.entityName}
                  onChange={(e) => setPartyForm({...partyForm, entityName: e.target.value})}
                  placeholder="Company or individual name"
                  data-testid="input-entity-name"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="partyType">Party Type *</Label>
                <Select value={partyForm.partyType} onValueChange={(value) => setPartyForm({...partyForm, partyType: value})}>
                  <SelectTrigger data-testid="select-party-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partyTypes && partyTypes.length > 0 ? (
                      partyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.value}>{type.label}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="applicant">Applicant</SelectItem>
                        <SelectItem value="respondent">Respondent</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="position">Position</Label>
                <Select value={partyForm.position} onValueChange={(value) => setPartyForm({...partyForm, position: value})}>
                  <SelectTrigger data-testid="select-position">
                    <SelectValue placeholder="Select position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positionTypes && positionTypes.length > 0 ? (
                      positionTypes.map((type) => (
                        <SelectItem key={type.id} value={type.value}>{type.label}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Lawyer">Lawyer</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="Landlord">Landlord</SelectItem>
                        <SelectItem value="Guarantor">Guarantor</SelectItem>
                        <SelectItem value="Agent">Agent</SelectItem>
                        <SelectItem value="Expert Witness">Expert Witness</SelectItem>
                        <SelectItem value="Support Person">Support Person</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Primary Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryContactName">Contact Name</Label>
                  <Input
                    id="primaryContactName"
                    value={partyForm.primaryContactName}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactName: e.target.value})}
                    data-testid="input-primary-contact-name"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactRole">Role/Title</Label>
                  <Input
                    id="primaryContactRole"
                    value={partyForm.primaryContactRole}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactRole: e.target.value})}
                    data-testid="input-primary-contact-role"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactEmail">Email</Label>
                  <Input
                    id="primaryContactEmail"
                    type="email"
                    value={partyForm.primaryContactEmail}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactEmail: e.target.value})}
                    data-testid="input-primary-contact-email"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContactPhone">Phone</Label>
                  <Input
                    id="primaryContactPhone"
                    value={partyForm.primaryContactPhone}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactPhone: e.target.value})}
                    data-testid="input-primary-contact-phone"
                  />
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Legal Representative</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="legalRepName">Representative Name</Label>
                  <Input
                    id="legalRepName"
                    value={partyForm.legalRepName}
                    onChange={(e) => setPartyForm({...partyForm, legalRepName: e.target.value})}
                    data-testid="input-legal-rep-name"
                  />
                </div>
                <div>
                  <Label htmlFor="legalRepFirm">Law Firm</Label>
                  <Input
                    id="legalRepFirm"
                    value={partyForm.legalRepFirm}
                    onChange={(e) => setPartyForm({...partyForm, legalRepFirm: e.target.value})}
                    data-testid="input-legal-rep-firm"
                  />
                </div>
                <div>
                  <Label htmlFor="legalRepEmail">Email</Label>
                  <Input
                    id="legalRepEmail"
                    type="email"
                    value={partyForm.legalRepEmail}
                    onChange={(e) => setPartyForm({...partyForm, legalRepEmail: e.target.value})}
                    data-testid="input-legal-rep-email"
                  />
                </div>
                <div>
                  <Label htmlFor="legalRepPhone">Phone</Label>
                  <Input
                    id="legalRepPhone"
                    value={partyForm.legalRepPhone}
                    onChange={(e) => setPartyForm({...partyForm, legalRepPhone: e.target.value})}
                    data-testid="input-legal-rep-phone"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPartyDialog(false)} data-testid="button-cancel-add-party">
              Cancel
            </Button>
            <Button
              onClick={() => addPartyMutation.mutate(partyForm)}
              disabled={!partyForm.entityName || addPartyMutation.isPending}
              data-testid="button-submit-add-party"
            >
              {addPartyMutation.isPending ? "Adding..." : "Add Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Party Dialog */}
      <Dialog open={showEditPartyDialog} onOpenChange={setShowEditPartyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
            <DialogDescription>
              Update party information for this case.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-entityName">Entity Name *</Label>
                <Input
                  id="edit-entityName"
                  value={partyForm.entityName}
                  onChange={(e) => setPartyForm({...partyForm, entityName: e.target.value})}
                  placeholder="Company or individual name"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-partyType">Party Type *</Label>
                <Select value={partyForm.partyType} onValueChange={(value) => setPartyForm({...partyForm, partyType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partyTypes && partyTypes.length > 0 ? (
                      partyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.value}>{type.label}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="applicant">Applicant</SelectItem>
                        <SelectItem value="respondent">Respondent</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-position">Position</Label>
                <Select value={partyForm.position} onValueChange={(value) => setPartyForm({...partyForm, position: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positionTypes && positionTypes.length > 0 ? (
                      positionTypes.map((type) => (
                        <SelectItem key={type.id} value={type.value}>{type.label}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Lawyer">Lawyer</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="Landlord">Landlord</SelectItem>
                        <SelectItem value="Guarantor">Guarantor</SelectItem>
                        <SelectItem value="Agent">Agent</SelectItem>
                        <SelectItem value="Expert Witness">Expert Witness</SelectItem>
                        <SelectItem value="Support Person">Support Person</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Primary Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-primaryContactName">Contact Name</Label>
                  <Input
                    id="edit-primaryContactName"
                    value={partyForm.primaryContactName}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-primaryContactRole">Role/Title</Label>
                  <Input
                    id="edit-primaryContactRole"
                    value={partyForm.primaryContactRole}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactRole: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-primaryContactEmail">Email</Label>
                  <Input
                    id="edit-primaryContactEmail"
                    type="email"
                    value={partyForm.primaryContactEmail}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactEmail: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-primaryContactPhone">Phone</Label>
                  <Input
                    id="edit-primaryContactPhone"
                    value={partyForm.primaryContactPhone}
                    onChange={(e) => setPartyForm({...partyForm, primaryContactPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Legal Representative</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-legalRepName">Representative Name</Label>
                  <Input
                    id="edit-legalRepName"
                    value={partyForm.legalRepName}
                    onChange={(e) => setPartyForm({...partyForm, legalRepName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-legalRepFirm">Law Firm</Label>
                  <Input
                    id="edit-legalRepFirm"
                    value={partyForm.legalRepFirm}
                    onChange={(e) => setPartyForm({...partyForm, legalRepFirm: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-legalRepEmail">Email</Label>
                  <Input
                    id="edit-legalRepEmail"
                    type="email"
                    value={partyForm.legalRepEmail}
                    onChange={(e) => setPartyForm({...partyForm, legalRepEmail: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-legalRepPhone">Phone</Label>
                  <Input
                    id="edit-legalRepPhone"
                    value={partyForm.legalRepPhone}
                    onChange={(e) => setPartyForm({...partyForm, legalRepPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPartyDialog(false);
                setEditingParty(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editingParty && updatePartyMutation.mutate({ 
                partyId: editingParty.id, 
                partyData: partyForm 
              })}
              disabled={!partyForm.entityName || updatePartyMutation.isPending}
            >
              {updatePartyMutation.isPending ? "Updating..." : "Update Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddScheduleDialog} onOpenChange={setShowAddScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Schedule Event</DialogTitle>
            <DialogDescription>
              Schedule a new event for this case (Court Listing, Conference, Hearing, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Select 
                value={scheduleForm.eventType} 
                onValueChange={(value) => setScheduleForm({...scheduleForm, eventType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Court Listings">Court Listings</SelectItem>
                  <SelectItem value="Conciliation Conference">Conciliation Conference</SelectItem>
                  <SelectItem value="Mention">Mention</SelectItem>
                  <SelectItem value="Hearing">Hearing</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Zoom Meeting">Zoom Meeting</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Event Title (Optional)</Label>
              <Input
                id="eventTitle"
                value={scheduleForm.eventTitle}
                onChange={(e) => setScheduleForm({...scheduleForm, eventTitle: e.target.value})}
                placeholder="E.g., Initial hearing, Follow-up call..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date & Time *</Label>
              <Input
                id="eventDate"
                type="datetime-local"
                value={scheduleForm.eventDate}
                onChange={(e) => setScheduleForm({...scheduleForm, eventDate: e.target.value})}
                required
              />
              <p className="text-xs text-muted-foreground">
                Select both date and time. Click the calendar icon to choose date, then set the time.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({...scheduleForm, location: e.target.value})}
                placeholder="E.g., Court Room 5, Zoom, Phone..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Additional notes about this event..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Schedule form data:', scheduleForm);
                addScheduleMutation.mutate(scheduleForm);
              }}
              disabled={!scheduleForm.eventType || !scheduleForm.eventDate || addScheduleMutation.isPending}
              title={!scheduleForm.eventType ? "Please select event type" : !scheduleForm.eventDate ? "Please select date and time" : ""}
            >
              {addScheduleMutation.isPending ? "Adding..." : "Add Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditScheduleDialog} onOpenChange={(open) => {
        setShowEditScheduleDialog(open);
        if (!open) {
          setEditingEvent(null);
          setScheduleForm({
            eventType: '',
            eventTitle: '',
            eventDate: '',
            location: '',
            notes: '',
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Schedule Event</DialogTitle>
            <DialogDescription>
              Update the event details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-eventType">Event Type *</Label>
              <Select 
                value={scheduleForm.eventType} 
                onValueChange={(value) => setScheduleForm({...scheduleForm, eventType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Court Listings">Court Listings</SelectItem>
                  <SelectItem value="Conciliation Conference">Conciliation Conference</SelectItem>
                  <SelectItem value="Mention">Mention</SelectItem>
                  <SelectItem value="Hearing">Hearing</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Zoom Meeting">Zoom Meeting</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-eventTitle">Event Title (Optional)</Label>
              <Input
                id="edit-eventTitle"
                value={scheduleForm.eventTitle}
                onChange={(e) => setScheduleForm({...scheduleForm, eventTitle: e.target.value})}
                placeholder="E.g., Initial hearing, Follow-up call..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-eventDate">Date & Time *</Label>
              <Input
                id="edit-eventDate"
                type="datetime-local"
                value={scheduleForm.eventDate}
                onChange={(e) => setScheduleForm({...scheduleForm, eventDate: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location (Optional)</Label>
              <Input
                id="edit-location"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({...scheduleForm, location: e.target.value})}
                placeholder="E.g., Court Room 5, Zoom, Phone..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Additional notes about this event..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editingEvent && updateScheduleMutation.mutate({
                eventId: editingEvent.id,
                eventData: scheduleForm
              })}
              disabled={!scheduleForm.eventType || !scheduleForm.eventDate || updateScheduleMutation.isPending}
            >
              {updateScheduleMutation.isPending ? "Updating..." : "Update Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCaseDialog} onOpenChange={(open) => {
        setShowEditCaseDialog(open);
        if (open && case_) {
          // Pre-fill form with current values when opening
          setEditCaseForm({
            caseNumber: case_.caseNumber || '',
            mediationNumber: case_.mediationNumber || '',
            mediatorName: case_.mediatorName || '',
            mediationType: case_.mediationType || '',
            mediationDate: case_.mediationDate 
              ? new Date(case_.mediationDate).toISOString().slice(0, 16) 
              : '',
            premises: case_.premises || '',
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case Information</DialogTitle>
            <DialogDescription>
              Update case details including case numbers, parties, session date/time, and mediation type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-caseNumber">Case Number</Label>
                <Input
                  id="edit-caseNumber"
                  value={editCaseForm.caseNumber}
                  onChange={(e) => setEditCaseForm({...editCaseForm, caseNumber: e.target.value})}
                  placeholder="Enter case number"
                  data-testid="input-edit-case-number"
                />
              </div>
              <div>
                <Label htmlFor="edit-mediationNumber">Mediation Number</Label>
                <Input
                  id="edit-mediationNumber"
                  value={editCaseForm.mediationNumber}
                  onChange={(e) => setEditCaseForm({...editCaseForm, mediationNumber: e.target.value})}
                  placeholder="Enter mediation number"
                  data-testid="input-edit-mediation-number"
                />
              </div>
            </div>
            
            <div>
              <Label>Applicant(s)</Label>
              <div className="p-3 bg-muted/30 rounded-md border text-sm">
                {applicants.length > 0 ? (
                  <div className="space-y-1">
                    {applicants.map((p, idx) => (
                      <div key={idx}>{p.entityName}</div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No applicants added</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                To edit parties, go to the Parties tab
              </p>
            </div>

            <div>
              <Label>Respondent(s)</Label>
              <div className="p-3 bg-muted/30 rounded-md border text-sm">
                {respondents.length > 0 ? (
                  <div className="space-y-1">
                    {respondents.map((p, idx) => (
                      <div key={idx}>{p.entityName}</div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No respondents added</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                To edit parties, go to the Parties tab
              </p>
            </div>

            <div>
              <Label>All Parties</Label>
              <div className="p-3 bg-muted/30 rounded-md border text-sm max-h-32 overflow-y-auto">
                {case_?.parties && case_.parties.length > 0 ? (
                  <div className="space-y-2">
                    {case_.parties.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs">
                          {p.partyType}
                        </Badge>
                        <span>{p.entityName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No parties added yet</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                To add or edit parties, go to the Parties tab
              </p>
            </div>

            <div>
              <Label htmlFor="edit-mediatorName">Mediator Name</Label>
              <Input
                id="edit-mediatorName"
                value={editCaseForm.mediatorName}
                onChange={(e) => setEditCaseForm({...editCaseForm, mediatorName: e.target.value})}
                placeholder="Enter mediator name"
                data-testid="input-edit-mediator-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-mediationType">Mediation Type</Label>
              <Select
                value={editCaseForm.mediationType}
                onValueChange={(value) => setEditCaseForm({...editCaseForm, mediationType: value})}
              >
                <SelectTrigger id="edit-mediationType" data-testid="select-edit-mediation-type">
                  <SelectValue placeholder="Select mediation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-mediationDate">Session Date & Time</Label>
              <Input
                id="edit-mediationDate"
                type="datetime-local"
                value={editCaseForm.mediationDate}
                onChange={(e) => setEditCaseForm({...editCaseForm, mediationDate: e.target.value})}
                data-testid="input-edit-mediation-date"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select date and time in your local timezone
              </p>
            </div>
            <div>
              <Label htmlFor="edit-premises">Premises</Label>
              <Input
                id="edit-premises"
                value={editCaseForm.premises}
                onChange={(e) => setEditCaseForm({...editCaseForm, premises: e.target.value})}
                placeholder="Enter premises/location"
                data-testid="input-edit-premises"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCaseDialog(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleEditCase}
              disabled={updateCaseMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
