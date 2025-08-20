import { useCallback, useMemo } from 'react';
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

const nodeTypes = {
  regulation: RegulationNode,
};

const edgeTypes = {
  reference: ReferenceEdge,
};

export function GraphCanvas() {
  const { documentData, selectedNodeId, setSelectedNodeId } = useRegulationStore();

  // Convert document data to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!documentData) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // Calculate positions using a hierarchical layout
    const calculateLayout = (hierarchyNodes: HierarchyNode[], startX = 0, startY = 0, level = 0) => {
      let currentY = startY;
      const levelSpacing = 300;
      const nodeSpacing = 150;
      
      hierarchyNodes.forEach((node, index) => {
        const x = startX + level * levelSpacing;
        const y = currentY;
        
        nodePositions.set(node.id, { x, y });
        
        // Create React Flow node
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
          },
          type: 'regulation',
          className: selectedNodeId === node.id ? 'selected' : '',
        });

        // Process children
        if (node.children.length > 0) {
          const childrenHeight = calculateLayout(node.children, startX, currentY + nodeSpacing, level + 1);
          currentY = Math.max(currentY + nodeSpacing, childrenHeight);
        } else {
          currentY += nodeSpacing;
        }
      });
      
      return currentY;
    };

    calculateLayout(documentData.hierarchy);

    // Create edges after all nodes are positioned
    const createEdges = (hierarchyNodes: HierarchyNode[]) => {
      hierarchyNodes.forEach((node) => {
        // Hierarchy edges (parent to children)
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

        // Reference edges
        node.references.forEach((ref, index) => {
          if (ref.type === 'internal' && ref.target !== 'external' && nodePositions.has(ref.target)) {
            edges.push({
              id: `reference-${node.id}-${ref.target}-${index}`,
              source: node.id,
              target: ref.target,
              type: 'reference',
              data: { 
                type: 'reference',
                referenceText: ref.text 
              },
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
            });
          }
        });

        // Recursively process children
        createEdges(node.children);
      });
    };

    createEdges(documentData.hierarchy);

    return { nodes, edges };
  }, [documentData, selectedNodeId]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

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

  if (!documentData) {
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
    <div className="h-full w-full bg-background">
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