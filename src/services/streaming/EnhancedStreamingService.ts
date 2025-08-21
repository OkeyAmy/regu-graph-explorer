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
import { buildRegulatoryPromptStructure } from '@/services/prompts/systemPrompt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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
  private rawStreamBuffer = ''; // For debug logging

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
      this.rawStreamBuffer = '';

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

    console.log('[DEBUG] Enhanced - Processing', chunks.length, 'chunks');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const baseProgress = 15 + (i / chunks.length) * 75;
      
      callbacks.onProgress(
        baseProgress, 
        `Processing chunk ${i + 1} of ${chunks.length}...`
      );

      console.log('[DEBUG] Enhanced - Starting chunk', i + 1, 'of', chunks.length);
      await this.processChunk(chunk, callbacks);
      
      callbacks.onChunk({
        type: 'chunk_complete',
        data: { chunkIndex: i, totalChunks: chunks.length },
        chunkIndex: i,
        totalChunks: chunks.length
      });

      console.log('[DEBUG] Enhanced - Completed chunk', i + 1, 'of', chunks.length);
    }

    console.log('[DEBUG] Enhanced - All chunks processed, finalizing results...');
    console.log('[DEBUG] Enhanced - Final hierarchy length:', this.mergedHierarchy.length);
    console.log('[DEBUG] Enhanced - Final metadata:', this.mergedMetadata);

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

    const promptStructure = buildRegulatoryPromptStructure(documentText);
    
    console.log('[DEBUG] Enhanced - System message length:', promptStructure.systemMessage.length);
    console.log('[DEBUG] Enhanced - User message length:', promptStructure.userMessage.length);
    
    callbacks.onProgress(15, 'Connecting to AI model...');

    const messages = [
      new SystemMessage(promptStructure.systemMessage),
      new HumanMessage(promptStructure.userMessage)
    ];

    const stream = await this.llm.stream(messages);
    let chunkCount = 0;
    let firstChunkLogged = false;

    for await (const chunk of stream) {
      chunkCount++;
      const content = chunk.content || '';
      
      if (typeof content === 'string') {
        this.rawStreamBuffer += content;
        
        // Debug log first 500 chars of raw stream
        if (!firstChunkLogged && this.rawStreamBuffer.length >= 500) {
          console.log('[DEBUG] Enhanced - First 500 chars of raw stream:', this.rawStreamBuffer.substring(0, 500));
          firstChunkLogged = true;
        }
        
        const parsedChunks = this.parser.processChunk(content);
        
        console.log('[DEBUG] Enhanced - Parser returned', parsedChunks.length, 'chunks');
        
        // Forward parsed chunks to callbacks
        parsedChunks.forEach(parsedChunk => {
          if (parsedChunk.type === 'metadata' && !this.mergedMetadata) {
            console.log('[DEBUG] Enhanced - Merged metadata:', parsedChunk.data);
            this.mergedMetadata = parsedChunk.data;
          } else if (parsedChunk.type === 'node') {
            console.log('[DEBUG] Enhanced - Merged node:', parsedChunk.data.id, parsedChunk.data.type);
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
    const promptStructure = this.buildChunkPromptStructure(chunk);
    
    console.log('[DEBUG] Enhanced - Chunk', chunk.index, 'system message length:', promptStructure.systemMessage.length);
    
    const messages = [
      new SystemMessage(promptStructure.systemMessage),
      new HumanMessage(promptStructure.userMessage)
    ];
    
    const stream = await this.llm.stream(messages);
    const parser = new StreamingParser(); // Fresh parser for each chunk
    
    for await (const streamChunk of stream) {
      const content = streamChunk.content || '';
      
      if (typeof content === 'string') {
        const parsedChunks = parser.processChunk(content, chunk.index);
        
        console.log('[DEBUG] Enhanced - Chunk', chunk.index, 'parser returned', parsedChunks.length, 'chunks');
        
        // Process each parsed chunk
        parsedChunks.forEach(parsedChunk => {
          if (parsedChunk.type === 'metadata' && !this.mergedMetadata) {
            console.log('[DEBUG] Enhanced - Chunk', chunk.index, 'metadata:', parsedChunk.data);
            this.mergedMetadata = parsedChunk.data;
          } else if (parsedChunk.type === 'node') {
            // Merge nodes from different chunks
            console.log('[DEBUG] Enhanced - Chunk', chunk.index, 'merging node:', parsedChunk.data.id, parsedChunk.data.type);
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
      console.log('[DEBUG] Enhanced - Merging existing node:', node.id, 'text length:', node.text?.length || 0);
      this.mergedHierarchy[existingIndex] = {
        ...existing,
        text: existing.text + ' ' + node.text,
        references: [...existing.references, ...node.references],
        children: this.mergeChildren(existing.children, node.children)
      };
    } else {
      // Add new node
      console.log('[DEBUG] Enhanced - Adding new node:', node.id, node.type, 'text length:', node.text?.length || 0);
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

    console.log('[DEBUG] Enhanced - Final merged data:', {
      metadata: finalData.metadata,
      hierarchyCount: finalData.hierarchy?.length || 0,
      rawStreamBufferLength: this.rawStreamBuffer.length
    });

    // Save JSON file to system
    this.saveJsonToFile(finalData);

    callbacks.onProgress(98, 'Saving analysis results...');
    
    // Send completion signal
    callbacks.onComplete(finalData);
    callbacks.onProgress(100, 'Analysis complete!');
  }

  /**
   * Save the final JSON to a downloadable file
   */
  private saveJsonToFile(data: any): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `regulatory-analysis-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('[DEBUG] Enhanced - JSON file saved:', filename);
    } catch (error) {
      console.error('[DEBUG] Enhanced - Failed to save JSON file:', error);
    }
  }

  /**
   * Build analysis prompt for full document (legacy)
   */
  private buildAnalysisPrompt(documentText: string): string {
    const { systemMessage, userMessage } = buildRegulatoryPromptStructure(documentText);
    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * Build chunk prompt structure for system/user messages
   */
  private buildChunkPromptStructure(chunk: DocumentChunk): { systemMessage: string; userMessage: string } {
    const basePromptStructure = buildRegulatoryPromptStructure('');
    
    const systemMessage = `${basePromptStructure.systemMessage}

**IMPORTANT**: This is chunk ${chunk.index + 1} of ${chunk.metadata.totalChunks} from a larger document. Parse only this chunk following the same JSON structure, but note this is a partial document.`;
    
    const userMessage = `Document chunk to parse:
${chunk.content}`;
    
    return { systemMessage, userMessage };
  }
}