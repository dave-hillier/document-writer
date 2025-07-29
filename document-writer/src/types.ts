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
}

export type AppAction =
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_DOCUMENT_CONFIG'; payload: DocumentConfig }
  | { type: 'SET_OUTLINE'; payload: DocumentOutline }
  | { type: 'UPDATE_SECTION'; payload: { id: string; content: string; wordCount: number } }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_DOCUMENT' };