import OpenAI from "openai";
import { storage } from "./storage";
import type { Document } from "@shared/schema";

// Using GPT-4 Turbo model for AI analysis
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

// Log API key status (not the actual key)
console.log("OpenAI API Key configured:", apiKey ? `Yes (${apiKey.substring(0, 7)}...)` : "No - MISSING!");

const openai = new OpenAI({ 
  apiKey: apiKey
});

export interface ExtractedCaseData {
  caseNumber?: string;
  mediationNumber?: string;
  mediatorName?: string;
  mediationDate?: string;
  mediationType?: string;
  premises?: string;
  disputeBackground?: string;
  issuesForDiscussion?: string[];
  parties?: {
    entityName: string;
    partyType: "applicant" | "respondent";
    primaryContactName?: string;
    primaryContactRole?: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
    legalRepName?: string;
    legalRepFirm?: string;
    legalRepEmail?: string;
    legalRepPhone?: string;
  }[];
}

export interface ExtractedMeetingData {
  eventType?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  eventDateTime?: string;
  eventDateTimeRaw?: string;
  location?: string;
  description?: string;
  questions?: string;
  additionalDetails?: string;
  subject?: string;
  timeZone?: string;
}

export class AIService {
  async extractCaseDataFromDocument(documentBuffer: Buffer, mimeType: string): Promise<ExtractedCaseData> {
    try {
      const prompt = `You are an expert legal document analyzer. Extract key case information from this mediation summary document. 

Please extract and return the following information in JSON format:
- caseNumber: Case number or reference
- mediationNumber: Mediation number if different from case number
- mediatorName: Name of the assigned mediator
- mediationDate: Date and time of mediation session (ISO format if possible)
- mediationType: Type of mediation (Remote, In-Person, etc.)
- premises: Location or premises involved in the dispute
- disputeBackground: Brief background/summary of the dispute
- issuesForDiscussion: Array of key issues to be discussed
- parties: Array of party objects with:
  - entityName: Name of the entity/person
  - partyType: "applicant" or "respondent"  
  - primaryContactName: Primary contact person name
  - primaryContactRole: Their role/title
  - primaryContactEmail: Contact email
  - primaryContactPhone: Contact phone
  - legalRepName: Legal representative name
  - legalRepFirm: Law firm name
  - legalRepEmail: Legal rep email
  - legalRepPhone: Legal rep phone

Return only valid JSON. If information is not found, omit the field or use null.`;

      const isImageType = mimeType.startsWith('image/');
      const isPDF = mimeType === 'application/pdf';
      const isWord = mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isExcel = mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      let response;
      
      if (isImageType) {
        const base64Document = documentBuffer.toString('base64');
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional legal document analyzer. Extract case information accurately and return valid JSON."
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Document}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else if (isPDF) {
        const { PDFParse } = await import('pdf-parse');
        const uint8Array = new Uint8Array(documentBuffer);
        const parser = new PDFParse(uint8Array);
        const textResult = await parser.getText();
        const textContent = textResult.text;
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional legal document analyzer. Extract case information accurately from the document text and return valid JSON."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument content:\n${textContent.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else if (isWord) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: documentBuffer });
        const textContent = result.value;
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional legal document analyzer. Extract case information accurately from the document text and return valid JSON."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument content:\n${textContent.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else if (isExcel) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(documentBuffer, { type: 'buffer' });
        let textContent = '';
        
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          textContent += `Sheet: ${sheetName}\n`;
          textContent += XLSX.utils.sheet_to_txt(sheet);
          textContent += '\n\n';
        });
        
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional legal document analyzer. Extract case information accurately from the document text and return valid JSON."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument content:\n${textContent.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else {
        const textContent = documentBuffer.toString('utf-8');
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional legal document analyzer. Extract case information accurately from the document text and return valid JSON."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument content:\n${textContent.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      }

      const extractedData = JSON.parse(response.choices[0].message.content || "{}");
      return extractedData;
    } catch (error) {
      console.error("Error extracting case data:", error);
      throw new Error("Failed to extract case data from document");
    }
  }

  async extractMeetingDataFromDocument(documentBuffer: Buffer, mimeType: string): Promise<ExtractedMeetingData> {
    try {
      const prompt = `You are an expert at extracting calendar event information from documents. 
Extract meeting/event details from this document by looking for field:value patterns.

Common patterns to look for:
- "Event Type:" followed by the type of consultation/meeting
- "Invitee:" or "Invitee Name:" followed by the person's name
- "Invitee Email:" followed by email address
- "Event Date/Time:" or "Date/Time:" followed by the date and time
- "Location:" followed by location (address, phone number, or virtual link)
- "Description:" followed by event description
- "Questions:" or "Additional Details:" followed by any questions or notes
- "Subject:" from email headers
- "Time Zone:" timezone information

IMPORTANT: Read the ACTUAL text content carefully. Extract the real values that appear in the document.
Do NOT make up fake data - only return what you actually find in the document.

Return JSON with these fields (omit if not found):
- eventType: Type of event/consultation
- inviteeName: Name of the invitee/attendee
- inviteeEmail: Email address of invitee
- eventDateTime: Date and time of event in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) if possible, otherwise the raw text
- eventDateTimeRaw: Original date/time text as it appears in the document
- location: Location, phone number, or meeting link
- description: Event description
- questions: Questions or notes section
- additionalDetails: Any other relevant details
- subject: Email subject if present
- timeZone: Time zone information

IMPORTANT for eventDateTime: Try to convert dates to ISO format (YYYY-MM-DDTHH:MM:SS).
For example: "12:30pm - Monday, 20 October 2025" becomes "2025-10-20T12:30:00"
If you cannot confidently parse the date, still return the raw text in eventDateTimeRaw.

Return only valid JSON with actual extracted values.`;

      const isPDF = mimeType === 'application/pdf';
      const isWord = mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      let response;
      let extractedText = '';
      
      if (isPDF) {
        const { PDFParse } = await import('pdf-parse');
        const uint8Array = new Uint8Array(documentBuffer);
        const parser = new PDFParse(uint8Array);
        const textResult = await parser.getText();
        extractedText = textResult.text;
        
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a calendar event extraction expert. Extract ONLY the actual information present in the document. Do NOT fabricate or make up any data."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument text:\n${extractedText.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else if (isWord) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: documentBuffer });
        extractedText = result.value;
        
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a calendar event extraction expert. Extract ONLY the actual information present in the document. Do NOT fabricate or make up any data."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument text:\n${extractedText.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      } else {
        extractedText = documentBuffer.toString('utf-8');
        response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a calendar event extraction expert. Extract ONLY the actual information present in the document. Do NOT fabricate or make up any data."
            },
            {
              role: "user",
              content: `${prompt}\n\nDocument text:\n${extractedText.substring(0, 100000)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });
      }

      const extractedData = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Extracted meeting data:", JSON.stringify(extractedData, null, 2));
      return extractedData;
    } catch (error) {
      console.error("Error extracting meeting data:", error);
      throw new Error("Failed to extract meeting data from document");
    }
  }

  async generateCaseSummary(caseId: string): Promise<string> {
    try {
      const caseData = await storage.getCaseWithDetails(caseId);
      if (!caseData) throw new Error("Case not found");

      const documents = await storage.getDocumentsByCase(caseId);
      const processedDocs = documents.filter(doc => doc.isProcessed && doc.extractedText);

      // If no documents are available, generate summary based on case info only
      if (processedDocs.length === 0) {
        let context = `Case: ${caseData.caseNumber}\n`;
        context += `Background: ${caseData.disputeBackground || "Not provided"}\n`;
        context += `Issues: ${caseData.issuesForDiscussion?.join(", ") || "Not specified"}\n`;

        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional mediator. Generate a brief, neutral case summary based on the provided basic case information. Keep it concise and note that no documents have been uploaded yet."
            },
            {
              role: "user",
              content: `Please generate a brief case summary:\n\n${context}\n\nNote: No documents have been uploaded to this case yet.`
            }
          ],
          max_completion_tokens: 500,
        });

        return response.choices[0].message.content || "Unable to generate summary - no case information available.";
      }

      let context = `Case: ${caseData.caseNumber}\n`;
      context += `Background: ${caseData.disputeBackground}\n`;
      context += `Issues: ${caseData.issuesForDiscussion?.join(", ")}\n\n`;
      
      processedDocs.forEach(doc => {
        context += `Document: ${doc.originalName}\n${doc.extractedText}\n\n`;
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional mediator. Generate a neutral, comprehensive case summary based on the provided case information and documents. Focus on key facts, positions of each party, and main issues for resolution."
          },
          {
            role: "user",
            content: `Please generate a comprehensive case summary for this mediation case:\n\n${context}`
          }
        ],
        max_completion_tokens: 2048,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating case summary:", error);
      throw new Error("Failed to generate case summary");
    }
  }

  async answerCaseQuestion(caseId: string, question: string): Promise<string> {
    try {
      const caseData = await storage.getCaseWithDetails(caseId);
      if (!caseData) throw new Error("Case not found");

      const documents = await storage.getDocumentsByCase(caseId);
      const processedDocs = documents.filter(doc => doc.isProcessed && doc.extractedText);

      let context = `Case: ${caseData.caseNumber}\n`;
      context += `Background: ${caseData.disputeBackground}\n`;
      context += `Issues: ${caseData.issuesForDiscussion?.join(", ")}\n\n`;
      
      processedDocs.forEach(doc => {
        context += `Document: ${doc.originalName}\n${doc.extractedText}\n\n`;
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant helping a mediator analyze case documents. Answer questions based on the provided case information and documents. Be factual, neutral, and cite specific documents when possible."
          },
          {
            role: "user",
            content: `Case Information:\n${context}\n\nQuestion: ${question}`
          }
        ],
        max_completion_tokens: 2048,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      console.error("Error answering case question:", error);
      console.error("Error details:", error?.response?.data || error?.message);
      throw new Error(`Failed to get AI response: ${error?.message || 'Unknown error'}`);
    }
  }

  async generateIRACAnalysis(caseId: string, legalIssue: string): Promise<string> {
    try {
      const caseData = await storage.getCaseWithDetails(caseId);
      if (!caseData) throw new Error("Case not found");

      const documents = await storage.getDocumentsByCase(caseId);
      const processedDocs = documents.filter(doc => doc.isProcessed && doc.extractedText);

      // If no documents are available, generate analysis based on case info only
      if (processedDocs.length === 0) {
        let context = `Case: ${caseData.caseNumber}\n`;
        context += `Background: ${caseData.disputeBackground || "Not provided"}\n`;

        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a legal analysis expert. Generate an IRAC analysis (Issue, Rule, Application, Conclusion) for the specified legal issue based on the available case information. Note if limited information is available. Format it clearly with headings."
            },
            {
              role: "user",
              content: `Case Information:\n${context}\n\nNote: No documents have been uploaded yet.\n\nGenerate an IRAC analysis for this legal issue: ${legalIssue}`
            }
          ],
          max_completion_tokens: 2048,
        });

        return response.choices[0].message.content || "Unable to generate IRAC analysis - insufficient information available.";
      }

      let context = `Case: ${caseData.caseNumber}\n`;
      context += `Background: ${caseData.disputeBackground}\n`;
      
      processedDocs.forEach(doc => {
        context += `Document: ${doc.originalName}\n${doc.extractedText}\n\n`;
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a legal analysis expert. Generate an IRAC analysis (Issue, Rule, Application, Conclusion) for the specified legal issue based on the case documents. Format it clearly with headings."
          },
          {
            role: "user",
            content: `Case Information:\n${context}\n\nGenerate an IRAC analysis for this legal issue: ${legalIssue}`
          }
        ],
        max_completion_tokens: 3072,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating IRAC analysis:", error);
      throw new Error("Failed to generate IRAC analysis");
    }
  }

  async extractTextFromDocument(documentBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const isImageType = mimeType.startsWith('image/');
      const isPDF = mimeType === 'application/pdf';
      const isWord = mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isExcel = mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      if (isPDF) {
        const { PDFParse } = await import('pdf-parse');
        const uint8Array = new Uint8Array(documentBuffer);
        const parser = new PDFParse(uint8Array);
        const textResult = await parser.getText();
        return textResult.text;
      } else if (isWord) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: documentBuffer });
        return result.value;
      } else if (isExcel) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(documentBuffer, { type: 'buffer' });
        let text = '';
        
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          text += `Sheet: ${sheetName}\n`;
          text += XLSX.utils.sheet_to_txt(sheet);
          text += '\n\n';
        });
        
        return text;
      } else if (isImageType) {
        const base64Document = documentBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are a document text extraction expert. Extract all readable text from this document and return it in a clean, organized format."
            },
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: "Extract all text content from this document. Return the text in a clear, readable format." 
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Document}`
                  }
                }
              ]
            }
          ],
          max_completion_tokens: 4096,
        });

        return response.choices[0].message.content || "";
      } else {
        return documentBuffer.toString('utf-8');
      }
    } catch (error) {
      console.error("Error extracting text from document:", error);
      throw new Error("Failed to extract text from document");
    }
  }
}

export const aiService = new AIService();
