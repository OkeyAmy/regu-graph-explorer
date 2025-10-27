# LangExtract Backend Service

FastAPI backend service for extracting structured information from legal and regulatory documents using Google's langextract library.

## Features

- **Dual Extraction Modes**:
  - **Hierarchy Extraction**: Document structure (sections, subsections, clauses)
  - **Entity Extraction**: Entities and their relationships (organizations, dates, regulations)
  
- **Real-time Streaming**: WebSocket support for progress updates
- **Multiple File Formats**: PDF, HTML, TXT
- **Google Gemini Integration**: Powered by langextract with Gemini 2.5 Flash

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env`:
```env
LANGEXTRACT_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Run the Server

```bash
# From the backend directory
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```http
GET /
GET /api/health
```

### Extract from Document
```http
POST /api/extract
Content-Type: multipart/form-data

Parameters:
- file: Document file (PDF, HTML, TXT)
- session_id: (Optional) Session ID for WebSocket updates
```

### WebSocket Connection
```
WS /ws/{session_id}
```

Real-time progress updates during document processing.

## API Response Format

```json
{
  "document_data": {
    "metadata": {
      "title": "Document Title",
      "jurisdiction": "Malaysia",
      "document_type": "Regulation",
      "source": "filename.pdf"
    },
    "hierarchy": [
      {
        "id": "section-1",
        "type": "section",
        "number": "1",
        "title": "Definitions",
        "text": "Section 1: Definitions...",
        "level": 0,
        "references": [],
        "children": []
      }
    ]
  },
  "entity_graph": {
    "entities": [
      {
        "id": "org-1",
        "type": "organization",
        "name": "Securities Commission",
        "text": "The Securities Commission..."
      }
    ],
    "relationships": [
      {
        "id": "rel-1",
        "source_entity_id": "org-1",
        "target_entity_id": "reg-1",
        "relationship_type": "enforces"
      }
    ]
  },
  "processing_time": 12.5,
  "extraction_method": "langextract"
}
```

## Development

### Project Structure

```
backend/
├── main.py                 # FastAPI application
├── services/
│   └── langextract_service.py  # Core langextract integration
├── models/
│   └── schemas.py         # Pydantic data models
├── utils/
│   └── document_processor.py  # Document text extraction
├── test_data/             # Sample documents for testing
├── requirements.txt       # Python dependencies
└── .env                   # Environment configuration
```

### Testing

Place test documents in `test_data/` directory and use the API:

```bash
curl -X POST "http://localhost:8000/api/extract" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_data/sample.pdf"
```

## Troubleshooting

### Import Errors

If you get import errors, make sure you're running from the project root:

```bash
# From project root (regu-graph-explorer/)
cd backend
python -m backend.main
```

Or add the project root to PYTHONPATH:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python backend/main.py
```

### API Key Issues

Make sure your `.env` file contains a valid Gemini API key:
- Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Set it in `.env` as `LANGEXTRACT_API_KEY`

### WebSocket Connection Issues

Ensure CORS is properly configured in `.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## License

Same as parent project (MIT)

