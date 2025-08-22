import { useState } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegulationStore } from '@/store/regulationStore';

interface SampleDocument {
  id: string;
  title: string;
  description: string;
  pdfPath: string;
  jsonPath: string;
  size: string;
  pages: number;
}

const sampleDocuments: SampleDocument[] = [
  {
    id: 'bahamas-digital-assets-act',
    title: 'Digital Assets and Registered Exchanges Act, 2024',
    description: 'The Bahamas regulation governing digital assets, exchanges, and related business activities.',
    pdfPath: '/sample/Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf',
    jsonPath: '/sample/regulatory-analysis-2025-08-21T13-12-12-453Z.json', 
    size: '1.2 MB',
    pages: 89
  }
];

export function SampleDocumentLoader() {
  const [loading, setLoading] = useState<string | null>(null);
  const { setRawDocumentContent, setDocumentData } = useRegulationStore();

  const loadSampleDocument = async (sample: SampleDocument) => {
    setLoading(sample.id);
    
    try {
      // Load the PDF file as ArrayBuffer
      const pdfResponse = await fetch(sample.pdfPath);
      if (!pdfResponse.ok) throw new Error('Failed to load PDF');
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Load the JSON analysis data
      const jsonResponse = await fetch(sample.jsonPath);
      if (!jsonResponse.ok) throw new Error('Failed to load analysis data');
      const analysisData = await jsonResponse.json();
      
      // Set the raw document content first (immediate display)
      setRawDocumentContent(pdfBuffer, 'pdf', sample.title);
      
      // Set the document analysis data (for navigation)
      setDocumentData(analysisData);
      
      console.log('Sample document loaded successfully:', sample.title);
      
    } catch (error) {
      console.error('Error loading sample document:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Try Sample Documents
          </CardTitle>
          <CardDescription>
            Explore pre-loaded regulatory documents to see how the tool works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sampleDocuments.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{doc.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>📄 {doc.pages} pages</span>
                    <span>📦 {doc.size}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href={doc.pdfPath} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View PDF
                    </a>
                  </Button>
                  
                  <Button
                    onClick={() => loadSampleDocument(doc)}
                    disabled={loading === doc.id}
                    size="sm"
                  >
                    {loading === doc.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-2" />
                        Load Sample
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}