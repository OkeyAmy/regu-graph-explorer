
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GEMINI_API_KEY } from '@/config/api';
import { buildRegulatoryPromptStructure } from '@/services/prompts/systemPrompt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface StreamingChunk {
  type: 'metadata' | 'hierarchy_start' | 'node' | 'complete' | 'error';
  data: any;
  isPartial?: boolean;
}

export interface StreamingCallbacks {
  onChunk: (chunk: StreamingChunk) => void;
  onProgress: (progress: number, message: string) => void;
  onComplete: (finalData: any) => void;
  onError: (error: Error) => void;
}

export class DocumentStreamingService {
  private llm: ChatGoogleGenerativeAI;
  private accumulatedJson = '';
  private parsedNodes: any[] = [];
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
  }

  async streamDocumentParsing(
    documentText: string,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      // Reset state for new document
      this.accumulatedJson = '';
      this.parsedNodes = [];
      this.rawStreamBuffer = '';

      callbacks.onProgress(10, 'Starting AI analysis...');

      const promptStructure = buildRegulatoryPromptStructure(documentText);
      
      console.log('[DEBUG] System message length:', promptStructure.systemMessage.length);
      console.log('[DEBUG] User message length:', promptStructure.userMessage.length);
      
      callbacks.onProgress(20, 'Connecting to AI model...');

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
            console.log('[DEBUG] First 500 chars of raw stream:', this.rawStreamBuffer.substring(0, 500));
            firstChunkLogged = true;
          }
          
          this.accumulatedJson += content;
          
          // Try to parse partial JSON and extract complete nodes
          const extractedData = this.extractPartialData(this.accumulatedJson);
          
          if (extractedData.metadata && !this.parsedNodes.find(n => n.type === 'metadata')) {
            console.log('[DEBUG] Extracted metadata:', extractedData.metadata);
            callbacks.onChunk({
              type: 'metadata',
              data: extractedData.metadata
            });
            this.parsedNodes.push({ type: 'metadata', data: extractedData.metadata });
          }

          if (extractedData.nodes && extractedData.nodes.length > this.parsedNodes.filter(n => n.type === 'node').length) {
            const newNodes = extractedData.nodes.slice(this.parsedNodes.filter(n => n.type === 'node').length);
            console.log('[DEBUG] Extracted', newNodes.length, 'new nodes');
            for (const node of newNodes) {
              console.log('[DEBUG] Node:', node.id, node.type, node.title || 'no title');
              callbacks.onChunk({
                type: 'node',
                data: node,
                isPartial: !this.isCompleteNode(node)
              });
              this.parsedNodes.push({ type: 'node', data: node });
            }
          }

          // Update progress based on content length and estimated completion
          const progress = Math.min(90, 20 + (chunkCount * 2));
          callbacks.onProgress(progress, `Processing... (${chunkCount} chunks received)`);
        }
      }

      callbacks.onProgress(95, 'Finalizing document structure...');

      // Final parse attempt
      const finalData = this.parseCompleteJson(this.accumulatedJson);
      
      console.log('[DEBUG] Final accumulated JSON length:', this.accumulatedJson.length);
      console.log('[DEBUG] Final data structure:', {
        metadata: finalData.metadata,
        hierarchyCount: finalData.hierarchy?.length || 0
      });

      // Save JSON file to system
      this.saveJsonToFile(finalData);

      callbacks.onProgress(98, 'Saving analysis results...');
      
      callbacks.onComplete(finalData);
      callbacks.onProgress(100, 'Analysis complete!');

    } catch (error) {
      console.error('Streaming error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Streaming failed'));
    }
  }

  // Legacy method - now unused but kept for backward compatibility
  private buildAnalysisPrompt(documentText: string): string {
    const { systemMessage, userMessage } = buildRegulatoryPromptStructure(documentText);
    return `${systemMessage}\n\n${userMessage}`;
  }

  private extractPartialData(jsonStr: string): { metadata?: any; nodes?: any[] } {
    try {
      // Try to find complete metadata section
      const metadataMatch = jsonStr.match(/"metadata"\s*:\s*\{[^}]*\}/);
      let metadata = null;
      if (metadataMatch) {
        try {
          metadata = JSON.parse(`{${metadataMatch[0]}}`).metadata;
        } catch {}
      }

      // Try to find complete hierarchy nodes
      const nodes: any[] = [];
      const hierarchyMatch = jsonStr.match(/"hierarchy"\s*:\s*\[([\s\S]*)\]/);
      if (hierarchyMatch) {
        // Extract individual complete nodes from the hierarchy array
        this.extractCompleteNodes(hierarchyMatch[1], nodes);
      }

      return { metadata, nodes };
    } catch {
      return {};
    }
  }

  private extractCompleteNodes(hierarchyStr: string, nodes: any[]): void {
    // Simple heuristic to find complete node objects
    let braceCount = 0;
    let currentNode = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < hierarchyStr.length; i++) {
      const char = hierarchyStr[i];
      
      if (escapeNext) {
        escapeNext = false;
        currentNode += char;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentNode += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      currentNode += char;

      // If we've closed all braces and have a complete object
      if (braceCount === 0 && currentNode.trim().startsWith('{')) {
        try {
          const node = JSON.parse(currentNode.trim());
          if (node.id && node.type) {
            nodes.push(node);
          }
        } catch {}
        currentNode = '';
      }
    }
  }

  private isCompleteNode(node: any): boolean {
    return !!(node.id && node.type && node.number !== undefined && 
             node.level !== undefined && Array.isArray(node.references) && 
             Array.isArray(node.children));
  }

  private parseCompleteJson(jsonStr: string): any {
    // Use the existing parseJSONWithRecovery logic
    try {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Final JSON parse failed, using partial data');
    }
    
    return {
      metadata: this.extractPartialData(jsonStr).metadata || {
        title: "Partial Document",
        jurisdiction: "Unknown",
        document_type: "Partial",
        source: "Streaming Parse"
      },
      hierarchy: this.extractPartialData(jsonStr).nodes || []
    };
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
      
      console.log('[DEBUG] JSON file saved:', filename);
    } catch (error) {
      console.error('[DEBUG] Failed to save JSON file:', error);
    }
  }
}
