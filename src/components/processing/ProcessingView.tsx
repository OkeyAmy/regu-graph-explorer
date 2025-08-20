import { useRegulationStore } from '@/store/regulationStore';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, Network, CheckCircle, XCircle } from 'lucide-react';

const stageIcons = {
  uploading: FileText,
  cleaning: Sparkles,
  parsing: Sparkles,
  building: Network,
  complete: CheckCircle,
  error: XCircle,
};

const stageMessages = {
  uploading: 'Uploading and reading document...',
  cleaning: 'Cleaning and preprocessing text...',
  parsing: 'Analyzing structure with AI...',
  building: 'Building interactive graph...',
  complete: 'Processing complete!',
  error: 'An error occurred during processing.',
};

export function ProcessingView() {
  const { processingState } = useRegulationStore();
  const { stage, progress, message, currentSection } = processingState;

  const Icon = stageIcons[stage];
  const stageMessage = stageMessages[stage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Icon className={`h-12 w-12 ${stage === 'error' ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <CardTitle className="text-2xl">Processing Document</CardTitle>
          <CardDescription>{stageMessage}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {message && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Status</p>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {currentSection && (
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Currently Processing</p>
              <p className="text-sm text-primary">{currentSection}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { key: 'uploading', label: 'Upload' },
              { key: 'cleaning', label: 'Clean' },
              { key: 'parsing', label: 'Parse' },
              { key: 'building', label: 'Build' },
            ].map((step, index) => {
              const isActive = step.key === stage;
              const isComplete = ['uploading', 'cleaning', 'parsing', 'building'].indexOf(stage) > index;
              
              return (
                <div key={step.key} className="space-y-2">
                  <div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium ${
                      isComplete
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {stage === 'error' && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                Processing failed. Please try again with a different document or check the file format.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}