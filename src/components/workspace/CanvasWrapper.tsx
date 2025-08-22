/**
 * Canvas wrapper that provides ReactFlow context
 * COMMENTED OUT as per TODO.md - Canvas visualization removed in favor of document viewer
 */

/*
import { ReactFlowProvider } from '@xyflow/react';
import { AdaptiveCanvas } from './AdaptiveCanvas';
import { HierarchyNode } from '@/store/regulationStore';

interface CanvasWrapperProps {
  streamingNodes?: HierarchyNode[];
  isStreaming?: boolean;
  streamingProgress?: number;
  highlightedReferences?: string[];
  chunkProgress?: {
    currentChunk: number;
    totalChunks: number;
  };
}

export function CanvasWrapper(props: CanvasWrapperProps) {
  return (
    <ReactFlowProvider>
      <AdaptiveCanvas {...props} />
    </ReactFlowProvider>
  );
}
*/

// Canvas components commented out - now using DocumentViewer instead
export function CanvasWrapper() {
  return (
    <div className="h-full flex items-center justify-center bg-background text-muted-foreground">
      <p>Canvas visualization removed - now using document viewer</p>
    </div>
  );
}