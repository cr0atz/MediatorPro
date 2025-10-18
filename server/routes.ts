import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { LocalFileStorageService, ObjectNotFoundError } from "./localFileStorage";
import { aiService } from "./aiService";
import { emailService } from "./emailService";
import { insertCaseSchema, insertPartySchema, insertDocumentSchema, insertCaseNoteSchema, insertAiAnalysisSchema, insertEmailTemplateSchema, insertSmtpSettingsSchema, insertZoomSettingsSchema, insertCalendarSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Configure multer for file uploads in memory
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow PDF, DOC, DOCX, Excel, and image files
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
      ];
      cb(null, allowedMimes.includes(file.mimetype));
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with new data (only allow updating mediatorEmail for now)
      const updatedUser = await storage.upsertUser({
        ...currentUser,
        mediatorEmail: req.body.mediatorEmail,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Local file storage routes for documents
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const fileStorage = new LocalFileStorageService();
    try {
      const canAccess = await fileStorage.canAccessFile(req.path, userId, "read");
      if (!canAccess) {
        return res.sendStatus(401);
      }
      await fileStorage.downloadFile(req.path, res);
    } catch (error) {
      console.error("Error accessing file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Direct file upload endpoint for local storage
  app.post("/api/documents/upload-local", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileStorage = new LocalFileStorageService();
      const objectPath = await fileStorage.saveFile(
        file.buffer,
        {
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        userId
      );

      res.json({ objectPath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Legacy upload endpoint (for compatibility)
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    // Return local upload endpoint instead of presigned URL
    res.json({ uploadURL: "/api/documents/upload-local" });
  });

  // Case management routes
  app.get('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cases = await storage.getCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', isAuthenticated, async (req, res) => {
    try {
      const caseData = await storage.getCaseWithDetails(req.params.id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { caseNumber, mediationDate, disputeBackground, issuesForDiscussion } = req.body;

      if (!caseNumber) {
        return res.status(400).json({ message: "Case number is required" });
      }

      const caseData = {
        caseNumber,
        mediationDate: mediationDate ? new Date(mediationDate) : null,
        disputeBackground: disputeBackground || '',
        issuesForDiscussion: issuesForDiscussion || [],
        mediatorId: userId,
        status: 'open',
      };

      const validatedCaseData = insertCaseSchema.parse(caseData);
      const newCase = await storage.createCase(validatedCaseData);

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.patch('/api/cases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const updates = req.body;

      // Get the case to verify ownership
      const caseData = await storage.getCase(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (caseData.mediatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this case" });
      }

      // Convert mediationDate to Date object if provided
      if (updates.mediationDate) {
        updates.mediationDate = new Date(updates.mediationDate);
      }

      const updatedCase = await storage.updateCase(id, updates);
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.post('/api/cases/create-from-upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Save file to local storage
      const fileStorage = new LocalFileStorageService();
      const objectPath = await fileStorage.saveFile(
        file.buffer,
        {
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        userId
      );

      // Extract case data using AI (with fallback for errors)
      let extractedData: any = {};
      let extractedText = '';
      
      try {
        extractedData = await aiService.extractCaseDataFromDocument(file.buffer, file.mimetype);
      } catch (error) {
        console.error("AI extraction failed, using defaults:", error);
        extractedData = {};
      }
      
      // Extract text content for future RAG queries
      try {
        extractedText = await aiService.extractTextFromDocument(file.buffer, file.mimetype);
      } catch (error) {
        console.error("Text extraction failed:", error);
        extractedText = '';
      }

      // Create case record
      const caseData = {
        caseNumber: extractedData.caseNumber || `MED-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        mediationNumber: extractedData.mediationNumber,
        mediatorId: userId,
        mediatorName: extractedData.mediatorName || 'Auto-assigned',
        mediationType: extractedData.mediationType || 'Remote',
        mediationDate: extractedData.mediationDate ? new Date(extractedData.mediationDate) : null,
        premises: extractedData.premises,
        disputeBackground: extractedData.disputeBackground,
        issuesForDiscussion: extractedData.issuesForDiscussion || [],
        status: 'active' as const
      };

      const validatedCaseData = insertCaseSchema.parse(caseData);
      const newCase = await storage.createCase(validatedCaseData);

      // Create parties if extracted
      if (extractedData.parties) {
        for (const party of extractedData.parties) {
          const partyData = {
            caseId: newCase.id,
            entityName: party.entityName,
            partyType: party.partyType,
            primaryContactName: party.primaryContactName,
            primaryContactRole: party.primaryContactRole,
            primaryContactEmail: party.primaryContactEmail,
            primaryContactPhone: party.primaryContactPhone,
            legalRepName: party.legalRepName,
            legalRepFirm: party.legalRepFirm,
            legalRepEmail: party.legalRepEmail,
            legalRepPhone: party.legalRepPhone,
          };
          const validatedPartyData = insertPartySchema.parse(partyData);
          await storage.createParty(validatedPartyData);
        }
      }

      // Create document record
      const documentData = {
        caseId: newCase.id,
        fileName: file.filename || `document_${Date.now()}`,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: 'Legal Document',
        objectPath: objectPath,
        extractedText: extractedText,
        isProcessed: true,
        uploadedBy: userId,
      };

      const validatedDocumentData = insertDocumentSchema.parse(documentData);
      await storage.createDocument(validatedDocumentData);

      res.json({ 
        case: newCase, 
        message: "Case created successfully from uploaded document" 
      });

    } catch (error) {
      console.error("Error creating case from upload:", error);
      res.status(500).json({ message: "Failed to create case from document" });
    }
  });

  app.delete('/api/cases/:id', isAuthenticated, async (req, res) => {
    try {
      const caseId = req.params.id;
      const caseData = await storage.getCase(caseId);
      
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      await storage.deleteCase(caseId);
      res.json({ message: "Case deleted successfully" });
    } catch (error) {
      console.error("Error deleting case:", error);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  app.post('/api/cases/:id/parties', isAuthenticated, async (req: any, res) => {
    try {
      const caseId = req.params.id;
      const partyData = {
        caseId,
        ...req.body,
      };

      const validatedPartyData = insertPartySchema.parse(partyData);
      const party = await storage.createParty(validatedPartyData);

      res.json(party);
    } catch (error) {
      console.error("Error creating party:", error);
      res.status(500).json({ message: "Failed to create party" });
    }
  });

  // Document routes
  app.get('/api/cases/:id/documents', isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByCase(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/cases/:id/documents', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const { category } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Save file to local storage
      const fileStorage = new LocalFileStorageService();
      const objectPath = await fileStorage.saveFile(
        file.buffer,
        {
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        userId
      );

      // Extract text content for RAG
      const extractedText = await aiService.extractTextFromDocument(file.buffer, file.mimetype);

      // Create document record
      const documentData = {
        caseId: req.params.id,
        fileName: file.filename || `document_${Date.now()}`,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category || 'General',
        objectPath: objectPath,
        extractedText: extractedText,
        isProcessed: true,
        uploadedBy: userId,
      };

      const validatedDocumentData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedDocumentData);

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.post('/api/cases/:id/documents/process-upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { uploadURL, fileName, fileSize, mimeType, category } = req.body;

      if (!uploadURL) {
        return res.status(400).json({ message: "Upload URL is required" });
      }

      // For local storage, uploadURL is actually the objectPath
      const objectPath = uploadURL;

      // Extract text from the uploaded document
      let extractedText = '';
      let isProcessed = false;
      
      try {
        const fileStorage = new LocalFileStorageService();
        
        // Read file from local storage
        const filePath = objectPath.replace("/objects/", "");
        const fileBuffer = await fileStorage.readFile(filePath);
        
        // Extract text from the buffer
        extractedText = await aiService.extractTextFromDocument(fileBuffer, mimeType || 'application/octet-stream');
        isProcessed = true;
      } catch (extractError) {
        console.error("Error extracting text from uploaded document:", extractError);
        // Continue without text extraction - document will be saved but not processed
      }

      // Create document record
      const documentData = {
        caseId: req.params.id,
        fileName: fileName || `document_${Date.now()}`,
        originalName: fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        category: category || 'General',
        objectPath: objectPath,
        extractedText: extractedText,
        isProcessed: isProcessed,
        uploadedBy: userId,
      };

      const validatedDocumentData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedDocumentData);

      res.json(document);
    } catch (error) {
      console.error("Error processing uploaded document:", error);
      res.status(500).json({ message: "Failed to process uploaded document" });
    }
  });

  app.post('/api/documents/:documentId/reparse', isAuthenticated, async (req: any, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      let extractedText = '';
      let isProcessed = false;
      
      try {
        const fileStorage = new LocalFileStorageService();
        const fileBuffer = await fileStorage.readFile(document.objectPath);
        extractedText = await aiService.extractTextFromDocument(fileBuffer, document.mimeType);
        isProcessed = true;
      } catch (extractError) {
        console.error("Error re-parsing document:", extractError);
        return res.status(500).json({ message: "Failed to extract text from document" });
      }

      const updatedDocument = await storage.updateDocument(documentId, {
        extractedText,
        isProcessed,
      });

      res.json(updatedDocument);
    } catch (error) {
      console.error("Error re-parsing document:", error);
      res.status(500).json({ message: "Failed to re-parse document" });
    }
  });

  // Case notes routes
  app.get('/api/cases/:id/notes', isAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getCaseNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching case notes:", error);
      res.status(500).json({ message: "Failed to fetch case notes" });
    }
  });

  app.post('/api/cases/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const noteData = {
        caseId: req.params.id,
        content,
        authorId: userId,
      };

      const validatedNoteData = insertCaseNoteSchema.parse(noteData);
      const note = await storage.createCaseNote(validatedNoteData);

      res.json(note);
    } catch (error) {
      console.error("Error creating case note:", error);
      res.status(500).json({ message: "Failed to create case note" });
    }
  });

  // AI analysis routes
  app.post('/api/cases/:id/ai/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await aiService.generateCaseSummary(req.params.id);

      const analysisData = {
        caseId: req.params.id,
        analysisType: 'summary',
        output: summary,
        createdBy: userId,
      };

      const validatedAnalysisData = insertAiAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAiAnalysis(validatedAnalysisData);

      res.json({ summary, analysis });
    } catch (error) {
      console.error("Error generating case summary:", error);
      res.status(500).json({ message: "Failed to generate case summary" });
    }
  });

  app.post('/api/cases/:id/ai/question', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }

      const answer = await aiService.answerCaseQuestion(req.params.id, question);

      const analysisData = {
        caseId: req.params.id,
        analysisType: 'qa',
        input: question,
        output: answer,
        createdBy: userId,
      };

      const validatedAnalysisData = insertAiAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAiAnalysis(validatedAnalysisData);

      res.json({ question, answer, analysis });
    } catch (error: any) {
      console.error("Error answering case question:", error);
      res.status(500).json({ message: error?.message || "Failed to answer case question" });
    }
  });

  app.post('/api/cases/:id/ai/irac', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { legalIssue } = req.body;

      if (!legalIssue) {
        return res.status(400).json({ message: "Legal issue is required" });
      }

      const iracAnalysis = await aiService.generateIRACAnalysis(req.params.id, legalIssue);

      const analysisData = {
        caseId: req.params.id,
        analysisType: 'irac',
        input: legalIssue,
        output: iracAnalysis,
        metadata: { legalIssue },
        createdBy: userId,
      };

      const validatedAnalysisData = insertAiAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAiAnalysis(validatedAnalysisData);

      res.json({ legalIssue, iracAnalysis, analysis });
    } catch (error) {
      console.error("Error generating IRAC analysis:", error);
      res.status(500).json({ message: "Failed to generate IRAC analysis" });
    }
  });

  // Email communication routes
  app.post('/api/cases/:id/email', isAuthenticated, async (req: any, res) => {
    try {
      const { template, recipients, subject, message, templateData } = req.body;

      if (!recipients || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients are required" });
      }

      if (template === 'custom') {
        if (!subject || !message) {
          return res.status(400).json({ message: "Subject and message are required for custom emails" });
        }
        await emailService.sendCustomEmail(recipients, subject, message);
      } else {
        if (!templateData) {
          return res.status(400).json({ message: "Template data is required" });
        }
        await emailService.sendEmail(template, recipients, templateData);
      }

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Email template management routes
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = {
        ...req.body,
        userId,
      };
      const validatedData = insertEmailTemplateSchema.parse(templateData);
      const template = await storage.createEmailTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.put('/api/email/templates/:id', isAuthenticated, async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete('/api/email/templates/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // SMTP Settings routes
  app.get('/api/smtp-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getSmtpSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
      res.status(500).json({ message: "Failed to fetch SMTP settings" });
    }
  });

  app.post('/api/smtp-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if settings already exist
      const existingSettings = await storage.getSmtpSettings(userId);
      
      if (existingSettings) {
        // Update existing settings
        const settings = await storage.updateSmtpSettings(userId, req.body);
        res.json(settings);
      } else {
        // Create new settings
        const settingsData = {
          ...req.body,
          userId,
        };
        const validatedData = insertSmtpSettingsSchema.parse(settingsData);
        const settings = await storage.createSmtpSettings(validatedData);
        res.json(settings);
      }
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
      res.status(500).json({ message: "Failed to save SMTP settings" });
    }
  });

  app.patch('/api/smtp-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.updateSmtpSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating SMTP settings:", error);
      res.status(500).json({ message: "Failed to update SMTP settings" });
    }
  });

  app.post('/api/smtp-settings/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getSmtpSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: "SMTP settings not found" });
      }

      // Import nodemailer dynamically
      const nodemailer = await import('nodemailer');
      
      // Create transporter with user's SMTP settings
      const transporter = nodemailer.default.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465, // true for 465, false for other ports
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });

      // Send test email
      const info = await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: settings.fromEmail, // Send test email to the sender
        subject: "SMTP Test Email - Mediator Pro",
        text: "This is a test email from Mediator Pro. If you received this, your SMTP settings are working correctly!",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #2563eb;">SMTP Test Successful!</h2>
            <p>This is a test email from Mediator Pro.</p>
            <p>If you received this email, your SMTP configuration is working correctly.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Configuration Details:</strong><br>
              SMTP Host: ${settings.host}<br>
              Port: ${settings.port}<br>
              From: ${settings.fromName} &lt;${settings.fromEmail}&gt;
            </p>
          </div>
        `,
      });

      console.log("Test email sent:", info.messageId);
      res.json({ 
        message: "SMTP connection test successful! Check your inbox for the test email.",
        messageId: info.messageId 
      });
    } catch (error: any) {
      console.error("Error testing SMTP connection:", error);
      res.status(500).json({ 
        message: "Failed to test SMTP connection", 
        error: error.message 
      });
    }
  });

  // Zoom settings routes
  app.get('/api/zoom-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getZoomSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching Zoom settings:", error);
      res.status(500).json({ message: "Failed to fetch Zoom settings" });
    }
  });

  app.post('/api/zoom-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const existingSettings = await storage.getZoomSettings(userId);
      
      // Validate incoming data
      const settingsData = insertZoomSettingsSchema.parse({
        ...req.body,
        userId,
      });
      
      if (existingSettings) {
        const settings = await storage.updateZoomSettings(userId, settingsData);
        res.json(settings);
      } else {
        const settings = await storage.createZoomSettings(settingsData);
        res.json(settings);
      }
    } catch (error) {
      console.error("Error saving Zoom settings:", error);
      // Return 400 for validation errors, 500 for server errors
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid Zoom settings data", error: error.message });
      }
      res.status(500).json({ message: "Failed to save Zoom settings" });
    }
  });

  // Calendar settings routes
  app.get('/api/calendar-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching Calendar settings:", error);
      res.status(500).json({ message: "Failed to fetch Calendar settings" });
    }
  });

  app.post('/api/calendar-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const existingSettings = await storage.getCalendarSettings(userId);
      
      // Validate incoming data
      const settingsData = insertCalendarSettingsSchema.parse({
        ...req.body,
        userId,
      });
      
      if (existingSettings) {
        const settings = await storage.updateCalendarSettings(userId, settingsData);
        res.json(settings);
      } else {
        const settings = await storage.createCalendarSettings(settingsData);
        res.json(settings);
      }
    } catch (error) {
      console.error("Error saving Calendar settings:", error);
      // Return 400 for validation errors, 500 for server errors
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid Calendar settings data", error: error.message });
      }
      res.status(500).json({ message: "Failed to save Calendar settings" });
    }
  });

  // Helper function to get authenticated calendar service
  async function getUserCalendarService(userId: string) {
    const settings = await storage.getCalendarSettings(userId);

    if (!settings || !settings.clientId || !settings.clientSecret) {
      throw new Error("Please configure Google Calendar credentials in Settings first");
    }

    if (!settings.accessToken || !settings.refreshToken) {
      throw new Error("Please connect your Google Calendar first");
    }

    const { GoogleCalendarOAuthService } = await import('./googleCalendarOAuthService.js');
    return { service: new GoogleCalendarOAuthService(settings), settings };
  }

  // Helper to persist refreshed tokens
  async function saveRefreshedTokens(userId: string, settings: any, service: any) {
    try {
      const newTokens = await service.refreshAccessToken();
      if (newTokens.accessToken !== settings.accessToken) {
        await storage.updateCalendarSettings(userId, {
          ...settings,
          accessToken: newTokens.accessToken,
          expiryDate: newTokens.expiryDate,
        });
      }
    } catch (error) {
      // Token refresh failed, ignore
      console.error("Token refresh failed:", error);
    }
  }

  // Google Calendar OAuth routes
  app.get('/api/calendar/oauth/init', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);

      if (!settings || !settings.clientId || !settings.clientSecret) {
        return res.status(400).json({ message: "Please configure Google Calendar credentials in Settings first" });
      }

      const { GoogleCalendarOAuthService } = await import('./googleCalendarOAuthService.js');
      const calendarService = new GoogleCalendarOAuthService(settings);

      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      
      // Store state in session for verification
      req.session.oauthState = state;
      req.session.save();

      const authUrl = calendarService.getAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      res.status(500).json({ message: "Failed to initiate OAuth flow" });
    }
  });

  app.get('/api/calendar/oauth/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).send("No authorization code provided");
      }

      // Verify state to prevent CSRF
      if (state !== req.session?.oauthState) {
        return res.status(400).send("Invalid state parameter");
      }

      // Clear the state from session
      delete req.session.oauthState;
      req.session.save();

      // Get user from session
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).send("Not authenticated");
      }

      const settings = await storage.getCalendarSettings(userId);
      if (!settings) {
        return res.status(400).send("Calendar settings not found");
      }

      const { GoogleCalendarOAuthService } = await import('./googleCalendarOAuthService.js');
      const calendarService = new GoogleCalendarOAuthService(settings);

      // Exchange code for tokens
      const tokens = await calendarService.getTokensFromCode(code as string);

      // Update settings with tokens
      await storage.updateCalendarSettings(userId, {
        ...settings,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        scope: tokens.scope,
        expiryDate: tokens.expiryDate,
      });

      // Redirect to settings page with success
      res.redirect('/#/settings?tab=calendar&connected=true');
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      res.redirect('/#/settings?tab=calendar&error=oauth_failed');
    }
  });

  app.get('/api/calendar/connection-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);

      if (!settings || !settings.accessToken || !settings.refreshToken) {
        return res.json({ connected: false, scopes: [] });
      }

      const { GoogleCalendarOAuthService } = await import('./googleCalendarOAuthService.js');
      const calendarService = new GoogleCalendarOAuthService(settings);

      // Parse scopes from stored scope string
      const scopes = settings.scope ? settings.scope.split(' ') : [];
      const hasGmailScope = scopes.some(s => s.includes('gmail'));

      res.json({ 
        connected: calendarService.isConnected(),
        scopes,
        hasGmailScope 
      });
    } catch (error) {
      console.error("Error checking connection status:", error);
      res.json({ connected: false, scopes: [], hasGmailScope: false });
    }
  });

  app.post('/api/calendar/oauth/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);

      if (!settings) {
        return res.status(404).json({ message: "Calendar settings not found" });
      }

      // Clear the OAuth tokens
      await storage.updateCalendarSettings(userId, {
        ...settings,
        accessToken: null,
        refreshToken: null,
        scope: null,
        expiryDate: null,
      });

      res.json({ message: "Successfully disconnected from Google Calendar" });
    } catch (error) {
      console.error("Error disconnecting from Google Calendar:", error);
      res.status(500).json({ message: "Failed to disconnect from Google Calendar" });
    }
  });

  // Gmail integration routes
  app.post('/api/gmail/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);

      if (!settings || !settings.accessToken || !settings.refreshToken) {
        return res.status(400).json({ message: "Google account not connected. Please connect to Google Calendar first." });
      }

      const { GmailService } = await import('./gmailService.js');
      const gmailService = new GmailService(settings);

      // Send test email to danny@mediator.life
      const messageId = await gmailService.sendEmail({
        to: 'danny@mediator.life',
        subject: 'Gmail API Test Email - Mediator Pro',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #2563eb;">Gmail API Test Successful!</h2>
            <p>This is a test email from Mediator Pro using Gmail API.</p>
            <p>If you received this email, your Gmail API integration is working correctly.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Benefits of Gmail API:</strong><br>
              ✓ No DKIM/SPF configuration needed<br>
              ✓ No authentication warnings<br>
              ✓ Sent from your real Gmail account<br>
              ✓ Automatically authenticated
            </p>
          </div>
        `,
      });

      res.json({ 
        message: "Test email sent successfully via Gmail API! Check your inbox.",
        messageId 
      });
    } catch (error: any) {
      console.error("Error sending test email via Gmail:", error);
      
      // Check for insufficient scopes error
      if (error.message && error.message.includes('insufficient authentication scopes')) {
        return res.status(403).json({ 
          message: "Your Google connection doesn't have Gmail permissions. Please disconnect and reconnect to Google Calendar to grant Gmail access.",
          error: "Request had insufficient authentication scopes."
        });
      }
      
      res.status(500).json({ 
        message: "Failed to send test email", 
        error: error.message 
      });
    }
  });

  app.post('/api/gmail/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getCalendarSettings(userId);

      if (!settings || !settings.accessToken || !settings.refreshToken) {
        return res.status(400).json({ message: "Google account not connected. Please connect to Google Calendar first." });
      }

      const { GmailService } = await import('./gmailService.js');
      const gmailService = new GmailService(settings);

      const { to, subject, html, text } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ message: "Missing required fields: to, subject" });
      }

      // Support multiple recipients
      const recipients = Array.isArray(to) ? to : [to];
      const messageIds = await gmailService.sendBulkEmail({
        recipients,
        subject,
        html,
        text,
      });

      res.json({ 
        message: "Email(s) sent successfully via Gmail API",
        messageIds 
      });
    } catch (error: any) {
      console.error("Error sending email via Gmail:", error);
      res.status(500).json({ 
        message: "Failed to send email", 
        error: error.message 
      });
    }
  });

  // Zoom integration routes
  app.post('/api/cases/:caseId/zoom-meeting', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.user.claims.sub;

      // Get the case to verify ownership and get details
      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (caseData.mediatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to create meeting for this case" });
      }

      // Check if meeting already exists
      if (caseData.zoomMeetingId) {
        return res.status(400).json({ message: "Zoom meeting already exists for this case" });
      }

      // Import Zoom service
      const { zoomService } = await import('./zoomService.js');

      // Create Zoom meeting
      const startTime = caseData.mediationDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow if no date set
      const meeting = await zoomService.createMeeting({
        topic: `Mediation Session - ${caseData.caseNumber}`,
        startTime: new Date(startTime),
        duration: 120, // 2 hours default
        timezone: 'Australia/Sydney',
      });

      // Update case with Zoom meeting details
      const updatedCase = await storage.updateCase(caseId, {
        zoomMeetingId: meeting.meetingId,
        zoomMeetingLink: meeting.joinUrl,
        zoomMeetingPassword: meeting.password,
      });

      res.json(updatedCase);
    } catch (error) {
      console.error("Error creating Zoom meeting:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create Zoom meeting" });
    }
  });

  app.delete('/api/cases/:caseId/zoom-meeting', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.user.claims.sub;

      // Get the case to verify ownership
      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (caseData.mediatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete meeting for this case" });
      }

      if (!caseData.zoomMeetingId) {
        return res.status(400).json({ message: "No Zoom meeting exists for this case" });
      }

      // Import Zoom service
      const { zoomService } = await import('./zoomService.js');

      // Delete Zoom meeting
      await zoomService.deleteMeeting(caseData.zoomMeetingId);

      // Update case to remove Zoom meeting details
      const updatedCase = await storage.updateCase(caseId, {
        zoomMeetingId: null,
        zoomMeetingLink: null,
        zoomMeetingPassword: null,
      });

      res.json(updatedCase);
    } catch (error) {
      console.error("Error deleting Zoom meeting:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete Zoom meeting" });
    }
  });

  // Google Calendar integration routes
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service, settings } = await getUserCalendarService(userId);
      const events = await service.listUpcomingEvents(50);
      await saveRefreshedTokens(userId, settings, service);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch calendar events" 
      });
    }
  });

  app.post('/api/calendar/sync-cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service: calendarService, settings } = await getUserCalendarService(userId);
      
      // Get all cases with mediation dates
      const cases = await storage.getCases(userId);
      const casesWithDates = cases.filter((c: any) => c.mediationDate);
      
      const results = [];
      
      for (const caseData of casesWithDates) {
        try {
          const parties = await storage.getPartiesByCase(caseData.id);
          const applicants = parties.filter(p => p.partyType === 'applicant');
          const respondents = parties.filter(p => p.partyType === 'respondent');
          
          const attendees = [
            ...applicants.map(p => ({ 
              email: p.primaryContactEmail || '', 
              displayName: p.entityName 
            })),
            ...respondents.map(p => ({ 
              email: p.primaryContactEmail || '', 
              displayName: p.entityName 
            }))
          ].filter(a => a.email);

          const startDateTime = new Date(caseData.mediationDate!);
          const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

          const description = [
            `Case Number: ${caseData.caseNumber}`,
            caseData.mediationType ? `Type: ${caseData.mediationType}` : '',
            caseData.premises ? `Location: ${caseData.premises}` : '',
            caseData.disputeBackground ? `\nBackground:\n${caseData.disputeBackground}` : '',
          ].filter(Boolean).join('\n');

          if (caseData.calendarEventId) {
            // Delete and recreate to avoid type conflict errors
            try {
              await calendarService.deleteEvent(caseData.calendarEventId);
            } catch (e) {
              console.log('Event already deleted');
            }
          }
          
          // Create event (or recreate if existed)
          const eventId = await calendarService.createEvent({
            summary: `Mediation: ${caseData.caseNumber}`,
            description,
            location: caseData.premises || '',
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
            attendees,
          });

          if (caseData.calendarEventId) {
            await storage.updateCase(caseData.id, { calendarEventId: eventId });
            results.push({ caseId: caseData.id, action: 'updated', eventId });
          } else {

            // Update case with calendar event ID
            await storage.updateCase(caseData.id, { calendarEventId: eventId });
            results.push({ caseId: caseData.id, action: 'created', eventId });
          }
        } catch (error) {
          console.error(`Error syncing case ${caseData.id}:`, error);
          results.push({ 
            caseId: caseData.id, 
            action: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      res.json({ synced: results.length, results });
    } catch (error) {
      console.error("Error syncing cases to calendar:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to sync cases" 
      });
    }
  });

  app.post('/api/cases/:caseId/sync-to-calendar', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.user.claims.sub;
      const { service: calendarService, settings } = await getUserCalendarService(userId);

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (caseData.mediatorId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!caseData.mediationDate) {
        return res.status(400).json({ message: "Case has no mediation date set" });
      }

      const parties = await storage.getPartiesByCase(caseId);
      const applicants = parties.filter(p => p.partyType === 'applicant');
      const respondents = parties.filter(p => p.partyType === 'respondent');
      
      const attendees = [
        ...applicants.map(p => ({ 
          email: p.primaryContactEmail || '', 
          displayName: p.entityName 
        })),
        ...respondents.map(p => ({ 
          email: p.primaryContactEmail || '', 
          displayName: p.entityName 
        }))
      ].filter(a => a.email);

      const startDateTime = new Date(caseData.mediationDate);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

      const description = [
        `Case Number: ${caseData.caseNumber}`,
        caseData.mediationType ? `Type: ${caseData.mediationType}` : '',
        caseData.premises ? `Location: ${caseData.premises}` : '',
        caseData.disputeBackground ? `\nBackground:\n${caseData.disputeBackground}` : '',
      ].filter(Boolean).join('\n');

      if (caseData.calendarEventId) {
        // Check if the existing event still exists
        const existingEvent = await calendarService.getEvent(caseData.calendarEventId);
        
        if (existingEvent) {
          // Delete the old event and create a new one to avoid "Event type cannot be changed" errors
          try {
            await calendarService.deleteEvent(caseData.calendarEventId);
          } catch (error) {
            console.log('Event already deleted or not found, creating new one');
          }
        }
        
        // Create new event
        const eventId = await calendarService.createEvent({
          summary: `Mediation: ${caseData.caseNumber}`,
          description,
          location: caseData.premises || '',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendees,
        });

        const updatedCase = await storage.updateCase(caseId, { calendarEventId: eventId });
        await saveRefreshedTokens(userId, settings, calendarService);
        res.json({ action: 'recreated', eventId, case: updatedCase });
      } else {
        const eventId = await calendarService.createEvent({
          summary: `Mediation: ${caseData.caseNumber}`,
          description,
          location: caseData.premises || '',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendees,
        });

        const updatedCase = await storage.updateCase(caseId, { calendarEventId: eventId });
        await saveRefreshedTokens(userId, settings, calendarService);
        res.json({ action: 'created', eventId, case: updatedCase });
      }
    } catch (error) {
      console.error("Error syncing case to calendar:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to sync case" 
      });
    }
  });

  app.delete('/api/cases/:caseId/calendar-event', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.user.claims.sub;
      const { googleCalendarService } = await import('./googleCalendarService.js');

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (caseData.mediatorId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!caseData.calendarEventId) {
        return res.status(400).json({ message: "No calendar event exists for this case" });
      }

      await googleCalendarService.deleteEvent(caseData.calendarEventId);
      const updatedCase = await storage.updateCase(caseId, { calendarEventId: null });
      
      res.json(updatedCase);
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete calendar event" 
      });
    }
  });

  app.post('/api/calendar/create-case-from-event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventId, caseNumber } = req.body;
      const { googleCalendarService } = await import('./googleCalendarService.js');

      if (!eventId || !caseNumber) {
        return res.status(400).json({ message: "Event ID and case number are required" });
      }

      // Get the event from Google Calendar
      const event = await googleCalendarService.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      // Extract event details
      const mediationDate = event.start.dateTime ? new Date(event.start.dateTime) : null;
      const premises = event.location || '';
      
      // Parse description to extract case details
      let disputeBackground = event.description || '';
      
      // Get user details for mediator name
      const user = await storage.getUser(userId);
      const mediatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

      // Create the case
      const newCase = await storage.createCase({
        caseNumber,
        mediatorId: userId,
        mediatorName: mediatorName || undefined,
        mediationType: 'Remote',
        mediationDate,
        premises,
        disputeBackground: disputeBackground || undefined,
        status: 'active',
        calendarEventId: eventId,
      });

      // Extract attendees as parties if available
      if (event.attendees && event.attendees.length > 0) {
        for (let i = 0; i < event.attendees.length; i++) {
          const attendee = event.attendees[i];
          await storage.createParty({
            caseId: newCase.id,
            entityName: attendee.displayName || attendee.email,
            partyType: i === 0 ? 'applicant' : 'respondent',
            primaryContactEmail: attendee.email,
          });
        }
      }

      res.json(newCase);
    } catch (error) {
      console.error("Error creating case from event:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create case from event" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
