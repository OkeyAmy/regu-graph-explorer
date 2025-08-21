/**
 * Advanced streaming JSON parser with robust partial parsing capabilities
 * Handles incomplete JSON responses and progressive data extraction
 */

import { HierarchyNode } from '@/store/regulationStore';

export interface ParsedChunk {
  type: 'metadata' | 'node' | 'complete' | 'error';
  data: any;
  isPartial: boolean;
  chunkIndex?: number;
}

export interface StreamingParseState {
  accumulatedJson: string;
  parsedMetadata?: any;
  parsedNodes: HierarchyNode[];
  currentChunkIndex: number;
  isComplete: boolean;
  lastValidJsonEnd: number;
  error?: Error;
}

export class StreamingParser {
  private state: StreamingParseState;
  private lastValidJsonEnd: number = 0;

  constructor() {
    this.resetState();
  }

  /**
   * Reset parser state for new document
   */
  resetState(): void {
    this.state = {
      accumulatedJson: '',
      parsedNodes: [],
      currentChunkIndex: 0,
      isComplete: false,
      lastValidJsonEnd: 0
    };
  }

  /**
   * Process streaming chunk and extract valid JSON objects
   */
  processChunk(chunk: string, chunkIndex: number = 0): ParsedChunk[] {
    this.state.currentChunkIndex = chunkIndex;
    this.state.accumulatedJson += chunk;

    const results: ParsedChunk[] = [];
    
    try {
      // Extract metadata if not already parsed
      if (!this.state.parsedMetadata) {
        const metadata = this.extractMetadata();
        if (metadata) {
          this.state.parsedMetadata = metadata;
          results.push({
            type: 'metadata',
            data: metadata,
            isPartial: false,
            chunkIndex
          });
        }
      }

      // Extract new complete nodes
      const newNodes = this.extractNewNodes();
      newNodes.forEach(node => {
        this.state.parsedNodes.push(node);
        results.push({
          type: 'node',
          data: node,
          isPartial: false,
          chunkIndex
        });
      });

      // Check if parsing is complete
      if (this.isParsingComplete()) {
        this.state.isComplete = true;
        results.push({
          type: 'complete',
          data: {
            metadata: this.state.parsedMetadata,
            hierarchy: this.state.parsedNodes
          },
          isPartial: false,
          chunkIndex
        });
      }

    } catch (error) {
      console.error('Streaming parse error:', error);
      results.push({
        type: 'error',
        data: error,
        isPartial: true,
        chunkIndex
      });
    }

    return results;
  }

  /**
   * Extract metadata from accumulated JSON
   */
  private extractMetadata(): any | null {
    try {
      // Look for complete metadata object
      const metadataPattern = /"metadata"\s*:\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})/;
      const match = this.state.accumulatedJson.match(metadataPattern);
      
      if (match) {
        const metadataJson = `{"metadata":${match[1]}}`;
        const parsed = JSON.parse(metadataJson);
        return parsed.metadata;
      }
    } catch (error) {
      // Ignore parsing errors for partial data
    }
    
    return null;
  }

  /**
   * Extract new complete nodes from accumulated JSON
   */
  private extractNewNodes(): HierarchyNode[] {
    const newNodes: HierarchyNode[] = [];
    
    try {
      // Find hierarchy array start
      const hierarchyMatch = this.state.accumulatedJson.match(/"hierarchy"\s*:\s*\[/);
      if (!hierarchyMatch) return newNodes;

      const hierarchyStart = hierarchyMatch.index! + hierarchyMatch[0].length;
      const hierarchyContent = this.state.accumulatedJson.substring(hierarchyStart);
      
      // Extract complete node objects
      const extractedNodes = this.extractCompleteObjects(hierarchyContent);
      
      // Only return nodes we haven't parsed yet
      const startIndex = this.state.parsedNodes.length;
      return extractedNodes.slice(startIndex);

    } catch (error) {
      console.warn('Node extraction error:', error);
    }
    
    return newNodes;
  }

  /**
   * Extract complete JSON objects from a string using brace matching
   */
  private extractCompleteObjects(jsonString: string): any[] {
    const objects: any[] = [];
    let braceCount = 0;
    let currentObject = '';
    let inString = false;
    let escapeNext = false;
    let objectStart = -1;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (escapeNext) {
        escapeNext = false;
        currentObject += char;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentObject += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) {
            objectStart = i;
            currentObject = '';
          }
          braceCount++;
        }
        
        if (char === '}') {
          braceCount--;
        }
      }

      currentObject += char;

      // Complete object found
      if (braceCount === 0 && objectStart >= 0 && currentObject.trim()) {
        try {
          const obj = JSON.parse(currentObject.trim());
          if (this.isValidHierarchyNode(obj)) {
            objects.push(obj);
          }
        } catch (parseError) {
          // Skip invalid JSON objects
        }
        
        currentObject = '';
        objectStart = -1;
      }
    }

    return objects;
  }

  /**
   * Validate if object is a valid hierarchy node
   */
  private isValidHierarchyNode(obj: any): boolean {
    return obj && 
           typeof obj.id === 'string' && 
           typeof obj.type === 'string' && 
           typeof obj.level === 'number' &&
           Array.isArray(obj.references) &&
           Array.isArray(obj.children);
  }

  /**
   * Check if parsing appears complete based on JSON structure
   */
  private isParsingComplete(): boolean {
    const trimmed = this.state.accumulatedJson.trim();
    
    // Check for complete JSON structure
    const hasOpeningBrace = trimmed.startsWith('{');
    const hasClosingBrace = trimmed.endsWith('}');
    
    if (!hasOpeningBrace || !hasClosingBrace) {
      return false;
    }

    // Try to parse complete JSON
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current parser state
   */
  getState(): StreamingParseState {
    return { ...this.state };
  }

  /**
   * Force final parsing attempt with recovery
   */
  forceComplete(): any {
    try {
      // Try parsing accumulated JSON
      const result = JSON.parse(this.state.accumulatedJson);
      return result;
    } catch (error) {
      console.warn('Force complete parsing failed, using partial data');
      
      // Return partial data as fallback
      return {
        metadata: this.state.parsedMetadata || {
          title: "Partial Document", 
          jurisdiction: "Unknown",
          document_type: "Partial",
          source: "Streaming Parse"
        },
        hierarchy: this.state.parsedNodes
      };
    }
  }
}