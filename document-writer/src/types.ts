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
  documentConfig: DocumentConfig;
  outline: DocumentOutline | null;
  sections: Section[];
  isGenerating: boolean;
  error: string | null;
  responseId: string | null;
  streamingContent: string;
  isStreaming: boolean;
}

export type AppAction =
  // User settings and configuration
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
  | { type: 'SECTION_GENERATION_ABORTED' };