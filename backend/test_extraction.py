#!/usr/bin/env python3
"""
Test script for LangExtract document extraction
Creates a small sample document and tests the extraction service
"""
import os
import sys
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Setup path
sys.path.insert(0, str(Path(__file__).parent))

from services.langextract_service import LangExtractService
from models.schemas import ProcessingStatus

# Configure logging to see everything
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_test_documents():
    """Get all test documents from test_data directory"""
    test_data_dir = Path(__file__).parent / "test_data"
    documents = []
    
    # Find all supported files
    for file_path in test_data_dir.glob("*"):
        if file_path.is_file() and file_path.suffix.lower() in ['.txt', '.pdf', '.html']:
            documents.append(file_path)
    
    return sorted(documents)


async def load_document_text(file_path: Path) -> tuple[str, str]:
    """Load text from a document file"""
    try:
        if file_path.suffix.lower() == '.txt':
            # Read text file directly
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            return text, file_path.name
        
        elif file_path.suffix.lower() == '.pdf':
            # Use the document processor for PDF
            sys.path.insert(0, str(Path(__file__).parent))
            from utils.document_processor import extract_text_from_file
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            text, filename = await extract_text_from_file(
                file_path.name,
                content,
                'application/pdf'
            )
            return text, filename
        
        else:
            logger.warning(f"Unsupported file type: {file_path.suffix}")
            return "", file_path.name
            
    except Exception as e:
        logger.error(f"Failed to load {file_path}: {e}")
        return "", file_path.name


async def progress_handler(status: ProcessingStatus):
    """Handle progress updates"""
    logger.info(f"Progress [{status.progress}%]: {status.stage} - {status.message}")


async def main():
    """Main test function"""
    logger.info("=" * 80)
    logger.info("LANGEXTRACT EXTRACTION TEST")
    logger.info("=" * 80)
    
    # Load environment variables from backend/.env
    dotenv_path = Path(__file__).parent / '.env'
    if dotenv_path.exists():
        try:
            # Try loading with UTF-8 encoding first
            load_dotenv(dotenv_path=dotenv_path, encoding='utf-8')
            logger.info(f"✓ Loaded .env from: {dotenv_path}")
        except UnicodeDecodeError:
            try:
                # Try with UTF-8-BOM encoding
                load_dotenv(dotenv_path=dotenv_path, encoding='utf-8-sig')
                logger.info(f"✓ Loaded .env from: {dotenv_path} (with BOM)")
            except Exception as e:
                logger.warning(f"⚠️  Could not load .env file ({e}), trying manual read...")
                # Manual fallback - read line by line
                try:
                    with open(dotenv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
                        for line_num, line in enumerate(f, 1):
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                os.environ[key.strip()] = value.strip()
                                logger.info(f"  Set {key.strip()} from line {line_num}")
                    logger.info(f"✓ Manually loaded .env from: {dotenv_path}")
                except Exception as e2:
                    logger.error(f"❌ Failed to load .env: {e2}")
                    logger.error(f"❌ Please recreate your .env file with UTF-8 encoding")
    else:
        # Also try project root .env as fallback
        root_dotenv = Path(__file__).parent.parent / '.env'
        if root_dotenv.exists():
            try:
                load_dotenv(dotenv_path=root_dotenv, encoding='utf-8')
                logger.info(f"✓ Loaded .env from: {root_dotenv}")
            except Exception:
                logger.warning(f"⚠️  Could not load root .env file")
        else:
            logger.info("ℹ️ No .env file found; relying on environment variables")

    # Get API key
    api_key = os.getenv("LANGEXTRACT_API_KEY")
    if not api_key:
        logger.error("LANGEXTRACT_API_KEY not set!")
        logger.error("Set it in backend/.env or export it:")
        logger.error("  export LANGEXTRACT_API_KEY=your_key_here")
        sys.exit(1)
    
    logger.info(f"✓ API key configured (length: {len(api_key)})")
    
    # Initialize service
    model_id = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    logger.info(f"✓ Using model: {model_id}")
    
    service = LangExtractService(api_key=api_key, model_id=model_id)
    logger.info("✓ Service initialized")
    
    # Get test documents
    test_documents = get_test_documents()
    if not test_documents:
        logger.error("❌ No test documents found in test_data/ directory!")
        logger.error("   Expected files: *.txt, *.pdf, *.html")
        sys.exit(1)
    
    logger.info(f"✓ Found {len(test_documents)} test document(s):")
    for doc in test_documents:
        logger.info(f"  - {doc.name}")
    
    # Test each document
    all_results = []
    
    for doc_path in test_documents:
        logger.info(f"\n{'=' * 80}")
        logger.info(f"Processing: {doc_path.name}")
        logger.info(f"{'=' * 80}")
        
        # Load document text
        text, filename = await load_document_text(doc_path)
        if not text.strip():
            logger.warning(f"⚠️  Skipping {doc_path.name} - no text extracted")
            continue
        
        logger.info(f"Loaded {len(text)} characters from {filename}")
        
        try:
            result = await service.extract_document_structure(
                text=text,
                filename=filename,
                progress_callback=progress_handler
            )
            all_results.append((doc_path.name, result))
        
            # Show results for this document
            print_document_results(filename, result)
            
        except Exception as e:
            logger.error(f"\n{'=' * 80}")
            logger.error(f"❌ EXTRACTION FAILED for {doc_path.name}: {e}")
            logger.error(f"{'=' * 80}\n")
            import traceback
            traceback.print_exc()
            continue
    
    # Summary of all results
    logger.info(f"\n{'=' * 100}")
    logger.info("FINAL SUMMARY - ALL DOCUMENTS")
    logger.info(f"{'=' * 100}")
    
    if not all_results:
        logger.error("❌ No documents were successfully processed!")
        sys.exit(1)
    
    total_success = 0
    for doc_name, result in all_results:
        def count_nodes(nodes):
            count = len(nodes)
            for node in nodes:
                count += count_nodes(node.children)
            return count
        
        total_nodes = count_nodes(result.document_data.hierarchy)
        total_entities = len(result.entity_graph.entities)
        
        if total_nodes > 0 or total_entities > 0:
            total_success += 1
            status = "✅ SUCCESS"
        else:
            status = "⚠️  NO EXTRACTIONS"
        
        logger.info(f"{status} - {doc_name}: {total_nodes} nodes, {total_entities} entities ({result.processing_time:.1f}s)")
    
    logger.info(f"\n📊 Overall Results:")
    logger.info(f"  Documents processed: {len(all_results)}")
    logger.info(f"  Successful extractions: {total_success}")
    logger.info(f"  Success rate: {total_success/len(all_results)*100:.1f}%")
    
    if total_success > 0:
        logger.info(f"\n✅ SUCCESS! LangExtract is working correctly.")
        logger.info(f"✅ {total_success}/{len(all_results)} documents extracted successfully")
    else:
        logger.warning(f"\n⚠️  WARNING: No successful extractions!")
        logger.warning(f"⚠️  Check API key, model settings, and logs above")
    
    logger.info(f"{'=' * 100}\n")


def print_document_results(filename: str, result):
    """Print detailed results for a single document"""
    logger.info(f"\n{'=' * 80}")
    logger.info(f"EXTRACTION RESULTS - {filename}")
    logger.info(f"{'=' * 80}")
    
    # Document metadata
    logger.info(f"\nDocument Metadata:")
    logger.info(f"  Title: {result.document_data.metadata.title}")
    logger.info(f"  Type: {result.document_data.metadata.document_type}")
    logger.info(f"  Jurisdiction: {result.document_data.metadata.jurisdiction}")
    
    # Hierarchy statistics
    def count_nodes(nodes, depth=0):
        count = len(nodes)
        for node in nodes:
            count += count_nodes(node.children, depth + 1)
        return count
    
    total_nodes = count_nodes(result.document_data.hierarchy)
    top_level = len(result.document_data.hierarchy)
    
    logger.info(f"\nHierarchy Structure:")
    logger.info(f"  Top-level nodes: {top_level}")
    logger.info(f"  Total nodes: {total_nodes}")
    
    # Print hierarchy tree (limited depth for readability)
    def print_tree(nodes, indent=0, max_depth=3):
        if indent > max_depth:
            return
        for i, node in enumerate(nodes[:5]):  # Show max 5 nodes per level
            prefix = "  " * indent + ("├─" if i < len(nodes[:5])-1 else "└─")
            logger.info(f"{prefix} [{node.type}] {node.number} {node.title}")
            if node.references:
                for ref in node.references[:2]:  # Show max 2 references
                    logger.info(f"{prefix}   → {ref.type}: {ref.target}")
            if node.children and indent < max_depth:
                print_tree(node.children, indent + 1, max_depth)
        if len(nodes) > 5:
            logger.info(f"{'  ' * indent}... and {len(nodes) - 5} more nodes")
    
    if result.document_data.hierarchy:
        logger.info(f"\nHierarchy Tree (showing first 3 levels):")
        print_tree(result.document_data.hierarchy)
    
    # Entity statistics
    logger.info(f"\nEntity Graph:")
    logger.info(f"  Total entities: {len(result.entity_graph.entities)}")
    logger.info(f"  Total relationships: {len(result.entity_graph.relationships)}")
    
    # Print entities by type
    if result.entity_graph.entities:
        entity_types: dict = {}
        for entity in result.entity_graph.entities:
            entity_types.setdefault(entity.type, []).append(entity)
        
        logger.info(f"\nEntities by Type:")
        for etype, entities in entity_types.items():
            logger.info(f"  {etype} ({len(entities)}):")
            for entity in entities[:3]:  # Show first 3
                logger.info(f"    - {entity.name}")
            if len(entities) > 3:
                logger.info(f"    ... and {len(entities) - 3} more")
    
    # Print relationships
    if result.entity_graph.relationships:
        logger.info(f"\nRelationships:")
        for rel in result.entity_graph.relationships[:5]:  # Show first 5
            logger.info(f"  {rel.source_entity_id} --[{rel.relationship_type}]--> {rel.target_entity_id}")
        if len(result.entity_graph.relationships) > 5:
            logger.info(f"  ... and {len(result.entity_graph.relationships) - 5} more")
    
    # Processing stats
    logger.info(f"\nProcessing Statistics:")
    logger.info(f"  Total time: {result.processing_time:.2f}s")
    logger.info(f"  Method: {result.extraction_method}")
    
    # Success check for this document
    if total_nodes > 0 or len(result.entity_graph.entities) > 0:
        logger.info(f"\n✅ SUCCESS for {filename}!")
        logger.info(f"✅ Extracted {total_nodes} hierarchy nodes and {len(result.entity_graph.entities)} entities")
    else:
        logger.warning(f"\n⚠️  WARNING: No extractions found for {filename}!")
        logger.warning(f"⚠️  Check the logs above for errors.")
    logger.info(f"{'=' * 80}\n")


if __name__ == "__main__":
    asyncio.run(main())

