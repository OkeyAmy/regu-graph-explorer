
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TreeNavigationPanel } from './TreeNavigationPanel';
// import { CanvasWrapper } from './CanvasWrapper'; // Canvas visualization removed as per TODO.md
import { DocumentViewer } from './DocumentViewer';
import { ExtractingView } from './ExtractingView';
// import { DetailPanel } from './DetailPanel'; // Right panel converted to chat (commented out for now)
import { WorkspaceHeader } from './WorkspaceHeader';
import { useRegulationStore } from '@/store/regulationStore';

export function WorkspaceView() {
  const { 
    leftPanelCollapsed, 
    // rightPanelCollapsed, // Right panel commented out as per TODO.md
    processingState,
    rawDocumentContent,
    documentData,
    highlightedSections
  } = useRegulationStore();

  // Determine what to show in center panel
  const showExtractingView = processingState.stage === 'uploading' || processingState.stage === 'cleaning';
  const showDocumentViewer = rawDocumentContent.content && rawDocumentContent.fileType;

  return (
    <div className="h-screen flex flex-col bg-background">
      <WorkspaceHeader />
      
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Panel - Tree Navigation */}
          {!leftPanelCollapsed && (
            <>
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <TreeNavigationPanel />
              </Panel>
              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
            </>
          )}

          {/* Center Panel - Document Viewer (replaces Canvas as per TODO.md) */}
          <Panel defaultSize={leftPanelCollapsed ? 100 : 75} minSize={30}>
            {showExtractingView ? (
              <ExtractingView 
                fileType={rawDocumentContent.fileType || 'pdf'}
                fileName={rawDocumentContent.fileName}
              />
            ) : showDocumentViewer ? (
              <DocumentViewer 
                documentData={documentData}
                fileType={rawDocumentContent.fileType!}
                content={rawDocumentContent.content}
                highlightedSections={highlightedSections}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-background">
                <div className="text-center text-muted-foreground">
                  <h3 className="text-lg font-medium mb-2">Welcome to Regu-Graph Explorer</h3>
                  <p className="text-sm">Upload a document or enter a URL to get started</p>
                </div>
              </div>
            )}
          </Panel>

          {/* Right Panel - Chat Interface (commented out as per TODO.md) */}
          {/* 
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <DetailPanel />
              </Panel>
            </>
          )}
          */}
        </PanelGroup>
      </div>
    </div>
  );
}
