"""
LangExtract service for document processing with dual extraction modes
"""
import logging
import time
import inspect
from typing import Dict, Any, List, Optional, Callable, Awaitable, Union
import langextract as lx
from datetime import datetime

from models.schemas import (
    DocumentData,
    DocumentMetadata,
    HierarchyNode,
    Reference,
    EntityGraph,
    EntityNode,
    EntityRelationship,
    ExtractionResponse,
    ProcessingStatus,
    StatusDetails
)

logger = logging.getLogger(__name__)


class LangExtractService:
    """Service for extracting structured data from documents using langextract"""
    
    def __init__(self, api_key: str, model_id: str = "gemini-2.5-flash"):
        """
        Initialize LangExtract service
        
        Args:
            api_key: Google Gemini API key
            model_id: Model to use for extraction
        """
        import os
        self.api_key = api_key
        self.model_id = model_id
        # Tunables with env overrides for performance/rate control
        self.extraction_passes = int(os.getenv("LX_PASSES", "2"))
        self.max_workers = int(os.getenv("LX_WORKERS", "1"))
        self.max_char_buffer = int(os.getenv("LX_BUFFER", "5000"))
        # Simple in-memory cache for identical inputs (content hash)
        self._cache: Dict[str, Any] = {}
        logger.info(f"Initialized LangExtractService with model {model_id}")
    
    async def extract_document_structure(
        self,
        text: str,
        filename: str,
        progress_callback: Optional[Callable[[ProcessingStatus], Union[None, Awaitable[None]]]] = None
    ) -> ExtractionResponse:
        """
        Extract both hierarchy and entities from document
        
        Args:
            text: Document text content
            filename: Original filename
            progress_callback: Optional callback for progress updates
            
        Returns:
            ExtractionResponse with both hierarchy and entity graphs
        """
        start_time = time.time()
        
        try:
            # Progress update: Starting
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="parsing",
                    progress=10,
                    message="Initializing langextract..."
                ))
            
            # Extract hierarchy structure
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="hierarchy",
                    progress=30,
                    message="Extracting document hierarchy...",
                    details=StatusDetails(phase="Analyzing document structure")
                ))
            
            hierarchy_data = await self._extract_hierarchy(text, filename, progress_callback)
            
            # Extract entities and relationships
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="entities",
                    progress=60,
                    message="Extracting entities and relationships...",
                    details=StatusDetails(phase="Identifying entities")
                ))
            
            entity_graph = await self._extract_entities(text, hierarchy_data.hierarchy, progress_callback)
            
            # Build final response
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="building",
                    progress=90,
                    message="Building final structure..."
                ))
            
            processing_time = time.time() - start_time
            
            response = ExtractionResponse(
                document_data=hierarchy_data,
                entity_graph=entity_graph,
                processing_time=processing_time,
                extraction_method="langextract"
            )
            
            # Complete
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="complete",
                    progress=100,
                    message=f"Extraction complete in {processing_time:.2f}s"
                ))
            
            logger.info(f"Extraction completed in {processing_time:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"Extraction failed: {e}", exc_info=True)
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="error",
                    progress=0,
                    message=f"Extraction failed: {str(e)}"
                ))
            raise
    
    async def _extract_hierarchy(
        self, 
        text: str, 
        filename: str,
        progress_callback: Optional[Callable[[ProcessingStatus], Union[None, Awaitable[None]]]] = None
    ) -> DocumentData:
        """Extract hierarchical document structure using langextract (schema-free via classes)."""

        logger.info(f"Starting hierarchy extraction for {filename} ({len(text)} chars)")
        
        # Estimate chunks (langextract processes text in chunks based on max_char_buffer)
        chunk_size = self.max_char_buffer  # matches configured buffer
        estimated_chunks = max(1, len(text) // chunk_size + (1 if len(text) % chunk_size else 0))
        logger.info(f"Estimated {estimated_chunks} chunks for hierarchy extraction")
        
        if progress_callback:
            await self._emit_progress(progress_callback, ProcessingStatus(
                stage="hierarchy",
                progress=32,
                message=f"Processing hierarchy in {estimated_chunks} chunks...",
                details=StatusDetails(
                    total_chunks=estimated_chunks,
                    current_chunk=0,
                    phase="Pass 1: Initial extraction"
                )
            ))

        prompt_description = (
            "Extract the hierarchical structure of the legal/regulatory document.\n"
            "Identify parts, sections, subsections, clauses, definitions, provisos, and references.\n"
            "For each extraction, set extraction_class to one of: part, section, subsection, clause, definition, proviso, reference.\n"
            "Use exact spans from the text for extraction_text (no paraphrasing).\n"
            "Provide helpful attributes: number (e.g., '2', '2.1'), title (if any), level (0=part,1=section,2=subsection,3=clause,2 for definition/proviso), and parent_number when obvious.\n"
            "For references, set attributes: type ('internal'|'external'), target (e.g., 'section 2(1)'), and anchor_section_number if clear."
        )

        examples: List[lx.data.ExampleData] = [
            lx.data.ExampleData(
                text=(
                    "PART I - PRELIMINARY\n"
                    "Section 2. Definitions\n"
                    "\"digital asset\" means a cryptographically-secured representation of value;\n"
                    "Provided that this definition shall not apply to loyalty points.\n"
                    "Reference: See section 3(1).\n"
                ),
                extractions=[
                    lx.data.Extraction(
                        extraction_class="part",
                        extraction_text="PART I - PRELIMINARY",
                        attributes={"number": "I", "title": "PRELIMINARY", "level": 0}
                    ),
                    lx.data.Extraction(
                        extraction_class="section",
                        extraction_text="Section 2. Definitions",
                        attributes={"number": "2", "title": "Definitions", "level": 1}
                    ),
                    lx.data.Extraction(
                        extraction_class="definition",
                        extraction_text='"digital asset" means a cryptographically-secured representation of value;',
                        attributes={"term": "digital asset", "level": 2, "parent_number": "2"}
                    ),
                    lx.data.Extraction(
                        extraction_class="proviso",
                        extraction_text="Provided that this definition shall not apply to loyalty points.",
                        attributes={"level": 2, "parent_number": "2"}
                    ),
                    lx.data.Extraction(
                        extraction_class="reference",
                        extraction_text="Reference: See section 3(1).",
                        attributes={"type": "internal", "target": "section 3(1)", "anchor_section_number": "2"}
                    ),
                ],
            )
        ]

        try:
            # Use sequential processing (max_workers=1) to avoid rate limits
            # Free tier: 15 requests/min. Sequential processing ensures we stay under limit.
            # Larger buffer (5000) means fewer chunks = fewer API calls
            logger.info(
                f"Calling langextract with: passes={self.extraction_passes}, workers={self.max_workers}, buffer={self.max_char_buffer}"
            )
            
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="hierarchy",
                    progress=35,
                    message="Processing document structure (this may take a few minutes)...",
                    details=StatusDetails(
                        total_chunks=estimated_chunks,
                        phase="Extracting hierarchical elements"
                    )
                ))
            
            # Cache key based on text content and parameters
            import hashlib
            cache_key = hashlib.sha256((text + f"|{self.model_id}|{self.extraction_passes}|{self.max_workers}|{self.max_char_buffer}").encode("utf-8")).hexdigest()
            if cache_key in self._cache:
                logger.info("Cache hit for hierarchy extraction")
                result = self._cache[cache_key]
            else:
                t0 = time.time()
                result = lx.extract(
                text_or_documents=text,
                prompt_description=prompt_description,
                examples=examples,
                model_id=self.model_id,
                api_key=self.api_key,
                extraction_passes=self.extraction_passes,
                max_workers=self.max_workers,
                max_char_buffer=self.max_char_buffer,
                )
                extraction_time = time.time() - t0
                logger.info(f"LangExtract completed in {extraction_time:.2f}s")
                self._cache[cache_key] = result

            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="hierarchy",
                    progress=55,
                    message=f"Building hierarchy structure...",
                    details=StatusDetails(phase="Organizing extracted elements")
                ))

            document_data = self._build_hierarchy_from_extractions(result, filename)
            logger.info(f"Built hierarchy with {len(document_data.hierarchy)} top-level nodes")
            
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="hierarchy",
                    progress=58,
                    message=f"Hierarchy extraction complete ({len(document_data.hierarchy)} sections)",
                    details=StatusDetails(extracted_items=len(document_data.hierarchy))
                ))
            
            return document_data

        except Exception as e:
            logger.error(f"Hierarchy extraction failed: {e}", exc_info=True)
            return DocumentData(
                metadata=DocumentMetadata(
                    title=filename,
                    jurisdiction="Unknown",
                    document_type="Document",
                    source=filename,
                    extraction_date=datetime.now().isoformat(),
                ),
                hierarchy=[],
            )
    
    async def _extract_entities(
        self, 
        text: str, 
        hierarchy: List[HierarchyNode],
        progress_callback: Optional[Callable[[ProcessingStatus], Union[None, Awaitable[None]]]] = None
    ) -> EntityGraph:
        """Extract entities and relationships using langextract (entity classes)."""

        logger.info(f"Starting entity extraction ({len(text)} chars)")
        
        # Estimate chunks
        chunk_size = self.max_char_buffer  # matches configured buffer
        estimated_chunks = max(1, len(text) // chunk_size + (1 if len(text) % chunk_size else 0))
        logger.info(f"Estimated {estimated_chunks} chunks for entity extraction")
        
        if progress_callback:
            await self._emit_progress(progress_callback, ProcessingStatus(
                stage="entities",
                progress=62,
                message=f"Processing entities in {estimated_chunks} chunks...",
                details=StatusDetails(
                    total_chunks=estimated_chunks,
                    current_chunk=0,
                    phase="Pass 1: Entity identification"
                )
            ))

        prompt_description = (
            "Extract entities and relationships from this legal/regulatory document.\n"
            "Entities may include: organization, regulation, obligation, penalty, fee, deadline, monetary_amount, authority_power.\n"
            "Use extraction_class to indicate the entity type.\n"
            "Also extract relationship items with extraction_class='relationship' and attributes: type, source_name, target_name.\n"
            "Use exact spans for extraction_text and include helpful attributes (e.g., amount, currency, date, subject)."
        )

        examples: List[lx.data.ExampleData] = [
            lx.data.ExampleData(
                text=(
                    "The Securities Commission of Malaysia regulates digital asset exchanges.\n"
                    "All exchanges must comply with the Digital Assets Act 2024.\n"
                    "Registration fee of RM 50,000 is payable by 1 January 2025.\n"
                ),
                extractions=[
                    lx.data.Extraction(
                        extraction_class="organization",
                        extraction_text="Securities Commission of Malaysia",
                        attributes={"jurisdiction": "Malaysia"}
                    ),
                    lx.data.Extraction(
                        extraction_class="regulation",
                        extraction_text="Digital Assets Act 2024",
                        attributes={}
                    ),
                    lx.data.Extraction(
                        extraction_class="obligation",
                        extraction_text="All exchanges must comply with the Digital Assets Act 2024.",
                        attributes={"subject": "exchanges", "requirement": "comply", "mandatory": True}
                    ),
                    lx.data.Extraction(
                        extraction_class="fee",
                        extraction_text="Registration fee of RM 50,000",
                        attributes={"amount": 50000, "currency": "MYR"}
                    ),
                    lx.data.Extraction(
                        extraction_class="deadline",
                        extraction_text="1 January 2025",
                        attributes={"purpose": "registration"}
                    ),
                    lx.data.Extraction(
                        extraction_class="relationship",
                        extraction_text="regulates",
                        attributes={"type": "enforces", "source_name": "Securities Commission of Malaysia", "target_name": "Digital Assets Act 2024"}
                    ),
                ],
            )
        ]

        try:
            # Use sequential processing (max_workers=1) to avoid rate limits
            # Free tier: 15 requests/min. Sequential processing ensures we stay under limit.
            # Larger buffer (5000) means fewer chunks = fewer API calls
            logger.info(
                f"Calling langextract for entities: passes={self.extraction_passes}, workers={self.max_workers}, buffer={self.max_char_buffer}"
            )
            
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="entities",
                    progress=65,
                    message="Identifying entities (this may take a few minutes)...",
                    details=StatusDetails(
                        total_chunks=estimated_chunks,
                        phase="Extracting entities and relationships"
                    )
                ))
            
            # Cache key based on text content and parameters
            import hashlib
            cache_key = hashlib.sha256((text + f"|{self.model_id}|{self.extraction_passes}|{self.max_workers}|{self.max_char_buffer}|entities").encode("utf-8")).hexdigest()
            if cache_key in self._cache:
                logger.info("Cache hit for entity extraction")
                result = self._cache[cache_key]
            else:
                t0 = time.time()
                result = lx.extract(
                text_or_documents=text,
                prompt_description=prompt_description,
                examples=examples,
                model_id=self.model_id,
                api_key=self.api_key,
                extraction_passes=self.extraction_passes,
                max_workers=self.max_workers,
                max_char_buffer=self.max_char_buffer,
                )
                extraction_time = time.time() - t0
                logger.info(f"Entity extraction completed in {extraction_time:.2f}s")
                self._cache[cache_key] = result

            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="entities",
                    progress=85,
                    message="Building entity graph...",
                    details=StatusDetails(phase="Connecting relationships")
                ))

            entity_graph = self._build_entities_from_extractions(result, hierarchy)
            logger.info(f"Built entity graph with {len(entity_graph.entities)} entities, {len(entity_graph.relationships)} relationships")
            
            if progress_callback:
                await self._emit_progress(progress_callback, ProcessingStatus(
                    stage="entities",
                    progress=88,
                    message=f"Entity extraction complete ({len(entity_graph.entities)} entities, {len(entity_graph.relationships)} relationships)",
                    details=StatusDetails(extracted_items=len(entity_graph.entities))
                ))
            
            return entity_graph

        except Exception as e:
            logger.error(f"Entity extraction failed: {e}", exc_info=True)
            return EntityGraph(entities=[], relationships=[])
    
    def _parse_langextract_result(self, result: Any, filename: str) -> DocumentData:
        """Parse langextract result into DocumentData structure"""
        
        try:
            # langextract returns results in various formats
            # We need to extract the structured data
            if hasattr(result, 'extractions'):
                extractions = result.extractions
                if extractions and len(extractions) > 0:
                    data = extractions[0]
                else:
                    data = {}
            elif isinstance(result, dict):
                data = result
            else:
                data = {}
            
            # Extract metadata
            metadata_raw = data.get('metadata', {})
            metadata = DocumentMetadata(
                title=metadata_raw.get('title', filename),
                jurisdiction=metadata_raw.get('jurisdiction', 'Unknown'),
                document_type=metadata_raw.get('document_type', 'Document'),
                source=filename,
                extraction_date=datetime.now().isoformat()
            )
            
            # Extract hierarchy
            hierarchy_raw = data.get('hierarchy', [])
            hierarchy = [self._parse_hierarchy_node(node) for node in hierarchy_raw]
            
            return DocumentData(metadata=metadata, hierarchy=hierarchy)
            
        except Exception as e:
            logger.error(f"Failed to parse langextract result: {e}")
            return DocumentData(
                metadata=DocumentMetadata(
                    title=filename,
                    jurisdiction="Unknown",
                    document_type="Document",
                    source=filename,
                    extraction_date=datetime.now().isoformat()
                ),
                hierarchy=[]
            )
    
    def _parse_hierarchy_node(self, node_data: Dict[str, Any]) -> HierarchyNode:
        """Parse a single hierarchy node"""
        
        references = [
            Reference(**ref) if isinstance(ref, dict) else ref
            for ref in node_data.get('references', [])
        ]
        
        children = [
            self._parse_hierarchy_node(child)
            for child in node_data.get('children', [])
        ]
        
        return HierarchyNode(
            id=node_data.get('id', ''),
            type=node_data.get('type', 'section'),
            number=node_data.get('number', ''),
            title=node_data.get('title', ''),
            text=node_data.get('text', ''),
            level=node_data.get('level', 0),
            references=references,
            children=children
        )
    
    def _build_entities_from_extractions(self, result: Any, hierarchy: List[HierarchyNode]) -> EntityGraph:
        """Convert LangExtract extractions into EntityGraph."""
        try:
            extractions = []
            if hasattr(result, "extractions"):
                extractions = list(result.extractions or [])
            elif isinstance(result, dict) and "extractions" in result:
                extractions = result.get("extractions") or []

            entities: List[EntityNode] = []
            relationships: List[EntityRelationship] = []

            counters: Dict[str, int] = {}
            def next_id(prefix: str) -> str:
                counters[prefix] = counters.get(prefix, 0) + 1
                return f"{prefix}-{counters[prefix]}"

            name_to_id: Dict[str, str] = {}

            for e in extractions:
                e_class = getattr(e, "extraction_class", "") or ""
                text_val = getattr(e, "extraction_text", "") or ""
                attrs = getattr(e, "attributes", {}) or {}

                if e_class in {"organization", "regulation", "obligation", "penalty", "fee", "deadline", "monetary_amount", "authority_power"}:
                    ent_id = next_id(e_class)
                    name = str(attrs.get("name", "")).strip() or text_val.strip() or ent_id
                    name_to_id.setdefault(name, ent_id)
                    entities.append(
                        EntityNode(
                            id=ent_id,
                            type=e_class,
                            name=name,
                            text=text_val,
                            source_sections=[],
                            metadata=attrs,
                        )
                    )
                elif e_class == "relationship":
                    rel_id = next_id("rel")
                    rel_type = str(attrs.get("type", "related_to"))
                    source_name = str(attrs.get("source_name", "")).strip()
                    target_name = str(attrs.get("target_name", "")).strip()
                    source_id = name_to_id.get(source_name, next_id("ent")) if source_name else next_id("ent")
                    target_id = name_to_id.get(target_name, next_id("ent")) if target_name else next_id("ent")
                    relationships.append(
                        EntityRelationship(
                            id=rel_id,
                            source_entity_id=source_id,
                            target_entity_id=target_id,
                            relationship_type=rel_type,
                            text=text_val,
                        )
                    )

            return EntityGraph(entities=entities, relationships=relationships)

        except Exception as e:
            logger.error(f"Failed to build entities from extractions: {e}")
            return EntityGraph(entities=[], relationships=[])

    def _build_hierarchy_from_extractions(self, result: Any, filename: str) -> DocumentData:
        """Convert LangExtract extractions into DocumentData hierarchy."""
        try:
            extractions = []
            if hasattr(result, "extractions"):
                extractions = list(result.extractions or [])
            elif isinstance(result, dict) and "extractions" in result:
                extractions = result.get("extractions") or []

            logger.info(f"Processing {len(extractions)} extractions into hierarchy")
            if extractions:
                type_counts: Dict[str, int] = {}
                for e in extractions:
                    e_class = getattr(e, "extraction_class", "unknown")
                    type_counts[e_class] = type_counts.get(e_class, 0) + 1
                logger.info(f"Extraction types: {type_counts}")

            def get_offset(e: Any) -> int:
                try:
                    return int(getattr(e, "start_offset", 0))
                except Exception:
                    return 0
            extractions.sort(key=get_offset)

            structural_classes = {"part": 0, "section": 1, "subsection": 2, "clause": 3, "definition": 2, "proviso": 2}
            references_map: Dict[str, List[Reference]] = {}
            nodes_stack: List[HierarchyNode] = []
            top_level_nodes: List[HierarchyNode] = []

            def current_parent_for_level(level: int) -> Optional[HierarchyNode]:
                while nodes_stack and nodes_stack[-1].level >= level:
                    nodes_stack.pop()
                return nodes_stack[-1] if nodes_stack else None

            def make_node(e: Any, level: int) -> HierarchyNode:
                attrs = getattr(e, "attributes", {}) or {}
                number = str(attrs.get("number", "")).strip()
                title = str(attrs.get("title", "")).strip()
                node_id = f"{getattr(e, 'extraction_class', 'node')}-{number or len(top_level_nodes)+len(nodes_stack)+1}"
                text_val = getattr(e, "extraction_text", "") or ""
                return HierarchyNode(
                    id=node_id,
                    type=getattr(e, "extraction_class", "section"),
                    number=number,
                    title=title,
                    text=text_val,
                    level=level,
                    references=[],
                    children=[],
                )

            for e in extractions:
                e_class = getattr(e, "extraction_class", "") or ""
                if e_class == "reference":
                    attrs = getattr(e, "attributes", {}) or {}
                    ref = Reference(
                        target=str(attrs.get("target", "")),
                        text=getattr(e, "extraction_text", ""),
                        type=str(attrs.get("type", "internal")) in ["external"] and "external" or "internal",
                    )
                    anchor = str(attrs.get("anchor_section_number", ""))
                    if anchor:
                        references_map.setdefault(anchor, []).append(ref)
                    else:
                        if nodes_stack:
                            nodes_stack[-1].references.append(ref)
                    continue

                if e_class in structural_classes:
                    level = structural_classes[e_class]
                    attrs = getattr(e, "attributes", {}) or {}
                    parent_number = str(attrs.get("parent_number", "")).strip()

                    node = make_node(e, level)

                    if node.number and node.number in references_map:
                        node.references.extend(references_map[node.number])

                    parent: Optional[HierarchyNode] = None
                    if parent_number:
                        for existing in reversed(nodes_stack):
                            if existing.number == parent_number:
                                parent = existing
                                break
                    if parent is None:
                        parent = current_parent_for_level(level)

                    if parent is None:
                        top_level_nodes.append(node)
                    else:
                        parent.children.append(node)

                    nodes_stack.append(node)

            metadata = DocumentMetadata(
                title=filename,
                jurisdiction="Unknown",
                document_type="Document",
                source=filename,
                extraction_date=datetime.now().isoformat(),
            )
            return DocumentData(metadata=metadata, hierarchy=top_level_nodes)

        except Exception as e:
            logger.error(f"Failed to build hierarchy from extractions: {e}")
            return DocumentData(
                metadata=DocumentMetadata(
                    title=filename,
                    jurisdiction="Unknown",
                    document_type="Document",
                    source=filename,
                    extraction_date=datetime.now().isoformat(),
                ),
                hierarchy=[],
            )

    async def _emit_progress(self, cb: Callable[[ProcessingStatus], Union[None, Awaitable[None]]], status: ProcessingStatus) -> None:
        """Call progress callback safely, awaiting when needed."""
        try:
            if inspect.iscoroutinefunction(cb):
                await cb(status)
                return
            result = cb(status)
            if inspect.isawaitable(result):
                await result  # type: ignore
        except Exception as e:
            logger.error(f"Progress callback failed: {e}")

