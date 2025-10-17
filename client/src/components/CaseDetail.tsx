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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AIChat from "./AIChat";
import DocumentManager from "./DocumentManager";
import CaseNotes from "./CaseNotes";
import EmailModal from "./EmailModal";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, Party, Document } from "@shared/schema";
import { 
  AlertTriangle, ArrowLeft, Mail, Video, Trash2, Info, Users, Folder, 
  StickyNote, Bot, Circle, Download, FileText, Plus, Phone, Edit2, CalendarDays
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
  const [partyForm, setPartyForm] = useState({
    entityName: '',
    partyType: 'applicant',
    primaryContactName: '',
    primaryContactRole: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    legalRepName: '',
    legalRepFirm: '',
    legalRepEmail: '',
    legalRepPhone: '',
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
    if (editCaseForm.mediatorName) updates.mediatorName = editCaseForm.mediatorName;
    if (editCaseForm.mediationType) updates.mediationType = editCaseForm.mediationType;
    if (editCaseForm.mediationDate) {
      // Convert datetime-local input to ISO string
      updates.mediationDate = new Date(editCaseForm.mediationDate).toISOString();
    }
    if (editCaseForm.premises) updates.premises = editCaseForm.premises;
    
    updateCaseMutation.mutate(updates);
  };

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ["/api/cases", caseId],
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
            <p className="text-primary-foreground/90" data-testid="text-case-title">
              {case_.disputeBackground || 'Mediation Case'}
            </p>
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
            {case_.zoomMeetingLink && (
              <Button
                variant="default"
                onClick={handleJoinZoomMeeting}
                className="bg-white text-primary hover:bg-white/90"
                data-testid="button-join-session"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Session
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
                  </div>
                </CardContent>
              </Card>

              {case_.disputeBackground && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Dispute Background</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-dispute-background">
                      {case_.disputeBackground}
                    </p>
                  </CardContent>
                </Card>
              )}

              {case_.issuesForDiscussion && case_.issuesForDiscussion.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Issues for Discussion</h3>
                    <ul className="space-y-2" data-testid="list-issues">
                      {case_.issuesForDiscussion.map((issue, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <Circle className="text-primary w-2 h-2 mt-1" />
                          <span className="text-sm text-foreground">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
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
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Entity Name</p>
                          <p className="text-sm font-semibold text-foreground" data-testid={`text-applicant-name-${applicant.id}`}>
                            {applicant.entityName}
                          </p>
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
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Entity Name</p>
                          <p className="text-sm font-semibold text-foreground" data-testid={`text-respondent-name-${respondent.id}`}>
                            {respondent.entityName}
                          </p>
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
                    <SelectItem value="applicant">Applicant</SelectItem>
                    <SelectItem value="respondent">Respondent</SelectItem>
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

      <Dialog open={showEditCaseDialog} onOpenChange={(open) => {
        setShowEditCaseDialog(open);
        if (open && case_) {
          // Pre-fill form with current values when opening
          setEditCaseForm({
            mediatorName: case_.mediatorName || '',
            mediationType: case_.mediationType || '',
            mediationDate: case_.mediationDate 
              ? new Date(case_.mediationDate).toISOString().slice(0, 16) 
              : '',
            premises: case_.premises || '',
          });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Case Information</DialogTitle>
            <DialogDescription>
              Update case details including session date/time, mediator, and mediation type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
