import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TreeNavigationPanel } from './TreeNavigationPanel';
import { DocumentViewer } from './DocumentViewer';
import { ChatPanel } from './ChatPanel';
import { WorkspaceHeader } from './WorkspaceHeader';
import { useRegulationStore } from '@/store/regulationStore';

export function WorkspaceView() {
  const { 
    leftPanelCollapsed, 
    rightPanelCollapsed,
    rawDocumentContent,
    documentData,
    highlightedSections
  } = useRegulationStore();

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

          {/* Center Panel - Document Viewer */}
          <Panel defaultSize={rightPanelCollapsed ? (leftPanelCollapsed ? 100 : 75) : 50} minSize={30}>
            {rawDocumentContent.content && rawDocumentContent.fileType ? (
              <DocumentViewer 
                documentData={documentData}
                fileType={rawDocumentContent.fileType}
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

          {/* Right Panel - Chat Interface */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <ChatPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}