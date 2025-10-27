import { useRegulationStore } from '@/store/regulationStore';
import { UploadInterface } from '@/components/upload/UploadInterface';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';
import { ExtractingView } from '@/components/workspace/ExtractingView';

export function MainLayout() {
  const { rawDocumentContent, processingState } = useRegulationStore();

  // Show extracting view while processing is in progress
  if (processingState.stage !== 'idle' && processingState.stage !== 'complete') {
    return (
      <ExtractingView
        fileType={rawDocumentContent.fileType || 'pdf'}
        fileName={rawDocumentContent.fileName}
        status={processingState}
      />
    );
  }

  // Show workspace if we have document content (either raw or processed)
  if (rawDocumentContent.content) {
    return <WorkspaceView />;
  }

  // Show upload interface by default
  return <UploadInterface />;
}