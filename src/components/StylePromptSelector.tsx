import { useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/useAppContext';
import { indexedDBService } from '../services/indexeddb';
import { createDefaultStylePrompts } from '../services/stylePromptTemplates';

interface StylePromptSelectorProps {
  selectedId?: string;
  onChange: (stylePromptId: string | undefined) => void;
}

export function StylePromptSelector({ selectedId, onChange }: StylePromptSelectorProps) {
  const { state, dispatch } = useAppContext();
  const { stylePrompts, isLoadingStylePrompts } = state;

  const loadStylePrompts = useCallback(async () => {
    try {
      dispatch({ type: 'STYLE_PROMPTS_LOADING_STARTED' });
      const prompts = await indexedDBService.getAllStylePrompts();
      
      // If no prompts exist, initialize with defaults
      if (prompts.length === 0) {
        const defaultPrompts = createDefaultStylePrompts();
        for (const prompt of defaultPrompts) {
          await indexedDBService.saveStylePrompt(prompt);
        }
        const updatedPrompts = await indexedDBService.getAllStylePrompts();
        dispatch({ type: 'STYLE_PROMPTS_LOADED', payload: { stylePrompts: updatedPrompts } });
        
        // Auto-select the default prompt
        const defaultPrompt = updatedPrompts.find(p => p.isDefault);
        if (defaultPrompt && !selectedId) {
          onChange(defaultPrompt.id);
        }
      } else {
        dispatch({ type: 'STYLE_PROMPTS_LOADED', payload: { stylePrompts: prompts } });
        
        // Auto-select the default prompt if none selected
        if (!selectedId) {
          const defaultPrompt = prompts.find(p => p.isDefault);
          if (defaultPrompt) {
            onChange(defaultPrompt.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load style prompts:', error);
    }
  }, [dispatch, selectedId, onChange]);

  useEffect(() => {
    loadStylePrompts();
  }, [loadStylePrompts]);

  const handleSelectionChange = (value: string) => {
    const stylePromptId = value === '' ? undefined : value;
    onChange(stylePromptId);
    
    const selectedPrompt = stylePrompts.find(sp => sp.id === stylePromptId);
    dispatch({ 
      type: 'STYLE_PROMPT_SELECTED', 
      payload: { stylePrompt: selectedPrompt || null } 
    });
  };

  if (isLoadingStylePrompts) {
    return (
      <label htmlFor="style-prompt-selector">
        Style Prompt
        <select id="style-prompt-selector" disabled>
          <option>Loading style prompts...</option>
        </select>
      </label>
    );
  }

  return (
    <label htmlFor="style-prompt-selector">
      Style Prompt
      <select
        id="style-prompt-selector"
        value={selectedId || ''}
        onChange={(e) => handleSelectionChange(e.target.value)}
        aria-describedby="style-prompt-hint"
      >
        <option value="">Select a style prompt...</option>
        {stylePrompts.map((prompt) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.name}
            {prompt.isDefault ? ' (Default)' : ''}
          </option>
        ))}
      </select>
      <small id="style-prompt-hint" className="form-hint">
        Choose a writing style for your document. This controls tone, structure, and language guidelines.
      </small>
    </label>
  );
}