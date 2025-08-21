export interface PromptStructure {
  systemMessage: string;
  userMessage: string;
}

export const buildRegulatoryPromptStructure = (documentText: string): PromptStructure => {
  const systemMessage = `Parse the regulatory document into a structured JSON that represents the hierarchy and all cross-references, preserving verbatim text.

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
          "text": "(1) In this Act, unless the context otherwise requires — \"accredited investor\" means any person who comes within any of the following categories, or whom the digital asset issuer, exchange or persons selling digital assets reasonably believes comes within any of the following categories, at the time of the issue, transfer or sale of digital asset to that person — (a) any bank licensed under the Banks and Trust Companies Regulation Act (Ch. 316) or licensed and operating outside of The Bahamas, whether acting in its individual or fiduciary capacity; ... (o) any person that is recognised or designated by the Commission as an accredited investor; ... (2) For the purposes of this Act — (a) in determining whether a person is fit and proper, ... (b) a person carries on digital asset business — (i) in The Bahamas, if irrespective of physical location, the person offers digital asset business services to a person who is not an accredited investor residing in The Bahamas; and (ii) from within The Bahamas, if the person, whether or not a legal entity offers digital asset business services to persons from or through a place in The Bahamas; and (c) a person shall not be deemed to be carrying on digital asset business in or from within The Bahamas solely due to the presence of data servers or physical maintenance of other parts of a digital asset exchange in The Bahamas.",
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

Return only the JSON, no other text.`;

  const userMessage = `Document to parse:
${documentText}`;

  return {
    systemMessage,
    userMessage
  };
};

// Legacy function for backward compatibility
export const buildRegulatorySystemPrompt = (documentText: string): string => {
  const { systemMessage, userMessage } = buildRegulatoryPromptStructure(documentText);
  return `${systemMessage}\n\n${userMessage}`;
};