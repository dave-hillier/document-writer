import type { AppState, AppAction, KnowledgeBaseFile } from './types';

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
  documentHistory: [],
  knowledgeBases: [],
  selectedKnowledgeBase: null,
  knowledgeBaseFiles: {},
  isLoadingKnowledgeBases: false,
  queryTestResults: [],
  stylePrompts: [],
  selectedStylePrompt: null,
  isLoadingStylePrompts: false,
  uploadBatchState: {}
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
    
    case 'OUTLINE_TITLE_UPDATED':
      if (!state.outline) return state;
      return {
        ...state,
        outline: {
          ...state.outline,
          title: action.payload.title
        }
      };
    
    case 'SECTION_UPDATED':
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.sectionId
            ? { ...section, ...action.payload.updates }
            : section
        ),
        outline: state.outline ? {
          ...state.outline,
          sections: state.outline.sections.map(section =>
            section.id === action.payload.sectionId
              ? { ...section, ...action.payload.updates }
              : section
          )
        } : null
      };
    
    // Section generation events
    case 'SECTION_GENERATION_STARTED':
    case 'SECTION_REGENERATION_STARTED':
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
    
    // Knowledge base events
    case 'KNOWLEDGE_BASES_LOADING_STARTED':
      return {
        ...state,
        isLoadingKnowledgeBases: true,
        error: null
      };
    
    case 'KNOWLEDGE_BASES_LOADED':
      return {
        ...state,
        knowledgeBases: action.payload.knowledgeBases,
        isLoadingKnowledgeBases: false
      };
    
    case 'KNOWLEDGE_BASE_CREATED':
      return {
        ...state,
        knowledgeBases: [...state.knowledgeBases, action.payload.knowledgeBase]
      };
    
    case 'KNOWLEDGE_BASE_UPDATED':
      return {
        ...state,
        knowledgeBases: state.knowledgeBases.map(kb =>
          kb.id === action.payload.knowledgeBase.id ? action.payload.knowledgeBase : kb
        ),
        selectedKnowledgeBase: state.selectedKnowledgeBase?.id === action.payload.knowledgeBase.id
          ? action.payload.knowledgeBase
          : state.selectedKnowledgeBase
      };
    
    case 'KNOWLEDGE_BASE_DELETED':
      return {
        ...state,
        knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== action.payload.knowledgeBaseId),
        selectedKnowledgeBase: state.selectedKnowledgeBase?.id === action.payload.knowledgeBaseId
          ? null
          : state.selectedKnowledgeBase,
        knowledgeBaseFiles: Object.keys(state.knowledgeBaseFiles).reduce((acc, key) => {
          if (key !== action.payload.knowledgeBaseId) {
            acc[key] = state.knowledgeBaseFiles[key];
          }
          return acc;
        }, {} as Record<string, KnowledgeBaseFile[]>)
      };
    
    case 'KNOWLEDGE_BASE_SELECTED':
      return {
        ...state,
        selectedKnowledgeBase: action.payload.knowledgeBase,
        documentConfig: action.payload.knowledgeBase
          ? { ...state.documentConfig, knowledgeBaseId: action.payload.knowledgeBase.id }
          : { ...state.documentConfig, knowledgeBaseId: undefined }
      };
    
    // Knowledge base file events
    case 'KNOWLEDGE_BASE_FILES_LOADED':
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: action.payload.files
        }
      };
    
    case 'KNOWLEDGE_BASE_FILE_UPLOAD_STARTED':
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: [
            ...(state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []),
            { ...action.payload.file, startedAt: Date.now() }
          ]
        }
      };
    
    case 'KNOWLEDGE_BASE_FILE_UPLOAD_COMPLETED': {
      const batchState = state.uploadBatchState[action.payload.knowledgeBaseId];
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []).map(file =>
            file.id === action.payload.fileId
              ? { ...file, status: 'completed' as const, completedAt: Date.now(), progress: 100 }
              : file
          )
        },
        uploadBatchState: batchState ? {
          ...state.uploadBatchState,
          [action.payload.knowledgeBaseId]: {
            ...batchState,
            completedFiles: batchState.completedFiles + 1,
            isUploading: batchState.completedFiles + 1 < batchState.totalFiles,
            completedAt: batchState.completedFiles + 1 === batchState.totalFiles ? Date.now() : undefined
          }
        } : state.uploadBatchState
      };
    }
    
    case 'KNOWLEDGE_BASE_FILE_UPLOAD_FAILED': {
      const batchState = state.uploadBatchState[action.payload.knowledgeBaseId];
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []).map(file =>
            file.id === action.payload.fileId
              ? { ...file, status: 'failed' as const, error: action.payload.error, completedAt: Date.now() }
              : file
          )
        },
        uploadBatchState: batchState ? {
          ...state.uploadBatchState,
          [action.payload.knowledgeBaseId]: {
            ...batchState,
            failedFiles: batchState.failedFiles + 1,
            isUploading: batchState.completedFiles + batchState.failedFiles + 1 < batchState.totalFiles,
            completedAt: batchState.completedFiles + batchState.failedFiles + 1 === batchState.totalFiles ? Date.now() : undefined
          }
        } : state.uploadBatchState
      };
    }
    
    case 'KNOWLEDGE_BASE_FILE_DELETED':
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || [])
            .filter(file => file.id !== action.payload.fileId)
        }
      };
      
    case 'KNOWLEDGE_BASE_FILE_UPLOAD_PROGRESS':
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []).map(file =>
            file.id === action.payload.fileId
              ? { ...file, progress: action.payload.progress }
              : file
          )
        }
      };

    case 'KNOWLEDGE_BASE_FILE_PROGRESS_UPDATED':
      return {
        ...state,
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []).map(file =>
            file.id === action.payload.fileId
              ? { ...file, progress: action.payload.progress, stage: action.payload.stage }
              : file
          )
        }
      };
      
    // Batch upload events
    case 'UPLOAD_BATCH_STARTED':
      return {
        ...state,
        uploadBatchState: {
          ...state.uploadBatchState,
          [action.payload.knowledgeBaseId]: {
            totalFiles: action.payload.totalFiles,
            completedFiles: 0,
            failedFiles: 0,
            isUploading: true,
            startedAt: Date.now()
          }
        }
      };
      
    case 'UPLOAD_BATCH_COMPLETED':
      return {
        ...state,
        uploadBatchState: {
          ...state.uploadBatchState,
          [action.payload.knowledgeBaseId]: {
            ...state.uploadBatchState[action.payload.knowledgeBaseId],
            isUploading: false,
            completedAt: Date.now()
          }
        }
      };
      
    case 'UPLOAD_BATCH_CANCELLED':
      return {
        ...state,
        uploadBatchState: {
          ...state.uploadBatchState,
          [action.payload.knowledgeBaseId]: {
            ...state.uploadBatchState[action.payload.knowledgeBaseId],
            isUploading: false,
            completedAt: Date.now()
          }
        },
        knowledgeBaseFiles: {
          ...state.knowledgeBaseFiles,
          [action.payload.knowledgeBaseId]: (state.knowledgeBaseFiles[action.payload.knowledgeBaseId] || []).filter(file =>
            file.status !== 'queued' && file.status !== 'uploading'
          )
        }
      };
    
    // Query test events
    case 'QUERY_TEST_EXECUTED':
      return {
        ...state,
        queryTestResults: [action.payload.result, ...state.queryTestResults.slice(0, 9)] // Keep last 10 results
      };
    
    case 'QUERY_TEST_RESULTS_CLEARED':
      return {
        ...state,
        queryTestResults: []
      };
    
    // Style prompt events
    case 'STYLE_PROMPTS_LOADING_STARTED':
      return {
        ...state,
        isLoadingStylePrompts: true,
        error: null
      };
    
    case 'STYLE_PROMPTS_LOADED':
      return {
        ...state,
        stylePrompts: action.payload.stylePrompts,
        isLoadingStylePrompts: false
      };
    
    case 'STYLE_PROMPT_CREATED':
      return {
        ...state,
        stylePrompts: [...state.stylePrompts, action.payload.stylePrompt]
      };
    
    case 'STYLE_PROMPT_UPDATED':
      return {
        ...state,
        stylePrompts: state.stylePrompts.map(sp =>
          sp.id === action.payload.stylePrompt.id ? action.payload.stylePrompt : sp
        ),
        selectedStylePrompt: state.selectedStylePrompt?.id === action.payload.stylePrompt.id
          ? action.payload.stylePrompt
          : state.selectedStylePrompt
      };
    
    case 'STYLE_PROMPT_DELETED':
      return {
        ...state,
        stylePrompts: state.stylePrompts.filter(sp => sp.id !== action.payload.stylePromptId),
        selectedStylePrompt: state.selectedStylePrompt?.id === action.payload.stylePromptId
          ? null
          : state.selectedStylePrompt,
        documentConfig: state.documentConfig.stylePromptId === action.payload.stylePromptId
          ? { ...state.documentConfig, stylePromptId: undefined }
          : state.documentConfig
      };
    
    case 'STYLE_PROMPT_SELECTED':
      return {
        ...state,
        selectedStylePrompt: action.payload.stylePrompt,
        documentConfig: action.payload.stylePrompt
          ? { ...state.documentConfig, stylePromptId: action.payload.stylePrompt.id }
          : { ...state.documentConfig, stylePromptId: undefined }
      };
    
    default:
      return state;
  }
}