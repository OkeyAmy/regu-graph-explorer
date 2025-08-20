import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Globe, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRegulationStore } from '@/store/regulationStore';
import { processDocument } from '@/services/documentService';
import { SampleDocumentLoader } from '@/components/demo/SampleDocument';
import { cn } from '@/lib/utils';

export function UploadInterface() {
  const [url, setUrl] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const { setProcessingState, savedDocuments, refreshSavedDocuments, loadDocument } = useRegulationStore();

  // Load saved documents on mount
  useState(() => {
    refreshSavedDocuments();
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    await processDocument(file, setProcessingState);
  }, [setProcessingState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    
    setIsProcessingUrl(true);
    try {
      await processDocument(url, setProcessingState);
    } finally {
      setIsProcessingUrl(false);
    }
  };

  const handleLoadDocument = (id: string) => {
    loadDocument(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Regulation Graph Tool
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform legal documents into interactive visual graphs. Upload or paste a regulation 
            to explore its structure and cross-references.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Document</TabsTrigger>
            <TabsTrigger value="sample">Try Sample</TabsTrigger>
            <TabsTrigger value="history">Saved Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload File
                </CardTitle>
                <CardDescription>
                  Drag and drop a PDF, HTML, or text file, or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                    isDragActive 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">Drop your document here, or click to select</p>
                      <p className="text-sm text-muted-foreground">
                        Supports PDF, HTML, and TXT files up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* URL Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  From URL
                </CardTitle>
                <CardDescription>
                  Enter a URL to a regulation document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/regulation.pdf"
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  />
                  <Button 
                    onClick={handleUrlSubmit} 
                    disabled={!url.trim() || isProcessingUrl}
                  >
                    {isProcessingUrl ? 'Processing...' : 'Process'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sample">
            <SampleDocumentLoader />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Saved Documents
                </CardTitle>
                <CardDescription>
                  Previously processed documents stored locally
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedDocuments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No saved documents yet. Process a document to see it here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleLoadDocument(doc.id)}
                      >
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Load
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}