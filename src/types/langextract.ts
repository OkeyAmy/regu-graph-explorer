/**
 * TypeScript types for LangExtract API responses
 * Mirrors backend Pydantic models
 */

export type GraphMode = 'hierarchy' | 'entities';

export type ReferenceType = 'internal' | 'external';

export interface Reference {
  target: string;
  text: string;
  type: ReferenceType;
}

export interface HierarchyNode {
  id: string;
  type: string;
  number: string;
  title: string;
  text: string;
  level: number;
  references: Reference[];
  children: HierarchyNode[];
}

export interface DocumentMetadata {
  title: string;
  jurisdiction: string;
  document_type: string;
  source: string;
  extraction_date?: string;
}

export interface DocumentData {
  metadata: DocumentMetadata;
  hierarchy: HierarchyNode[];
}

export interface EntityNode {
  id: string;
  type: string;
  name: string;
  text: string;
  source_sections: string[];
  metadata: Record<string, any>;
}

export interface EntityRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  text: string;
}

export interface EntityGraph {
  entities: EntityNode[];
  relationships: EntityRelationship[];
}

export type ProcessingStage = 
  | 'uploading' 
  | 'cleaning' 
  | 'parsing' 
  | 'extracting' 
  | 'building' 
  | 'complete' 
  | 'error';

export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number;
  message: string;
  current_section?: string;
}

export type ExtractionMethod = 'quick' | 'langextract';

export interface ExtractionResponse {
  document_data: DocumentData;
  entity_graph: EntityGraph;
  processing_time: number;
  extraction_method: ExtractionMethod;
}

export interface WebSocketMessage {
  type: 'progress' | 'complete' | 'error';
  data: any;
}


