import React from 'react';
import { Progress } from '@/components/ui/progress';
import { FileText, Globe, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProcessingState } from '@/store/regulationStore';

interface ExtractingViewProps {
  fileType?: 'pdf' | 'html' | 'text' | 'url';
  fileName?: string;
  status?: ProcessingState;
}

export function ExtractingView({ 
  fileType = 'pdf', 
  fileName, 
  status 
}: ExtractingViewProps) {
  const getIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-16 w-16 text-primary/60" />;
      case 'url':
        return <Globe className="h-16 w-16 text-primary/60" />;
      default:
        return <Upload className="h-16 w-16 text-primary/60" />;
    }
  };

  const getStageLabel = (stage: string) => {
    const stageMap: Record<string, string> = {
      uploading: 'Uploading',
      parsing: 'Parsing Document',
      cleaning: 'Cleaning Text',
      extracting: 'Extracting Structure',
      hierarchy: 'Building Hierarchy',
      entities: 'Extracting Entities',
      building: 'Building Graph',
      complete: 'Complete',
      error: 'Error'
    };
    return stageMap[stage] || stage;
  };

  const currentProgress = status?.progress ?? 0;
  const currentMessage = status?.message ?? 'Preparing document for processing...';
  const currentStage = status?.stage ?? 'uploading';

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-2xl mx-auto p-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="animate-pulse">
            {getIcon()}
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {currentStage === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            <h3 className="text-xl font-semibold text-foreground">
              {getStageLabel(currentStage)}
            </h3>
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <Progress value={currentProgress} className="w-full h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentProgress}%</span>
            <span>{currentMessage}</span>
          </div>
        </div>

        {/* Detailed status */}
        {status?.details && (
          <div className="flex flex-wrap gap-2 justify-center">
            {status.details.phase && (
              <Badge variant="secondary" className="text-xs">
                {status.details.phase}
              </Badge>
            )}
            {status.details.currentChunk && status.details.totalChunks && (
              <Badge variant="outline" className="text-xs">
                Chunk {status.details.currentChunk} / {status.details.totalChunks}
              </Badge>
            )}
            {status.details.extractedItems !== undefined && (
              <Badge variant="outline" className="text-xs">
                {status.details.extractedItems} items extracted
              </Badge>
            )}
          </div>
        )}

        {/* Processing notes */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>✨ Using LangExtract with sequential processing</p>
          <p>⏱️ This may take a few minutes for large documents</p>
        </div>
      </div>
    </div>
  );
}