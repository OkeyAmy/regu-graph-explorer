import React from 'react';
import { Progress } from '@/components/ui/progress';
import { FileText, Globe, Upload } from 'lucide-react';

interface ExtractingViewProps {
  fileType?: 'pdf' | 'html' | 'text' | 'url';
  fileName?: string;
}

export function ExtractingView({ fileType = 'pdf', fileName }: ExtractingViewProps) {
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

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="animate-pulse">
            {getIcon()}
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            Extracting Content...
          </h3>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName}
            </p>
          )}
        </div>

        {/* Progress animation */}
        <div className="space-y-3">
          <Progress value={75} className="w-full h-2" />
          <p className="text-xs text-muted-foreground animate-pulse">
            Preparing document for viewing
          </p>
        </div>
      </div>
    </div>
  );
}