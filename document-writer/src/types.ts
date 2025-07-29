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

export interface AppState {
  apiKey: string;
  isSettingsOpen: boolean;
  documentConfig: DocumentConfig;
  outline: DocumentOutline | null;
  sections: Section[];
  isGenerating: boolean;
  error: string | null;
  responseId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  isBulkGenerating: boolean;
  currentBulkSectionIndex: number | null;
  bulkGenerationStopped: boolean;
  bulkGenerationError: string | null;
}

export type AppAction =
  // User settings and configuration
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'RESET_DOCUMENT' }
  
  // Outline generation events
  | { type: 'OUTLINE_GENERATION_STARTED'; payload: { config: DocumentConfig } }
  | { type: 'OUTLINE_CONTENT_STREAMED'; payload: string }
  | { type: 'OUTLINE_GENERATED'; payload: { responseId: string; outline: DocumentOutline } }
  | { type: 'OUTLINE_GENERATION_FAILED'; payload: string }
  
  // Section generation events
  | { type: 'SECTION_GENERATION_STARTED'; payload: { sectionId: string } }
  | { type: 'SECTION_CONTENT_STREAMED'; payload: string }
  | { type: 'SECTION_GENERATED'; payload: { responseId: string; sectionId: string; content: string; wordCount: number } }
  | { type: 'SECTION_GENERATION_FAILED'; payload: string }
  
  // Bulk generation events
  | { type: 'BULK_GENERATION_STARTED' }
  | { type: 'BULK_SECTION_STARTED'; payload: { sectionIndex: number } }
  | { type: 'BULK_GENERATION_STOPPED' }
  | { type: 'BULK_GENERATION_COMPLETED' }
  | { type: 'BULK_GENERATION_FAILED'; payload: string };