# Test Streaming Progress

## Quick Test Steps

### 1. Start Backend
```bash
cd backend
python main.py
```

### 2. Start Frontend (in new terminal)
```bash
npm run dev
```

### 3. Test Upload
1. Open http://localhost:5173
2. Upload the sample PDF: `public/sample/Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf`
3. Watch the streaming progress display:
   - ✅ Stage transitions (Uploading → Hierarchy → Entities → Building → Complete)
   - ✅ Progress percentage updates (0% → 100%)
   - ✅ Chunk progress badges
   - ✅ Phase descriptions
   - ✅ Extracted items count

### Expected Behavior

**During hierarchy extraction (30% → 58%):**
- Shows: "Building Hierarchy"
- Displays: "Processing hierarchy in X chunks..."
- Updates: Chunk progress badges
- Shows: "23 items extracted" when complete

**During entity extraction (60% → 88%):**
- Shows: "Extracting Entities"
- Displays: "Identifying entities (this may take a few minutes)..."
- Updates: Chunk progress badges
- Shows: "15 entities, 8 relationships" when complete

**On completion (100%):**
- Shows checkmark icon
- Stage changes to "Complete"
- Transitions to WorkspaceView automatically

## What to Look For

### ✅ Good Signs:
- Smooth progress bar animation
- Regular updates every few seconds
- Detailed badge information
- No freezing or hanging

### ⚠️ Issues to Watch:
- Progress stuck at one percentage
- "Rate limit exceeded" errors (increase wait time between chunks if needed)
- Missing progress updates
- UI not transitioning to workspace after completion

## Performance Notes

With sequential processing (max_workers=1):
- Small docs (~50KB): ~30-60 seconds
- Medium docs (~200KB): ~2-5 minutes  
- Large docs (~500KB+): ~5-10 minutes

The slower processing is intentional to avoid rate limits on the free tier.


