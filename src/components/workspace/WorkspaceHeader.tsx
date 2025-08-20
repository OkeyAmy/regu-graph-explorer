import { useState } from 'react';
import { 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Download, 
  Save,
  Menu,
  X,
  Home,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRegulationStore } from '@/store/regulationStore';
import { useToast } from '@/hooks/use-toast';

export function WorkspaceHeader() {
  const { 
    documentData,
    searchQuery, 
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    setDocumentData,
    saveDocument
  } = useRegulationStore();
  
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const availableFilters = [
    { id: 'sections', label: 'Sections', count: 0 },
    { id: 'references', label: 'With References', count: 0 },
    { id: 'definitions', label: 'Definitions', count: 0 },
  ];

  const handleSave = () => {
    if (documentData) {
      saveDocument(documentData.metadata.title, documentData);
      toast({
        title: "Document Saved",
        description: "Document has been saved to local storage",
      });
    }
  };

  const handleNewDocument = () => {
    setDocumentData(null);
  };

  const toggleFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    setActiveFilters(newFilters);
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Left section - Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleNewDocument}>
            <Home className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          >
            {rightPanelCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Center section - Document title and search */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-sm font-medium truncate">
            {documentData?.metadata.title || 'Untitled Document'}
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections, references..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Right section - Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={showFilters ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            {activeFilters.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilters.size}
              </Badge>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Maximize className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filters:</span>
            {availableFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilters.has(filter.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(filter.id)}
                className="h-7"
              >
                {filter.label}
                {filter.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
            
            {activeFilters.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilters(new Set())}
                className="h-7 text-muted-foreground"
              >
                Clear All
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}