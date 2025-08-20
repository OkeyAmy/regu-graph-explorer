import { DocumentData } from '@/store/regulationStore';
import { GEMINI_API_KEY } from '@/config/api';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'cleaning' | 'parsing' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
  currentSection?: string;
}

// Debug logging helpers
const DEBUG_LOGS = true;
function logDebug(message: string, data?: unknown) {
  if (!DEBUG_LOGS) return;
  try {
    if (data !== undefined) console.log('[DocService]', message, data);
    else console.log('[DocService]', message);
  } catch {
    console.log('[DocService]', message);
  }
}
function textSnippet(text: string, length = 300): string {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '…' : text;
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
      logDebug('Processing input as URL', { url: input });
      // URL input - Use CORS proxy for external documents
      fileName = input.split('/').pop() || 'document';
      
      try {
        let response;
        
        // Try direct fetch first
        try {
          logDebug('Attempting direct fetch');
          response = await fetch(input, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,application/pdf',
          }
        });
        
        if (!response.ok) {
            throw new Error(`Direct fetch failed: HTTP ${response.status}`);
          }
        } catch (directError) {
          logDebug('Direct fetch failed, trying CORS proxy...', { error: String(directError) });
          
          // Use CORS proxy if direct fetch fails
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(input)}`;
          const proxyResponse = await fetch(proxyUrl);
          
          if (!proxyResponse.ok) {
            throw new Error(`Proxy fetch failed: HTTP ${proxyResponse.status}`);
          }
          
          const proxyData = await proxyResponse.json();
          if (!proxyData.contents) {
            throw new Error('No content received from proxy');
          }
          
          // Create a mock response object for consistency
          response = {
            ok: true,
            headers: {
              get: (header: string) => {
                if (header === 'content-type') {
                  // Try to determine content type from URL extension
                  if (input.toLowerCase().includes('.pdf')) {
                    return 'application/pdf';
                  }
                  return 'text/html';
                }
                return null;
              }
            },
            text: () => Promise.resolve(proxyData.contents)
          };
        }
        
        const contentType = response.headers.get('content-type') || '';
        logDebug('Fetched URL content type', { contentType });
        if (contentType.includes('application/pdf')) {
          throw new Error('PDF URLs require file upload due to browser security restrictions. Please download the PDF and upload it directly.');
        } else {
          rawText = await response.text();
          logDebug('Fetched URL text length', { length: rawText.length, snippet: textSnippet(rawText) });
        }
      } catch (error) {
        throw new Error(`Failed to fetch document from URL: ${error instanceof Error ? error.message : 'Network error'}`);
      }
    } else {
      // File input
      fileName = input.name;
      logDebug('Processing input as File', { name: input.name, type: input.type, size: input.size });
      if (input.type === 'application/pdf') {
        rawText = await extractTextFromPDF(input);
      } else {
        rawText = await input.text();
        logDebug('Read file text', { length: rawText.length, snippet: textSnippet(rawText) });
      }
    }

    // Stage 2: Clean
    setProcessingState({
      stage: 'cleaning',
      progress: 25,
      message: 'Cleaning and preprocessing text...',
    });

    const cleanedText = cleanDocumentText(rawText);
    logDebug('Cleaned text', { length: cleanedText.length, snippet: textSnippet(cleanedText) });

    // Stage 3: Parse with AI
    setProcessingState({
      stage: 'parsing',
      progress: 50,
      message: 'Analyzing document structure...',
    });

    logDebug('Starting parseWithGemini', { rawLength: rawText.length, cleanedLength: cleanedText.length });
    const parsedData = await parseWithGemini(cleanedText, rawText, setProcessingState, typeof input !== 'string' ? input : undefined);

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
    logDebug('Document data saved to store', { title: documentData.metadata.title, nodes: documentData.hierarchy?.length });

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
    // Use a module worker served by Vite (avoids external CORS)
    const worker = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
      { type: 'module' }
    );
    // Point PDF.js to the explicit worker instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjsLib.GlobalWorkerOptions as any).workerPort = worker as unknown as MessagePort;
    logDebug('PDF.js worker configured');
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      disableFontFace: true,
      isEvalSupported: false,
    }).promise;
    logDebug('PDF loaded', { pages: pdf.numPages });
    
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .map((item: any) => item.str)
        .join(' ');
      text += pageText + '\n';
      if (i === 1) logDebug('First page text snippet', { snippet: textSnippet(pageText) });
    }
    
    return text;
  } catch (error) {
    console.warn('PDF.js failed; falling back to Gemini text extraction...', error);
    // Fallback: use Gemini to extract plain text
    return await extractTextWithGemini(file);
  }
}

async function extractTextWithGemini(file: File): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const uploaded = await uploadFileToGemini(file);
  logDebug('File uploaded to Gemini for text extraction', uploaded);

  const instruction = {
    text: 'Extract the full, verbatim plain text of this document. Return only the text, no additional commentary.'
  };

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          instruction,
          { fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } } as any,
        ],
      },
    ],
  });
  const response = await result.response;
  const text = response.text();
  logDebug('Gemini extractText response snippet', { snippet: textSnippet(text || '') });
  if (!text) throw new Error('Gemini text extraction returned empty result');
  return text;
}

async function uploadFileToGemini(file: File): Promise<{ fileUri: string; mimeType: string; name?: string }> {
  const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
  const startRes = await fetch(startUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(file.size),
      'X-Goog-Upload-Header-Content-Type': file.type || 'application/octet-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });

  if (!startRes.ok) {
    const body = await startRes.text().catch(() => '');
    throw new Error(`Gemini upload start failed: ${startRes.status} ${body}`);
  }

  const uploadUrl = startRes.headers.get('X-Goog-Upload-Url');
  if (!uploadUrl) throw new Error('Missing upload URL from Gemini');
  logDebug('Gemini upload session started');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(file.size),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    throw new Error(`Gemini upload finalize failed: ${uploadRes.status} ${body}`);
  }

  const info = await uploadRes.json().catch(() => ({}));
  const fileUri = info?.file?.uri || info?.uri;
  const mimeType = info?.file?.mimeType || info?.mimeType || file.type || 'application/octet-stream';
  const name = info?.file?.name || info?.name;
  if (!fileUri) throw new Error('Gemini did not return file URI');
  const result = { fileUri, mimeType, name };
  logDebug('Gemini upload finalized', result);
  return result;
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

function parseJSONWithRecovery(text: string): any {
  logDebug('Starting JSON recovery parsing', { textLength: text.length });
  
  // Step 1: Try direct JSON parse
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      logDebug('Direct JSON parse successful');
      return parsed;
    }
  } catch (error) {
    logDebug('Direct JSON parse failed', { error: String(error) });
  }
  
  // Step 2: Extract from markdown code blocks
  try {
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      const parsed = JSON.parse(codeBlockMatch[1]);
      logDebug('Markdown JSON parse successful');
      return parsed;
    }
  } catch (error) {
    logDebug('Markdown JSON parse failed', { error: String(error) });
  }
  
  // Step 3: Handle unterminated strings and common syntax errors
  try {
    let fixedJson = text.match(/\{[\s\S]*\}/)?.[0] || '';
    
    // Fix unterminated strings by finding the last complete quote and truncating there
    const lastCompleteQuote = fixedJson.lastIndexOf('",');
    if (lastCompleteQuote > 0 && fixedJson.includes('Unterminated string')) {
      fixedJson = fixedJson.substring(0, lastCompleteQuote + 1);
    }
    
    // Fix other common issues
    fixedJson = fixedJson
      .replace(/,\s*\]/g, ']')  // Remove trailing commas in arrays
      .replace(/,\s*\}/g, '}')  // Remove trailing commas in objects
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"')  // Convert single quotes to double
      .replace(/"\s*$/, '');  // Remove trailing incomplete quotes
    
    // Close any unclosed strings, arrays, and objects
    const openBraces = (fixedJson.match(/\{/g) || []).length;
    const closeBraces = (fixedJson.match(/\}/g) || []).length;
    const openBrackets = (fixedJson.match(/\[/g) || []).length;
    const closeBrackets = (fixedJson.match(/\]/g) || []).length;
    const openQuotes = (fixedJson.match(/"/g) || []).length;
    
    // Close incomplete strings
    if (openQuotes % 2 !== 0) {
      fixedJson += '"';
    }
    
    // Close incomplete arrays and objects
    fixedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    fixedJson += '}'.repeat(Math.max(0, openBraces - closeBraces));
    
    const parsed = JSON.parse(fixedJson);
    logDebug('Fixed JSON parse successful');
    return parsed;
  } catch (error) {
    logDebug('Fixed JSON parse failed', { error: String(error) });
  }
  
  // Step 4: Progressive truncation with intelligent string boundary detection
  const fullJson = text.match(/\{[\s\S]*\}/)?.[0] || '';
  if (fullJson) {
    const chunks = [0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    
    for (const chunkPercent of chunks) {
      try {
        const chunkSize = Math.floor(fullJson.length * chunkPercent);
        let truncated = fullJson.substring(0, chunkSize);
        
        // Try to find a good breaking point (end of a complete field)
        const lastCompleteField = Math.max(
          truncated.lastIndexOf('",'),
          truncated.lastIndexOf('}'),
          truncated.lastIndexOf(']')
        );
        
        if (lastCompleteField > chunkSize * 0.8) {
          truncated = truncated.substring(0, lastCompleteField + 1);
        }
        
        // Fix any incomplete strings or structures
        const openBraces = (truncated.match(/\{/g) || []).length;
        const closeBraces = (truncated.match(/\}/g) || []).length;
        const openBrackets = (truncated.match(/\[/g) || []).length;
        const closeBrackets = (truncated.match(/\]/g) || []).length;
        const openQuotes = (truncated.match(/"/g) || []).length;
        
        // Close incomplete strings
        if (openQuotes % 2 !== 0) {
          truncated += '"';
        }
        
        // Close incomplete arrays and objects
        truncated += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        truncated += '}'.repeat(Math.max(0, openBraces - closeBraces));
        
        const parsed = JSON.parse(truncated);
        logDebug('Progressive truncation successful', { 
          originalLength: fullJson.length, 
          truncatedLength: truncated.length,
          chunkSizePercent: Math.round(chunkPercent * 100),
          hierarchyLength: parsed?.hierarchy?.length || 0
        });
        return parsed;
      } catch (error) {
        continue;
      }
    }
  }
  
  // Step 5: Last resort - try to extract just the metadata and first few sections
  try {
    const metadataMatch = text.match(/"metadata"\s*:\s*\{[^}]*\}/);
    const hierarchyStart = text.match(/"hierarchy"\s*:\s*\[/);
    
    if (metadataMatch && hierarchyStart) {
      // Build a minimal but valid structure
      const basicStructure = {
        metadata: JSON.parse(`{${metadataMatch[0].substring(12)}}`),
        hierarchy: [],
        _parseError: "Partial parsing - response was truncated",
        _originalLength: text.length
      };
      
      logDebug('Extracted basic structure from truncated response');
      return basicStructure;
    }
  } catch (error) {
    logDebug('Basic structure extraction failed', { error: String(error) });
  }
  
  // Step 6: Return a minimal structure if all else fails
  logDebug('All JSON recovery attempts failed, returning minimal structure');
  return {
    metadata: {
      title: "Document Parsing Failed - Response Truncated",
      jurisdiction: "Unknown",
      document_type: "Unknown",
      source: "Failed Parsing"
    },
    hierarchy: [],
    _parseError: "Failed to parse complete JSON response - likely truncated",
    _originalLength: text.length,
    _recoveryAttempts: "All methods failed"
  };
}

async function parseWithGemini(
  cleanedText: string, 
  rawText: string,
  setProcessingState: (state: ProcessingState) => void,
  originalFile?: File
): Promise<any> {
  try {
    setProcessingState({
      stage: 'parsing',
      progress: 60,
      message: 'Sending document to Gemini AI...',
    });

    // Use LangChain for better large response handling with streaming
    const llm = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0.1, // Slightly higher for more consistent output
      maxRetries: 5,
      streaming: true, // Enable streaming for large responses
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Upload file if available
    let uploadedFile = null;
    if (originalFile) {
      setProcessingState({
        stage: 'parsing',
        progress: 65,
        message: 'Uploading file to Gemini AI...',
      });

      try {
        const uploaded = await uploadFileToGemini(originalFile);
        logDebug('File uploaded to Gemini for parsing', uploaded);
        // Note: LangChain doesn't directly support file references yet, so we'll rely on text
      } catch (error) {
        console.warn('File processing failed, proceeding with text-only analysis:', error);
      }
    }

    logDebug('Prompt preparation with LangChain', { 
      originalLength: cleanedText.length, 
      hasUploadedFile: !!originalFile,
      usingLangChain: true
    });

    // Use your exact system prompt as requested
    const promptTemplate = PromptTemplate.fromTemplate(`
Parse the regulatory document into a structured JSON that represents the hierarchy and all cross-references, preserving verbatim text.

{file_note}

{large_doc_note}

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
{{
  "metadata": {{
    "title": "DIGITAL ASSETS AND REGISTERED EXCHANGES ACT, 2024",
    "jurisdiction": "The Bahamas",
    "document_type": "Act",
    "source": "Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf"
  }},
  "hierarchy": [
    {{
      "id": "part1",
      "type": "part",
      "number": "I",
      "title": "PRELIMINARY",
      "text": "",
      "level": 1,
      "references": [],
      "children": [
        {{
          "id": "sec1",
          "type": "section",
          "number": "1",
          "title": "Short title and commencement",
          "text": "(1) This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024. (2) This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
          "level": 2,
          "references": [],
          "children": [
            {{
              "id": "sec1:p1",
              "type": "paragraph",
              "number": "(1)",
              "title": "",
              "text": "This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024.",
              "level": 3,
              "references": [],
              "children": []
            }},
            {{
              "id": "sec1:p2",
              "type": "paragraph",
              "number": "(2)",
              "title": "",
              "text": "This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
              "level": 3,
              "references": [],
              "children": []
            }}
          ]
        }},
        {{
          "id": "sec2",
          "type": "section",
          "number": "2",
          "title": "Interpretation",
          "text": "(1) In this Act, unless the context otherwise requires — "accredited investor" means any person who comes within any of the following categories, or whom the digital asset issuer, exchange or persons selling digital assets reasonably believes comes within any of the following categories, at the time of the issue, transfer or sale of digital asset to that person — (a) any bank licensed under the Banks and Trust Companies Regulation Act (Ch. 316) or licensed and operating outside of The Bahamas, whether acting in its individual or fiduciary capacity; ... (o) any person that is recognised or designated by the Commission as an accredited investor; ... (2) For the purposes of this Act — (a) in determining whether a person is fit and proper, ... (b) a person carries on digital asset business — (i) in The Bahamas, if irrespective of physical location, the person offers digital asset business services to a person who is not an accredited investor residing in The Bahamas; and (ii) from within The Bahamas, if the person, whether or not a legal entity offers digital asset business services to persons from or through a place in The Bahamas; and (c) a person shall not be deemed to be carrying on digital asset business in or from within The Bahamas solely due to the presence of data servers or physical maintenance of other parts of a digital asset exchange in The Bahamas.",
          "level": 2,
          "references": [],
          "children": [
            {{
              "id": "sec2:p1",
              "type": "paragraph",
              "number": "(1)",
              "title": "",
              "text": "In this Act, unless the context otherwise requires —",
              "level": 3,
              "references": [],
              "children": [
                {{
                  "id": "sec2:p1:a",
                  "type": "paragraph",
                  "number": "(a)",
                  "title": "",
                  "text": "any bank licensed under the Banks and Trust Companies Regulation Act (Ch. 316) or licensed and operating outside of The Bahamas, whether acting in its individual or fiduciary capacity;",
                  "level": 4,
                  "references": [
                    {{
                      "target": "external",
                      "text": "Banks and Trust Companies Regulation Act (Ch. 316)",
                      "type": "external"
                    }}
                  ],
                  "children": []
                }}
              ]
            }},
            {{
              "id": "sec2:p2",
              "type": "paragraph",
              "number": "(2)",
              "title": "",
              "text": "For the purposes of this Act —",
              "level": 3,
              "references": [],
              "children": [
                {{
                  "id": "sec2:p2:a",
                  "type": "paragraph",
                  "number": "(a)",
                  "title": "",
                  "text": "in determining whether a person is fit and proper, in addition to considering any other relevant matter including a decision made in respect of the person by the Commission, or other regulator, court or tribunal wherever located, the Commission shall have regard to — (i) the financial status or solvency of the person; (ii) the educational or other qualifications and experience of the person, having regard to the nature of the role or functions that, if the application is allowed or granted, the person will perform; (iii) the ability of the person to carry on the regulated activity competently, honestly and fairly; (iv) the ability of the person to ensure a satisfactory standard of governance organisation and operational conduct; and (v) the reputation and character of — (A) where the person is an individual, the individual himself; or (B) where the person is a legal entity, the legal entity and any director, shareholder, chief executive officer and any other officer;",
                  "level": 4,
                  "references": [],
                  "children": [
                    {{
                      "id": "sec2:p2:a:i",
                      "type": "paragraph",
                      "number": "(i)",
                      "title": "",
                      "text": "the financial status or solvency of the person;",
                      "level": 5,
                      "references": [],
                      "children": []
                    }}
                  ]
                }}
              ]
            }}
          ]
        }}
      ]
    }}
  ]
}}
\`\`\`

**Note on References**: In the example, \`sec2:p1:a\` has an external reference to another Act. For internal references, like "see section 9" in later text, it would point to \`sec9\`.

**Document to parse:**
{document_text}

{format_instruction}
`);

    // Create the processing chain without JsonOutputParser for custom handling
    const processingChain = RunnableSequence.from([
      promptTemplate,
      llm,
    ]);

    setProcessingState({
      stage: 'parsing',
      progress: 75,
      message: 'Processing with LangChain + Gemini...',
    });

    // Handle large documents with chunking strategy if needed
    let rawResult;
    if (cleanedText.length > 150000) {
      logDebug('Using LangChain for large document processing');
      
      // For very large documents, we'll use a more structured approach
      rawResult = await processingChain.invoke({
        file_note: originalFile ? '**Note**: You have access to both the original document file and the cleaned text version below. Use both for the most accurate analysis.' : '',
        large_doc_note: '**IMPORTANT**: This is a large document. Focus on the main structure and key sections. Be comprehensive but ensure the JSON response is complete and well-formed.',
        document_text: cleanedText,
        format_instruction: 'CRITICAL: Return ONLY valid JSON. For this large document, ensure all JSON structures are properly closed and the response is complete.'
      });
    } else {
      logDebug('Using LangChain for standard document processing');
      
      rawResult = await processingChain.invoke({
        file_note: originalFile ? '**Note**: You have access to both the original document file and the cleaned text version below. Use both for the most accurate analysis.' : '',
        large_doc_note: '',
        document_text: cleanedText,
        format_instruction: 'Return only the JSON, no other text.'
      });
    }

    setProcessingState({
      stage: 'parsing',
      progress: 85,
      message: 'Parsing LangChain response...',
    });

    // Extract text content from LangChain response
    const responseText = typeof rawResult === 'string' ? rawResult : rawResult?.content || rawResult?.text || String(rawResult);
    
    logDebug('LangChain raw response', { 
      responseType: typeof rawResult,
      responseLength: responseText.length,
      snippet: textSnippet(responseText)
    });

    // Use our enhanced JSON recovery parser
    const result = parseJSONWithRecovery(responseText);

    setProcessingState({
      stage: 'parsing',
      progress: 90,
      message: 'Validating parsed structure...',
    });

    logDebug('LangChain parsing successful', { 
      resultType: typeof result,
      hasMetadata: !!result?.metadata,
      hasHierarchy: !!result?.hierarchy,
      hierarchyLength: result?.hierarchy?.length || 0,
      wasRecovered: !!result._parseError
    });

    return result;
    
  } catch (error: unknown) {
    const err: any = (error ?? {});
    logDebug('LangChain parsing error', {
      name: err?.name ?? 'UnknownError',
      message: err?.message ?? String(error),
      stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 3).join('\n') : undefined,
    });

    // Fallback to the original method if LangChain fails
    console.warn('LangChain parsing failed, falling back to direct Gemini API');
    return await parseWithGeminiDirect(cleanedText, rawText, setProcessingState, originalFile);
  }
}

// Fallback function using direct Gemini API
async function parseWithGeminiDirect(
  cleanedText: string, 
  rawText: string,
  setProcessingState: (state: ProcessingState) => void,
  originalFile?: File
): Promise<any> {
  // Initialize the Google Generative AI client and use Gemini 2.5 Flash with safety settings
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  // Simple direct API call with recovery parsing
  const prompt = `Parse this regulatory document into structured JSON format:

${cleanedText}

Return only valid JSON with metadata and hierarchy structure.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const generatedText = response.text();
  
  return parseJSONWithRecovery(generatedText);
}