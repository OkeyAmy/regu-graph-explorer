/**
 * Enhanced streaming service with chunking support and robust token management
 * Handles large documents by processing them in chunks and streaming responses progressively
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GEMINI_API_KEY } from '@/config/api';
import { DocumentChunker, DocumentChunk } from './DocumentChunker';
import { StreamingParser, ParsedChunk } from './StreamingParser';
import { HierarchyNode } from '@/store/regulationStore';

export interface StreamingChunk {
  type: 'metadata' | 'hierarchy_start' | 'node' | 'complete' | 'error' | 'chunk_complete';
  data: any;
  isPartial?: boolean;
  chunkIndex?: number;
  totalChunks?: number;
}

export interface StreamingCallbacks {
  onChunk: (chunk: StreamingChunk) => void;
  onProgress: (progress: number, message: string) => void;
  onComplete: (finalData: any) => void;
  onError: (error: Error) => void;
}

export class EnhancedStreamingService {
  private llm: ChatGoogleGenerativeAI;
  private chunker: DocumentChunker;
  private parser: StreamingParser;
  private mergedHierarchy: HierarchyNode[] = [];
  private mergedMetadata: any = null;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      streaming: true,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    
    this.chunker = new DocumentChunker();
    this.parser = new StreamingParser();
  }

  /**
   * Process document with automatic chunking and streaming
   */
  async streamDocumentParsing(
    documentText: string,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      // Reset state for new document
      this.parser.resetState();
      this.mergedHierarchy = [];
      this.mergedMetadata = null;

      callbacks.onProgress(5, 'Analyzing document size...');

      // Check if document needs chunking
      if (this.chunker.exceedsTokenLimit(documentText)) {
        await this.processLargeDocument(documentText, callbacks);
      } else {
        await this.processSingleDocument(documentText, callbacks);
      }

    } catch (error) {
      console.error('Enhanced streaming error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Streaming failed'));
    }
  }

  /**
   * Process large document in chunks
   */
  private async processLargeDocument(
    documentText: string,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    callbacks.onProgress(10, 'Splitting large document into chunks...');
    
    const chunks = await this.chunker.chunkDocument(documentText);
    callbacks.onProgress(15, `Processing ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const baseProgress = 15 + (i / chunks.length) * 75;
      
      callbacks.onProgress(
        baseProgress, 
        `Processing chunk ${i + 1} of ${chunks.length}...`
      );

      await this.processChunk(chunk, callbacks);
      
      callbacks.onChunk({
        type: 'chunk_complete',
        data: { chunkIndex: i, totalChunks: chunks.length },
        chunkIndex: i,
        totalChunks: chunks.length
      });
    }

    // Finalize merged results
    this.finalizeMergedResults(callbacks);
  }

  /**
   * Process single document (fits within token limits)
   */
  private async processSingleDocument(
    documentText: string,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    callbacks.onProgress(10, 'Starting AI analysis...');

    const prompt = this.buildAnalysisPrompt(documentText);
    callbacks.onProgress(15, 'Connecting to AI model...');

    const stream = await this.llm.stream(prompt);
    let chunkCount = 0;

    for await (const chunk of stream) {
      chunkCount++;
      const content = chunk.content || '';
      
      if (typeof content === 'string') {
        const parsedChunks = this.parser.processChunk(content);
        
        // Forward parsed chunks to callbacks
        parsedChunks.forEach(parsedChunk => {
          if (parsedChunk.type === 'metadata' && !this.mergedMetadata) {
            this.mergedMetadata = parsedChunk.data;
          } else if (parsedChunk.type === 'node') {
            this.mergedHierarchy.push(parsedChunk.data);
          }
          
          callbacks.onChunk({
            type: parsedChunk.type as any,
            data: parsedChunk.data,
            isPartial: parsedChunk.isPartial
          });
        });

        // Update progress
        const progress = Math.min(90, 15 + (chunkCount * 2));
        callbacks.onProgress(progress, `Processing... (${chunkCount} chunks received)`);
      }
    }

    this.finalizeMergedResults(callbacks);
  }

  /**
   * Process individual document chunk
   */
  private async processChunk(
    chunk: DocumentChunk,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const prompt = this.buildChunkAnalysisPrompt(chunk);
    
    const stream = await this.llm.stream(prompt);
    const parser = new StreamingParser(); // Fresh parser for each chunk
    
    for await (const streamChunk of stream) {
      const content = streamChunk.content || '';
      
      if (typeof content === 'string') {
        const parsedChunks = parser.processChunk(content, chunk.index);
        
        // Process each parsed chunk
        parsedChunks.forEach(parsedChunk => {
          if (parsedChunk.type === 'metadata' && !this.mergedMetadata) {
            this.mergedMetadata = parsedChunk.data;
          } else if (parsedChunk.type === 'node') {
            // Merge nodes from different chunks
            this.mergeHierarchyNode(parsedChunk.data);
          }
          
          callbacks.onChunk({
            type: parsedChunk.type as any,
            data: parsedChunk.data,
            isPartial: parsedChunk.isPartial,
            chunkIndex: chunk.index,
            totalChunks: chunk.metadata.totalChunks
          });
        });
      }
    }
  }

  /**
   * Merge hierarchy nodes from different chunks
   */
  private mergeHierarchyNode(node: HierarchyNode): void {
    const existingIndex = this.mergedHierarchy.findIndex(n => n.id === node.id);
    
    if (existingIndex >= 0) {
      // Merge with existing node
      const existing = this.mergedHierarchy[existingIndex];
      this.mergedHierarchy[existingIndex] = {
        ...existing,
        text: existing.text + ' ' + node.text,
        references: [...existing.references, ...node.references],
        children: this.mergeChildren(existing.children, node.children)
      };
    } else {
      // Add new node
      this.mergedHierarchy.push(node);
    }
  }

  /**
   * Merge children arrays from different chunks
   */
  private mergeChildren(existing: HierarchyNode[], incoming: HierarchyNode[]): HierarchyNode[] {
    const merged = [...existing];
    
    incoming.forEach(incomingChild => {
      const existingIndex = merged.findIndex(e => e.id === incomingChild.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          text: merged[existingIndex].text + ' ' + incomingChild.text,
          references: [...merged[existingIndex].references, ...incomingChild.references],
          children: this.mergeChildren(merged[existingIndex].children, incomingChild.children)
        };
      } else {
        merged.push(incomingChild);
      }
    });
    
    return merged;
  }

  /**
   * Finalize merged results and send completion
   */
  private finalizeMergedResults(callbacks: StreamingCallbacks): void {
    callbacks.onProgress(95, 'Finalizing document structure...');

    const finalData = {
      metadata: this.mergedMetadata || {
        title: "Processed Document",
        jurisdiction: "Unknown", 
        document_type: "Document",
        source: "Streaming Parse"
      },
      hierarchy: this.mergedHierarchy
    };

    callbacks.onComplete(finalData);
    callbacks.onProgress(100, 'Analysis complete!');
  }

  /**
   * Build analysis prompt for full document
   */
  private buildAnalysisPrompt(documentText: string): string {
    return `Parse the regulatory document into a structured JSON that represents the hierarchy and all cross-references, preserving verbatim text.

**Instructions for Gemini**:

1.  **Document Structure Detection**:
    - Identify the main **Parts** (e.g., "PART I - PRELIMINARY", "PART II - ADMINISTRATION OF ACT").
    - Within each Part, detect **Sections** (e.g., "1. Short title and commencement", "2. Interpretation").
    - For each Section, extract **Subsections** (e.g., "(1)", "(2)") and **Paragraphs** (e.g., "(a)", "(b)", "(i)", "(ii)").
    - Preserve the exact nesting and numbering styles found in the document (e.g., "Article 2", "Art. 2º", "Section 1", "1(a)").

2.  **Reference Extraction**:
    - Find all cross-references in the text, such as:
        - "under section 9"
        - "pursuant to subsection (2)"
        - "in accordance with section 39(2)(b)"
        - "as defined in Section 2(1)"
    - Map each reference to its target using a unique ID system based on the hierarchy (e.g., "sec9" for Section 9, "sec2:p1" for Section 2, Paragraph 1).
    - Classify references as "internal" (within the document) or "external" (to other laws).

3.  **Text Preservation**:
    - Copy text verbatim without rephrasing or summarizing.
    - Include all formatting like italics or quotes as plain text, but note any emphasis in the metadata if needed.

4.  **JSON Output Structure**:
    - The output should be a JSON object with metadata and a hierarchy array.
    - Each element in the hierarchy should have:
        - \`id\`: A unique identifier (e.g., "part1", "sec2", "sec2:p1").
        - \`type\`: The element type (e.g., "part", "section", "subsection", "paragraph").
        - \`number\`: The official number or label (e.g., "1", "(1)", "(a)").
        - \`title\`: The title or heading if available (e.g., "Short title and commencement").
        - \`text\`: The verbatim text content.
        - \`level\`: The nesting level (e.g., 1 for part, 2 for section, 3 for subsection, etc.).
        - \`references\`: An array of reference objects, each with:
            - \`target\`: The ID of the referenced element (e.g., "sec9").
            - \`text\`: The exact reference text from the content.
            - \`type\`: "internal" or "external".
        - \`children\`: An array of child elements for nesting.

**Document to parse:**
${documentText}

Return only the JSON, no other text.`;
  }

  /**
   * Build analysis prompt for document chunk
   */
  private buildChunkAnalysisPrompt(chunk: DocumentChunk): string {
    return `Parse this chunk of a regulatory document (chunk ${chunk.index + 1} of ${chunk.metadata.totalChunks}). Follow the same JSON structure as specified above, but note this is a partial document.

**Document chunk to parse:**
${chunk.content}

Return only the JSON for this chunk, no other text.`;
  }
}