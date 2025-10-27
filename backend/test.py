import os
import sys
import requests
import time
import logging

import langextract as lx
import textwrap
from collections import Counter, defaultdict
from pathlib import Path
try:
    from dotenv import load_dotenv  # optional
except Exception:
    load_dotenv = None  # type: ignore
try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter  # type: ignore
except Exception:
    RecursiveCharacterTextSplitter = None  # type: ignore
try:
    import PyPDF2  # type: ignore
except Exception:
    PyPDF2 = None  # type: ignore


def load_text_from_file(file_path: str) -> str:
    """Load text from TXT, PDF, or HTML files.

    Falls back gracefully if optional dependencies are missing.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()
    try:
        if suffix == '.txt':
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        if suffix == '.pdf':
            if PyPDF2 is None:
                raise RuntimeError("PyPDF2 not installed; cannot read PDF")
            text_parts = []
            with open(path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    try:
                        text_parts.append(page.extract_text() or "")
                    except Exception:
                        continue
            return "\n".join(text_parts)
        if suffix in ('.html', '.htm'):
            # Minimal HTML to text (strip tags). Avoid heavy deps; naive approach.
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                html = f.read()
            # Strip tags naively; for robust use BeautifulSoup if available.
            import re
            return re.sub(r'<[^>]+>', ' ', html)
        # Fallback: read as text
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        print(f"Failed to read {file_path}: {e}")
        return ""

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load API key from backend/.env if available
env_path = Path(__file__).parent / '.env'
if load_dotenv and env_path.exists():
    try:
        load_dotenv(dotenv_path=env_path, encoding='utf-8')
    except Exception:
        try:
            load_dotenv(dotenv_path=env_path, encoding='utf-8-sig')
        except Exception:
            pass

# Regulation-focused prompt and examples (aligned with backend service)
prompt = textwrap.dedent("""\
    Extract hierarchical elements and regulatory entities from the document.

    Hierarchy classes: part, section, subsection, clause, definition, proviso, reference.
    Entity classes: organization, regulation, obligation, penalty, fee, deadline, monetary_amount, authority_power, relationship.

    Requirements:
    - Use exact spans from the text for extraction_text (no paraphrasing).
    - Preserve order of appearance and avoid overlapping spans.
    - Provide helpful attributes.
      For hierarchy: number (e.g., "2", "2.1"), title, level (0=part,1=section,2=subsection,3=clause, 2 for definition/proviso), parent_number when clear.
      For references: type ("internal"|"external"), target (e.g., "section 3(1)"), anchor_section_number if clear.
      For entities: include attributes like name/subject/amount/currency/date/jurisdiction where applicable.
      For relationship: attributes must include type, source_name, target_name.
""")

examples = [
    # Hierarchy example
    lx.data.ExampleData(
        text=(
            "PART I - PRELIMINARY\n"
            "Section 2. Definitions\n"
            "\"digital asset\" means a cryptographically-secured representation of value;\n"
            "Provided that this definition shall not apply to loyalty points.\n"
            "Reference: See section 3(1).\n"
        ),
        extractions=[
            lx.data.Extraction(
                extraction_class="part",
                extraction_text="PART I - PRELIMINARY",
                attributes={"number": "I", "title": "PRELIMINARY", "level": 0}
            ),
            lx.data.Extraction(
                extraction_class="section",
                extraction_text="Section 2. Definitions",
                attributes={"number": "2", "title": "Definitions", "level": 1}
            ),
            lx.data.Extraction(
                extraction_class="definition",
                extraction_text='"digital asset" means a cryptographically-secured representation of value;',
                attributes={"term": "digital asset", "level": 2, "parent_number": "2"}
            ),
            lx.data.Extraction(
                extraction_class="proviso",
                extraction_text="Provided that this definition shall not apply to loyalty points.",
                attributes={"level": 2, "parent_number": "2"}
            ),
            lx.data.Extraction(
                extraction_class="reference",
                extraction_text="Reference: See section 3(1).",
                attributes={"type": "internal", "target": "section 3(1)", "anchor_section_number": "2"}
            ),
        ],
    ),
    # Entities example
    lx.data.ExampleData(
        text=(
            "The Securities Commission of Malaysia regulates digital asset exchanges.\n"
            "All exchanges must comply with the Digital Assets Act 2024.\n"
            "Registration fee of RM 50,000 is payable by 1 January 2025.\n"
        ),
        extractions=[
            lx.data.Extraction(
                extraction_class="organization",
                extraction_text="Securities Commission of Malaysia",
                attributes={"jurisdiction": "Malaysia"}
            ),
            lx.data.Extraction(
                extraction_class="regulation",
                extraction_text="Digital Assets Act 2024",
                attributes={}
            ),
            lx.data.Extraction(
                extraction_class="obligation",
                extraction_text="All exchanges must comply with the Digital Assets Act 2024.",
                attributes={"subject": "exchanges", "requirement": "comply", "mandatory": True}
            ),
            lx.data.Extraction(
                extraction_class="fee",
                extraction_text="Registration fee of RM 50,000",
                attributes={"amount": 50000, "currency": "MYR"}
            ),
            lx.data.Extraction(
                extraction_class="deadline",
                extraction_text="1 January 2025",
                attributes={"purpose": "registration"}
            ),
            lx.data.Extraction(
                extraction_class="relationship",
                extraction_text="regulates",
                attributes={"type": "enforces", "source_name": "Securities Commission of Malaysia", "target_name": "Digital Assets Act 2024"}
            ),
        ],
    ),
]

print("Processing local regulation document with LangExtract (chunked)...")

input_path = r"C:\Users\admin\Desktop\Project\regu-graph-explorer\backend\test_data\Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf"

full_text = load_text_from_file(input_path)
if not full_text.strip():
    print("No text extracted from input file; aborting.")
    sys.exit(1)

# Split text into chunks suitable for free tier
chunks: list[str]
if RecursiveCharacterTextSplitter:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=4000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", "; ", ", ", " "]
    )
    chunks = splitter.split_text(full_text)
else:
    # Fallback: naive fixed-size chunking
    size, overlap = 4000, 200
    chunks = [full_text[i:i+size] for i in range(0, len(full_text), size - overlap if size > overlap else size)]

print(f"Split document into {len(chunks)} chunk(s)")

# Extract per chunk and aggregate results
all_results = []
total_extractions = 0
total_chars = 0
for idx, chunk in enumerate(chunks, 1):
    start_t = time.time()
    logging.info(f"Starting extraction for chunk {idx}/{len(chunks)} (len={len(chunk)})")
    try:
        result = lx.extract(
            text_or_documents=chunk,
            prompt_description=prompt,
            examples=examples,
            model_id="gemini-2.5-flash",
            api_key=os.getenv("LANGEXTRACT_API_KEY"),
            extraction_passes=1,
            max_workers=1,
            max_char_buffer=5000,
        )
        # Accumulate
        all_results.append(result)
        extracted = 0
        try:
            extracted = len(result.extractions or [])
            total_extractions += extracted
        except Exception:
            extracted = 0
        try:
            total_chars += len(result.text or "")
        except Exception:
            total_chars += len(chunk)
        elapsed = time.time() - start_t
        logging.info(f"✓ Completed chunk {idx}/{len(chunks)}: {extracted} item(s) in {elapsed:.2f}s")
    except Exception as e:
        logging.error(f"✗ Chunk {idx} failed: {e}")
        continue

print(f"Extracted {total_extractions} items across {len(all_results)} successful chunk(s) from ~{len(full_text):,} characters")

# Save and visualize the aggregated results
if all_results:
    lx.io.save_annotated_documents(all_results, output_name="regulation_extractions.jsonl", output_dir=".")
else:
    print("No successful extractions to save.")

# Generate the interactive visualization
html_content = lx.visualize("regulation_extractions.jsonl")
# Write as UTF-8 bytes to avoid Windows cp1252 encoding issues
content = html_content.data if hasattr(html_content, 'data') else html_content
try:
    data_bytes = content if isinstance(content, (bytes, bytearray)) else str(content).encode('utf-8')
except Exception:
    data_bytes = str(content).encode('utf-8', errors='ignore')
with open("regulation_visualization.html", "wb") as f:
    f.write(data_bytes)

print("Interactive visualization saved to regulation_visualization.html")