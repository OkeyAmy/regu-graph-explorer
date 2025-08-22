import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { GEMINI_API_KEY } from '@/config/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    documentType: string;
    fileName?: string;
    documentContent?: string;
  };
}

export interface DocumentContext {
  content: string | ArrayBuffer;
  type: 'pdf' | 'html' | 'text' | 'url';
  fileName?: string;
}

export class GeminiChatService {
  private ai: GoogleGenAI;
  private currentDocument: DocumentContext | null = null;
  private uploadedFile: any = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  /**
   * Set the current document context for chat analysis
   */
  async setDocumentContext(document: DocumentContext): Promise<void> {
    this.currentDocument = document;
    
    // If it's a PDF, upload it using the File API
    if (document.type === 'pdf' && document.content instanceof ArrayBuffer) {
      try {
        // Create a File object from the ArrayBuffer
        const uint8Array = new Uint8Array(document.content);
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        const file = new File([blob], document.fileName || 'document.pdf', { 
          type: 'application/pdf' 
        });
        
        // Upload the file using the new SDK
        this.uploadedFile = await this.ai.files.upload({
          file: file,
          config: {
            displayName: document.fileName || 'Document.pdf',
          },
        });

        // Wait for the file to be processed
        let fileStatus = await this.ai.files.get({ name: this.uploadedFile.name });
        while (fileStatus.state === 'PROCESSING') {
          console.log(`Processing file: ${fileStatus.state}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          fileStatus = await this.ai.files.get({ name: this.uploadedFile.name });
        }
        
        if (fileStatus.state === 'FAILED') {
          throw new Error('File processing failed.');
        }
        
        console.log('PDF file uploaded successfully:', this.uploadedFile.name);
      } catch (error) {
        console.error('Error uploading PDF file:', error);
        throw new Error('Failed to upload PDF file for analysis.');
      }
    }
  }

  /**
   * Clear the current document context
   */
  async clearDocumentContext(): Promise<void> {
    // Delete uploaded file if it exists
    if (this.uploadedFile) {
      try {
        await this.ai.files.delete({ name: this.uploadedFile.name });
        console.log('Uploaded file deleted:', this.uploadedFile.name);
      } catch (error) {
        console.error('Error deleting uploaded file:', error);
      }
      this.uploadedFile = null;
    }
    
    this.currentDocument = null;
  }

  /**
   * Send a message to Gemini AI and get a response
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No document context set. Please upload a document first.');
    }

    try {
      let prompt = this.buildPrompt(message);
      let contents: any;

      if (this.currentDocument.type === 'pdf' && this.uploadedFile) {
        // For PDF files with uploaded file
        contents = createUserContent([
          createPartFromUri(this.uploadedFile.uri, this.uploadedFile.mimeType),
          prompt
        ]);
      } else {
        // For text-based content
        contents = createUserContent([prompt]);
      }

      // Generate content using the new SDK
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: contents,
      });
      
      return response.text;
    } catch (error) {
      console.error('Error sending message to Gemini AI:', error);
      throw new Error('Failed to get response from AI. Please try again.');
    }
  }

  /**
   * Get a summary of the current document
   */
  async getDocumentSummary(): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No document context set. Please upload a document first.');
    }

    try {
      let prompt = this.buildSummaryPrompt();
      let contents: any;

      if (this.currentDocument.type === 'pdf' && this.uploadedFile) {
        // For PDF files with uploaded file
        contents = createUserContent([
          createPartFromUri(this.uploadedFile.uri, this.uploadedFile.mimeType),
          prompt
        ]);
      } else {
        // For text-based content
        contents = createUserContent([prompt]);
      }

      // Generate content using the new SDK
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: contents,
      });
      
      return response.text;
    } catch (error) {
      console.error('Error getting document summary:', error);
      throw new Error('Failed to generate document summary. Please try again.');
    }
  }

  /**
   * Build prompt for regular messages
   */
  private buildPrompt(message: string): string {
    const basePrompt = `You are an AI assistant analyzing a ${this.currentDocument!.type.toUpperCase()} document.

Document Information:
- File Type: ${this.currentDocument!.type.toUpperCase()}
- File Name: ${this.currentDocument!.fileName || 'Unknown'}`;

    let contentSection = '';
    if (this.currentDocument!.type !== 'pdf' && typeof this.currentDocument!.content === 'string') {
      contentSection = `

Document Content:
${this.currentDocument!.content}`;
    }

    return `${basePrompt}${contentSection}

User Question: ${message}

Please provide a helpful, accurate response based on the document content. Analyze the document thoroughly to answer the user's questions.

Response Guidelines:
1. Be specific and reference the document content
2. If asked about regulations, explain them clearly
3. If asked about cross-references, identify and explain them
4. Be helpful and informative
5. If something is unclear from the document, say so
6. For PDF documents, analyze both visual and textual elements

Please provide your response:`;
  }

  /**
   * Build prompt for document summary
   */
  private buildSummaryPrompt(): string {
    let prompt = `You are an AI assistant analyzing a ${this.currentDocument!.type.toUpperCase()} document. Please provide a comprehensive summary of the document content.

Document Information:
- File Type: ${this.currentDocument!.type.toUpperCase()}
- File Name: ${this.currentDocument!.fileName || 'Unknown'}`;

    // Add document content for non-PDF files
    if (this.currentDocument!.type !== 'pdf' && typeof this.currentDocument!.content === 'string') {
      prompt += `

Document Content:
${this.currentDocument!.content}`;
    }

    prompt += `

Please provide a detailed summary that includes:
1. Main topics and themes
2. Key regulations or points
3. Structure and organization
4. Important references or cross-references
5. Overall purpose and scope

Please provide your summary:`;

    return prompt;
  }

  /**
   * Check if a document context is set
   */
  hasDocumentContext(): boolean {
    return this.currentDocument !== null;
  }

  /**
   * Get current document information
   */
  getCurrentDocument(): DocumentContext | null {
    return this.currentDocument;
  }
}

// Export a singleton instance
export const geminiChatService = new GeminiChatService();