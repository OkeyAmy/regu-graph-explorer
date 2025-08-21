import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useRegulationStore, DocumentData } from '@/store/regulationStore';
import { useState } from 'react';

export function SampleDocumentLoader() {
  const { setDocumentData } = useRegulationStore();
  const [isLoading, setIsLoading] = useState(false);

  const loadSampleDocument = async () => {
    setIsLoading(true);
    try {
      // Load the actual JSON file from the sample directory
      const response = await fetch('/sample/regulatory-analysis-2025-08-21T13-12-12-453Z.json');
      if (!response.ok) {
        throw new Error(`Failed to load sample document: ${response.statusText}`);
      }
      
      const documentData: DocumentData = await response.json();
      
      // Set the document data which will trigger the canvas to render
      setDocumentData(documentData);
      
      console.log('Sample document loaded successfully:', documentData.metadata);
    } catch (error) {
      console.error('Error loading sample document:', error);
      alert('Failed to load sample document. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Try Sample Document
        </CardTitle>
        <CardDescription className="text-sm">
          Load a sample regulation to explore the features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={loadSampleDocument} 
          variant="outline" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading Sample...
            </>
          ) : (
            'Load Bahamas Digital Assets Act (Sample)'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}