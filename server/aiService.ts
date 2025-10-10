import OpenAI from "openai";
import { storage } from "./storage";
import type { Document } from "@shared/schema";

// Using GPT-4 Turbo model for AI analysis
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
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

  async generateCaseSummary(caseId: string): Promise<string> {
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
    } catch (error) {
      console.error("Error answering case question:", error);
      throw new Error("Failed to answer case question");
    }
  }

  async generateIRACAnalysis(caseId: string, legalIssue: string): Promise<string> {
    try {
      const caseData = await storage.getCaseWithDetails(caseId);
      if (!caseData) throw new Error("Case not found");

      const documents = await storage.getDocumentsByCase(caseId);
      const processedDocs = documents.filter(doc => doc.isProcessed && doc.extractedText);

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
