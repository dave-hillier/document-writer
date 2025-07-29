import type { AppState, AppAction } from './types';

export const initialState: AppState = {
  currentDocumentId: null,
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
  error: null,
  responseId: null,
  streamingContent: '',
  isStreaming: false,
  outlineCacheMetrics: undefined,
  sectionCacheMetrics: {},
  documentHistory: []
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // User settings and configuration
    case 'RESET_DOCUMENT':
      return { 
        ...state, 
        currentDocumentId: null,
        outline: null, 
        sections: [], 
        error: null,
        documentConfig: initialState.documentConfig,
        responseId: null,
        streamingContent: '',
        isStreaming: false,
        isGenerating: false,
        outlineCacheMetrics: undefined,
        sectionCacheMetrics: {}
      };
    
    // Document management events
    case 'DOCUMENT_ID_ASSIGNED':
      return {
        ...state,
        currentDocumentId: action.payload.documentId
      };
    
    case 'DOCUMENT_LOADED_FROM_HISTORY':
      return {
        ...state,
        currentDocumentId: action.payload.document.id,
        documentConfig: action.payload.document.config,
        outline: action.payload.document.outline,
        sections: action.payload.document.sections,
        error: null
      };
    
    case 'DOCUMENT_SAVED_TO_HISTORY':
      return {
        ...state,
        documentHistory: [
          action.payload.document,
          ...state.documentHistory.filter(doc => doc.id !== action.payload.document.id)
        ]
      };
    
    case 'DOCUMENT_DELETED_FROM_HISTORY':
      return {
        ...state,
        documentHistory: state.documentHistory.filter(doc => doc.id !== action.payload.documentId)
      };
    
    case 'HISTORY_LOADED':
      return {
        ...state,
        documentHistory: action.payload.documents
      };
    
    // Outline generation events
    case 'OUTLINE_GENERATION_STARTED':
      return {
        ...state,
        documentConfig: action.payload.config,
        isGenerating: true,
        isStreaming: true,
        streamingContent: '',
        error: null
      };
    
    case 'OUTLINE_CONTENT_STREAMED':
      return {
        ...state,
        streamingContent: state.streamingContent + action.payload
      };
    
    case 'OUTLINE_GENERATED':
      return {
        ...state,
        responseId: action.payload.responseId,
        outline: action.payload.outline,
        sections: action.payload.outline.sections.map(s => ({ ...s, content: '', wordCount: 0 })),
        isStreaming: false,
        isGenerating: false,
        outlineCacheMetrics: action.payload.cacheMetrics
      };
    
    case 'OUTLINE_GENERATION_FAILED':
      return {
        ...state,
        error: action.payload,
        isStreaming: false,
        isGenerating: false
      };
    
    // Section generation events
    case 'SECTION_GENERATION_STARTED':
      return {
        ...state,
        isGenerating: true,
        isStreaming: true,
        streamingContent: '',
        error: null
      };
    
    case 'SECTION_CONTENT_STREAMED':
      return {
        ...state,
        streamingContent: state.streamingContent + action.payload
      };
    
    case 'SECTION_GENERATED':
      return {
        ...state,
        responseId: action.payload.responseId,
        sections: state.sections.map(s => 
          s.id === action.payload.sectionId 
            ? { ...s, content: action.payload.content, wordCount: action.payload.wordCount }
            : s
        ),
        isStreaming: false,
        isGenerating: false,
        sectionCacheMetrics: action.payload.cacheMetrics 
          ? { ...state.sectionCacheMetrics, [action.payload.sectionId]: action.payload.cacheMetrics }
          : state.sectionCacheMetrics
      };
    
    case 'SECTION_GENERATION_FAILED':
      return {
        ...state,
        error: action.payload,
        isStreaming: false,
        isGenerating: false
      };
    
    case 'SECTION_GENERATION_ABORTED':
      return {
        ...state,
        isStreaming: false,
        isGenerating: false,
        streamingContent: ''
      };
    
    default:
      return state;
  }
}