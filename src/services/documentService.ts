import { DocumentData } from '@/store/regulationStore';
import { GEMINI_API_KEY } from '@/config/api';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      // URL input - Use CORS proxy for external documents
      fileName = input.split('/').pop() || 'document';
      
      try {
        // Try direct fetch first
        const response = await fetch(input, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,application/pdf',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/pdf')) {
          throw new Error('PDF URLs require file upload due to browser security restrictions');
        } else {
          rawText = await response.text();
        }
      } catch (error) {
        throw new Error(`Failed to fetch document from URL: ${error instanceof Error ? error.message : 'Network error'}`);
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
  try {
    // Use pdfjs-dist for browser-compatible PDF parsing
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let text = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      text += pageText + '\n';
    }
    
    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF. Please try a different file or convert to text format.');
  }
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
  try {
    setProcessingState({
      stage: 'parsing',
      progress: 60,
      message: 'Sending document to Gemini AI...',
    });

    // Initialize the Google Generative AI client with the latest SDK
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are a legal document parser. Parse this regulatory document into a structured JSON format that represents the hierarchy and all cross-references.

**Instructions for Gemini**:

1.  **Document Structure Detection**:
    - Identify the main **Parts** (e.g., "PART I - PRELIMINARY", "PART II - ADMINISTRATION OF ACT").
    - Within each Part, detect **Sections** (e.g., "1. Short title and commencement", "2. Interpretation").
    - For each Section, extract **Subsections** (e.g., "(1)", "(2)") and **Paragraphs** (e.g., "(a)", "(b)", "(i)", "(ii)").
    - Preserve the exact nesting and numbering styles found in the document (e.g., "Article 2", "Art. 2º", "Section 1", "1(a)").

2.  **Reference Extraction**:
    - Find all cross-references in the text, such as:
        - "under section 9"
        - "pursuant to subsection (2)"
        - "in accordance with section 39(2)(b)"
        - "as defined in Section 2(1)"
    - Map each reference to its target using a unique ID system based on the hierarchy (e.g., "sec9" for Section 9, "sec2:p1" for Section 2, Paragraph 1).
    - Classify references as "internal" (within the document) or "external" (to other laws).

3.  **Text Preservation**:
    - Copy text verbatim without rephrasing or summarizing.
    - Include all formatting like italics or quotes as plain text, but note any emphasis in the metadata if needed.

4.  **JSON Output Structure**:
    - The output should be a JSON object with metadata and a hierarchy array.
    - Each element in the hierarchy should have:
        - \`id\`: A unique identifier (e.g., "part1", "sec2", "sec2:p1").
        - \`type\`: The element type (e.g., "part", "section", "subsection", "paragraph").
        - \`number\`: The official number or label (e.g., "1", "(1)", "(a)").
        - \`title\`: The title or heading if available (e.g., "Short title and commencement").
        - \`text\`: The verbatim text content.
        - \`level\`: The nesting level (e.g., 1 for part, 2 for section, 3 for subsection, etc.).
        - \`references\`: An array of reference objects, each with:
            - \`target\`: The ID of the referenced element (e.g., "sec9").
            - \`text\`: The exact reference text from the content.
            - \`type\`: "internal" or "external".
        - \`children\`: An array of child elements for nesting.

**Example Based on Your File**:

For Section 2(1) from your file, the JSON should look like:

\`\`\`json
{
  "metadata": {
    "title": "DIGITAL ASSETS AND REGISTERED EXCHANGES ACT, 2024",
    "jurisdiction": "The Bahamas",
    "document_type": "Act",
    "source": "Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf"
  },
  "hierarchy": [
    {
      "id": "part1",
      "type": "part",
      "number": "I",
      "title": "PRELIMINARY",
      "text": "",
      "level": 1,
      "references": [],
      "children": [
        {
          "id": "sec1",
          "type": "section",
          "number": "1",
          "title": "Short title and commencement",
          "text": "(1) This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024. (2) This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
          "level": 2,
          "references": [],
          "children": [
            {
              "id": "sec1:p1",
              "type": "paragraph",
              "number": "(1)",
              "title": "",
              "text": "This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024.",
              "level": 3,
              "references": [],
              "children": []
            },
            {
              "id": "sec1:p2",
              "type": "paragraph",
              "number": "(2)",
              "title": "",
              "text": "This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
              "level": 3,
              "references": [],
              "children": []
            }
          ]
        },
        {
          "id": "sec2",
          "type": "section",
          "number": "2",
          "title": "Interpretation",
          "text": "(1) In this Act, unless the context otherwise requires — "accredited investor" means any person who comes within any of the following categories, or whom the digital asset issuer, exchange or persons selling digital assets reasonably believes comes within any of the following categories, at the time of the issue, transfer or sale of digital asset to that person — (a) any bank licensed under the Banks and Trust Companies Regulation Act (Ch. 316) or licensed and operating outside of The Bahamas, whether acting in its individual or fiduciary capacity; ... (o) any person that is recognised or designated by the Commission as an accredited investor; ... (2) For the purposes of this Act — (a) in determining whether a person is fit and proper, ... (b) a person carries on digital asset business — (i) in The Bahamas, if irrespective of physical location, the person offers digital asset business services to a person who is not an accredited investor residing in The Bahamas; and (ii) from within The Bahamas, if the person, whether or not a legal entity offers digital asset business services to persons from or through a place in The Bahamas; and (c) a person shall not be deemed to be carrying on digital asset business in or from within The Bahamas solely due to the presence of data servers or physical maintenance of other parts of a digital asset exchange in The Bahamas.",
          "level": 2,
          "references": [],
          "children": [
            {
              "id": "sec2:p1",
              "type": "paragraph",
              "number": "(1)",
              "title": "",
              "text": "In this Act, unless the context otherwise requires —",
              "level": 3,
              "references": [],
              "children": [
                {
                  "id": "sec2:p1:a",
                  "type": "paragraph",
                  "number": "(a)",
                  "title": "",
                  "text": "any bank licensed under the Banks and Trust Companies Regulation Act (Ch. 316) or licensed and operating outside of The Bahamas, whether acting in its individual or fiduciary capacity;",
                  "level": 4,
                  "references": [
                    {
                      "target": "external",
                      "text": "Banks and Trust Companies Regulation Act (Ch. 316)",
                      "type": "external"
                    }
                  ],
                  "children": []
                }
              ]
            },
            {
              "id": "sec2:p2",
              "type": "paragraph",
              "number": "(2)",
              "title": "",
              "text": "For the purposes of this Act —",
              "level": 3,
              "references": [],
              "children": [
                {
                  "id": "sec2:p2:a",
                  "type": "paragraph",
                  "number": "(a)",
                  "title": "",
                  "text": "in determining whether a person is fit and proper, in addition to considering any other relevant matter including a decision made in respect of the person by the Commission, or other regulator, court or tribunal wherever located, the Commission shall have regard to — (i) the financial status or solvency of the person; (ii) the educational or other qualifications and experience of the person, having regard to the nature of the role or functions that, if the application is allowed or granted, the person will perform; (iii) the ability of the person to carry on the regulated activity competently, honestly and fairly; (iv) the ability of the person to ensure a satisfactory standard of governance organisation and operational conduct; and (v) the reputation and character of — (A) where the person is an individual, the individual himself; or (B) where the person is a legal entity, the legal entity and any director, shareholder, chief executive officer and any other officer;",
                  "level": 4,
                  "references": [],
                  "children": [
                    {
                      "id": "sec2:p2:a:i",
                      "type": "paragraph",
                      "number": "(i)",
                      "title": "",
                      "text": "the financial status or solvency of the person;",
                      "level": 5,
                      "references": [],
                      "children": []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

**Note on References**: In the example, \`sec2:p1:a\` has an external reference to another Act. For internal references, like "see section 9" in later text, it would point to \`sec9\`.

**Document to parse:**
${cleanedText}

Return only the JSON, no other text.
`;

    setProcessingState({
      stage: 'parsing',
      progress: 75,
      message: 'Processing with Gemini AI...',
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    setProcessingState({
      stage: 'parsing',
      progress: 85,
      message: 'Parsing AI response...',
    });

    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to parse document with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Removed mock structure - production ready version only uses real AI parsing