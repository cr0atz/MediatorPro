import {
  users,
  cases,
  parties,
  documents,
  caseNotes,
  aiAnalyses,
  emailTemplates,
  smtpSettings,
  type User,
  type UpsertUser,
  type Case,
  type Party,
  type Document,
  type CaseNote,
  type AiAnalysis,
  type EmailTemplate,
  type SmtpSettings,
  type InsertCase,
  type InsertParty,
  type InsertDocument,
  type InsertCaseNote,
  type InsertAiAnalysis,
  type InsertEmailTemplate,
  type InsertSmtpSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Case operations
  getCases(mediatorId: string): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  getCaseWithDetails(id: string): Promise<(Case & { parties: Party[], documents: Document[] }) | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, caseData: Partial<InsertCase>): Promise<Case>;
  deleteCase(id: string): Promise<void>;
  
  // Party operations
  createParty(partyData: InsertParty): Promise<Party>;
  getPartiesByCase(caseId: string): Promise<Party[]>;
  
  // Document operations
  createDocument(documentData: InsertDocument): Promise<Document>;
  getDocumentsByCase(caseId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  updateDocument(id: string, documentData: Partial<InsertDocument>): Promise<Document>;
  
  // Case Notes operations
  createCaseNote(noteData: InsertCaseNote): Promise<CaseNote>;
  getCaseNotes(caseId: string): Promise<CaseNote[]>;
  
  // AI Analysis operations
  createAiAnalysis(analysisData: InsertAiAnalysis): Promise<AiAnalysis>;
  getAiAnalyses(caseId: string): Promise<AiAnalysis[]>;
  
  // Email Template operations
  createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(id: string, templateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string): Promise<void>;
  
  // SMTP Settings operations
  getSmtpSettings(userId: string): Promise<SmtpSettings | undefined>;
  createSmtpSettings(settingsData: InsertSmtpSettings): Promise<SmtpSettings>;
  updateSmtpSettings(userId: string, settingsData: Partial<InsertSmtpSettings>): Promise<SmtpSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Case operations
  async getCases(mediatorId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.mediatorId, mediatorId))
      .orderBy(desc(cases.updatedAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, id));
    return caseData;
  }

  async getCaseWithDetails(id: string): Promise<(Case & { parties: Party[], documents: Document[] }) | undefined> {
    const caseData = await this.getCase(id);
    if (!caseData) return undefined;

    const caseParties = await this.getPartiesByCase(id);
    const caseDocuments = await this.getDocumentsByCase(id);

    return {
      ...caseData,
      parties: caseParties,
      documents: caseDocuments,
    };
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(caseData).returning();
    return newCase;
  }

  async updateCase(id: string, caseData: Partial<InsertCase>): Promise<Case> {
    const [updatedCase] = await db
      .update(cases)
      .set({ ...caseData, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  // Party operations
  async createParty(partyData: InsertParty): Promise<Party> {
    const [party] = await db.insert(parties).values(partyData).returning();
    return party;
  }

  async getPartiesByCase(caseId: string): Promise<Party[]> {
    return await db.select().from(parties).where(eq(parties.caseId, caseId));
  }

  // Document operations
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  async getDocumentsByCase(caseId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: string, documentData: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(documentData)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  // Case Notes operations
  async createCaseNote(noteData: InsertCaseNote): Promise<CaseNote> {
    const [note] = await db.insert(caseNotes).values(noteData).returning();
    return note;
  }

  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    return await db
      .select()
      .from(caseNotes)
      .where(eq(caseNotes.caseId, caseId))
      .orderBy(desc(caseNotes.createdAt));
  }

  // AI Analysis operations
  async createAiAnalysis(analysisData: InsertAiAnalysis): Promise<AiAnalysis> {
    const [analysis] = await db.insert(aiAnalyses).values(analysisData).returning();
    return analysis;
  }

  async getAiAnalyses(caseId: string): Promise<AiAnalysis[]> {
    return await db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.caseId, caseId))
      .orderBy(desc(aiAnalyses.createdAt));
  }

  // Email Template operations
  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(templateData).returning();
    return template;
  }

  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async updateEmailTemplate(id: string, templateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // SMTP Settings operations
  async getSmtpSettings(userId: string): Promise<SmtpSettings | undefined> {
    const [settings] = await db
      .select()
      .from(smtpSettings)
      .where(eq(smtpSettings.userId, userId));
    return settings;
  }

  async createSmtpSettings(settingsData: InsertSmtpSettings): Promise<SmtpSettings> {
    const [settings] = await db.insert(smtpSettings).values(settingsData).returning();
    return settings;
  }

  async updateSmtpSettings(userId: string, settingsData: Partial<InsertSmtpSettings>): Promise<SmtpSettings> {
    const [updatedSettings] = await db
      .update(smtpSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(smtpSettings.userId, userId))
      .returning();
    return updatedSettings;
  }
}

export const storage = new DatabaseStorage();
