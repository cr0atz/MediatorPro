import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CaseDetail from "./CaseDetail";
import EmailModal from "./EmailModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Case } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["/api/cases"],
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
        description: "Failed to fetch cases",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/cases/create-from-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Case created successfully from uploaded document",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
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
        description: "Failed to create case from document",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'scheduled':
        return 'status-scheduled';
      case 'closed':
        return 'status-closed';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedCaseId) {
    return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  return (
    <>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your mediation cases and access AI-powered tools
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                data-testid="button-filter"
              >
                <i className="fas fa-filter"></i>
                <span>Filter</span>
              </Button>
              <Button
                onClick={triggerFileUpload}
                disabled={uploadMutation.isPending}
                className="flex items-center space-x-2"
                data-testid="button-upload-case"
              >
                <i className="fas fa-upload"></i>
                <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload Case'}</span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx"
                className="hidden"
                data-testid="input-file-upload"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-stats-active-cases">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-active-cases">
                    {cases.filter((c: Case) => c.status === 'active').length}
                  </p>
                  <p className="text-xs text-accent-foreground mt-2 flex items-center">
                    <i className="fas fa-arrow-up text-green-500 mr-1"></i>
                    <span>Current active</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-folder-open text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-scheduled-sessions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Scheduled Sessions</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-scheduled-sessions">
                    {cases.filter((c: Case) => c.status === 'scheduled').length}
                  </p>
                  <p className="text-xs text-accent-foreground mt-2 flex items-center">
                    <i className="fas fa-calendar text-blue-500 mr-1"></i>
                    <span>Upcoming</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar-check text-blue-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-documents">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-cases">
                    {cases.length}
                  </p>
                  <p className="text-xs text-accent-foreground mt-2 flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-1"></i>
                    <span>All managed</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-green-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-success-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Closed Cases</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-closed-cases">
                    {cases.filter((c: Case) => c.status === 'closed').length}
                  </p>
                  <p className="text-xs text-accent-foreground mt-2 flex items-center">
                    <i className="fas fa-arrow-up text-green-500 mr-1"></i>
                    <span>Resolved</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-green-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Upload Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Upload Document Zone */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Upload New Case Document</h3>
            <div
              className="upload-zone rounded-lg p-12 text-center cursor-pointer"
              onClick={triggerFileUpload}
              data-testid="zone-file-upload"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-cloud-upload-alt text-primary text-2xl"></i>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Drop files here or click to upload</h4>
                <p className="text-sm text-muted-foreground mb-4">PDF, DOC, DOCX up to 50MB</p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <i className="fas fa-info-circle"></i>
                  <span>AI will automatically extract case details and parties</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <i className="fas fa-magic text-primary"></i>
                <span>Powered by GPT-4 Vision OCR</span>
              </div>
              <Button
                onClick={triggerFileUpload}
                disabled={uploadMutation.isPending}
                data-testid="button-select-file"
              >
                {uploadMutation.isPending ? 'Processing...' : 'Select File'}
              </Button>
            </div>
          </div>

          {/* AI Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">AI Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start space-x-3 h-auto p-3"
                  data-testid="button-generate-summary"
                >
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-brain text-purple-500"></i>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Generate Case Summary</p>
                    <p className="text-xs text-muted-foreground">AI-powered neutral overview</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start space-x-3 h-auto p-3"
                  data-testid="button-ask-ai"
                >
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-comments text-blue-500"></i>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Ask AI Questions</p>
                    <p className="text-xs text-muted-foreground">Query case documents</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start space-x-3 h-auto p-3"
                  data-testid="button-irac-analysis"
                >
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-file-invoice text-green-500"></i>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">IRAC Analysis</p>
                    <p className="text-xs text-muted-foreground">Legal issue framework</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        <Card>
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Cases</h3>
              <Button variant="link" className="text-primary hover:underline">
                View All
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto" data-testid="table-cases">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center p-8" data-testid="text-no-cases">
                <i className="fas fa-folder-open text-muted-foreground text-4xl mb-4"></i>
                <p className="text-foreground font-medium">No cases yet</p>
                <p className="text-muted-foreground text-sm">Upload your first case document to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Case Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Background
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Next Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cases.slice(0, 10).map((caseItem: Case) => (
                    <tr
                      key={caseItem.id}
                      className="hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCaseId(caseItem.id)}
                      data-testid={`row-case-${caseItem.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                            <i className="fas fa-briefcase text-primary"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground" data-testid={`text-case-number-${caseItem.id}`}>
                              {caseItem.caseNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {caseItem.mediationNumber || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground truncate max-w-xs" title={caseItem.disputeBackground || ''}>
                          {caseItem.disputeBackground || 'No background provided'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="flex items-center space-x-1 w-fit">
                          <i className={`fas ${caseItem.mediationType === 'Remote' ? 'fa-video' : 'fa-building'} text-xs`}></i>
                          <span>{caseItem.mediationType || 'Not specified'}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-badge ${getStatusBadgeClass(caseItem.status)}`}>
                          {caseItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">
                          {formatDate(caseItem.mediationDate?.toString() || null)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCaseId(caseItem.id);
                            }}
                            data-testid={`button-view-case-${caseItem.id}`}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmailModal(true);
                            }}
                            data-testid={`button-email-case-${caseItem.id}`}
                          >
                            <i className="fas fa-envelope"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {showEmailModal && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          caseId={selectedCaseId}
        />
      )}
    </>
  );
}
