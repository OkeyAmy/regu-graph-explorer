
import { EnhancedStreamingService, StreamingCallbacks } from './streaming/EnhancedStreamingService';
import { DocumentData, HierarchyNode } from '@/store/regulationStore';

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'cleaning' | 'parsing' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
  currentSection?: string;
}

/**
 * Clean document processor that handles file/URL input and delegates
 * AI processing to the streaming service
 */
export class DocumentProcessor {
  private streamingService: EnhancedStreamingService;

  constructor() {
    this.streamingService = new EnhancedStreamingService();
  }

  /**
   * Process a document with streaming AI analysis
   */
  async processDocument(
    input: File | string,
    callbacks: {
      onProgress: (state: ProcessingState) => void;
      onStreamingChunk: (chunk: any) => void;
      onComplete: (data: DocumentData) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      // Stage 1: Extract text content
      callbacks.onProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Reading document content...'
      });

      const { rawText, fileName } = await this.extractTextContent(input);

      // Stage 2: Clean text
      callbacks.onProgress({
        stage: 'cleaning',
        progress: 20,
        message: 'Cleaning and preprocessing text...'
      });

      const cleanedText = this.cleanDocumentText(rawText);

      // Stage 3: Stream AI analysis
      callbacks.onProgress({
        stage: 'parsing',
        progress: 30,
        message: 'Starting AI analysis with streaming...'
      });

      const streamingCallbacks: StreamingCallbacks = {
        onChunk: callbacks.onStreamingChunk,
        onProgress: (progress, message) => {
          callbacks.onProgress({
            stage: 'parsing',
            progress: Math.min(90, 30 + progress * 0.6),
            message
          });
        },
        onComplete: (parsedData) => {
          const documentData: DocumentData = {
            metadata: {
              title: parsedData.metadata?.title || fileName,
              jurisdiction: parsedData.metadata?.jurisdiction || 'Unknown',
              document_type: parsedData.metadata?.document_type || 'Document',
              source: fileName,
            },
            hierarchy: parsedData.hierarchy || [],
          };

          callbacks.onProgress({
            stage: 'complete',
            progress: 100,
            message: 'Analysis complete!'
          });

          callbacks.onComplete(documentData);
        },
        onError: callbacks.onError
      };

      await this.streamingService.streamDocumentParsing(cleanedText, streamingCallbacks);

    } catch (error) {
      console.error('Document processing error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Processing failed'));
    }
  }

  /**
   * Extract text content from file or URL
   */
  private async extractTextContent(input: File | string): Promise<{ rawText: string; fileName: string }> {
    if (typeof input === 'string') {
      return await this.extractFromUrl(input);
    } else {
      return await this.extractFromFile(input);
    }
  }

  /**
   * Extract text from URL
   */
  private async extractFromUrl(url: string): Promise<{ rawText: string; fileName: string }> {
    const fileName = url.split('/').pop() || 'document';
    
    try {
      let response;
      
      try {
        response = await fetch(url, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (directError) {
        // Fallback to CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl);
        
        if (!proxyResponse.ok) {
          throw new Error(`Proxy fetch failed: HTTP ${proxyResponse.status}`);
        }
        
        const proxyData = await proxyResponse.json();
        if (!proxyData.contents) {
          throw new Error('No content received from proxy');
        }
        
        return { rawText: proxyData.contents, fileName };
      }
      
      const rawText = await response.text();
      return { rawText, fileName };
      
    } catch (error) {
      throw new Error(`Failed to fetch document from URL: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  /**
   * Extract text from file
   */
  private async extractFromFile(file: File): Promise<{ rawText: string; fileName: string }> {
    const fileName = file.name;
    
    if (file.type === 'application/pdf') {
      const rawText = await this.extractTextFromPDF(file);
      return { rawText, fileName };
    } else {
      const rawText = await file.text();
      return { rawText, fileName };
    }
  }

  /**
   * Extract text from PDF using pdf.js
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Dynamic import for better bundle splitting
      const pdfjsLib = await import('pdfjs-dist');
      
      const worker = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
        { type: 'module' }
      );
      (pdfjsLib.GlobalWorkerOptions as any).workerPort = worker;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        disableFontFace: true,
        isEvalSupported: false,
      }).promise;
      
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items as any[])
          .map((item: any) => item.str)
          .join(' ');
        text += pageText + '\n';
      }
      
      return text;
    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean and normalize document text
   */
  private cleanDocumentText(rawText: string): string {
    return rawText
      .replace(/Page\s*-?\s*\d+/gi, '')
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
}
