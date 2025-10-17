import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (supports both Replit Auth and local auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For local authentication
  isLocal: boolean("is_local").default(false), // true for local users, false for Replit auth
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  mediationNumber: text("mediation_number"),
  mediatorId: varchar("mediator_id").notNull(),
  mediatorName: text("mediator_name"),
  mediationType: text("mediation_type"), // Remote, In-Person
  mediationDate: timestamp("mediation_date"),
  premises: text("premises"),
  disputeBackground: text("dispute_background"),
  issuesForDiscussion: text("issues_for_discussion").array(),
  status: text("status").notNull().default("active"), // active, scheduled, closed
  zoomMeetingId: text("zoom_meeting_id"),
  zoomMeetingLink: text("zoom_meeting_link"),
  zoomMeetingPassword: text("zoom_meeting_password"),
  calendarEventId: text("calendar_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const parties = pgTable("parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  entityName: text("entity_name").notNull(),
  partyType: text("party_type").notNull(), // applicant, respondent
  primaryContactName: text("primary_contact_name"),
  primaryContactRole: text("primary_contact_role"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactPhone: text("primary_contact_phone"),
  legalRepName: text("legal_rep_name"),
  legalRepFirm: text("legal_rep_firm"),
  legalRepEmail: text("legal_rep_email"),
  legalRepPhone: text("legal_rep_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  category: text("category"), // Legal Document, Evidence, Correspondence, Financial
  objectPath: text("object_path").notNull(),
  extractedText: text("extracted_text"),
  isProcessed: boolean("is_processed").default(false),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseNotes = pgTable("case_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiAnalyses = pgTable("ai_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  analysisType: text("analysis_type").notNull(), // summary, irac, qa
  input: text("input"),
  output: text("output").notNull(),
  metadata: jsonb("metadata"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category"), // mediation-confirmation, follow-up, settlement, etc
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smtpSettings = pgTable("smtp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  secure: boolean("secure").default(true),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zoomSettings = pgTable("zoom_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accountId: text("account_id").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarSettings = pgTable("calendar_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  scope: text("scope"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const casesRelations = relations(cases, ({ many, one }) => ({
  parties: many(parties),
  documents: many(documents),
  caseNotes: many(caseNotes),
  aiAnalyses: many(aiAnalyses),
  mediator: one(users, {
    fields: [cases.mediatorId],
    references: [users.id],
  }),
}));

export const partiesRelations = relations(parties, ({ one }) => ({
  case: one(cases, {
    fields: [parties.caseId],
    references: [cases.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const caseNotesRelations = relations(caseNotes, ({ one }) => ({
  case: one(cases, {
    fields: [caseNotes.caseId],
    references: [cases.id],
  }),
  author: one(users, {
    fields: [caseNotes.authorId],
    references: [users.id],
  }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  case: one(cases, {
    fields: [aiAnalyses.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [aiAnalyses.createdBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  documents: many(documents),
  caseNotes: many(caseNotes),
  aiAnalyses: many(aiAnalyses),
}));

// Zod schemas for validation
export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertZoomSettingsSchema = createInsertSchema(zoomSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarSettingsSchema = createInsertSchema(calendarSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type CaseNote = typeof caseNotes.$inferSelect;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type ZoomSettings = typeof zoomSettings.$inferSelect;
export type CalendarSettings = typeof calendarSettings.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type InsertZoomSettings = z.infer<typeof insertZoomSettingsSchema>;
export type InsertCalendarSettings = z.infer<typeof insertCalendarSettingsSchema>;
