import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SmtpSettings, EmailTemplate, InsertSmtpSettings, InsertEmailTemplate, ZoomSettings, CalendarSettings, InsertZoomSettings, InsertCalendarSettings } from "@shared/schema";
import { Server, Mail, Plus, Trash2, Save, TestTube, Video, Calendar, Link2, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSmtpSettingsSchema, insertEmailTemplateSchema, insertZoomSettingsSchema, insertCalendarSettingsSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Fetch SMTP settings
  const { data: smtpSettings, isLoading: isLoadingSmtp } = useQuery<SmtpSettings>({
    queryKey: ['/api/smtp-settings'],
  });

  // Fetch email templates
  const { data: emailTemplates, isLoading: isLoadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email/templates'],
  });

  // Fetch Zoom settings
  const { data: zoomSettings, isLoading: isLoadingZoom } = useQuery<ZoomSettings>({
    queryKey: ['/api/zoom-settings'],
  });

  // Fetch Calendar settings
  const { data: calendarSettings, isLoading: isLoadingCalendar } = useQuery<CalendarSettings>({
    queryKey: ['/api/calendar-settings'],
  });

  // SMTP form
  const smtpForm = useForm<InsertSmtpSettings>({
    resolver: zodResolver(insertSmtpSettingsSchema),
    defaultValues: smtpSettings || {
      userId: (user as any)?.id || '',
      host: '',
      port: 587,
      secure: true,
      username: '',
      password: '',
      fromEmail: '',
      fromName: '',
    },
  });

  // Email template form
  const templateForm = useForm<InsertEmailTemplate>({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      userId: (user as any)?.id || '',
      name: '',
      subject: '',
      body: '',
      category: '',
    },
  });

  // Zoom settings form
  const zoomForm = useForm<InsertZoomSettings>({
    resolver: zodResolver(insertZoomSettingsSchema),
    defaultValues: zoomSettings || {
      userId: (user as any)?.id || '',
      accountId: '',
      clientId: '',
      clientSecret: '',
    },
  });

  // Calendar settings form
  const calendarForm = useForm<InsertCalendarSettings>({
    resolver: zodResolver(insertCalendarSettingsSchema),
    defaultValues: calendarSettings || {
      userId: (user as any)?.id || '',
      clientId: '',
      clientSecret: '',
    },
  });

  // Update SMTP settings mutation
  const smtpMutation = useMutation({
    mutationFn: async (data: InsertSmtpSettings) => {
      return apiRequest(smtpSettings ? 'PATCH' : 'POST', '/api/smtp-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-settings'] });
      toast({
        title: "SMTP Settings Saved",
        description: "Your email configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save SMTP settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test SMTP connection mutation
  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/smtp-settings/test', {});
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: "SMTP connection test passed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to SMTP server. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  // Test Gmail API connection mutation
  const testGmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/gmail/test', {});
    },
    onSuccess: () => {
      toast({
        title: "Gmail Test Successful",
        description: "Test email sent successfully via Gmail API! Check your inbox.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gmail Test Failed",
        description: error?.message || "Unable to send email via Gmail. Please connect to Google Calendar first.",
        variant: "destructive",
      });
    },
  });

  // Create/Update email template mutation
  const templateMutation = useMutation({
    mutationFn: async (data: InsertEmailTemplate) => {
      return apiRequest(
        selectedTemplate ? 'PUT' : 'POST',
        selectedTemplate ? `/api/email/templates/${selectedTemplate.id}` : '/api/email/templates',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
      toast({
        title: selectedTemplate ? "Template Updated" : "Template Created",
        description: `Email template has been ${selectedTemplate ? 'updated' : 'created'} successfully.`,
      });
      setSelectedTemplate(null);
      templateForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save email template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete email template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/email/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
      toast({
        title: "Template Deleted",
        description: "Email template has been deleted successfully.",
      });
      setDeleteTemplateId(null);
      if (selectedTemplate?.id === deleteTemplateId) {
        setSelectedTemplate(null);
        templateForm.reset();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update Zoom settings mutation
  const zoomMutation = useMutation({
    mutationFn: async (data: InsertZoomSettings) => {
      return apiRequest('POST', '/api/zoom-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zoom-settings'] });
      toast({
        title: "Zoom Settings Saved",
        description: "Your Zoom credentials have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Zoom settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update Calendar settings mutation
  const calendarMutation = useMutation({
    mutationFn: async (data: InsertCalendarSettings) => {
      return apiRequest('POST', '/api/calendar-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connection-status'] });
      toast({
        title: "Calendar Settings Saved",
        description: "Your Google Calendar credentials have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Calendar settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calendar connection status
  const { data: calendarConnectionStatus } = useQuery<{ 
    connected: boolean; 
    scopes?: string[]; 
    hasGmailScope?: boolean 
  }>({
    queryKey: ['/api/calendar/connection-status'],
  });

  // OAuth init mutation
  const calendarOAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/oauth/init', {
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate OAuth');
      }
      return response.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      // Redirect to Google OAuth page
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar",
        variant: "destructive",
      });
    },
  });

  const handleConnectCalendar = () => {
    calendarOAuthMutation.mutate();
  };

  const onSmtpSubmit = (data: InsertSmtpSettings) => {
    smtpMutation.mutate(data);
  };

  const onTemplateSubmit = (data: InsertEmailTemplate) => {
    templateMutation.mutate(data);
  };

  const onZoomSubmit = (data: InsertZoomSettings) => {
    zoomMutation.mutate(data);
  };

  const onCalendarSubmit = (data: InsertCalendarSettings) => {
    calendarMutation.mutate(data);
  };

  // Update form when SMTP settings are loaded
  useEffect(() => {
    if (smtpSettings && !smtpForm.formState.isDirty) {
      smtpForm.reset(smtpSettings);
    }
  }, [smtpSettings, smtpForm]);

  useEffect(() => {
    if (zoomSettings && !zoomForm.formState.isDirty) {
      zoomForm.reset(zoomSettings);
    }
  }, [zoomSettings, zoomForm]);

  useEffect(() => {
    if (calendarSettings && !calendarForm.formState.isDirty) {
      calendarForm.reset(calendarSettings);
    }
  }, [calendarSettings, calendarForm]);

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    templateForm.reset({
      userId: template.userId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || '',
    });
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    templateForm.reset({
      userId: (user as any)?.id || '',
      name: '',
      subject: '',
      body: '',
      category: '',
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="pb-6 border-b border-border mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage your application settings and preferences</p>
        </div>

        <Tabs defaultValue="smtp" className="space-y-8">
          <TabsList className="bg-surface rounded-lg p-1 inline-flex gap-1" data-testid="tabs-settings">
            <TabsTrigger value="smtp" className="data-[state=active]:bg-background" data-testid="tab-smtp">
              <Server className="w-4 h-4 mr-2" />
              SMTP Configuration
            </TabsTrigger>
            <TabsTrigger value="zoom" className="data-[state=active]:bg-background" data-testid="tab-zoom">
              <Video className="w-4 h-4 mr-2" />
              Zoom Credentials
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-background" data-testid="tab-calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Google Calendar
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-background" data-testid="tab-templates">
              <Mail className="w-4 h-4 mr-2" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="pt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  SMTP Server Configuration
                </CardTitle>
                <CardDescription>
                  Configure your email server settings to send notifications and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSmtp ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <Form {...smtpForm}>
                    <form onSubmit={smtpForm.handleSubmit(onSmtpSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FormField
                          control={smtpForm.control}
                          name="host"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SMTP Host</FormLabel>
                              <FormControl>
                                <Input placeholder="smtp.gmail.com" {...field} data-testid="input-smtp-host" />
                              </FormControl>
                              <FormDescription>Your email server hostname</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smtpForm.control}
                          name="port"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Port</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="587" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-smtp-port"
                                />
                              </FormControl>
                              <FormDescription>Common ports: 587 (TLS), 465 (SSL)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smtpForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="your-email@example.com" {...field} data-testid="input-smtp-username" />
                              </FormControl>
                              <FormDescription>SMTP authentication username</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smtpForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} data-testid="input-smtp-password" />
                              </FormControl>
                              <FormDescription>SMTP authentication password</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smtpForm.control}
                          name="fromEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From Email</FormLabel>
                              <FormControl>
                                <Input placeholder="noreply@example.com" {...field} data-testid="input-smtp-from-email" />
                              </FormControl>
                              <FormDescription>Email address for outgoing messages</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smtpForm.control}
                          name="fromName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Mediator Pro" {...field} data-testid="input-smtp-from-name" />
                              </FormControl>
                              <FormDescription>Display name for outgoing messages</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-4">
                          <Button 
                            type="submit" 
                            disabled={smtpMutation.isPending}
                            data-testid="button-save-smtp"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {smtpMutation.isPending ? 'Saving...' : 'Save Settings'}
                          </Button>
                          {smtpSettings && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => testSmtpMutation.mutate()}
                              disabled={testSmtpMutation.isPending}
                              data-testid="button-test-smtp"
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              {testSmtpMutation.isPending ? 'Testing...' : 'Test SMTP'}
                            </Button>
                          )}
                          {calendarConnectionStatus?.connected && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => testGmailMutation.mutate()}
                              disabled={testGmailMutation.isPending}
                              data-testid="button-test-gmail"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {testGmailMutation.isPending ? 'Sending...' : 'Test Gmail API'}
                            </Button>
                          )}
                        </div>
                        
                        {calendarConnectionStatus?.connected && !calendarConnectionStatus?.hasGmailScope && (
                          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                            <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                              Your Google connection is missing Gmail permissions. To use Gmail API, go to the Google Calendar tab, disconnect, and reconnect to grant Gmail access.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zoom" className="pt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Zoom Credentials
                </CardTitle>
                <CardDescription>
                  Configure your Zoom API credentials for video conferencing integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingZoom ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <Form {...zoomForm}>
                    <form onSubmit={zoomForm.handleSubmit(onZoomSubmit)} className="space-y-6">
                      <FormField
                        control={zoomForm.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Zoom Account ID" {...field} data-testid="input-zoom-account-id" />
                            </FormControl>
                            <FormDescription>Your Zoom API Account ID</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={zoomForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Zoom Client ID" {...field} data-testid="input-zoom-client-id" />
                            </FormControl>
                            <FormDescription>Your Zoom API Client ID</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={zoomForm.control}
                        name="clientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} data-testid="input-zoom-client-secret" />
                            </FormControl>
                            <FormDescription>Your Zoom API Client Secret</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center gap-4 pt-4 border-t">
                        <Button 
                          type="submit" 
                          disabled={zoomMutation.isPending}
                          data-testid="button-save-zoom"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {zoomMutation.isPending ? 'Saving...' : 'Save Credentials'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="pt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Google Calendar Credentials
                </CardTitle>
                <CardDescription>
                  Configure your Google Calendar API credentials for calendar integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCalendar ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-10 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <Form {...calendarForm}>
                    <form onSubmit={calendarForm.handleSubmit(onCalendarSubmit)} className="space-y-6">
                      <FormField
                        control={calendarForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Google Calendar Client ID" {...field} data-testid="input-calendar-client-id" />
                            </FormControl>
                            <FormDescription>Your Google Calendar API Client ID</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={calendarForm.control}
                        name="clientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} data-testid="input-calendar-client-secret" />
                            </FormControl>
                            <FormDescription>Your Google Calendar API Client Secret</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-4">
                          <Button 
                            type="submit" 
                            disabled={calendarMutation.isPending}
                            data-testid="button-save-calendar"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {calendarMutation.isPending ? 'Saving...' : 'Save Credentials'}
                          </Button>
                        </div>
                        
                        {calendarSettings?.clientId && calendarSettings?.clientSecret && (
                          <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                              {calendarConnectionStatus?.connected ? (
                                <>
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                  <span className="text-sm text-muted-foreground">Connected to Google Calendar</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 text-orange-500" />
                                  <span className="text-sm text-muted-foreground">Not connected</span>
                                </>
                              )}
                            </div>
                            {!calendarConnectionStatus?.connected && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleConnectCalendar}
                                disabled={calendarOAuthMutation.isPending}
                                data-testid="button-connect-calendar"
                              >
                                <Link2 className="w-4 h-4 mr-2" />
                                {calendarOAuthMutation.isPending ? 'Connecting...' : 'Connect to Google Calendar'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Templates</CardTitle>
                    <Button size="sm" onClick={handleNewTemplate} data-testid="button-new-template">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingTemplates ? (
                    <div className="space-y-2 p-4">
                      <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                      <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                    </div>
                  ) : emailTemplates && emailTemplates.length > 0 ? (
                    <div className="divide-y">
                      {emailTemplates.map((template) => (
                        <div
                          key={template.id}
                          className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                            selectedTemplate?.id === template.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`template-item-${template.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1 truncate">{template.subject}</p>
                              {template.category && (
                                <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {template.category}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTemplateId(template.id);
                              }}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">No templates yet</p>
                      <Button size="sm" className="mt-4" onClick={handleNewTemplate} data-testid="button-create-first-template">
                        Create your first template
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedTemplate ? 'Edit Template' : 'Create New Template'}
                  </CardTitle>
                  <CardDescription>
                    Available variables: {'{caseNumber}'}, {'{mediatorName}'}, {'{mediationType}'}, {'{mediationDate}'}, {'{mediationTime}'}, {'{recipientName}'}, {'{disputeType}'}, {'{disputeAmount}'}, {'{zoomLink}'}, {'{zoomPassword}'}, {'{applicant_1_name}'}, {'{applicant_1_contact}'}, {'{applicant_1_email}'}, {'{applicant_1_phone}'}, {'{applicant_1_lawyer}'}, {'{applicant_1_lawyer_firm}'}, {'{applicant_1_lawyer_email}'}, {'{applicant_1_lawyer_phone}'}, {'{respondent_1_name}'}, {'{respondent_1_contact}'}, {'{respondent_1_email}'}, {'{respondent_1_phone}'}, {'{respondent_1_lawyer}'}, {'{respondent_1_lawyer_firm}'}, {'{respondent_1_lawyer_email}'}, {'{respondent_1_lawyer_phone}'} (and _2, _3, etc. for multiple parties)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...templateForm}>
                    <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-6">
                      <FormField
                        control={templateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Mediation Confirmation" {...field} data-testid="input-template-name" />
                            </FormControl>
                            <FormDescription>Internal name for this template</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={templateForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-template-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mediation-confirmation">Mediation Confirmation</SelectItem>
                                <SelectItem value="follow-up">Follow-up</SelectItem>
                                <SelectItem value="settlement">Settlement</SelectItem>
                                <SelectItem value="document-request">Document Request</SelectItem>
                                <SelectItem value="reminder">Reminder</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Template category for organization</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={templateForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input placeholder="Your mediation is confirmed" {...field} data-testid="input-template-subject" />
                            </FormControl>
                            <FormDescription>Email subject line (supports variables)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={templateForm.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Dear {{party_name}},&#10;&#10;Your mediation session has been confirmed...&#10;&#10;Best regards,&#10;{{mediator_name}}"
                                className="min-h-64 font-mono text-sm"
                                {...field}
                                data-testid="textarea-template-body"
                              />
                            </FormControl>
                            <FormDescription>
                              Email body content. Use variables like {`{{party_name}}`}, {`{{case_number}}`}, {`{{mediation_date}}`}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-4 pt-4 border-t">
                        <Button
                          type="submit"
                          disabled={templateMutation.isPending}
                          data-testid="button-save-template"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {templateMutation.isPending ? 'Saving...' : selectedTemplate ? 'Update Template' : 'Create Template'}
                        </Button>
                        {selectedTemplate && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleNewTemplate}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent data-testid="dialog-delete-template">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
