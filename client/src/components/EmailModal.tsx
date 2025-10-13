import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Case, Party, EmailTemplate, Document } from "@shared/schema";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string | null;
}

type CaseWithDetails = Case & { parties: Party[], documents: Document[] };

interface EmailRecipient {
  email: string;
  name: string;
  role: string;
}

export default function EmailModal({ isOpen, onClose, caseId }: EmailModalProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const { data: caseData } = useQuery<CaseWithDetails>({
    queryKey: ["/api/cases", caseId],
    enabled: !!caseId,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email/templates"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      return apiRequest('POST', `/api/cases/${caseId}/email`, emailData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email sent successfully",
      });
      onClose();
      resetForm();
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
        description: "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedTemplate('');
    setSelectedRecipients([]);
    setSubject('');
    setMessage('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const getEmailRecipients = (): EmailRecipient[] => {
    if (!caseData || !caseData.parties) return [];
    
    const recipients: EmailRecipient[] = [];
    
    caseData.parties.forEach((party: Party) => {
      if (party.primaryContactEmail && party.primaryContactName) {
        recipients.push({
          email: party.primaryContactEmail,
          name: party.primaryContactName,
          role: `${party.entityName} (${party.partyType})`,
        });
      }
      
      if (party.legalRepEmail && party.legalRepName) {
        recipients.push({
          email: party.legalRepEmail,
          name: party.legalRepName,
          role: `${party.legalRepName} - ${party.legalRepFirm || 'Legal Representative'}`,
        });
      }
    });
    
    return recipients;
  };

  const replacePlaceholders = (text: string): string => {
    if (!text) return '';
    
    // Get available recipients for {recipientName} placeholder
    const availableRecipients = getEmailRecipients();
    const recipientName = availableRecipients.length === 1 
      ? availableRecipients[0].name 
      : availableRecipients.length > 1 
        ? 'All' 
        : '[Recipient Name]';
    
    // Get party-specific variables
    const applicants = caseData?.parties?.filter(p => p.partyType === 'applicant') || [];
    const respondents = caseData?.parties?.filter(p => p.partyType === 'respondent') || [];
    
    let result = text;
    
    // Replace basic case placeholders
    result = result
      .replace(/\{caseNumber\}/g, caseData?.caseNumber || '[Case Number]')
      .replace(/\{mediatorName\}/g, caseData?.mediatorName || '[Mediator Name]')
      .replace(/\{mediationDate\}/g, caseData?.mediationDate ? new Date(caseData.mediationDate).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Mediation Date]')
      .replace(/\{mediationTime\}/g, caseData?.mediationDate ? new Date(caseData.mediationDate).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '[Mediation Time]')
      .replace(/\{mediationType\}/g, caseData?.mediationType || '[Mediation Type]')
      .replace(/\{recipientName\}/g, recipientName)
      .replace(/\{disputeType\}/g, caseData?.disputeType || '[Dispute Type]')
      .replace(/\{disputeAmount\}/g, caseData?.disputeAmount ? `$${caseData.disputeAmount.toLocaleString()}` : '[Dispute Amount]')
      .replace(/\{zoomLink\}/g, caseData?.zoomMeetingLink || '[Zoom Link]')
      .replace(/\{zoomPassword\}/g, caseData?.zoomMeetingPassword || '[Zoom Password]');
    
    // Replace applicant placeholders (indexed from 1)
    applicants.forEach((applicant, index) => {
      const num = index + 1;
      result = result
        .replace(new RegExp(`\\{applicant_${num}_name\\}`, 'g'), applicant.entityName || `[Applicant ${num} Name]`)
        .replace(new RegExp(`\\{applicant_${num}_contact\\}`, 'g'), applicant.primaryContactName || `[Applicant ${num} Contact]`)
        .replace(new RegExp(`\\{applicant_${num}_email\\}`, 'g'), applicant.primaryContactEmail || `[Applicant ${num} Email]`)
        .replace(new RegExp(`\\{applicant_${num}_phone\\}`, 'g'), applicant.primaryContactPhone || `[Applicant ${num} Phone]`)
        .replace(new RegExp(`\\{applicant_${num}_lawyer\\}`, 'g'), applicant.legalRepName || `[Applicant ${num} Lawyer]`)
        .replace(new RegExp(`\\{applicant_${num}_lawyer_firm\\}`, 'g'), applicant.legalRepFirm || `[Applicant ${num} Law Firm]`)
        .replace(new RegExp(`\\{applicant_${num}_lawyer_email\\}`, 'g'), applicant.legalRepEmail || `[Applicant ${num} Lawyer Email]`)
        .replace(new RegExp(`\\{applicant_${num}_lawyer_phone\\}`, 'g'), applicant.legalRepPhone || `[Applicant ${num} Lawyer Phone]`);
    });
    
    // Replace respondent placeholders (indexed from 1)
    respondents.forEach((respondent, index) => {
      const num = index + 1;
      result = result
        .replace(new RegExp(`\\{respondent_${num}_name\\}`, 'g'), respondent.entityName || `[Respondent ${num} Name]`)
        .replace(new RegExp(`\\{respondent_${num}_contact\\}`, 'g'), respondent.primaryContactName || `[Respondent ${num} Contact]`)
        .replace(new RegExp(`\\{respondent_${num}_email\\}`, 'g'), respondent.primaryContactEmail || `[Respondent ${num} Email]`)
        .replace(new RegExp(`\\{respondent_${num}_phone\\}`, 'g'), respondent.primaryContactPhone || `[Respondent ${num} Phone]`)
        .replace(new RegExp(`\\{respondent_${num}_lawyer\\}`, 'g'), respondent.legalRepName || `[Respondent ${num} Lawyer]`)
        .replace(new RegExp(`\\{respondent_${num}_lawyer_firm\\}`, 'g'), respondent.legalRepFirm || `[Respondent ${num} Law Firm]`)
        .replace(new RegExp(`\\{respondent_${num}_lawyer_email\\}`, 'g'), respondent.legalRepEmail || `[Respondent ${num} Lawyer Email]`)
        .replace(new RegExp(`\\{respondent_${num}_lawyer_phone\\}`, 'g'), respondent.legalRepPhone || `[Respondent ${num} Lawyer Phone]`);
    });
    
    return result;
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId === 'custom') {
      setSubject('');
      setMessage('');
      return;
    }

    // Find the selected template from database templates
    const selectedDbTemplate = templates.find(t => t.id === templateId);
    if (selectedDbTemplate) {
      // Replace all placeholders in subject and body
      const subject = replacePlaceholders(selectedDbTemplate.subject);
      const body = replacePlaceholders(selectedDbTemplate.body);

      setSubject(subject);
      setMessage(body);
    }
  };

  const handleRecipientToggle = (email: string) => {
    setSelectedRecipients(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSendEmail = () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email message",
        variant: "destructive",
      });
      return;
    }

    const recipients = getEmailRecipients().filter(r => selectedRecipients.includes(r.email));
    const emailData = {
      template: selectedTemplate || 'custom',
      recipients: recipients,
      subject: subject,
      message: message,
      templateData: {
        recipientName: '[Recipient Name]',
        caseNumber: caseData?.caseNumber,
        mediatorName: caseData?.mediatorName,
        mediationDate: caseData?.mediationDate ? new Date(caseData.mediationDate).toLocaleDateString('en-AU') : 'TBD',
        mediationTime: caseData?.mediationDate ? new Date(caseData.mediationDate).toLocaleTimeString('en-AU') : 'TBD',
        mediationType: caseData?.mediationType,
      },
    };

    sendEmailMutation.mutate(emailData);
  };

  const availableRecipients = getEmailRecipients();
  
  // Build template options from database templates + custom option
  const templateOptions = [
    ...templates.map(template => ({
      value: template.id,
      label: template.name,
    })),
    { value: 'custom', label: 'Custom Email' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i className="fas fa-envelope text-primary"></i>
            <span>Send Email Communication</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Template Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Template
            </label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger data-testid="select-email-template">
                <SelectValue placeholder="Select Template" />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Recipients
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-md p-2">
              {availableRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No recipient information available for this case
                </p>
              ) : (
                availableRecipients.map((recipient) => (
                  <label
                    key={recipient.email}
                    className="flex items-center p-3 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
                    data-testid={`label-recipient-${recipient.email}`}
                  >
                    <Checkbox
                      checked={selectedRecipients.includes(recipient.email)}
                      onCheckedChange={() => handleRecipientToggle(recipient.email)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {recipient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {recipient.email} - {recipient.role}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              data-testid="input-email-subject"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compose your email..."
              className="min-h-[200px] resize-none"
              data-testid="textarea-email-message"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
