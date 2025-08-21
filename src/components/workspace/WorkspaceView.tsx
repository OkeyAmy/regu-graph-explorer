
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TreeNavigationPanel } from './TreeNavigationPanel';
import { StreamingGraphCanvas } from './StreamingGraphCanvas';
import { DetailPanel } from './DetailPanel';
import { WorkspaceHeader } from './WorkspaceHeader';
import { useRegulationStore } from '@/store/regulationStore';

export function WorkspaceView() {
  const { 
    leftPanelCollapsed, 
    rightPanelCollapsed,
    streamingState,
    highlightedReferences 
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

          {/* Center Panel - Streaming Graph Canvas */}
          <Panel defaultSize={leftPanelCollapsed && rightPanelCollapsed ? 100 : 50} minSize={30}>
            <StreamingGraphCanvas 
              streamingNodes={streamingState.streamingNodes}
              isStreaming={streamingState.isStreaming}
              streamingProgress={streamingState.streamingProgress}
              highlightedReferences={highlightedReferences}
            />
          </Panel>

          {/* Right Panel - Detail View */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <DetailPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
