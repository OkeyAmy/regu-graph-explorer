# 🚀 Quick Start - Test in 2 Minutes

## 1️⃣ Setup API Key (30 seconds)

```bash
cd backend
echo "LANGEXTRACT_API_KEY=your_key_here" > .env
```

Get key: https://aistudio.google.com/app/apikey

## 2️⃣ Install Dependencies (if not done)

```bash
pip install -r requirements.txt
```

## 3️⃣ Run Test (90 seconds)

### Windows
```bash
test-quick.bat
```

### macOS/Linux
```bash
chmod +x test-quick.sh
./test-quick.sh
```

## ✅ Expected Output

```
✓ API key configured
✓ Using model: gemini-2.0-flash-exp
✓ Service initialized

Processing sample document (2345 chars)
...
LangExtract completed in 45.55s
Raw extractions returned: 87
Built hierarchy with 3 top-level nodes
Built entity graph with 12 entities, 5 relationships

✅ SUCCESS! Extraction working correctly.
✅ Extracted 45 hierarchy nodes and 12 entities
```

## 🎯 Success Criteria

- ✅ No RuntimeWarnings
- ✅ Hierarchy nodes > 0
- ✅ Entities > 0
- ✅ Processing time < 120s

## ❌ Troubleshooting

**"API key not set"**
```bash
# Create .env file
cd backend
nano .env
# Add: LANGEXTRACT_API_KEY=your_key_here
```

**"No extractions found"**
- Check API key is valid at https://aistudio.google.com
- Check quota remaining
- Try `gemini-2.5-flash` instead: `export GEMINI_MODEL=gemini-2.5-flash`

**"Module not found"**
```bash
pip install langextract fastapi uvicorn pydantic python-dotenv pypdf2
```

## 📖 Full Documentation

- Testing guide: `backend/TESTING.md`
- Complete fixes: `FIXES_AND_IMPROVEMENTS.md`
- Integration guide: `docs/LANGEXTRACT_INTEGRATION.md`

## 🎉 Next Steps

Once test passes:

```bash
# Start backend server
python main.py

# In another terminal - start frontend
cd ..
pnpm dev

# Open browser: http://localhost:5173
# Upload a document and watch it extract!
```

