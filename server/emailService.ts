import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

export class EmailService {
  private templates: Record<string, (data: any) => EmailTemplate> = {
    'mediation-confirmation': (data: any) => ({
      subject: `Mediation Session Confirmation - Case ${data.caseNumber}`,
      html: `
        <h2>Mediation Session Confirmation</h2>
        <p>Dear ${data.recipientName},</p>
        <p>This email confirms your mediation session for Case ${data.caseNumber}:</p>
        <ul>
          <li><strong>Date:</strong> ${data.mediationDate}</li>
          <li><strong>Time:</strong> ${data.mediationTime}</li>
          <li><strong>Type:</strong> ${data.mediationType}</li>
          ${data.zoomLink ? `<li><strong>Zoom Link:</strong> <a href="${data.zoomLink}">${data.zoomLink}</a></li>` : ''}
          ${data.location ? `<li><strong>Location:</strong> ${data.location}</li>` : ''}
        </ul>
        <p>Please ensure you have reviewed all case documents prior to the session.</p>
        <p>Best regards,<br/>${data.mediatorName}<br/>Senior Mediator</p>
      `,
      text: `Mediation Session Confirmation\n\nDear ${data.recipientName},\n\nThis email confirms your mediation session for Case ${data.caseNumber}:\n\nDate: ${data.mediationDate}\nTime: ${data.mediationTime}\nType: ${data.mediationType}\n${data.zoomLink ? `Zoom Link: ${data.zoomLink}\n` : ''}${data.location ? `Location: ${data.location}\n` : ''}\n\nPlease ensure you have reviewed all case documents prior to the session.\n\nBest regards,\n${data.mediatorName}\nSenior Mediator`
    }),
    
    'document-request': (data: any) => ({
      subject: `Document Request - Case ${data.caseNumber}`,
      html: `
        <h2>Document Request</h2>
        <p>Dear ${data.recipientName},</p>
        <p>We require the following documents for Case ${data.caseNumber}:</p>
        <ul>
          ${data.requestedDocuments.map((doc: string) => `<li>${doc}</li>`).join('')}
        </ul>
        <p>Please submit these documents by ${data.deadline}.</p>
        <p>Best regards,<br/>${data.mediatorName}<br/>Senior Mediator</p>
      `,
      text: `Document Request\n\nDear ${data.recipientName},\n\nWe require the following documents for Case ${data.caseNumber}:\n\n${data.requestedDocuments.map((doc: string) => `- ${doc}`).join('\n')}\n\nPlease submit these documents by ${data.deadline}.\n\nBest regards,\n${data.mediatorName}\nSenior Mediator`
    }),

    'session-reminder': (data: any) => ({
      subject: `Mediation Session Reminder - Case ${data.caseNumber}`,
      html: `
        <h2>Mediation Session Reminder</h2>
        <p>Dear ${data.recipientName},</p>
        <p>This is a reminder of your upcoming mediation session for Case ${data.caseNumber}:</p>
        <ul>
          <li><strong>Date:</strong> ${data.mediationDate}</li>
          <li><strong>Time:</strong> ${data.mediationTime}</li>
          <li><strong>Type:</strong> ${data.mediationType}</li>
          ${data.zoomLink ? `<li><strong>Zoom Link:</strong> <a href="${data.zoomLink}">${data.zoomLink}</a></li>` : ''}
        </ul>
        <p>Please be punctual and have all relevant documents ready.</p>
        <p>Best regards,<br/>${data.mediatorName}<br/>Senior Mediator</p>
      `,
      text: `Mediation Session Reminder\n\nDear ${data.recipientName},\n\nThis is a reminder of your upcoming mediation session for Case ${data.caseNumber}:\n\nDate: ${data.mediationDate}\nTime: ${data.mediationTime}\nType: ${data.mediationType}\n${data.zoomLink ? `Zoom Link: ${data.zoomLink}\n` : ''}\n\nPlease be punctual and have all relevant documents ready.\n\nBest regards,\n${data.mediatorName}\nSenior Mediator`
    }),

    'custom': (data: any) => ({
      subject: data.subject,
      html: data.message.replace(/\n/g, '<br/>'),
      text: data.message
    })
  };

  async sendEmail(
    template: string,
    recipients: EmailRecipient[],
    data: any,
    fromEmail: string = 'noreply@mediatorpro.com',
    fromName: string = 'Mediator Pro'
  ): Promise<void> {
    try {
      const templateFn = this.templates[template];
      if (!templateFn) {
        throw new Error(`Unknown email template: ${template}`);
      }

      const emailContent = templateFn(data);

      const msg = {
        to: recipients,
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      };

      await sgMail.sendMultiple(msg);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendCustomEmail(
    recipients: EmailRecipient[],
    subject: string,
    message: string,
    fromEmail: string = 'noreply@mediatorpro.com',
    fromName: string = 'Mediator Pro'
  ): Promise<void> {
    await this.sendEmail('custom', recipients, { subject, message }, fromEmail, fromName);
  }

  getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }
}

export const emailService = new EmailService();
