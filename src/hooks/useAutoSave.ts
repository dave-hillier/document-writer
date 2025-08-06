import { useEffect } from 'react';
import type { AppState, AppAction } from '../types';
import { saveCurrentDocument } from '../business/historyOperations';

export function useAutoSave(
  state: AppState,
  dispatch: (action: AppAction) => void,
  debounceMs = 1000
) {
  const { 
    currentDocumentId, 
    outline, 
    sections, 
    isGenerating, 
    isStreaming,
    documentConfig 
  } = state;

  useEffect(() => {
    const autoSave = async () => {
      if (currentDocumentId && outline && !isGenerating && !isStreaming) {
        try {
          await saveCurrentDocument(state);
          dispatch({ 
            type: 'DOCUMENT_SAVED_TO_HISTORY', 
            payload: { 
              document: {
                id: currentDocumentId,
                title: outline.title,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                config: documentConfig,
                outline,
                sections,
                url: `/document/${currentDocumentId}`
              }
            }
          });
        } catch (error) {
          console.error('Failed to auto-save document:', error);
        }
      }
    };

    // Auto-save after a delay to avoid saving during streaming
    const timeoutId = setTimeout(autoSave, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [sections, state, dispatch, outline, isGenerating, isStreaming, currentDocumentId, documentConfig, debounceMs]);
}