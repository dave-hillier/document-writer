export interface DocumentOutline {
  title: string;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  role: string;
  subSteps: string[];
  content?: string;
  wordCount?: number;
}

export interface DocumentConfig {
  tone: string;
  narrativeElements: {
    allowed: string[];
    denied: string[];
  };
  targetWordCount: number;
}

export interface CacheMetrics {
  cachedTokens: number;
  totalTokens: number;
}

export interface DocumentHistoryItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  config: DocumentConfig;
  outline: DocumentOutline;
  sections: Section[];
  url: string;
}

export interface AppState {
  currentDocumentId: string | null;
  documentConfig: DocumentConfig;
  outline: DocumentOutline | null;
  sections: Section[];
  isGenerating: boolean;
  error: string | null;
  responseId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  outlineCacheMetrics?: CacheMetrics;
  sectionCacheMetrics: Record<string, CacheMetrics>;
  documentHistory: DocumentHistoryItem[];
}

export type AppAction =
  // User settings and configuration
  | { type: 'RESET_DOCUMENT' }
  
  // Document management events
  | { type: 'DOCUMENT_ID_ASSIGNED'; payload: { documentId: string } }
  | { type: 'DOCUMENT_LOADED_FROM_HISTORY'; payload: { document: DocumentHistoryItem } }
  | { type: 'DOCUMENT_SAVED_TO_HISTORY'; payload: { document: DocumentHistoryItem } }
  | { type: 'DOCUMENT_DELETED_FROM_HISTORY'; payload: { documentId: string } }
  | { type: 'HISTORY_LOADED'; payload: { documents: DocumentHistoryItem[] } }
  
  // Outline generation events
  | { type: 'OUTLINE_GENERATION_STARTED'; payload: { config: DocumentConfig } }
  | { type: 'OUTLINE_CONTENT_STREAMED'; payload: string }
  | { type: 'OUTLINE_GENERATED'; payload: { responseId: string; outline: DocumentOutline; cacheMetrics?: CacheMetrics } }
  | { type: 'OUTLINE_GENERATION_FAILED'; payload: string }
  
  // Section generation events
  | { type: 'SECTION_GENERATION_STARTED'; payload: { sectionId: string } }
  | { type: 'SECTION_CONTENT_STREAMED'; payload: string }
  | { type: 'SECTION_GENERATED'; payload: { responseId: string; sectionId: string; content: string; wordCount: number; cacheMetrics?: CacheMetrics } }
  | { type: 'SECTION_GENERATION_FAILED'; payload: string }
  | { type: 'SECTION_GENERATION_ABORTED' };