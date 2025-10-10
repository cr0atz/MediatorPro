import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { aiService } from "./aiService";
import { emailService } from "./emailService";
import { insertCaseSchema, insertPartySchema, insertDocumentSchema, insertCaseNoteSchema, insertAiAnalysisSchema } from "@shared/schema";

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
      // Allow PDF, DOC, DOCX files
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

      // Extract case data using AI
      const extractedData = await aiService.extractCaseDataFromDocument(file.buffer, file.mimetype);
      
      // Extract text content for future RAG queries
      const extractedText = await aiService.extractTextFromDocument(file.buffer, file.mimetype);

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

  app.get('/api/email/templates', async (req, res) => {
    try {
      const templates = emailService.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
