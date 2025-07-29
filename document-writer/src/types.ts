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
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_DOCUMENT_CONFIG'; payload: DocumentConfig }
  | { type: 'SET_OUTLINE'; payload: DocumentOutline }
  | { type: 'UPDATE_SECTION'; payload: { id: string; content: string; wordCount: number } }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_DOCUMENT' }
  | { type: 'SET_RESPONSE_ID'; payload: string | null }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_STREAM'; payload: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'START_BULK_GENERATION' }
  | { type: 'ADVANCE_BULK_SECTION'; payload: number }
  | { type: 'STOP_BULK_GENERATION' }
  | { type: 'COMPLETE_BULK_GENERATION' }
  | { type: 'FAIL_BULK_GENERATION'; payload: string };