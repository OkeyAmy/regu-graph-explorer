# Regu-Graph Explorer

A sophisticated document analysis and exploration tool that transforms legal documents, regulations, and web content into interactive, navigable structures. Built with modern React and AI-powered processing, it provides a Notion-like experience for document exploration and reference management.

## 🎯 What This Application Does

Regu-Graph Explorer is designed to help users navigate complex documents by:

- **Upload & Process**: Accept PDF, HTML, and text files, or extract content from URLs
- **AI-Powered Analysis**: Use advanced AI to parse document structure, identify sections, and extract references
- **Interactive Navigation**: Provide a hierarchical tree view for easy document navigation
- **Smart Referencing**: Click any reference to instantly locate it within the document
- **Chat Integration**: Build knowledge bases by selecting document sections for AI-powered queries

## 🏗️ Current Architecture

The application follows a modern React architecture with the following key components:

### Core Structure
```
src/
├── components/
│   ├── layout/          # Main layout components
│   ├── upload/          # File upload and URL input interface
│   ├── workspace/       # Main document workspace with panels
│   ├── processing/      # Document processing and AI analysis
│   └── ui/             # Reusable UI components (shadcn/ui)
├── store/               # Zustand state management
├── services/            # Document processing and AI services
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions and configurations
```

### Key Components

- **MainLayout**: Orchestrates the application flow between upload, processing, and workspace views
- **UploadInterface**: Handles file uploads (PDF, HTML, TXT) and URL input with drag-and-drop support
- **WorkspaceView**: Three-panel layout with tree navigation, document viewer, and detail panel
- **TreeNavigationPanel**: Hierarchical view of document structure with clickable references
- **CanvasWrapper**: Currently displays graph visualization (to be replaced with document viewer)
- **DetailPanel**: Shows detailed information about selected nodes (to be converted to chat interface)

### State Management

Uses Zustand for state management with the following key stores:
- **regulationStore**: Manages document data, processing state, UI state, and saved documents
- **streamingState**: Handles real-time AI processing updates
- **documentData**: Stores parsed document hierarchy and metadata

### AI Processing Pipeline

1. **Document Upload**: File or URL input
2. **AI Analysis**: LangChain-based processing with Google Generative AI
3. **Streaming Updates**: Real-time progress updates during processing
4. **Structure Extraction**: Hierarchical organization of document sections
5. **Reference Mapping**: Cross-reference identification and linking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Modern browser with ES2020+ support

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd regu-graph-explorer

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm build:dev` - Build for development
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **AI Processing**: LangChain + Google Generative AI
- **File Processing**: PDF.js, HTML parsing, text processing
- **UI Components**: Radix UI primitives with custom styling
- **Routing**: React Router DOM
- **HTTP Client**: Axios (for future API integrations)

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

## 🔮 Roadmap

- Enhanced document viewer with better rendering
- Improved AI processing accuracy
- Advanced search and filtering capabilities
- Collaborative features for team document analysis
- Export and sharing functionality
- Mobile-responsive design improvements

---

**Built with ❤️ using modern web technologies and AI capabilities**
