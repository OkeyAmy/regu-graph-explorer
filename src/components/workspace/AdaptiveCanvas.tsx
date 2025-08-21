/**
 * Adaptive canvas that renders streaming data progressively
 * Optimized for real-time updates and responsive design
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRegulationStore, HierarchyNode } from '@/store/regulationStore';
import RegulationNode from './nodes/RegulationNode';
import ReferenceEdge from './edges/ReferenceEdge';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const nodeTypes = {
  regulation: RegulationNode,
};

const edgeTypes = {
  reference: ReferenceEdge,
};

interface AdaptiveCanvasProps {
  streamingNodes?: HierarchyNode[];
  isStreaming?: boolean;
  streamingProgress?: number;
  highlightedReferences?: string[];
  chunkProgress?: {
    currentChunk: number;
    totalChunks: number;
  };
}

export function AdaptiveCanvas({ 
  streamingNodes = [], 
  isStreaming = false, 
  streamingProgress = 0,
  highlightedReferences = [],
  chunkProgress
}: AdaptiveCanvasProps) {
  const { documentData, selectedNodeId, setSelectedNodeId } = useRegulationStore();
  const [lastNodeCount, setLastNodeCount] = useState(0);
  const [showReferences, setShowReferences] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'circular' | 'tree'>('hierarchical');
  const { fitView } = useReactFlow();

  // Use streaming nodes if available, otherwise fall back to document data
  const activeNodes = streamingNodes.length > 0 ? streamingNodes : (documentData?.hierarchy || []);

  // Memoized layout calculation with adaptive positioning
  const { nodes, edges } = useMemo(() => {
    if (activeNodes.length === 0) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // Adaptive layout based on number of nodes
    const useCompactLayout = activeNodes.length > 50;
    const levelSpacing = useCompactLayout ? 200 : 300;
    const nodeSpacing = useCompactLayout ? 100 : 150;
    
    const calculateLayout = (hierarchyNodes: HierarchyNode[], startX = 0, startY = 0, level = 0) => {
      let currentY = startY;
      
      hierarchyNodes.forEach((node, index) => {
        let x: number, y: number;
        
        switch (layoutMode) {
          case 'circular':
            const angle = (index / hierarchyNodes.length) * 2 * Math.PI;
            const radius = 200 + level * 100;
            x = startX + Math.cos(angle) * radius;
            y = startY + Math.sin(angle) * radius;
            break;
            
          case 'tree':
            x = startX + (index - hierarchyNodes.length / 2) * levelSpacing;
            y = startY + level * nodeSpacing;
            break;
            
          default: // hierarchical
            x = startX + level * levelSpacing;
            y = currentY;
        }
        
        nodePositions.set(node.id, { x, y });
        
        // Determine if this node is newly added (for animation)
        const isNewNode = isStreaming && nodes.length >= lastNodeCount;
        const nodeSize = calculateNodeSize(node);
        
        nodes.push({
          id: node.id,
          position: { x, y },
          data: {
            label: node.text.substring(0, 100),
            type: node.type,
            number: node.number,
            title: node.title,
            references: node.references.length,
            hasChildren: node.children.length > 0,
            isSelected: selectedNodeId === node.id,
            isStreaming: isNewNode,
            isHighlighted: highlightedReferences.includes(node.id),
            fullText: node.text,
            level: node.level,
          },
          type: 'regulation',
          style: {
            width: nodeSize.width,
            height: nodeSize.height,
          },
          className: [
            selectedNodeId === node.id ? 'selected' : '',
            isNewNode ? 'streaming-node animate-scale-in' : '',
            highlightedReferences.includes(node.id) ? 'highlighted' : '',
            `level-${node.level}`,
          ].filter(Boolean).join(' '),
        });

        if (node.children.length > 0) {
          const childrenHeight = calculateLayout(node.children, startX, currentY + nodeSpacing, level + 1);
          currentY = Math.max(currentY + nodeSpacing, childrenHeight);
        } else {
          currentY += nodeSpacing;
        }
      });
      
      return currentY;
    };

    calculateLayout(activeNodes);

    // Create edges with adaptive styling
    const createEdges = (hierarchyNodes: HierarchyNode[]) => {
      hierarchyNodes.forEach((node) => {
        // Hierarchy edges
        node.children.forEach((child) => {
          edges.push({
            id: `hierarchy-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: 'smoothstep',
            data: { type: 'hierarchy' },
            style: { 
              stroke: 'hsl(var(--border))', 
              strokeWidth: 2,
              opacity: isStreaming ? 0.7 : 1,
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))' },
            animated: isStreaming,
          });
        });

        // Reference edges with conditional rendering
        if (showReferences) {
          node.references.forEach((ref, index) => {
            if (ref.type === 'internal' && ref.target !== 'external' && nodePositions.has(ref.target)) {
              const isHighlighted = highlightedReferences.includes(node.id) || 
                                   highlightedReferences.includes(ref.target);
              
              edges.push({
                id: `reference-${node.id}-${ref.target}-${index}`,
                source: node.id,
                target: ref.target,
                type: 'reference',
                data: { 
                  type: 'reference',
                  referenceText: ref.text,
                  isHighlighted 
                },
                animated: isHighlighted,
                style: isHighlighted 
                  ? { stroke: 'hsl(var(--destructive))', strokeWidth: 3 } 
                  : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
                markerEnd: { 
                  type: MarkerType.ArrowClosed, 
                  color: isHighlighted ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' 
                },
              });
            }
          });
        }

        createEdges(node.children);
      });
    };

    createEdges(activeNodes);

    return { nodes, edges };
  }, [activeNodes, selectedNodeId, isStreaming, lastNodeCount, highlightedReferences, showReferences, layoutMode]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update node count for animation tracking
  useEffect(() => {
    if (isStreaming && nodes.length > lastNodeCount) {
      setLastNodeCount(nodes.length);
    }
  }, [nodes.length, isStreaming, lastNodeCount]);

  // Auto-fit view when new nodes are added
  useEffect(() => {
    if (isStreaming && nodes.length > 0) {
      setTimeout(() => {
        // Auto-fit with padding
        fitView({ padding: 0.1, duration: 500 });
      }, 100);
    }
  }, [nodes.length, isStreaming]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Calculate node size based on content
  const calculateNodeSize = useCallback((node: HierarchyNode) => {
    const baseWidth = 200;
    const baseHeight = 80;
    
    // Adjust size based on text length and hierarchy level
    const textFactor = Math.min(node.text.length / 100, 2);
    const levelFactor = Math.max(1, 6 - node.level) * 0.1;
    
    return {
      width: baseWidth + (textFactor * 50) + (levelFactor * 20),
      height: baseHeight + (textFactor * 20) + (levelFactor * 10),
    };
  }, []);

  if (!documentData && !isStreaming) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No document loaded</p>
          <p className="text-sm">Upload a document to see the graph visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background relative">
      {/* Controls toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowReferences(!showReferences)}
          className="bg-background/90 backdrop-blur-sm"
        >
          {showReferences ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          References
        </Button>
        
        <select
          value={layoutMode}
          onChange={(e) => setLayoutMode(e.target.value as any)}
          className="px-3 py-1 text-sm bg-background/90 backdrop-blur-sm border rounded-md"
        >
          <option value="hierarchical">Hierarchical</option>
          <option value="tree">Tree</option>
          <option value="circular">Circular</option>
        </select>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Streaming Analysis</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(streamingProgress)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${streamingProgress}%` }}
              />
            </div>
            
            {chunkProgress && (
              <div className="text-xs text-muted-foreground">
                Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}
              </div>
            )}
            
            {streamingNodes.length > 0 && (
              <Badge variant="secondary" className="text-xs w-full justify-center">
                {streamingNodes.length} nodes rendered
              </Badge>
            )}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={!isStreaming}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls showInteractive={false} />
        <MiniMap 
          nodeClassName={(node) => {
            switch (node.data.type) {
              case 'part': return 'fill-blue-500';
              case 'section': return 'fill-green-500';  
              case 'subsection': return 'fill-orange-500';
              case 'paragraph': return 'fill-purple-500';
              default: return 'fill-slate-500';
            }
          }}
          maskColor="hsl(var(--background) / 0.8)"
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        <Background 
          color="hsl(var(--muted-foreground))" 
          gap={16} 
          className="opacity-30"
        />
      </ReactFlow>
    </div>
  );
}