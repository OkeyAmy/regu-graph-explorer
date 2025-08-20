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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRegulationStore } from '@/store/regulationStore';

export function GraphCanvas() {
  const { documentData, selectedNodeId, setSelectedNodeId } = useRegulationStore();

  // Convert document data to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!documentData) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Simple layout for now - convert hierarchy to nodes
    const processNode = (hierarchyNode: any, x: number, y: number, level: number) => {
      nodes.push({
        id: hierarchyNode.id,
        position: { x: x + level * 200, y },
        data: {
          label: `${hierarchyNode.number}: ${hierarchyNode.title || hierarchyNode.text.substring(0, 50)}...`,
          type: hierarchyNode.type,
          references: hierarchyNode.references.length
        },
        type: 'default',
        className: selectedNodeId === hierarchyNode.id ? 'selected' : '',
      });

      // Add hierarchy edges to children
      hierarchyNode.children.forEach((child: any, index: number) => {
        edges.push({
          id: `${hierarchyNode.id}-${child.id}`,
          source: hierarchyNode.id,
          target: child.id,
          type: 'smoothstep',
          style: { stroke: '#94a3b8' }
        });
        
        processNode(child, x, y + (index + 1) * 100, level + 1);
      });

      // Add reference edges
      hierarchyNode.references.forEach((ref: any, index: number) => {
        if (ref.type === 'internal' && ref.target !== 'external') {
          edges.push({
            id: `ref-${hierarchyNode.id}-${ref.target}-${index}`,
            source: hierarchyNode.id,
            target: ref.target,
            type: 'default',
            style: { stroke: '#ef4444', strokeDasharray: '5,5' },
            animated: true
          });
        }
      });
    };

    documentData.hierarchy.forEach((node, index) => {
      processNode(node, 0, index * 150, 0);
    });

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
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}