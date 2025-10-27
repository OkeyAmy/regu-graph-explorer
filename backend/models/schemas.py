from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from enum import Enum


class GraphMode(str, Enum):
    """Graph visualization mode"""
    HIERARCHY = "hierarchy"
    ENTITIES = "entities"


class Reference(BaseModel):
    """Reference to another section or external document"""
    target: str = Field(..., description="Target section ID or external reference")
    text: str = Field(..., description="Reference text as it appears")
    type: Literal["internal", "external"] = Field(..., description="Reference type")


class HierarchyNode(BaseModel):
    """Hierarchical node representing document structure"""
    id: str = Field(..., description="Unique identifier for the node")
    type: str = Field(..., description="Node type (e.g., section, subsection, clause)")
    number: str = Field(..., description="Section number or identifier")
    title: str = Field(..., description="Section title")
    text: str = Field(..., description="Full text content")
    level: int = Field(..., description="Hierarchy level (0 = root)")
    references: List[Reference] = Field(default_factory=list, description="References found in this section")
    children: List['HierarchyNode'] = Field(default_factory=list, description="Child nodes")


class DocumentMetadata(BaseModel):
    """Document metadata"""
    title: str = Field(..., description="Document title")
    jurisdiction: str = Field(default="Unknown", description="Legal jurisdiction")
    document_type: str = Field(default="Document", description="Type of document")
    source: str = Field(..., description="Source filename or URL")
    extraction_date: Optional[str] = Field(None, description="Date of extraction")


class DocumentData(BaseModel):
    """Complete document analysis with hierarchy"""
    metadata: DocumentMetadata
    hierarchy: List[HierarchyNode]


class EntityNode(BaseModel):
    """Entity extracted from document"""
    id: str = Field(..., description="Unique entity identifier")
    type: str = Field(..., description="Entity type (organization, person, date, regulation, etc.)")
    name: str = Field(..., description="Entity name/value")
    text: str = Field(..., description="Full text where entity was found")
    source_sections: List[str] = Field(default_factory=list, description="Section IDs where entity appears")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional entity metadata")


class EntityRelationship(BaseModel):
    """Relationship between two entities"""
    id: str = Field(..., description="Unique relationship identifier")
    source_entity_id: str = Field(..., description="Source entity ID")
    target_entity_id: str = Field(..., description="Target entity ID")
    relationship_type: str = Field(..., description="Type of relationship (references, regulates, contains, etc.)")
    text: str = Field(default="", description="Text describing the relationship")


class EntityGraph(BaseModel):
    """Entity relationship graph"""
    entities: List[EntityNode] = Field(default_factory=list, description="All entities")
    relationships: List[EntityRelationship] = Field(default_factory=list, description="All relationships")


class StatusDetails(BaseModel):
    """Detailed progress information"""
    current_chunk: Optional[int] = Field(None, description="Current chunk being processed")
    total_chunks: Optional[int] = Field(None, description="Total number of chunks")
    extracted_items: Optional[int] = Field(None, description="Number of items extracted so far")
    phase: Optional[str] = Field(None, description="Current processing phase")


class ProcessingStatus(BaseModel):
    """Processing status update"""
    stage: Literal["uploading", "cleaning", "parsing", "extracting", "hierarchy", "entities", "building", "complete", "error"]
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    message: str = Field(..., description="Status message")
    current_section: Optional[str] = Field(None, description="Current section being processed")
    details: Optional[StatusDetails] = Field(None, description="Detailed progress information")


class ExtractionResponse(BaseModel):
    """Complete extraction response with both hierarchy and entities"""
    document_data: DocumentData
    entity_graph: EntityGraph
    processing_time: float = Field(..., description="Processing time in seconds")
    extraction_method: Literal["langextract"] = "langextract"


# Enable forward references for recursive models
HierarchyNode.model_rebuild()

