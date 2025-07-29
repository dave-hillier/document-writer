import type { AppState, AppAction } from './types';

export const initialState: AppState = {
  apiKey: localStorage.getItem('openai-api-key') || '',
  isSettingsOpen: false,
  documentConfig: {
    tone: 'professional',
    narrativeElements: {
      allowed: [],
      denied: []
    },
    targetWordCount: 3000
  },
  outline: null,
  sections: [],
  isGenerating: false,
  error: null
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_API_KEY':
      localStorage.setItem('openai-api-key', action.payload);
      return { ...state, apiKey: action.payload };
    
    case 'TOGGLE_SETTINGS':
      return { ...state, isSettingsOpen: !state.isSettingsOpen };
    
    case 'SET_DOCUMENT_CONFIG':
      return { ...state, documentConfig: action.payload };
    
    case 'SET_OUTLINE':
      return { 
        ...state, 
        outline: action.payload,
        sections: action.payload.sections.map(s => ({ ...s, content: '', wordCount: 0 }))
      };
    
    case 'UPDATE_SECTION':
      return {
        ...state,
        sections: state.sections.map(s => 
          s.id === action.payload.id 
            ? { ...s, content: action.payload.content, wordCount: action.payload.wordCount }
            : s
        )
      };
    
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_DOCUMENT':
      return { 
        ...state, 
        outline: null, 
        sections: [], 
        error: null,
        documentConfig: initialState.documentConfig
      };
    
    default:
      return state;
  }
}