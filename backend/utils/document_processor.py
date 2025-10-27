"""
Document text extraction utilities
"""
import re
from typing import Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


async def extract_text_from_file(file_path: str, content: bytes, content_type: str) -> Tuple[str, str]:
    """
    Extract text from various file formats
    
    Args:
        file_path: Original filename
        content: File content as bytes
        content_type: MIME type
        
    Returns:
        Tuple of (extracted_text, filename)
    """
    filename = Path(file_path).name
    
    try:
        if content_type == 'application/pdf':
            text = await _extract_from_pdf(content)
        elif content_type in ['text/html', 'application/xhtml+xml']:
            text = await _extract_from_html(content)
        elif content_type.startswith('text/'):
            text = content.decode('utf-8', errors='ignore')
        else:
            # Fallback to text extraction
            text = content.decode('utf-8', errors='ignore')
            
        logger.info(f"Extracted {len(text)} characters from {filename}")
        return text, filename
        
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        raise ValueError(f"Failed to extract text from file: {str(e)}")


async def _extract_from_pdf(content: bytes) -> str:
    """Extract text from PDF content"""
    try:
        from PyPDF2 import PdfReader
        from io import BytesIO
        
        pdf_file = BytesIO(content)
        reader = PdfReader(pdf_file)
        
        text_parts = []
        for page in reader.pages:
            text_parts.append(page.extract_text())
            
        return '\n'.join(text_parts)
        
    except ImportError:
        raise ValueError("PyPDF2 not installed. Install with: pip install pypdf2")
    except Exception as e:
        raise ValueError(f"PDF extraction failed: {str(e)}")


async def _extract_from_html(content: bytes) -> str:
    """Extract text from HTML content"""
    try:
        from bs4 import BeautifulSoup
        
        html_text = content.decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html_text, 'lxml')
        
        # Remove script and style elements
        for script in soup(['script', 'style', 'meta', 'link']):
            script.decompose()
            
        # Get text
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
        
    except ImportError:
        raise ValueError("BeautifulSoup4 not installed. Install with: pip install beautifulsoup4 lxml")
    except Exception as e:
        raise ValueError(f"HTML extraction failed: {str(e)}")


def clean_text(raw_text: str) -> str:
    """
    Clean and normalize document text
    
    Args:
        raw_text: Raw text content
        
    Returns:
        Cleaned text
    """
    # Remove page numbers
    text = re.sub(r'Page\s*-?\s*\d+', '', raw_text, flags=re.IGNORECASE)
    
    # Remove standalone numbers (likely page numbers)
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove excessive newlines
    text = re.sub(r'\n\s*\n', '\n', text)
    
    # Trim
    text = text.strip()
    
    return text


