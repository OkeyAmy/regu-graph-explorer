# Testing LangExtract Integration

## Quick Test

The fastest way to verify everything is working:

### Windows
```bash
cd backend
test-quick.bat
```

### macOS/Linux
```bash
cd backend
chmod +x test-quick.sh
./test-quick.sh
```

## What the Test Does

The test script (`test_extraction.py`) will:

1. ✅ Check your API key is configured
2. ✅ Initialize the LangExtract service
3. ✅ Process a sample legal document (Digital Assets Act 2024)
4. ✅ Extract hierarchy (parts, sections, subsections, provisos, references)
5. ✅ Extract entities (organizations, regulations, penalties, fees, deadlines)
6. ✅ Show detailed statistics and results
7. ✅ Display extraction tree and entity graph

## Expected Output

You should see output like:

```
================================================================================
LANGEXTRACT EXTRACTION TEST
================================================================================
✓ API key configured (length: 39)
✓ Using model: gemini-2.0-flash-exp
✓ Service initialized

================================================================================
Processing sample document (2345 chars)
================================================================================

2025-10-10 16:00:00,123 - INFO - Starting hierarchy extraction for sample_digital_assets_act.txt (2345 chars)
2025-10-10 16:00:00,124 - INFO - Calling langextract with: passes=2, workers=10, buffer=2000
... (langextract processing logs) ...
2025-10-10 16:00:45,678 - INFO - LangExtract completed in 45.55s
2025-10-10 16:00:45,679 - INFO - Raw extractions returned: 87
2025-10-10 16:00:45,680 - INFO - Processing 87 extractions into hierarchy
2025-10-10 16:00:45,681 - INFO - Extraction types: {'part': 3, 'section': 7, 'subsection': 15, 'definition': 3, 'proviso': 2, 'reference': 3, ...}
2025-10-10 16:00:45,682 - INFO - Built hierarchy with 3 top-level nodes

================================================================================
EXTRACTION RESULTS
================================================================================

Document Metadata:
  Title: sample_digital_assets_act.txt
  Type: Document
  Jurisdiction: Unknown

Hierarchy Structure:
  Top-level nodes: 3
  Total nodes: 45

Hierarchy Tree:
├─ [part] I PRELIMINARY
├─   [section] 1 Short title and commencement
├─     [subsection] 1 
├─     [subsection] 2 
├─   [section] 2 Definitions
├─     [definition]  digital asset
├─     [proviso]  
├─     [reference]   → internal: section 3(1)
├─ [part] II REGISTRATION OF EXCHANGES
├─   [section] 3 Requirement to register
...

Entity Graph:
  Total entities: 12
  Total relationships: 5

Entities by Type:
  organization (2):
    - Securities Commission of Malaysia
    - Commission
  regulation (2):
    - Digital Assets Act 2024
    - Capital Markets and Services Act 2007
  penalty (2):
    - fine not exceeding RM 10,000,000
    - administrative penalties not exceeding RM 1,000,000
  fee (1):
    - RM 50,000
  deadline (1):
    - 31 December 2024
  ...

Relationships:
  org-1 --[enforces]--> reg-1
  org-1 --[imposes]--> penalty-1
  ...

Processing Statistics:
  Total time: 56.23s
  Method: langextract

================================================================================
✅ SUCCESS! Extraction working correctly.
✅ Extracted 45 hierarchy nodes and 12 entities
================================================================================
```

## Troubleshooting

### ❌ API Key Not Set

```
ERROR: LANGEXTRACT_API_KEY not set!
```

**Solution**: Create `backend/.env` with your API key:
```bash
cd backend
echo "LANGEXTRACT_API_KEY=your_actual_key_here" > .env
```

Get your key from: https://aistudio.google.com/app/apikey

### ❌ No Extractions Found

```
⚠️  WARNING: No extractions found!
```

**Check**:
1. API key is valid (test at https://aistudio.google.com)
2. You have quota remaining (check Gemini API console)
3. Model name is correct (`gemini-2.0-flash-exp` or `gemini-2.5-flash`)
4. Network connection is working

### ❌ Import Errors

```
ModuleNotFoundError: No module named 'langextract'
```

**Solution**: Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### ⏱️ Taking Too Long

**This is normal!** LangExtract processes large documents in chunks:
- Small docs (< 5KB): ~10-20 seconds
- Medium docs (5-50KB): ~30-90 seconds  
- Large docs (> 50KB): ~60-180 seconds

The test document is ~2KB and should take 30-60 seconds.

**Why?**
- Multiple extraction passes (2x for better accuracy)
- Parallel processing (10 workers)
- Multiple API calls to Gemini
- Alignment and post-processing

**Progress**: Watch the logs! You'll see:
- Chunking progress
- API call logs (HTTP 200 OK)
- Alignment process
- Extraction counts

## Testing with Real Documents

To test with your own document:

```python
# backend/test_my_doc.py
import asyncio
from pathlib import Path
from test_extraction import main as test_main
from services.langextract_service import LangExtractService
import os

async def test_my_document():
    # Read your document
    doc_path = Path("path/to/your/document.pdf")
    text = doc_path.read_text()  # or use extract_text_from_file for PDFs
    
    api_key = os.getenv("LANGEXTRACT_API_KEY")
    service = LangExtractService(api_key=api_key)
    
    result = await service.extract_document_structure(
        text=text,
        filename=doc_path.name
    )
    
    print(f"Extracted {len(result.document_data.hierarchy)} hierarchy nodes")
    print(f"Extracted {len(result.entity_graph.entities)} entities")

if __name__ == "__main__":
    asyncio.run(test_my_document())
```

## Performance Benchmarks

Based on testing:

| Document Size | Extraction Time | Hierarchy Nodes | Entities |
|--------------|----------------|----------------|----------|
| 2 KB (sample) | ~30-60s | ~40-50 | ~10-15 |
| 50 KB (small) | ~60-120s | ~150-250 | ~30-50 |
| 200 KB (medium) | ~120-240s | ~500-800 | ~80-150 |
| 500 KB+ (large) | ~240-600s | ~1500+ | ~200+ |

**Tips for faster processing**:
- Use `gemini-2.0-flash-exp` (faster, experimental)
- Reduce `extraction_passes` from 2 to 1 (less accurate)
- Increase `max_char_buffer` from 2000 to 5000 (may reduce accuracy)
- Reduce `max_workers` if hitting rate limits

Edit in `backend/services/langextract_service.py`:
```python
result = lx.extract(
    ...,
    extraction_passes=1,  # Default: 2
    max_workers=20,       # Default: 10
    max_char_buffer=5000, # Default: 2000
)
```

## Next Steps

Once the test passes:

1. ✅ Test passed? Start the backend server:
   ```bash
   cd backend
   python main.py
   ```

2. ✅ Upload a document through the frontend UI

3. ✅ Watch the backend logs for progress

4. ✅ See extractions appear in the graph visualization

## Need Help?

- Check backend logs for detailed error messages
- Verify API key at https://aistudio.google.com/app/apikey
- Check Gemini API quota and rate limits
- Review `backend/services/langextract_service.py` for prompts and examples
- See main documentation: `docs/LANGEXTRACT_INTEGRATION.md`


