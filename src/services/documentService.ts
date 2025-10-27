import { DocumentData } from '@/store/regulationStore';
import { DocumentProcessor } from './documentProcessor';
import { useRegulationStore } from '@/store/regulationStore';
import { langextractApi } from './langextractApiService';
import { ProcessingStatus as LangExtractStatus } from '@/types/langextract';

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'cleaning' | 'parsing' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
  currentSection?: string;
}

/**
 * Main document service that orchestrates the processing pipeline
 * Now uses modular streaming architecture
 */
export async function processDocument(
  input: File | string,
  setProcessingState: (state: ProcessingState) => void
): Promise<void> {
  const processor = new DocumentProcessor();
  const store = useRegulationStore.getState();

  try {
    // Clear any existing data
    store.clearStreamingData();
    store.setExtractionMethod('quick');
    
    // Immediately extract and show raw document content
    await extractAndShowRawDocument(input, setProcessingState, store);
    
    // Try LangExtract backend first (hybrid approach)
    console.log('🚀 Attempting LangExtract processing...');
    await processWithLangExtract(input, setProcessingState);
    
    // If LangExtract succeeded, we're done
    if (store.getState().extractionMethod === 'langextract') {
      console.log('✅ LangExtract processing completed successfully');
      return;
    }
    
    // Fallback: Start quick AI processing in background
    console.log('⚡ Falling back to quick processing...');
    store.setStreamingState({ 
      isStreaming: true,
      streamingProgress: 0 
    });

    await processor.processDocument(input, {
      onProgress: (state) => {
        setProcessingState(state);
        store.setStreamingState({ streamingProgress: state.progress });
      },
      
      onStreamingChunk: (chunk) => {
        console.log('Streaming chunk received:', chunk.type, chunk.data);
        
        switch (chunk.type) {
          case 'metadata':
            store.setStreamingState({ 
              streamingMetadata: chunk.data 
            });
            break;
            
          case 'node':
            if (chunk.data && chunk.data.id) {
              store.addStreamingNode(chunk.data);
            }
            break;
            
          case 'chunk_complete':
            console.log(`Chunk ${chunk.data.chunkIndex + 1} of ${chunk.data.totalChunks} completed`);
            setProcessingState({
              stage: 'parsing',
              progress: 30 + ((chunk.data.chunkIndex + 1) / chunk.data.totalChunks) * 60,
              message: `Processed chunk ${chunk.data.chunkIndex + 1} of ${chunk.data.totalChunks}...`
            });
            break;
            
          case 'complete':
            console.log('Streaming complete');
            break;
            
          case 'error':
            console.error('Streaming error:', chunk.data);
            break;
        }
      },
      
      onComplete: (documentData) => {
        console.log('Document processing complete:', documentData);
        
        // Set final document data
        store.setDocumentData(documentData);
        
        // Clear streaming state
        store.setStreamingState({ 
          isStreaming: false,
          streamingProgress: 100 
        });
        
        // Show completion message with node count
        console.log(`✅ Processing complete! Generated ${documentData.hierarchy.length} nodes`);
        
        // Clear streaming data after a brief delay to show completion
        setTimeout(() => {
          store.clearStreamingData();
          console.log('🎨 Document structure now complete');
        }, 1500);
      },
      
      onError: (error) => {
        console.error('Document processing failed:', error);
        
        setProcessingState({
          stage: 'error',
          progress: 0,
          message: error.message || 'Processing failed'
        });
        
        store.setStreamingState({ 
          isStreaming: false,
          streamingProgress: 0 
        });
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    
    setProcessingState({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
    
    store.setStreamingState({ 
      isStreaming: false,
      streamingProgress: 0 
    });
  }
}

/**
 * Extract and show raw document content immediately
 */
async function extractAndShowRawDocument(
  input: File | string,
  setProcessingState: (state: ProcessingState) => void,
  store: ReturnType<typeof useRegulationStore.getState>
): Promise<void> {
  
  setProcessingState({
    stage: 'uploading',
    progress: 10,
    message: 'Extracting content...'
  });

  // Brief extraction delay (immediate display after upload)
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    if (typeof input === 'string') {
      // Handle URL input
      setProcessingState({
        stage: 'cleaning',
        progress: 50,
        message: 'Fetching webpage content...'
      });

      // For now, set placeholder content - in real implementation would fetch URL
      const urlContent = `<div class="url-content">
        <h1>Website Content</h1>
        <p>URL: ${input}</p>
        <p>This is where the extracted and formatted website content would appear.</p>
        <p>The content would be properly organized for readability and navigation.</p>
      </div>`;
      
      store.setRawDocumentContent(urlContent, 'url', input);
      
    } else {
      // Handle file input
      const fileName = input.name;
      
      if (input.type === 'application/pdf') {
        // Read PDF as ArrayBuffer
        const arrayBuffer = await input.arrayBuffer();
        store.setRawDocumentContent(arrayBuffer, 'pdf', fileName);
        
      } else if (input.type === 'text/html') {
        // Read HTML content
        const textContent = await input.text();
        store.setRawDocumentContent(textContent, 'html', fileName);
        
      } else {
        // Read as text
        const textContent = await input.text();
        store.setRawDocumentContent(textContent, 'text', fileName);
      }
    }

    setProcessingState({
      stage: 'parsing',
      progress: 100,
      message: 'Document ready for viewing'
    });

  } catch (error) {
    console.error('Error extracting document:', error);
    throw error;
  }
}

/**
 * Process document with LangExtract backend (hybrid approach)
 * This runs in background after quick preview is shown
 */
async function processWithLangExtract(
  input: File | string,
  setProcessingState: (state: ProcessingState) => void
): Promise<void> {
  const store = useRegulationStore.getState();
  
  try {
    // Only process files for now (URL support coming later)
    if (typeof input === 'string') {
      console.log('URL extraction with LangExtract not yet implemented');
      return;
    }

    // Check backend health first
    console.log('🔍 Checking LangExtract backend health...');
    const isHealthy = await langextractApi.healthCheck();
    if (!isHealthy) {
      console.warn('⚠️ LangExtract backend is not available, skipping enhanced extraction');
      return;
    }
    console.log('✅ Backend is healthy, proceeding with extraction');

    // Generate session ID for WebSocket updates
    const sessionId = langextractApi.generateSessionId();
    console.log('📡 Generated session ID:', sessionId);

    setProcessingState({
      stage: 'parsing',
      progress: 10,
      message: 'Connecting to LangExtract backend...'
    });

    // Upload document and wait for completion
    console.log('📤 Uploading document to backend...');
    const result = await langextractApi.uploadDocument({
      file: input,
      sessionId,
      onProgress: (status: LangExtractStatus) => {
        console.log('📊 Progress update:', status);
        setProcessingState({
          stage: status.stage as any,
          progress: status.progress,
          message: status.message,
        });
      },
      onComplete: (response) => {
        console.log('✅ LangExtract processing complete:', response);
        
        // Update store with langextract data
        store.setDocumentData(response.document_data);
        store.setEntityGraph(response.entity_graph);
        store.setExtractionMethod('langextract');
        
        setProcessingState({
          stage: 'complete',
          progress: 100,
          message: `LangExtract analysis complete in ${response.processing_time.toFixed(1)}s`
        });
      },
      onError: (error) => {
        console.error('❌ LangExtract processing failed:', error);
        
        setProcessingState({
          stage: 'error',
          progress: 0,
          message: `LangExtract error: ${error.message}`
        });
      }
    });
    
    console.log('✅ Upload request sent, result:', result);

  } catch (error) {
    console.error('Failed to process with LangExtract:', error);
    // Don't throw - allow quick preview to remain usable
  }
}