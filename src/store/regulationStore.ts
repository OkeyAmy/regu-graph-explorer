import { create } from 'zustand';

export interface Reference {
  target: string;
  text: string;
  type: 'internal' | 'external';
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

export interface DocumentData {
  metadata: {
    title: string;
    jurisdiction: string;
    document_type: string;
    source: string;
  };
  hierarchy: HierarchyNode[];
}

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'cleaning' | 'parsing' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
  currentSection?: string;
}

interface RegulationStore {
  // Document data
  documentData: DocumentData | null;
  setDocumentData: (data: DocumentData | null) => void;

  // Processing state
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;

  // Selected node
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Search and filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  activeFilters: Set<string>;
  setActiveFilters: (filters: Set<string>) => void;

  // UI state
  leftPanelCollapsed: boolean;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  
  rightPanelCollapsed: boolean;
  setRightPanelCollapsed: (collapsed: boolean) => void;

  // Saved documents (localStorage)
  savedDocuments: Array<{ id: string; title: string; timestamp: number; data: DocumentData }>;
  saveDocument: (title: string, data: DocumentData) => void;
  loadDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  refreshSavedDocuments: () => void;

  // Helper functions
  findNodeById: (id: string) => HierarchyNode | null;
  getNodePath: (id: string) => HierarchyNode[];
  getAllNodes: () => HierarchyNode[];
}

const findNodeInHierarchy = (nodes: HierarchyNode[], id: string): HierarchyNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInHierarchy(node.children, id);
    if (found) return found;
  }
  return null;
};

const getPathToNode = (nodes: HierarchyNode[], targetId: string, path: HierarchyNode[] = []): HierarchyNode[] => {
  for (const node of nodes) {
    const currentPath = [...path, node];
    if (node.id === targetId) return currentPath;
    
    const found = getPathToNode(node.children, targetId, currentPath);
    if (found.length > 0) return found;
  }
  return [];
};

const flattenNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
  const result: HierarchyNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenNodes(node.children));
  }
  return result;
};

export const useRegulationStore = create<RegulationStore>((set, get) => ({
  // Document data
  documentData: null,
  setDocumentData: (data) => set({ documentData: data }),

  // Processing state
  processingState: {
    stage: 'idle',
    progress: 0,
    message: '',
  },
  setProcessingState: (state) => set({ processingState: state }),

  // Selected node
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // Search and filters
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  activeFilters: new Set(),
  setActiveFilters: (filters) => set({ activeFilters: filters }),

  // UI state
  leftPanelCollapsed: false,
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  
  rightPanelCollapsed: false,
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),

  // Saved documents
  savedDocuments: [],
  saveDocument: (title, data) => {
    const id = `doc_${Date.now()}`;
    const saved = { id, title, timestamp: Date.now(), data };
    const documents = [...get().savedDocuments, saved];
    localStorage.setItem('regulation_documents', JSON.stringify(documents));
    set({ savedDocuments: documents });
  },
  
  loadDocument: (id) => {
    const doc = get().savedDocuments.find(d => d.id === id);
    if (doc) {
      set({ documentData: doc.data });
    }
  },
  
  deleteDocument: (id) => {
    const documents = get().savedDocuments.filter(d => d.id !== id);
    localStorage.setItem('regulation_documents', JSON.stringify(documents));
    set({ savedDocuments: documents });
  },
  
  refreshSavedDocuments: () => {
    try {
      const saved = localStorage.getItem('regulation_documents');
      const documents = saved ? JSON.parse(saved) : [];
      set({ savedDocuments: documents });
    } catch (error) {
      console.error('Error loading saved documents:', error);
      set({ savedDocuments: [] });
    }
  },

  // Helper functions
  findNodeById: (id) => {
    const { documentData } = get();
    if (!documentData) return null;
    return findNodeInHierarchy(documentData.hierarchy, id);
  },

  getNodePath: (id) => {
    const { documentData } = get();
    if (!documentData) return [];
    return getPathToNode(documentData.hierarchy, id);
  },

  getAllNodes: () => {
    const { documentData } = get();
    if (!documentData) return [];
    return flattenNodes(documentData.hierarchy);
  },
}));