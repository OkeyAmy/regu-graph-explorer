
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRegulationStore, HierarchyNode } from '@/store/regulationStore';
import RegulationNode from './nodes/RegulationNode';
import ReferenceEdge from './edges/ReferenceEdge';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const nodeTypes = {
  regulation: RegulationNode,
};

const edgeTypes = {
  reference: ReferenceEdge,
};

interface StreamingGraphCanvasProps {
  streamingNodes?: HierarchyNode[];
  isStreaming?: boolean;
  streamingProgress?: number;
  highlightedReferences?: string[];
}

export function StreamingGraphCanvas({ 
  streamingNodes = [], 
  isStreaming = false, 
  streamingProgress = 0,
  highlightedReferences = [] 
}: StreamingGraphCanvasProps) {
  const { documentData, selectedNodeId, setSelectedNodeId } = useRegulationStore();
  const [lastNodeCount, setLastNodeCount] = useState(0);

  // Use streaming nodes if available, otherwise fall back to document data
  const activeNodes = streamingNodes.length > 0 ? streamingNodes : (documentData?.hierarchy || []);

  // Convert nodes to React Flow format with streaming animations
  const { nodes, edges } = useMemo(() => {
    if (activeNodes.length === 0) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    const calculateLayout = (hierarchyNodes: HierarchyNode[], startX = 0, startY = 0, level = 0) => {
      let currentY = startY;
      const levelSpacing = 300;
      const nodeSpacing = 150;
      
      hierarchyNodes.forEach((node, index) => {
        const x = startX + level * levelSpacing;
        const y = currentY;
        
        nodePositions.set(node.id, { x, y });
        
        // Determine if this node is newly added (for animation)
        const isNewNode = isStreaming && nodes.length >= lastNodeCount;
        
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
          },
          type: 'regulation',
          className: [
            selectedNodeId === node.id ? 'selected' : '',
            isNewNode ? 'streaming-node' : '',
            highlightedReferences.includes(node.id) ? 'highlighted' : ''
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

    // Create edges with reference highlighting
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
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
          });
        });

        // Reference edges with highlighting
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
              style: isHighlighted ? { stroke: '#ef4444', strokeWidth: 3 } : undefined,
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                color: isHighlighted ? '#ef4444' : '#ef4444' 
              },
            });
          }
        });

        createEdges(node.children);
      });
    };

    createEdges(activeNodes);

    return { nodes, edges };
  }, [activeNodes, selectedNodeId, isStreaming, lastNodeCount, highlightedReferences]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update node count for animation tracking
  useEffect(() => {
    if (isStreaming) {
      setLastNodeCount(nodes.length);
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
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Streaming Analysis</span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(streamingProgress)}%</span>
            </div>
            <div className="w-32 bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${streamingProgress}%` }}
              />
            </div>
          </div>
          {streamingNodes.length > 0 && (
            <Badge variant="secondary" className="mt-2 text-xs">
              {streamingNodes.length} nodes rendered
            </Badge>
          )}
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
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
        <MiniMap 
          nodeClassName={(node) => {
            switch (node.data.type) {
              case 'part': return 'fill-blue-400';
              case 'section': return 'fill-green-400';  
              case 'subsection': return 'fill-orange-400';
              default: return 'fill-purple-400';
            }
          }}
          maskColor="rgb(240, 240, 240, 0.8)"
        />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
}
