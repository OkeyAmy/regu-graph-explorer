/**
 * Canvas wrapper that provides ReactFlow context
 */

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