import { DocumentData } from '@/store/regulationStore';

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'cleaning' | 'parsing' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
  currentSection?: string;
}

export async function processDocument(
  input: File | string,
  setProcessingState: (state: ProcessingState) => void
): Promise<void> {
  try {
    // Stage 1: Upload/Read
    setProcessingState({
      stage: 'uploading',
      progress: 10,
      message: 'Reading document content...',
    });

    let rawText: string;
    let fileName: string;

    if (typeof input === 'string') {
      // URL input
      fileName = input.split('/').pop() || 'document';
      const response = await fetch(input);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        // Handle PDF from URL (would need backend processing)
        throw new Error('PDF URLs require backend processing');
      } else {
        rawText = await response.text();
      }
    } else {
      // File input
      fileName = input.name;
      if (input.type === 'application/pdf') {
        rawText = await extractTextFromPDF(input);
      } else {
        rawText = await input.text();
      }
    }

    // Stage 2: Clean
    setProcessingState({
      stage: 'cleaning',
      progress: 25,
      message: 'Cleaning and preprocessing text...',
    });

    const cleanedText = cleanDocumentText(rawText);

    // Stage 3: Parse with AI
    setProcessingState({
      stage: 'parsing',
      progress: 50,
      message: 'Analyzing document structure...',
    });

    const parsedData = await parseWithGemini(cleanedText, rawText, setProcessingState);

    // Stage 4: Build graph
    setProcessingState({
      stage: 'building',
      progress: 90,
      message: 'Building interactive graph...',
    });

    // Final validation and cleanup
    const documentData: DocumentData = {
      metadata: {
        title: parsedData.metadata?.title || fileName,
        jurisdiction: parsedData.metadata?.jurisdiction || 'Unknown',
        document_type: parsedData.metadata?.document_type || 'Regulation',
        source: fileName,
      },
      hierarchy: parsedData.hierarchy || [],
    };

    // Complete
    setProcessingState({
      stage: 'complete',
      progress: 100,
      message: 'Document processed successfully!',
    });

    // Set the processed data in the store
    const { useRegulationStore } = await import('@/store/regulationStore');
    useRegulationStore.getState().setDocumentData(documentData);

  } catch (error) {
    console.error('Document processing error:', error);
    setProcessingState({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  // PDF processing would typically be done on the backend
  // For now, we'll throw an error or use a client-side library
  const pdfParse = await import('pdf-parse');
  const arrayBuffer = await file.arrayBuffer();
  const data = await pdfParse.default(Buffer.from(arrayBuffer));
  return data.text;
}

function cleanDocumentText(rawText: string): string {
  return rawText
    // Remove page numbers and headers/footers
    .replace(/Page\s*-?\s*\d+/gi, '')
    .replace(/^\s*\d+\s*$/gm, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

async function parseWithGemini(
  cleanedText: string, 
  rawText: string,
  setProcessingState: (state: ProcessingState) => void
): Promise<any> {
  // TODO: Add secrets management for Gemini API key
  const apiKey = 'your-gemini-api-key'; // This should come from environment/secrets
  
  const prompt = `
You are a legal document parser. Parse this regulatory document into a structured JSON format that represents the hierarchy and all cross-references.

**Instructions:**
1. **Document Structure Detection**: Identify Parts, Sections, Subsections, and Paragraphs with their exact numbering.
2. **Reference Extraction**: Find all cross-references like "under section 9", "pursuant to subsection (2)", etc.
3. **Text Preservation**: Copy text verbatim without rephrasing.
4. **JSON Output**: Return a structured JSON with metadata and hierarchy array.

**Required JSON Structure:**
{
  "metadata": {
    "title": "Document Title",
    "jurisdiction": "Jurisdiction Name",
    "document_type": "Act/Regulation/etc",
    "source": "filename"
  },
  "hierarchy": [
    {
      "id": "unique_id",
      "type": "part/section/subsection/paragraph",
      "number": "numbering_as_shown",
      "title": "section_title_if_any",
      "text": "verbatim_text_content",
      "level": 1,
      "references": [
        {
          "target": "target_id_or_external",
          "text": "reference_text_found",
          "type": "internal/external"
        }
      ],
      "children": []
    }
  ]
}

**Document to parse:**
${cleanedText}

Return only the JSON, no other text.
`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to parse with Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Fallback: create a simple mock structure for development
    return createMockDocumentStructure(cleanedText);
  }
}

function createMockDocumentStructure(text: string): any {
  // Simple fallback parser for development/testing
  const lines = text.split('\n').filter(line => line.trim());
  const hierarchy: any[] = [];
  
  let currentSection = 1;
  
  // Simple heuristic parsing
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Look for section-like patterns
    if (trimmedLine.match(/^\d+\./)) {
      hierarchy.push({
        id: `sec${currentSection}`,
        type: 'section',
        number: currentSection.toString(),
        title: trimmedLine,
        text: trimmedLine,
        level: 1,
        references: [],
        children: []
      });
      currentSection++;
    }
  });

  return {
    metadata: {
      title: 'Sample Document',
      jurisdiction: 'Unknown',
      document_type: 'Regulation',
      source: 'uploaded_file'
    },
    hierarchy
  };
}