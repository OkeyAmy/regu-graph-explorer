# Regu-Graph Explorer

A sophisticated document analysis and exploration tool that transforms legal documents, regulations, and web content into interactive, navigable structures. **Now powered by Google's LangExtract** for precise, source-grounded extraction with dual graph visualization modes.



## 🎯 What This Application Does

Regu-Graph Explorer is designed to help users navigate complex documents by:

- **Upload & Process**: Accept PDF, HTML, and text files with instant preview
- **LangExtract AI Analysis**: Advanced extraction with Google's langextract library via FastAPI backend (test net)
- **Dual Graph Modes**: 
  - **Hierarchy View**: Document structure as an interactive tree
  - **Entity View**: Network of entities and their relationships
- **Real-time Streaming**: Live progress updates during processing
- **Smart Referencing**: Click graph nodes to highlight sections in the document
- **Chat Integration**: AI-powered queries with document context
- **Hybrid Processing**: Automatic fallback if backend unavailable

> **Note**: The backend is currently running as a **test net**. The main LangExtract function (`backend/test.py`) is used to update and test API endpoints and extraction logic before integration into the production FastAPI service.

## 🏗️ Architecture

The application uses a **modern hybrid architecture** with React frontend and Python FastAPI backend:

### Frontend Structure
```
src/
├── components/
│   ├── layout/          # Main layout components
│   ├── upload/          # File upload and URL input interface
│   ├── workspace/       # Three-panel workspace (Graph-Document-Chat)
│   │   ├── GraphVisualization.tsx    # Dual-mode graph component
│   │   ├── DocumentViewer.tsx        # Center document viewer
│   │   └── ChatPanel.tsx             # AI chat interface
│   ├── processing/      # Document processing views
│   └── ui/             # Reusable UI components (shadcn/ui)
├── services/
│   ├── langextractApiService.ts  # Backend API client
│   ├── documentService.ts        # Hybrid processing orchestration
│   └── streaming/                # Real-time updates
├── store/               # Zustand state (with graph mode & entities)
├── hooks/               # Custom hooks (WebSocket, etc.)
└── types/               # TypeScript types for LangExtract
```

### Backend Structure
```
backend/
├── main.py                      # FastAPI application (test net)
├── test.py                      # Main LangExtract function for testing/updating endpoints
├── services/
│   └── langextract_service.py  # LangExtract integration
├── models/
│   └── schemas.py              # Pydantic data models
├── utils/
│   └── document_processor.py  # Text extraction utilities
└── requirements.txt            # Python dependencies
```

#### Important Notes:
- **test.py**: Contains the core LangExtract implementation used to develop and test extraction logic. This file is used to update API endpoints and verify extraction behavior before integrating into the FastAPI service.
- **Current Status**: Backend is running as a test net for development and integration testing.

### Key Components

- **MainLayout**: Orchestrates the application flow between upload, processing, and workspace views
- **UploadInterface**: Handles file uploads (PDF, HTML, TXT) and URL input with drag-and-drop support
- **WorkspaceView**: Three-panel layout with graph (left), document viewer (center), and chat (right)
- **GraphVisualization**: Dual-mode component with hierarchy tree and entity network views
- **DocumentViewer**: Renders PDFs, HTML, and text with section highlighting
- **ChatPanel**: AI-powered chat with document context
- **LangExtractService**: Python service wrapping langextract for structured extraction

### State Management

Uses Zustand for state management with the following key stores:
- **regulationStore**: Enhanced with graph mode, entity data, and extraction method tracking
- **streamingState**: Handles real-time AI processing updates
- **documentData**: Stores parsed document hierarchy
- **entityGraph**: Stores extracted entities and relationships

### Processing Pipeline (Hybrid Approach)

1. **Document Upload**: File or URL input → **Instant preview shown**
2. **LangExtract Analysis** (if backend available):
   - Connect to FastAPI backend via REST + WebSocket
   - Extract document hierarchy (sections, subsections, clauses)
   - Extract entities (organizations, dates, regulations, etc.)
   - Map relationships between entities
   - Stream progress updates in real-time
3. **Fallback Processing** (if backend unavailable):
   - Use local LangChain-based processing
   - Provide quick document structure
4. **Visualization**: Populate dual-mode graph
5. **Storage**: Save to browser localStorage

## 🚀 Getting Started

### Prerequisites

**Frontend:**
- Node.js 18+ 
- pnpm (recommended) or npm
- Modern browser with ES2020+ support

**Backend (for LangExtract):**
- Python 3.10+
- pip package manager
- Google Gemini API key

### Quick Start (With LangExtract Backend - Test Net)

> **Backend Status**: Currently running as a test net. Use `backend/test.py` to test and update LangExtract extraction logic and API endpoints.

#### Option 1: Automated Start (Windows)
```bash
# Starts both backend and frontend
start-all.bat
```

#### Option 2: Manual Start

**1. Start Backend (Test Net):**
```bash
# Windows
start-backend.bat

# macOS/Linux
chmod +x start-backend.sh
./start-backend.sh
```

**2. Test LangExtract Locally:**
```bash
# Run the main test script to update extraction logic
cd backend
python test.py
```

**3. Start Frontend:**
```bash
pnpm install
pnpm dev
```

### Configuration

**Frontend** - Create `.env.local`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_BACKEND_URL=http://localhost:8000
```

**Backend** - Create `backend/.env`:
```env
LANGEXTRACT_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)


### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm build:dev` - Build for development
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

## 🛠️ Technology Stack

**Frontend:**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (enhanced with graph modes)
- **Graph Visualization**: @xyflow/react (ReactFlow)
- **File Processing**: PDF.js, HTML parsing
- **UI Components**: Radix UI primitives
- **Routing**: React Router DOM
- **Real-time**: WebSocket API

**Backend (Test Net):**
- **Framework**: FastAPI + Python 3.10+
- **AI Processing**: Google's LangExtract + Gemini 2.5 Flash
- **Main Function**: `test.py` - Core LangExtract implementation for testing and endpoint updates
- **Data Validation**: Pydantic v2
- **WebSocket**: Built-in FastAPI WebSocket support
- **File Processing**: PyPDF2, BeautifulSoup4
- **Server**: Uvicorn (ASGI)
- **Status**: Test network for development and integration testing

## 📁 Project Structure Deep Dive

### Components Architecture

The application uses a component-based architecture with clear separation of concerns:

- **Layout Components**: Handle overall application structure and routing
- **Feature Components**: Implement specific functionality (upload, processing, workspace)
- **UI Components**: Reusable interface elements built on shadcn/ui
- **Service Components**: Handle business logic and external integrations

### State Management Pattern

Zustand stores are organized by domain:
- Document data and processing state
- UI state (panel collapse, selections)
- Streaming and real-time updates
- User preferences and saved documents

### Service Layer

- **DocumentService**: Orchestrates the entire document processing pipeline
- **DocumentProcessor**: Handles AI-powered document analysis
- **StreamingService**: Manages real-time processing updates

## 🔧 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React functional component patterns with hooks
- Implement proper error handling and loading states
- Use Tailwind CSS for styling (avoid custom CSS when possible)
- Follow the existing component structure and naming conventions

### Testing

- Write unit tests for utility functions and hooks
- Test component behavior with React Testing Library
- Ensure proper error handling and edge cases

### Performance

- Implement proper memoization for expensive operations
- Use React.memo for components that don't need frequent re-renders
- Optimize bundle size with proper code splitting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [TODO List](TODO.md) for current development priorities and guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the established patterns
4. Test thoroughly
5. Submit a pull request with a clear description of changes

### Code Review Process

- All changes require a pull request
- Code reviews focus on functionality, quality, and maintainability
- Ensure tests pass and new functionality is properly tested

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions in GitHub Discussions
- **Documentation**: Check the [docs/](docs/) folder for detailed guides

## ✨ Key Features

### Dual Graph Visualization
- **Hierarchy Mode**: Navigate document structure as an interactive tree
- **Entity Mode**: Explore entities and their relationships as a network graph
- Switch modes instantly with the toolbar toggle

### Real-time Processing
- Live progress updates via WebSocket
- Stream extraction results as they're generated
- See exactly which section is being processed

### Hybrid Architecture
- **Primary**: LangExtract backend for precise, source-grounded extraction
- **Fallback**: Local quick processing if backend unavailable
- Seamless user experience regardless of backend status

### Advanced Extraction
- Document hierarchy (sections, subsections, clauses)
- Entity extraction (organizations, regulations, dates, amounts)
- Relationship mapping (references, regulates, enforces, etc.)
- Cross-reference identification

### User Experience
- Instant document preview on upload
- Click graph nodes to highlight in document
- Browser-based storage (no server required for persistence)
- Responsive three-panel layout
- Export capabilities

## 📚 Documentation

- **[LangExtract Integration Guide](docs/LANGEXTRACT_INTEGRATION.md)** - Complete setup and usage
- **[Backend API Documentation](backend/README.md)** - FastAPI endpoints and development
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute
- **[TODO List](TODO.md)** - Current development priorities

## 🔮 Roadmap

- [x] LangExtract integration with FastAPI backend
- [x] Dual graph visualization modes (hierarchy + entities)
- [x] Real-time WebSocket streaming
- [x] Hybrid processing with automatic fallback
- [ ] URL extraction support in backend
- [ ] Local Ollama integration for offline processing
- [ ] Enhanced entity relationship types
- [ ] Collaborative features for team document analysis
- [ ] Export to multiple formats (JSON, CSV, PDF)
- [ ] Mobile-responsive design improvements
- [ ] Custom entity type definitions
- [ ] Advanced search and filtering in graph

## 🐛 Troubleshooting

### Backend Won't Start
- Ensure Python 3.10+ is installed: `python --version`
- Check virtual environment is activated
- Verify all dependencies installed: `pip install -r backend/requirements.txt`
- Check API key in `backend/.env`
- **Test extraction locally**: Run `python backend/test.py` to verify LangExtract is working before starting the FastAPI server

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check `VITE_BACKEND_URL` in `.env.local`
- Application will automatically fallback to quick processing

### WebSocket Connection Failed
- Check CORS settings in `backend/.env`
- Ensure no firewall blocking port 8000
- Verify browser console for specific errors

For more troubleshooting, see [LangExtract Integration Guide](docs/LANGEXTRACT_INTEGRATION.md#troubleshooting)

### Developing with test.py
The `backend/test.py` file is the main development script for LangExtract extraction:
- **Purpose**: Test and update extraction logic before integrating into the FastAPI API
- **Usage**: Run directly with `python backend/test.py` to process documents and generate visualizations
- **Updates**: Changes to extraction prompts, examples, or chunking logic should be tested here first
- **Integration**: Once verified, logic should be integrated into `backend/services/langextract_service.py`

---

**Built with ❤️ using modern web technologies, AI capabilities, and Google's LangExtract**
