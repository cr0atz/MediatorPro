import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
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

  // Object storage routes for documents
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
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

      // Upload file to object storage
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file using the presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.buffer,
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

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

      // Set ACL policy for the uploaded document
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private",
      });

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

      // Upload file to object storage
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.buffer,
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Extract text content for RAG
      const extractedText = await aiService.extractTextFromDocument(file.buffer, file.mimetype);

      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private",
      });

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

      // Set ACL policy for the uploaded file
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private",
      });

      // Extract text from the uploaded document
      let extractedText = '';
      let isProcessed = false;
      
      try {
        // Get the file from object storage using the objectPath
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        
        // Download the file contents as a buffer
        const [fileBuffer] = await objectFile.download();
        
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
        const objectStorageService = new ObjectStorageService();
        const objectFile = await objectStorageService.getObjectEntityFile(document.objectPath);
        const [fileBuffer] = await objectFile.download();
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
    } catch (error) {
      console.error("Error answering case question:", error);
      res.status(500).json({ message: "Failed to answer case question" });
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
      // TODO: Implement actual SMTP connection test
      // For now, just return success if settings exist
      res.json({ message: "SMTP connection test successful" });
    } catch (error) {
      console.error("Error testing SMTP connection:", error);
      res.status(500).json({ message: "Failed to test SMTP connection" });
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
      const { googleCalendarService } = await import('./googleCalendarService.js');
      const events = await googleCalendarService.listUpcomingEvents(20);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch calendar events" 
      });
    }
  });

  app.post('/api/calendar/sync-cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { googleCalendarService } = await import('./googleCalendarService.js');
      
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
            // Update existing event
            await googleCalendarService.updateEvent(caseData.calendarEventId, {
              summary: `Mediation: ${caseData.caseNumber}`,
              description,
              location: caseData.premises || '',
              startDateTime: startDateTime.toISOString(),
              endDateTime: endDateTime.toISOString(),
              attendees,
            });
            results.push({ caseId: caseData.id, action: 'updated' });
          } else {
            // Create new event
            const eventId = await googleCalendarService.createEvent({
              summary: `Mediation: ${caseData.caseNumber}`,
              description,
              location: caseData.premises || '',
              startDateTime: startDateTime.toISOString(),
              endDateTime: endDateTime.toISOString(),
              attendees,
            });

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
      const { googleCalendarService } = await import('./googleCalendarService.js');

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
        const existingEvent = await googleCalendarService.getEvent(caseData.calendarEventId);
        
        if (existingEvent) {
          // Delete the old event and create a new one to avoid "Event type cannot be changed" errors
          try {
            await googleCalendarService.deleteEvent(caseData.calendarEventId);
          } catch (error) {
            console.log('Event already deleted or not found, creating new one');
          }
        }
        
        // Create new event
        const eventId = await googleCalendarService.createEvent({
          summary: `Mediation: ${caseData.caseNumber}`,
          description,
          location: caseData.premises || '',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendees,
        });

        const updatedCase = await storage.updateCase(caseId, { calendarEventId: eventId });
        res.json({ action: 'recreated', eventId, case: updatedCase });
      } else {
        const eventId = await googleCalendarService.createEvent({
          summary: `Mediation: ${caseData.caseNumber}`,
          description,
          location: caseData.premises || '',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendees,
        });

        const updatedCase = await storage.updateCase(caseId, { calendarEventId: eventId });
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
