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
  const { documentData, selectedNodeId, setSelectedNodeId, activeFilters, searchQuery } = useRegulationStore();
  const rf = useReactFlow();
  const [lastNodeCount, setLastNodeCount] = useState(0);
  const [showReferences, setShowReferences] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'circular' | 'tree'>('hierarchical');
  const { fitView } = useReactFlow();

  // Apply filters to the hierarchy when not streaming
  const applyFiltersToHierarchy = useCallback((nodes: HierarchyNode[]) => {
    if (!activeFilters || activeFilters.size === 0) return nodes;

    const hasFilter = (node: HierarchyNode) => {
      // If multiple filters selected, node must match any of them (OR semantics)
      const checks: boolean[] = [];
      if (activeFilters.has('sections')) checks.push(node.type === 'section');
      if (activeFilters.has('references')) checks.push((node.references || []).length > 0);
      if (activeFilters.has('definitions')) checks.push(/definition/i.test(node.title || '') || /definition/i.test(node.text || ''));
      return checks.length === 0 ? true : checks.some(Boolean);
    };

    const filterRec = (input: HierarchyNode[]): HierarchyNode[] => {
      return input.reduce<HierarchyNode[]>((acc, n) => {
        const filteredChildren = filterRec(n.children || []);
        // keep node if it matches or any child matches
        if (hasFilter(n) || filteredChildren.length > 0) {
          acc.push({ ...n, children: filteredChildren });
        }
        return acc;
      }, []);
    };

    return filterRec(nodes);
  }, [activeFilters]);

  // Use streaming nodes if available, otherwise fall back to document data
  const activeNodes = streamingNodes.length > 0 ? streamingNodes : (applyFiltersToHierarchy(documentData?.hierarchy || []));

  // Calculate node size based on content - moved before useMemo to avoid temporal dead zone
  const calculateNodeSize = useCallback((node: HierarchyNode) => {
    const baseWidth = 200;
    const baseHeight = 80;
    
    // Null safety checks for node properties
    const text = node?.text || '';
    const level = node?.level || 0;
    
    // Adjust size based on text length and hierarchy level
    const textFactor = Math.min(text.length / 100, 2);
    const levelFactor = Math.max(1, 6 - level) * 0.1;
    
    return {
      width: baseWidth + (textFactor * 50) + (levelFactor * 20),
      height: baseHeight + (textFactor * 20) + (levelFactor * 10),
    };
  }, []);

  // Memoized layout calculation with improved tree spacing and coloring
  const { nodes, edges } = useMemo(() => {
    if (!activeNodes || activeNodes.length === 0) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();

    const useCompactLayout = activeNodes.length > 60;
    const horizontalGap = useCompactLayout ? 120 : 220; // horizontal spacing between sibling subtrees
    const verticalGap = useCompactLayout ? 120 : 180; // vertical spacing between levels

    // map types to subtle colors for better readability
    const typeColorMap: Record<string, string> = {
      part: '#E6F0FF',
      section: '#E8FFEB',
      subsection: '#FFF4E6',
      paragraph: '#F3E8FF',
      default: '#FFFFFF'
    };

    // compute subtree width based on leaf count to space siblings proportionally
    const computeSubtreeWidth = (node: HierarchyNode): number => {
      const children = node.children || [];
      if (children.length === 0) {
        const size = calculateNodeSize(node);
        return Math.max(size.width, 160) + horizontalGap;
      }
      return children.reduce((sum, c) => sum + computeSubtreeWidth(c), 0);
    };

    const calculateLayout = (hierarchyNodes: HierarchyNode[], startX = 0, startY = 0, level = 0) => {
      let xCursor = startX;
      let maxY = startY;

      hierarchyNodes.forEach((node) => {
        const subtreeWidth = computeSubtreeWidth(node);
        // place node centered over its subtree
        const nodeX = xCursor + subtreeWidth / 2;
        const nodeY = startY + level * verticalGap;

        nodePositions.set(node.id, { x: nodeX, y: nodeY });

        const isNewNode = isStreaming && nodes.length >= lastNodeCount;
        const nodeSize = calculateNodeSize(node);

        // color by type
        const bg = typeColorMap[(node.type || 'default').toLowerCase()] || typeColorMap.default;

        nodes.push({
          id: node.id,
          position: { x: nodeX, y: nodeY },
          data: {
            label: (node.text || '').substring(0, 100),
            type: node.type || '',
            number: node.number || '',
            title: node.title || '',
            references: (node.references || []).length,
            hasChildren: (node.children || []).length > 0,
            isSelected: selectedNodeId === node.id,
            isStreaming: isNewNode,
            isHighlighted: highlightedReferences.includes(node.id),
            fullText: node.text || '',
            level: node.level || 0,
          },
          type: 'regulation',
          style: {
            width: nodeSize.width,
            height: nodeSize.height,
            backgroundColor: bg,
            border: '1px solid rgba(15,23,42,0.06)',
            boxShadow: '0 6px 18px rgba(15,23,42,0.04)'
          },
          className: [
            selectedNodeId === node.id ? 'selected' : '',
            isNewNode ? 'streaming-node animate-scale-in' : '',
            highlightedReferences.includes(node.id) ? 'highlighted' : '',
            `level-${node.level}`,
          ].filter(Boolean).join(' '),
        });

        if ((node.children || []).length > 0) {
          // recursively layout children within this subtree region
          calculateLayout(node.children || [], xCursor, startY, level + 1);
        }

        // advance cursor by subtree width
        xCursor += subtreeWidth;
        maxY = Math.max(maxY, nodeY + nodeSize.height);
      });

      return maxY + verticalGap;
    };

    // center the whole layout by computing total width first
    const totalWidth = activeNodes.reduce((s, n) => s + computeSubtreeWidth(n), 0);
    const startX = Math.max(80, totalWidth < 800 ? (800 - totalWidth) / 2 : 40);

    calculateLayout(activeNodes, startX, 80, 0);

    // Create edges with adaptive styling
    const createEdges = (hierarchyNodes: HierarchyNode[]) => {
      hierarchyNodes.forEach((node) => {
        (node.children || []).forEach((child) => {
          edges.push({
            id: `hierarchy-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: 'smoothstep',
            data: { type: 'hierarchy' },
            style: { 
              stroke: 'hsl(var(--border))', 
              strokeWidth: 2,
              opacity: isStreaming ? 0.8 : 0.9,
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))' },
            animated: isStreaming,
          });
        });

        if (showReferences) {
          (node.references || []).forEach((ref, index) => {
            if (ref.type === 'internal' && ref.target !== 'external' && nodePositions.has(ref.target)) {
              const isHighlighted = highlightedReferences.includes(node.id) || highlightedReferences.includes(ref.target);
              edges.push({
                id: `reference-${node.id}-${ref.target}-${index}`,
                source: node.id,
                target: ref.target,
                type: 'reference',
                data: { type: 'reference', referenceText: ref.text, isHighlighted },
                animated: isHighlighted,
                style: isHighlighted ? { stroke: 'hsl(var(--destructive))', strokeWidth: 3 } : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
                markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
              });
            }
          });
        }

        createEdges(node.children || []);
      });
    };

    createEdges(activeNodes);

    return { nodes, edges };
  }, [activeNodes, selectedNodeId, isStreaming, lastNodeCount, highlightedReferences, showReferences, layoutMode, calculateNodeSize]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update node count for animation tracking
  useEffect(() => {
    if (isStreaming && nodes.length > lastNodeCount) {
      setLastNodeCount(nodes.length);
    }
  }, [nodes.length, isStreaming, lastNodeCount]);

  // Auto-fit view when new nodes are added (with larger padding for visibility)
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        // Increase padding so nodes aren't tightly packed against the viewport
        fitView({ padding: 0.18, duration: 500 });
      }, 120);
    }
  }, [nodes.length, fitView]);

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
        
        <Button variant="outline" size="sm" onClick={() => rf.zoomOut()} className="bg-background/90 backdrop-blur-sm">
          <span className="sr-only">Zoom out</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
        <Button variant="outline" size="sm" onClick={() => rf.zoomIn()} className="bg-background/90 backdrop-blur-sm">
          <span className="sr-only">Zoom in</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>

        <select
          value={layoutMode}
          onChange={(e) => setLayoutMode(e.target.value as any)}
          className="px-3 py-1 text-sm bg-background/90 backdrop-blur-sm border rounded-md"
          title="Graph Layout Mode"
          aria-label="Graph Layout Mode"
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
        panOnScroll={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Controls showInteractive={true} />
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