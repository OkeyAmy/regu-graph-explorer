# Quick Start Guide - Regu-Graph Explorer with LangExtract

Get up and running with Regu-Graph Explorer in under 5 minutes!

## 🎯 What You'll Need

1. **Google Gemini API Key** - Get it free at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Python 3.10+** - For the backend
3. **Node.js 18+** - For the frontend
4. **A regulatory document** - PDF, HTML, or TXT file

## 🚀 5-Minute Setup

### Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd regu-graph-explorer

# Install frontend dependencies
pnpm install
```

### Step 2: Configure API Keys (1 minute)

**Frontend Configuration:**
```bash
# Copy the example
cp .env.example .env.local

# Edit .env.local and add your API key:
# VITE_GEMINI_API_KEY=your_key_here
# VITE_BACKEND_URL=http://localhost:8000
```

**Backend Configuration:**
```bash
# Copy the backend example
cp backend/.env.example backend/.env

# Edit backend/.env and add your API key:
# LANGEXTRACT_API_KEY=your_key_here
# GEMINI_MODEL=gemini-2.5-flash
```

### Step 3: Start Everything (1 minute)

**Windows:**
```bash
start-all.bat
```

**macOS/Linux:**
```bash
# Terminal 1 - Backend
chmod +x start-backend.sh
./start-backend.sh

# Terminal 2 - Frontend
pnpm dev
```

### Step 4: Try It Out! (1 minute)

1. Open browser to `http://localhost:5173`
2. Upload a document (try the sample in `public/sample/`)
3. Watch the dual graph populate in real-time
4. Toggle between **Hierarchy** and **Entity** views
5. Click graph nodes to highlight in the document

## 🎨 What You'll See

### The Interface
```
┌──────────────────────────────────────────────────────────────┐
│  [Home] [Toggle Panels] [Search] [Hierarchy|Entity] [Tools] │
├─────────┬─────────────────────────────────┬──────────────────┤
│  GRAPH  │      DOCUMENT VIEWER            │      CHAT        │
│         │                                 │                  │
│  •─┬─•  │  ═══════════════════════        │  💬 Ask about   │
│    │    │  Section 1: Definitions         │  this document  │
│    •─•  │  ───────────────────────        │                  │
│    │    │  1.1 "Act" means...            │  [Type here...]  │
│    •    │                                 │                  │
│         │  Section 2: Requirements        │                  │
│         │  ───────────────────────        │                  │
└─────────┴─────────────────────────────────┴──────────────────┘
```

## 🎯 Try These Features

### 1. Hierarchy View
- See document structure as a tree
- Sections → Subsections → Clauses
- Click nodes to jump to text

### 2. Entity View
- See organizations, regulations, dates
- Understand relationships
- "Who regulates what?"

### 3. Real-time Processing
- Upload a document
- Watch the "LangExtract" badge appear
- See progress bar update live
- View results stream in

### 4. Chat Integration
- Click a section in the graph
- Ask questions in the chat panel
- Get AI responses with context

## 🔧 Common Issues

### "Backend not available"
✅ **Don't worry!** The app automatically falls back to quick processing.

To fix:
```bash
# Check if backend is running
curl http://localhost:8000/api/health

# If not, start it
cd backend
python main.py
```

### "API key not configured"
Edit your `.env` files and add your Gemini API key.

### Import errors in Python
```bash
cd backend
pip install -r requirements.txt
```

## 📖 Next Steps

- Read the [Full Documentation](docs/LANGEXTRACT_INTEGRATION.md)
- Check out [Sample Documents](public/sample/)
- Explore the [API Documentation](backend/README.md)
- Try different graph layouts
- Export your analysis

## 💡 Pro Tips

1. **Dual Processing**: The app shows your document immediately, then enhances it with LangExtract in the background
2. **Persistence**: All processed documents save to your browser automatically
3. **Offline Mode**: Works without the backend (uses quick processing)
4. **Graph Navigation**: Use the minimap in graph view to navigate large documents
5. **Keyboard Shortcuts**: Use arrow keys to navigate in the graph

## 🆘 Need Help?

- Check [Troubleshooting Guide](docs/LANGEXTRACT_INTEGRATION.md#troubleshooting)
- Review [GitHub Issues](TODO.md)
- Read [Contributing Guide](CONTRIBUTING.md)

---

**Ready to analyze some regulations!** 🚀


