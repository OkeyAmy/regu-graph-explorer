import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { useRegulationStore } from '@/store/regulationStore';

export function DetailPanel() {
  const { documentData, selectedNodeId, setSelectedNodeId, findNodeById } = useRegulationStore();
  
  const selectedNode = selectedNodeId ? findNodeById(selectedNodeId) : null;

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground border-l">
        <div className="text-center p-6">
          <p className="text-sm">Select a node to view details</p>
        </div>
      </div>
    );
  }

  const handleReferenceClick = (targetId: string) => {
    if (targetId !== 'external') {
      setSelectedNodeId(targetId);
    }
  };

  const renderTextWithReferences = (text: string, references: any[]) => {
    if (references.length === 0) return text;

    let result = text;
    const parts: Array<{ type: 'text' | 'reference'; content: string; target?: string }> = [];
    let lastIndex = 0;

    // Sort references by their position in the text
    const sortedRefs = references
      .map(ref => ({
        ...ref,
        index: text.toLowerCase().indexOf(ref.text.toLowerCase())
      }))
      .filter(ref => ref.index !== -1)
      .sort((a, b) => a.index - b.index);

    sortedRefs.forEach(ref => {
      // Add text before reference
      if (ref.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, ref.index)
        });
      }
      
      // Add reference
      parts.push({
        type: 'reference',
        content: ref.text,
        target: ref.target
      });
      
      lastIndex = ref.index + ref.text.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return (
      <div>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          } else {
            return (
              <Button
                key={index}
                variant="link"
                size="sm"
                className="p-0 h-auto font-normal text-primary underline hover:text-primary/80"
                onClick={() => part.target && handleReferenceClick(part.target)}
              >
                {part.content}
                {part.target === 'external' && (
                  <ExternalLink className="h-3 w-3 ml-1" />
                )}
              </Button>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-l">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {selectedNode.type}
          </Badge>
          <span className="font-semibold">{selectedNode.number}</span>
        </div>
        
        {selectedNode.title && (
          <h3 className="font-medium text-sm mb-2">{selectedNode.title}</h3>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Level {selectedNode.level}</span>
          {selectedNode.references.length > 0 && (
            <span>{selectedNode.references.length} references</span>
          )}
          {selectedNode.children.length > 0 && (
            <span>{selectedNode.children.length} children</span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Node Text */}
          <div>
            <h4 className="font-medium text-sm mb-2">Content</h4>
            <div className="text-sm leading-relaxed bg-muted/30 p-3 rounded-md">
              {renderTextWithReferences(selectedNode.text, selectedNode.references)}
            </div>
          </div>

          {/* References */}
          {selectedNode.references.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">References</h4>
              <div className="space-y-2">
                {selectedNode.references.map((ref, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-sm"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-medium text-primary">
                        {ref.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ref.type === 'external' ? 'External reference' : `Points to ${ref.target}`}
                      </p>
                    </div>
                    
                    {ref.type === 'internal' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReferenceClick(ref.target)}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {ref.type === 'external' && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Children */}
          {selectedNode.children.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Sub-sections</h4>
              <div className="space-y-1">
                {selectedNode.children.map((child) => (
                  <Button
                    key={child.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNodeId(child.id)}
                    className="w-full justify-start h-auto p-2 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {child.type}
                        </Badge>
                        <span className="font-medium text-xs">{child.number}</span>
                      </div>
                      {child.title && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {child.title}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}