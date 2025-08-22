import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRegulationStore } from '@/store/regulationStore';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentViewerProps {
  documentData: any | null;
  fileType: 'pdf' | 'html' | 'text' | 'url';
  content: string | ArrayBuffer | null;
  highlightedSections: string[];
}

export function DocumentViewer({ documentData, fileType, content, highlightedSections }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Render PDF content
  useEffect(() => {
    if (fileType === 'pdf' && content instanceof ArrayBuffer) {
      renderPDF(content);
    }
  }, [fileType, content]);

  const renderPDF = async (pdfBuffer: ArrayBuffer) => {
    setIsLoading(true);
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      const pages: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;
          
          pages.push(canvas.toDataURL());
        }
      }
      
      setPdfPages(pages);
    } catch (error) {
      console.error('Error rendering PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to highlighted section
  const scrollToSection = (sectionId: string) => {
    const element = containerRef.current?.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlighting effect
      element.classList.add('bg-primary/20', 'animate-pulse', 'rounded', 'px-2', 'py-1');
      setTimeout(() => {
        element.classList.remove('animate-pulse');
        setTimeout(() => {
          element.classList.remove('bg-primary/20', 'rounded', 'px-2', 'py-1');
        }, 2000);
      }, 1000);
    } else {
      // Fallback: try to find by node ID or text content
      const fallbackElement = containerRef.current?.querySelector(`[id="${sectionId}"]`) ||
                              containerRef.current?.querySelector(`[data-node-id="${sectionId}"]`);
      if (fallbackElement) {
        fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle section highlighting
  useEffect(() => {
    if (highlightedSections.length > 0) {
      const latestSection = highlightedSections[highlightedSections.length - 1];
      scrollToSection(latestSection);
    }
  }, [highlightedSections]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="space-y-4 p-4">
            {pdfPages.map((pageDataUrl, index) => (
              <div key={index} className="flex justify-center">
                <img 
                  src={pageDataUrl} 
                  alt={`Page ${index + 1}`}
                  className="max-w-full shadow-lg border border-border rounded-lg"
                  data-section={`page-${index + 1}`}
                  data-page={index + 1}
                />
              </div>
            ))}
          </div>
        );

      case 'html':
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none p-6">
            <div 
              dangerouslySetInnerHTML={{ __html: content as string }}
              className="[&>*]:data-section-auto [&_h1]:data-section-h1 [&_h2]:data-section-h2 [&_h3]:data-section-h3 [&_p]:hover:bg-muted/30 [&_p]:px-2 [&_p]:py-1 [&_p]:rounded [&_p]:transition-colors"
            />
          </div>
        );

      case 'text':
        return (
          <div className="p-6 font-mono text-sm whitespace-pre-wrap leading-relaxed">
            {(content as string).split('\n').map((line, index) => (
              <div 
                key={index}
                data-section={`line-${index}`}
                className="hover:bg-muted/30 px-2 py-1 rounded transition-colors"
              >
                {line}
              </div>
            ))}
          </div>
        );

      case 'url':
        return (
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div 
                className="space-y-4"
                dangerouslySetInnerHTML={{ __html: content as string }}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No Document Loaded</h3>
              <p className="text-sm">Upload a file or enter a URL to view content here</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-background border-l border-r border-border">
      <div className="h-full flex flex-col">
        {/* Document header */}
        {documentData?.metadata && (
          <div className="border-b border-border p-4 bg-muted/30">
            <h2 className="font-semibold text-lg text-foreground">
              {documentData.metadata.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {documentData.metadata.document_type} • {documentData.metadata.jurisdiction}
            </p>
          </div>
        )}
        
        {/* Document content */}
        <ScrollArea className="flex-1" ref={containerRef}>
          <div className="document-content">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}