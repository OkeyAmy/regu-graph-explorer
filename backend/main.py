"""
FastAPI backend for LangExtract document processing
"""
import os
import logging
from typing import Dict, Optional
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
import json

from services.langextract_service import LangExtractService
from models.schemas import ExtractionResponse, ProcessingStatus
from utils.document_processor import extract_text_from_file, clean_text

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LangExtract Document Processing API",
    description="Extract structured information from legal and regulatory documents",
    version="1.0.0"
)

# Configure CORS
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://localhost:5173,http://localhost:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable gzip compression to reduce payload sizes (improves perceived latency)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Initialize LangExtract service
LANGEXTRACT_API_KEY = os.getenv("LANGEXTRACT_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not LANGEXTRACT_API_KEY:
    logger.warning("LANGEXTRACT_API_KEY not set! Service will fail on extraction.")

langextract_service = LangExtractService(
    api_key=LANGEXTRACT_API_KEY or "",
    model_id=GEMINI_MODEL
)

# Store active WebSocket connections
websocket_connections: Dict[str, WebSocket] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "LangExtract Document Processing API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "api_key_configured": bool(LANGEXTRACT_API_KEY),
        "model": GEMINI_MODEL
    }


@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_document(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """
    Extract structured data from uploaded document
    
    Args:
        file: Uploaded document (PDF, HTML, TXT)
        session_id: Optional session ID for WebSocket updates
        
    Returns:
        ExtractionResponse with hierarchy and entity graphs
    """
    logger.info(f"Received extraction request for file: {file.filename}")
    
    if not LANGEXTRACT_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="LANGEXTRACT_API_KEY not configured"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Progress callback for WebSocket updates
        async def progress_callback(status: ProcessingStatus):
            if session_id and session_id in websocket_connections:
                ws = websocket_connections[session_id]
                try:
                    await ws.send_json({
                        "type": "progress",
                        "data": status.model_dump()
                    })
                except Exception as e:
                    logger.error(f"Failed to send progress update: {e}")

        # Partial stream callback for intermediate results
        async def stream_callback(message: dict):
            if session_id and session_id in websocket_connections:
                ws = websocket_connections[session_id]
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send stream message: {e}")
        
        # Send initial status
        await progress_callback(ProcessingStatus(
            stage="uploading",
            progress=5,
            message=f"Processing {file.filename}..."
        ))
        
        # Extract text from file
        text, filename = await extract_text_from_file(
            file.filename or "document",
            content,
            file.content_type or "text/plain"
        )
        
        logger.info(f"Extracted text from {filename}: {len(text)} chars")
        
        await progress_callback(ProcessingStatus(
            stage="cleaning",
            progress=15,
            message="Cleaning text..."
        ))
        
        # Clean text
        cleaned_text = clean_text(text)
        
        logger.info(f"Cleaned text: {len(cleaned_text)} characters from {filename}")
        logger.info(f"Starting LangExtract processing for {filename}...")
        
        # Extract structure using langextract
        result = await langextract_service.extract_document_structure(
            text=cleaned_text,
            filename=filename,            progress_callback=progress_callback
        )
        
        # Count total hierarchy nodes
        def count_all_nodes(nodes):
            count = len(nodes)
            for node in nodes:
                count += count_all_nodes(node.children)
            return count
        
        total_hierarchy = count_all_nodes(result.document_data.hierarchy)
        
        logger.info("=" * 80)
        logger.info(f"EXTRACTION COMPLETE for {filename}")
        logger.info(f"  Processing time: {result.processing_time:.2f}s")
        logger.info(f"  Hierarchy nodes: {total_hierarchy} (top-level: {len(result.document_data.hierarchy)})")
        logger.info(f"  Entities: {len(result.entity_graph.entities)}")
        logger.info(f"  Relationships: {len(result.entity_graph.relationships)}")
        logger.info(f"  Method: {result.extraction_method}")
        logger.info("=" * 80)
        
        # Send completion via WebSocket
        if session_id and session_id in websocket_connections:
            ws = websocket_connections[session_id]
            try:
                await ws.send_json({
                    "type": "complete",
                    "data": result.model_dump()
                })
            except Exception as e:
                logger.error(f"Failed to send completion: {e}")
        
        return result
        
    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        
        # Send error via WebSocket
        if session_id and session_id in websocket_connections:
            ws = websocket_connections[session_id]
            try:
                await ws.send_json({
                    "type": "error",
                    "data": {"message": str(e)}
                })
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time progress updates
    
    Args:
        websocket: WebSocket connection
        session_id: Unique session identifier
    """
    await websocket.accept()
    websocket_connections[session_id] = websocket
    logger.info(f"WebSocket connected: {session_id}")
    
    try:
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
        if session_id in websocket_connections:
            del websocket_connections[session_id]
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
        if session_id in websocket_connections:
            del websocket_connections[session_id]


@app.post("/api/extract-url")
async def extract_from_url(
    url: str = Form(...),
    session_id: Optional[str] = Form(None)
):
    """
    Extract structured data from URL
    
    Args:
        url: URL to extract from
        session_id: Optional session ID for WebSocket updates
        
    Returns:
        ExtractionResponse with hierarchy and entity graphs
    """
    logger.info(f"Received URL extraction request: {url}")
    
    # TODO: Implement URL fetching and extraction
    raise HTTPException(
        status_code=501,
        detail="URL extraction not yet implemented"
    )


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )

