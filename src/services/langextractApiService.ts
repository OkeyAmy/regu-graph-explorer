/**
 * LangExtract API Service
 * Handles communication with FastAPI backend
 */

import { ExtractionResponse, ProcessingStatus } from '@/types/langextract';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export interface UploadOptions {
  file?: File;
  url?: string;
  sessionId: string;
  onProgress?: (status: ProcessingStatus) => void;
  onComplete?: (response: ExtractionResponse) => void;
  onError?: (error: Error) => void;
}

class LangExtractApiService {
  /**
   * Check if backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Upload and process document
   */
  async uploadDocument(options: UploadOptions): Promise<ExtractionResponse> {
    const { file, url, sessionId, onProgress, onComplete, onError } = options;

    if (!file && !url) {
      throw new Error('Either file or url must be provided');
    }

    try {
      // Create WebSocket connection for progress updates
      const ws = new WebSocket(`${WS_BASE_URL}/ws/${sessionId}`);

      ws.onopen = () => {
        console.log('WebSocket connected for session:', sessionId);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'progress':
              onProgress?.(message.data);
              break;
              
            case 'complete':
              onComplete?.(message.data);
              ws.close();
              break;
              
            case 'error':
              onError?.(new Error(message.data.message));
              ws.close();
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error('WebSocket connection failed'));
      };

      // Upload file or URL
      const formData = new FormData();
      formData.append('session_id', sessionId);

      if (file) {
        formData.append('file', file);
        
        console.log(`🚀 Sending POST to ${API_BASE_URL}/api/extract with file:`, file.name);
        const response = await fetch(`${API_BASE_URL}/api/extract`, {
          method: 'POST',
          body: formData,
        });

        console.log('📥 Received response:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          console.error('❌ Error response:', errorData);
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result: ExtractionResponse = await response.json();
        console.log('✅ Extraction result received:', result);
        return result;
      } else if (url) {
        formData.append('url', url);
        
        const response = await fetch(`${API_BASE_URL}/api/extract-url`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result: ExtractionResponse = await response.json();
        return result;
      } else {
        throw new Error('No file or URL provided');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      onError?.(error instanceof Error ? error : new Error('Upload failed'));
      throw error;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const langextractApi = new LangExtractApiService();

