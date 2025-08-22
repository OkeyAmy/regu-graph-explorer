import { useRegulationStore } from '@/store/regulationStore';
import { UploadInterface } from '@/components/upload/UploadInterface';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';

export function MainLayout() {
  const { rawDocumentContent } = useRegulationStore();

  // Show workspace if we have document content (either raw or processed)
  if (rawDocumentContent.content) {
    return <WorkspaceView />;
  }

  // Show upload interface by default
  return <UploadInterface />;
}