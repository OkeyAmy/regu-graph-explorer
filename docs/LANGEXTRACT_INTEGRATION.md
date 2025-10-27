# LangExtract Integration Guide

This document explains how to set up and use the LangExtract-powered document processing in Regu-Graph Explorer.

## Overview

Regu-Graph Explorer now uses Google's `langextract` library via a FastAPI backend to provide advanced document analysis with:

- **Dual Graph Modes**: Switch between hierarchical document structure and entity relationship views
- **Real-time Streaming**: Live progress updates during processing
- **Hybrid Processing**: Automatic fallback to quick processing if backend is unavailable
- **Source Grounding**: Precise linking between extracted data and source text

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │  Graph   │  │  Document   │  │     Chat     │           │
│  │  (Left)  │  │   Viewer    │  │   (Right)    │           │
│  │          │  │  (Center)   │  │              │           │
│  └──────────┘  └─────────────┘  └──────────────┘           │
│         │              │                   │                 │
│         └──────────────┴───────────────────┘                 │
│                        │                                     │
│              Zustand Store + Services                        │
└────────────────────────┼───────────────────────────────────┘
                         │
                    WebSocket + REST API
                         │
┌────────────────────────┼───────────────────────────────────┐
│               FastAPI Backend (Python)                       │
│  ┌──────────────────────────────────────────────┐           │
│  │         LangExtract Service                   │           │
│  │  - Hierarchy Extraction                       │           │
│  │  - Entity Extraction                          │           │
│  │  - Relationship Mapping                       │           │
│  └──────────────────────────────────────────────┘           │
│                        │                                     │
│                 Google Gemini API                            │
└──────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Backend Setup

#### Prerequisites
- Python 3.10 or higher
- pip package manager

#### Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configuration

1. Copy the environment example:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Gemini API key:
```env
LANGEXTRACT_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

3. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

#### Running the Backend

```bash
# From the backend directory
python main.py

# Or with uvicorn:
uvicorn main:app --reload --port 8000
```

The backend will start on `http://localhost:8000`

### 2. Frontend Setup

#### Prerequisites
- Node.js 18+ 
- pnpm (or npm)

#### Configuration

1. Update `.env.local` in the project root:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_BACKEND_URL=http://localhost:8000
```

2. Install frontend dependencies (if not already done):
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

The frontend will start on `http://localhost:5173`

## Features

### Dual Graph Visualization

#### Hierarchy Mode
- Shows document structure as a tree
- Sections, subsections, clauses, and their relationships
- Navigate by clicking nodes to highlight in document
- Ideal for understanding document organization

#### Entity Mode
- Shows extracted entities and their relationships
- Organizations, regulations, dates, monetary amounts
- Relationship types: references, regulates, enforces, etc.
- Ideal for understanding key players and connections

**Toggle between modes** using the controls in the header toolbar.

### Hybrid Processing Flow

The application uses an intelligent hybrid approach:

1. **Quick Preview** (Immediate)
   - Document uploads and displays instantly
   - User can start reading right away
   
2. **LangExtract Processing** (Background)
   - Attempts to connect to FastAPI backend
   - If available: uses langextract for detailed analysis
   - Real-time progress updates via WebSocket
   
3. **Fallback** (If Backend Unavailable)
   - Automatically uses local quick processing
   - Still provides document structure
   - No interruption to user experience

### Real-time Streaming

Progress updates are streamed in real-time:
- Connection status
- Processing stages
- Current section being analyzed
- Progress percentage
- Completion time

### Browser Storage

All processed documents are saved to browser localStorage:
- No server-side storage required
- Instant access to previously analyzed documents
- Export and share capabilities

## Usage

### Processing a Document

1. **Upload**: 
   - Click "Upload" or drag-and-drop a file (PDF, HTML, TXT)
   - Document appears immediately in center panel

2. **View Progress**:
   - Watch the graph panel populate in real-time
   - See extraction progress in the header
   - "LangExtract" badge appears when using backend

3. **Explore**:
   - Click nodes in the graph to highlight in document
   - Toggle between Hierarchy and Entity views
   - Use chat panel for AI-powered queries

### Graph Mode Selection

In the header toolbar:
- **Hierarchy Button**: Tree view of document structure
- **Entities Button**: Network view of entities and relationships
- Badge shows extraction method (LangExtract vs. Quick)

### Filtering and Search

- **Search Bar**: Find sections by text
- **Filters**: Filter by node type, references, etc.
- **Graph Interaction**: Click nodes to focus

## API Endpoints

### Backend Endpoints

#### Health Check
```http
GET http://localhost:8000/api/health
```

Returns backend status and configuration.

#### Extract Document
```http
POST http://localhost:8000/api/extract
Content-Type: multipart/form-data

file: <document_file>
session_id: <optional_websocket_session>
```

Returns complete extraction with hierarchy and entities.

#### WebSocket
```
ws://localhost:8000/ws/{session_id}
```

Real-time progress updates during processing.

## Troubleshooting

### Backend Not Starting

**Error**: `ModuleNotFoundError: No module named 'langextract'`

**Solution**: Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### API Key Issues

**Error**: `LANGEXTRACT_API_KEY not configured`

**Solution**: 
1. Create `backend/.env` file
2. Add your Gemini API key
3. Restart backend

### WebSocket Connection Failed

**Error**: `WebSocket connection failed`

**Solution**:
1. Check backend is running on port 8000
2. Verify CORS_ORIGINS in `backend/.env`
3. Check browser console for CORS errors

### Frontend Can't Connect to Backend

**Error**: `LangExtract backend is not available`

**Solution**:
1. Verify backend is running: `http://localhost:8000/`
2. Check `VITE_BACKEND_URL` in `.env.local`
3. Application will fallback to quick processing

### Import Errors in Python

**Error**: `ImportError: cannot import name 'X' from 'backend'`

**Solution**: Run from project root with correct PYTHONPATH
```bash
# From project root (regu-graph-explorer/)
cd backend
python -m backend.main
```

## Development

### Adding New Entity Types

Edit `backend/services/langextract_service.py`:

```python
# In _extract_entities method, update the prompt:
prompt_description = """
Extract entities: organizations, persons, dates, regulations, 
YOUR_NEW_TYPE, and monetary amounts.
"""
```

### Customizing Graph Layout

Edit `src/components/workspace/GraphVisualization.tsx`:

```typescript
// Adjust positioning in hierarchyFlowData or entityFlowData
const xPosition = level * 250;  // Horizontal spacing
const yPosition = yOffset;      // Vertical spacing
```

### Adding New Prompts

Edit `backend/services/langextract_service.py`:

```python
# Add to examples array in _extract_hierarchy or _extract_entities
examples = [
    {
        "input": "Your example input...",
        "output": { /* Expected structure */ }
    }
]
```

## Performance Tips

1. **Large Documents**: LangExtract automatically chunks documents over token limits
2. **API Costs**: Use local Ollama models for development (future feature)
3. **Caching**: Processed documents are stored in localStorage
4. **Batch Processing**: Process multiple documents sequentially

## Next Steps

- [ ] Add URL extraction support
- [ ] Implement local Ollama support for offline processing
- [ ] Add export to various formats (JSON, CSV, PDF)
- [ ] Collaborative features for team document analysis
- [ ] Custom entity type definitions

## Support

For issues and questions:
- Check [GitHub Issues](../TODO.md)
- Review [Contributing Guide](../CONTRIBUTING.md)
- See backend logs in terminal
- Check browser console for frontend errors

## License

Same as parent project (MIT)

