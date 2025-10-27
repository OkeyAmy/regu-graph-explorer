import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRegulationStore } from '@/store/regulationStore';
import { Card } from '@/components/ui/card';
import { HierarchyNode } from '@/store/regulationStore';
import { EntityNode as LangExtractEntityNode, EntityRelationship } from '@/types/langextract';

interface GraphVisualizationProps {
  className?: string;
}

export function GraphVisualization({ className }: GraphVisualizationProps) {
  const {
    documentData,
    entityGraph,
    graphMode,
    setSelectedNodeId,
    setHighlightedSections,
  } = useRegulationStore();

  // Build hierarchy nodes
  const hierarchyFlowData = useMemo(() => {
    if (!documentData?.hierarchy) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;

    const processNode = (node: HierarchyNode, level: number, parentId?: string) => {
      const xPosition = level * 250;
      const yPosition = yOffset;
      yOffset += 100;

      // Create flow node
      nodes.push({
        id: node.id,
        type: 'default',
        position: { x: xPosition, y: yPosition },
        data: {
          label: (
            <div className="px-2 py-1 text-xs">
              <div className="font-semibold">{node.number}</div>
              <div className="text-muted-foreground truncate max-w-[150px]">
                {node.title || node.type}
              </div>
            </div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Create edge to parent
      if (parentId) {
        edges.push({
          id: `${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: 'smoothstep',
          animated: false,
        });
      }

      // Process children
      node.children.forEach((child) => {
        processNode(child, level + 1, node.id);
      });
    };

    documentData.hierarchy.forEach((rootNode) => {
      processNode(rootNode, 0);
    });

    return { nodes, edges };
  }, [documentData]);

  // Build entity graph nodes
  const entityFlowData = useMemo(() => {
    if (!entityGraph?.entities || entityGraph.entities.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create nodes for entities
    entityGraph.entities.forEach((entity, index) => {
      const angle = (index / entityGraph.entities.length) * 2 * Math.PI;
      const radius = 300;
      const x = Math.cos(angle) * radius + 400;
      const y = Math.sin(angle) * radius + 300;

      nodes.push({
        id: entity.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="px-3 py-2 text-xs">
              <div className="font-semibold">{entity.name}</div>
              <div className="text-muted-foreground text-[10px]">{entity.type}</div>
            </div>
          ),
        },
      });
    });

    // Create edges for relationships
    entityGraph.relationships.forEach((rel) => {
      edges.push({
        id: rel.id,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        type: 'smoothstep',
        label: rel.relationship_type,
        labelStyle: { fontSize: 10 },
        animated: true,
      });
    });

    return { nodes, edges };
  }, [entityGraph]);

  // Select the appropriate data based on mode
  const flowData = graphMode === 'hierarchy' ? hierarchyFlowData : entityFlowData;

  const [nodes, , onNodesChange] = useNodesState(flowData.nodes);
  const [edges, , onEdgesChange] = useEdgesState(flowData.edges);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setHighlightedSections([node.id]);
    },
    [setSelectedNodeId, setHighlightedSections]
  );

  if (!documentData && !entityGraph) {
    return (
      <Card className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground p-6">
          <p className="text-sm">No graph data available</p>
          <p className="text-xs mt-2">Upload a document to visualize its structure</p>
        </div>
      </Card>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground p-6">
          <p className="text-sm">
            {graphMode === 'hierarchy' 
              ? 'No hierarchy data available' 
              : 'No entities extracted'}
          </p>
          <p className="text-xs mt-2">
            {graphMode === 'hierarchy'
              ? 'The document structure will appear here'
              : 'Entity relationships will appear here'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`h-full overflow-hidden ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-background"
        />
      </ReactFlow>
    </Card>
  );
}

