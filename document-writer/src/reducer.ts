import type { AppState, AppAction } from './types';

export const initialState: AppState = {
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
  isBulkGenerating: false,
  currentBulkSectionIndex: null,
  bulkGenerationStopped: false,
  bulkGenerationError: null
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // User settings and configuration
    case 'RESET_DOCUMENT':
      return { 
        ...state, 
        outline: null, 
        sections: [], 
        error: null,
        documentConfig: initialState.documentConfig,
        responseId: null,
        streamingContent: '',
        isStreaming: false,
        isGenerating: false,
        isBulkGenerating: false,
        currentBulkSectionIndex: null,
        bulkGenerationStopped: false,
        bulkGenerationError: null
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
        isGenerating: false
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
        isGenerating: false
      };
    
    case 'SECTION_GENERATION_FAILED':
      return {
        ...state,
        error: action.payload,
        isStreaming: false,
        isGenerating: false
      };
    
    // Bulk generation events
    case 'BULK_GENERATION_STARTED':
      return {
        ...state,
        isBulkGenerating: true,
        currentBulkSectionIndex: 0,
        bulkGenerationStopped: false,
        bulkGenerationError: null,
        error: null
      };
    
    case 'BULK_SECTION_STARTED':
      return {
        ...state,
        currentBulkSectionIndex: action.payload.sectionIndex
      };
    
    case 'BULK_GENERATION_STOPPED':
      return {
        ...state,
        isBulkGenerating: false,
        bulkGenerationStopped: true,
        currentBulkSectionIndex: null,
        isStreaming: false,
        isGenerating: false
      };
    
    case 'BULK_GENERATION_COMPLETED':
      return {
        ...state,
        isBulkGenerating: false,
        currentBulkSectionIndex: null,
        bulkGenerationStopped: false,
        bulkGenerationError: null
      };
    
    case 'BULK_GENERATION_FAILED':
      return {
        ...state,
        isBulkGenerating: false,
        currentBulkSectionIndex: null,
        bulkGenerationError: action.payload
      };
    
    default:
      return state;
  }
}