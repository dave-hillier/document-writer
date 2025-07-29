import { useState, useEffect, useCallback } from 'react';
import type { StylePrompt } from '../types';
import { useAppContext } from '../contexts/useAppContext';
import { indexedDBService } from '../services/indexeddb';
import { createDefaultStylePrompts } from '../services/stylePromptTemplates';

interface StylePromptManagerProps {
  onClose: () => void;
}

export function StylePromptManager({ onClose }: StylePromptManagerProps) {
  const { state, dispatch } = useAppContext();
  const { stylePrompts } = state;
  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<StylePrompt | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      } else {
        dispatch({ type: 'STYLE_PROMPTS_LOADED', payload: { stylePrompts: prompts } });
      }
    } catch (error) {
      setError('Failed to load style prompts');
      console.error('Failed to load style prompts:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    loadStylePrompts();
  }, [loadStylePrompts]);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPrompt(null);
    setName('');
    setDescription('');
    setContent('');
    setError(null);
  };

  const handleEdit = (prompt: StylePrompt) => {
    setEditingPrompt(prompt);
    setIsCreating(false);
    setName(prompt.name);
    setDescription(prompt.description || '');
    setContent(prompt.content);
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      const now = Date.now();
      const stylePrompt: StylePrompt = {
        id: editingPrompt?.id || `style-${now}`,
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        isDefault: false,
        createdAt: editingPrompt?.createdAt || now,
        updatedAt: now
      };

      await indexedDBService.saveStylePrompt(stylePrompt);

      if (editingPrompt) {
        dispatch({ type: 'STYLE_PROMPT_UPDATED', payload: { stylePrompt } });
      } else {
        dispatch({ type: 'STYLE_PROMPT_CREATED', payload: { stylePrompt } });
      }

      setIsCreating(false);
      setEditingPrompt(null);
      setName('');
      setDescription('');
      setContent('');
      setError(null);
    } catch (error) {
      setError('Failed to save style prompt');
      console.error('Failed to save style prompt:', error);
    }
  };

  const handleDelete = async (prompt: StylePrompt) => {
    if (prompt.isDefault) {
      setError('Cannot delete default style prompts');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      return;
    }

    try {
      await indexedDBService.deleteStylePrompt(prompt.id);
      dispatch({ type: 'STYLE_PROMPT_DELETED', payload: { stylePromptId: prompt.id } });
    } catch (error) {
      setError('Failed to delete style prompt');
      console.error('Failed to delete style prompt:', error);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingPrompt(null);
    setName('');
    setDescription('');
    setContent('');
    setError(null);
  };

  const handleDuplicate = (prompt: StylePrompt) => {
    setIsCreating(true);
    setEditingPrompt(null);
    setName(`${prompt.name} (Copy)`);
    setDescription(prompt.description || '');
    setContent(prompt.content);
    setError(null);
  };

  return (
    <dialog open aria-labelledby="style-prompt-manager-title">
      <article>
        <header>
          <h2 id="style-prompt-manager-title">Style Prompt Manager</h2>
          <button 
            onClick={onClose}
            aria-label="Close style prompt manager"
            className="close"
          >
            ×
          </button>
        </header>

        {error && (
          <div role="alert" style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {(isCreating || editingPrompt) ? (
          <section>
            <h3>{editingPrompt ? 'Edit Style Prompt' : 'Create New Style Prompt'}</h3>
            
            <label htmlFor="style-name">
              Name
              <input
                id="style-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter style prompt name..."
                required
              />
            </label>

            <label htmlFor="style-description">
              Description (optional)
              <input
                id="style-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this style..."
              />
            </label>

            <label htmlFor="style-content">
              Style Instructions
              <textarea
                id="style-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="Enter your style guidelines in markdown format..."
                required
              />
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={handleSave} type="button">
                {editingPrompt ? 'Update' : 'Create'}
              </button>
              <button onClick={handleCancel} type="button" className="secondary">
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Style Prompts ({stylePrompts.length})</h3>
              <button onClick={handleCreate} type="button">
                Create New Style Prompt
              </button>
            </div>

            {stylePrompts.length === 0 ? (
              <p>No style prompts found. Create your first style prompt to get started.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {stylePrompts.map((prompt) => (
                  <article key={prompt.id} style={{ border: '1px solid var(--color-border)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {prompt.name}
                          {prompt.isDefault && (
                            <small style={{ color: 'var(--color-secondary)', fontWeight: 'normal' }}>
                              (Default)
                            </small>
                          )}
                        </h4>
                        {prompt.description && (
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-secondary)', fontSize: '0.9rem' }}>
                            {prompt.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleEdit(prompt)}
                          type="button"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDuplicate(prompt)}
                          type="button"
                          className="secondary"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          Duplicate
                        </button>
                        {!prompt.isDefault && (
                          <button 
                            onClick={() => handleDelete(prompt)}
                            type="button"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: 'var(--color-error)' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </header>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--color-secondary)',
                      maxHeight: '6rem',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        {prompt.content.substring(0, 300)}
                        {prompt.content.length > 300 && '...'}
                      </pre>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </article>
    </dialog>
  );
}