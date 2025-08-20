import { useRegulationStore } from '@/store/regulationStore';
import { UploadInterface } from '@/components/upload/UploadInterface';
import { ProcessingView } from '@/components/processing/ProcessingView';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';

export function MainLayout() {
  const { documentData, processingState } = useRegulationStore();

  // Show upload interface when no document and not processing
  if (!documentData && processingState.stage === 'idle') {
    return <UploadInterface />;
  }

  // Show processing view while processing
  if (processingState.stage !== 'idle' && processingState.stage !== 'complete') {
    return <ProcessingView />;
  }

  // Show main workspace with document
  if (documentData) {
    return <WorkspaceView />;
  }

  // Fallback to upload interface
  return <UploadInterface />;
}