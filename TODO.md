# TODO List for Contributors

This document outlines the current development priorities and tasks for contributors working on Regu-Graph Explorer. The main goal is to transform the current graph-based visualization into a Notion-like document exploration experience.

## 🎯 Major User Workflow Changes

### Current State
- Application shows a canvas/graph visualization after processing
- Right sidebar displays detailed node information
- Processing waits for AI to return complete JSON response
- Canvas merges and displays the final structure

### Target State
- **No more canvas/graph visualization** - replaced with document viewer
- **Immediate file rendering** after upload/URL input
- **Interactive left panel** for navigation and reference location
- **Right panel converted to chat interface** for knowledge building
- **Real-time document highlighting** when clicking references

## 📋 Priority Tasks

### 1. Remove Canvas/Graph Visualization (HIGH PRIORITY)
**Files to modify:**
- `src/components/workspace/CanvasWrapper.tsx` - Comment out, don't delete
- `src/components/workspace/AdaptiveCanvas.tsx` - Comment out, don't delete
- `src/components/workspace/StreamingGraphCanvas.tsx` - Comment out, don't delete
- `src/components/workspace/GraphCanvas.tsx` - Comment out, don't delete

**What to do:**
- Comment out all canvas-related components
- Keep the component structure intact for future reference
- Update imports to prevent build errors
- Ensure the center panel area is ready for document viewer

### 2. Implement Document Viewer (HIGH PRIORITY)
**New component to create:** `src/components/workspace/DocumentViewer.tsx`

**Features needed:**
- **PDF Rendering**: Use existing `pdfjs-dist` dependency
- **HTML Rendering**: Parse and display HTML content with proper formatting
- **Text Rendering**: Clean, readable text display with proper typography
- **URL Content Display**: Show extracted website content in organized, readable format
- **Scrollable Interface**: Handle long documents with smooth scrolling
- **Text Highlighting**: Support for highlighting specific sections when referenced

**Integration points:**
- Replace `CanvasWrapper` in `WorkspaceView.tsx`
- Connect to `documentData` from store
- Handle different file types (PDF, HTML, TXT, URL content)

### 3. Refactor Loading/Processing Flow (HIGH PRIORITY)
**Files to modify:**
- `src/components/processing/ProcessingView.tsx`
- `src/store/regulationStore.ts`

**Changes needed:**
- **Remove AI processing wait**: No more waiting for complete JSON response
- **Immediate file rendering**: Show document content as soon as file is processed
- **Animation-based loading**: Replace processing states with smooth animations
- **"Extracting..." message**: Show brief extraction animation, then render document
- **Background processing**: AI analysis continues in background without blocking UI

**New workflow:**
1. User uploads file/enters URL
2. Brief "Extracting..." animation (2-3 seconds)
3. Document viewer renders raw content immediately
4. AI processing continues in background
5. Left panel populates with structure as AI completes

### 4. Transform Left Panel to Interactive Navigation (HIGH PRIORITY)
**Files to modify:**
- `src/components/workspace/TreeNavigationPanel.tsx`
- `src/store/regulationStore.ts`

**New functionality:**
- **Clickable References**: Each section/reference is clickable
- **Document Location**: Clicking a reference highlights and scrolls to that location in the document
- **Notion-like Experience**: Smooth navigation between document sections
- **Reference Highlighting**: Visual feedback when references are clicked
- **Smart Scrolling**: Automatically scroll to and highlight referenced sections

**Technical requirements:**
- Implement scroll-to-section functionality
- Add text highlighting for selected references
- Update store to track highlighted sections
- Ensure smooth user experience

### 5. Convert Right Panel to Chat Interface (MEDIUM PRIORITY)
**Files to modify:**
- `src/components/workspace/DetailPanel.tsx` - Convert to chat interface
- `src/store/regulationStore.ts` - Add chat state management

**New features:**
- **Knowledge Building**: Users can click references to add them to chat knowledge
- **Chat Interface**: Right panel becomes a chat area for asking questions
- **Reference Management**: Badge system to show selected references
- **Remove References**: Ability to remove individual references from knowledge base
- **AI Integration**: Connect to existing AI services for Q&A

**Chat functionality:**
- Click any reference in left panel → adds to chat knowledge
- Each reference gets a removable badge
- Users can ask questions about selected references
- AI responds based on the selected document sections

### 6. Update State Management (MEDIUM PRIORITY)
**Files to modify:**
- `src/store/regulationStore.ts`

**New state additions:**
- **Chat State**: Selected references, chat messages, knowledge base
- **Document Viewer State**: Current scroll position, highlighted sections
- **Navigation State**: Active sections, reference tracking
- **UI State**: Panel states, viewer modes

**State structure:**
```typescript
interface ChatState {
  selectedReferences: Reference[];
  chatMessages: ChatMessage[];
  knowledgeBase: string[];
}

interface DocumentViewerState {
  scrollPosition: number;
  highlightedSections: string[];
  activeSection: string | null;
}
```

### 7. Enhance File Processing (MEDIUM PRIORITY)
**Files to modify:**
- `src/services/documentService.ts`
- `src/services/documentProcessor.ts`

**Improvements needed:**
- **Faster Initial Rendering**: Separate file parsing from AI analysis
- **Progressive Enhancement**: Show basic structure first, enhance with AI
- **Better Error Handling**: Graceful fallbacks for different file types
- **URL Content Organization**: Better formatting for web content extraction

## 🔧 Technical Implementation Details

### Document Viewer Implementation
```typescript
// Example structure for DocumentViewer
interface DocumentViewerProps {
  documentData: DocumentData | null;
  fileType: 'pdf' | 'html' | 'text' | 'url';
  onSectionClick: (sectionId: string) => void;
  highlightedSections: string[];
}

// PDF rendering with pdfjs-dist
const renderPDF = async (pdfBuffer: ArrayBuffer) => {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  // Implementation details...
};

// HTML rendering with sanitization
const renderHTML = (htmlContent: string) => {
  // Sanitize HTML, apply styling, make interactive
};

// Text rendering with proper formatting
const renderText = (textContent: string) => {
  // Apply typography, line breaks, section breaks
};
```

### Reference Highlighting System
```typescript
// Store updates for highlighting
const highlightSection = (sectionId: string) => {
  setHighlightedSections(prev => [...prev, sectionId]);
  scrollToSection(sectionId);
};

// Scroll and highlight implementation
const scrollToSection = (sectionId: string) => {
  const element = document.querySelector(`[data-section="${sectionId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    element.classList.add('highlighted');
  }
};
```

### Chat Integration
```typescript
// Chat state management
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  references?: string[];
}

// Reference selection
const addReferenceToChat = (reference: Reference) => {
  setSelectedReferences(prev => [...prev, reference]);
  updateKnowledgeBase(reference);
};
```

## 🧪 Testing Requirements

### Unit Tests
- Document viewer rendering for different file types
- Reference highlighting and navigation
- Chat functionality and state management
- File processing and parsing

### Integration Tests
- End-to-end user workflow
- Panel interactions and state updates
- File upload to document viewing flow

### Performance Tests
- Large document rendering performance
- Smooth scrolling and highlighting
- Memory usage with large files

## 📚 Documentation Updates

### Code Documentation
- Update component JSDoc comments
- Document new state management patterns
- Explain the new user workflow

### User Documentation
- Update README with new features
- Create user guide for the new interface
- Document keyboard shortcuts and navigation

## 🚀 Deployment Considerations

### Build Process
- Ensure all canvas components are properly commented out
- Verify no build errors from removed dependencies
- Test production build with new components

### Performance Monitoring
- Monitor initial load times
- Track document rendering performance
- Measure user interaction responsiveness

## 🔄 Future Enhancements (Post-MVP)

### Advanced Features
- **Search Functionality**: Full-text search within documents
- **Bookmarking**: Save important sections for quick access
- **Export Options**: Export highlighted sections or chat conversations
- **Collaboration**: Share documents and annotations with team members
- **Mobile Optimization**: Responsive design for mobile devices

### AI Enhancements
- **Smart Summarization**: AI-generated summaries of selected sections
- **Question Suggestions**: AI suggests relevant questions based on content
- **Cross-Reference Analysis**: Better understanding of document relationships

## 📝 Contribution Guidelines

### Before Starting
1. **Read the current codebase** to understand existing patterns
2. **Review this TODO list** to understand the scope
3. **Check existing issues** to avoid duplicate work
4. **Discuss approach** in GitHub Discussions before implementing

### During Development
1. **Follow existing code patterns** and naming conventions
2. **Test thoroughly** with different file types and sizes
3. **Update tests** for any new functionality
4. **Document changes** in code comments and README

### Pull Request Process
1. **Clear description** of what was implemented
2. **Screenshots/videos** showing the new functionality
3. **Test coverage** for new features
4. **Performance impact** assessment for large documents

## 🎯 Success Criteria

The refactoring will be considered successful when:

- ✅ Canvas visualization is completely removed (commented out)
- ✅ Documents render immediately after upload/URL input
- ✅ Left panel provides smooth navigation with reference highlighting
- ✅ Right panel functions as an interactive chat interface
- ✅ Users can build knowledge bases by selecting references
- ✅ No waiting for AI processing to view documents
- ✅ Smooth, Notion-like user experience
- ✅ All existing functionality preserved (file upload, processing, etc.)

---

**Note**: This is a significant refactoring that changes the core user experience. Please ensure thorough testing and consider the impact on existing users before merging changes.
