
import { DocumentData } from '@/store/regulationStore';
import { DocumentProcessor } from './documentProcessor';
import { useRegulationStore } from '@/store/regulationStore';

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
    // Clear any existing streaming data
    store.clearStreamingData();
    
    // Start streaming
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
          console.log('🎨 Canvas now showing final document structure');
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
