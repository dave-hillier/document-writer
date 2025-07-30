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

export interface StylePrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentConfig {
  tone: string;
  narrativeElements: {
    allowed: string[];
    denied: string[];
  };
  targetWordCount: number;
  knowledgeBaseId?: string;
  stylePromptId?: string;
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

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  vectorStoreId: string;
  outlineVectorStoreId?: string;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
}

export interface KnowledgeBaseFile {
  id: string;
  filename: string;
  size: number;
  uploadedAt: number;
  attributes?: Record<string, unknown>;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}

export interface SearchResult {
  fileId: string;
  filename: string;
  score: number;
  content: Array<{ type: string; text: string }>;
  attributes?: Record<string, unknown>;
}

export interface QueryTestResult {
  query: string;
  rewrittenQuery?: string;
  results: SearchResult[];
  searchTime: number;
  timestamp: number;
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
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBase: KnowledgeBase | null;
  knowledgeBaseFiles: Record<string, KnowledgeBaseFile[]>;
  isLoadingKnowledgeBases: boolean;
  queryTestResults: QueryTestResult[];
  stylePrompts: StylePrompt[];
  selectedStylePrompt: StylePrompt | null;
  isLoadingStylePrompts: boolean;
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
  | { type: 'OUTLINE_TITLE_UPDATED'; payload: { title: string } }
  | { type: 'SECTION_UPDATED'; payload: { sectionId: string; updates: Partial<Pick<Section, 'title' | 'role' | 'subSteps'>> } }
  
  // Section generation events
  | { type: 'SECTION_GENERATION_STARTED'; payload: { sectionId: string } }
  | { type: 'SECTION_REGENERATION_STARTED'; payload: { sectionId: string } }
  | { type: 'SECTION_CONTENT_STREAMED'; payload: string }
  | { type: 'SECTION_GENERATED'; payload: { responseId: string; sectionId: string; content: string; wordCount: number; cacheMetrics?: CacheMetrics } }
  | { type: 'SECTION_GENERATION_FAILED'; payload: string }
  | { type: 'SECTION_GENERATION_ABORTED' }
  
  // Knowledge base events
  | { type: 'KNOWLEDGE_BASES_LOADING_STARTED' }
  | { type: 'KNOWLEDGE_BASES_LOADED'; payload: { knowledgeBases: KnowledgeBase[] } }
  | { type: 'KNOWLEDGE_BASE_CREATED'; payload: { knowledgeBase: KnowledgeBase } }
  | { type: 'KNOWLEDGE_BASE_UPDATED'; payload: { knowledgeBase: KnowledgeBase } }
  | { type: 'KNOWLEDGE_BASE_DELETED'; payload: { knowledgeBaseId: string } }
  | { type: 'KNOWLEDGE_BASE_SELECTED'; payload: { knowledgeBase: KnowledgeBase | null } }
  
  // Knowledge base file events
  | { type: 'KNOWLEDGE_BASE_FILES_LOADED'; payload: { knowledgeBaseId: string; files: KnowledgeBaseFile[] } }
  | { type: 'KNOWLEDGE_BASE_FILE_UPLOAD_STARTED'; payload: { knowledgeBaseId: string; file: KnowledgeBaseFile } }
  | { type: 'KNOWLEDGE_BASE_FILE_UPLOAD_COMPLETED'; payload: { knowledgeBaseId: string; fileId: string } }
  | { type: 'KNOWLEDGE_BASE_FILE_UPLOAD_FAILED'; payload: { knowledgeBaseId: string; fileId: string; error: string } }
  | { type: 'KNOWLEDGE_BASE_FILE_DELETED'; payload: { knowledgeBaseId: string; fileId: string } }
  
  // Query test events
  | { type: 'QUERY_TEST_EXECUTED'; payload: { result: QueryTestResult } }
  | { type: 'QUERY_TEST_RESULTS_CLEARED' }
  
  // Style prompt events
  | { type: 'STYLE_PROMPTS_LOADING_STARTED' }
  | { type: 'STYLE_PROMPTS_LOADED'; payload: { stylePrompts: StylePrompt[] } }
  | { type: 'STYLE_PROMPT_CREATED'; payload: { stylePrompt: StylePrompt } }
  | { type: 'STYLE_PROMPT_UPDATED'; payload: { stylePrompt: StylePrompt } }
  | { type: 'STYLE_PROMPT_DELETED'; payload: { stylePromptId: string } }
  | { type: 'STYLE_PROMPT_SELECTED'; payload: { stylePrompt: StylePrompt | null } };