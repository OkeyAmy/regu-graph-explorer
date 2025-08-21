import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Hash, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRegulationStore, HierarchyNode } from '@/store/regulationStore';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  node: HierarchyNode;
  level: number;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  searchQuery: string;
}

function TreeNode({ 
  node, 
  level, 
  expandedNodes, 
  onToggleExpand, 
  onSelectNode, 
  selectedNodeId,
  searchQuery 
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = (node.children || []).length > 0;
  
  // Highlight search matches
  const matchesSearch = searchQuery && (
    node.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'part':
        return <Hash className="h-3 w-3" />;
      case 'section':
        return <FileText className="h-3 w-3" />;
      default:
        return <List className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'part':
        return 'text-blue-600';
      case 'section':
        return 'text-green-600';
      case 'subsection':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-sm cursor-pointer hover:bg-muted/50 text-sm",
          isSelected && "bg-primary/10 text-primary",
          matchesSearch && "bg-yellow-50 border border-yellow-200",
          level > 0 && "ml-4"
        )}
        // keep padding left for nesting but avoid inline styles for linter
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectNode(node.id)}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {!hasChildren && <div className="w-6" />}
        
        <div className={cn("flex items-center gap-1 flex-1 min-w-0", getTypeColor(node.type))}>
          {getTypeIcon(node.type)}
          
          <span className="font-medium">
            {node.number}
          </span>
          
          {node.title && (
            <span className="truncate text-muted-foreground">
              {node.title}
            </span>
          )}
          
          {!node.title && node.text && (
            <span className="truncate text-muted-foreground">
              {node.text.substring(0, 50)}...
            </span>
          )}
          
          {(node.references || []).length > 0 && (
            <span className="text-xs text-primary bg-primary/10 px-1 rounded">
              {(node.references || []).length}
            </span>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((childNode) => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeNavigationPanel() {
  const { documentData, selectedNodeId, setSelectedNodeId, searchQuery } = useRegulationStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (!documentData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No document loaded
      </div>
    );
  }

  const handleToggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleExpandAll = () => {
    const allNodes = new Set<string>();
    const collectNodeIds = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allNodes.add(node.id);
          collectNodeIds(node.children);
        }
      });
    };
    collectNodeIds(documentData.hierarchy);
    setExpandedNodes(allNodes);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  return (
    <div className="h-full flex flex-col border-r bg-muted/20">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Document Outline</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleExpandAll} className="h-7 w-7 p-0" title="Expand all" aria-label="Expand all">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCollapseAll} className="h-7 w-7 p-0" title="Collapse all" aria-label="Collapse all">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {documentData.metadata.title}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {documentData.hierarchy.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              expandedNodes={expandedNodes}
              onToggleExpand={handleToggleExpand}
              onSelectNode={handleSelectNode}
              selectedNodeId={selectedNodeId}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}