import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { FileText, Hash, List, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegulationNodeData {
  label: string;
  type: string;
  number: string;
  title?: string;
  references: number;
  hasChildren: boolean;
  isSelected: boolean;
}

interface RegulationNodeProps {
  data: RegulationNodeData;
  selected?: boolean;
}

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
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'section':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'subsection':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'paragraph':
      return 'bg-purple-50 border-purple-200 text-purple-800';
    default:
      return 'bg-muted/50 border border-border text-foreground';
  }
};

export default memo(function RegulationNode({ data, selected }: RegulationNodeProps) {
  const { label, type, number, title, references, hasChildren, isSelected } = data;

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[300px] rounded-lg border-2 bg-background shadow-md transition-all duration-200",
        isSelected || selected 
          ? "border-primary shadow-lg ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50 hover:shadow-lg",
        getTypeColor(type)
      )}
    >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary-foreground !w-3 !h-3"
      />

      <div className="p-3 space-y-2">
        {/* Header with type and number */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(type)}
            <Badge variant="outline" className="text-xs font-semibold">
              {type}
            </Badge>
            <span className="font-bold text-sm">{number}</span>
          </div>
          
          {references > 0 && (
            <div className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">{references}</span>
            </div>
          )}
        </div>

        {/* Title or content preview */}
        <div className="text-sm">
          {title ? (
            <p className="font-medium text-foreground line-clamp-2">{title}</p>
          ) : (
            <p className="text-muted-foreground line-clamp-3">{label}</p>
          )}
        </div>

        {/* Indicators */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {hasChildren && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Has children
            </span>
          )}
        </div>
      </div>

      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary-foreground !w-3 !h-3"
      />
    </div>
  );
});