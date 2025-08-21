/**
 * Document chunking service using LangChain's RecursiveCharacterTextSplitter
 * Handles large documents by splitting them into manageable chunks while preserving context
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export interface DocumentChunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    totalChunks: number;
  };
}

export class DocumentChunker {
  private textSplitter: RecursiveCharacterTextSplitter;
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig = {
    chunkSize: 8000,  // Conservative chunk size for token limits
    chunkOverlap: 1000, // Preserve context between chunks
    separators: ['\n\n', '\n', '. ', ' ', ''] // Prioritize semantic breaks
  }) {
    this.config = config;
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: config.separators,
    });
  }

  /**
   * Split large document into manageable chunks
   */
  async chunkDocument(documentText: string): Promise<DocumentChunk[]> {
    try {
      // Check if document needs chunking
      if (documentText.length <= this.config.chunkSize) {
        return [{
          content: documentText,
          index: 0,
          metadata: {
            startChar: 0,
            endChar: documentText.length,
            totalChunks: 1
          }
        }];
      }

      // Split into chunks
      const chunks = await this.textSplitter.splitText(documentText);
      
      // Create chunk objects with metadata
      let currentPosition = 0;
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => {
        const startChar = currentPosition;
        const endChar = startChar + chunk.length;
        currentPosition = endChar - this.config.chunkOverlap; // Account for overlap
        
        return {
          content: chunk,
          index,
          metadata: {
            startChar,
            endChar,
            totalChunks: chunks.length
          }
        };
      });

      return documentChunks;
    } catch (error) {
      console.error('Document chunking failed:', error);
      throw new Error(`Failed to chunk document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate token count for a text (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if text exceeds safe token limits
   */
  exceedsTokenLimit(text: string, maxTokens: number = 30000): boolean {
    return this.estimateTokenCount(text) > maxTokens;
  }
}